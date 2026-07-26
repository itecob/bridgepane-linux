import { timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import type { BridgeConfig } from "./config.js";
import type { CodexAppServer } from "./codex-app-server.js";
import { parseRpcMessage, type RpcMessage } from "./protocol.js";
import type { RpcRouter } from "./router.js";

const PROTOCOL = "codex-app-server.v1";
const TOKEN_PROTOCOL_PREFIX = "token.";

function json(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(payload);
}

function constantTimeTokenEquals(expected: string, candidate: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(candidate);
  return left.length === right.length && timingSafeEqual(left, right);
}

function bearerToken(request: IncomingMessage): string | null {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length);
}

function websocketToken(request: IncomingMessage): string | null {
  const protocols = request.headers["sec-websocket-protocol"]
    ?.split(",")
    .map((value) => value.trim());
  const tokenProtocol = protocols?.find((value) => value.startsWith(TOKEN_PROTOCOL_PREFIX));
  return tokenProtocol?.slice(TOKEN_PROTOCOL_PREFIX.length) ?? bearerToken(request);
}

export interface BridgeServer {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createBridgeServer(
  config: BridgeConfig,
  appServer: CodexAppServer,
  router: RpcRouter,
): BridgeServer {
  const httpServer = createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    if (request.method === "GET" && url.pathname === "/healthz") {
      json(response, 200, { status: "ok" });
      return;
    }
    if (request.method === "GET" && url.pathname === "/readyz") {
      json(response, appServer.initialized ? 200 : 503, {
        status: appServer.initialized ? "ready" : "starting",
        appServerRunning: appServer.running,
      });
      return;
    }
    json(response, 404, { error: "Not found" });
  });

  const sockets = new WebSocketServer({
    noServer: true,
    handleProtocols(protocols) {
      return protocols.has(PROTOCOL) ? PROTOCOL : false;
    },
    maxPayload: 4 * 1024 * 1024,
  });

  let activeSocket: WebSocket | null = null;

  httpServer.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    const origin = request.headers.origin;
    const token = websocketToken(request);
    const protocols = request.headers["sec-websocket-protocol"] ?? "";

    if (
      url.pathname !== "/v1/app-server" ||
      !origin ||
      !config.allowedOrigins.has(origin) ||
      !protocols.split(",").map((value) => value.trim()).includes(PROTOCOL) ||
      !token ||
      !constantTimeTokenEquals(config.token, token) ||
      activeSocket !== null
    ) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    sockets.handleUpgrade(request, socket, head, (websocket) => {
      sockets.emit("connection", websocket, request);
    });
  });

  sockets.on("connection", (socket) => {
    activeSocket = socket;
    router.connectClient();

    const send = (message: RpcMessage) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    };
    router.on("clientMessage", send);

    socket.on("message", (data, isBinary) => {
      if (isBinary) {
        socket.close(1003, "Binary messages are not supported");
        return;
      }
      try {
        router.receiveFromClient(parseRpcMessage(data.toString()));
      } catch (error) {
        socket.send(
          JSON.stringify({
            id: "parse-error",
            error: { code: -32700, message: (error as Error).message },
          }),
        );
      }
    });

    socket.once("close", () => {
      router.off("clientMessage", send);
      router.disconnectClient();
      activeSocket = null;
    });
  });

  return {
    async start() {
      await new Promise<void>((resolve, reject) => {
        httpServer.once("error", reject);
        httpServer.listen(config.port, config.host, () => {
          httpServer.off("error", reject);
          resolve();
        });
      });
    },
    async stop() {
      activeSocket?.close(1001, "Server shutting down");
      await new Promise<void>((resolve, reject) => {
        sockets.close(() => {
          httpServer.close((error) => (error ? reject(error) : resolve()));
        });
      });
    },
  };
}
