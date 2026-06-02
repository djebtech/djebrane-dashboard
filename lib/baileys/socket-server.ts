import { Server as SocketServer } from "socket.io";
import type { Server as HTTPServer } from "http";

declare global {
  // eslint-disable-next-line no-var
  var io: SocketServer | undefined;
}

export function initSocketServer(httpServer: HTTPServer): SocketServer {
  const io = new SocketServer(httpServer, {
    path: "/api/socket",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log("[Socket.io] Client connected:", socket.id);

    // Client joins a room to receive events for a specific account
    socket.on("subscribe", (accountId: string) => {
      socket.join(`account:${accountId}`);
    });

    socket.on("unsubscribe", (accountId: string) => {
      socket.leave(`account:${accountId}`);
    });

    socket.on("disconnect", () => {
      console.log("[Socket.io] Client disconnected:", socket.id);
    });
  });

  global.io = io;
  return io;
}

/** Safe getter — returns the global io instance or throws if server isn't running */
export function getIO(): SocketServer {
  if (!global.io) {
    throw new Error(
      "Socket.io server not initialised. Run `npm run dev:server` instead of `npm run dev`."
    );
  }
  return global.io;
}
