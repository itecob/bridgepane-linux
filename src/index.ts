import { createBridgeServer } from "./bridge-server.js";
import { CodexAppServer } from "./codex-app-server.js";
import { loadConfig } from "./config.js";
import { RpcRouter } from "./router.js";

async function main(): Promise<void> {
  const config = await loadConfig();
  const appServer = new CodexAppServer({
    binary: config.codexBinary,
    cwd: process.cwd(),
    version: process.env.npm_package_version ?? "0.1.0",
  });
  const router = new RpcRouter(appServer);

  appServer.on("stderr", (chunk) => process.stderr.write(`[codex] ${chunk}`));
  appServer.on("exit", (code, signal) => {
    console.error(`Codex app-server exited unexpectedly (${code ?? signal ?? "unknown"})`);
    process.exitCode = 1;
  });

  await appServer.start();
  const bridge = createBridgeServer(config, appServer, router);
  await bridge.start();

  console.log(`Codex bridge ready at http://${config.host === "::1" ? "[::1]" : config.host}:${config.port}`);
  console.log(`Capability token file: ${config.tokenFile}`);
  console.log("Authentication mode: ChatGPT OAuth only (API credentials are disabled)");

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    await bridge.stop().catch((error) => console.error(error));
    await appServer.stop().catch((error) => console.error(error));
  };

  process.once("SIGINT", () => void shutdown().finally(() => process.exit(0)));
  process.once("SIGTERM", () => void shutdown().finally(() => process.exit(0)));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
