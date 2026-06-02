import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  type WASocket,
  type ConnectionState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { Server as SocketServer } from "socket.io";
import QRCode from "qrcode";
import pino from "pino";
import path from "path";
import fs from "fs";

const SESSIONS_DIR = path.join(process.cwd(), "sessions");
const HEALTH_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 min
const LOGGER = pino({ level: "silent" });

// Per-session failure tracking window (24h)
interface FailureEntry {
  timestamp: number;
}

export interface SessionStatus {
  accountId: string;
  status: "connecting" | "connected" | "disconnected" | "logged_out";
  phoneNumber?: string;
  healthScore: number;
  messagesSentToday: number;
  dailyLimitHit: boolean;
  dailyLimitHitStreak: number;
  lastActivityDate: string; // YYYY-MM-DD
  cleanSendingDays: number;
}

interface SessionEntry {
  socket: WASocket;
  status: SessionStatus;
  failures: FailureEntry[];
  reconnectAttempts: number;
  reconnectTimer?: ReturnType<typeof setTimeout>;
}

declare global {
  // eslint-disable-next-line no-var
  var sessionManager: BaileysSessionManager | undefined;
}

export class BaileysSessionManager {
  private sessions = new Map<string, SessionEntry>();
  private io: SocketServer;
  private healthSyncTimer?: ReturnType<typeof setInterval>;

