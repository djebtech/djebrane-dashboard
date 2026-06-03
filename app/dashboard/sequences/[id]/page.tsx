"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import {
  ArrowLeft, GitBranch, ChevronRight, Users, CheckCircle2,
  XCircle, MessageCircle, Reply, Loader2, Plus, Filter,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepWithStats {
  id: string; step_number: number; label: string;
  message_template: string; delay_hours: number;
  stats: { sent: number; replied: number; failed: number };
}
interface EnrollmentRow {
  id: string; contact_id: string; current_step: number;
  status: string; enrolled_at: string; last_sent_at: string | null;
  contacts: { name: string; phone_number: string } | null;
}
interface EnrollmentSummary { total: number; active: number; completed: number; stopped: number; replied: number; }
interface SequenceInfo {
  id: string; name: string; status: string;
  stop_on_reply: boolean; quiet_hours_start: number; quiet_hours_end: number;
}
interface StatsData {
  sequence: SequenceInfo;
  steps: StepWithStats[];
  enrollmentSummary: EnrollmentSummary;
  enrollments: EnrollmentRow[];
}

const STATUS_COLOR: Record<string, string> = {
  active:    "text-[#25D366] bg-[#25D366]/10",
  completed: "text-blue-400 bg-blue-400/10",
  stopped:   "text-white/40 bg-white/5",
  replied:   "text-amber-400 bg-amber-400/10",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SequenceDetailPage({ params }: { params: { id: string } }) {
  const seqId = params.id;
  const [data, setData]           = useState<StatsData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [selectedStep, setSelectedStep] = useState(0);
  const [enrollFilter, setEnrollFilter] = useState("all");
  const [enrolling, setEnrolling] = useState(false);
  const [lists, setLists]         = useState<{ id: string; name: string; contact_count: number }[]>([]);
  const [enrollListId, setEnrollListId] = useState("");
  const socketRef = useRef<Socket | null>(null);

  async function loadStats() {
    const res = await fetch(`/api/sequences/${seqId}/stats`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadStats();
    fetch("/api/contacts/lists").then(r => r.json()).then(setLists).catch(() => {});

    const s = io(window.location.origin, { path: "/api/socket", transports: ["websocket", "polling"] });
    socketRef.current = s;
    s.on("connect", () => s.emit("subscribe_sequence", seqId));
    s.on("sequence_step_sent", ({ sequenceId }: { sequenceId: string }) => {
      if (sequenceId === seqId) loadStats();
    });
    return () => { s.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seqId]);

  async function handleEnrollMore() {
    if (!enrollListId) return;
    setEnrolling(true);
    await fetch(`/api/sequences/${seqId}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactListId: enrollListId }),
    });
    setEnrolling(false);
    setEnrollListId("");
    loadStats();
  }

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="h-7 w-7 text-[#25D366] animate-spin" /></div>;
  if (!data) return <div className="p-8 text-white/40 text-sm">Sequence not found.</div>;

  const { sequence, steps, enrollmentSummary: es, enrollments } = data;
  const activeStep = steps[selectedStep];
  const filteredEnrollments = enrollFilter === "all" ? enrollments : enrollments.filter(e => e.status === enrollFilter);

  return (
    <div className="p-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/sequences" className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Sequences
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-sm font-medium text-white">{sequence.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{sequence.name}</h1>
          <p className="text-sm text-white/40 mt-1">
            {steps.length} steps · Quiet {sequence.quiet_hours_start}:00–{sequence.quiet_hours_end}:00
            {sequence.stop_on_reply && " · Stops on reply"}
          </p>
        </div>
        <span className={`text-[11px] font-semibold px-3 py-1.5 rounded-full capitalize ${
          sequence.status === "active" ? "bg-[#25D366]/10 text-[#25D366]" : "bg-amber-400/10 text-amber-400"
        }`}>
          {sequence.status}
        </span>
      </div>

      {/* Visual step flow */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Step Flow</h2>
        <div className="flex items-start gap-2 overflow-x-auto pb-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-start gap-2 shrink-0">
              <button
                onClick={() => setSelectedStep(i)}
                className={`flex flex-col items-start gap-1 rounded-xl border px-4 py-3 min-w-[140px] transition-all ${
                  selectedStep === i ? "border-[#25D366] bg-[#25D366]/10" : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedStep === i ? "text-[#25D366]" : "text-white/30"}`}>
                  Step {s.step_number}
                </span>
                <span className="text-xs font-semibold text-white">{s.label}</span>
                <span className="text-[10px] text-white/30">
                  {s.delay_hours === 0 ? "Immediately" : s.delay_hours < 24 ? `+${s.delay_hours}h` : `+${s.delay_hours / 24}d`}
                </span>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-white/40">
                  <span className="text-[#25D366]">{s.stats.sent} sent</span>
                  {s.stats.replied > 0 && <span className="text-amber-400">{s.stats.replied} replied</span>}
                </div>
              </button>
              {i < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-white/20 mt-4 shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Selected step detail */}
        {activeStep && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{activeStep.label}</p>
              <div className="flex items-center gap-4 text-xs text-white/40 tabular-nums">
                <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5 text-blue-400" /> {activeStep.stats.sent} sent</span>
                <span className="flex items-center gap-1"><Reply className="h-3.5 w-3.5 text-amber-400" />
                  {activeStep.stats.sent > 0 ? `${Math.round((activeStep.stats.replied / activeStep.stats.sent) * 100)}%` : "0%"} reply
                </span>
                {activeStep.stats.failed > 0 && (
                  <span className="flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-red-400" /> {activeStep.stats.failed} failed</span>
                )}
              </div>
            </div>
            <div className="rounded-lg bg-[#1a1f2e] p-3 flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-[#25D366] flex items-center justify-center shrink-0 mt-0.5">
                <MessageCircle className="h-3 w-3 text-white" />
              </div>
              <p className="text-xs text-white/60 whitespace-pre-wrap leading-relaxed">
                {activeStep.message_template.replace(/\{name\}/g, "Amine").replace(/\{phone\}/g, "+213 550 001")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Enrollment summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {([
          { label: "Total",     value: es.total,     color: "text-white",        bg: "bg-white/5" },
          { label: "Active",    value: es.active,    color: "text-[#25D366]",    bg: "bg-[#25D366]/10" },
          { label: "Completed", value: es.completed, color: "text-blue-400",     bg: "bg-blue-400/10" },
          { label: "Replied",   value: es.replied,   color: "text-amber-400",    bg: "bg-amber-400/10" },
          { label: "Stopped",   value: es.stopped,   color: "text-white/40",     bg: "bg-white/5" },
        ] as const).map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border border-white/5 ${bg} px-4 py-3 text-center`}>
            <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
            <p className="text-xs text-white/40 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Enroll more */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="h-4 w-4 text-[#25D366]" />
          <h2 className="text-sm font-semibold text-white">Enroll More Contacts</h2>
        </div>
        <div className="flex items-center gap-3">
          <select value={enrollListId} onChange={(e) => setEnrollListId(e.target.value)}
            className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white outline-none [color-scheme:dark]"
          >
            <option value="">Select a contact list…</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({l.contact_count.toLocaleString()})</option>
            ))}
          </select>
          <button onClick={handleEnrollMore} disabled={!enrollListId || enrolling}
            className="flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            Enroll
          </button>
        </div>
      </div>

      {/* Enrollment table */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">
            Enrolled Contacts <span className="text-white/30 font-normal">({enrollments.length.toLocaleString()})</span>
          </h2>
          <div className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/5 px-3 py-1.5">
            <Filter className="h-3.5 w-3.5 text-white/30" />
            <select value={enrollFilter} onChange={(e) => setEnrollFilter(e.target.value)}
              className="bg-transparent text-xs text-white/60 outline-none [color-scheme:dark]"
            >
              <option value="all">All</option>
              {["active","completed","replied","stopped"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {["Contact","Phone","Current Step","Status","Enrolled","Last Sent"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredEnrollments.slice(0, 200).map((e) => (
                <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-white">{e.contacts?.name ?? "—"}</td>
                  <td className="px-5 py-3 text-sm text-white/50 tabular-nums">{e.contacts?.phone_number ?? "—"}</td>
                  <td className="px-5 py-3 text-sm text-white/50 tabular-nums">
                    {e.current_step >= steps.length
                      ? <span className="text-blue-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Done</span>
                      : `Step ${e.current_step + 1} / ${steps.length}`
                    }
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${STATUS_COLOR[e.status] ?? "text-white/40 bg-white/5"}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-white/30 tabular-nums">
                    {new Date(e.enrolled_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-xs text-white/30 tabular-nums">
                    {e.last_sent_at ? new Date(e.last_sent_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
              {filteredEnrollments.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-white/20">No contacts match this filter</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredEnrollments.length > 200 && (
          <div className="px-5 py-3 border-t border-white/5 text-xs text-white/30 text-center">
            Showing 200 of {filteredEnrollments.length.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
