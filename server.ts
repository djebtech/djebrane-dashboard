import "dotenv/config";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initSocketServer } from "./lib/baileys/socket-server";
import { BaileysSessionManager } from "./lib/baileys/session-manager";
import { CampaignQueue } from "./lib/campaign/queue";
import { SequenceEngine } from "./lib/sequences/sequence-engine";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("[Server] Error handling request:", req.url, err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });

  // Attach Socket.io to the HTTP server
  const io = initSocketServer(httpServer);
  console.log("[Server] Socket.io initialised");

  // Initialise Baileys session manager (singleton)
  const sessionManager = new BaileysSessionManager(io);
  global.sessionManager = sessionManager;
  console.log("[Server] Baileys session manager ready");

  // Initialise Campaign Queue (singleton)
  const campaignQueue = new CampaignQueue(io);
  global.campaignQueue = campaignQueue;
  console.log("[Server] Campaign queue ready");

  // Initialise Sequence Engine (singleton)
  const sequenceEngine = new SequenceEngine(io);
  global.sequenceEngine = sequenceEngine;
  console.log("[Server] Sequence engine ready");

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("[Server] SIGTERM received — shutting down");
    sessionManager.shutdown();
    campaignQueue.shutdown();
    sequenceEngine.shutdown();
    process.exit(0);
  });
  process.on("SIGINT", () => {
    console.log("[Server] SIGINT received — shutting down");
    sessionManager.shutdown();
    campaignQueue.shutdown();
    sequenceEngine.shutdown();
    process.exit(0);
  });

  httpServer.listen(port, () => {
    console.log(`\n  ▲ Djebrane Dashboard (custom server)`);
    console.log(`  - Local:  http://${hostname}:${port}`);
    console.log(`  - Socket: ws://${hostname}:${port}/api/socket\n`);
  });
});
