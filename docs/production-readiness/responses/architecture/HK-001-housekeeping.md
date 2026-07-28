# Architecture response: HK-001 lossless housekeeping

- **Response ID:** ARS-HK-001
- **Request ID:** AR-HK-001
- **Request revision:** `e10aafb021ec3bec6c2410764b2f31c6d5291f17`
- **Architecture-request SHA-256:**
  `02449eba862e3224cfa5fa332560acdf3dfeb6be47bd6de2383772cc08b599d6`
- **Verification-request SHA-256:**
  `59fc68edae5398e6065299e32d3a9180a81485f33f096383d408c31ea5a337e5`
- **Decision:** accepted with required changes
- **Authority limitation:** This is separate agent architecture review, not
  independent-human approval. Only `itecob` may authorize implementation,
  cleanup, remote PR mutations, risk acceptance, or completion.

## Required changes

1. Reconstruct only the useful Dependabot grouping policy from `93cc2bb`;
   do not reconstruct any package upgrade.
2. Keep `package.json` and `package-lock.json` byte-identical to baseline
   `bfab2ace4607a78597d557389fc785e2bba46791`.
3. Archive and classify `HANDOFF.md` as non-authoritative evidence before
   explicit local removal.
4. Compare every untracked protocol file byte-for-byte with its tracked
   baseline copy before cleanup.
5. Close PRs 6, 7, and 8 only after replacement evidence is immutable, their
   heads are revalidated, and the owner separately authorizes exact mutations.
6. Track the existing Node/toolchain contract mismatch as a new planned ledger
   item; do not fix it inside HK-001.

## Revalidated corrections

The request's frozen PR 6 head moved after the request was written. The
architect observed:

| PR | Observed head | State |
| --- | --- | --- |
| 6 | `dfb03f28d5974a7326f13a94575694caa582e359` | Verify fails at `npm ci` |
| 7 | `225b70edf8d1786104aa5f10c6a377cb46c89fc8` | Green; proposes mutable `@v4` |
| 8 | `d91154cf0f6eee48ca36c4f79573667f5c459621` | Green; proposes mutable `@v7` |

PR 6 now includes jsdom 30 and `@types/node` 26.1.2. Its direct peer conflict
is Vite 8.1.5 versus `electron-vite@5.0.0`, whose supported range ends at
Vite 7. All heads remain moving inputs and must be revalidated immediately
before any remote action.

## Git topology

The old local `main` and `622c43d` line share only `161439c` with current
`origin/main`. Neither may be merged or rebased into the HK line.

```text
origin/main: bfab2ac
                 \
agent/hk-001:     e10aafb  requests and reviewed responses

161439c
├─ local main: 93cc2bb
└─ 93cc2bb─65ad9ea─622c43d
                       ├─ active original checkout
                       └─ origin/preservation/ph0-lineage-20260726

origin/preservation/ph0-dangling-3bb70f6-20260726: 3bb70f6
```

Target HK history is a reviewed branch from `bfab2ac` containing request,
response, activation, isolated housekeeping, evidence, and completion commits.
Preserve local `main` at `93cc2bb`, the original checkout at `622c43d`,
and both preservation refs. Do not delete the HK branch or preservation refs
until final evidence is accepted.

Do not run garbage collection. The currently dangling object
`f3b4f356a9e47cadf5aaf6e0ba7ea810e71d3f17` must first receive a recorded
intentional or rejected classification.

## File reconciliation

| Source | Decision |
| --- | --- |
| `93cc2bb:.github/dependabot.yml` | Reconstruct only `update-types: [minor, patch]` on current main. |
| `93cc2bb:package.json` | Reject; it removes CTL verification and contains unqualified majors. |
| `93cc2bb:package-lock.json` | Reject; never transplant a stale lockfile. |
| `HANDOFF.md` | Reject as current documentation; archive exact bytes as non-authoritative evidence before approved removal. |
| Untracked CTL deviation | Exact baseline duplicate; record digests before explicit removal. |
| Untracked architecture response | Exact baseline duplicate; record digests before explicit removal. |
| Untracked verification response | Exact baseline duplicate; record digests before explicit removal. |
| Ignored build/dependency output | Inventory, but do not delete. |
| Historical branches and refs | Preserve and document divergence. |

