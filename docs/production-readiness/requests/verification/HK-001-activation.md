# Verification request: HK-001 Stage B activation

- **Request ID:** VR-HK-001-B
- **Date:** 2026-07-31
- **Requested by:** implementation-agent
- **Accepted Stage A evidence head:**
  `d5b7af809c77c65f9d1c92dd5e7d606ece0c673d`
- **Decision requested:** independently accept, accept with exact corrections,
  or reject the Stage B architecture and verification contract

## Authority and independence

The owner authorized protocol documentation only at
https://github.com/itecob/bridgepane-linux/pull/11#issuecomment-5140048551.
Do not modify production state, the plan, evidence, packages, lockfile,
workflows, dependencies, product code, local files, refs, pull requests,
branches, repository settings, cleanup state, or release state.

The verifier must independently inspect repository history, accepted Stage A
evidence, the architecture response, current plan, validator behavior, and the
frozen candidate identities. Do not infer correctness from implementer claims
or green CI alone. Agent-process separation is not independent-human review
and must be disclosed.

## Verification target

Evaluate whether a future two-file Stage B transaction can safely:

- transition HK-001 from `planned` to `ready` without completing it;
- bind accepted architecture, verification, owner, limitation, and risk
  records;
- remove the absent untracked HANDOFF path from active local references while
  preserving its deferred reconciliation obligation and identities;
- add the complete BLD-005 planned release-blocker definition;
- add BLD-005 to BLD-001 without removing or reordering accepted dependencies;
- append activation evidence without weakening the accepted Stage A record;
  and
- keep stable release prohibited.

The accepted source state and package invariants are defined in
`docs/production-readiness/requests/architecture/HK-001-activation.md`.

## Mandatory preimplementation review

Independently reproduce:

1. Stage A implementation and corrected evidence acceptance;
2. current HK-001, BLD-001, item-count, blocker-count, and product-stage state;
3. absence of BLD-005;
4. package, lockfile, plan, and Stage A evidence SHA-256 values;
5. exact frozen-candidate digests and its unaccepted status;
6. the accepted 145-case validator suite, including planned/ready/complete
   source variance, exact-ID, dependency, reference, containment, and
   hermeticity controls;
7. the BLD-005 contract against prior accepted housekeeping architecture; and
8. that the proposed Stage B target is representable by the current schema and
   passes reference closure without relying on untracked files.

Reject any response that weakens lifecycle, dependency, history, evidence,
reference, path, release, audit, or owner-authority controls.

## Required future implementation verification

The accepted verification response must require a future verifier to inspect
the exact implementation commit and prove:

- cumulative diff from accepted Stage A evidence head changes exactly
  `docs/production-readiness/plan.json` and
  `docs/production-readiness/evidence/HK-001.md`;
- no blindly applied bytes or evidence from the frozen candidate;
- HK-001 makes only the legal `planned -> ready` transition;
- HK remains incomplete, release-blocking, and owner-bound;
- every active local reference exists, is safe, committed, provisioned, and
  semantically required;
- protocol document paths, revisions, request bindings, decisions, and
  SHA-256 values are exact;
- verifier and owner records are immutable-repository URLs and accurately
  disclose the one-human/process-separated model;
- BLD-005 matches the full accepted field-level definition and remains
  `planned`;
- BLD-001 dependencies are exactly TST-002, TST-004, and BLD-005;
- item and blocker counts change only as expected;
- package, lockfile, workflow, dependency, product, cleanup, ref, PR, branch,
  repository-setting, and release state do not change;
- package and lockfile hashes remain invariant;
- accepted Stage A evidence is retained without factual rewrite;
- direct validator and all 145 fixtures pass locally;
- exact-head verify, dependency review, analyze, and CodeQL pass;
- production audit remains zero and the known 16 high full-graph build-chain
  findings remain explicitly open; and
- stable release remains rejected.

Every diagnostic assertion must compare complete sets. Every command, exit
status, item count, blocker count, digest, diff scope, check conclusion, URL,
deviation, and residual risk must be recorded.

## Transaction-boundary questions

Require the architecture response to resolve:

1. whether activation plan and activation evidence are one atomic commit or
   separate commits;
2. how exact implementation verification is recorded without creating a
   self-referential evidence hash;
3. what immutable verifier record and owner approval can lawfully exist at the
   moment HK becomes `ready`;
4. how later exact-head acceptance augments evidence without retroactively
   changing the accepted activation decision;
5. which exact source revision each protocol request and response binds;
6. how Stage A evidence remains immutable in meaning;
7. how the absent HANDOFF reference is removed without claiming reconciliation;
   and
8. exact rollback and stop conditions.

Reject a transaction design that claims an activation commit contains its own
commit hash, treats a branch or mutable PR head as immutable evidence, conflates
preimplementation review with exact implementation verification, or activates
HK before owner authorization.

## Required negative cases

The response must require explicit rejection of:

- HK `in_progress`, `in_review`, `complete`, or non-blocking state;
- missing or duplicate HK-001 or BLD-005 IDs;
- BLD-005 active or non-blocking;
- BLD-001 missing TST-002, TST-004, or BLD-005;
- an unknown, self, cyclic, incomplete-status, or cross-phase-invalid
  dependency;
- mutable, foreign-repository, missing, unsafe, absolute, traversal, symlinked,
  or unprovisioned evidence/reference paths;
- stale request/response revisions or digests;
- missing verifier limitation, owner acceptance, or residual risks;
- any package, lockfile, workflow, dependency, product, cleanup, ref, PR,
  branch, setting, or release mutation;
- hidden or reclassified 16-high build-chain findings;
- fixture count or case-inventory regression;
- stable product or stable release; and
- use, staging, deletion, or mutation of the frozen candidate.

## Evidence and residual risks

The verification response must prescribe a Stage B evidence packet that binds
accepted Stage A, requests/responses, owner authorization, implementation
commit, exact-head checks, full diff, plan transition, field-level BLD-005
record, reference manifest, diagnostics, audits, deviations, rollback, and
subsequent owner decision.

It must retain at least these residuals:

- Linux-specific fixture/path controls;
- same-UID pathname-race trust boundary;
- generated merge-commit CI execution;
- local dependency absence where applicable;
- 16 high-severity full-graph build-tool findings;
- unqualified toolchain compatibility until BLD-005 completes;
- process-only verifier independence;
- historical HANDOFF privacy/reconciliation obligations;
- public historical path disclosure; and
- evidence self-commit circularity.

## Requested response

Return a verification response only at
`docs/production-readiness/responses/verification/HK-001-activation.md`.
Bind the exact request commit and architecture-response commit, record all
reproduced hashes and state, provide an accept/reject decision, list mandatory
implementation and evidence controls, and explicitly state that the response
does not authorize implementation.
