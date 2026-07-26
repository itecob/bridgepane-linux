# Dependency risk register

## DR-001: Electron packaging glob expansion advisory

- **Status:** Open; release-blocking for stable releases
- **Affected scope:** Development/release tooling only (`electron-builder` and
  transitive `@electron/asar`, glob, minimatch, brace-expansion, and EJS/Jake
  utilities)
- **Installed runtime:** Not affected; `npm audit --omit=dev` reports no known
  vulnerabilities as of 2026-07-25
- **Risk:** A maliciously large brace/glob expression could exhaust memory in a
  release worker. The build only consumes repository-controlled package patterns,
  but a compromised pull request or build configuration could attempt denial of
  service against CI.
- **Current control:** Releases run on ephemeral GitHub-hosted workers, only from
  protected tags, with fixed package configuration, timeouts, least-privilege
  workflow permissions, dependency review, CodeQL, SBOM generation, checksums, and
  artifact attestations. Pull-request workflows cannot publish releases.
- **Rejected remediation:** `npm audit fix --force` currently proposes downgrading
  Electron Builder to an obsolete breaking version. Unverified major-version npm
  overrides are also rejected because they can corrupt packaged applications.
- **Exit condition:** Upgrade to an upstream Electron Builder release whose normal
  dependency graph clears the high-severity audit, then rebuild and repeat package
  installation tests. Stable releases remain blocked until this entry is closed
  or an independent maintainer records an explicit, time-bounded acceptance.
- **Review by:** 2026-08-25, and on every Electron Builder release.
