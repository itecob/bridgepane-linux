import { EventEmitter } from "node:events";
import { PolicyError, validateClientRequest } from "./policy.js";
import {
  hasId,
  hasMethod,
  isResponse,
  validateRpcMessage,
  type RequestId,
  type RpcFailure,
  type RpcMessage,
  type RpcRequest,
  type RpcResponse,
} from "./protocol.js";

export interface AppServerTransport extends EventEmitter {
  send(message: RpcMessage): void;
}

export interface RouterEvents { clientMessage: [RpcMessage]; }
interface ClientMapping { clientId: RequestId; }

const MAX_PENDING_REQUESTS = 512;

export class RpcRouter extends EventEmitter<RouterEvents> {
  readonly appServer: AppServerTransport;
  #nextId = 1;
  #clientRequests = new Map<RequestId, ClientMapping>();
  #clientIds = new Set<RequestId>();
  #serverRequests = new Map<RequestId, RequestId>();
  #clientConnected = false;

  constructor(appServer: AppServerTransport) {
    super();
    this.appServer = appServer;
    appServer.on("notification", (message: RpcMessage) => this.#emitClient(message));
    appServer.on("request", (message: RpcRequest) => this.#onServerRequest(message));
    appServer.on("response", (message: RpcMessage) => this.receiveFromAppServer(message));
  }

  connectClient(): void {
    if (this.#clientConnected) throw new Error("Only one interactive client may connect at a time");
    this.#clientConnected = true;
  }

  disconnectClient(): void {
    this.#clientConnected = false;
    this.#clientRequests.clear();
    this.#clientIds.clear();
    for (const [bridgeId, serverId] of this.#serverRequests) {
      try {
        this.appServer.send({ id: serverId, error: { code: -32000, message: "Interactive client disconnected; request denied" } });
      } catch { /* The server may already have exited. */ }
      this.#serverRequests.delete(bridgeId);
    }
  }

  receiveFromClient(raw: RpcMessage): void {
    if (!this.#clientConnected) throw new Error("No interactive client is connected");
    const message = validateRpcMessage(raw);
    if (isResponse(message)) { this.#onClientResponse(message); return; }
    if (!hasMethod(message) || !hasId(message)) {
      this.#emitClient({ id: "invalid-notification", error: { code: -32600, message: "Client notifications are not supported" } });
      return;
    }
    if (this.#clientIds.has(message.id)) {
      this.#emitClient({ id: message.id, error: { code: -32600, message: "Duplicate pending request id" } });
      return;
    }
    if (this.#clientRequests.size >= MAX_PENDING_REQUESTS) {
      this.#emitClient({ id: message.id, error: { code: -32000, message: "Too many pending requests" } });
      return;
    }
    try {
      validateClientRequest(message);
    } catch (error) {
      const failure: RpcFailure = {
        id: message.id,
        error: { code: error instanceof PolicyError ? error.code : -32602, message: (error as Error).message },
      };
      this.#emitClient(failure);
      return;
    }
    const bridgeId = `client:${this.#nextId++}`;
    this.#clientRequests.set(bridgeId, { clientId: message.id });
    this.#clientIds.add(message.id);
    try {
      this.appServer.send({ ...message, id: bridgeId });
    } catch (error) {
      this.#clientRequests.delete(bridgeId);
      this.#clientIds.delete(message.id);
      this.#emitClient({ id: message.id, error: { code: -32000, message: (error as Error).message } });
    }
  }

  receiveFromAppServer(message: RpcMessage): void {
    if (!isResponse(message)) return;
    const mapping = this.#clientRequests.get(message.id);
    if (!mapping) return;
    this.#clientRequests.delete(message.id);
    this.#clientIds.delete(mapping.clientId);
    this.#emitClient({ ...message, id: mapping.clientId });
  }

  #onServerRequest(message: RpcRequest): void {
    if (!this.#clientConnected || this.#serverRequests.size >= MAX_PENDING_REQUESTS) {
      this.appServer.send({ id: message.id, error: { code: -32000, message: "No interactive client connected; request denied" } });
      return;
    }
    const bridgeId = `server:${this.#nextId++}`;
    this.#serverRequests.set(bridgeId, message.id);
    this.#emitClient({ ...message, id: bridgeId });
  }

  #onClientResponse(message: RpcResponse): void {
    const serverId = this.#serverRequests.get(message.id);
    if (serverId === undefined) {
      this.#emitClient({ id: message.id, error: { code: -32600, message: "No matching app-server request" } });
      return;
    }
    this.#serverRequests.delete(message.id);
    this.appServer.send({ ...message, id: serverId });
  }

  #emitClient(message: RpcMessage): void {
    if (this.#clientConnected) this.emit("clientMessage", message);
  }
}
