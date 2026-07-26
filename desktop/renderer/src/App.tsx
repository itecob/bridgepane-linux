import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { RpcMessage } from "../../../src/protocol.js";
import type { AppMode, BridgeStatus, PluginRecord } from "../../shared/types.js";
import { dismissApproval, initialCodexState, normalizeThread, reduceRpc, threadsFromResponse, type CodexState, type TimelineEntry } from "./model.js";
import { rpc } from "./rpc.js";
import { InteractionStack } from "./Interactions.js";

type Account = { type?: string; email?: string; planType?: string } | null;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function Logo({ small = false }: { small?: boolean }): ReactNode {
  return <span className={small ? "logo small" : "logo"} aria-hidden="true">⌘</span>;
}

export function Header({ mode, setMode, openPlugins }: { mode: AppMode; setMode(mode: AppMode): void; openPlugins(): void }): ReactNode {
  return <header className="titlebar">
    <div className="brand"><Logo /><span>BridgePane</span></div>
    <nav className="mode-switch" aria-label="Application mode">
      <button className={mode === "chatgpt" ? "active" : ""} onClick={() => setMode("chatgpt")}>ChatGPT</button>
      <button className={mode === "codex" ? "active" : ""} onClick={() => setMode("codex")}>Codex</button>
    </nav>
    <button className="icon-button plugin-button" onClick={openPlugins} title="Codex plugins" aria-label="Codex plugins">✦</button>
  </header>;
}

