import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, MessageCircle, Eye, Reply } from "lucide-react";

export default function CampaignAnalyticsPage({ params }: { params: { id: string } }) {
  const campaignId = params.id;

  const stats = [
    { label: "Delivered", value: "8,382", pct: "99.5%", icon: CheckCircle2, color: "text-[#25D366]", bg: "bg-[#25D366]/10" },
    { label: "Opened", value: "6,203", pct: "74.0%", icon: Eye, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Replied", value: "1,010", pct: "12.0%", icon: Reply, color: "text-amber-400", bg: "bg-amber-400/10" },
    { label: "Failed", value: "38", pct: "0.5%", icon: XCircle, color: "text-red-400", bg: "bg-red-400/10" },
  ];

  const logs = [
    { contact: "Amine Benali", phone: "+213 550 100 001", status: "replied", time: "10:22 AM" },
    { contact: "Sara Kaci", phone: "+213 560 200 002", status: "delivered", time: "10:21 AM" },
    { contact: "Omar Meziane", phone: "+213 770 300 003", status: "opened", time: "10:20 AM" },
    { contact: "Lina Hamdi", phone: "+213 550 400 004", status: "failed", time: "10:19 AM" },
    { contact: "Youcef Boudj", phone: "+213 560 500 005", status: "sent", time: "10:18 AM" },
  ];

  const statusColors: Record<string, string> = {
    replied: "text-amber-400 bg-amber-400/10",
    delivered: "text-[#25D366] bg-[#25D366]/10",
    opened: "text-blue-400 bg-blue-400/10",
    failed: "text-red-400 bg-red-400/10",
    sent: "text-white/50 bg-white/5",
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/campaigns"
          className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Campaigns
        </Link>
        <span className="text-white/20">/</span>
        <h1 className="text-sm font-medium text-white">Summer Promo 2026</h1>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Campaign Analytics</h1>
          <p className="text-sm text-white/40 mt-1">Campaign ID: {campaignId} · Started May 28, 2026</p>
        </div>
        <span className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-[#25D366]/10 text-[#25D366]">
          Active
        </span>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-white/5 bg-white/[0.03] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">{s.label}</p>
              <div className={`rounded-lg p-2 ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{s.value}</p>
            <p className={`text-xs font-semibold ${s.color}`}>{s.pct}</p>
          </div>
        ))}
      </div>

      {/* Delivery funnel */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-6">
        <div className="flex items-center gap-2 mb-6">
          <MessageCircle className="h-4 w-4 text-[#25D366]" />
          <h2 className="text-sm font-semibold text-white">Delivery Funnel</h2>
        </div>
        <div className="space-y-3">
          {[
            { label: "Sent", pct: 100, value: 8420 },
            { label: "Delivered", pct: 99.5, value: 8382 },
            { label: "Opened", pct: 74, value: 6203 },
            { label: "Replied", pct: 12, value: 1010 },
          ].map((step) => (
            <div key={step.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-white/60">{step.label}</span>
                <span className="text-white font-semibold tabular-nums">
                  {step.value.toLocaleString()} ({step.pct}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#25D366] transition-all"
                  style={{ width: `${step.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message logs */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-[#25D366]" />
          <h2 className="text-sm font-semibold text-white">Recent Message Logs</h2>
        </div>
        <div className="divide-y divide-white/5">
          {logs.map((log, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.02] transition-colors">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{log.contact}</p>
                <p className="text-xs text-white/30">{log.phone}</p>
              </div>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[log.status]}`}>
                {log.status}
              </span>
              <span className="text-xs text-white/30 tabular-nums">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
