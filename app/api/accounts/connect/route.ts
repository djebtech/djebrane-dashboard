import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getSessionManager() {
  if (!global.sessionManager) {
    return null;
  }
  return global.sessionManager;
}

export async function POST(req: NextRequest) {
  const sessionManager = getSessionManager();
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

  const body = await req.json();
  const { name, daily_limit = 200 } = body as { name?: string; daily_limit?: number };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Account name is required" }, { status: 400 });
  }

  // Create the account record in Supabase first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account, error: insertError } = await (supabase as any)
    .from("accounts")
    .insert({
      user_id: user.id,
      name: name.trim(),
      phone_number: "pending",
      type: "baileys",
      status: "disconnected",
      daily_limit,
      messages_sent_today: 0,
      health_score: 100,
    })
    .select()
    .single() as { data: { id: string; name: string } | null; error: { message: string } | null };

  if (insertError || !account) {
    return NextResponse.json({ error: insertError?.message ?? "Insert failed" }, { status: 500 });
  }

  // Start Baileys session (async — QR arrives via Socket.io)
  sessionManager.createSession(account.id).catch((err) => {
    console.error("[connect] createSession error:", err);
  });

  return NextResponse.json({ accountId: account.id, name: account.name });
}
