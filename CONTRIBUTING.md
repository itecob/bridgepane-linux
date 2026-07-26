# Contributing

Contributions are welcome. By submitting a contribution, you agree that it is
licensed under Apache-2.0 and that you have the right to submit it.

## Development requirements

- Linux
- Node.js 22 or newer
- A current official Codex CLI for live smoke tests

Install deterministically and run the full local gate:

```bash
npm ci
npm run verify
npm audit --omit=dev --audit-level=high
```

Changes to authentication, IPC, navigation, packaging, plugins, app-server
requests, or filesystem access require tests and an update to the threat model.
Never add API-key authentication, token extraction, ChatGPT DOM automation, or a
production `--no-sandbox` fallback.

Pull requests should be focused, explain user-visible behavior and security
impact, and include validation evidence. Generated Codex protocol files must be
regenerated from the official installed CLI rather than edited by hand.
