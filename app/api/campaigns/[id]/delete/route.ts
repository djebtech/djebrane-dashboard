import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(
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
    .select("id, status")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single() as { data: { id: string; status: string } | null };

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Pause first if running
  if (campaign.status === "active") {
    global.campaignQueue?.pauseCampaign(campaignId).catch(() => {});
  }

  await sb.from("message_logs").delete().eq("campaign_id", campaignId);
  await sb.from("campaigns").delete().eq("id", campaignId);

  return NextResponse.json({ deleted: true });
}
