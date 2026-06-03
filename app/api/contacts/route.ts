import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/contacts?listId=xxx&search=yyy&limit=200
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const listId = searchParams.get("listId");
  const search = searchParams.get("search") ?? "";
  const limit  = Math.min(Number(searchParams.get("limit") ?? 200), 500);

  if (!listId) return NextResponse.json({ error: "listId required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("contacts")
    .select("id, name, phone_number, custom_fields, created_at")
    .eq("list_id", listId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone_number.ilike.%${search}%`);
  }

  const { data, error, count } = await query as { data: Record<string, unknown>[] | null; error: { message: string } | null; count: number | null };
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contacts: data ?? [], total: count ?? data?.length ?? 0 });
}

// POST /api/contacts — create a single contact
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { listId, name, phoneNumber, customFields } = await req.json() as {
    listId?: string; name?: string; phoneNumber?: string; customFields?: Record<string, string>;
  };

  if (!listId || !phoneNumber?.trim()) return NextResponse.json({ error: "listId and phoneNumber required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("contacts")
    .insert({ user_id: user.id, list_id: listId, name: name?.trim() ?? "Unknown", phone_number: phoneNumber.trim(), custom_fields: customFields ?? null })
    .select("id")
    .single() as { data: { id: string } | null; error: { message: string } | null };

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data?.id });
}
