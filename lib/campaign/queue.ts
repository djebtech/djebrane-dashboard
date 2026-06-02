import { Server as SocketServer } from "socket.io";
import { createAdminClient } from "../supabase/admin";

const TICK_MS = 10_000;       // process every 10 seconds
const BATCH_SIZE = 3;          // messages per account per tick
const QUIET_START = 8;         // 08:00
const QUIET_END = 22;          // 22:00
const MSG_DELAY_MIN = 2_000;
const MSG_DELAY_MAX = 5_000;

// ─── Types ───────────────────────────────────────────────────────────────────

interface CampaignRunState {
  campaignId: string;
  userId: string;
  accountId: string | null;
  roundRobin: boolean;
  messageTemplate: string;
  contactListId: string;
  dailySendLimit: number;
  status: "active" | "paused";
}

export interface QueueProgress {
  campaignId: string;
  total: number;
  sent: number;
  opened: number;
  replied: number;
  failed: number;
  queued: number;
}

interface AccountRow {
  id: string;
  daily_limit: number;
  messages_sent_today: number;
}

declare global {
  // eslint-disable-next-line no-var
  var campaignQueue: CampaignQueue | undefined;
}

// ─── CampaignQueue ───────────────────────────────────────────────────────────

export class CampaignQueue {
  private campaigns = new Map<string, CampaignRunState>();
  private io: SocketServer;
  private timer: ReturnType<typeof setInterval>;
  private ticking = false;

  constructor(io: SocketServer) {
    this.io = io;
    this.timer = setInterval(() => this.tick(), TICK_MS);
    console.log("[CampaignQueue] Initialized — tick every", TICK_MS / 1000, "s");
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async enqueueCampaign(campaignId: string): Promise<void> {
    const db = createAdminClient();

    const { data: campaign, error } = await (db as any)
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single() as { data: CampaignRow | null; error: unknown };

    if (error || !campaign) throw new Error(`Campaign ${campaignId} not found`);
    if (!campaign.contact_list_id) throw new Error("Campaign has no contact list assigned");
    if (!campaign.message_template) throw new Error("Campaign has no message template");

    // Load all contacts
    const { data: contacts } = await (db as any)
      .from("contacts")
      .select("id, name, phone_number")
      .eq("list_id", campaign.contact_list_id) as { data: ContactRow[] | null };

    if (!contacts?.length) throw new Error("Contact list is empty");

    // Create queued message_log rows (upsert — safe for re-enqueue)
    const logs = contacts.map((c) => ({
      campaign_id: campaignId,
      contact_id: c.id,
      account_id: null,
      status: "queued",
    }));

    await (db as any)
      .from("message_logs")
      .upsert(logs, { onConflict: "campaign_id,contact_id", ignoreDuplicates: true });

    // Mark campaign active
    await (db as any)
      .from("campaigns")
      .update({
        status: "active",
        total_contacts: contacts.length,
        started_at: new Date().toISOString(),
        sent_count: 0,
        fail_count: 0,
        open_count: 0,
        reply_count: 0,
      })
      .eq("id", campaignId);

    this.campaigns.set(campaignId, {
      campaignId,
      userId: campaign.user_id,
      accountId: campaign.account_id,
      roundRobin: campaign.round_robin ?? false,
      messageTemplate: campaign.message_template,
      contactListId: campaign.contact_list_id,
      dailySendLimit: campaign.daily_send_limit ?? 0,
      status: "active",
    });

    console.log(`[CampaignQueue] Enqueued campaign ${campaignId} — ${contacts.length} contacts`);
  }

  async pauseCampaign(campaignId: string): Promise<void> {
    const state = this.campaigns.get(campaignId);
    if (state) state.status = "paused";
    const db = createAdminClient();
    await (db as any).from("campaigns").update({ status: "paused" }).eq("id", campaignId);
  }

  async resumeCampaign(campaignId: string): Promise<void> {
    let state = this.campaigns.get(campaignId);

    if (!state) {
      const db = createAdminClient();
      const { data: campaign } = await (db as any)
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single() as { data: CampaignRow | null };

      if (campaign?.contact_list_id && campaign?.message_template) {
        state = {
          campaignId,
          userId: campaign.user_id,
          accountId: campaign.account_id,
          roundRobin: campaign.round_robin ?? false,
          messageTemplate: campaign.message_template,
          contactListId: campaign.contact_list_id,
          dailySendLimit: campaign.daily_send_limit ?? 0,
          status: "active",
        };
        this.campaigns.set(campaignId, state);
      }
    } else {
      state.status = "active";
    }

    const db = createAdminClient();
    await (db as any).from("campaigns").update({ status: "active" }).eq("id", campaignId);
  }

  async getCampaignProgress(campaignId: string): Promise<QueueProgress> {
    const db = createAdminClient();
    const { data: logs } = await (db as any)
      .from("message_logs")
      .select("status")
      .eq("campaign_id", campaignId) as { data: { status: string }[] | null };

    const counts = { total: 0, queued: 0, sent: 0, delivered: 0, opened: 0, replied: 0, failed: 0 };
    for (const log of logs ?? []) {
      counts.total++;
      if (log.status in counts) (counts as Record<string, number>)[log.status]++;
    }
    return {
      campaignId,
      total: counts.total,
      sent: counts.sent + counts.delivered + counts.opened + counts.replied,
      opened: counts.opened + counts.replied,
      replied: counts.replied,
      failed: counts.failed,
      queued: counts.queued,
    };
  }

  shutdown(): void {
    clearInterval(this.timer);
  }

  // ── Private: processing tick ───────────────────────────────────────────────

  private async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;

    try {
      for (const [campaignId, state] of this.campaigns) {
        if (state.status !== "active") continue;

        // Respect quiet hours
        if (this.isQuietHours()) {
          console.log("[CampaignQueue] Quiet hours — skipping");
          continue;
        }

        const account = await this.pickBestAccount(state);
        if (!account) {
          console.log(`[CampaignQueue] No available accounts for campaign ${campaignId}`);
          continue;
        }

        await this.processBatch(campaignId, state, account);
      }
    } catch (err) {
      console.error("[CampaignQueue] Tick error:", err);
    } finally {
      this.ticking = false;
    }
  }

