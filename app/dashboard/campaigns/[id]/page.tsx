"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  ArrowLeft, MessageCircle, Eye, Reply, XCircle,
  CheckCircle2, Loader2, Download, Filter,
} from "lucide-react";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface CampaignData {
  id: string; name: string; status: string;
  total_contacts: number; sent_count: number;
  open_count: number; reply_count: number; fail_count: number;
  started_at: string | null;
}
interface LogRow {
  id: string; status: string; sent_at: string | null;
  delivered_at: string | null; opened_at: string | null;
  replied_at: string | null; error_message: string | null;
  contacts: { id: string; name: string; phone_number: string } | null;
}
interface Analytics {
  campaign: CampaignData;
  statusCounts: Record<string, number>;
  logs: LogRow[];
  hourly: { hour: number; sent: number; replied: number }[];
  daily: { date: string; sent: number; replied: number }[];
}
interface Progress { campaignId: string; sent: number; total: number; replied: number; opened: number; failed: number; queued: number; }

const STATUS_COLOR: Record<string, string> = {
  queued:    "text-white/40 bg-white/5",
  sent:      "text-blue-400 bg-blue-400/10",
  delivered: "text-[#25D366] bg-[#25D366]/10",
  opened:    "text-purple-400 bg-purple-400/10",
  replied:   "text-amber-400 bg-amber-400/10",
  failed:    "text-red-400 bg-red-400/10",
};

