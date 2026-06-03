import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("contacts").delete().eq("id", params.id).eq("user_id", user.id);
  return NextResponse.json({ deleted: true });
}
