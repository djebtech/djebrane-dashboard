import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search   = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("templates")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (search)   query = query.ilike("name", `%${search}%`);
  if (category) query = query.eq("category", category);

  const { data, error } = await query as { data: Record<string, unknown>[] | null; error: { message: string } | null };
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { name, category = "Other", messageBody } = await req.json() as {
    name?: string; category?: string; messageBody?: string;
  };

  if (!name?.trim() || !messageBody?.trim()) return NextResponse.json({ error: "Name and message required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("templates")
    .insert({ user_id: user.id, name: name.trim(), category, message_body: messageBody.trim() })
    .select("id, name, category, message_body, used_count, created_at")
    .single() as { data: Record<string, unknown> | null; error: { message: string } | null };

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
