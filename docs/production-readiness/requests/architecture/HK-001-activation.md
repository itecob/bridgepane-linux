# Architecture request: HK-001 Stage B activation

- **Request ID:** AR-HK-001-B
- **Date:** 2026-07-31
- **Requested by:** implementation-agent
- **Authority:** sole human owner `itecob`
- **Accepted Stage A evidence head:**
  `d5b7af809c77c65f9d1c92dd5e7d606ece0c673d`
- **Decision requested:** accept, accept with exact controls, or reject

## Authority boundary

The owner accepted Stage A evidence and authorized only four Stage B protocol
paths at
https://github.com/itecob/bridgepane-linux/pull/11#issuecomment-5140048551.
This request is documentation, not implementation. It does not authorize an
edit to the production plan, evidence, packages, lockfile, workflows,
dependencies, product code, local files, refs, pull requests, repository
settings, cleanup state, or release state.

Any Stage B implementation requires accepted architecture and verification
responses followed by a new owner decision bound to their exact commit and
digests.

## Accepted source state

Stage A is independently accepted:

- validator implementation:
  `faa2fb7093ae31d9bced296051cf044ec1a829a5`;
- corrected Stage A evidence:
  `d5b7af809c77c65f9d1c92dd5e7d606ece0c673d`;
- evidence SHA-256:
  `194af5593159fe09928896636e1eb95cc228adcabc7b8ebf39d85b48decfbf75`;
- owner Stage A implementation/evidence decisions:
  https://github.com/itecob/bridgepane-linux/pull/11#issuecomment-5137078686
  and
  https://github.com/itecob/bridgepane-linux/pull/11#issuecomment-5140048551.

At that head:

- HK-001 is `planned`, incomplete, and release-blocking;
- BLD-005 is absent;
- BLD-001 depends exactly on TST-002 and TST-004;
- the plan contains 28 items and 25 open release blockers;
- `package.json` SHA-256 is
  `94c2e078d73203d5d77c71451cfd264ecd2b87bd7b4dd80bcf583a490294aa85`;
- `package-lock.json` SHA-256 is
  `747067841cfa6c6cdef342bcc4088d53c0903d3b85f3e78cbc0c7fc16ea5441f`;
- the accepted validator passes 145 fixtures across live-plan HK planned,
  ready, and structurally complete source variants; and
- stable release remains prohibited.

## Proposed Stage B objective

Design one separately reviewable activation transaction limited to:

- `docs/production-readiness/plan.json`; and
- `docs/production-readiness/evidence/HK-001.md`.

The transaction should:

1. legally transition HK-001 from `planned` to `ready`;
2. leave HK-001 incomplete, release-blocking, and owned by `itecob`;
3. bind HK-001 to the accepted Stage B request/response lineage, verifier
   record, owner authorization, independence limitation, and residual risks;
4. add BLD-005 as a new `planned` release blocker;
5. add BLD-005 to BLD-001 dependencies without removing TST-002 or TST-004;
6. append Stage B activation evidence without weakening or overwriting the
   accepted Stage A record; and
7. preserve the stable-release prohibition and every package invariant.

The earlier two-file candidate is unaccepted reproduction input only:

- candidate plan SHA-256:
  `cd58ffd9a1c306d2a8d460959bcb48a72148adb13f33279cd215117c8fbc00c7`;
- candidate evidence SHA-256:
  `7cfacb471b9245a783f143977c33d25612d20e1afcbd986d06de5bdfb92b321e`;
- candidate tracked-plan patch SHA-256:
  `7717a5e36759ffaa8daed7ec14fad0df45f68cc14d34ad3d88218fd76aabb8f4`.

The design must require reconstruction against the accepted Stage A head. It
must not authorize applying, staging, committing, or treating that candidate
as current evidence.

## BLD-005 contract requiring architecture confirmation

The proposed item is:

- **ID:** BLD-005
- **Phase:** PH4
- **Title:** Align the Node, npm, type-definition, and test-tool compatibility
  contract
