"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Upload, Search, Trash2, Users, Loader2, UserPlus, X } from "lucide-react";
import { CsvImportModal } from "@/components/dashboard/CsvImportModal";
import { Skeleton } from "@/components/ui/skeleton";

interface ContactList { id: string; name: string; contact_count?: number; }
interface Contact { id: string; name: string; phone_number: string; custom_fields: Record<string, string> | null; created_at: string; }

// ── AddContactModal ────────────────────────────────────────────────────────────
function AddContactModal({ listId, onClose, onAdded }: { listId: string; onClose: () => void; onAdded: () => void }) {
  const [name, setName]   = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId, name, phoneNumber: phone }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Contact added");
      onAdded(); onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add contact");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-[#0f1117] border border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-white">Add Contact</p>
          <button onClick={onClose} className="text-white/30 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          {[
            { label: "Name", value: name, onChange: setName, placeholder: "Amine Benali", required: false },
            { label: "Phone *", value: phone, onChange: setPhone, placeholder: "+213 550 100 001", required: true },
          ].map(({ label, value, onChange, placeholder, required }) => (
            <div key={label} className="space-y-1">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">{label}</label>
              <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[#25D366]/50 transition-all" />
            </div>
          ))}
          <button type="submit" disabled={!phone.trim() || saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Save Contact
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ContactsPage() {
  const [lists, setLists]               = useState<ContactList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [contacts, setContacts]         = useState<Contact[]>([]);
  const [search, setSearch]             = useState("");
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showImport, setShowImport]     = useState(false);
  const [showAdd, setShowAdd]           = useState(false);

  const loadLists = useCallback(async () => {
    const res = await fetch("/api/contacts/lists");
    if (res.ok) {
      const data: ContactList[] = await res.json();
      setLists(data);
      if (!selectedListId && data.length) setSelectedListId(data[0].id);
    }
    setLoadingLists(false);
  }, [selectedListId]);

  const loadContacts = useCallback(async (listId: string, q = "") => {
    if (!listId) return;
    setLoadingContacts(true);
    const params = new URLSearchParams({ listId });
    if (q) params.set("search", q);
    const res = await fetch(`/api/contacts?${params}`);
    if (res.ok) {
      const data = await res.json();
      setContacts(data.contacts ?? []);
    }
    setLoadingContacts(false);
  }, []);

  useEffect(() => { loadLists(); }, [loadLists]);
  useEffect(() => {
    const t = setTimeout(() => { if (selectedListId) loadContacts(selectedListId, search); }, 300);
    return () => clearTimeout(t);
  }, [selectedListId, search, loadContacts]);

  async function deleteContact(id: string) {
    if (!confirm("Delete this contact?")) return;
    const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Contact deleted"); setContacts(c => c.filter(x => x.id !== id)); }
    else toast.error("Delete failed");
  }

  const selectedList = lists.find(l => l.id === selectedListId);

  return (
    <>
      <div className="flex h-full">
        {/* Left: Lists panel */}
        <div className="w-56 shrink-0 border-r border-white/5 flex flex-col">
          <div className="px-4 py-5 border-b border-white/5">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Lists</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {loadingLists ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : lists.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-8">No lists yet</p>
            ) : (
              lists.map(list => (
                <button key={list.id} onClick={() => setSelectedListId(list.id)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all ${selectedListId === list.id ? "bg-[#25D366]/10 text-[#25D366]" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
                >
                  <span className="font-medium truncate">{list.name}</span>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${selectedListId === list.id ? "bg-[#25D366]/20" : "bg-white/5"}`}>
                    {list.contact_count ?? 0}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Contacts table */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/5 px-3 py-2 flex-1 max-w-xs">
              <Search className="h-3.5 w-3.5 text-white/30 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone…"
                className="bg-transparent text-sm text-white placeholder-white/20 outline-none w-full" />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setShowAdd(true)} disabled={!selectedListId}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white disabled:opacity-30 transition-colors"
              ><UserPlus className="h-4 w-4" /> Add</button>
              <button onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors"
              ><Upload className="h-4 w-4" /> Import CSV</button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {!selectedListId ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
                <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Users className="h-8 w-8 text-white/20" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/40">Select a list to view contacts</p>
                  <p className="text-xs text-white/20 mt-1">Or import a CSV to create your first list</p>
                </div>
                <button onClick={() => setShowImport(true)}
                  className="flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1fb855] transition-colors"
                ><Upload className="h-4 w-4" /> Import contacts</button>
              </div>
            ) : loadingContacts ? (
              <div className="p-6 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
                <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Users className="h-7 w-7 text-white/20" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/40">{search ? "No contacts match your search" : `${selectedList?.name} is empty`}</p>
                  {!search && <p className="text-xs text-white/20 mt-1">Import a CSV or add contacts manually</p>}
                </div>
                {!search && (
                  <div className="flex gap-2">
                    <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 hover:bg-white/5 transition-colors">
                      <UserPlus className="h-4 w-4" /> Add contact
                    </button>
                    <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1fb855] transition-colors">
                      <Upload className="h-4 w-4" /> Import CSV
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-[#0a0c10]">
                  <tr className="border-b border-white/5">
                    {["Name","Phone","Custom Fields","Added",""].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {contacts.map(c => (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-white">{c.name}</td>
                      <td className="px-5 py-3 text-sm text-white/50 tabular-nums">{c.phone_number}</td>
                      <td className="px-5 py-3 text-xs text-white/30">
                        {c.custom_fields && Object.keys(c.custom_fields).length > 0
                          ? Object.entries(c.custom_fields).slice(0,2).map(([k,v]) => `${k}: ${v}`).join(" · ")
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-xs text-white/30 tabular-nums">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => deleteContact(c.id)} className="p-1.5 rounded-lg text-white/20 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showImport && (
        <CsvImportModal
          onClose={() => setShowImport(false)}
          onImported={(lid, count) => { loadLists(); if (lid) setSelectedListId(lid); loadContacts(lid); }}
          existingLists={lists}
        />
      )}
      {showAdd && selectedListId && (
        <AddContactModal
          listId={selectedListId}
          onClose={() => setShowAdd(false)}
          onAdded={() => loadContacts(selectedListId, search)}
        />
      )}
    </>
  );
}
