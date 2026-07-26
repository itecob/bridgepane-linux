# Architecture request: PH0 control plane and housekeeping

- **Request ID:** AR-PH0-001
- **Work items:** CTL-001, HK-001, GOV-001, GOV-002
- **Requested by:** itecob
- **Requested on:** 2026-07-26
- **Status:** requested
- **Implementation prohibited until:** architecture and verification responses
  are accepted and recorded in the ledger.

## Objective

Define a lossless, reviewable path from the current local and GitHub state to a
protected baseline where the readiness ledger is authoritative, repository
mutations require review, and every later work item is traceable.

## Current state to revalidate

- `origin/main` is `161439c`.
- Local `main` contains unpushed dependency commit `93cc2bb`.
- `production-readiness-control-plane` additionally contains `65ad9ea`.
- `HANDOFF.md` is untracked and contains useful but stale session state.
- PR 6 proposes incompatible Vite 8 changes.
- PRs 7 and 8 use mutable Action version tags.
- `main` and release tags are unprotected.
- Private vulnerability reporting is disabled.
- No release environment or work-item issue inventory exists.

The architect must re-query GitHub before responding.

## Invariants

- Preserve every intentional local change until it exists in a reviewable commit
  and remote branch.
- Do not force-push, delete refs, rewrite shared history, or stage
  `HANDOFF.md` accidentally.
- The ledger is the only status authority; GitHub executes but does not override.
- Pull requests cannot publish or receive release credentials.
- Stable versioning and publication remain blocked.
- No product-security implementation occurs in PH0.

## Decisions requested

1. Design branch and PR topology separating the compatible dependency update
   from the control-plane change while preserving current commits.
2. Decide the safe disposition of `HANDOFF.md`: extract durable facts, then
   deliberately retain a governed replacement or remove the session-only file.
3. Specify `main` and `v*` rules, required checks, administrator behavior,
   merge policy, emergency bypass, and rollback.
4. Specify the least-privilege release environment and approval ownership.
5. Define safe resolution of PRs 6, 7, and 8.
6. Define issue labels, templates, work-item linkage, dependency, ownership, and
   evidence fields without duplicating ledger status.
7. Define CI enforcement for missing requests, responses, links, and evidence.
8. Define read-only prechecks and rollback for every remote mutation.

## Preferred topology to evaluate

Preserve the current branch until replacement branches are verified. Create one
review branch from `origin/main` containing only `93cc2bb`, and a separate or
stacked branch containing the control-plane commit. Pin Actions to reviewed full
commit SHAs. Use GitHub rulesets and a protected release environment.

The architect may replace this topology but must improve review isolation,
rollback, and provenance.

## Required deliverables

- Trust-boundary diagram covering local Git, GitHub, CI, release environment,
  ledger, issues, evidence, and artifacts.
- Exact migration sequence with preconditions and rollback points.
- Repository ruleset and required-check specification.
- Issue/PR traceability and drift-enforcement design.
- `HANDOFF.md` and PR 6/7/8 disposition.
- Risks, rejected alternatives, open questions, and implementation slices.
- Decision: approve, approve with required changes, or block.

## Response acceptance

No destructive step may rely on an unresolved ref or branch assumption. Every
remote change must have a read-only precheck and rollback. Independent
verification must observe every control. Decisions must map to all four PH0 work
items.
