import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface BridgeConfig {
  host: "127.0.0.1" | "::1";
  port: number;
  codexBinary: string;
  token: string;
  tokenFile: string;
  allowedOrigins: ReadonlySet<string>;
}

const DEFAULT_PORT = 4317;

function parsePort(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("CODEX_BRIDGE_PORT must be an integer between 1 and 65535");
  }
  return port;
}

function parseHost(raw: string | undefined): "127.0.0.1" | "::1" {
  const host = raw ?? "127.0.0.1";
  if (host !== "127.0.0.1" && host !== "::1") {
    throw new Error("CODEX_BRIDGE_HOST must be a loopback address (127.0.0.1 or ::1)");
  }
  return host;
}

async function loadOrCreateToken(tokenFile: string): Promise<string> {
  const supplied = process.env.CODEX_BRIDGE_TOKEN?.trim();
  if (supplied) {
    if (supplied.length < 32) throw new Error("CODEX_BRIDGE_TOKEN must contain at least 32 characters");
    return supplied;
  }

  try {
    const stored = (await readFile(tokenFile, "utf8")).trim();
    if (stored.length >= 32) return stored;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }

  const token = randomBytes(32).toString("base64url");
  await mkdir(path.dirname(tokenFile), { recursive: true, mode: 0o700 });
  await writeFile(tokenFile, `${token}\n`, { mode: 0o600, flag: "wx" });
  return token;
}

export async function loadConfig(cwd = process.cwd()): Promise<BridgeConfig> {
  const host = parseHost(process.env.CODEX_BRIDGE_HOST);
  const port = parsePort(process.env.CODEX_BRIDGE_PORT);
  const tokenFile = path.resolve(cwd, process.env.CODEX_BRIDGE_TOKEN_FILE ?? ".runtime/bridge-token");
  const token = await loadOrCreateToken(tokenFile);
  const configuredOrigins = process.env.CODEX_ALLOWED_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const defaultOriginHost = host === "::1" ? "[::1]" : host;
  const allowedOrigins = new Set(configuredOrigins ?? [`http://${defaultOriginHost}:${port}`]);

  return {
    host,
    port,
    codexBinary: process.env.CODEX_BINARY?.trim() || "codex",
    token,
    tokenFile,
    allowedOrigins,
  };
}

export function codexChildEnvironment(source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const environment = { ...source };
  delete environment.OPENAI_API_KEY;
  delete environment.CODEX_ACCESS_TOKEN;
  return environment;
}