  constructor(io: SocketServer) {
    this.io = io;
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    this.startHealthSync();
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  async createSession(accountId: string): Promise<void> {
    // Tear down existing session before creating a new one
    if (this.sessions.has(accountId)) {
      await this._teardown(accountId, false);
    }

    const sessionPath = path.join(SESSIONS_DIR, accountId);
    fs.mkdirSync(sessionPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const today = new Date().toISOString().slice(0, 10);
    const entry: SessionEntry = {
      socket: null as unknown as WASocket,
      status: {
        accountId,
        status: "connecting",
        healthScore: 100,
        messagesSentToday: 0,
        dailyLimitHit: false,
        dailyLimitHitStreak: 0,
        lastActivityDate: today,
        cleanSendingDays: 0,
      },
      failures: [],
      reconnectAttempts: 0,
    };

    const socket = makeWASocket({
      version,
      logger: LOGGER,
      auth: state,
      printQRInTerminal: false,
      browser: ["Djebrane Dashboard", "Chrome", "120.0.0"],
      connectTimeoutMs: 60_000,
      keepAliveIntervalMs: 30_000,
    });

    entry.socket = socket;
    this.sessions.set(accountId, entry);

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
          this.io.emit("qr_code", { accountId, qr, qrDataUrl });
          this.io.to(`account:${accountId}`).emit("qr_code", { accountId, qr, qrDataUrl });
        } catch (err) {
          console.error("[Baileys] QR generation failed:", err);
        }
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        if (loggedOut) {
          entry.status.status = "logged_out";
          this.sessions.delete(accountId);
          this._emitDisconnected(accountId, "logged_out");
          await this._syncToSupabase(accountId, "disconnected");
        } else {
          entry.status.status = "disconnected";
          this._emitDisconnected(accountId, "disconnected");
          await this._syncToSupabase(accountId, "disconnected");
          // Exponential back-off reconnect
          this._scheduleReconnect(accountId);
        }
      }

      if (connection === "open") {
        entry.reconnectAttempts = 0;
        const rawJid = socket.user?.id ?? "";
        const phoneNumber = rawJid.replace(/:\d+@/, "@").replace(/@.*/, "");
        entry.status.status = "connected";
        entry.status.phoneNumber = phoneNumber;
        this.io.emit("account_connected", { accountId, phoneNumber });
        this.io.to(`account:${accountId}`).emit("account_connected", { accountId, phoneNumber });
        await this._syncToSupabase(accountId, "connected", phoneNumber);
      }
    });

    socket.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      for (const msg of messages) {
        if (msg.key.fromMe || !msg.message) continue;
        const from = msg.key.remoteJid ?? "";
        const text =
          msg.message.conversation ??
          msg.message.extendedTextMessage?.text ??
          "";
        this.io.emit("incoming_message", { accountId, from, message: text });
        this.io.to(`account:${accountId}`).emit("incoming_message", { accountId, from, message: text });
      }
    });
  }

  getSession(accountId: string): SessionEntry | undefined {
    return this.sessions.get(accountId);
  }

  async destroySession(accountId: string): Promise<void> {
    await this._teardown(accountId, true);
    // Remove persisted credentials so next scan starts fresh
    const sessionPath = path.join(SESSIONS_DIR, accountId);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  }

  getAllSessions(): SessionStatus[] {
    return Array.from(this.sessions.values()).map((e) => e.status);
  }

  async sendMessage(
    accountId: string,
    phoneNumber: string,
    message: string
  ): Promise<string | null> {
    const entry = this.sessions.get(accountId);
    if (!entry || entry.status.status !== "connected") {
      throw new Error(`Account ${accountId} is not connected`);
    }

    const jid = phoneNumber.includes("@s.whatsapp.net")
      ? phoneNumber
      : `${phoneNumber.replace(/\D/g, "")}@s.whatsapp.net`;

    try {
      const result = await entry.socket.sendMessage(jid, { text: message });
      entry.status.messagesSentToday++;
      this._resetDailyDate(entry);
      return result?.key?.id ?? null;
    } catch (err) {
      entry.failures.push({ timestamp: Date.now() });
      this._recalcHealth(entry);
      throw err;
    }
  }

  getStatus(accountId: string): SessionStatus | null {
    return this.sessions.get(accountId)?.status ?? null;
  }

  shutdown(): void {
    clearInterval(this.healthSyncTimer);
    for (const [id] of this.sessions) {
      this._teardown(id, false).catch(() => {});
    }
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async _teardown(accountId: string, logout: boolean): Promise<void> {
    const entry = this.sessions.get(accountId);
    if (!entry) return;
    clearTimeout(entry.reconnectTimer);
    try {
      if (logout) {
        await entry.socket.logout();
      } else {
        entry.socket.end(undefined);
      }
    } catch {
      // ignore close errors
    }
    this.sessions.delete(accountId);
    this._emitDisconnected(accountId, logout ? "logged_out" : "disconnected");
    await this._syncToSupabase(accountId, "disconnected");
  }

  private _scheduleReconnect(accountId: string): void {
    const entry = this.sessions.get(accountId);
    if (!entry) return;
    entry.reconnectAttempts++;
    if (entry.reconnectAttempts > 5) return; // give up after 5 attempts
    const delay = Math.min(1000 * 2 ** entry.reconnectAttempts, 30_000);
    entry.reconnectTimer = setTimeout(async () => {
      console.log(`[Baileys] Reconnecting ${accountId} (attempt ${entry.reconnectAttempts})…`);
      await this.createSession(accountId);
    }, delay);
  }

  private _emitDisconnected(accountId: string, reason: string): void {
    this.io.emit("account_disconnected", { accountId, reason });
    this.io.to(`account:${accountId}`).emit("account_disconnected", { accountId, reason });
  }

  private _resetDailyDate(entry: SessionEntry): void {
    const today = new Date().toISOString().slice(0, 10);
    if (entry.status.lastActivityDate !== today) {
      entry.status.messagesSentToday = 1;
      entry.status.dailyLimitHit = false;
      entry.status.lastActivityDate = today;
    }
  }

  /** Recalculate health score from current failure window */
  private _recalcHealth(entry: SessionEntry): void {
    const now = Date.now();
    const window24h = 24 * 60 * 60 * 1000;
    // Prune stale failures
    entry.failures = entry.failures.filter((f: FailureEntry) => now - f.timestamp < window24h);

    let score = 100;
    score -= entry.failures.length * 10;
    score -= entry.status.dailyLimitHitStreak * 20;
    score += entry.status.cleanSendingDays * 5;
    entry.status.healthScore = Math.max(0, Math.min(100, score));
  }

  private startHealthSync(): void {
    this.healthSyncTimer = setInterval(async () => {
      for (const [accountId, entry] of this.sessions) {
        // Give +5 for each clean sending day
        const today = new Date().toISOString().slice(0, 10);
        if (
          entry.status.lastActivityDate === today &&
          entry.failures.filter((f) => Date.now() - f.timestamp < 86_400_000).length === 0 &&
          entry.status.messagesSentToday > 0
        ) {
          entry.status.cleanSendingDays++;
        }

        this._recalcHealth(entry);

        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/accounts?id=eq.${accountId}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                Authorization: `Bearer ${
                  process.env.SUPABASE_SERVICE_ROLE_KEY ??
                  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                }`,
              },
              body: JSON.stringify({
                health_score: entry.status.healthScore,
                messages_sent_today: entry.status.messagesSentToday,
              }),
            }
          );
        } catch (err) {
          console.error("[Health sync] Supabase update failed:", err);
        }
      }
    }, HEALTH_SYNC_INTERVAL_MS);
  }

  private async _syncToSupabase(
    accountId: string,
    status: "connected" | "disconnected",
    phoneNumber?: string
  ): Promise<void> {
    const body: Record<string, unknown> = { status };
    if (phoneNumber) body.phone_number = phoneNumber;
    if (status === "connected") body.health_score = 100;

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/accounts?id=eq.${accountId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${
              process.env.SUPABASE_SERVICE_ROLE_KEY ??
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            }`,
          },
          body: JSON.stringify(body),
        }
      );
    } catch (err) {
      console.error("[Baileys] Supabase status sync failed:", err);
    }
  }
}
