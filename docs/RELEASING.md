# Release procedure

Stable releases are blocked until the compatibility matrix and security gates in
this document pass. Do not distribute artifacts produced from a dirty tree.

1. Confirm the version and changelog, then run `npm ci` and `npm run verify`.
2. Run both runtime and full dependency audits. Any unresolved high or critical
   build dependency requires a documented risk decision before release.
3. Regenerate Codex schemas with the minimum and maximum supported CLI versions
   and review the diff. Complete a real OAuth, thread, turn, approval, interrupt,
   plugin, restart, and logout scenario.
4. Build `.deb` and `.rpm` artifacts in GitHub Actions from a protected tag.
5. Verify package metadata, file ownership, desktop integration, AppArmor setup,
   Chromium sandbox behavior, install, upgrade, rollback, and uninstall in clean
   virtual machines.
6. Generate an SBOM, SHA-256 checksums, and GitHub artifact attestations. Verify
   them before publishing the release.
7. Test Ubuntu 22.04/24.04/current, Debian 12/13, and current Fedora on X11 and
   Wayland. Record results in the release notes. ARM64 may only be advertised
   after running equivalent ARM64 tests.
8. Publish as a prerelease until all required matrix cells pass. Keep the previous
   supported artifact available for rollback.

AppImage is experimental and excluded from normal releases until it starts with a
working Chromium sandbox on distributions that restrict unprivileged user
namespaces. A `--no-sandbox` fallback is not an acceptable release solution.
