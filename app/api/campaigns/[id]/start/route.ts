import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id: campaignId } = params;

  // Verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaign } = await (supabase as any)
    .from("campaigns")
    .select("id, status")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single() as { data: { id: string; status: string } | null };

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (campaign.status === "active") return NextResponse.json({ error: "Already running" }, { status: 400 });

  const queue = global.campaignQueue;
  if (!queue) return NextResponse.json({ error: "Queue not available — run npm run dev:server" }, { status: 503 });

  await queue.enqueueCampaign(campaignId);
  return NextResponse.json({ started: true, campaignId });
}
