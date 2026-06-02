import { Plus, FileText, Copy, Edit2, MessageCircle } from "lucide-react";

const templates = [
  {
    id: "1",
    name: "Welcome Message",
    preview: "Bonjour {{name}} ! Merci de votre intérêt pour nos services. Voici comment nous pouvons vous aider...",
    tags: ["onboarding", "welcome"],
    used: 3,
  },
  {
    id: "2",
    name: "Follow-up Day 2",
    preview: "Bonjour {{name}}, je voulais juste faire un suivi rapide pour voir si vous avez des questions...",
    tags: ["follow-up"],
    used: 2,
  },
  {
    id: "3",
    name: "Promo Offer",
    preview: "🎉 Offre spéciale pour {{name}} ! Bénéficiez de -30% sur tous nos services jusqu'au {{expiry_date}}.",
    tags: ["promo", "sales"],
    used: 5,
  },
  {
    id: "4",
    name: "Re-engagement",
    preview: "Salut {{name}}, ça fait un moment qu'on ne s'est pas parlé. Nous avons du nouveau pour vous !",
    tags: ["re-engagement"],
    used: 1,
  },
];

export default function TemplatesPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Templates</h1>
          <p className="text-sm text-white/40 mt-1">Reusable message templates with dynamic variables</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] transition-colors">
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((tpl) => (
          <div key={tpl.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-5 space-y-4 hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#25D366]/10 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-[#25D366]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{tpl.name}</p>
                  <p className="text-xs text-white/30">Used in {tpl.used} sequence{tpl.used !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="p-1.5 rounded-lg text-white/30 hover:bg-white/5 hover:text-white transition-colors">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button className="p-1.5 rounded-lg text-white/30 hover:bg-white/5 hover:text-white transition-colors">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Preview bubble */}
            <div className="rounded-xl bg-[#1a1f2e] border border-white/5 p-4">
              <div className="flex items-start gap-2">
                <div className="h-6 w-6 rounded-full bg-[#25D366] flex items-center justify-center shrink-0 mt-0.5">
                  <MessageCircle className="h-3.5 w-3.5 text-white" />
                </div>
                <p className="text-sm text-white/60 leading-relaxed">{tpl.preview}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {tpl.tags.map((tag) => (
                <span key={tag} className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/5 text-white/40">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
