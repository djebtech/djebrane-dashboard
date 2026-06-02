import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lists } = await (supabase as any)
    .from("contact_lists")
    .select("id, name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false }) as {
      data: { id: string; name: string; created_at: string }[] | null;
    };

  // Get contact counts for each list
  const listsWithCounts = await Promise.all(
    (lists ?? []).map(async (list) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase as any)
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("list_id", list.id) as { count: number | null };
      return { ...list, contact_count: count ?? 0 };
    })
  );

  return NextResponse.json(listsWithCounts);
}