Observed untracked SHA-256 values:

- `HANDOFF.md`:
  `1ac18c92b9547357eea00b0dfc83f09074ed02957449d4a02722c8a8728905af`
- CTL deviation:
  `277597e726c9a6d43a08ea794ed858f5c4f8c392d928f83674bfdc36b8abe7aa`
- Architecture response:
  `7eebe01d9b47a80876cf69a9a27e519d3ac0c62a78c3170a3d67022efd4e40a0`
- Verification response:
  `c35c2abbfba93ebf4e0acc1f01d6f23f7dc0614717bfbcd7cc806360baec420f`

The three protocol-file digests exactly match the tracked copies on merged
`main`.

## HANDOFF classification

- Product identity, alpha status, license, mode separation, sandbox rules,
  credential stripping, plugin behavior, release commands, naming, and
  trademark facts duplicate authoritative project documents.
- Baseline `161439c`, synchronization claims, verification snapshot, GitHub
  settings, dependency-PR status, and next-session instructions are stale.
- The local path is environment-specific and must not become authoritative.
- No credential was observed, but an automated secret and private-data scan is
  mandatory.
- No unique durable fact was observed after comparison.

Preserve exact bytes at
`docs/production-readiness/evidence/HK-001/artifacts/HANDOFF-20260726.md`,
marked archival and non-authoritative. Public archival requires a distinct
owner gate after scanning. If public archival is declined, retain the original
and block cleanup until an approved recoverable archive exists.

Never use `git clean`, recursive deletion, stash-only preservation, or
reflog-dependent recovery.

## Dependency decision matrix

| Component | Baseline | Proposed | HK decision |
| --- | --- | --- | --- |
| jest-dom | 6.9.1 | 7.0.0 | Reject for HK; major adds an explicit testing-library peer contract. |
| Node types | 24.x | 26.1.x | Reject; Node 26 types exceed the declared Node 22 runtime floor. |
| plugin-react | 5.2.0 | 6.0.4 | Reject; version 6 requires Vite 8. |
| jsdom | 27.4.0 | 29/30 | Reject; newer minimum Node versions exceed the declared floor. |
| TypeScript | 5.9.3 | 7.0.2 | Reject; requires isolated compiler and packaging qualification. |
| Vite | 7.3.6 | 8.1.5 | Retain 7; Vite 8 is outside Electron Vite 5's peer range. |
| Electron | 43.2.0 | unchanged | Retain; no HK upgrade. |
| Electron Vite | 5.0.0 | unchanged | Retain; it supports Vite 5 through 7. |

No dependency or lockfile change is accepted in HK-001. Therefore:

- no lockfile regeneration is permitted;
- dependency trees must remain identical;
- normalized SBOM dependency identity must remain unchanged;
- production audit must remain zero; and
- the 16 high build-tool findings remain explicit release blockers.

The mismatch between `engines.node >=22.0.0`, build-tool minimums of Node
22.12 or later, and the Node type surface must become a new planned,
release-blocking ledger item. HK-001 records it but does not implement it.

## PR dispositions

| PR | Disposition |
| --- | --- |
| 6 | Do not merge. After replacement evidence is immutable, comment with ERESOLVE evidence, the compatibility matrix, HK traceability, and the separate-major-update policy; close as superseded or rejected. |
| 7 | Do not merge. Explain that the major may be evaluated in BLD-001 but mutable `@v4` is not full-SHA pinning; link BLD-001 and close as deferred. |
| 8 | Do not merge. Explain that setup-node 7 needs separate qualification and full-SHA pinning in BLD-001; link BLD-001 and close as deferred. |

Immediately before each mutation:

1. Re-query open state, exact head, files, and checks.
2. Require equality with owner-approved evidence.
3. Stop for updated analysis and authorization on any mismatch.
4. Post the factual comment before closing.
5. Record immutable comment URLs and closure events.
6. Do not delete Dependabot branches.

A mistaken closure is rolled back by reopening; comments remain audit history.

## Implementation slices and paths

### Slice 0 — responses only

- `docs/production-readiness/responses/architecture/HK-001-housekeeping.md`
- `docs/production-readiness/responses/verification/HK-001-housekeeping.md`

