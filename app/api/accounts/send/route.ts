import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const sessionManager = global.sessionManager;
  if (!sessionManager) {
    return NextResponse.json(
      { error: "Session manager not available. Run `npm run dev:server`." },
      { status: 503 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json() as {
    accountId?: string;
    phoneNumber?: string;
    message?: string;
    campaignId?: string;
    contactId?: string;
  };

  const { accountId, phoneNumber, message, campaignId, contactId } = body;

  if (!accountId || !phoneNumber || !message) {
    return NextResponse.json(
      { error: "accountId, phoneNumber, and message are required" },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Verify the account belongs to the authenticated user
  const { data: account } = await sb
    .from("accounts")
    .select("id, daily_limit, messages_sent_today")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .single() as { data: { id: string; daily_limit: number; messages_sent_today: number } | null };

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Check daily limit
  if (account.messages_sent_today >= account.daily_limit) {
    return NextResponse.json(
      { error: "Daily message limit reached for this account" },
      { status: 429 }
    );
  }

  try {
    const messageId = await sessionManager.sendMessage(accountId, phoneNumber, message);

    // Increment messages_sent_today in Supabase
    await sb
      .from("accounts")
      .update({ messages_sent_today: account.messages_sent_today + 1 })
      .eq("id", accountId);

    // Log to message_logs if campaign context provided
    if (campaignId && contactId) {
      await sb.from("message_logs").insert({
        campaign_id: campaignId,
        contact_id: contactId,
        account_id: accountId,
        status: "sent",
        sent_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, messageId });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to send message";

    // Log failure if campaign context provided
    if (campaignId && contactId) {
      await sb.from("message_logs").insert({
        campaign_id: campaignId,
        contact_id: contactId,
        account_id: accountId,
        status: "failed",
        error_message: errorMessage,
      });
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
