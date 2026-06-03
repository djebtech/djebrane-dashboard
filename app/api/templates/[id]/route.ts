import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json() as { name?: string; category?: string; messageBody?: string; incrementUsed?: boolean };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  if (body.incrementUsed) {
    await sb.from("templates").update({ used_count: sb.rpc }).eq("id", params.id).eq("user_id", user.id);
    // simpler: just increment via raw update
    const { data: t } = await sb.from("templates").select("used_count").eq("id", params.id).single() as { data: { used_count: number } | null };
    if (t) await sb.from("templates").update({ used_count: t.used_count + 1 }).eq("id", params.id);
    return NextResponse.json({ updated: true });
  }

  const updates: Record<string, string> = {};
  if (body.name)        updates.name         = body.name.trim();
  if (body.category)    updates.category     = body.category;
  if (body.messageBody) updates.message_body = body.messageBody.trim();

  if (!Object.keys(updates).length) return NextResponse.json({ updated: false });

  const { error } = await sb.from("templates").update(updates).eq("id", params.id).eq("user_id", user.id) as { error: { message: string } | null };
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("templates").delete().eq("id", params.id).eq("user_id", user.id);
  return NextResponse.json({ deleted: true });
}
