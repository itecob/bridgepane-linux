import type { IpcMainInvokeEvent, WebContents } from "electron";

const OPENAI_HOSTS = ["chatgpt.com", "openai.com"] as const;
const IDENTITY_PROVIDER_HOSTS = new Set([
  "accounts.google.com",
  "appleid.apple.com",
  "login.microsoftonline.com",
  "login.live.com",
]);

function httpsUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function isOfficialOpenAiUrl(raw: string): boolean {
  const url = httpsUrl(raw);
  return url !== null && OPENAI_HOSTS.some(
    (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`),
  );
}

export function isTrustedChatGptNavigation(raw: string): boolean {
  const url = httpsUrl(raw);
  return url !== null && (isOfficialOpenAiUrl(raw) || IDENTITY_PROVIDER_HOSTS.has(url.hostname));
}

export function assertTrustedIpcSender(
  event: Pick<IpcMainInvokeEvent, "sender" | "senderFrame">,
  renderer: WebContents | null | undefined,
): void {
  if (!renderer || event.sender !== renderer || event.senderFrame !== renderer.mainFrame) {
    throw new Error("Rejected IPC from an untrusted renderer");
  }
}
