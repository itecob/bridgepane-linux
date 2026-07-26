import type { RpcMessage } from "../../src/protocol.js";

export type AppMode = "chatgpt" | "codex";

export interface BridgeStatus {
  state: "starting" | "ready" | "error" | "stopped";
  detail?: string;
}

export interface PluginRecord {
  name: string;
  description?: string;
  installed: boolean;
  enabled?: boolean;
  source?: string;
  version?: string;
}

export interface DesktopApi {
  setMode(mode: AppMode): Promise<void>;
  rpc(message: RpcMessage): void;
  onRpc(listener: (message: RpcMessage) => void): () => void;
  onStatus(listener: (status: BridgeStatus) => void): () => void;
  restartCodex(): Promise<void>;
  chooseDirectory(): Promise<string | null>;
  openExternal(url: string): Promise<void>;
  plugins: {
    list(): Promise<PluginRecord[]>;
    install(name: string): Promise<void>;
    remove(name: string): Promise<void>;
    listMarketplaces(): Promise<unknown>;
    addMarketplace(source: string): Promise<void>;
  };
}

declare global {
  interface Window {
    codexDesktop: DesktopApi;
  }
}
