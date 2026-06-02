"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Smartphone,
  Megaphone,
  GitBranch,
  Users,
  FileText,
  BarChart3,
  Settings,
  MessageCircle,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Overview",   href: "/dashboard",            icon: LayoutDashboard, exact: true },
  { label: "Accounts",   href: "/dashboard/accounts",   icon: Smartphone },
  { label: "Campaigns",  href: "/dashboard/campaigns",  icon: Megaphone },
  { label: "Sequences",  href: "/dashboard/sequences",  icon: GitBranch },
  { label: "Contacts",   href: "/dashboard/contacts",   icon: Users },
  { label: "Templates",  href: "/dashboard/templates",  icon: FileText },
  { label: "Analytics",  href: "/dashboard/analytics",  icon: BarChart3 },
  { label: "Settings",   href: "/dashboard/settings",   icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-64 flex-col bg-[#0f1117] border-r border-white/5">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#25D366] shadow-lg shadow-[#25D366]/20">
          <MessageCircle className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight tracking-tight">Djebrane</p>
          <p className="text-[11px] font-medium text-[#25D366] leading-tight">Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-white/25">
          Navigation
        </p>
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-[#25D366]/10 text-[#25D366]"
                  : "text-white/50 hover:bg-white/5 hover:text-white/90"
              )}
            >
              <item.icon
                className={cn(
                  "shrink-0 transition-colors",
                  active ? "text-[#25D366]" : "text-white/40 group-hover:text-white/70"
                )}
                style={{ width: "18px", height: "18px" }}
              />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="h-3.5 w-3.5 text-[#25D366]/60" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer — user + logout */}
      <div className="border-t border-white/5 px-4 py-4 space-y-2">
        <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-white">DJ</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white/80">Djebrane Agency</p>
            <p className="truncate text-[10px] text-white/40">Pro Plan</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="text-white/25 hover:text-red-400 transition-colors shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
