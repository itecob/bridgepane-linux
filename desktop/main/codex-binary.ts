import { execFile } from "node:child_process";
import { accessSync, constants, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";
import { codexChildEnvironment } from "../../src/config.js";

const execFileAsync = promisify(execFile);
export const MINIMUM_CODEX_VERSION = "0.145.0";

function executable(path: string): boolean {
  try { accessSync(path, constants.X_OK); return true; }
  catch { return false; }
}

export function resolveCodexBinary(): string {
  const configured = process.env.CODEX_BINARY?.trim();
  if (configured) return configured;
  const candidates = (process.env.PATH ?? "").split(delimiter).filter(Boolean).map((directory) => join(directory, "codex"));
  const home = homedir();
  candidates.push(join(home, ".local", "bin", "codex"), join(home, ".npm-global", "bin", "codex"));
  const nodeVersions = join(home, ".nvm", "versions", "node");
  try {
    for (const version of readdirSync(nodeVersions).sort().reverse()) candidates.push(join(nodeVersions, version, "bin", "codex"));
  } catch { /* NVM is optional. */ }
  return candidates.find(executable) ?? "codex";
}

export function compareVersions(left: string, right: string): number {
  const parse = (value: string): number[] => value.split(".").map((part) => Number.parseInt(part, 10));
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

export async function verifyCodexBinary(binary: string): Promise<string> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(binary, ["--version"], {
      env: codexChildEnvironment(),
      timeout: 10_000,
      maxBuffer: 64 * 1024,
    }));
  } catch (error) {
    throw new Error(`Unable to run the official Codex CLI at ${binary}: ${(error as Error).message}`);
  }
  const match = stdout.match(/(?:codex-cli\s+)?(\d+\.\d+\.\d+)/u);
  if (!match?.[1]) throw new Error(`Unrecognized Codex CLI version output: ${stdout.trim()}`);
  if (compareVersions(match[1], MINIMUM_CODEX_VERSION) < 0) {
    throw new Error(`Codex CLI ${match[1]} is unsupported. Install ${MINIMUM_CODEX_VERSION} or newer.`);
  }
  return match[1];
}