function SignIn({ onSignedIn }: { onSignedIn(account: Account): void }): ReactNode {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login(type: "chatgpt" | "chatgptDeviceCode"): Promise<void> {
    setBusy(true); setError("");
    try {
      const result = asRecord(await rpc.request("account/login/start", { type }));
      const url = result.authUrl ?? result.verificationUrl ?? result.verificationUri;
      if (typeof url === "string") await window.codexDesktop.openExternal(url);
      if (type === "chatgptDeviceCode") {
        const code = result.userCode;
        if (typeof code === "string") await navigator.clipboard.writeText(code);
      }
      window.setTimeout(async () => {
        try {
          const read = asRecord(await rpc.request("account/read", {}));
          onSignedIn((asRecord(read.account) as Account) ?? null);
        } catch { /* completion notification will retry */ }
      }, 1500);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  return <main className="signin-screen">
    <div className="signin-card">
      <Logo />
      <p className="eyebrow">CODEX</p>
      <h1>Build with your ChatGPT account</h1>
      <p>Use the official Codex app-server with your existing ChatGPT plan. API keys are disabled in this application.</p>
      <button className="primary wide" disabled={busy} onClick={() => void login("chatgpt")}>{busy ? "Opening sign in…" : "Continue with ChatGPT"}</button>
      <button className="secondary wide" disabled={busy} onClick={() => void login("chatgptDeviceCode")}>Use a device code</button>
      {error && <p className="error">{error}</p>}
      <small>Authentication is handled by the installed Codex CLI. This app never receives your password.</small>
    </div>
  </main>;
}

function Sidebar({ state, cwd, account, onDirectory, onNew, onSelect }: {
  state: CodexState; cwd: string; account: Account; onDirectory(): void; onNew(): void; onSelect(id: string): void;
}): ReactNode {
  return <aside className="sidebar">
    <button className="new-thread" onClick={onNew}><span>＋</span> New task</button>
    <button className="project-picker" onClick={onDirectory} title={cwd}>
      <span className="folder">◇</span><span><small>PROJECT</small><strong>{cwd.split("/").filter(Boolean).at(-1) || "Choose project"}</strong></span><span>⌄</span>
    </button>
    <div className="history-label">RECENT</div>
    <div className="thread-list">
      {state.threads.map((thread) => <button key={thread.id} className={state.activeThreadId === thread.id ? "thread active" : "thread"} onClick={() => onSelect(thread.id)}>
        <strong>{thread.name}</strong><span>{thread.preview || thread.cwd || "Codex conversation"}</span>
      </button>)}
      {!state.threads.length && <p className="empty-history">Your Codex conversations will appear here.</p>}
    </div>
    <div className="account-chip"><span className="avatar">{account?.email?.[0]?.toUpperCase() ?? "C"}</span><span><strong>{account?.email ?? "ChatGPT account"}</strong><small>{account?.planType ?? "OAuth connected"}</small></span></div>
  </aside>;
}

function TimelineCard({ entry }: { entry: TimelineEntry }): ReactNode {
  if (entry.kind === "user") return <article className="message user"><div>{entry.body}</div></article>;
  if (entry.kind === "assistant") return <article className="message assistant"><div className="assistant-mark"><Logo small /></div><div className="prose">{entry.body || <span className="pulse">Thinking…</span>}</div></article>;
  return <article className={`activity ${entry.kind}`}>
    <header><span>{entry.kind === "command" ? "›_" : entry.kind === "change" ? "±" : entry.kind === "plan" ? "☷" : "·"}</span><strong>{entry.title ?? entry.kind}</strong>{entry.status && <small>{entry.status}</small>}</header>
    {entry.body && <pre>{entry.body}</pre>}
  </article>;
}

function Composer({ disabled, running, onSend, onStop }: { disabled: boolean; running: boolean; onSend(text: string): void; onStop(): void }): ReactNode {
  const [value, setValue] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  function submit(event: FormEvent): void {
    event.preventDefault();
    const prompt = value.trim();
    if (!prompt || disabled || running) return;
    setValue(""); onSend(prompt);
  }
  return <form className="composer" onSubmit={submit}>
    <textarea ref={input} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => {
      if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
    }} placeholder="Ask Codex to build, explain, or review…" rows={2} disabled={disabled} />
    <div className="composer-footer"><span>Workspace write · approvals on request</span>{running
      ? <button type="button" className="stop" onClick={onStop} aria-label="Stop turn">■</button>
      : <button type="submit" className="send" disabled={disabled || !value.trim()} aria-label="Send">↑</button>}
    </div>
  </form>;
}


function PluginManager({ close }: { close(): void }): ReactNode {
  const [plugins, setPlugins] = useState<PluginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { setPlugins(await window.codexDesktop.plugins.list()); }
    catch (cause) { setError((cause as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  async function toggle(plugin: PluginRecord): Promise<void> {
    setError("");
    try {
      if (plugin.installed) await window.codexDesktop.plugins.remove(plugin.name);
      else await window.codexDesktop.plugins.install(plugin.name);
      await refresh();
    } catch (cause) { setError((cause as Error).message); }
  }
  const shown = plugins.filter((plugin) => `${plugin.name} ${plugin.description ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <section className="plugin-modal">
      <header><div><p className="eyebrow">CODEX EXTENSIONS</p><h2>Plugins</h2></div><button className="icon-button" onClick={close}>×</button></header>
      <p className="plugin-note">Plugins can add skills, apps, and tool connections to Codex. Review a plugin before installing it. Start a new conversation after changes.</p>
      <input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search available plugins…" />
      {loading && <p className="muted">Loading from the Codex plugin registry…</p>}
      {error && <p className="error">{error}</p>}
      <div className="plugin-list">{shown.map((plugin) => <article key={plugin.name}>
        <div className="plugin-glyph">✦</div><div><strong>{plugin.name}</strong><p>{plugin.description ?? plugin.source ?? "Codex plugin"}</p></div>
        <button className={plugin.installed ? "secondary" : "primary"} onClick={() => void toggle(plugin)}>{plugin.installed ? "Remove" : "Install"}</button>
      </article>)}</div>
      {!loading && !shown.length && !error && <p className="muted centered">No plugins match your search.</p>}
    </section>
  </div>;
}

function itemsFromThread(value: unknown): TimelineEntry[] {
  const thread = asRecord(value);
  const turns = Array.isArray(thread.turns) ? thread.turns : [];
  const entries: TimelineEntry[] = [];
  for (const turnRaw of turns) {
    const turn = asRecord(turnRaw);
    const items = Array.isArray(turn.items) ? turn.items : [];
    for (const itemRaw of items) {
      const item = asRecord(itemRaw);
      const type = String(item.type ?? "notice");
      const body = typeof item.text === "string" ? item.text : Array.isArray(item.content) ? item.content.map((part) => String(asRecord(part).text ?? "")).join("\n") : JSON.stringify(item, null, 2);
      const kind: TimelineEntry["kind"] = type === "userMessage" ? "user" : type === "agentMessage" ? "assistant" : type.toLowerCase().includes("command") ? "command" : type.toLowerCase().includes("filechange") ? "change" : type.toLowerCase().includes("reason") ? "reasoning" : "notice";
      entries.push({
        key: String(item.id ?? `${type}:${entries.length}`),
        kind,
        ...(kind === "notice" ? { title: type } : {}),
        body,
      });
    }
  }
  return entries;
}

export default function App(): ReactNode {
  const [mode, setModeState] = useState<AppMode>("codex");
  const [bridge, setBridge] = useState<BridgeStatus>({ state: "starting" });
  const [account, setAccount] = useState<Account>(null);
  const [accountChecked, setAccountChecked] = useState(false);
  const [state, setState] = useState(initialCodexState);
  const [cwd, setCwd] = useState("");
  const [pluginsOpen, setPluginsOpen] = useState(false);
  const [error, setError] = useState("");

  const loadAccount = useCallback(async () => {
    try {
      const response = asRecord(await rpc.request("account/read", {}));
      setAccount((response.account as Account) ?? null);
    } catch (cause) { setError((cause as Error).message); }
    finally { setAccountChecked(true); }
  }, []);

  const loadThreads = useCallback(async () => {
    try {
      const response = await rpc.request("thread/list", { limit: 50, archived: false });
      setState((current) => ({ ...current, threads: threadsFromResponse(response) }));
    } catch (cause) { setError((cause as Error).message); }
  }, []);

  useEffect(() => window.codexDesktop.onStatus(setBridge), []);
  useEffect(() => rpc.subscribe((message: RpcMessage) => {
    setState((current) => reduceRpc(current, message));
    if ("method" in message && message.method === "account/login/completed") void loadAccount();
  }), [loadAccount]);
  useEffect(() => {
    if (bridge.state === "ready") { void loadAccount(); void loadThreads(); }
  }, [bridge.state, loadAccount, loadThreads]);

  async function setMode(next: AppMode): Promise<void> {
    setModeState(next); await window.codexDesktop.setMode(next);
  }
  async function chooseDirectory(): Promise<void> {
    const selected = await window.codexDesktop.chooseDirectory();
    if (selected) setCwd(selected);
  }
  async function newThread(): Promise<void> {
    if (!cwd) { await chooseDirectory(); return; }
    setError("");
    try {
      const response = asRecord(await rpc.request("thread/start", { cwd, approvalPolicy: "on-request", sandbox: "workspace-write" }));
      const thread = normalizeThread(response.thread);
      setState((current) => thread ? { ...current, activeThreadId: thread.id, threads: [thread, ...current.threads.filter((row) => row.id !== thread.id)], timeline: [] } : current);
    } catch (cause) { setError((cause as Error).message); }
  }
  async function selectThread(id: string): Promise<void> {
    setError("");
    try {
      const response = asRecord(await rpc.request("thread/resume", { threadId: id }));
      const thread = asRecord(response.thread);
      setState((current) => ({ ...current, activeThreadId: id, timeline: itemsFromThread(thread), runningTurnId: null }));
      if (typeof thread.cwd === "string") setCwd(thread.cwd);
    } catch (cause) { setError((cause as Error).message); }
  }
  async function send(prompt: string): Promise<void> {
    if (!cwd) { setError("Choose a project folder before starting a Codex task."); return; }
    let threadId = state.activeThreadId;
    if (!threadId) {
      const response = asRecord(await rpc.request("thread/start", { cwd, approvalPolicy: "on-request", sandbox: "workspace-write" }));
      const thread = normalizeThread(response.thread);
      if (!thread) throw new Error("Codex did not return a thread");
      threadId = thread.id;
      setState((current) => ({ ...current, activeThreadId: thread.id, threads: [thread, ...current.threads] }));
    }
    setState((current) => ({ ...current, timeline: [...current.timeline, { key: `local:${Date.now()}`, kind: "user", body: prompt }] }));
    try { await rpc.request("turn/start", { threadId, input: [{ type: "text", text: prompt, text_elements: [] }] }); }
    catch (cause) { setError((cause as Error).message); }
  }
  async function stop(): Promise<void> {
    if (!state.activeThreadId || !state.runningTurnId) return;
    try { await rpc.request("turn/interrupt", { threadId: state.activeThreadId, turnId: state.runningTurnId }); }
    catch (cause) { setError((cause as Error).message); }
  }

  const activeName = useMemo(() => state.threads.find((thread) => thread.id === state.activeThreadId)?.name, [state.activeThreadId, state.threads]);
  const signedIn = account !== null;

  return <div className="app-shell">
    <Header mode={mode} setMode={(next) => void setMode(next)} openPlugins={() => setPluginsOpen(true)} />
    <div className={mode === "codex" ? "codex-view" : "codex-view hidden"}>
      {bridge.state !== "ready" ? <main className="status-screen"><Logo /><h1>{bridge.state === "error" ? "Codex needs attention" : "Starting Codex…"}</h1><p>{bridge.detail}</p>{bridge.state === "error" && <button className="primary" onClick={() => void window.codexDesktop.restartCodex()}>Restart Codex</button>}</main>
      : !accountChecked ? <main className="status-screen"><span className="spinner" /><p>Checking your ChatGPT account…</p></main>
      : !signedIn ? <SignIn onSignedIn={setAccount} />
      : <>
        <Sidebar state={state} cwd={cwd} account={account} onDirectory={() => void chooseDirectory()} onNew={() => void newThread()} onSelect={(id) => void selectThread(id)} />
        <main className="workspace">
          <div className="workspace-title"><div><span className="status-dot" />{activeName ?? "New task"}</div><small>{cwd || "Select a project folder"}</small></div>
          <div className={state.timeline.length ? "timeline" : "welcome"}>
            {!state.timeline.length && <div className="welcome-inner"><Logo /><h1>What are we building?</h1><p>Codex can inspect your project, edit files, run commands, and explain the result.</p><div className="suggestions">
              {["Explain this codebase", "Find and fix a bug", "Build a new feature", "Review my changes"].map((label) => <button key={label} onClick={() => cwd ? void send(label) : void chooseDirectory()}>{label}<span>↗</span></button>)}
            </div></div>}
            {state.timeline.map((entry) => <TimelineCard key={entry.key} entry={entry} />)}
          </div>
          {error && <button className="error-banner" onClick={() => setError("")}>{error}<span>×</span></button>}
          <InteractionStack requests={state.approvals} dismiss={(id) => setState((current) => dismissApproval(current, id))} />
          <Composer disabled={bridge.state !== "ready" || !cwd} running={state.runningTurnId !== null} onSend={(prompt) => void send(prompt)} onStop={() => void stop()} />
        </main>
      </>}
    </div>
    {pluginsOpen && <PluginManager close={() => setPluginsOpen(false)} />}
  </div>;
}
