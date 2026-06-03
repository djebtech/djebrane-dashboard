import { Server as SocketServer } from "socket.io";
import { createAdminClient } from "../supabase/admin";

const TICK_MS       = 60_000;
const MAX_PER_TICK  = 30;
const MSG_DELAY_MIN = 2_000;
const MSG_DELAY_MAX = 5_000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SequenceRow {
  id: string;
  user_id: string;
  name: string;
  status: string;
  account_id: string | null;
  round_robin: boolean;
  stop_on_reply: boolean;
  quiet_hours_start: number;
  quiet_hours_end: number;
  campaign_id: string | null;
}

interface StepRow {
  id: string;
  step_number: number;
  label: string;
  message_template: string;
  delay_hours: number;
}

interface EnrollmentRow {
  id: string;
  sequence_id: string;
  contact_id: string;
  current_step: number;
  status: string;
  next_send_at: string | null;
  contacts: {
    id: string;
    name: string;
    phone_number: string;
    custom_fields: Record<string, unknown> | null;
  } | null;
}

interface AccountRow {
  id: string;
  daily_limit: number;
  messages_sent_today: number;
}

declare global {
  // eslint-disable-next-line no-var
  var sequenceEngine: SequenceEngine | undefined;
}

// ─── SequenceEngine ───────────────────────────────────────────────────────────

export class SequenceEngine {
  private io: SocketServer;
  private timer: ReturnType<typeof setInterval>;
  private ticking = false;

