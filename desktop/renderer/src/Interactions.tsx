import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { RpcRequest } from "../../../src/protocol.js";
import { rpc } from "./rpc.js";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function finish(request: RpcRequest, result: unknown, dismiss: (id: string | number) => void): void {
  rpc.respond({ id: request.id, result });
  dismiss(request.id);
}

function deny(request: RpcRequest, dismiss: (id: string | number) => void): void {
  if (request.method === "mcpServer/elicitation/request") {
    finish(request, { action: "decline", content: null, _meta: null }, dismiss);
    return;
  }
  rpc.respond({ id: request.id, error: { code: -32000, message: "The user denied this request" } });
  dismiss(request.id);
}

function StandardApproval({ request, dismiss }: { request: RpcRequest; dismiss(id: string | number): void }): ReactNode {
  const legacy = request.method === "applyPatchApproval" || request.method === "execCommandApproval";
  function answer(allow: boolean): void {
    finish(request, { decision: legacy ? allow ? "approved" : "denied" : allow ? "accept" : "decline" }, dismiss);
  }
  return <section className="approval">
    <div><span className="approval-icon">!</span><div><strong>Approval required</strong><p>{request.method.replaceAll("/", " · ")}</p></div></div>
    <pre>{JSON.stringify(request.params, null, 2)}</pre>
    <footer><button className="secondary" onClick={() => answer(false)}>Deny</button><button className="primary" onClick={() => answer(true)}>Allow once</button></footer>
  </section>;
}

function PermissionApproval({ request, dismiss }: { request: RpcRequest; dismiss(id: string | number): void }): ReactNode {
  const params = record(request.params);
  const requested = record(params.permissions);
  const granted: Record<string, unknown> = {};
  if (requested.network && typeof requested.network === "object") granted.network = requested.network;
  if (requested.fileSystem && typeof requested.fileSystem === "object") granted.fileSystem = requested.fileSystem;
  return <section className="approval">
    <div><span className="approval-icon">!</span><div><strong>Additional permissions requested</strong><p>{typeof params.reason === "string" ? params.reason : "Codex requested access beyond the current sandbox."}</p></div></div>
    <pre>{JSON.stringify(requested, null, 2)}</pre>
    <footer><button className="secondary" onClick={() => deny(request, dismiss)}>Deny</button><button className="primary" onClick={() => finish(request, { permissions: granted, scope: "turn", strictAutoReview: true }, dismiss)}>Allow for this turn</button></footer>
  </section>;
}

function UserInput({ request, dismiss }: { request: RpcRequest; dismiss(id: string | number): void }): ReactNode {
  const questions = Array.isArray(record(request.params).questions) ? record(request.params).questions as unknown[] : [];
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const normalized = useMemo(() => questions.map((raw) => {
    const question = record(raw);
    const id = typeof question.id === "string" ? question.id : "";
    return {
      id,
      header: typeof question.header === "string" ? question.header : "Question",
      prompt: typeof question.question === "string" ? question.question : "Provide a response",
      secret: question.isSecret === true,
      options: Array.isArray(question.options) ? question.options.map(record).filter((option) => typeof option.label === "string") : [],
    };
  }).filter((question) => question.id), [questions]);
  const complete = normalized.length > 0 && normalized.every((question) => Boolean(answers[question.id]?.trim()));
  function submit(): void {
    const response = Object.fromEntries(normalized.map((question) => [question.id, { answers: [answers[question.id]!.trim()] }]));
    finish(request, { answers: response }, dismiss);
  }
  return <section className="approval interaction-form">
    <div><span className="approval-icon">?</span><div><strong>Codex needs input</strong><p>Review each question before continuing.</p></div></div>
    {normalized.map((question) => <label key={question.id}><strong>{question.header}</strong><span>{question.prompt}</span>{question.options.length
      ? <select value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}><option value="">Select…</option>{question.options.map((option) => <option key={String(option.label)} value={String(option.label)}>{String(option.label)}{typeof option.description === "string" ? ` — ${option.description}` : ""}</option>)}</select>
      : <input type={question.secret ? "password" : "text"} autoComplete="off" value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} />}</label>)}
    <footer><button className="secondary" onClick={() => deny(request, dismiss)}>Cancel</button><button className="primary" disabled={!complete} onClick={submit}>Continue</button></footer>
  </section>;
}

function McpElicitation({ request, dismiss }: { request: RpcRequest; dismiss(id: string | number): void }): ReactNode {
  const params = record(request.params);
  const mode = params.mode;
  const [content, setContent] = useState("{}");
  const [error, setError] = useState("");
  function accept(): void {
    try {
      const parsed: unknown = JSON.parse(content);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Enter a JSON object");
      finish(request, { action: "accept", content: parsed, _meta: null }, dismiss);
    } catch (cause) { setError((cause as Error).message); }
  }
  return <section className="approval interaction-form">
    <div><span className="approval-icon">?</span><div><strong>{typeof params.serverName === "string" ? params.serverName : "MCP server"} requests information</strong><p>{typeof params.message === "string" ? params.message : "Review this request carefully."}</p></div></div>
    {mode === "url" ? <p className="error">URL-mode MCP elicitation is not enabled in this client. Open the service through a trusted browser and retry.</p> : <><label><strong>Structured response</strong><span>Enter a JSON object matching the requested schema.</span><textarea rows={6} value={content} onChange={(event) => setContent(event.target.value)} /></label>{error && <p className="error">{error}</p>}<pre>{JSON.stringify(params.requestedSchema, null, 2)}</pre></>}
    <footer><button className="secondary" onClick={() => deny(request, dismiss)}>Decline</button>{mode !== "url" && <button className="primary" onClick={accept}>Submit</button>}</footer>
  </section>;
}

export function InteractionStack({ requests, dismiss }: { requests: RpcRequest[]; dismiss(id: string | number): void }): ReactNode {
  if (!requests.length) return null;
  return <div className="approval-stack">{requests.map((request) => {
    if (["item/commandExecution/requestApproval", "item/fileChange/requestApproval", "applyPatchApproval", "execCommandApproval"].includes(request.method)) return <StandardApproval key={String(request.id)} request={request} dismiss={dismiss} />;
    if (request.method === "item/permissions/requestApproval") return <PermissionApproval key={String(request.id)} request={request} dismiss={dismiss} />;
    if (request.method === "item/tool/requestUserInput") return <UserInput key={String(request.id)} request={request} dismiss={dismiss} />;
    if (request.method === "mcpServer/elicitation/request") return <McpElicitation key={String(request.id)} request={request} dismiss={dismiss} />;
    return <section className="approval" key={String(request.id)}><div><span className="approval-icon">!</span><div><strong>Unsupported client capability</strong><p>{request.method}</p></div></div><pre>{JSON.stringify(request.params, null, 2)}</pre><footer><button className="secondary" onClick={() => deny(request, dismiss)}>Deny safely</button></footer></section>;
  })}</div>;
}
