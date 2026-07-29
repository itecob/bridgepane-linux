# Architecture request: HK-001 validator self-test lifecycle isolation

- **Request ID:** AR-HK-001-VST-001
- **Work item:** HK-001
- **Requested by:** itecob
- **Requested on:** 2026-07-29
- **Protocol baseline:** HK response head
  `9edf457eab80c58f932e9c5ee913b212a2c2d454`
- **Merged baseline:**
  `bfab2ace4607a78597d557389fc785e2bba46791`
- **Owner protocol authorization:**
  https://github.com/itecob/bridgepane-linux/pull/11#issuecomment-5118315822
- **Status:** requested
- **Implementation state:** prohibited until an accepted immutable architecture
  response, accepted verification response, and subsequent exact owner
  implementation authorization are recorded.

## Objective

Design the smallest fail-closed correction for production-plan self-tests that
inherit mutable lifecycle state and incomplete repository fixtures from the
live ledger. The correction must make the tests baseline-independent and
hermetic without weakening dependency, reference, historical-digest,
transition, completion, or release gates.

## Trigger and reproduced failure

The owner-authorized two-file activation candidate changed HK-001 from
`planned` to `ready`, added planned BLD-005, wired BLD-005 into
`BLD-001.dependsOn`, and created the HK activation evidence record.

Direct validation passed:

```text
Production-readiness plan validation passed: 29 items, 26 open release blockers.
Status: planned=27, ready=1, in_progress=0, in_review=0, blocked=0, complete=1
```

The mandatory self-test then failed:

```text
incomplete dependency: expected 'while dependency HK-001 is planned', got:
- CTL-001 is complete while dependency HK-001 is ready
- dependency cycle includes CTL-001
- HK-001 references missing local path package-lock.json
```

The failure occurs because:

1. default self-test seeds clone the live production plan;
2. the incomplete-dependency case assumes HK-001 remains `planned` and
   matches that mutable value in its expected diagnostic;
3. the case creates a cycle while attempting to test only incomplete
   dependency enforcement; and
4. temporary and synthetic repositories copy production-readiness documents
   and write `package.json`, but do not provision every safe local reference
   needed when another item becomes active.

This is a validator test-fixture defect exposed by a valid lifecycle change,
not evidence that the proposed HK lifecycle state violates the real ledger.

## Frozen uncommitted candidate

The current activation candidate is not authorized for commit and must remain
uncommitted or be replaced only through a reviewed reverse patch.

- `docs/production-readiness/plan.json` SHA-256:
  `cd58ffd9a1c306d2a8d460959bcb48a72148adb13f33279cd215117c8fbc00c7`
- `docs/production-readiness/evidence/HK-001.md` SHA-256:
  `7cfacb471b9245a783f143977c33d25612d20e1afcbd986d06de5bdfb92b321e`
- tracked plan patch SHA-256:
  `7717a5e36759ffaa8daed7ec14fad0df45f68cc14d34ad3d88218fd76aabb8f4`

These identities preserve diagnostic input only. They are not accepted
implementation evidence and must not be blindly rebound to a later stage.

## Requested staged architecture

### Stage A: validator fixture correction

Determine whether the minimal implementation scope is exactly:

- `scripts/validate-production-plan.mjs`; and
- `docs/production-readiness/evidence/HK-001.md` only if required to record
  the correction evidence.

The committed production plan must retain HK-001 as `planned` during Stage A.
Stage A must not add BLD-005 or alter BLD-001.

The design must:

1. construct explicit canonical fixture states rather than inheriting mutable
   lifecycle state from the live plan;
2. select work items by ID instead of relying on array positions;
3. establish each dependency fixture's status and graph preconditions
   explicitly so one case proves one rule;
4. prove that both `planned` and `ready` dependencies block an active or
   completed dependent until the dependency is complete;
5. provision every required safe repository-relative reference in temporary
   and synthetic repositories, preserving its path and bytes;
6. validate each fixture source and destination against containment,
   symlink, absolute-path, traversal, type, and missing-source failures;
7. keep fixture repositories hermetic and never resolve missing references
   against the live checkout at validation time;
8. preserve real missing-reference validation instead of filtering or
   suppressing diagnostics; and
9. keep all existing base-selection, history, protocol-digest, lifecycle,
   completion, workflow, package, and stable-release cases.

The architect must decide whether to copy an allowlisted reference closure,
construct a canonical minimal seed, or use another design that proves the same
properties with less surface. Any helper must fail closed.

### Stage B: HK activation

Only after Stage A is committed, independently verified, accepted by the
owner, and green at its exact head may a separate activation slice modify:

- `docs/production-readiness/plan.json`; and
- `docs/production-readiness/evidence/HK-001.md`.

Stage B must rebuild evidence against the accepted Stage A source commit,
legally transition HK-001 to `ready`, add BLD-005 exactly as already
accepted, add BLD-005 to `BLD-001.dependsOn`, and leave HK incomplete.

## Mandatory verification and acceptance

Stage A must demonstrate:

- direct production-plan validation passes;
- the self-test suite retains every prior semantic case and adds isolated
  planned-dependency, ready-dependency, provisioned-reference, missing
  reference, traversal, absolute-path, and containment cases;
- the suite passes when a source ledger has HK-001 in `planned`, `ready`,
  and a structurally valid completed state;
- removing a provisioned reference fails with the specific missing-reference
  diagnostic;
- synthetic pull-request, main-push, local merge-base, shallow-history,
  historical-digest, lifecycle, completion, workflow, and stable-release
  cases remain green;
- `npm run verify`, production audit, dependency review, and CodeQL pass at
  the exact Stage A head;
- the plan, packages, lockfile, workflows, product code, and release state
  remain unchanged; and
- package and lockfile SHA-256 values remain respectively
  `94c2e078d73203d5d77c71451cfd264ecd2b87bd7b4dd80bcf583a490294aa85`
  and
  `747067841cfa6c6cdef342bcc4088d53c0903d3b85f3e78cbc0c7fc16ea5441f`.

Stage B must independently prove the legal transition, exact protocol and
owner bindings, BLD-005 definition and dependency wiring, unchanged package
hashes, exact two-file scope, green local and exact-head CI, and continued
stable-release prohibition.

## Non-goals and prohibited shortcuts

- Do not change a diagnostic merely from `planned` to `ready` or accept
  either string.
- Do not special-case HK-001 in production validation.
- Do not remove accepted references to make fixtures pass.
- Do not skip reference validation in fixture mode.
- Do not weaken dependency completion, lifecycle, evidence, history, or
  release rules.
- Do not edit packages, lockfiles, workflows, dependencies, product code,
  repository settings, local files, refs, or dependency pull requests.
- Do not commit the current activation candidate or claim HK activation,
  completion, or stable release.

## Rollback and evidence

Stage A must be a separately reviewable commit whose only implementation
change is the accepted validator correction and any explicitly authorized
evidence record. Rollback uses a normal reviewed `git revert`; destructive
reset, clean, history rewrite, or force-push is prohibited. Stage B remains a
separate commit and owner gate.
