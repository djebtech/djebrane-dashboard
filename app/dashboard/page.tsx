"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Megaphone, GitBranch, Users, Plus, Upload, Smartphone, CheckCircle2, XCircle, Clock, Reply } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  totalMessages: number;
  activeCampaigns: number;
  activeSequences: number;
  totalContacts: number;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  status: string;
  sent_at: string | null;
  replied_at: string | null;
  error_message: string | null;
  contacts: { name: string; phone_number: string } | null;
  campaigns: { name: string } | null;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  sent:      <CheckCircle2 className="h-4 w-4 text-blue-400" />,
  delivered: <CheckCircle2 className="h-4 w-4 text-[#25D366]" />,
  opened:    <CheckCircle2 className="h-4 w-4 text-purple-400" />,
  replied:   <Reply className="h-4 w-4 text-amber-400" />,
  failed:    <XCircle className="h-4 w-4 text-red-400" />,
  queued:    <Clock className="h-4 w-4 text-white/30" />,
};

const STATUS_TEXT: Record<string, string> = {
  sent: "text-blue-400", delivered: "text-[#25D366]", opened: "text-purple-400",
  replied: "text-amber-400", failed: "text-red-400", queued: "text-white/30",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/overview").then(r => r.json()).then(d => { setStats(d); setLoading(false); });
  }, []);

  const metricCards = [
    { label: "Messages Sent",    value: stats?.totalMessages,    icon: MessageCircle, color: "text-[#25D366]", bg: "bg-[#25D366]/10" },
    { label: "Active Campaigns", value: stats?.activeCampaigns,  icon: Megaphone,     color: "text-blue-400",  bg: "bg-blue-400/10" },
    { label: "Active Sequences", value: stats?.activeSequences,  icon: GitBranch,     color: "text-purple-400",bg: "bg-purple-400/10" },
    { label: "Total Contacts",   value: stats?.totalContacts,    icon: Users,         color: "text-amber-400", bg: "bg-amber-400/10" },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Overview</h1>
        <p className="text-sm text-white/40 mt-1">WhatsApp campaign performance at a glance</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {metricCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-white/5 bg-white/[0.03] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">{label}</p>
              <div className={`rounded-lg p-2 ${bg}`}><Icon className={`h-4 w-4 ${color}`} /></div>
            </div>
            {loading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <p className="text-3xl font-bold text-white">{(value ?? 0).toLocaleString()}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="xl:col-span-2 rounded-xl border border-white/5 bg-white/[0.03] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !stats?.recentActivity.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-8 w-8 text-white/20 mb-2" />
              <p className="text-sm text-white/30">No activity yet</p>
              <p className="text-xs text-white/20 mt-1">Launch a campaign to see message logs here</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {stats.recentActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="shrink-0">{STATUS_ICON[item.status] ?? STATUS_ICON.queued}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{item.contacts?.name ?? "Unknown"}</span>
                      <span className="text-xs text-white/30">{item.contacts?.phone_number}</span>
                    </div>
                    <p className="text-xs text-white/30 truncate">
                      {item.campaigns?.name ?? "Direct message"} ·{" "}
                      <span className={`font-medium ${STATUS_TEXT[item.status] ?? "text-white/30"}`}>{item.status}</span>
                      {item.error_message && <span className="text-red-400"> · {item.error_message.slice(0, 50)}</span>}
                    </p>
                  </div>
                  <span className="text-xs text-white/20 shrink-0 tabular-nums">
                    {timeAgo(item.replied_at ?? item.sent_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white">Quick Actions</h2>
          {[
            { icon: Megaphone, label: "New Campaign", sub: "Send messages to a contact list", href: "/dashboard/campaigns", accent: "text-[#25D366] bg-[#25D366]/10" },
            { icon: Upload,   label: "Import Contacts", sub: "Upload a CSV of leads", href: "/dashboard/contacts", accent: "text-blue-400 bg-blue-400/10" },
            { icon: Smartphone, label: "Connect Account", sub: "Link a new WhatsApp number", href: "/dashboard/accounts", accent: "text-purple-400 bg-purple-400/10" },
            { icon: GitBranch, label: "Build Sequence", sub: "Automate a drip flow", href: "/dashboard/sequences", accent: "text-amber-400 bg-amber-400/10" },
          ].map(({ icon: Icon, label, sub, href, accent }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-4 hover:border-white/10 hover:bg-white/[0.05] transition-colors"
            >
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
                <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-white/40">{sub}</p>
              </div>
              <Plus className="h-4 w-4 text-white/20 shrink-0 ml-auto" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
