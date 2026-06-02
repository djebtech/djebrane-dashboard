import { Smartphone, Plus, CheckCircle2, XCircle, Clock, Zap } from "lucide-react";

const accounts = [
  { id: "1", name: "Main Account", phone: "+213 555 001 001", type: "baileys", status: "connected", health: 92, limit: 200, sent: 187 },
  { id: "2", name: "Campaign Account 2", phone: "+213 555 002 002", type: "baileys", status: "warming", health: 78, limit: 150, sent: 43 },
  { id: "3", name: "Business API", phone: "+213 700 003 003", type: "business_api", status: "connected", health: 99, limit: 1000, sent: 412 },
  { id: "4", name: "Cold Outreach", phone: "+213 555 004 004", type: "baileys", status: "disconnected", health: 12, limit: 200, sent: 0 },
];

const statusIcon: Record<string, React.ReactNode> = {
  connected: <CheckCircle2 className="h-4 w-4 text-[#25D366]" />,
  warming: <Clock className="h-4 w-4 text-amber-400" />,
  disconnected: <XCircle className="h-4 w-4 text-red-400" />,
};

const statusLabel: Record<string, string> = {
  connected: "text-[#25D366] bg-[#25D366]/10",
  warming: "text-amber-400 bg-amber-400/10",
  disconnected: "text-red-400 bg-red-400/10",
};

export default function AccountsPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Accounts</h1>
          <p className="text-sm text-white/40 mt-1">Manage your WhatsApp sender accounts</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] transition-colors">
          <Plus className="h-4 w-4" />
          Add Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accounts.map((acc) => (
          <div key={acc.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-5 space-y-4 hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-white/50" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{acc.name}</p>
                  <p className="text-xs text-white/40">{acc.phone}</p>
                </div>
              </div>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${statusLabel[acc.status]}`}>
                {acc.status}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>Health Score</span>
                <span className="font-semibold text-white">{acc.health}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${acc.health}%`,
                    background: acc.health > 70 ? "#25D366" : acc.health > 40 ? "#F59E0B" : "#EF4444",
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">Daily usage</span>
              <span className="text-white font-medium">
                {acc.sent} / {acc.limit}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-white/30">
                <Zap className="h-3.5 w-3.5" />
                {acc.type === "business_api" ? "Business API" : "Baileys"}
              </span>
              <div className="flex gap-2">
                <button className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-colors">
                  Configure
                </button>
                {statusIcon[acc.status]}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
