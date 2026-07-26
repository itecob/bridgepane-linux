# Security policy

## Supported versions

Security fixes are provided for the latest published release. Pre-release builds
are for evaluation and do not receive long-term support.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's private
security-advisory reporting feature for this repository. Include the affected
version, reproduction steps, impact, and any suggested mitigation. Maintainers
should acknowledge a complete report within seven days and coordinate disclosure
after a fix is available.

Do not include access tokens, cookies, account data, private prompts, or project
source in a report. Revoke any credential that was accidentally exposed.

## Security boundaries

- ChatGPT runs in a separate persistent Electron session without a preload,
  Node.js integration, or access to the native renderer's IPC API.
- The Codex child process is forced to ChatGPT authentication. API-key and
  externally supplied token environment variables are removed.
- All privileged IPC validates the exact native renderer and main frame.
- Remote navigation, new windows, permissions, and downloads are deny-by-default.
- Unsupported Codex server requests fail closed.
- Production builds must retain the Electron sandbox. `--no-sandbox` is not a
  supported production configuration.

The complete assumptions and abuse cases are in [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).
