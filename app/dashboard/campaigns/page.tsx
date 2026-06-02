import { Plus, Megaphone, BarChart2, Play, Pause, CheckCircle } from "lucide-react";
import Link from "next/link";

const campaigns = [
  { id: "1", name: "Summer Promo 2026", status: "active", contacts: 8420, sent: 8420, open: 74, reply: 12, fail: 38, account: "Main Account", created: "2026-05-28" },
  { id: "2", name: "Re-engagement Wave 3", status: "active", contacts: 5000, sent: 3100, open: 61, reply: 8, fail: 55, account: "Campaign Account 2", created: "2026-05-30" },
  { id: "3", name: "Product Launch V2", status: "paused", contacts: 15000, sent: 12000, open: 70, reply: 15, fail: 120, account: "Business API", created: "2026-05-20" },
  { id: "4", name: "Cold Outreach Batch", status: "completed", contacts: 5000, sent: 5000, open: 58, reply: 6, fail: 210, account: "Main Account", created: "2026-05-10" },
  { id: "5", name: "Q2 Newsletter", status: "draft", contacts: 0, sent: 0, open: 0, reply: 0, fail: 0, account: "Business API", created: "2026-06-01" },
];

const statusColors: Record<string, string> = {
  active: "text-[#25D366] bg-[#25D366]/10",
  paused: "text-amber-400 bg-amber-400/10",
  completed: "text-blue-400 bg-blue-400/10",
  draft: "text-white/40 bg-white/5",
};

const statusIcon: Record<string, React.ReactNode> = {
  active: <Play className="h-3 w-3" />,
  paused: <Pause className="h-3 w-3" />,
  completed: <CheckCircle className="h-3 w-3" />,
  draft: <Megaphone className="h-3 w-3" />,
};

export default function CampaignsPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Campaigns</h1>
          <p className="text-sm text-white/40 mt-1">Create and manage outreach campaigns</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] transition-colors">
          <Plus className="h-4 w-4" />
          New Campaign
        </button>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.03] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Campaign</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Status</th>
                <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-white/30">Contacts</th>
                <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-white/30">Sent</th>
                <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-white/30">Open %</th>
                <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-white/30">Reply %</th>
                <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-white/30">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <Link
                        href={`/dashboard/campaigns/${c.id}`}
                        className="text-sm font-medium text-white hover:text-[#25D366] transition-colors"
                      >
                        {c.name}
                      </Link>
                      <p className="text-xs text-white/30 mt-0.5">{c.account}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${statusColors[c.status]}`}>
                      {statusIcon[c.status]}
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-white/60 tabular-nums">
                    {c.contacts.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-white/60 tabular-nums">
                    {c.sent.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-medium text-[#25D366] tabular-nums">
                      {c.open > 0 ? `${c.open}%` : "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-medium text-amber-400 tabular-nums">
                      {c.reply > 0 ? `${c.reply}%` : "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/campaigns/${c.id}`}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        <BarChart2 className="h-3 w-3" />
                        Analytics
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
