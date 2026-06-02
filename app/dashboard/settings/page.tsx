import { Settings, Bell, Shield, Palette, Globe } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-sm text-white/40 mt-1">Configure your dashboard preferences</p>
      </div>

      <div className="grid gap-4 max-w-2xl">
        {[
          { icon: Settings, label: "General", desc: "Account name, timezone, language", color: "text-white/50 bg-white/5" },
          { icon: Bell, label: "Notifications", desc: "Email and webhook alert preferences", color: "text-amber-400 bg-amber-400/10" },
          { icon: Shield, label: "Security", desc: "Password, 2FA, API keys", color: "text-blue-400 bg-blue-400/10" },
          { icon: Palette, label: "Appearance", desc: "Theme and display settings", color: "text-purple-400 bg-purple-400/10" },
          { icon: Globe, label: "Integrations", desc: "Connect external tools and webhooks", color: "text-[#25D366] bg-[#25D366]/10" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-5 hover:border-white/10 transition-colors cursor-pointer">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
              <item.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{item.label}</p>
              <p className="text-xs text-white/40">{item.desc}</p>
            </div>
            <svg className="h-4 w-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}
      </div>

      {/* API Keys section */}
      <div className="max-w-2xl rounded-xl border border-white/5 bg-white/[0.03] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white">Supabase Connection</h2>
          <p className="text-xs text-white/40 mt-0.5">Configure in .env.local</p>
        </div>
        <div className="divide-y divide-white/5">
          {[
            { key: "NEXT_PUBLIC_SUPABASE_URL", value: "https://xxxx.supabase.co" },
            { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: "eyJhbGciOiJIUzI1NiIs..." },
          ].map((env) => (
            <div key={env.key} className="flex items-center justify-between px-6 py-3.5">
              <code className="text-xs font-mono text-[#25D366]">{env.key}</code>
              <code className="text-xs font-mono text-white/30">{env.value}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
