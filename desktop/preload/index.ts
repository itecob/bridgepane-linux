import { contextBridge, ipcRenderer } from "electron";
import type { RpcMessage } from "../../src/protocol.js";
import type { AppMode, BridgeStatus, DesktopApi, PluginRecord } from "../shared/types.js";

const api: DesktopApi = {
  setMode: (mode: AppMode) => ipcRenderer.invoke("shell:set-mode", mode),
  rpc: (message: RpcMessage) => ipcRenderer.send("codex:rpc", message),
  onRpc: (listener: (message: RpcMessage) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, message: RpcMessage): void => listener(message);
    ipcRenderer.on("codex:message", wrapped);
    return () => ipcRenderer.removeListener("codex:message", wrapped);
  },
  onStatus: (listener: (status: BridgeStatus) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, value: BridgeStatus): void => listener(value);
    ipcRenderer.on("codex:status", wrapped);
    void ipcRenderer.invoke("codex:get-status").then(listener);
    return () => ipcRenderer.removeListener("codex:status", wrapped);
  },
  restartCodex: () => ipcRenderer.invoke("codex:restart"),
  chooseDirectory: () => ipcRenderer.invoke("dialog:directory") as Promise<string | null>,
  openExternal: (url: string) => ipcRenderer.invoke("shell:open-external", url),
  plugins: {
    list: () => ipcRenderer.invoke("plugins:list") as Promise<PluginRecord[]>,
    install: (name: string) => ipcRenderer.invoke("plugins:install", name),
    remove: (name: string) => ipcRenderer.invoke("plugins:remove", name),
    listMarketplaces: () => ipcRenderer.invoke("plugins:marketplaces"),
    addMarketplace: (source: string) => ipcRenderer.invoke("plugins:add-marketplace", source),
  },
};

contextBridge.exposeInMainWorld("codexDesktop", Object.freeze(api));
