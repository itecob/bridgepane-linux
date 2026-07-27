# Production-readiness program

This directory is the control plane for taking BridgePane from an alpha to a
production-grade stable release. It is intentionally separate from feature
planning: no feature may bypass the controls or release gates defined here.

## Source of truth

[`plan.json`](plan.json) is the only source of truth for phase, ownership,
dependency, status, acceptance, and evidence tracking. Supporting documents
such as `docs/RELEASING.md`, `docs/THREAT_MODEL.md`, `PRIVACY.md`, and
`docs/DEPENDENCY_RISK.md` define policy or analysis; they do not independently
declare work complete.

Do not copy plan status into another document, issue, or project board. GitHub
issues and pull requests may execute an item, but must carry its work-item ID
and link back to the ledger. The ledger links to the implementation issue or PR.

## Status workflow

```text
planned -> ready -> in_progress -> in_review -> complete
                         |              |
                         +--> blocked <-+
```

- `planned`: scoped but a dependency or phase entry gate is not satisfied.
- `ready`: dependencies are complete and the work can be assigned.
- `in_progress`: one named owner is accountable for delivery.
- `in_review`: implementation exists and its required separate verifier-agent
  review is in progress.
- `blocked`: progress cannot continue; `blocker` explains why.
- `complete`: every acceptance criterion passed and immutable evidence is
  recorded under `evidence/` or linked to a permanent CI/release record.

Only `plan.json` may change an item's status. Closing a GitHub issue or merging
a pull request does not itself complete an item.

## Phase discipline

Work is executed in phase order. A later phase may be researched early, but it
cannot enter `in_progress` until all release-blocking work in earlier phases is
complete. Emergency vulnerability work is the sole exception and must record
the exception in the affected item's notes.

1. **Control plane and housekeeping** establishes repository governance and a
   clean, reviewable baseline.
2. **Security boundary** closes known application security and correctness
   defects before expanding the test matrix.
3. **Runtime contract** makes sandbox and Codex compatibility explicit and
   enforceable.
4. **Verification system** builds the Electron, protocol, accessibility, and
   clean-machine test harnesses needed to prove the product.
5. **Supply chain and deterministic build** locks inputs, packages, provenance,
   and independent rebuild comparison.
6. **Release qualification** executes the full matrix and completes privacy,
   legal, update, rollback, and security-response preparation.
7. **Stable release and operations** publishes only from the qualified commit
   and establishes recurring maintenance.

## Change protocol

Every production-readiness pull request must:

1. Name one or more work-item IDs in its title or body.
2. Update `plan.json` in the same change when scope, ownership, dependencies,
   risk, or acceptance criteria change.
3. Add tests and evidence required by the item; evidence must identify the
   source commit, environment, command, result, and reviewer.
4. Run `npm run verify` and the item's additional verification commands.
5. Receive a separate verifier-agent report for security boundaries and release
   workflows, followed by explicit sole-owner authority for dependency-risk
   acceptance and stable-release decisions.

Scope discovered during implementation is added as a new ledger item with
dependencies. It is never hidden in a PR checklist or silently folded into a
completed item.

## Zero-drift controls

`npm run verify:plan` validates the ledger and fails when:

- identifiers, phases, owners, dependencies, or acceptance criteria are
  missing;
- dependencies are unknown or cyclic;
- work advances ahead of an incomplete blocking phase or dependency;
- blocked work lacks a reason;
- completed work lacks dated evidence and a separate verifier role;
- a stable package version is declared while a release blocker is incomplete;
- required local policy or evidence files do not exist.

The CI workflow runs this validator through `npm run verify`. Branch protection
must make that check mandatory before the ledger can be changed.

## Build integrity target

The program distinguishes three related properties:

- **Repeatable inputs:** source revision, lockfile, actions, builder image,
  toolchain, locale, timezone, architecture, and build parameters are pinned or
  recorded.
- **Deterministic output:** two isolated builds from the same declared inputs
  produce byte-identical unsigned artifacts, or every normalized difference is
  explained and minimized by a reviewed comparison script.
- **Verifiable release:** the published artifact is the tested artifact and is
  accompanied by checksums, artifact-content SBOM, provenance, and documented
  consumer verification instructions.

This follows the outcome-oriented structure of NIST SSDF, the SLSA build and
provenance model, and the Reproducible Builds definition. The ledger maps each
item to the relevant control family without claiming certification.

## Working with the ledger

```bash
npm run verify:plan
npm run verify
```

The first implementation action is to create or link GitHub issues for all
`ready` items, assign an accountable owner, and update the ledger links in the
same pull request. Stable release is prohibited until every item marked
`releaseBlocker: true` is `complete`.
