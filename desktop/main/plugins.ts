import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { codexChildEnvironment } from "../../src/config.js";
import type { PluginRecord } from "../shared/types.js";
import { resolveCodexBinary } from "./codex-binary.js";

const execFileAsync = promisify(execFile);
const SAFE_PLUGIN_NAME = /^@?[a-zA-Z0-9][a-zA-Z0-9._/@-]{0,159}$/;

export function assertPluginName(name: string): string {
  const value = name.trim();
  if (!SAFE_PLUGIN_NAME.test(value)) throw new Error("Invalid plugin name");
  return value;
}

export function assertMarketplaceSource(source: string): string {
  const value = source.trim();
  if (!value || value.length > 500 || /[\0\r\n]/u.test(value)) {
    throw new Error("Invalid marketplace source");
  }
  return value;
}

async function codexPlugin(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(resolveCodexBinary(), ["plugin", ...args], {
    env: codexChildEnvironment(),
    timeout: 30_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  return stdout;
}

export function normalizePlugins(value: unknown): PluginRecord[] {
  const result = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const rows = Array.isArray(value)
    ? value
    : Array.isArray(result.plugins)
      ? result.plugins
      : [
          ...(Array.isArray(result.installed) ? result.installed : []),
          ...(Array.isArray(result.available) ? result.available : []),
        ];
  return rows.flatMap((row): PluginRecord[] => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    const name = typeof item.pluginId === "string" ? item.pluginId : typeof item.name === "string" ? item.name : typeof item.id === "string" ? item.id : null;
    if (!name) return [];
    return [{
      name,
      ...(typeof item.description === "string" ? { description: item.description } : {}),
      installed: Boolean(item.installed ?? item.isInstalled),
      ...(typeof item.enabled === "boolean" ? { enabled: item.enabled } : {}),
      ...(typeof item.marketplaceName === "string" ? { source: item.marketplaceName } : typeof item.source === "string" ? { source: item.source } : {}),
      ...(typeof item.version === "string" ? { version: item.version } : {}),
    }];
  });
}

export async function listPlugins(): Promise<PluginRecord[]> {
  const output = await codexPlugin(["list", "--available", "--json"]);
  return normalizePlugins(JSON.parse(output));
}

export async function installPlugin(name: string): Promise<void> {
  await codexPlugin(["add", assertPluginName(name)]);
}

export async function removePlugin(name: string): Promise<void> {
  await codexPlugin(["remove", assertPluginName(name)]);
}

export async function listMarketplaces(): Promise<unknown> {
  const output = await codexPlugin(["marketplace", "list", "--json"]);
  return JSON.parse(output);
}

export async function addMarketplace(source: string): Promise<void> {
  await codexPlugin(["marketplace", "add", assertMarketplaceSource(source)]);
}
