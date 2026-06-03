import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface StepInput {
  step_number: number;
  label: string;
  message_template: string;
  delay_hours: number;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json() as {
    name?: string;
    accountId?: string | null;
    roundRobin?: boolean;
    stopOnReply?: boolean;
    quietStart?: number;
    quietEnd?: number;
    campaignId?: string | null;
    steps?: StepInput[];
  };

  const {
    name, accountId = null, roundRobin = false,
    stopOnReply = true, quietStart = 8, quietEnd = 22,
    campaignId = null, steps = [],
  } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!steps.length) return NextResponse.json({ error: "At least one step required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: seq, error: seqErr } = await sb
    .from("sequences")
    .insert({
      user_id:            user.id,
      name:               name.trim(),
      status:             "active",
      account_id:         accountId,
      round_robin:        roundRobin,
      stop_on_reply:      stopOnReply,
      quiet_hours_start:  quietStart,
      quiet_hours_end:    quietEnd,
      campaign_id:        campaignId,
    })
    .select("id, name")
    .single() as { data: { id: string; name: string } | null; error: { message: string } | null };

  if (seqErr || !seq) {
    return NextResponse.json({ error: seqErr?.message ?? "Insert failed" }, { status: 500 });
  }

  // Insert steps
  const stepRows = steps.map((s, i) => ({
    sequence_id:      seq.id,
    step_number:      s.step_number ?? i + 1,
    label:            s.label.trim(),
    message_template: s.message_template.trim(),
    delay_hours:      s.delay_hours ?? 0,
  }));

  await sb.from("sequence_steps").insert(stepRows);

  return NextResponse.json({ sequenceId: seq.id, name: seq.name });
}
