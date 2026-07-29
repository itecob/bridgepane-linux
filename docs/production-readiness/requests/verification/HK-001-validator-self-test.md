# Verification request: HK-001 validator self-test lifecycle isolation

- **Request ID:** VR-HK-001-VST-001
- **Work item:** HK-001
- **Requested by:** itecob
- **Requested on:** 2026-07-29
- **Architecture request:** AR-HK-001-VST-001
- **Protocol baseline:** HK response head
  `9edf457eab80c58f932e9c5ee913b212a2c2d454`
- **Merged baseline:**
  `bfab2ace4607a78597d557389fc785e2bba46791`
- **Owner protocol authorization:**
  https://github.com/itecob/bridgepane-linux/pull/11#issuecomment-5118315822
- **Status:** requested
- **Implementation state:** prohibited until accepted immutable architecture
  and verification responses and a subsequent exact owner implementation
  authorization are recorded.

## Objective

Independently challenge the proposed correction for self-tests that clone
mutable production lifecycle state and fail to provision active-item
references. Verification must prove the correction makes fixtures hermetic
without teaching the validator to ignore legitimate dependency, reference, or
lifecycle failures.

## Facts to reproduce before architecture acceptance

Using the uncommitted owner-authorized activation candidate, reproduce:

1. direct validation passes with HK-001 `ready`, BLD-005 `planned`, 26
   incomplete release blockers, and CTL-001 complete;
2. the self-test's incomplete-dependency case expects HK-001 `planned` from
   mutable production state;
3. actual diagnostics instead report a ready dependency, a cycle, and a
   missing `package-lock.json` fixture reference;
4. the fixture setup copies production-readiness documents and writes
   `package.json` but omits other required repository-relative references;
5. later synthetic Git cases use the same mutable ledger and can fail after
   the first expectation is repaired; and
6. no safe correction exists within only the plan and activation evidence.

Verify the frozen candidate identities:

- plan SHA-256
  `cd58ffd9a1c306d2a8d460959bcb48a72148adb13f33279cd215117c8fbc00c7`;
- activation evidence SHA-256
  `7cfacb471b9245a783f143977c33d25612d20e1afcbd986d06de5bdfb92b321e`;
- tracked plan patch SHA-256
  `7717a5e36759ffaa8daed7ec14fad0df45f68cc14d34ad3d88218fd76aabb8f4`.

These are diagnostic inputs, not implementation evidence.

## Architecture-review requirements

Reject any response that:

- modifies production semantics to accommodate tests;
- derives default fixture lifecycle states from the current live plan;
- identifies work items only by array position;
- creates multi-cause negative fixtures without asserting every diagnostic;
- bypasses reference checking in fixture or synthetic-Git modes;
- resolves fixture paths from the live checkout during validation;
- copies unchecked absolute, traversal, symlinked, missing, or out-of-root
  sources;
- removes existing semantic cases or weakens their assertions; or
- combines validator repair and HK activation in one implementation stage.

Require separate Stage A validator correction and Stage B activation owner
gates. The committed Stage A plan must leave HK-001 `planned`.

## Stage A verification matrix

| Gate | Required observation |
| --- | --- |
| Scope | Only the exact accepted validator and evidence paths change; plan, package, lockfile, workflow, dependency, product, repository, ref, PR, and release state do not |
| Explicit seeds | Planned, ready, active, in-review, and complete fixture states are constructed intentionally |
| ID selection | Fixture mutations select CTL-001, HK-001, and other targets by ID |
| Planned dependency | A planned dependency blocks an active or completed dependent with the exact planned diagnostic |
| Ready dependency | A ready dependency blocks an active or completed dependent with the exact ready diagnostic |
| Complete dependency | The otherwise identical dependent state passes when its dependency is complete |
| Cycle isolation | Dependency-status cases contain no unintended dependency cycle |
| Reference closure | A provisioned active-item repository-relative reference validates in a hermetic fixture |
| Missing reference | Removing the fixture copy fails with the exact missing-reference diagnostic |
| Unsafe references | Absolute, traversal, symlink, wrong-type, and out-of-root sources fail closed |
| Live-plan variance | Full self-tests pass with source HK-001 planned, ready, and structurally complete |
| Regression | Every prior semantic fixture remains; base-selection, history, protocol, transition, completion, workflow, package, and release cases pass |
| Local checks | Direct validator, self-test, `npm run verify`, tests, builds, release validation, and audits meet the accepted architecture |
| Exact-head checks | GitHub verify, dependency review, analyze, and CodeQL pass for the exact Stage A commit |
| Invariants | Package and lockfile hashes remain exactly approved baseline values |

The verifier must review the actual fixture graph and file-provisioning helper,
not only command exit status. It must confirm that a test fails for the
intended reason before the candidate correction and passes for the intended
reason afterward.

## Stage B verification matrix

After exact Stage A acceptance and a separate owner authorization, prove:

- the plan transition is legal against the accepted base;
- HK-001 is `ready`, incomplete, and still a release blocker;
- BLD-005 exactly matches the accepted planned toolchain contract;
- BLD-001 retains prior dependencies and also depends on BLD-005;
- protocol, verifier, owner, independence, and residual-risk records bind to
  immutable accepted evidence;
- only the plan and HK activation evidence change;
- the corrected self-test remains green without diagnostic overrides;
- package and lockfile hashes remain respectively
  `94c2e078d73203d5d77c71451cfd264ecd2b87bd7b4dd80bcf583a490294aa85`
  and
  `747067841cfa6c6cdef342bcc4088d53c0903d3b85f3e78cbc0c7fc16ea5441f`;
  and
- HK completion and stable release remain prohibited.

## Required evidence

Record exact commits, file SHA-256 values, patch scope, fixture inventory,
before-and-after diagnostics, case count and case names, all local command
outputs, exact-head CI URLs, audits, package invariants, separate
verifier-agent decision, independence limitations, residual risks, and the
subsequent owner decision.

No implementation, activation, cleanup, dependency-PR mutation, ref mutation,
repository-setting change, or release is authorized by this request.
