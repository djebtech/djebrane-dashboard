"use client";

import { useEffect, useState } from "react";
import { Search, FileText, X } from "lucide-react";

interface Template { id: string; name: string; category: string; message_body: string; used_count: number; }

interface Props {
  onSelect: (body: string, templateId: string) => void;
  onClose: () => void;
}

const CATEGORIES = ["All", "Prospecting", "Follow-up", "Sales", "Event", "Other"];

export function TemplatePicker({ onSelect, onClose }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search)   params.set("search", search);
    if (category !== "All") params.set("category", category);
    fetch(`/api/templates?${params}`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setTemplates(d);
    });
  }, [search, category]);

  const CAT_COLOR: Record<string, string> = {
    Prospecting: "text-blue-400 bg-blue-400/10",
    "Follow-up":  "text-amber-400 bg-amber-400/10",
    Sales:        "text-[#25D366] bg-[#25D366]/10",
    Event:        "text-purple-400 bg-purple-400/10",
    Other:        "text-white/40 bg-white/5",
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0c10] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <p className="text-xs font-semibold text-white">Pick a template</p>
        <button onClick={onClose} className="text-white/30 hover:text-white"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="p-3 border-b border-white/5 space-y-2">
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
          <Search className="h-3.5 w-3.5 text-white/30 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates…"
            className="bg-transparent text-sm text-white placeholder-white/20 outline-none flex-1" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all ${category === c ? "bg-[#25D366]/20 text-[#25D366]" : "bg-white/5 text-white/40 hover:bg-white/10"}`}
            >{c}</button>
          ))}
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
        {templates.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FileText className="h-6 w-6 text-white/20" />
            <p className="text-xs text-white/30">No templates found</p>
          </div>
        ) : (
          templates.map(t => (
            <button key={t.id} onClick={() => onSelect(t.message_body, t.id)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/5 text-left transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-white">{t.name}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${CAT_COLOR[t.category] ?? CAT_COLOR.Other}`}>{t.category}</span>
                </div>
                <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">{t.message_body}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
