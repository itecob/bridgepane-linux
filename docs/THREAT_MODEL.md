# Threat model

## Assets

- ChatGPT session cookies and account identity
- Codex OAuth state and conversation history
- User-selected project files and Git working trees
- Command and file-change approval decisions
- Installed plugin and marketplace configuration

## Trust boundaries

The application has four separate principals: the Electron main process, the
local native renderer, the remote ChatGPT renderer, and the official Codex child
process. The ChatGPT renderer is untrusted remote content. Plugins and MCP servers
are also untrusted until the user reviews and authorizes them.

## Required controls

1. The remote renderer has no preload, Node.js integration, privileged IPC, or
   permission grants. It cannot navigate outside explicit OpenAI and identity-
   provider hosts; unrelated links open in the system browser.
2. Every privileged IPC call verifies the exact native WebContents and its main
   frame. Arguments are validated again in the main process.
3. The native renderer and remote renderer run with Chromium sandboxing enabled.
   Production launchers must not pass `--no-sandbox`.
4. The Codex child receives no API-key or automation-token environment variables
   and is launched with ChatGPT authentication forced in local configuration.
5. App-server request identifiers are remapped. Unknown interactive requests are
   displayed or denied, and disconnection denies pending requests.
6. Plugin identifiers are validated and passed as argument arrays without a shell.

## Abuse cases covered by tests

- Hostname suffix and user-info URL confusion
- Non-HTTPS and script URLs
- API-key or injected-token login attempts
- Renderer disconnect during approvals
- Shell metacharacters in plugin identifiers
- Malformed JSON-RPC messages and identifiers

## Residual risks

- ChatGPT's website can change independently of this application.
- A malicious or compromised Codex plugin can request powerful capabilities.
- The Codex CLI and Electron are upstream trusted dependencies.
- Linux sandbox behavior varies by distribution, kernel, AppArmor policy, and
  package format. Each advertised platform must pass clean-VM validation.
- This document is an engineering threat model, not a third-party security audit.
