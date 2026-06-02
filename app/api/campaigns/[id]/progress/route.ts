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
  const { data: campaign } = await (supabase as any)
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single() as { data: { id: string } | null };

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const queue = global.campaignQueue;
  if (!queue) {
    // Fall back to DB counts if queue not running
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: c } = await (supabase as any)
      .from("campaigns")
      .select("total_contacts, sent_count, open_count, reply_count, fail_count")
      .eq("id", campaignId)
      .single() as { data: Record<string, number> | null };

    return NextResponse.json({
      campaignId,
      total: c?.total_contacts ?? 0,
      sent: c?.sent_count ?? 0,
      opened: c?.open_count ?? 0,
      replied: c?.reply_count ?? 0,
      failed: c?.fail_count ?? 0,
      queued: 0,
    });
  }

  const progress = await queue.getCampaignProgress(campaignId);
  return NextResponse.json(progress);
}
