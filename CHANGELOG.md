# Changelog

This project follows semantic versioning after `1.0.0`. Prerelease versions may
change incompatibly while the Linux compatibility matrix is being completed.

## 0.2.0-alpha.1 - 2026-07-25

### Added

- Application-wide Electron sandboxing and hardened production fuses
- Exact IPC sender/main-frame validation for every privileged capability
- Deny-by-default remote permissions, navigation, windows, and downloads
- Bounded and timed Codex JSONL/RPC transport with restart recovery
- Structured Codex questions, permission profiles, and MCP form elicitation
- Debian and RPM packaging configuration with Bubblewrap prerequisites
- CI, CodeQL, dependency review, SBOMs, checksums, and build attestations
- Apache-2.0 licensing, privacy/security policies, threat model, and release gate

### Security

- API-key and externally supplied token authentication remain prohibited
- AppImage removed from normal release targets until secure Linux startup is proven
- Missing Codex Bubblewrap/AppArmor support now blocks the Codex interface
