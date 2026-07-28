# Architecture request: HK-001 lossless housekeeping

- **Request ID:** AR-HK-001
- **Work item:** HK-001
- **Requested by:** itecob
- **Requested on:** 2026-07-28
- **Status:** requested
- **Baseline:** merged `main` commit
  `bfab2ace4607a78597d557389fc785e2bba46791`
- **Implementation prohibited until:** accepted architecture and verification
  responses and explicit owner implementation authorization are recorded.

## Objective

Design a lossless, reviewable reconciliation of the divergent local Git state,
the untracked session handoff, and dependency PRs 6, 7, and 8. The result must
establish a clean baseline without merging stale history, losing useful facts,
weakening supply-chain policy, or silently advancing later-phase work.

## Revalidated current state

- PR 10 merged CTL-001 into `main` as
  `bfab2ace4607a78597d557389fc785e2bba46791`.
- The isolated HK-001 branch starts at that exact merge commit.
- Local `main` is at
  `93cc2bbc7abbed9477bf4d7de7f1e43d063258ac`, one local commit ahead
  of its former base and eight commits behind current `origin/main`.
- Commit `93cc2bb` changes `.github/dependabot.yml`, `package.json`, and
  `package-lock.json`. It includes major updates to jest-dom, Node types,
  jsdom, and TypeScript and predates the production-readiness control plane.
- Merging or rebasing the old local `main` as a branch is unsafe: its tree
  lacks the merged control-plane files. Only reviewed intent or an isolated
  patch may be considered.
- The active local checkout is
  `production-readiness-control-plane` at `622c43d`. It has untracked
  `HANDOFF.md`, `docs/production-readiness/deviations/`, and
  `docs/production-readiness/responses/`.
- `HANDOFF.md` contains useful security and product invariants but is stale:
  it identifies `161439c` as the published baseline and describes older
  dependency and workflow state.
- PR 6 is open at
  `38e4cfa8d14d5c96a794be4820f4aeaf20f91a67`; it groups six major
  development-tool updates and its verify job failed.
- PR 7 is open at
  `225b70edf8d1786104aa5f10c6a377cb46c89fc8`; it changes
  `actions/attest-build-provenance@v2` to the mutable `@v4` tag.
- PR 8 is open at
  `d91154cf0f6eee48ca36c4f79573667f5c459621`; it changes
  `actions/setup-node@v4` to the mutable `@v7` tag.
- Full-SHA Action pinning is an acceptance criterion of BLD-001 in PH4. HK-001
  may preserve or defer that work but must not claim BLD-001 complete or merge
  mutable tags as a substitute.

All remote state must be revalidated immediately before an implementation
decision because Dependabot can rebase or replace branch heads.

## Invariants

- Do not merge, rebase, reset, delete, or force-update the user's local
  branches.
- Do not stage, move, overwrite, or delete any untracked file before its bytes,
  digest, provenance, and disposition are reviewed.
- Preserve `93cc2bb`, `622c43d`, and the PH0 preservation refs until
  replacement evidence is merged and the owner separately authorizes cleanup.
- Never merge the divergent local `main` wholesale into current `main`.
- Dependency intent is not acceptance. Every version and lockfile change must
  be reconstructed from current `main`, reviewed, and verified independently.
- Do not use `npm audit fix --force`, downgrade Electron Builder, or accept
  new production vulnerabilities.
- Do not merge mutable Action major tags or expand HK-001 into BLD-001.
- Do not close PRs 6, 7, or 8 before exact-head review, an accepted disposition,
  and owner authorization.
- CTL-001 remains complete and immutable. Stable release remains prohibited.

## Architecture decisions requested

1. Define the branch and worktree topology that keeps the user's current
   checkout untouched while producing one reviewable HK-001 line from merged
   `main`.
2. Decide whether any part of `93cc2bb` remains desirable. Specify how to
   reconstruct accepted dependency changes on current `main` without
   cherry-picking stale lockfile or control-plane state.
3. Define a package-by-package compatibility decision for the versions in
   `93cc2bb` and PR 6, including TypeScript, Vite, plugin-react, jsdom,
   jest-dom, Node types, Electron, and Electron Vite compatibility.
4. Decide the `HANDOFF.md` disposition: retain as a governed current document,
   extract only unique durable facts into authoritative documents and then
   remove it, or reject it with recorded rationale. Identify duplicated,
   stale, sensitive, and unique content explicitly.
5. Define how untracked deviation and response files are compared with merged
   tracked copies before any cleanup.
6. Define exact dispositions for PRs 6, 7, and 8. A closure or replacement must
   preserve traceability and link deferred full-SHA pinning to BLD-001.
7. Define what “clean baseline” means across the isolated HK worktree, the
   user's original checkout, local refs, remote refs, and ignored build output.
8. Separate HK-001 scope from GOV-001, GOV-002, BLD-001, and BLD-002. Any
   discovered work outside HK-001 must become a ledger change, not hidden work.
9. Provide checkpoints, reversible steps, and rollback for each local or remote
   mutation.

## Required architecture deliverables

- Before/after Git topology with exact protected and preservation refs.
- File-by-file reconciliation table for all divergent and untracked content.
- Dependency decision matrix with compatibility and security rationale.
- PR 6/7/8 disposition matrix tied to exact observed heads.
- Proposed HK-001 implementation slices and authorized path sets.
- Clean-baseline definition and evidence plan.
- Threat analysis covering lost work, stale-history merge, lockfile confusion,
  dependency regression, mutable Actions, credential leakage, and false
  completion.
- Rejected alternatives, residual risks, and rollback plan.
- Decision: accept, accept with required changes, or reject.

## Response acceptance

The response must be safe for a sole-owner project, require no second human,
and keep agent review distinct from owner authority. It must not depend on an
unresolved branch name, moving Dependabot head, destructive cleanup, or
unverified package compatibility. No implementation may begin until the
architecture response and the verification response are accepted by the owner.
