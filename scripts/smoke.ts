import { CodexAppServer } from "../src/codex-app-server.js";

const appServer = new CodexAppServer({
  binary: process.env.CODEX_BINARY?.trim() || "codex",
  cwd: process.cwd(),
  version: "smoke-test",
});

appServer.on("stderr", (chunk) => process.stderr.write(chunk));

try {
  const initialize = (await appServer.start()) as Record<string, unknown>;
  const accountResponse = (await appServer.request("account/read", { refreshToken: false })) as {
    account?: { type?: string } | null;
    requiresOpenaiAuth?: boolean;
  };

  if (accountResponse.account?.type !== "chatgpt") {
    throw new Error(`Expected ChatGPT OAuth account, received ${accountResponse.account?.type ?? "signed-out"}`);
  }

  console.log(
    JSON.stringify(
      {
        initialized: true,
        platformOs: initialize.platformOs,
        authMode: accountResponse.account.type,
        requiresOpenaiAuth: accountResponse.requiresOpenaiAuth,
      },
      null,
      2,
    ),
  );
} finally {
  await appServer.stop();
}
