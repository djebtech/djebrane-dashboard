"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import {
  Plus, Megaphone, Play, Pause, BarChart2, Trash2,
  Loader2, RefreshCw, CheckCircle,
} from "lucide-react";
import { CreateCampaignModal } from "@/components/dashboard/CreateCampaignModal";

interface Campaign {
  id: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  total_contacts: number;
  sent_count: number;
  open_count: number;
  reply_count: number;
  fail_count: number;
  started_at: string | null;
  created_at: string;
}

interface Progress { campaignId: string; sent: number; total: number; failed: number; }

const STATUS_COLOR: Record<string, string> = {
  active:    "text-[#25D366] bg-[#25D366]/10",
  paused:    "text-amber-400 bg-amber-400/10",
  completed: "text-blue-400  bg-blue-400/10",
  draft:     "text-white/40  bg-white/5",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [liveProgress, setLiveProgress] = useState<Record<string, Progress>>({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const fetchCampaigns = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await fetch("/api/campaigns/list" as any).catch(() => null);
    // fall back to Supabase-backed endpoint
    const res2 = await fetch("/api/campaigns/status");
    if (res2.ok) {
      setCampaigns(await res2.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCampaigns();
    const s = io(window.location.origin, { path: "/api/socket", transports: ["websocket", "polling"] });
    socketRef.current = s;

    s.on("campaign_progress", (p: Progress) => {
      setLiveProgress(prev => ({ ...prev, [p.campaignId]: p }));
      setCampaigns(prev => prev.map(c =>
        c.id === p.campaignId ? { ...c, sent_count: p.sent, fail_count: p.failed } : c
      ));
    });

    s.on("campaign_completed", ({ campaignId }: { campaignId: string }) => {
      setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: "completed" } : c));
    });

    return () => { s.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCampaigns() {
    setLoading(true);
    const res = await fetch("/api/campaigns/status");
    if (res.ok) setCampaigns(await res.json());
    setLoading(false);
  }

  async function act(campaignId: string, action: "start" | "pause" | "resume" | "delete") {
    setActing(p => ({ ...p, [campaignId]: action }));
    try {
      if (action === "delete") {
        if (!confirm("Delete this campaign? This also removes all message logs.")) return;
        await fetch(`/api/campaigns/${campaignId}/delete`, { method: "DELETE" });
        setCampaigns(p => p.filter(c => c.id !== campaignId));
      } else {
        await fetch(`/api/campaigns/${campaignId}/${action}`, { method: "POST" });
        const statusMap = { start: "active", pause: "paused", resume: "active" } as const;
        setCampaigns(p => p.map(c => c.id === campaignId ? { ...c, status: statusMap[action] } : c));
      }
    } finally {
      setActing(p => ({ ...p, [campaignId]: "" }));
    }
  }

  function isActing(id: string) { return !!acting[id]; }

  function progressPct(c: Campaign) {
    const live = liveProgress[c.id];
    const sent = live?.sent ?? c.sent_count;
    const total = c.total_contacts;
    if (!total) return 0;
    return Math.min(100, Math.round((sent / total) * 100));
  }

  function openRate(c: Campaign) {
    const sent = c.sent_count;
    if (!sent) return "—";
    return Math.round((c.open_count / sent) * 100) + "%";
  }

  function replyRate(c: Campaign) {
    const sent = c.sent_count;
    if (!sent) return "—";
    return Math.round((c.reply_count / sent) * 100) + "%";
  }

  return (
    <>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Campaigns</h1>
            <p className="text-sm text-white/40 mt-1">Create and manage outreach campaigns</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] transition-colors"
          >
            <Plus className="h-4 w-4" /> New Campaign
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 text-[#25D366] animate-spin" /></div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Megaphone className="h-8 w-8 text-white/20" />
            </div>
            <p className="text-sm font-medium text-white/40">No campaigns yet</p>
            <p className="text-xs text-white/20 mt-1">Click &ldquo;New Campaign&rdquo; to launch your first outreach</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => {
              const pct = progressPct(c);
              const live = liveProgress[c.id];
              const sentDisplay = live?.sent ?? c.sent_count;
              return (
                <div key={c.id} className="rounded-xl border border-white/5 bg-white/[0.03] hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Icon */}
                    <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      {c.status === "active" ? <RefreshCw className="h-5 w-5 text-[#25D366] animate-spin" style={{ animationDuration: "3s" }} /> :
                       c.status === "completed" ? <CheckCircle className="h-5 w-5 text-blue-400" /> :
                       <Megaphone className="h-5 w-5 text-white/30" />}
                    </div>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/campaigns/${c.id}`} className="text-sm font-semibold text-white hover:text-[#25D366] transition-colors truncate">
                          {c.name}
                        </Link>
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize shrink-0 ${STATUS_COLOR[c.status]}`}>
                          {c.status}
                        </span>
                      </div>

                      {/* Progress bar */}
                      {c.total_contacts > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-white/30">
                            <span>{sentDisplay.toLocaleString()} / {c.total_contacts.toLocaleString()} sent</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-[#25D366] transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-5 text-xs text-white/40 tabular-nums shrink-0">
                      <span className="text-[#25D366]">{openRate(c)} open</span>
                      <span className="text-amber-400">{replyRate(c)} reply</span>
                      {c.fail_count > 0 && <span className="text-red-400">{c.fail_count} failed</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {c.status === "draft" && (
                        <button onClick={() => act(c.id, "start")} disabled={isActing(c.id)}
                          title="Start" className="p-2 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 disabled:opacity-40 transition-colors"
                        >
                          {acting[c.id] === "start" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        </button>
                      )}
                      {c.status === "active" && (
                        <button onClick={() => act(c.id, "pause")} disabled={isActing(c.id)}
                          title="Pause" className="p-2 rounded-lg bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 disabled:opacity-40 transition-colors"
                        >
                          {acting[c.id] === "pause" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                        </button>
                      )}
                      {c.status === "paused" && (
                        <button onClick={() => act(c.id, "resume")} disabled={isActing(c.id)}
                          title="Resume" className="p-2 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 disabled:opacity-40 transition-colors"
                        >
                          {acting[c.id] === "resume" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        </button>
                      )}
                      <Link href={`/dashboard/campaigns/${c.id}`}
                        className="p-2 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors" title="Analytics"
                      >
                        <BarChart2 className="h-4 w-4" />
                      </Link>
                      <button onClick={() => act(c.id, "delete")} disabled={isActing(c.id)}
                        title="Delete" className="p-2 rounded-lg bg-white/5 text-white/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40 transition-colors"
                      >
                        {acting[c.id] === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <CreateCampaignModal
          onClose={() => setShowModal(false)}
          onCreated={() => { loadCampaigns(); setShowModal(false); }}
        />
      )}
    </>
  );
}
