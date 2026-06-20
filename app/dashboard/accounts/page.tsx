"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import {
  Plus,
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  RefreshCw,
  Trash2,
  Loader2,
} from "lucide-react";
import { ConnectAccountModal } from "@/components/dashboard/ConnectAccountModal";
import { Skeleton } from "@/components/ui/skeleton";
import type { Account } from "@/lib/types";

type LiveStatus = "connected" | "warming" | "disconnected";

interface AccountRow extends Account {
  _live?: LiveStatus;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({}); // accountId → action
  const socketRef = useRef<Socket | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts/status");
      if (res.ok) {
        const data: Account[] = await res.json();
        setAccounts(data);
      }
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();

    const socket = io(window.location.origin, {
      path: "/api/socket",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on(
      "account_connected",
      ({ accountId, phoneNumber }: { accountId: string; phoneNumber: string }) => {
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === accountId
              ? { ...a, status: "connected", phone_number: phoneNumber, _live: "connected" }
              : a
          )
        );
        toast.success("Account connected");
      }
    );

    socket.on(
      "account_disconnected",
      ({ accountId }: { accountId: string }) => {
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === accountId ? { ...a, status: "disconnected", _live: "disconnected" } : a
          )
        );
        toast.error("Connection lost");
      }
    );

    return () => {
      socket.disconnect();
    };
  }, [fetchAccounts]);

  async function handleReconnect(accountId: string) {
    setActionLoading((p) => ({ ...p, [accountId]: "reconnect" }));
    try {
      await fetch("/api/accounts/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, refresh: true }),
      });
      // The modal will open if needed — for reconnect we just restart the session silently
      // Socket.io will emit qr_code if a new QR is needed
    } catch (err) {
      console.error("Reconnect failed:", err);
      toast.error("Reconnect failed");
    } finally {
      setActionLoading((p) => ({ ...p, [accountId]: "" }));
    }
  }

  async function handleDisconnect(accountId: string) {
    setActionLoading((p) => ({ ...p, [accountId]: "disconnect" }));
    try {
      await fetch("/api/accounts/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      setAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, status: "disconnected" } : a))
      );
      toast.success("Account disconnected");
    } catch (err) {
      console.error("Disconnect failed:", err);
      toast.error("Disconnect failed");
    } finally {
      setActionLoading((p) => ({ ...p, [accountId]: "" }));
    }
  }

  async function handleDelete(accountId: string) {
    if (!confirm("Delete this account? This also removes session credentials.")) return;
    setActionLoading((p) => ({ ...p, [accountId]: "delete" }));
    try {
      await fetch("/api/accounts/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, deleteAccount: true }),
      });
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      toast.success("Account deleted");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Delete failed");
    } finally {
      setActionLoading((p) => ({ ...p, [accountId]: "" }));
    }
  }

  function handleConnected(accountId: string, phoneNumber: string) {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId
          ? { ...a, status: "connected", phone_number: phoneNumber }
          : a
      )
    );
    fetchAccounts(); // refresh from Supabase
  }

  const statusDot: Record<string, string> = {
    connected: "bg-[#25D366] shadow-[0_0_8px_#25D366]",
    warming: "bg-amber-400 shadow-[0_0_8px_#F59E0B]",
    disconnected: "bg-red-500",
  };

  const statusLabel: Record<string, string> = {
    connected: "text-[#25D366] bg-[#25D366]/10",
    warming: "text-amber-400 bg-amber-400/10",
    disconnected: "text-red-400 bg-red-400/10",
  };

  return (
    <>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Accounts</h1>
            <p className="text-sm text-white/40 mt-1">
              Manage your WhatsApp sender accounts
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Connect new number
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Smartphone className="h-8 w-8 text-white/20" />
            </div>
            <p className="text-sm font-medium text-white/40">No accounts connected yet</p>
            <p className="text-xs text-white/20 mt-1">
              Scan a QR code to link your first WhatsApp number
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-5 flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb855] transition-colors"
            >
              <Plus className="h-4 w-4" /> Connect your first number
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {accounts.map((acc) => {
              const status = acc.status as string;
              const isActing = !!actionLoading[acc.id];
              const usagePct = Math.min(
                100,
                Math.round((acc.messages_sent_today / acc.daily_limit) * 100)
              );

              return (
                <div
                  key={acc.id}
                  className="rounded-xl border border-white/5 bg-white/[0.03] p-5 space-y-4 hover:border-white/10 transition-colors"
                >
                  {/* Account header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">
                          <Smartphone className="h-5 w-5 text-white/50" />
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0f1117] ${
                            statusDot[status] ?? "bg-white/20"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{acc.name}</p>
                        <p className="text-xs text-white/40">
                          {acc.phone_number === "pending" ? "Not yet linked" : acc.phone_number}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${
                        statusLabel[status] ?? "text-white/40 bg-white/5"
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  {/* Health score bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-white/40">
                      <span>Health Score</span>
                      <span className="font-semibold text-white">{acc.health_score}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${acc.health_score}%`,
                          background:
                            acc.health_score > 70
                              ? "#25D366"
                              : acc.health_score > 40
                              ? "#F59E0B"
                              : "#EF4444",
                        }}
                      />
                    </div>
                  </div>

                  {/* Daily usage */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-white/40">
                      <span>Daily usage</span>
                      <span className="text-white font-medium tabular-nums">
                        {acc.messages_sent_today} / {acc.daily_limit}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500/70 transition-all duration-500"
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="flex items-center gap-1.5 text-xs text-white/30">
                      <Zap className="h-3.5 w-3.5" />
                      {acc.type === "business_api" ? "Business API" : "Baileys"}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Reconnect */}
                      <button
                        onClick={() => handleReconnect(acc.id)}
                        disabled={isActing}
                        title="Reconnect"
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40"
                      >
                        {actionLoading[acc.id] === "reconnect" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {/* Disconnect */}
                      {status === "connected" && (
                        <button
                          onClick={() => handleDisconnect(acc.id)}
                          disabled={isActing}
                          title="Disconnect"
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-amber-400/10 hover:text-amber-400 transition-colors disabled:opacity-40"
                        >
                          {actionLoading[acc.id] === "disconnect" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(acc.id)}
                        disabled={isActing}
                        title="Delete"
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-white/5 text-white/50 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        {actionLoading[acc.id] === "delete" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>

                      {/* Status icon */}
                      {status === "connected" && (
                        <CheckCircle2 className="h-4 w-4 text-[#25D366]" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Modal */}
      {showModal && (
        <ConnectAccountModal
          onClose={() => setShowModal(false)}
          onConnected={(id, phone) => {
            handleConnected(id, phone);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}
