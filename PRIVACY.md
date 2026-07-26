# Privacy

BridgePane does not operate an application backend and does not add
analytics, advertising, telemetry, or crash-reporting services.

## Data flows

- The ChatGPT mode loads `https://chatgpt.com` directly. OpenAI receives content
  and account data under its applicable privacy policy and service terms.
- The Codex mode starts the locally installed official Codex CLI and communicates
  with it over local stdio. The Codex CLI communicates with OpenAI using the
  user's ChatGPT authentication and may read or modify files the user authorizes.
- ChatGPT cookies are stored in Electron's dedicated `persist:chatgpt` partition.
  They are not exposed to the native renderer or Codex process.
- Codex authentication and conversation state are managed by the official Codex
  CLI in the user's Codex configuration directory.
- Plugin installation invokes the local Codex CLI. Installed plugins may connect
  to third parties and are governed by their own policies.

The application does not intentionally copy cookies, OAuth tokens, prompts, or
conversation history between ChatGPT and Codex modes.

## Local data and removal

Uninstalling a package does not automatically delete ChatGPT session data or the
user's Codex history. Before publishing a stable release, the project will
document the exact versioned Electron data directory and provide a tested cleanup
procedure for each supported package format.
