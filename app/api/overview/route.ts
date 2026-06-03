import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const [msgsRes, campaignsRes, sequencesRes, contactsRes, activityRes] = await Promise.all([
    // Total messages sent (all statuses except queued/failed)
    sb.from("message_logs")
      .select("id", { count: "exact", head: true })
      .in("status", ["sent","delivered","opened","replied"]),
    // Active campaigns
    sb.from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active"),
    // Active sequences
    sb.from("sequences")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active"),
    // Total contacts
    sb.from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    // Recent activity — last 20 message_log events
    sb.from("message_logs")
      .select("id, status, sent_at, replied_at, opened_at, error_message, contacts(name, phone_number), campaigns(name)")
      .order("sent_at", { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({
    totalMessages:    msgsRes.count      ?? 0,
    activeCampaigns:  campaignsRes.count  ?? 0,
    activeSequences:  sequencesRes.count  ?? 0,
    totalContacts:    contactsRes.count   ?? 0,
    recentActivity:   activityRes.data    ?? [],
  });
}
