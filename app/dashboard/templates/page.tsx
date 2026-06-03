"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, FileText, Edit2, Copy, Trash2, Loader2, Search, Tag, Megaphone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Template {
  id: string; name: string; category: string;
  message_body: string; used_count: number; created_at: string;
}

const CATEGORIES = ["All", "Prospecting", "Follow-up", "Sales", "Event", "Other"] as const;
const CAT_COLOR: Record<string, string> = {
  Prospecting: "text-blue-400 bg-blue-400/10",
  "Follow-up":  "text-amber-400 bg-amber-400/10",
  Sales:        "text-[#25D366] bg-[#25D366]/10",
  Event:        "text-purple-400 bg-purple-400/10",
  Other:        "text-white/40 bg-white/5",
};

// ── Template Modal ─────────────────────────────────────────────────────────────
function TemplateModal({
  template, onClose, onSaved,
}: { template?: Template | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName]     = useState(template?.name ?? "");
  const [cat, setCat]       = useState<string>(template?.category ?? "Prospecting");
  const [body, setBody]     = useState(template?.message_body ?? "");
  const [saving, setSaving] = useState(false);
  const isEdit = !!template;
  const VARS = ["{name}", "{phone}", "{custom1}"];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    setSaving(true);
    try {
      const url  = isEdit ? `/api/templates/${template.id}` : "/api/templates";
      const method = isEdit ? "PUT" : "POST";
      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category: cat, messageBody: body }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(isEdit ? "Template updated" : "Template created");
      onSaved(); onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-[#0f1117] border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-[#25D366] flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <p className="text-sm font-bold text-white">{isEdit ? "Edit Template" : "New Template"}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white p-1.5 rounded-lg hover:bg-white/5">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} required placeholder="Welcome Message"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[#25D366]/50 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Category</label>
              <select value={cat} onChange={e => setCat(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white outline-none [color-scheme:dark]">
                {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Message</label>
              <div className="flex gap-1">
                {VARS.map(v => (
                  <button key={v} type="button" onClick={() => setBody(b => b + v)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 font-mono">{v}</button>
                ))}
              </div>
            </div>
            <textarea value={body} onChange={e => setBody(e.target.value)} required rows={5}
              placeholder="Bonjour {name} ! Voici notre message…"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#25D366]/50 transition-all resize-none" />
            <div className="flex items-center justify-between text-[10px]">
              <span className={body.length > 1024 ? "text-red-400" : "text-white/30"}>{body.length} / 1024 chars</span>
              {body.length > 1024 && <span className="text-red-400">WhatsApp soft limit exceeded</span>}
            </div>
          </div>
          <button type="submit" disabled={!name.trim() || !body.trim() || saving}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-semibold text-white hover:bg-[#1fb855] disabled:opacity-50 transition-colors"
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : <>{isEdit ? "Update Template" : "Save Template"}</>}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Template | null>(null);

  const loadTemplates = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category !== "All") params.set("category", category);
    const res = await fetch(`/api/templates?${params}`);
    if (res.ok) setTemplates(await res.json());
    setLoading(false);
  }, [search, category]);

  useEffect(() => {
    const t = setTimeout(loadTemplates, 300);
    return () => clearTimeout(t);
  }, [loadTemplates]);

  async function duplicate(t: Template) {
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${t.name} (copy)`, category: t.category, messageBody: t.message_body }),
    });
    if (res.ok) { toast.success("Template duplicated"); loadTemplates(); }
    else toast.error("Duplication failed");
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Template deleted"); setTemplates(ts => ts.filter(t => t.id !== id)); }
    else toast.error("Delete failed");
  }

  return (
    <>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Templates</h1>
            <p className="text-sm text-white/40 mt-1">Reusable message templates with dynamic variables</p>
          </div>
          <button onClick={() => { setEditing(null); setModalOpen(true); }}
            className="flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] transition-colors"
          ><Plus className="h-4 w-4" /> New Template</button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/5 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates…"
              className="bg-transparent text-sm text-white placeholder-white/20 outline-none w-44" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${category === c ? "bg-[#25D366]/20 text-[#25D366]" : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"}`}
              >{c}</button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-white/20" />
            </div>
            <p className="text-sm font-medium text-white/40">{search || category !== "All" ? "No templates match your filters" : "No templates yet"}</p>
            {!search && category === "All" && (
              <button onClick={() => { setEditing(null); setModalOpen(true); }}
                className="mt-4 flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1fb855] transition-colors"
              ><Plus className="h-4 w-4" /> Create your first template</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.map(t => (
              <div key={t.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-5 space-y-3 hover:border-white/10 transition-colors flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-[#25D366]/10 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-[#25D366]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{t.name}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CAT_COLOR[t.category] ?? CAT_COLOR.Other}`}>{t.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button onClick={() => { setEditing(t); setModalOpen(true); }} className="p-1.5 rounded text-white/30 hover:bg-white/5 hover:text-white transition-colors" title="Edit">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => duplicate(t)} className="p-1.5 rounded text-white/30 hover:bg-white/5 hover:text-white transition-colors" title="Duplicate">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteTemplate(t.id)} className="p-1.5 rounded text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-colors" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Message preview bubble */}
                <div className="rounded-xl bg-[#1a1f2e] border border-white/5 p-3 flex-1">
                  <p className="text-xs text-white/60 leading-relaxed line-clamp-4">{t.message_body}</p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-white/30">
                  <span className="flex items-center gap-1"><Megaphone className="h-3 w-3" /> Used {t.used_count} time{t.used_count !== 1 ? "s" : ""}</span>
                  <span>{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <TemplateModal
          template={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={loadTemplates}
        />
      )}
    </>
  );
}
