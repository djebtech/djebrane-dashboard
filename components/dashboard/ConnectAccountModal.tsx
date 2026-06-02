"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { QRCodeSVG } from "qrcode.react";
import {
  X,
  Loader2,
  MessageCircle,
  CheckCircle2,
  RefreshCw,
  Smartphone,
} from "lucide-react";

type Step = "form" | "qr" | "success" | "error";

interface Props {
  onClose: () => void;
  onConnected: (accountId: string, phoneNumber: string) => void;
}

export function ConnectAccountModal({ onClose, onConnected }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [dailyLimit, setDailyLimit] = useState(200);
  const [loading, setLoading] = useState(false);
  const [qrString, setQrString] = useState<string | null>(null);
  const [qrExpired, setQrExpired] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");

  const socketRef = useRef<Socket | null>(null);
  const qrTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connect socket once we have an accountId
  useEffect(() => {
    if (!accountId) return;

    const socket = io(window.location.origin, {
      path: "/api/socket",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("subscribe", accountId);
    });

    socket.on("qr_code", ({ accountId: id, qr }: { accountId: string; qr: string }) => {
      if (id !== accountId) return;
      setQrString(qr);
      setQrExpired(false);
      setStep("qr");

      // QR expires after 60 s
      if (qrTimerRef.current) clearTimeout(qrTimerRef.current);
      qrTimerRef.current = setTimeout(() => setQrExpired(true), 60_000);
    });

    socket.on(
      "account_connected",
      ({ accountId: id, phoneNumber: phone }: { accountId: string; phoneNumber: string }) => {
        if (id !== accountId) return;
        if (qrTimerRef.current) clearTimeout(qrTimerRef.current);
        setPhoneNumber(phone);
        setStep("success");
        setTimeout(() => {
          onConnected(accountId, phone);
          onClose();
        }, 2000);
      }
    );

    return () => {
      socket.emit("unsubscribe", accountId);
      socket.disconnect();
      if (qrTimerRef.current) clearTimeout(qrTimerRef.current);
    };
  }, [accountId, onClose, onConnected]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/accounts/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), daily_limit: dailyLimit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create account");
      setAccountId(data.accountId);
      // Step transitions to 'qr' when the socket fires the first qr_code event
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStep("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshQR() {
    if (!accountId) return;
    setQrExpired(false);
    setQrString(null);
    setLoading(true);
    try {
      await fetch("/api/accounts/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, refresh: true }),
      });
    } catch {}
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-[#0f1117] border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-[#25D366] flex items-center justify-center">
              <MessageCircle className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {step === "form" && "Connect WhatsApp Number"}
                {step === "qr" && "Scan QR Code"}
                {step === "success" && "Connected!"}
                {step === "error" && "Connection Failed"}
              </p>
              <p className="text-xs text-white/40">
                {step === "form" && "Baileys session"}
                {step === "qr" && "Open WhatsApp → Linked Devices → Link a Device"}
                {step === "success" && phoneNumber}
                {step === "error" && "Try again"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white transition-colors rounded-lg p-1.5 hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {/* ── FORM ── */}
          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Main Sender, Campaign Account 2"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/30 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Daily Message Limit
                </label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(Number(e.target.value))}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[#25D366]/50 focus:ring-1 focus:ring-[#25D366]/30 transition-all"
                />
                <p className="text-xs text-white/30">
                  Keep under 200/day for new numbers to avoid bans
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-semibold text-white hover:bg-[#1fb855] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting session…
                  </>
                ) : (
                  <>
                    <Smartphone className="h-4 w-4" />
                    Generate QR Code
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── QR WAITING ── */}
          {step === "form" && accountId && !qrString && (
            <div className="mt-4 flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 text-[#25D366] animate-spin" />
              <p className="text-sm text-white/50">Waiting for QR code…</p>
            </div>
          )}

          {/* ── QR DISPLAY ── */}
          {step === "qr" && (
            <div className="flex flex-col items-center gap-5">
              <div className="relative">
                <div
                  className={`rounded-2xl bg-white p-4 transition-all ${
                    qrExpired ? "opacity-30 blur-sm" : ""
                  }`}
                >
                  {qrString && (
                    <QRCodeSVG
                      value={qrString}
                      size={240}
                      level="M"
                      includeMargin={false}
                    />
                  )}
                </div>

                {qrExpired && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <p className="text-sm font-semibold text-white">QR Expired</p>
                    <button
                      onClick={handleRefreshQR}
                      className="flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1fb855] transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Refresh QR
                    </button>
                  </div>
                )}
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs text-white/50 max-w-xs">
                  1. Open WhatsApp on your phone
                  <br />
                  2. Tap <span className="text-white/70">⋮ → Linked Devices → Link a Device</span>
                  <br />
                  3. Point your camera at the QR code
                </p>
                {!qrExpired && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-white/30">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Waiting for scan…
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {step === "success" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="h-16 w-16 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-[#25D366]" />
              </div>
              <div>
                <p className="text-base font-bold text-white">
                  WhatsApp Connected
                </p>
                <p className="text-sm text-white/50 mt-1">{phoneNumber}</p>
              </div>
              <p className="text-xs text-white/30">Closing in a moment…</p>
            </div>
          )}

          {/* ── ERROR ── */}
          {step === "error" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {errorMsg}
              </div>
              <button
                onClick={() => {
                  setStep("form");
                  setErrorMsg("");
                  setAccountId(null);
                  setQrString(null);
                }}
                className="w-full rounded-xl bg-white/5 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