  constructor(io: SocketServer) {
    this.io = io;
    // First tick after 5s to let server fully initialise
    setTimeout(() => this.tick().catch(console.error), 5_000);
    this.timer = setInterval(() => this.tick().catch(console.error), TICK_MS);
    console.log("[SequenceEngine] Initialized — tick every", TICK_MS / 1000, "s");
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async enrollContacts(sequenceId: string, contactIds: string[]): Promise<number> {
    if (!contactIds.length) return 0;
    const db = createAdminClient();

    const { data: firstStep } = await (db as any)
      .from("sequence_steps")
      .select("delay_hours")
      .eq("sequence_id", sequenceId)
      .order("step_number", { ascending: true })
      .limit(1)
      .single() as { data: { delay_hours: number } | null };

    const delayMs = (firstStep?.delay_hours ?? 0) * 3_600_000;
    const nextSendAt = new Date(Date.now() + delayMs).toISOString();
    const now = new Date().toISOString();

    const rows = contactIds.map((contactId) => ({
      sequence_id: sequenceId,
      contact_id: contactId,
      current_step: 0,
      status: "active",
      enrolled_at: now,
      next_send_at: nextSendAt,
    }));

    await (db as any)
      .from("sequence_enrollments")
      .upsert(rows, { onConflict: "sequence_id,contact_id", ignoreDuplicates: true });

    return rows.length;
  }

  async unenrollContact(sequenceId: string, contactId: string): Promise<void> {
    const db = createAdminClient();
    await (db as any)
      .from("sequence_enrollments")
      .update({ status: "replied", completed_at: new Date().toISOString() })
      .eq("sequence_id", sequenceId)
      .eq("contact_id", contactId)
      .eq("status", "active");
  }

  /** Called when an incoming reply is detected — unenrolls from stop_on_reply sequences */
  async handleContactReply(contactIds: string[]): Promise<void> {
    if (!contactIds.length) return;
    const db = createAdminClient();

    // Find active enrollments for these contacts in stop_on_reply sequences
    const { data: enrollments } = await (db as any)
      .from("sequence_enrollments")
      .select("id, sequence_id, contact_id, sequences(stop_on_reply)")
      .in("contact_id", contactIds)
      .eq("status", "active") as {
        data: {
          id: string;
          sequence_id: string;
          contact_id: string;
          sequences: { stop_on_reply: boolean } | null;
        }[] | null;
      };

    if (!enrollments?.length) return;

    const toStop = enrollments
      .filter((e) => e.sequences?.stop_on_reply)
      .map((e) => e.id);

    if (!toStop.length) return;

    await (db as any)
      .from("sequence_enrollments")
      .update({ status: "replied", completed_at: new Date().toISOString() })
      .in("id", toStop);

    console.log(`[SequenceEngine] Unenrolled ${toStop.length} contacts due to reply`);
  }

  async pauseSequence(sequenceId: string): Promise<void> {
    await (createAdminClient() as any)
      .from("sequences")
      .update({ status: "paused" })
      .eq("id", sequenceId);
  }

  async resumeSequence(sequenceId: string): Promise<void> {
    await (createAdminClient() as any)
      .from("sequences")
      .update({ status: "active" })
      .eq("id", sequenceId);
  }

  async getEnrollmentStatus(sequenceId: string) {
    const db = createAdminClient();
    const { data } = await (db as any)
      .from("sequence_enrollments")
      .select("status, current_step")
      .eq("sequence_id", sequenceId) as {
        data: { status: string; current_step: number }[] | null;
      };

    const counts = { total: 0, active: 0, completed: 0, stopped: 0, replied: 0 };
    const byStep: Record<number, number> = {};
    for (const row of data ?? []) {
      counts.total++;
      if (row.status in counts) (counts as Record<string, number>)[row.status]++;
      byStep[row.current_step] = (byStep[row.current_step] ?? 0) + 1;
    }
    return { counts, byStep };
  }

  shutdown(): void {
    clearInterval(this.timer);
  }

  // ── Tick ───────────────────────────────────────────────────────────────────

  private async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const db = createAdminClient();
      const { data: sequences } = await (db as any)
        .from("sequences")
        .select("*")
        .eq("status", "active") as { data: SequenceRow[] | null };

      for (const seq of sequences ?? []) {
        await this.processSequence(seq).catch((err) =>
          console.error(`[SequenceEngine] Error in sequence ${seq.id}:`, err)
        );
      }
    } catch (err) {
      console.error("[SequenceEngine] Tick error:", err);
    } finally {
      this.ticking = false;
    }
  }

  private async processSequence(seq: SequenceRow): Promise<void> {
    if (isQuietHours(seq.quiet_hours_start, seq.quiet_hours_end)) return;

    const db = createAdminClient();

    // Load all steps ordered
    const { data: steps } = await (db as any)
      .from("sequence_steps")
      .select("id, step_number, label, message_template, delay_hours")
      .eq("sequence_id", seq.id)
      .order("step_number", { ascending: true }) as { data: StepRow[] | null };

    if (!steps?.length) return;

    // Get enrollments due now
    const { data: enrollments } = await (db as any)
      .from("sequence_enrollments")
      .select("id, sequence_id, contact_id, current_step, contacts(id, name, phone_number, custom_fields)")
      .eq("sequence_id", seq.id)
      .eq("status", "active")
      .lte("next_send_at", new Date().toISOString())
      .limit(MAX_PER_TICK) as { data: EnrollmentRow[] | null };

    if (!enrollments?.length) return;

    const account = await this.pickAccount(seq);
    if (!account) {
      console.log(`[SequenceEngine] No available account for sequence ${seq.id}`);
      return;
    }

    for (const enrollment of enrollments) {
      const contact = enrollment.contacts;
      if (!contact) continue;

      const nextStepNum = enrollment.current_step + 1;
      const stepToSend = steps.find((s) => s.step_number === nextStepNum);

      if (!stepToSend) {
        // All steps sent — complete enrollment
        await (db as any)
          .from("sequence_enrollments")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", enrollment.id);
        continue;
      }

      const message = interpolateTemplate(stepToSend.message_template, {
        name: contact.name,
        phone: contact.phone_number,
        ...flattenCustomFields(contact.custom_fields),
      });

      try {
        const sm = global.sessionManager;
        if (!sm) throw new Error("Session manager unavailable");

        await sm.sendMessage(account.id, contact.phone_number, message);

        // Record in message_logs
        await (db as any).from("message_logs").insert({
          campaign_id:    seq.campaign_id ?? null,
          contact_id:     enrollment.contact_id,
          account_id:     account.id,
          status:         "sent",
          sent_at:        new Date().toISOString(),
          sequence_id:    seq.id,
          sequence_step:  stepToSend.step_number,
        });

        // Advance enrollment
        const afterStepNum  = nextStepNum + 1;
        const afterStep     = steps.find((s) => s.step_number === afterStepNum);
        const now           = new Date().toISOString();

        if (afterStep) {
          const nextSendAt = new Date(
            Date.now() + afterStep.delay_hours * 3_600_000
          ).toISOString();
          await (db as any)
            .from("sequence_enrollments")
            .update({ current_step: nextStepNum, last_sent_at: now, next_send_at: nextSendAt })
            .eq("id", enrollment.id);
        } else {
          await (db as any)
            .from("sequence_enrollments")
            .update({ current_step: nextStepNum, status: "completed", last_sent_at: now, completed_at: now, next_send_at: null })
            .eq("id", enrollment.id);
        }

        // Emit real-time
        this.io.emit("sequence_step_sent", {
          sequenceId: seq.id,
          contactId:  enrollment.contact_id,
          step:       stepToSend.step_number,
        });
        this.io.to(`sequence:${seq.id}`).emit("sequence_step_sent", {
          sequenceId: seq.id,
          contactId:  enrollment.contact_id,
          step:       stepToSend.step_number,
        });

        // Account usage
        await (db as any)
          .from("accounts")
          .update({ messages_sent_today: account.messages_sent_today + 1 })
          .eq("id", account.id);
        account.messages_sent_today++;
      } catch (err) {
        console.error(`[SequenceEngine] Send failed for ${contact.phone_number}:`, err);
        // Retry on next tick — don't advance the step
      }

      await sleep(MSG_DELAY_MIN + Math.random() * (MSG_DELAY_MAX - MSG_DELAY_MIN));
    }
  }

  private async pickAccount(seq: SequenceRow): Promise<AccountRow | null> {
    const db = createAdminClient();

    let query = (db as any)
      .from("accounts")
      .select("id, daily_limit, messages_sent_today")
      .eq("user_id", seq.user_id)
      .eq("status", "connected");

    if (!seq.round_robin && seq.account_id) {
      query = query.eq("id", seq.account_id);
    }

    const { data: accounts } = await query as { data: AccountRow[] | null };
    if (!accounts?.length) return null;

    const available = accounts.filter((a) => a.messages_sent_today < a.daily_limit);
    const sm = global.sessionManager;
    const live = available.filter(
      (a) => sm?.getSession(a.id)?.status.status === "connected"
    );
    if (!live.length) return null;

    return live.sort(
      (a, b) =>
        b.daily_limit - b.messages_sent_today - (a.daily_limit - a.messages_sent_today)
    )[0];
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isQuietHours(start: number, end: number): boolean {
  const h = new Date().getHours();
  return h < start || h >= end;
}

function interpolateTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

function flattenCustomFields(f: Record<string, unknown> | null): Record<string, string> {
  if (!f) return {};
  return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v ?? "")]));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
