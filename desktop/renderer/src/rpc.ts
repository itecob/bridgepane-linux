import type { RpcMessage, RpcResponse } from "../../../src/protocol.js";

type MessageListener = (message: RpcMessage) => void;

class DesktopRpcClient {
  #nextId = 1;
  #pending = new Map<string | number, { resolve(value: unknown): void; reject(error: Error): void }>();
  #listeners = new Set<MessageListener>();
  #unsubscribe: (() => void) | null = null;

  start(): void {
    if (this.#unsubscribe) return;
    this.#unsubscribe = window.codexDesktop.onRpc((message) => {
      if ("id" in message && !("method" in message)) {
        const pending = this.#pending.get(message.id);
        if (pending) {
          this.#pending.delete(message.id);
          if ("error" in message) pending.reject(new Error(message.error.message));
          else pending.resolve(message.result);
          return;
        }
      }
      for (const listener of this.#listeners) listener(message);
    });
  }

  request<T = unknown>(method: string, params?: unknown): Promise<T> {
    this.start();
    const id = `ui:${this.#nextId++}`;
    return new Promise<T>((resolve, reject) => {
      this.#pending.set(id, { resolve: (value) => resolve(value as T), reject });
      window.codexDesktop.rpc(params === undefined ? { id, method } : { id, method, params });
    });
  }

  respond(message: RpcResponse): void {
    window.codexDesktop.rpc(message);
  }

  subscribe(listener: MessageListener): () => void {
    this.start();
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
}

export const rpc = new DesktopRpcClient();