The owner accepts the exact response commit before implementation.

### Slice 1 — activation and deferred-risk record

- `docs/production-readiness/plan.json`
- `docs/production-readiness/evidence/HK-001.md`

Perform only legal status transitions and add the planned toolchain-contract
item. Do not mark HK complete.

### Slice 2 — reconstructed policy

- `.github/dependabot.yml`
- `docs/production-readiness/evidence/HK-001/dependency-decisions.md`

`package.json` and `package-lock.json` are prohibited.

### Slice 3 — lossless reconciliation

- `docs/production-readiness/evidence/HK-001/reconciliation.json`
- `docs/production-readiness/evidence/HK-001/artifacts/HANDOFF-20260726.md`

The manifest records paths, byte sizes, SHA-256 and Git-blob hashes,
classification, destination or rejection, and cleanup preconditions.

### Slice 4 — remote and local mutation evidence

Only after a separate owner authorization:

- explicitly remove only the four reviewed untracked files;
- remove the two now-empty directories only after proving they are empty;
- comment on and close PRs 6, 7, and 8 at approved heads; and
- update only the HK evidence, reconciliation manifest, and plan.

### Slice 5 — completion

After exact-head CI, separate verifier review, a two-hour high-risk cooling
period, and owner approval, update only the plan and HK evidence. No other path
may appear in the completion commit.

## Clean-baseline definition

HK-001 is clean only when:

- a fresh checkout of final `origin/main` is status-clean and passes
  `npm ci` and `npm run verify`;
- the isolated HK worktree is clean at its exact final commit;
- the original checkout remains at `622c43d`, with no tracked changes or
  untracked files, labeled as a historical preservation checkout;
- local `main` remains clean at `93cc2bb`, intentionally divergent and not
  advertised as the release baseline;
- preservation refs and original commits remain reachable locally and remotely;
- remote `main` is the sole current source baseline;
- closed PR heads and comments are recorded;
- ignored output is inventoried separately rather than deleted;
- `git fsck` and dangling-object disposition are recorded; and
- CTL-001 remains complete and stable release remains blocked.

## Threat analysis and rejected alternatives

- Loss is controlled by remote preservation, hash manifests, explicit-path
  cleanup, and no branch deletion.
- Stale-history merge is controlled by reconstructing one policy hunk on
  current main; no old-branch merge or cherry-pick is permitted.
- Lockfile confusion and dependency regressions are controlled by prohibiting
  package changes.
- PRs 7 and 8 are closed rather than treating mutable tags as SHA pinning.
- Public archival is scanned and separately owner-approved.
- Moving bot heads are exact-head gated.
- Cleanliness reports original checkouts, divergent refs, ignored output, and
  dangling objects separately.

Rejected: merging, rebasing, resetting, or cherry-picking old branches; copying
the old lockfile; accepting stale verification; `--force` or
`--legacy-peer-deps`; merging PRs 7 or 8 and promising later pinning;
expanding HK into later phases; keeping HANDOFF as current status; `git clean`;
recursive deletion; branch deletion; or reflog-only recovery.

## Rollback and owner gates

Separate owner decisions are required to:

1. accept architecture and verification responses at an exact commit;
2. authorize exact implementation slices and paths;
3. accept or reject public archival of scanned HANDOFF bytes;
4. authorize explicit local cleanup after remote preservation;
5. authorize PR comments and closures at freshly observed heads; and
6. accept residual risks and HK completion after verifier evidence and cooling.

Rollback uses reviewed revert commits for repository changes, exact archived
bytes for HANDOFF, tracked baseline blobs for protocol duplicates, reopening
for mistaken PR closure, and a reviewed revert for Dependabot policy. Any
failed checkpoint stops later slices.

## Residual risks

- Major development dependencies remain deferred.
- The Node engine, types, and build-tool contract remains inconsistent.
- Sixteen high build-tool findings remain release-blocking.
- Workflows remain on mutable Action tags until BLD-001.
- Historical local branches remain divergent by design.
- Sole-owner compromise and availability remain governance risks.

No HK-001 implementation may begin until this response and the paired verifier
response are committed and explicitly accepted by `itecob`.
