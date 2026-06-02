import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json() as {
    name?: string;
    accountId?: string | null;
    contactListId?: string;
    messageTemplate?: string;
    scheduledAt?: string | null;
    roundRobin?: boolean;
    dailySendLimit?: number;
  };

  const {
    name,
    accountId = null,
    contactListId,
    messageTemplate,
    scheduledAt = null,
    roundRobin = false,
    dailySendLimit = 0,
  } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!contactListId) return NextResponse.json({ error: "Contact list required" }, { status: 400 });
  if (!messageTemplate?.trim()) return NextResponse.json({ error: "Message template required" }, { status: 400 });

  // Resolve account — if round-robin just pick first connected account for the DB FK
  let resolvedAccountId = accountId;
  if (!resolvedAccountId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: acc } = await (supabase as any)
      .from("accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "connected")
      .limit(1)
      .single() as { data: { id: string } | null };
    resolvedAccountId = acc?.id ?? null;
  }
  if (!resolvedAccountId) return NextResponse.json({ error: "No connected account found" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaign, error } = await (supabase as any)
    .from("campaigns")
    .insert({
      user_id: user.id,
      name: name.trim(),
      status: "draft",
      account_id: resolvedAccountId,
      contact_list_id: contactListId,
      message_template: messageTemplate.trim(),
      scheduled_at: scheduledAt,
      round_robin: roundRobin,
      daily_send_limit: dailySendLimit,
      total_contacts: 0,
      sent_count: 0,
      open_count: 0,
      reply_count: 0,
      fail_count: 0,
    })
    .select()
    .single() as { data: { id: string; name: string } | null; error: { message: string } | null };

  if (error || !campaign) {
    return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ campaignId: campaign.id, name: campaign.name });
}
