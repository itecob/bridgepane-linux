import type { RpcMessage, RpcRequest } from "../../../src/protocol.js";

export interface ThreadSummary {
  id: string;
  name: string;
  preview: string;
  cwd?: string;
  updatedAt?: number;
}

export interface TimelineEntry {
  key: string;
  kind: "user" | "assistant" | "reasoning" | "command" | "change" | "plan" | "notice";
  title?: string;
  body: string;
  status?: string;
}

export interface CodexState {
  threads: ThreadSummary[];
  activeThreadId: string | null;
  timeline: TimelineEntry[];
  approvals: RpcRequest[];
  runningTurnId: string | null;
}

export const initialCodexState: CodexState = {
  threads: [],
  activeThreadId: null,
  timeline: [],
  approvals: [],
  runningTurnId: null,
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join("\n");
  const item = record(value);
  for (const key of ["text", "content", "message", "output", "delta", "patch", "diff"]) {
    if (item[key] !== undefined) {
      const result = text(item[key]);
      if (result) return result;
    }
  }
  return Object.keys(item).length ? JSON.stringify(item, null, 2) : "";
}

export function normalizeThread(value: unknown): ThreadSummary | null {
  const item = record(value);
  if (typeof item.id !== "string") return null;
  const preview = text(item.preview ?? item.firstUserMessage ?? item.name ?? "New conversation");
  return {
    id: item.id,
    name: typeof item.name === "string" && item.name ? item.name : preview.slice(0, 52) || "New conversation",
    preview,
    ...(typeof item.cwd === "string" ? { cwd: item.cwd } : {}),
    ...(typeof item.updatedAt === "number" ? { updatedAt: item.updatedAt } : {}),
  };
}

export function threadsFromResponse(value: unknown): ThreadSummary[] {
  const response = record(value);
  const rows = Array.isArray(response.data) ? response.data : Array.isArray(response.threads) ? response.threads : [];
  return rows.map(normalizeThread).filter((item): item is ThreadSummary => item !== null);
}

function entryForItem(raw: unknown, phase: "started" | "completed"): TimelineEntry | null {
  const item = record(raw);
  const type = typeof item.type === "string" ? item.type : "notice";
  const id = String(item.id ?? `${type}:${Date.now()}`);
  if (type === "userMessage") return { key: id, kind: "user", body: text(item.content) };
  if (type === "agentMessage") return { key: id, kind: "assistant", body: text(item.text ?? item.content), status: phase };
  if (type.toLowerCase().includes("reasoning")) return { key: id, kind: "reasoning", title: "Reasoning", body: text(item.summary ?? item.content), status: phase };
  if (type.toLowerCase().includes("command")) return { key: id, kind: "command", title: text(item.command) || "Command", body: text(item.aggregatedOutput ?? item.output), status: String(item.status ?? phase) };
  if (type.toLowerCase().includes("filechange")) return { key: id, kind: "change", title: "File changes", body: text(item.changes ?? item.patch), status: String(item.status ?? phase) };
  if (type.toLowerCase().includes("plan")) return { key: id, kind: "plan", title: "Plan", body: text(item), status: phase };
  return { key: id, kind: "notice", title: type, body: text(item), status: phase };
}

function upsert(entries: TimelineEntry[], next: TimelineEntry): TimelineEntry[] {
  const index = entries.findIndex((entry) => entry.key === next.key);
  if (index < 0) return [...entries, next];
  return entries.map((entry, cursor) => cursor === index ? { ...entry, ...next, body: next.body || entry.body } : entry);
}

function appendDelta(entries: TimelineEntry[], key: string, kind: TimelineEntry["kind"], delta: string): TimelineEntry[] {
  const current = entries.find((entry) => entry.key === key);
  return upsert(entries, current ? { ...current, body: current.body + delta } : { key, kind, body: delta, status: "streaming" });
}

export function reduceRpc(state: CodexState, message: RpcMessage): CodexState {
  if (!("method" in message)) return state;
  if ("id" in message) return { ...state, approvals: [...state.approvals, message] };
  const params = record(message.params);
  if (message.method === "thread/started") {
    const thread = normalizeThread(params.thread);
    return thread ? { ...state, activeThreadId: thread.id, threads: [thread, ...state.threads.filter((row) => row.id !== thread.id)] } : state;
  }
  if (message.method === "turn/started") {
    const turn = record(params.turn);
    return { ...state, runningTurnId: typeof turn.id === "string" ? turn.id : "running" };
  }
  if (message.method === "turn/completed") return { ...state, runningTurnId: null };
  if (message.method === "item/started" || message.method === "item/completed") {
    const entry = entryForItem(params.item, message.method === "item/started" ? "started" : "completed");
    return entry ? { ...state, timeline: upsert(state.timeline, entry) } : state;
  }
  if (message.method === "item/agentMessage/delta") {
    return { ...state, timeline: appendDelta(state.timeline, String(params.itemId ?? "agent-stream"), "assistant", text(params.delta)) };
  }
  if (message.method.includes("reasoning") && message.method.endsWith("Delta")) {
    return { ...state, timeline: appendDelta(state.timeline, String(params.itemId ?? "reasoning-stream"), "reasoning", text(params.delta)) };
  }
  if (message.method.includes("outputDelta")) {
    return { ...state, timeline: appendDelta(state.timeline, String(params.itemId ?? "output-stream"), "command", text(params.delta)) };
  }
  if (message.method === "turn/diff/updated") {
    return { ...state, timeline: upsert(state.timeline, { key: `diff:${String(params.turnId ?? "active")}`, kind: "change", title: "Working diff", body: text(params.diff) }) };
  }
  if (message.method === "turn/plan/updated") {
    return { ...state, timeline: upsert(state.timeline, { key: `plan:${String(params.turnId ?? "active")}`, kind: "plan", title: "Plan", body: text(params.plan) }) };
  }
  if (message.method === "error" || message.method === "warning") {
    return { ...state, timeline: [...state.timeline, { key: `${message.method}:${Date.now()}`, kind: "notice", title: message.method, body: text(params) }] };
  }
  return state;
}

export function dismissApproval(state: CodexState, id: string | number): CodexState {
  return { ...state, approvals: state.approvals.filter((approval) => approval.id !== id) };
}
