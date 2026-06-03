"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ErrorBoundary } from "./ErrorBoundary";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on nav
  const handleNavClose = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen bg-[#0a0c10] overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed on mobile, static on desktop */}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <Sidebar onClose={handleNavClose} />
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 lg:hidden shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-sm font-bold text-white">Djebrane Dashboard</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
