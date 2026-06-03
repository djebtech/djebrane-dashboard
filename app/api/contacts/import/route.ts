import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ContactInput {
  name: string;
  phone_number: string;
  custom_fields?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { listId, newListName, contacts } = await req.json() as {
    listId?: string;
    newListName?: string;
    contacts?: ContactInput[];
  };

  if (!contacts?.length) return NextResponse.json({ error: "No contacts provided" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  let resolvedListId = listId;

  // Create new list if name provided
  if (!resolvedListId && newListName?.trim()) {
    const { data: newList, error: listErr } = await sb
      .from("contact_lists")
      .insert({ user_id: user.id, name: newListName.trim() })
      .select("id").single() as { data: { id: string } | null; error: { message: string } | null };
    if (listErr || !newList) return NextResponse.json({ error: listErr?.message ?? "Failed to create list" }, { status: 500 });
    resolvedListId = newList.id;
  }

  if (!resolvedListId) return NextResponse.json({ error: "listId or newListName required" }, { status: 400 });

  // Normalise phone numbers and filter invalids
  const valid: ContactInput[] = [];
  const invalid: ContactInput[] = [];

  for (const c of contacts) {
    const phone = c.phone_number?.replace(/\s/g, "").trim();
    if (!phone || phone.length < 7) { invalid.push(c); continue; }
    valid.push({ ...c, phone_number: phone });
  }

  if (!valid.length) return NextResponse.json({ imported: 0, skipped: invalid.length, listId: resolvedListId });

  const rows = valid.map((c) => ({
    user_id:       user.id,
    list_id:       resolvedListId,
    name:          c.name?.trim() || "Unknown",
    phone_number:  c.phone_number,
    custom_fields: c.custom_fields && Object.keys(c.custom_fields).length ? c.custom_fields : null,
  }));

  // Upsert — skip duplicates (same phone in same list)
  const { data: inserted, error: insertErr } = await sb
    .from("contacts")
    .upsert(rows, { onConflict: "list_id,phone_number", ignoreDuplicates: true })
    .select("id") as { data: { id: string }[] | null; error: { message: string } | null };

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  const imported = inserted?.length ?? 0;
  const skipped  = valid.length - imported + invalid.length;

  return NextResponse.json({ imported, skipped, invalid: invalid.length, listId: resolvedListId });
}
