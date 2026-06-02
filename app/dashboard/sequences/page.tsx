import { Plus, GitBranch, ChevronRight, Clock, MessageCircle } from "lucide-react";

const sequences = [
  {
    id: "1",
    name: "Onboarding Flow",
    campaign: "Summer Promo 2026",
    status: "active",
    steps: 4,
    stopOnReply: true,
    quietStart: 8,
    quietEnd: 22,
  },
  {
    id: "2",
    name: "Re-engagement Drip",
    campaign: "Re-engagement Wave 3",
    status: "active",
    steps: 3,
    stopOnReply: true,
    quietStart: 9,
    quietEnd: 21,
  },
  {
    id: "3",
    name: "Cold Follow-up",
    campaign: "Cold Outreach Batch",
    status: "paused",
    steps: 2,
    stopOnReply: false,
    quietStart: 8,
    quietEnd: 20,
  },
];

export default function SequencesPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sequences</h1>
          <p className="text-sm text-white/40 mt-1">Automated multi-step message flows</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] transition-colors">
          <Plus className="h-4 w-4" />
          New Sequence
        </button>
      </div>

      <div className="space-y-4">
        {sequences.map((seq) => (
          <div key={seq.id} className="rounded-xl border border-white/5 bg-white/[0.03] hover:border-white/10 transition-colors">
            <div className="flex items-center gap-4 px-6 py-4">
              <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <GitBranch className="h-5 w-5 text-[#25D366]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-white">{seq.name}</p>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                    seq.status === "active"
                      ? "text-[#25D366] bg-[#25D366]/10"
                      : "text-amber-400 bg-amber-400/10"
                  }`}>
                    {seq.status}
                  </span>
                </div>
                <p className="text-xs text-white/30 mt-0.5">{seq.campaign}</p>
              </div>
              <div className="hidden md:flex items-center gap-6 text-xs text-white/40">
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {seq.steps} steps
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {seq.quietStart}:00 – {seq.quietEnd}:00
                </span>
                <span className={`text-[11px] font-medium ${seq.stopOnReply ? "text-[#25D366]" : "text-white/30"}`}>
                  {seq.stopOnReply ? "Stops on reply" : "Runs all steps"}
                </span>
              </div>
              <button className="text-white/30 hover:text-white transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Steps preview */}
            <div className="px-6 pb-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {Array.from({ length: seq.steps }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs">
                      <span className="font-bold text-white/30">#{i + 1}</span>
                      <span className="text-white/50">
                        {i === 0 ? "Initial message" : `Follow-up ${i}`}
                      </span>
                      <span className="text-white/20">
                        {i === 0 ? "Immediately" : `+${i * 24}h`}
                      </span>
                    </div>
                    {i < seq.steps - 1 && (
                      <ChevronRight className="h-3.5 w-3.5 text-white/20 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
