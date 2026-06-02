import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: accounts, error } = await (supabase as any)
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false }) as {
      data: import("@/lib/types").Account[] | null;
      error: { message: string } | null;
    };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Merge with live session status if session manager is running
  const sessionManager = global.sessionManager;
  const enriched = (accounts ?? []).map((account) => {
    if (!sessionManager) return account;
    const liveStatus = sessionManager.getStatus(account.id);
    if (!liveStatus) return account;
    return {
      ...account,
      status: liveStatus.status === "logged_out" ? "disconnected" : liveStatus.status,
      health_score: liveStatus.healthScore,
      messages_sent_today: liveStatus.messagesSentToday,
      phone_number: liveStatus.phoneNumber ?? account.phone_number,
    };
  });

  return NextResponse.json(enriched);
}
