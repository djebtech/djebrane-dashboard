"use client";

import { useEffect, useState } from "react";
import {
  X, ChevronRight, ChevronLeft, Megaphone, Users, MessageCircle,
  Clock, Rocket, CheckCircle2, Loader2, RefreshCw, FileText,
} from "lucide-react";
import { TemplatePicker } from "./TemplatePicker";
import { toast } from "sonner";

interface Account { id: string; name: string; phone_number: string; status: string; }
interface ContactList { id: string; name: string; contact_count: number; }

interface FormData {
  name: string;
  accountId: string;      // '' = round-robin
  contactListId: string;
  messageTemplate: string;
  sendNow: boolean;
  scheduledAt: string;
  dailySendLimit: number;
  roundRobin: boolean;
}

const STEPS = ["Basics", "Message", "Schedule", "Review"];
const VARS = ["{name}", "{phone}"];

const EMPTY: FormData = {
  name: "", accountId: "", contactListId: "", messageTemplate: "",
  sendNow: true, scheduledAt: "", dailySendLimit: 0, roundRobin: false,
};

interface Props {
  onClose: () => void;
  onCreated: (campaignId: string) => void;
}

export function CreateCampaignModal({ onClose, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [launched, setLaunched] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/accounts/status").then((r) => r.json()),
      fetch("/api/contacts/lists").then((r) => r.json()),
    ]).then(([accs, ls]) => {
      setAccounts(Array.isArray(accs) ? accs : []);
      setLists(Array.isArray(ls) ? ls : []);
    }).finally(() => setFetching(false));
  }, []);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function insertVar(v: string) {
    set("messageTemplate", form.messageTemplate + v);
  }

  const selectedList = lists.find((l) => l.id === form.contactListId);
  const selectedAccount = accounts.find((a) => a.id === form.accountId);

  function previewMessage() {
    return form.messageTemplate
      .replace(/\{name\}/g, "Amine Benali")
      .replace(/\{phone\}/g, "+213 550 100 001");
  }

  function canNext() {
    if (step === 0) return form.name.trim() && form.contactListId;
    if (step === 1) return form.messageTemplate.trim().length > 0;
    if (step === 2) return true;
    return false;
  }

  async function handleLaunch() {
    setLoading(true);
    setError("");
    try {
      // 1. Create campaign
      const createRes = await fetch("/api/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          accountId: form.roundRobin ? null : (form.accountId || null),
          contactListId: form.contactListId,
          messageTemplate: form.messageTemplate,
          scheduledAt: form.sendNow ? null : form.scheduledAt || null,
          roundRobin: form.roundRobin,
          dailySendLimit: form.dailySendLimit,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error ?? "Create failed");

      // 2. Start immediately if sendNow
      if (form.sendNow) {
        const startRes = await fetch(`/api/campaigns/${createData.campaignId}/start`, {
          method: "POST",
        });
        const startData = await startRes.json();
        if (!startRes.ok) throw new Error(startData.error ?? "Start failed");
      }

      setLaunched(true);
      toast.success(form.sendNow ? "Campaign launched" : "Campaign created");
      setTimeout(() => {
        onCreated(createData.campaignId);
        onClose();
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      toast.error("Failed to launch campaign");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-[#0f1117] border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-[#25D366] flex items-center justify-center">
              <Megaphone className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">New Campaign</p>
              <p className="text-xs text-white/40">{STEPS[step]} — Step {step + 1} of {STEPS.length}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-white/5 shrink-0">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? "bg-[#25D366]" : "bg-white/10"}`} />
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {fetching ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 text-[#25D366] animate-spin" />
            </div>
          ) : launched ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="h-14 w-14 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-[#25D366]" />
              </div>
              <div>
                <p className="text-base font-bold text-white">Campaign Launched!</p>
                <p className="text-sm text-white/40 mt-1">{form.name}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>
              )}

              {/* ── STEP 0: Basics ── */}
              {step === 0 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Campaign Name</label>
                    <input
                      type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
                      placeholder="e.g. Summer Promo 2026"
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/30 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Sender Account</label>
                    <div className="flex items-center gap-2 mb-2">
                      <input type="checkbox" id="rr" checked={form.roundRobin} onChange={(e) => set("roundRobin", e.target.checked)} className="accent-[#25D366]" />
                      <label htmlFor="rr" className="text-xs text-white/60">Round-robin across all connected accounts</label>
                    </div>
                    {!form.roundRobin && (
                      <select value={form.accountId} onChange={(e) => set("accountId", e.target.value)}
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[#25D366]/50 transition-all"
                      >
                        <option value="">Select account…</option>
                        {accounts.filter(a => a.status === "connected").map((a) => (
                          <option key={a.id} value={a.id}>{a.name} — {a.phone_number}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Contact List</label>
                    <select value={form.contactListId} onChange={(e) => set("contactListId", e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[#25D366]/50 transition-all"
                    >
                      <option value="">Select list…</option>
                      {lists.map((l) => (
                        <option key={l.id} value={l.id}>{l.name} ({l.contact_count.toLocaleString()} contacts)</option>
                      ))}
                    </select>
                    {selectedList && (
                      <p className="text-xs text-[#25D366] flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {selectedList.contact_count.toLocaleString()} messages will be queued
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP 1: Message ── */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Message Template</label>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setShowTemplatePicker(p => !p)}
                          className="flex items-center gap-1 text-[11px] text-[#25D366] hover:text-[#1fb855] transition-colors"
                        >
                          <FileText className="h-3 w-3" /> Use template
                        </button>
                        <div className="flex gap-1">
                        {VARS.map((v) => (
                          <button key={v} onClick={() => insertVar(v)}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors font-mono"
                          >{v}</button>
                        ))}
                        </div>
                      </div>
                    </div>
                    {showTemplatePicker && (
                      <TemplatePicker
                        onSelect={(body, _id) => {
                          set("messageTemplate", body);
                          setShowTemplatePicker(false);
                          toast.success("Template applied");
                        }}
                        onClose={() => setShowTemplatePicker(false)}
                      />
                    )}
                    <textarea
                      value={form.messageTemplate}
                      onChange={(e) => set("messageTemplate", e.target.value)}
                      placeholder="Bonjour {name} ! Voici notre offre exclusive pour vous…"
                      rows={5}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/30 transition-all resize-none"
                    />
                    <p className="text-xs text-white/30">{form.messageTemplate.length} characters</p>
                  </div>

                  {form.messageTemplate && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Preview</label>
                      <div className="rounded-xl bg-[#1a1f2e] border border-white/5 p-4">
                        <div className="flex items-start gap-2">
                          <div className="h-6 w-6 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                            <MessageCircle className="h-3.5 w-3.5 text-white" />
                          </div>
                          <div className="rounded-xl rounded-tl-none bg-[#25D366]/10 px-3 py-2 max-w-xs">
                            <p className="text-sm text-white/80 whitespace-pre-wrap">{previewMessage()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 2: Schedule ── */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">When to send</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { v: true, label: "Send immediately", icon: Rocket },
                        { v: false, label: "Schedule for later", icon: Clock },
                      ].map(({ v, label, icon: Icon }) => (
                        <button key={String(v)} onClick={() => set("sendNow", v)}
                          className={`flex items-center gap-2 rounded-xl border p-3.5 text-sm font-medium transition-all ${form.sendNow === v ? "border-[#25D366] bg-[#25D366]/10 text-[#25D366]" : "border-white/10 bg-white/5 text-white/50 hover:border-white/20"}`}
                        >
                          <Icon className="h-4 w-4" />{label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!form.sendNow && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Scheduled Date & Time</label>
                      <input type="datetime-local" value={form.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)}
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[#25D366]/50 transition-all [color-scheme:dark]"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Daily Send Cap (this campaign)</label>
                    <input type="number" min={0} max={10000} value={form.dailySendLimit}
                      onChange={(e) => set("dailySendLimit", Number(e.target.value))}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[#25D366]/50 transition-all"
                    />
                    <p className="text-xs text-white/30">0 = use the account&apos;s own daily limit</p>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Review ── */}
              {step === 3 && (
                <div className="space-y-3">
                  {[
                    { label: "Campaign name", value: form.name },
                    {
                      label: "Sender",
                      value: form.roundRobin ? "Round-robin (all connected)" : (selectedAccount?.name ?? "—"),
                    },
                    {
                      label: "Contact list",
                      value: selectedList ? `${selectedList.name} (${selectedList.contact_count.toLocaleString()})` : "—",
                    },
                    {
                      label: "Send time",
                      value: form.sendNow ? "Immediately after launch" : (form.scheduledAt || "Not set"),
                    },
                    {
                      label: "Daily cap",
                      value: form.dailySendLimit === 0 ? "Account limit" : `${form.dailySendLimit}/day`,
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start justify-between rounded-lg bg-white/5 px-4 py-3">
                      <span className="text-xs font-medium text-white/40">{label}</span>
                      <span className="text-xs font-semibold text-white text-right max-w-[60%]">{value}</span>
                    </div>
                  ))}

                  <div className="rounded-lg bg-white/5 px-4 py-3">
                    <span className="text-xs font-medium text-white/40 block mb-1">Message preview</span>
                    <p className="text-xs text-white/70 whitespace-pre-wrap line-clamp-3">{previewMessage()}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!launched && !fetching && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 shrink-0">
            <button onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
              className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              {step === 0 ? "Cancel" : "Back"}
            </button>

            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={handleLaunch} disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Launching…</> : <><Rocket className="h-4 w-4" /> Launch Campaign</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
