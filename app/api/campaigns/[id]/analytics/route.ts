import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id: campaignId } = params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: campaign } = await sb
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single() as { data: Record<string, unknown> | null };

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // Full message log with contact details
  const { data: logs } = await sb
    .from("message_logs")
    .select(`
      id, status, sent_at, delivered_at, opened_at, replied_at, error_message, account_id,
      contacts(id, name, phone_number)
    `)
    .eq("campaign_id", campaignId)
    .order("sent_at", { ascending: false }) as { data: LogRow[] | null };

  const allLogs = logs ?? [];

  // ── Hourly breakdown ────────────────────────────────────────────────────────
  const hourly: Record<number, { sent: number; replied: number }> = {};
  for (let h = 0; h < 24; h++) hourly[h] = { sent: 0, replied: 0 };
  for (const log of allLogs) {
    if (log.sent_at) {
      const h = new Date(log.sent_at).getHours();
      hourly[h].sent++;
    }
    if (log.replied_at) {
      const h = new Date(log.replied_at).getHours();
      hourly[h].replied++;
    }
  }

  // ── Daily breakdown ─────────────────────────────────────────────────────────
  const dailyMap: Record<string, { sent: number; replied: number }> = {};
  for (const log of allLogs) {
    if (log.sent_at) {
      const d = log.sent_at.slice(0, 10);
      if (!dailyMap[d]) dailyMap[d] = { sent: 0, replied: 0 };
      dailyMap[d].sent++;
    }
    if (log.replied_at) {
      const d = log.replied_at.slice(0, 10);
      if (!dailyMap[d]) dailyMap[d] = { sent: 0, replied: 0 };
      dailyMap[d].replied++;
    }
  }
  const daily = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  // ── Status summary ──────────────────────────────────────────────────────────
  const statusCounts = { queued: 0, sent: 0, delivered: 0, opened: 0, replied: 0, failed: 0 };
  for (const log of allLogs) {
    if (log.status in statusCounts) (statusCounts as Record<string, number>)[log.status]++;
  }

  return NextResponse.json({
    campaign,
    statusCounts,
    logs: allLogs.slice(0, 500), // cap for safety
    hourly: Object.entries(hourly).map(([h, v]) => ({ hour: Number(h), ...v })),
    daily,
  });
}

interface LogRow {
  id: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
  error_message: string | null;
  account_id: string | null;
  contacts: { id: string; name: string; phone_number: string } | null;
}
