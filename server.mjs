import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: true,
      credentials: true,
    },
  });

  globalThis.__samCampingBroadcastRealtime = (event, payload) => {
    io.emit(event, payload);
  };

  io.on("connection", (socket) => {
    socket.emit("realtime:ready", { ok: true });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
