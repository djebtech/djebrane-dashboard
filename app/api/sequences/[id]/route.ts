import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface StepInput {
  step_number: number;
  label: string;
  message_template: string;
  delay_hours: number;
}

// PUT /api/sequences/[id] — update sequence + replace steps
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: existing } = await sb
    .from("sequences").select("id").eq("id", id).eq("user_id", user.id).single() as { data: { id: string } | null };
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as {
    name?: string;
    accountId?: string | null;
    roundRobin?: boolean;
    stopOnReply?: boolean;
    quietStart?: number;
    quietEnd?: number;
    steps?: StepInput[];
  };

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.accountId !== undefined) updates.account_id = body.accountId;
  if (body.roundRobin !== undefined) updates.round_robin = body.roundRobin;
  if (body.stopOnReply !== undefined) updates.stop_on_reply = body.stopOnReply;
  if (body.quietStart !== undefined) updates.quiet_hours_start = body.quietStart;
  if (body.quietEnd !== undefined) updates.quiet_hours_end = body.quietEnd;

  if (Object.keys(updates).length) {
    await sb.from("sequences").update(updates).eq("id", id);
  }

  // Replace steps if provided
  if (body.steps?.length) {
    await sb.from("sequence_steps").delete().eq("sequence_id", id);
    const rows = body.steps.map((s, i) => ({
      sequence_id:      id,
      step_number:      s.step_number ?? i + 1,
      label:            s.label.trim(),
      message_template: s.message_template.trim(),
      delay_hours:      s.delay_hours ?? 0,
    }));
    await sb.from("sequence_steps").insert(rows);
  }

  return NextResponse.json({ updated: true });
}

// DELETE /api/sequences/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: existing } = await sb
    .from("sequences").select("id").eq("id", id).eq("user_id", user.id).single() as { data: { id: string } | null };
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  global.sequenceEngine?.pauseSequence(id).catch(() => {});

  await sb.from("sequence_enrollments").delete().eq("sequence_id", id);
  await sb.from("sequence_steps").delete().eq("sequence_id", id);
  await sb.from("sequences").delete().eq("id", id);

  return NextResponse.json({ deleted: true });
}
