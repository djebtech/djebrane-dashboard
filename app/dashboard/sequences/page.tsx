"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import {
  Plus, GitBranch, Play, Pause, BarChart2, Trash2,
  Loader2, ChevronRight, Users, Clock,
} from "lucide-react";
import { CreateSequenceModal } from "@/components/dashboard/CreateSequenceModal";
import { Skeleton } from "@/components/ui/skeleton";

interface Sequence {
  id: string; name: string; status: string;
  stop_on_reply: boolean;
  quiet_hours_start: number; quiet_hours_end: number;
  step_count: number; active_enrollments: number;
  created_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  active: "text-[#25D366] bg-[#25D366]/10",
  paused: "text-amber-400 bg-amber-400/10",
};

export default function SequencesPage() {
  const [sequences, setSequences]   = useState<Sequence[]>([]);
  const [loading, setLoading]       = useState(true);
  const [acting, setActing]         = useState<Record<string, string>>({});
  const [showModal, setShowModal]   = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const loadSequences = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/sequences/list");
    if (res.ok) setSequences(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSequences();
    const s = io(window.location.origin, { path: "/api/socket", transports: ["websocket", "polling"] });
    socketRef.current = s;
    s.on("sequence_step_sent", () => loadSequences());
    return () => { s.disconnect(); };
  }, [loadSequences]);

  async function act(id: string, action: "pause" | "resume" | "delete") {
    setActing((p) => ({ ...p, [id]: action }));
    try {
      if (action === "delete") {
        if (!confirm("Delete this sequence and all enrollments?")) return;
        await fetch(`/api/sequences/${id}`, { method: "DELETE" });
        setSequences((p) => p.filter((s) => s.id !== id));
        toast.success("Sequence deleted");
      } else {
        await fetch(`/api/sequences/${id}/${action}`, { method: "POST" });
        const statusMap = { pause: "paused", resume: "active" } as const;
        setSequences((p) => p.map((s) => s.id === id ? { ...s, status: statusMap[action] } : s));
        toast.success(action === "pause" ? "Sequence paused" : "Sequence resumed");
      }
    } catch (err) {
      console.error(`Sequence ${action} failed:`, err);
      toast.error(`Failed to ${action} sequence`);
    } finally {
      setActing((p) => ({ ...p, [id]: "" }));
    }
  }

  return (
    <>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Sequences</h1>
            <p className="text-sm text-white/40 mt-1">Automated multi-step drip flows</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] transition-colors"
          >
            <Plus className="h-4 w-4" /> New Sequence
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.03] px-5 py-4">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-72 max-w-full" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        ) : sequences.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <GitBranch className="h-8 w-8 text-white/20" />
            </div>
            <p className="text-sm font-medium text-white/40">No sequences yet</p>
            <p className="text-xs text-white/20 mt-1">Nurture leads automatically with a drip flow</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-5 flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] transition-colors"
            >
              <Plus className="h-4 w-4" /> Build your first sequence
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sequences.map((seq) => (
              <div key={seq.id} className="rounded-xl border border-white/5 bg-white/[0.03] hover:border-white/10 transition-colors">
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <GitBranch className={`h-5 w-5 ${seq.status === "active" ? "text-[#25D366]" : "text-white/30"}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/dashboard/sequences/${seq.id}`}
                        className="text-sm font-semibold text-white hover:text-[#25D366] transition-colors"
                      >{seq.name}</Link>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${STATUS_COLOR[seq.status] ?? "text-white/40 bg-white/5"}`}>
                        {seq.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-white/30">
                      <span className="flex items-center gap-1">
                        <ChevronRight className="h-3 w-3" /> {seq.step_count} step{seq.step_count !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {seq.active_enrollments.toLocaleString()} active
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {seq.quiet_hours_start}:00–{seq.quiet_hours_end}:00
                      </span>
                      {seq.stop_on_reply && (
                        <span className="text-[#25D366]">Stops on reply</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {seq.status === "active" ? (
                      <button onClick={() => act(seq.id, "pause")} disabled={!!acting[seq.id]}
                        title="Pause" className="p-2 rounded-lg bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 disabled:opacity-40 transition-colors"
                      >
                        {acting[seq.id] === "pause" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                      </button>
                    ) : (
                      <button onClick={() => act(seq.id, "resume")} disabled={!!acting[seq.id]}
                        title="Resume" className="p-2 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 disabled:opacity-40 transition-colors"
                      >
                        {acting[seq.id] === "resume" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      </button>
                    )}
                    <Link href={`/dashboard/sequences/${seq.id}`}
                      className="p-2 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors" title="View stats"
                    >
                      <BarChart2 className="h-4 w-4" />
                    </Link>
                    <button onClick={() => act(seq.id, "delete")} disabled={!!acting[seq.id]}
                      title="Delete" className="p-2 rounded-lg bg-white/5 text-white/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40 transition-colors"
                    >
                      {acting[seq.id] === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <CreateSequenceModal
          onClose={() => setShowModal(false)}
          onCreated={() => { loadSequences(); setShowModal(false); }}
        />
      )}
    </>
  );
}
