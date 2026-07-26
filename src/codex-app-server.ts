import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import { codexChildEnvironment } from "./config.js";
import {
  hasId,
  hasMethod,
  isResponse,
  parseRpcMessage,
  type RequestId,
  type RpcMessage,
  type RpcNotification,
  type RpcRequest,
  type RpcResponse,
} from "./protocol.js";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: NodeJS.Timeout;
}

export interface CodexAppServerOptions { binary: string; cwd: string; version?: string; }
export interface CodexAppServerEvents {
  notification: [RpcNotification];
  request: [RpcRequest];
  response: [RpcResponse];
  stderr: [string];
  exit: [number | null, NodeJS.Signals | null];
}

const MAX_JSONL_BYTES = 16 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 60_000;

export class CodexAppServer extends EventEmitter<CodexAppServerEvents> {
  readonly options: CodexAppServerOptions;
  #child: ChildProcessWithoutNullStreams | null = null;
  #nextId = 1;
  #pending = new Map<RequestId, PendingRequest>();
  #initialized = false;
  #stopping = false;
  #stdoutBuffer = "";

  constructor(options: CodexAppServerOptions) { super(); this.options = options; }
  get initialized(): boolean { return this.#initialized; }
  get running(): boolean { return this.#child !== null && this.#child.exitCode === null; }

  async start(): Promise<unknown> {
    if (this.#child) throw new Error("Codex app-server is already started");
    this.#stopping = false;
    this.#stdoutBuffer = "";
    const child = spawn(
      this.options.binary,
      ["-c", 'forced_login_method="chatgpt"', "app-server", "--listen", "stdio://"],
      {
        cwd: this.options.cwd,
        env: codexChildEnvironment(),
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    this.#child = child;
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => this.#onStdout(chunk));
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => this.emit("stderr", chunk));
    child.once("error", (error) => this.#failAll(error));
    child.once("exit", (code, signal) => {
      this.#initialized = false;
      this.#child = null;
      this.#stdoutBuffer = "";
      this.#failAll(new Error(`Codex app-server exited (${code ?? signal ?? "unknown"})`));
      if (!this.#stopping) this.emit("exit", code, signal);
    });

    const result = await this.request("initialize", {
      clientInfo: {
        name: "bridgepane-linux",
        title: "BridgePane",
        version: this.options.version ?? "0.2.0",
      },
      capabilities: {
        experimentalApi: false,
        requestAttestation: false,
        mcpServerOpenaiFormElicitation: false,
        optOutNotificationMethods: null,
      },
    });
    this.notify("initialized");
    this.#initialized = true;
    return result;
  }

  request(method: string, params?: unknown, timeoutMs = REQUEST_TIMEOUT_MS): Promise<unknown> {
    const id = `bridge-internal:${this.#nextId++}`;
    const message: RpcRequest = params === undefined ? { id, method } : { id, method, params };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`Codex app-server request timed out: ${method}`));
      }, timeoutMs);
      timer.unref();
      this.#pending.set(id, { resolve, reject, timer });
      try { this.send(message); }
      catch (error) {
        clearTimeout(timer);
        this.#pending.delete(id);
        reject(error);
      }
    });
  }

  notify(method: string, params?: unknown): void {
    this.send(params === undefined ? { method } : { method, params });
  }

  send(message: RpcMessage): void {
    if (!this.#child?.stdin.writable) throw new Error("Codex app-server is not running");
    const line = `${JSON.stringify(message)}\n`;
    if (Buffer.byteLength(line) > MAX_JSONL_BYTES) throw new Error("Codex app-server message exceeds the safety limit");
    this.#child.stdin.write(line);
  }

  async stop(): Promise<void> {
    const child = this.#child;
    if (!child) return;
    this.#stopping = true;
    this.#initialized = false;
    child.stdin.end();
    await new Promise<void>((resolve) => {
      const terminate = setTimeout(() => child.kill("SIGTERM"), 1_500);
      const kill = setTimeout(() => child.kill("SIGKILL"), 4_000);
      const finish = (): void => {
        clearTimeout(terminate);
        clearTimeout(kill);
        resolve();
      };
      terminate.unref();
      kill.unref();
      child.once("exit", finish);
      child.once("close", finish);
    });
  }

  #onStdout(chunk: string): void {
    this.#stdoutBuffer += chunk;
    if (Buffer.byteLength(this.#stdoutBuffer) > MAX_JSONL_BYTES && !this.#stdoutBuffer.includes("\n")) {
      const error = new Error("Codex app-server JSONL record exceeds the safety limit");
      this.#failAll(error);
      this.emit("stderr", `${error.message}\n`);
      this.#child?.kill("SIGTERM");
      return;
    }
    for (;;) {
      const newline = this.#stdoutBuffer.indexOf("\n");
      if (newline < 0) break;
      const line = this.#stdoutBuffer.slice(0, newline).replace(/\r$/u, "");
      this.#stdoutBuffer = this.#stdoutBuffer.slice(newline + 1);
      if (Buffer.byteLength(line) > MAX_JSONL_BYTES) {
        this.emit("stderr", "Ignoring oversized app-server JSONL record\n");
      } else if (line) {
        this.#onLine(line);
      }
    }
  }

  #onLine(line: string): void {
    let message: RpcMessage;
    try { message = parseRpcMessage(line); }
    catch (error) {
      this.emit("stderr", `Ignoring invalid app-server JSONL: ${(error as Error).message}\n`);
      return;
    }
    if (isResponse(message)) {
      const pending = this.#pending.get(message.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.#pending.delete(message.id);
        if ("error" in message) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      this.emit("response", message);
    } else if (hasMethod(message) && hasId(message)) this.emit("request", message);
    else if (hasMethod(message)) this.emit("notification", message);
  }

  #failAll(error: Error): void {
    for (const pending of this.#pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.#pending.clear();
  }
}