const CHART_OPTS = {
  responsive: true,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: "#1a1f2e", titleColor: "#fff", bodyColor: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.05)", borderWidth: 1 } },
  scales: {
    x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "rgba(255,255,255,0.3)", font: { size: 11 } } },
    y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "rgba(255,255,255,0.3)", font: { size: 11 } } },
  },
} as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CampaignAnalyticsPage({ params }: { params: { id: string } }) {
  const campaignId = params.id;
  const [data, setData] = useState<Analytics | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [logFilter, setLogFilter] = useState("all");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}/analytics`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));

    fetch(`/api/campaigns/${campaignId}/progress`)
      .then((r) => r.json())
      .then(setProgress);

    const s = io(window.location.origin, { path: "/api/socket", transports: ["websocket", "polling"] });
    socketRef.current = s;

    s.on("connect", () => s.emit("subscribe_campaign", campaignId));

    s.on("campaign_progress", (p: Progress) => {
      if (p.campaignId !== campaignId) return;
      setProgress(p);
    });

    s.on("campaign_completed", ({ campaignId: id }: { campaignId: string }) => {
      if (id !== campaignId) return;
      setData((d) => d ? { ...d, campaign: { ...d.campaign, status: "completed" } } : d);
      // Refresh full analytics
      fetch(`/api/campaigns/${campaignId}/analytics`).then((r) => r.json()).then(setData);
    });

    return () => { s.disconnect(); };
  }, [campaignId]);

  function exportCSV() {
    if (!data) return;
    const rows = [
      ["Name", "Phone", "Status", "Sent At", "Replied At", "Error"],
      ...data.logs.map((l) => [
        l.contacts?.name ?? "",
        l.contacts?.phone_number ?? "",
        l.status,
        l.sent_at ?? "",
        l.replied_at ?? "",
        l.error_message ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `campaign-${campaignId}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <Loader2 className="h-7 w-7 text-[#25D366] animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-white/40 text-sm">Campaign not found.</div>;
  }

  const { campaign, statusCounts, logs, hourly, daily } = data;

  // Merge DB counts with live progress
  const sent    = progress?.sent    ?? campaign.sent_count;
  const replied = progress?.replied ?? campaign.reply_count;
  const opened  = progress?.opened  ?? campaign.open_count;
  const failed  = progress?.failed  ?? campaign.fail_count;
  const total   = campaign.total_contacts;
  const delivered = statusCounts.delivered ?? 0;
  const sentPct = total ? Math.round((sent / total) * 100) : 0;

  const filteredLogs = logFilter === "all" ? logs : logs.filter((l) => l.status === logFilter);

  // ── Chart data ──────────────────────────────────────────────────────────────
  const dailyChart = {
    labels: daily.map((d) => d.date.slice(5)),
    datasets: [
      { label: "Sent", data: daily.map((d) => d.sent), backgroundColor: "rgba(37,211,102,0.7)", borderRadius: 4 },
      { label: "Replied", data: daily.map((d) => d.replied), backgroundColor: "rgba(245,158,11,0.7)", borderRadius: 4 },
    ],
  };

  const hourlyChart = {
    labels: hourly.map((h) => `${h.hour}:00`),
    datasets: [
      { label: "Sent", data: hourly.map((h) => h.sent), borderColor: "#25D366", backgroundColor: "rgba(37,211,102,0.1)", fill: true, tension: 0.4, pointRadius: 3 },
      { label: "Replied", data: hourly.map((h) => h.replied), borderColor: "#F59E0B", backgroundColor: "rgba(245,158,11,0.1)", fill: true, tension: 0.4, pointRadius: 3 },
    ],
  };

  const doughnutChart = {
    labels: ["Sent", "Delivered", "Opened", "Replied", "Failed"],
    datasets: [{
      data: [statusCounts.sent ?? 0, delivered, statusCounts.opened ?? 0, replied, failed],
      backgroundColor: ["#3B82F6", "#25D366", "#A78BFA", "#F59E0B", "#EF4444"],
      borderWidth: 0,
    }],
  };

  return (
    <div className="p-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/campaigns" className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Campaigns
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-sm font-medium text-white truncate max-w-xs">{campaign.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{campaign.name}</h1>
          <p className="text-sm text-white/40 mt-1">
            {total.toLocaleString()} contacts
            {campaign.started_at && ` · Started ${new Date(campaign.started_at).toLocaleDateString()}`}
          </p>
        </div>
        <span className={`text-[11px] font-semibold px-3 py-1.5 rounded-full capitalize ${{
          active: "bg-[#25D366]/10 text-[#25D366]",
          paused: "bg-amber-400/10 text-amber-400",
          completed: "bg-blue-400/10 text-blue-400",
          draft: "bg-white/5 text-white/40",
        }[campaign.status] ?? "bg-white/5 text-white/40"}`}>
          {campaign.status}
        </span>
      </div>

      {/* Live progress bar */}
      {total > 0 && (
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-white">Send progress</span>
            <span className="text-white/40 tabular-nums">{sent.toLocaleString()} / {total.toLocaleString()} ({sentPct}%)</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-[#25D366] transition-all duration-700" style={{ width: `${sentPct}%` }} />
          </div>
          {campaign.status === "active" && (
            <p className="text-xs text-[#25D366] flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Sending in progress…
            </p>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Sent", value: sent.toLocaleString(), icon: MessageCircle, color: "text-[#25D366]", bg: "bg-[#25D366]/10" },
          { label: "Opened", value: total ? `${Math.round((opened / Math.max(sent,1)) * 100)}%` : "—", icon: Eye, color: "text-blue-400", bg: "bg-blue-400/10" },
          { label: "Replied", value: total ? `${Math.round((replied / Math.max(sent,1)) * 100)}%` : "—", icon: Reply, color: "text-amber-400", bg: "bg-amber-400/10" },
          { label: "Failed", value: failed.toLocaleString(), icon: XCircle, color: "text-red-400", bg: "bg-red-400/10" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/5 bg-white/[0.03] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">{s.label}</p>
              <div className={`rounded-lg p-2 ${s.bg}`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
            </div>
            <p className="text-3xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Delivery funnel */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-6">
        <h2 className="text-sm font-semibold text-white mb-5">Delivery Funnel</h2>
        <div className="space-y-3">
          {[
            { label: "Sent",      n: sent,      color: "#3B82F6" },
            { label: "Delivered", n: delivered + opened + replied + sent, color: "#25D366" },
            { label: "Opened",    n: opened,    color: "#A78BFA" },
            { label: "Replied",   n: replied,   color: "#F59E0B" },
          ].map((row) => (
            <div key={row.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50 font-medium">{row.label}</span>
                <span className="text-white font-semibold tabular-nums">
                  {row.n.toLocaleString()} {sent > 0 ? `(${Math.round((row.n / Math.max(sent, 1)) * 100)}%)` : ""}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${sent > 0 ? Math.round((row.n / Math.max(sent, 1)) * 100) : 0}%`, background: row.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Daily bar */}
        <div className="xl:col-span-2 rounded-xl border border-white/5 bg-white/[0.03] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Daily Sends</h2>
            <div className="flex gap-3 text-xs text-white/40">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#25D366]" /> Sent</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-500" /> Replied</span>
            </div>
          </div>
          {daily.length > 0 ? (
            <Bar data={dailyChart} options={{ ...CHART_OPTS, maintainAspectRatio: true, aspectRatio: 2.5 }} />
          ) : (
            <div className="flex items-center justify-center h-32 text-white/20 text-sm">No data yet</div>
          )}
        </div>

        {/* Donut */}
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Status Breakdown</h2>
          {sent > 0 ? (
            <div className="flex flex-col items-center gap-3">
              <Doughnut data={doughnutChart} options={{ responsive: true, plugins: { legend: { position: "bottom", labels: { color: "rgba(255,255,255,0.5)", boxWidth: 10, padding: 8, font: { size: 11 } } }, tooltip: CHART_OPTS.plugins.tooltip }, cutout: "65%" }} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-white/20 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Hourly line chart */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Hourly Engagement</h2>
          <div className="flex gap-3 text-xs text-white/40">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-[#25D366] rounded" /> Sent</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-amber-400 rounded" /> Replied</span>
          </div>
        </div>
        {sent > 0 ? (
          <Line data={hourlyChart} options={{ ...CHART_OPTS, maintainAspectRatio: true, aspectRatio: 3.5 }} />
        ) : (
          <div className="flex items-center justify-center h-24 text-white/20 text-sm">No data yet</div>
        )}
      </div>

      {/* Contact log table */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Contact Log</h2>
          <div className="flex items-center gap-2">
            {/* Filter */}
            <div className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/5 px-3 py-1.5">
              <Filter className="h-3.5 w-3.5 text-white/30" />
              <select value={logFilter} onChange={(e) => setLogFilter(e.target.value)}
                className="bg-transparent text-xs text-white/60 outline-none [color-scheme:dark]"
              >
                <option value="all">All</option>
                {["queued","sent","delivered","opened","replied","failed"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {["Contact","Phone","Status","Sent At","Replied At"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.slice(0, 200).map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-white">{log.contacts?.name ?? "—"}</td>
                  <td className="px-5 py-3 text-sm text-white/50 tabular-nums">{log.contacts?.phone_number ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${STATUS_COLOR[log.status] ?? "text-white/40 bg-white/5"}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-white/30 tabular-nums">
                    {log.sent_at ? new Date(log.sent_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-5 py-3 text-xs text-white/30 tabular-nums">
                    {log.replied_at ? new Date(log.replied_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-white/20">No records match this filter</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredLogs.length > 200 && (
          <div className="px-5 py-3 border-t border-white/5 text-xs text-white/30 text-center">
            Showing first 200 of {filteredLogs.length.toLocaleString()} records · Export CSV for full data
          </div>
        )}
      </div>
    </div>
  );
}
