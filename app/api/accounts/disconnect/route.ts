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

  const { accountId, deleteAccount = false } = await req.json() as {
    accountId?: string;
    deleteAccount?: boolean;
  };

  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Verify ownership
  const { data: account } = await sb
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .single() as { data: { id: string } | null };

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // Destroy the Baileys session (logs out + removes creds from disk)
  await sessionManager.destroySession(accountId);

  if (deleteAccount) {
    await sb.from("accounts").delete().eq("id", accountId);
    return NextResponse.json({ deleted: true });
  }

  // Just disconnect — keep the record
  await sb
    .from("accounts")
    .update({ status: "disconnected" })
    .eq("id", accountId);

  return NextResponse.json({ disconnected: true });
}
