"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { X, Upload, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle, Loader2, FileText } from "lucide-react";

interface ContactList { id: string; name: string; }
interface ParsedRow { [col: string]: string; }

interface MappedContact {
  name: string;
  phone_number: string;
  custom_fields: Record<string, string>;
}

interface Props {
  onClose: () => void;
  onImported: (listId: string, count: number) => void;
  existingLists: ContactList[];
}

const FIELDS = ["name", "phone_number", "custom1", "custom2", "custom3"] as const;
const FIELD_LABELS: Record<string, string> = {
  name: "Name", phone_number: "Phone *", custom1: "Custom 1", custom2: "Custom 2", custom3: "Custom 3",
};

export function CsvImportModal({ onClose, onImported, existingLists }: Props) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [listId, setListId] = useState(existingLists[0]?.id ?? "");
  const [newListName, setNewListName] = useState("");
  const [useNewList, setUseNewList] = useState(existingLists.length === 0);
  const [preview, setPreview] = useState<{ valid: MappedContact[]; invalid: number; dupes: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function parseFile(f: File) {
    setFile(f);
    Papa.parse<ParsedRow>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const hs = result.meta.fields ?? [];
        setHeaders(hs);
        setRows(result.data.slice(0, 1000));
        // Auto-map obvious columns
        const autoMap: Record<string, string> = {};
        for (const h of hs) {
          const lc = h.toLowerCase();
          if (!autoMap.name && (lc.includes("name") || lc.includes("nom"))) autoMap.name = h;
          if (!autoMap.phone_number && (lc.includes("phone") || lc.includes("tel") || lc.includes("mobile") || lc.includes("numero"))) autoMap.phone_number = h;
        }
        setMapping(autoMap);
        setStep(1);
      },
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) parseFile(f);
    else toast.error("Please upload a .csv file");
  }

  function buildPreview() {
    const seen = new Set<string>();
    const valid: MappedContact[] = [];
    let invalid = 0; let dupes = 0;
    for (const row of rows) {
      const phone = mapping.phone_number ? (row[mapping.phone_number] ?? "").replace(/\s/g, "") : "";
      if (!phone || phone.length < 7) { invalid++; continue; }
      if (seen.has(phone)) { dupes++; continue; }
      seen.add(phone);
      const custom: Record<string, string> = {};
      for (const k of ["custom1", "custom2", "custom3"] as const) {
        if (mapping[k] && row[mapping[k]]) custom[k] = row[mapping[k]];
      }
      valid.push({ name: mapping.name ? (row[mapping.name] ?? "Unknown") : "Unknown", phone_number: phone, custom_fields: custom });
    }
    setPreview({ valid, invalid, dupes });
    setStep(3);
  }

  async function handleImport() {
    if (!preview?.valid.length) return;
    setLoading(true);
    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listId: useNewList ? undefined : listId,
          newListName: useNewList ? newListName.trim() : undefined,
          contacts: preview.valid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      toast.success(`${data.imported} contacts imported successfully`);
      onImported(data.listId, data.imported);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  const STEP_LABELS = ["Upload", "Map columns", "Assign list", "Review"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-2xl bg-[#0f1117] border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-[#25D366] flex items-center justify-center">
              <Upload className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Import Contacts</p>
              <p className="text-xs text-white/40">{STEP_LABELS[step]}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white p-1.5 rounded-lg hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>

        {/* Progress */}
        <div className="flex gap-1 px-6 py-2 border-b border-white/5 shrink-0">
          {STEP_LABELS.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= step ? "bg-[#25D366]" : "bg-white/10"}`} />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ── STEP 0: Upload ── */}
          {step === 0 && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed py-14 cursor-pointer transition-all ${dragging ? "border-[#25D366] bg-[#25D366]/5" : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"}`}
            >
              <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center">
                <FileText className="h-7 w-7 text-white/30" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Drop your CSV file here</p>
                <p className="text-xs text-white/40 mt-1">or click to browse · .csv only</p>
              </div>
              <input ref={inputRef} type="file" accept=".csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
            </div>
          )}

          {/* ── STEP 1: Map columns ── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-white/40">Detected <strong className="text-white">{rows.length}</strong> rows in <strong className="text-white">{file?.name}</strong>. Map your columns:</p>
              <div className="space-y-2">
                {FIELDS.map((field) => (
                  <div key={field} className="flex items-center gap-3">
                    <span className="w-28 text-xs font-medium text-white/60 shrink-0">{FIELD_LABELS[field]}</span>
                    <select value={mapping[field] ?? ""} onChange={(e) => setMapping(m => ({ ...m, [field]: e.target.value }))}
                      className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none [color-scheme:dark]"
                    >
                      <option value="">— skip —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {/* Preview table */}
              {rows.length > 0 && (
                <div className="rounded-xl overflow-hidden border border-white/5 mt-4">
                  <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/30 border-b border-white/5">Preview (first 3 rows)</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr>{headers.slice(0,6).map(h => <th key={h} className="px-3 py-2 text-left text-white/30 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
                      <tbody>{rows.slice(0,3).map((row,i) => (
                        <tr key={i} className="border-t border-white/5">
                          {headers.slice(0,6).map(h => <td key={h} className="px-3 py-2 text-white/60 whitespace-nowrap max-w-[120px] truncate">{row[h]}</td>)}
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Assign list ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {["existing", "new"].map((opt) => (
                  <button key={opt} onClick={() => setUseNewList(opt === "new")}
                    className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                      (opt === "new") === useNewList ? "border-[#25D366] bg-[#25D366]/10 text-[#25D366]" : "border-white/10 bg-white/5 text-white/50 hover:border-white/20"
                    }`}
                  >{opt === "existing" ? "Existing list" : "New list"}</button>
                ))}
              </div>
              {useNewList ? (
                <input type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)}
                  placeholder="List name…"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#25D366]/50 transition-all"
                />
              ) : (
                <select value={listId} onChange={(e) => setListId(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none [color-scheme:dark]"
                >
                  {existingLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              )}
            </div>
          )}

          {/* ── STEP 3: Review ── */}
          {step === 3 && preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Valid",    value: preview.valid.length, color: "text-[#25D366]", bg: "bg-[#25D366]/10" },
                  { label: "Invalid",  value: preview.invalid,      color: "text-red-400",   bg: "bg-red-400/10" },
                  { label: "Dupes",    value: preview.dupes,        color: "text-amber-400", bg: "bg-amber-400/10" },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`rounded-xl ${bg} px-4 py-3 text-center`}>
                    <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
                    <p className="text-xs text-white/40 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {preview.valid.length > 0 && (
                <div className="rounded-xl border border-white/5 overflow-hidden">
                  <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/30 border-b border-white/5">Preview (first 5)</p>
                  <table className="w-full text-xs"><tbody>
                    {preview.valid.slice(0,5).map((c,i) => (
                      <tr key={i} className="border-t border-white/5 first:border-0">
                        <td className="px-3 py-2 text-white/70">{c.name}</td>
                        <td className="px-3 py-2 text-white/50 tabular-nums">{c.phone_number}</td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              )}
              {preview.invalid > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-400/5 border border-amber-400/20 px-3 py-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-400/80">{preview.invalid} rows skipped — missing or invalid phone number</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 shrink-0">
          <button onClick={() => step > 0 ? setStep(s => s - 1) : onClose()} className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
            <ChevronLeft className="h-4 w-4" />{step === 0 ? "Cancel" : "Back"}
          </button>
          {step === 0 && null}
          {step === 1 && (
            <button onClick={() => setStep(2)} disabled={!mapping.phone_number}
              className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >Next <ChevronRight className="h-4 w-4" /></button>
          )}
          {step === 2 && (
            <button onClick={buildPreview} disabled={useNewList ? !newListName.trim() : !listId}
              className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >Review <ChevronRight className="h-4 w-4" /></button>
          )}
          {step === 3 && (
            <button onClick={handleImport} disabled={loading || !preview?.valid.length}
              className="flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Importing…</> : <><CheckCircle2 className="h-4 w-4" />Import {preview?.valid.length.toLocaleString()} contacts</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
