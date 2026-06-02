import { BarChart3, TrendingUp, MessageCircle, Eye, Reply, XCircle } from "lucide-react";

const dailyData = [
  { day: "Mon", sent: 4200, opened: 3024, replied: 504 },
  { day: "Tue", sent: 5800, opened: 3944, replied: 696 },
  { day: "Wed", sent: 3900, opened: 2457, replied: 429 },
  { day: "Thu", sent: 6100, opened: 4270, replied: 732 },
  { day: "Fri", sent: 7200, opened: 5040, replied: 864 },
  { day: "Sat", sent: 2800, opened: 1848, replied: 336 },
  { day: "Sun", sent: 1900, opened: 1216, replied: 228 },
];

const maxSent = Math.max(...dailyData.map((d) => d.sent));

export default function AnalyticsPage() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
        <p className="text-sm text-white/40 mt-1">Performance overview across all campaigns</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Sent", value: "124,830", change: "+12.5%", icon: MessageCircle, color: "text-[#25D366]", bg: "bg-[#25D366]/10" },
          { label: "Open Rate", value: "68.4%", change: "+4.1%", icon: Eye, color: "text-blue-400", bg: "bg-blue-400/10" },
          { label: "Reply Rate", value: "11.8%", change: "+1.3%", icon: Reply, color: "text-amber-400", bg: "bg-amber-400/10" },
          { label: "Fail Rate", value: "0.8%", change: "-0.2%", icon: XCircle, color: "text-red-400", bg: "bg-red-400/10" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-white/5 bg-white/[0.03] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">{kpi.label}</p>
              <div className={`rounded-lg p-2 ${kpi.bg}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{kpi.value}</p>
            <p className="text-xs font-medium text-[#25D366]">{kpi.change} vs last week</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-4 w-4 text-[#25D366]" />
          <h2 className="text-sm font-semibold text-white">Messages This Week</h2>
          <div className="flex items-center gap-4 ml-auto text-xs text-white/40">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#25D366]" />
              Sent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
              Opened
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
              Replied
            </span>
          </div>
        </div>

        <div className="flex items-end gap-3 h-48">
          {dailyData.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end gap-1 h-40">
                <div
                  className="flex-1 rounded-t-md bg-[#25D366]/70 transition-all hover:bg-[#25D366]"
                  style={{ height: `${(d.sent / maxSent) * 100}%` }}
                  title={`Sent: ${d.sent.toLocaleString()}`}
                />
                <div
                  className="flex-1 rounded-t-md bg-blue-500/70 transition-all hover:bg-blue-500"
                  style={{ height: `${(d.opened / maxSent) * 100}%` }}
                  title={`Opened: ${d.opened.toLocaleString()}`}
                />
                <div
                  className="flex-1 rounded-t-md bg-amber-500/70 transition-all hover:bg-amber-500"
                  style={{ height: `${(d.replied / maxSent) * 100}%` }}
                  title={`Replied: ${d.replied.toLocaleString()}`}
                />
              </div>
              <span className="text-[11px] font-medium text-white/40">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trend */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-[#25D366]" />
          <h2 className="text-sm font-semibold text-white">Top Performing Campaigns</h2>
        </div>
        <div className="space-y-3">
          {[
            { name: "Product Launch V2", open: 70, reply: 15 },
            { name: "Summer Promo 2026", open: 74, reply: 12 },
            { name: "Re-engagement Wave 3", open: 61, reply: 8 },
            { name: "Cold Outreach Batch", open: 58, reply: 6 },
          ].map((c, i) => (
            <div key={c.name} className="flex items-center gap-4">
              <span className="w-5 text-xs font-bold text-white/20 text-right shrink-0">#{i + 1}</span>
              <p className="flex-1 text-sm font-medium text-white truncate">{c.name}</p>
              <div className="flex items-center gap-3 text-xs text-white/40 tabular-nums">
                <span className="text-[#25D366]">{c.open}% open</span>
                <span className="text-amber-400">{c.reply}% reply</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
