import {
  MessageCircle,
  Megaphone,
  Users,
  TrendingUp,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

const stats = [
  {
    label: "Total Messages Sent",
    value: "124,830",
    change: "+12.5%",
    positive: true,
    icon: MessageCircle,
    color: "text-[#25D366]",
    bg: "bg-[#25D366]/10",
  },
  {
    label: "Active Campaigns",
    value: "8",
    change: "+2 this week",
    positive: true,
    icon: Megaphone,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    label: "Total Contacts",
    value: "42,150",
    change: "+3,200 new",
    positive: true,
    icon: Users,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  {
    label: "Avg. Open Rate",
    value: "68.4%",
    change: "+4.1%",
    positive: true,
    icon: TrendingUp,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
];

const recentCampaigns = [
  { name: "Summer Promo", status: "active", sent: 8420, open: 74, reply: 12 },
  { name: "Re-engagement Wave 3", status: "active", sent: 3100, open: 61, reply: 8 },
  { name: "Product Launch — V2", status: "paused", sent: 12000, open: 70, reply: 15 },
  { name: "Cold Outreach Batch", status: "completed", sent: 5000, open: 58, reply: 6 },
  { name: "Q2 Newsletter", status: "draft", sent: 0, open: 0, reply: 0 },
];

const statusColors: Record<string, string> = {
  active: "text-[#25D366] bg-[#25D366]/10",
  paused: "text-amber-400 bg-amber-400/10",
  completed: "text-blue-400 bg-blue-400/10",
  draft: "text-white/40 bg-white/5",
};

export default function OverviewPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Overview</h1>
        <p className="text-sm text-white/40 mt-1">
          WhatsApp campaign performance at a glance
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/5 bg-white/[0.03] p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
                {stat.label}
              </p>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
            <p className={`text-xs font-medium ${stat.positive ? "text-[#25D366]" : "text-red-400"}`}>
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* Recent campaigns */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#25D366]" />
            <h2 className="text-sm font-semibold text-white">Recent Campaigns</h2>
          </div>
          <a href="/dashboard/campaigns" className="text-xs text-[#25D366] hover:underline">
            View all
          </a>
        </div>
        <div className="divide-y divide-white/5">
          {recentCampaigns.map((c) => (
            <div key={c.name} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{c.name}</p>
              </div>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[c.status]}`}>
                {c.status}
              </span>
              <div className="hidden md:flex items-center gap-6 text-xs text-white/40 tabular-nums">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#25D366]" />
                  {c.sent.toLocaleString()} sent
                </span>
                <span>{c.open}% open</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  {c.reply}% reply
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Account health strip */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-[#25D366]" />
          <h2 className="text-sm font-semibold text-white">Account Health</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: "+213 555 001", score: 92, status: "connected" },
            { name: "+213 555 002", score: 78, status: "warming" },
            { name: "+213 555 003", score: 55, status: "warming" },
            { name: "+213 555 004", score: 12, status: "disconnected" },
          ].map((acc) => (
            <div key={acc.name} className="rounded-lg bg-white/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-white/60 truncate">{acc.name}</p>
                {acc.status === "connected" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#25D366]" />
                ) : acc.status === "disconnected" ? (
                  <XCircle className="h-3.5 w-3.5 text-red-400" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                )}
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${acc.score}%`,
                    background:
                      acc.score > 70
                        ? "#25D366"
                        : acc.score > 40
                        ? "#F59E0B"
                        : "#EF4444",
                  }}
                />
              </div>
              <p className="text-xs font-bold text-white">{acc.score}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