  private async processBatch(
    campaignId: string,
    state: CampaignRunState,
    account: AccountRow
  ): Promise<void> {
    const db = createAdminClient();

    // Fetch next queued batch (lock by updating to 'sending' status optimistically)
    const { data: logs } = await (db as any)
      .from("message_logs")
      .select("id, contact_id, contacts(name, phone_number, custom_fields)")
      .eq("campaign_id", campaignId)
      .eq("status", "queued")
      .limit(BATCH_SIZE) as { data: LogWithContact[] | null };

    if (!logs?.length) {
      // No more queued messages — campaign complete
      await (db as any)
        .from("campaigns")
        .update({ status: "completed" })
        .eq("id", campaignId);
      this.campaigns.delete(campaignId);
      this.io.emit("campaign_completed", { campaignId });
      this.io.to(`campaign:${campaignId}`).emit("campaign_completed", { campaignId });
      console.log(`[CampaignQueue] Campaign ${campaignId} completed`);
      return;
    }

    let accountSentToday = account.messages_sent_today;

    for (const log of logs) {
      // Stop if daily limit reached
      if (accountSentToday >= account.daily_limit) break;
      if (state.dailySendLimit > 0 && accountSentToday >= state.dailySendLimit) break;

      const contact = (log as any).contacts as ContactRow | null;
      if (!contact) continue;

      // Optimistic lock: update to 'sent' only if still 'queued'
      const { count } = await (db as any)
        .from("message_logs")
        .update({
          status: "sent",
          account_id: account.id,
          sent_at: new Date().toISOString(),
        })
        .eq("id", log.id)
        .eq("status", "queued")
        .select("id", { count: "exact", head: true }) as { count: number | null };

      if (!count) continue; // Another process grabbed it

      const message = interpolateTemplate(state.messageTemplate, {
        name: contact.name,
        phone: contact.phone_number,
        ...flattenCustomFields(contact.custom_fields),
      });

      try {
        const sm = global.sessionManager;
        if (!sm) throw new Error("Session manager unavailable");
        await sm.sendMessage(account.id, contact.phone_number, message);
        accountSentToday++;

        // Increment campaign & account counters
        await Promise.all([
          (db as any).rpc("increment_campaign_sent", { p_campaign_id: campaignId }),
          (db as any)
            .from("accounts")
            .update({ messages_sent_today: accountSentToday })
            .eq("id", account.id),
        ]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Send failed";
        await (db as any)
          .from("message_logs")
          .update({ status: "failed", error_message: msg })
          .eq("id", log.id);
        await (db as any).rpc("increment_campaign_failed", { p_campaign_id: campaignId });
      }

      // Emit live progress
      const progress = await this.getCampaignProgress(campaignId);
      this.io.emit("campaign_progress", progress);
      this.io.to(`campaign:${campaignId}`).emit("campaign_progress", progress);

      // Human-like delay between sends
      await sleep(MSG_DELAY_MIN + Math.random() * (MSG_DELAY_MAX - MSG_DELAY_MIN));
    }
  }

  private async pickBestAccount(state: CampaignRunState): Promise<AccountRow | null> {
    const db = createAdminClient();

    let query = (db as any)
      .from("accounts")
      .select("id, daily_limit, messages_sent_today")
      .eq("user_id", state.userId)
      .eq("status", "connected");

    if (!state.roundRobin && state.accountId) {
      query = query.eq("id", state.accountId);
    }

    const { data: accounts } = await query as { data: AccountRow[] | null };
    if (!accounts?.length) return null;

    // Filter by remaining quota
    const available = accounts.filter((a) => a.messages_sent_today < a.daily_limit);
    if (!available.length) return null;

    // Filter by active Baileys session
    const sm = global.sessionManager;
    const live = available.filter((a) => {
      if (!sm) return false;
      return sm.getSession(a.id)?.status.status === "connected";
    });
    if (!live.length) return null;

    // Pick account with most remaining capacity
    return live.sort(
      (a, b) => b.daily_limit - b.messages_sent_today - (a.daily_limit - a.messages_sent_today)
    )[0];
  }

  private isQuietHours(): boolean {
    const h = new Date().getHours();
    return h < QUIET_START || h >= QUIET_END;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function interpolateTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function flattenCustomFields(fields: Record<string, unknown> | null): Record<string, string> {
  if (!fields) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = String(v ?? "");
  }
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Row types (internal) ─────────────────────────────────────────────────────

interface CampaignRow {
  id: string;
  user_id: string;
  account_id: string | null;
  contact_list_id: string | null;
  message_template: string | null;
  round_robin: boolean | null;
  daily_send_limit: number | null;
}

interface ContactRow {
  id: string;
  name: string;
  phone_number: string;
  custom_fields: Record<string, unknown> | null;
}

interface LogWithContact {
  id: string;
  contact_id: string;
  contacts: ContactRow | null;
}
