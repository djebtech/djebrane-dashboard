"use client";

import { useEffect, useRef, useState } from "react";
import {
  X, ChevronRight, ChevronLeft, GitBranch, Plus, Trash2,
  MessageCircle, Clock, CheckCircle2, Loader2, Users, Settings,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepDraft {
  tempId: string;
  label: string;
  messageTemplate: string;
  delayValue: number;
  delayUnit: "hours" | "days";
}

interface SequenceFormData {
  name: string;
  accountId: string;
  roundRobin: boolean;
  stopOnReply: boolean;
  quietStart: number;
  quietEnd: number;
  steps: StepDraft[];
  enrollListId: string;
}

interface Account { id: string; name: string; phone_number: string; status: string; }
interface ContactList { id: string; name: string; contact_count: number; }

const VARS = ["{name}", "{phone}"];
const STEPS_LABEL = ["Name", "Steps", "Settings", "Enroll"];
const EMPTY_STEP = (): StepDraft => ({
  tempId: Math.random().toString(36).slice(2),
  label: "Follow-up",
  messageTemplate: "",
  delayValue: 1,
  delayUnit: "days",
});

const EMPTY_FORM: SequenceFormData = {
  name: "", accountId: "", roundRobin: false,
  stopOnReply: true, quietStart: 8, quietEnd: 22,
  steps: [{ tempId: "s1", label: "Initial Message", messageTemplate: "", delayValue: 0, delayUnit: "hours" }],
  enrollListId: "",
};

interface Props {
  onClose: () => void;
  onCreated: (sequenceId: string) => void;
  editData?: Record<string, unknown> | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateSequenceModal({ onClose, onCreated, editData }: Props) {
  const [step, setStep]       = useState(0);
  const [form, setForm]       = useState<SequenceFormData>(EMPTY_FORM);
  const [selectedStep, setSelectedStep] = useState(0);
  const [accounts, setAccounts]   = useState<Account[]>([]);
  const [lists, setLists]         = useState<ContactList[]>([]);
  const [fetching, setFetching]   = useState(true);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [done, setDone]           = useState(false);
  const stepFlowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/accounts/status").then((r) => r.json()),
      fetch("/api/contacts/lists").then((r) => r.json()),
    ]).then(([accs, ls]) => {
      setAccounts(Array.isArray(accs) ? accs.filter((a: Account) => a.status === "connected") : []);
      setLists(Array.isArray(ls) ? ls : []);
    }).finally(() => setFetching(false));
  }, []);

  function setF<K extends keyof SequenceFormData>(key: K, val: SequenceFormData[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function updateStep(idx: number, patch: Partial<StepDraft>) {
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  }

  function addStep() {
    const ns = [...form.steps, EMPTY_STEP()];
    setForm((f) => ({ ...f, steps: ns }));
    setSelectedStep(ns.length - 1);
    setTimeout(() => stepFlowRef.current?.scrollTo({ left: 9999, behavior: "smooth" }), 50);
  }

  function removeStep(idx: number) {
    if (form.steps.length <= 1) return;
    const ns = form.steps.filter((_, i) => i !== idx);
    setForm((f) => ({ ...f, steps: ns }));
    setSelectedStep(Math.min(selectedStep, ns.length - 1));
  }

  function insertVar(v: string) {
    updateStep(selectedStep, {
      messageTemplate: form.steps[selectedStep].messageTemplate + v,
    });
  }

  function canNext() {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 1) return form.steps.every((s) => s.messageTemplate.trim().length > 0);
    return true;
  }

  function delayLabel(s: StepDraft, i: number) {
    if (i === 0 && s.delayValue === 0) return "Immediately";
    return `+${s.delayValue} ${s.delayUnit}`;
  }

  const activeStep = form.steps[selectedStep];

  async function handleSave() {
    setLoading(true);
    setError("");
    try {
      const steps = form.steps.map((s, i) => ({
        step_number:      i + 1,
        label:            s.label,
        message_template: s.messageTemplate,
        delay_hours:      s.delayUnit === "days" ? s.delayValue * 24 : s.delayValue,
      }));

      const res = await fetch("/api/sequences/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:        form.name,
          accountId:   form.roundRobin ? null : (form.accountId || null),
          roundRobin:  form.roundRobin,
          stopOnReply: form.stopOnReply,
          quietStart:  form.quietStart,
          quietEnd:    form.quietEnd,
          steps,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed");

      // Enroll if list selected
      if (form.enrollListId) {
        await fetch(`/api/sequences/${data.sequenceId}/enroll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactListId: form.enrollListId }),
        });
      }

      setDone(true);
      setTimeout(() => { onCreated(data.sequenceId); onClose(); }, 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-[#0f1117] border border-white/10 shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-[#25D366] flex items-center justify-center">
              <GitBranch className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">New Sequence</p>
              <p className="text-xs text-white/40">{STEPS_LABEL[step]} — Step {step + 1} of {STEPS_LABEL.length}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-1 px-6 py-2 border-b border-white/5 shrink-0">
          {STEPS_LABEL.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= step ? "bg-[#25D366]" : "bg-white/10"}`} />
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {fetching ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-[#25D366] animate-spin" /></div>
          ) : done ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="h-14 w-14 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-[#25D366]" />
              </div>
              <p className="text-base font-bold text-white">Sequence Created!</p>
              <p className="text-sm text-white/40">{form.name}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {error && <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>}

              {/* ── STEP 0: Name ── */}
              {step === 0 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Sequence Name</label>
                    <input
                      autoFocus type="text" value={form.name}
                      onChange={(e) => setF("name", e.target.value)}
                      placeholder="e.g. Onboarding Flow, Re-engagement Drip"
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/30 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* ── STEP 1: Build Steps ── */}
              {step === 1 && (
                <div className="space-y-4">
                  {/* Horizontal step flow */}
                  <div ref={stepFlowRef} className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {form.steps.map((s, i) => (
                      <div key={s.tempId} className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedStep(i)}
                          className={`relative flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2.5 min-w-[120px] transition-all ${
                            selectedStep === i
                              ? "border-[#25D366] bg-[#25D366]/10"
                              : "border-white/10 bg-white/5 hover:border-white/20"
                          }`}
                        >
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedStep === i ? "text-[#25D366]" : "text-white/30"}`}>
                            Step {i + 1}
                          </span>
                          <span className="text-xs font-medium text-white truncate max-w-[100px]">{s.label}</span>
                          <span className="text-[10px] text-white/30">{delayLabel(s, i)}</span>
                        </button>
                        {i < form.steps.length - 1 && (
                          <ChevronRight className="h-4 w-4 text-white/20 shrink-0" />
                        )}
                      </div>
                    ))}
                    {/* Add step button */}
                    <ChevronRight className="h-4 w-4 text-white/10 shrink-0" />
                    <button onClick={addStep}
                      className="flex items-center gap-1.5 shrink-0 rounded-xl border border-dashed border-white/20 px-3.5 py-2.5 text-xs text-white/40 hover:border-[#25D366]/50 hover:text-[#25D366] transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Step
                    </button>
                  </div>

                  {/* Edit panel for selected step */}
                  {activeStep && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#25D366] uppercase tracking-wider">
                          Editing Step {selectedStep + 1}
                        </span>
                        {form.steps.length > 1 && (
                          <button onClick={() => removeStep(selectedStep)}
                            className="flex items-center gap-1 text-xs text-red-400/60 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Step Label</label>
                          <input
                            type="text" value={activeStep.label}
                            onChange={(e) => updateStep(selectedStep, { label: e.target.value })}
                            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#25D366]/40 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                            {selectedStep === 0 ? "Delay from enrollment" : "Delay after prev step"}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number" min={0} value={activeStep.delayValue}
                              onChange={(e) => updateStep(selectedStep, { delayValue: Number(e.target.value) })}
                              className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#25D366]/40 transition-all"
                            />
                            <select
                              value={activeStep.delayUnit}
                              onChange={(e) => updateStep(selectedStep, { delayUnit: e.target.value as "hours" | "days" })}
                              className="rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-sm text-white outline-none [color-scheme:dark]"
                            >
                              <option value="hours">hours</option>
                              <option value="days">days</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Message</label>
                          <div className="flex gap-1">
                            {VARS.map((v) => (
                              <button key={v} onClick={() => insertVar(v)}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 font-mono transition-colors"
                              >{v}</button>
                            ))}
                          </div>
                        </div>
                        <textarea
                          value={activeStep.messageTemplate}
                          onChange={(e) => updateStep(selectedStep, { messageTemplate: e.target.value })}
                          placeholder={`Bonjour {name}, ${selectedStep === 0 ? "merci de votre intérêt…" : "je fais un suivi…"}`}
                          rows={4}
                          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-[#25D366]/40 transition-all resize-none"
                        />
                        <p className="text-[10px] text-white/30">{activeStep.messageTemplate.length} chars</p>
                      </div>

                      {activeStep.messageTemplate && (
                        <div className="rounded-lg bg-[#1a1f2e] p-3 flex items-start gap-2">
                          <div className="h-5 w-5 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                            <MessageCircle className="h-3 w-3 text-white" />
                          </div>
                          <p className="text-xs text-white/60 whitespace-pre-wrap leading-relaxed">
                            {activeStep.messageTemplate.replace(/\{name\}/g, "Amine").replace(/\{phone\}/g, "+213 550 001")}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 2: Settings ── */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">Stop on reply</p>
                      <p className="text-xs text-white/40">Unsubscribe contact when they reply</p>
                    </div>
                    <button
                      onClick={() => setF("stopOnReply", !form.stopOnReply)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${form.stopOnReply ? "bg-[#25D366]" : "bg-white/20"}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.stopOnReply ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Quiet Hours (no sends outside this window)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["quietStart", "quietEnd"] as const).map((key, i) => (
                        <div key={key} className="space-y-1">
                          <label className="text-[10px] text-white/40">{i === 0 ? "Start (from)" : "End (until)"}</label>
                          <div className="flex items-center rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
                            <input
                              type="number" min={0} max={23} value={form[key]}
                              onChange={(e) => setF(key, Number(e.target.value))}
                              className="w-full bg-transparent text-sm text-white outline-none tabular-nums"
                            />
                            <span className="text-xs text-white/30">:00</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-white/30">
                      Sends will only go out between {form.quietStart}:00 and {form.quietEnd}:00
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Sending Account</label>
                    <div className="flex items-center gap-2 mb-2">
                      <input type="checkbox" id="seq-rr" checked={form.roundRobin} onChange={(e) => setF("roundRobin", e.target.checked)} className="accent-[#25D366]" />
                      <label htmlFor="seq-rr" className="text-xs text-white/60">Round-robin across all connected accounts</label>
                    </div>
                    {!form.roundRobin && (
                      <select value={form.accountId} onChange={(e) => setF("accountId", e.target.value)}
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none [color-scheme:dark]"
                      >
                        <option value="">Select account…</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.name} — {a.phone_number}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP 3: Enroll ── */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-white/5 border border-white/5 p-4 space-y-2">
                    <p className="text-sm font-semibold text-white">Sequence Summary</p>
                    {[
                      { label: "Name",    value: form.name },
                      { label: "Steps",   value: `${form.steps.length} step${form.steps.length > 1 ? "s" : ""}` },
                      { label: "Stop on reply", value: form.stopOnReply ? "Yes" : "No" },
                      { label: "Quiet hours", value: `${form.quietStart}:00 – ${form.quietEnd}:00` },
                      { label: "Account", value: form.roundRobin ? "Round-robin" : (accounts.find(a => a.id === form.accountId)?.name ?? "None") },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between text-xs">
                        <span className="text-white/40">{label}</span>
                        <span className="text-white font-medium">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Enroll a Contact List (optional)
                    </label>
                    <select value={form.enrollListId} onChange={(e) => setF("enrollListId", e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none [color-scheme:dark]"
                    >
                      <option value="">Skip — enroll later</option>
                      {lists.map((l) => (
                        <option key={l.id} value={l.id}>{l.name} ({l.contact_count.toLocaleString()} contacts)</option>
                      ))}
                    </select>
                    {form.enrollListId && (
                      <p className="text-xs text-[#25D366] flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {lists.find(l => l.id === form.enrollListId)?.contact_count.toLocaleString()} contacts will start receiving Step 1
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!done && !fetching && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 shrink-0">
            <button onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
              className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              {step === 0 ? "Cancel" : "Back"}
            </button>
            {step < STEPS_LABEL.length - 1 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={handleSave} disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><GitBranch className="h-4 w-4" /> Create Sequence</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
