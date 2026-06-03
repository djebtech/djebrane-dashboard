import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id: sequenceId } = params;
  const { contactListId, contactIds } = await req.json() as {
    contactListId?: string;
    contactIds?: string[];
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  // Verify sequence ownership
  const { data: seq } = await sb
    .from("sequences").select("id").eq("id", sequenceId).eq("user_id", user.id).single() as { data: { id: string } | null };
  if (!seq) return NextResponse.json({ error: "Sequence not found" }, { status: 404 });

  let ids: string[] = contactIds ?? [];

  if (contactListId && !ids.length) {
    const { data: contacts } = await sb
      .from("contacts")
      .select("id")
      .eq("list_id", contactListId)
      .eq("user_id", user.id) as { data: { id: string }[] | null };
    ids = contacts?.map((c) => c.id) ?? [];
  }

  if (!ids.length) return NextResponse.json({ error: "No contacts found" }, { status: 400 });

  const engine = global.sequenceEngine;
  if (!engine) return NextResponse.json({ error: "Sequence engine not running — use npm run dev:server" }, { status: 503 });

  const enrolled = await engine.enrollContacts(sequenceId, ids);
  return NextResponse.json({ enrolled });
}