- **Status:** planned
- **Release blocker:** true
- **Owner:** `itecob`
- **Dependencies:** TST-002 and TST-004
- **Controls:** SSDF-PS.1, SSDF-PW.4, SSDF-PW.6, SLSA-BUILD-L2

Proposed acceptance criteria:

1. one supported Node range and exact release-build Node/npm pair are
   documented and enforced;
2. `package.json.engines` satisfies every direct build/test tool's
   authoritative engine requirement;
3. `@types/node` matches the tested minimum runtime or an enforced API check
   prevents newer-only APIs;
4. Node types, jsdom types, jsdom, TypeScript, Vite, plugin-react, Electron
   Vite, and the test stack have a reviewed compatibility matrix;
5. CI rejects unsupported Node/npm combinations and tests every advertised
   source-build combination; and
6. the declared toolchain reproduces the lockfile without unexplained
   dependency-tree or SBOM drift.

Proposed required evidence:

- authoritative package metadata manifest with retrieval time, URL, response
  digest, and package integrity;
- Node/npm and peer compatibility matrix;
- positive CI matrix and unsupported-version negative tests;
- `npm ls` and `npm explain` output;
- lockfile, normalized dependency-tree, and SBOM comparison;
- production and full-graph audits; and
- verifier-agent decision and owner approval.

Proposed references are `package.json`, `package-lock.json`,
`.github/workflows/ci.yml`, `.github/workflows/release.yml`, and
`docs/RELEASING.md`. Proposed residual risks are newer-only type APIs,
package engine floors above the declared runtime floor, package-manager lock
drift, and an unqualified current development-stack production contract.

The response must approve this definition exactly or provide a complete
replacement. It must not solve BLD-005 during HK activation.

## Reference and evidence design questions

The clean Stage A checkout does not contain the historical untracked
`HANDOFF.md`. An active HK item cannot retain a local reference that is absent
from a clean checkout. Specify how Stage B:

- removes that unsafe active reference without discarding its documented
  reconciliation obligation;
- uses only committed, provisioned local references;
- preserves the HANDOFF identity and deferred treatment in evidence rather
  than publishing or copying its content;
- binds all Stage B protocol paths to exact commits and SHA-256 values; and
- handles the unavoidable circularity that a file cannot embed the hash of its
  own enclosing activation commit.

## Required transaction and rollback design

Define:

- the exact implementation base and two-file patch boundary;
- required pre-edit, pre-commit, post-commit, and exact-head checks;
- exact HK fields, protocol IDs, review record, authority record, references,
  evidence URLs, independence limitation, and residual risks;
- exact BLD-005 placement and BLD-001 dependency ordering;
- how evidence publication and exact-commit verification are separated or
  bound without a self-referential commit hash;
- the owner gate required before implementation and after exact-head
  verification;
- normal reviewed `git revert` rollback; and
- stop conditions for any hash, path, state, reference, diagnostic, or CI
  mismatch.

Destructive reset, clean, history rewriting, force-push, broad cleanup, package
installation, dependency changes, PR mutation, and stable release must remain
prohibited.

## Required verification matrix

At minimum, require:

- exact two-file cumulative scope;
- legal `planned -> ready` transition against the accepted Stage A base;
- HK incomplete and release-blocking;
- exact Stage B protocol and owner bindings;
- BLD-005 exact definition and planned blocker state;
- BLD-001 dependencies exactly TST-002, TST-004, and BLD-005;
- direct validation and all 145 self-test fixtures;
- source-variance and reference-provisioning cases;
- unchanged package, lockfile, workflow, dependency, and product paths;
- exact package, lockfile, and accepted Stage A evidence hashes;
- exact-head verify, dependency review, analyze, and CodeQL;
- production audit zero while separately reporting the known 16-high
  full-graph build-tool risk; and
- explicit stable-release rejection.

## Requested response

Return an architecture response only at
`docs/production-readiness/responses/architecture/HK-001-activation.md`.
Include the decision, exact controls, field-level target state, transaction
sequence, evidence schema, verification matrix, rollback, residual risks,
owner-decision template requirements, and explicit non-authorization of
implementation.
