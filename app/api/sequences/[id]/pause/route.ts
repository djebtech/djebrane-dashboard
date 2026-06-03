import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("sequences").select("id").eq("id", params.id).eq("user_id", user.id).single() as { data: { id: string } | null };
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await global.sequenceEngine?.pauseSequence(params.id);
  return NextResponse.json({ paused: true });
}
