import { app, BrowserWindow, Menu, WebContentsView, dialog, ipcMain, shell } from "electron";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CodexAppServer } from "../../src/codex-app-server.js";
import type { RpcMessage } from "../../src/protocol.js";
import { RpcRouter } from "../../src/router.js";
import type { AppMode, BridgeStatus } from "../shared/types.js";
import { resolveCodexBinary, verifyCodexBinary } from "./codex-binary.js";
import { addMarketplace, installPlugin, listMarketplaces, listPlugins, removePlugin } from "./plugins.js";
import { assertTrustedIpcSender, isOfficialOpenAiUrl, isTrustedChatGptNavigation } from "./security.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HEADER_HEIGHT = 64;
let mainWindow: BrowserWindow | null = null;
let chatGptView: WebContentsView | null = null;
let mode: AppMode = "codex";
let appServer: CodexAppServer | null = null;
let router: RpcRouter | null = null;
let status: BridgeStatus = { state: "starting" };

function emitStatus(next: BridgeStatus): void {
  status = next;
  mainWindow?.webContents.send("codex:status", next);
}

function resizeChatGptView(): void {
  if (!mainWindow || !chatGptView || mode !== "chatgpt") return;
  const [width = 0, height = 0] = mainWindow.getContentSize();
  chatGptView.setBounds({ x: 0, y: HEADER_HEIGHT, width, height: Math.max(0, height - HEADER_HEIGHT) });
}

function showMode(next: AppMode): void {
  if (!mainWindow || !chatGptView) return;
  mode = next;
  const attached = mainWindow.contentView.children.includes(chatGptView);
  if (next === "chatgpt" && !attached) mainWindow.contentView.addChildView(chatGptView);
  if (next === "codex" && attached) mainWindow.contentView.removeChildView(chatGptView);
  resizeChatGptView();
}

function createChatGptView(): WebContentsView {
  const view = new WebContentsView({
    webPreferences: {
      partition: "persist:chatgpt",
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedChatGptNavigation(url)) void view.webContents.loadURL(url);
    else if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });
  view.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedChatGptNavigation(url)) {
      event.preventDefault();
      if (url.startsWith("https://")) void shell.openExternal(url);
    }
  });
  view.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  view.webContents.session.setPermissionCheckHandler(() => false);
  view.webContents.session.on("will-download", (event) => event.preventDefault());
  void view.webContents.loadURL("https://chatgpt.com/");
  return view;
}

async function startCodex(): Promise<void> {
  if (appServer?.running) return;
  emitStatus({ state: "starting", detail: "Starting the official Codex app-server…" });
  const binary = resolveCodexBinary();
  try { await verifyCodexBinary(binary); }
  catch (error) { emitStatus({ state: "error", detail: (error as Error).message }); return; }
  const server = new CodexAppServer({
    binary,
    cwd: homedir(),
    version: app.getVersion(),
  });
  const nextRouter = new RpcRouter(server);
  let startupSecurityError: string | null = null;
  nextRouter.connectClient();
  nextRouter.on("clientMessage", (message) => mainWindow?.webContents.send("codex:message", message));
  server.on("stderr", (detail) => {
    const trimmed = detail.trim();
    if (/bubblewrap|needs access to create user namespaces/iu.test(trimmed)) startupSecurityError = "Codex’s Linux sandbox is unavailable. Install bubblewrap and load the distribution bwrap AppArmor profile; see README.md.";
    if (trimmed) console.warn(`[codex app-server] ${trimmed}`);
  });
  server.on("exit", (code, signal) => {
    emitStatus({ state: "error", detail: `Codex stopped (${code ?? signal ?? "unknown"})` });
  });
  appServer = server;
  router = nextRouter;
  try {
    await server.start();
    emitStatus(startupSecurityError ? { state: "error", detail: startupSecurityError } : { state: "ready" });
  } catch (error) {
    emitStatus({ state: "error", detail: (error as Error).message });
  }
}

async function restartCodex(): Promise<void> {
  router?.disconnectClient();
  router = null;
  const previous = appServer;
  appServer = null;
  await previous?.stop();
  await startCodex();
}

function trustedRenderer(event: Electron.IpcMainEvent | Electron.IpcMainInvokeEvent): void {
  assertTrustedIpcSender(event, mainWindow?.webContents);
}

function registerIpc(): void {
  ipcMain.handle("shell:set-mode", (event, next: AppMode) => {
    trustedRenderer(event);
    if (next !== "chatgpt" && next !== "codex") throw new Error("Invalid mode");
    showMode(next);
  });
  ipcMain.on("codex:rpc", (event, message: RpcMessage) => {
    try {
      trustedRenderer(event);
      router?.receiveFromClient(message);
    } catch (error) {
      console.warn(`[ipc] Rejected codex:rpc: ${(error as Error).message}`);
    }
  });
  ipcMain.handle("codex:get-status", (event) => { trustedRenderer(event); return status; });
  ipcMain.handle("codex:restart", async (event) => { trustedRenderer(event); await restartCodex(); });
  ipcMain.handle("dialog:directory", async (event) => {
    trustedRenderer(event);
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory", "createDirectory"] });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });
  ipcMain.handle("shell:open-external", async (event, url: string) => {
    trustedRenderer(event);
    if (!isOfficialOpenAiUrl(url)) throw new Error("Only official OpenAI sign-in links may be opened");
    await shell.openExternal(url);
  });
  ipcMain.handle("plugins:list", (event) => { trustedRenderer(event); return listPlugins(); });
  ipcMain.handle("plugins:install", (event, name: string) => { trustedRenderer(event); return installPlugin(name); });
  ipcMain.handle("plugins:remove", (event, name: string) => { trustedRenderer(event); return removePlugin(name); });
  ipcMain.handle("plugins:marketplaces", (event) => { trustedRenderer(event); return listMarketplaces(); });
  ipcMain.handle("plugins:add-marketplace", (event, source: string) => { trustedRenderer(event); return addMarketplace(source); });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#f5f5f0",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error(`[preload] ${preloadPath}: ${error.message}`);
  });
  mainWindow.webContents.on("did-fail-load", (_event, code, description, url) => {
    console.error(`[renderer-load] ${code} ${description}: ${url}`);
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== mainWindow?.webContents.getURL()) event.preventDefault();
  });
  chatGptView = createChatGptView();
  mainWindow.on("resize", resizeChatGptView);
  mainWindow.on("closed", () => {
    router?.disconnectClient();
    mainWindow = null;
    chatGptView = null;
  });
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) void mainWindow.loadURL(devUrl);
  else void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
}

app.enableSandbox();
Menu.setApplicationMenu(null);

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

app.on("web-contents-created", (_event, contents) => {
  contents.on("will-attach-webview", (event) => event.preventDefault());
});

app.whenReady().then(() => {
  if (!hasSingleInstanceLock) return;
  registerIpc();
  createWindow();
  void startCodex();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  router?.disconnectClient();
  void appServer?.stop();
});
