import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: sequences, error } = await sb
    .from("sequences")
    .select("id, name, status, stop_on_reply, quiet_hours_start, quiet_hours_end, round_robin, account_id, campaign_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false }) as {
      data: Record<string, unknown>[] | null;
      error: { message: string } | null;
    };

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with step count and enrollment count
  const enriched = await Promise.all(
    (sequences ?? []).map(async (seq) => {
      const [stepsRes, enrollRes] = await Promise.all([
        sb.from("sequence_steps").select("id", { count: "exact", head: true }).eq("sequence_id", seq.id),
        sb.from("sequence_enrollments").select("id", { count: "exact", head: true }).eq("sequence_id", seq.id).eq("status", "active"),
      ]);
      return {
        ...seq,
        step_count: (stepsRes as any).count ?? 0,
        active_enrollments: (enrollRes as any).count ?? 0,
      };
    })
  );

  return NextResponse.json(enriched);
}
