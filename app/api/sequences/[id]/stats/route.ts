import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id: seqId } = params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [seqRes, stepsRes, enrollRes, logsRes] = await Promise.all([
    sb.from("sequences").select("*").eq("id", seqId).eq("user_id", user.id).single(),
    sb.from("sequence_steps").select("*").eq("sequence_id", seqId).order("step_number"),
    sb.from("sequence_enrollments")
      .select("id, contact_id, current_step, status, enrolled_at, last_sent_at, contacts(name, phone_number)")
      .eq("sequence_id", seqId)
      .order("enrolled_at", { ascending: false }),
    sb.from("message_logs")
      .select("sequence_step, status")
      .eq("sequence_id", seqId),
  ]);

  if (!seqRes.data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Aggregate per-step stats from message_logs
  const logsByStep: Record<number, { sent: number; replied: number; failed: number }> = {};
  for (const log of (logsRes.data ?? []) as { sequence_step: number; status: string }[]) {
    const s = log.sequence_step;
    if (!logsByStep[s]) logsByStep[s] = { sent: 0, replied: 0, failed: 0 };
    if (log.status === "sent" || log.status === "delivered" || log.status === "opened") logsByStep[s].sent++;
    if (log.status === "replied") { logsByStep[s].sent++; logsByStep[s].replied++; }
    if (log.status === "failed") logsByStep[s].failed++;
  }

  // Enrollment summary
  const enrollments = (enrollRes.data ?? []) as { status: string }[];
  const summary = { total: 0, active: 0, completed: 0, stopped: 0, replied: 0 };
  for (const e of enrollments) {
    summary.total++;
    if (e.status in summary) (summary as Record<string, number>)[e.status]++;
  }

  return NextResponse.json({
    sequence: seqRes.data,
    steps: (stepsRes.data ?? []).map((s: Record<string, unknown>) => ({
      ...s,
      stats: logsByStep[s.step_number as number] ?? { sent: 0, replied: 0, failed: 0 },
    })),
    enrollmentSummary: summary,
    enrollments: enrollRes.data ?? [],
  });
}
