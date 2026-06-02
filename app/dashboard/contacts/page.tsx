import { Plus, Users, Upload, Search } from "lucide-react";

const lists = [
  { id: "1", name: "Algeria Leads 2026", count: 12400, created: "2026-05-01" },
  { id: "2", name: "Warm Prospects", count: 3250, created: "2026-05-15" },
  { id: "3", name: "Re-engagement Pool", count: 8900, created: "2026-04-20" },
  { id: "4", name: "VIP Clients", count: 420, created: "2026-03-10" },
];

const recentContacts = [
  { name: "Amine Benali", phone: "+213 550 100 001", list: "Algeria Leads 2026", added: "2026-06-01" },
  { name: "Sara Kaci", phone: "+213 560 200 002", list: "Warm Prospects", added: "2026-05-31" },
  { name: "Omar Meziane", phone: "+213 770 300 003", list: "Algeria Leads 2026", added: "2026-05-30" },
  { name: "Lina Hamdi", phone: "+213 550 400 004", list: "VIP Clients", added: "2026-05-29" },
  { name: "Youcef Boudj", phone: "+213 560 500 005", list: "Re-engagement Pool", added: "2026-05-28" },
];

export default function ContactsPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Contacts</h1>
          <p className="text-sm text-white/40 mt-1">Manage contact lists and individual contacts</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 transition-colors">
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] transition-colors">
            <Plus className="h-4 w-4" />
            New List
          </button>
        </div>
      </div>

      {/* Contact lists */}
      <div>
        <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Contact Lists</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {lists.map((list) => (
            <div key={list.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-5 hover:border-white/10 transition-colors cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-[#25D366]" />
                </div>
                <span className="text-xs text-white/30">{list.created}</span>
              </div>
              <p className="text-sm font-semibold text-white">{list.name}</p>
              <p className="text-2xl font-bold text-white mt-1">{list.count.toLocaleString()}</p>
              <p className="text-xs text-white/30">contacts</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search + contacts table */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">All Contacts</h2>
          <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/5 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-white/30" />
            <input
              type="text"
              placeholder="Search contacts..."
              className="bg-transparent text-sm text-white placeholder-white/20 outline-none w-48"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Name</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Phone</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">List</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentContacts.map((c, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-3.5 text-sm font-medium text-white">{c.name}</td>
                  <td className="px-6 py-3.5 text-sm text-white/50 tabular-nums">{c.phone}</td>
                  <td className="px-6 py-3.5">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-white/50">{c.list}</span>
                  </td>
                  <td className="px-6 py-3.5 text-xs text-white/30">{c.added}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
