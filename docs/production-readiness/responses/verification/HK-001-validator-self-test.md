# Verification response: HK-001 validator self-test lifecycle isolation

- **Response ID:** VRS-HK-001-VST-001
- **Request:** VR-HK-001-VST-001
- **Request commit:** `7fb07b272a4a0ec749f688e3143a0995563b53e5`
- **Verification request path:**
  `docs/production-readiness/requests/verification/HK-001-validator-self-test.md`
- **Verification request SHA-256:**
  `c0f6fea3f3f5ccb320f742e3b664e7f0dcaea4c0a15b80cf2bfa3ce65e3bdf6e`
- **Architecture response:** ARS-HK-001-VST-001
- **Architecture response commit:**
  `e048bac626414ca73155250d77a5a1910f7904dd`
- **Architecture response path:**
  `docs/production-readiness/responses/architecture/HK-001-validator-self-test.md`
- **Architecture response SHA-256:**
  `c5424d8ce51cf796d2775b59cf8205a7d63aedd86bf0dc77a71ba2335b00ea61`
- **Owner protocol authorization:**
  https://github.com/itecob/bridgepane-linux/pull/11#issuecomment-5118315822
- **Verifier:** Codex role-separated verifier
- **Response date:** 2026-07-29
- **Decision:** accepted with binding controls; implementation remains blocked
- **Authority:** protocol review only; not human-owner implementation
  authorization

## Decision

Accept the architecture response for an independently authorized Stage A only.
The reproduced defect is in self-test fixture construction, not production-plan
validation. The architecture correctly separates validator repair from HK-001
activation and preserves production dependency, reference, history, lifecycle,
completion, workflow, package, and release semantics.

This acceptance is conditional on every control and verification requirement in
this response. Stage A implementation is not authorized by the cited owner
comment: that comment authorizes protocol documents only and requires a later
owner decision bound to the exact accepted protocol commit. Stage B is not
accepted or authorized by this response.

## Independently reproduced facts

The frozen, uncommitted activation candidate has these identities:

- `docs/production-readiness/plan.json` SHA-256:
  `cd58ffd9a1c306d2a8d460959bcb48a72148adb13f33279cd215117c8fbc00c7`;
- `docs/production-readiness/evidence/HK-001.md` SHA-256:
  `7cfacb471b9245a783f143977c33d25612d20e1afcbd986d06de5bdfb92b321e`;
- tracked plan patch SHA-256:
  `7717a5e36759ffaa8daed7ec14fad0df45f68cc14d34ad3d88218fd76aabb8f4`.

With that candidate, direct validation passes with 29 items, 26 open release
blockers, HK-001 `ready`, and CTL-001 `complete`. The self-test fails its
incomplete-dependency case with the complete observed diagnostic set:

```text
CTL-001 is complete while dependency HK-001 is ready
dependency cycle includes CTL-001
HK-001 references missing local path package-lock.json
```

The case expects a `planned` dependency because its default seed is the mutable
live plan. It mutates CTL-001 to depend on HK-001 without first isolating both
targets' graph and lifecycle states, which introduces the cycle. Temporary and
synthetic repositories copy production-readiness documents and create
`package.json`, but do not provision all active-item local references; later Git
fixtures consume the same mutable ledger. Therefore changing one expected word
would leave both the multi-cause fixture and later synthetic cases defective.

No safe plan-and-evidence-only correction exists. Removing the lockfile
reference would weaken the accepted record and would not remove lifecycle-state
coupling. Leaving HK-001 `planned` would avoid the trigger rather than repair
the harness.

The frozen candidate identities are reproduction input only. They are not
accepted implementation evidence and must not be staged, committed, reset,
cleaned, or rebound blindly to a later stage.

## Accepted architecture controls

The following controls are accepted and binding:

1. Stage A changes only `scripts/validate-production-plan.mjs` in its
   implementation commit. The committed plan keeps HK-001 `planned`, contains
   no BLD-005, and leaves BLD-001 unchanged.
2. Stage A uses fresh canonical fixture constructors. No default test seed may
   inherit lifecycle state, status-coupled metadata, dependency edges, evidence
   bindings, or local-reference availability from the live ledger.
3. Fixture targets are located by exact ID with missing-ID and duplicate-ID
   failures. Array-position selection is prohibited.
4. Each dependency case explicitly creates HK-001 and CTL-001 states and an
   acyclic graph. Planned, ready, and complete dependency behavior is tested
   independently from the dedicated cycle case.
5. Every negative fixture asserts its complete diagnostic set. Unexpected
   cycles, references, phase failures, or secondary causes fail the test.
6. Temporary and synthetic Git repositories use a sorted, de-duplicated,
   allowlisted local-reference closure and resolve validation paths only from
   the fixture root.
7. Provisioning fails closed for missing, absolute, drive-prefixed, NUL,
   traversal, non-normal, symlinked, non-regular, overwrite, and out-of-root
   sources or destinations. Copied bytes are digest-verified.
8. Normal missing-reference validation remains active in every mode. No
   fixture-mode bypass, fallback to the live checkout, diagnostic filtering, or
   HK-001 special case is permitted.
9. Pull-request, main-push, merge-base, shallow-history, historical-digest,
   transition, completion, workflow, package, and release fixtures use the same
   canonical construction and hermetic provisioning controls.
10. Production validator behavior, diagnostics, command-line behavior, history
    selection, lifecycle and completion gates, package gates, and stable-release
    prohibition remain unchanged.
11. Stage A implementation and evidence are separate transactions. Any later
    evidence-only change requires separate owner authorization and binds the
    immutable Stage A implementation head.
12. Stage B is a new transaction after Stage A implementation, exact-head CI,
    independent verification, evidence, and owner acceptance. It must recreate
    the activation change against the accepted Stage A base rather than blindly
    reuse the frozen candidate.

## Rejected implementations and interpretations

Reject Stage A if it does any of the following:

- changes an expected lifecycle word from `planned` to `ready`, accepts either
  value, or suppresses unexpected diagnostics;
- clones the current production plan as a default fixture and repairs only the
  presently failing mutation;
- selects CTL-001, HK-001, or another semantic target by array position;
- combines dependency-status and cycle failures in one fixture;
- skips reference validation, silently omits an unsafe or missing source, or
  resolves a missing fixture path against the live checkout;
- recursively copies the checkout or accepts reference paths without explicit
  classification and containment checks;
- weakens or removes an existing semantic case or assertion without an
  reviewed one-for-one mapping;
- changes the plan, HK evidence, packages, lockfile, workflows, dependencies,
  product code, release state, repository settings, Git refs, or GitHub state;
- commits Stage A evidence with the validator implementation; or
- combines validator correction and HK activation in one commit, pull request,
  verification result, or owner decision.

## Exact Stage A implementation boundary

The implementation commit may change exactly:

```text
scripts/validate-production-plan.mjs
```

It must be based on a clean, immutable accepted protocol lineage. Before work,
record the base commit, confirm HK-001 is `planned`, confirm BLD-005 is absent,
confirm BLD-001 is unchanged, and confirm the package invariants below. The
uncommitted activation candidate must remain outside this worktree and commit.

The implementation must provide:

- fresh canonical plan and item constructors;
- explicit lifecycle projections for `planned`, `ready`, `in_progress`,
  `in_review`, and `complete`, setting or clearing every coupled field;
- exact-ID lookup that rejects missing and duplicate IDs;
- isolated dependency fixtures with `HK-001.dependsOn = []` and
  `CTL-001.dependsOn = ["HK-001"]` and no incidental target edges;
- a deterministic, reviewable reference manifest containing relative path,
  regular-file type, byte count, and SHA-256;
- fail-closed source and destination path validation, safe copy, and byte
  verification before validation begins;
- fixture-root-only resolution after provisioning;
- deterministic, network-free synthetic Git repositories with explicit
  identities, topology, base and head object IDs, and bounded cleanup; and
- an inventory of every retained and new named self-test case.

Where the architecture allows immutable source-plan field reuse, acceptance is
narrowed: each fixture must prove that every field capable of affecting the
case's validation result is explicitly constructed or overwritten. Merely
calling a parsed production field “immutable” is insufficient.

## Exact Stage A verification requirements

Independent verification of the implementation commit must inspect the code,
fixture graph, lifecycle projections, reference collector, copy routine, and
synthetic repository setup. Exit status alone is insufficient.

### Dependency and lifecycle matrix

| Dependency | Dependent | Required observation |
| --- | --- | --- |
| `planned` | `in_progress` | only the exact planned-dependency diagnostic |
| `planned` | `complete` | only the exact planned-dependency diagnostic |
| `ready` | `in_progress` | only the exact ready-dependency diagnostic |
| `ready` | `complete` | only the exact ready-dependency diagnostic |
| `complete` | `in_progress` | no dependency diagnostic |
| `complete` | `complete` | no dependency diagnostic |

Each of the first four graphs must be acyclic. The dedicated cycle fixture must
still fail with only its expected cycle diagnostic. Missing or duplicate target
IDs must fail fixture construction.

### Reference and hermeticity matrix

Verification must prove:

- the closure is allowlisted, sorted, de-duplicated, and complete for every
  recognized active-item repository-relative reference field;
- a provisioned active HK-001 `package-lock.json` reference validates from its
  copied fixture bytes;
- deleting only the fixture copy produces the exact normal
  `HK-001 references missing local path package-lock.json` diagnostic;
- missing-source, absolute, drive-prefixed, traversal, NUL, symlinked component,
  symlinked final object, directory, wrong-type, overwrite, destination
  traversal, symlinked destination parent, and source or destination
  out-of-root cases fail closed with their intended diagnostics;
- path containment is component-aware rather than string-prefix based;
- source and destination SHA-256 values match after copy; and
- validation remains green after source-checkout access is removed or made
  unusable after provisioning.

### Source variance and regression matrix

Run the complete self-test inventory from fresh fixtures with source-ledger
HK-001 independently projected to structurally valid `planned`, `ready`, and
`complete` states. The same cases and assertions must pass in each run.

Record before-and-after case names and counts. Every prior semantic fixture,
including all 107 baseline cases, must remain or have an explicitly reviewed
one-for-one mapping with assertions no weaker than before. Pull-request,
main-push, local merge-base, shallow-history, historical-digest, lifecycle,
completion, workflow, package, audit, build, and stable-release scenarios must
remain green.

At the exact Stage A implementation commit, run and record complete output and
exit status for at least:

```text
node scripts/validate-production-plan.mjs
node scripts/validate-production-plan.mjs --self-test
npm run verify
npm audit --omit=dev
```

Also run every repository-defined test, build, release-validation, and full
audit command exercised by the baseline verification workflow. Known
build-chain audit findings must be reported as residual risk, never hidden by
changing dependencies or audit policy in this slice.

Exact-head GitHub checks must include verify, dependency review,
analyze/CodeQL, and every required branch check. Evidence must bind each check
name, conclusion, URL, and exact Stage A commit. A green run on another commit
does not satisfy this gate.

The implementation patch must show only the accepted validator path. The
following SHA-256 invariants must remain exact:

- `package.json`:
  `94c2e078d73203d5d77c71451cfd264ecd2b87bd7b4dd80bcf583a490294aa85`;
- `package-lock.json`:
  `747067841cfa6c6cdef342bcc4088d53c0903d3b85f3e78cbc0c7fc16ea5441f`.

## Evidence and limitations

The Stage A evidence packet must include exact protocol and owner identities,
base and implementation commits, patch scope, package hashes, fixture and case
inventories, before-and-after complete diagnostics, reference manifests,
command outputs, exact-head check URLs, deviations, audits, verifier identity,
and residual risks. Logs must be manually reviewed before publication for
credentials, tokens, personal absolute paths, and unrelated checkout content.

This response verifies architecture, not implementation. No corrected source,
green corrected suite, exact-head CI, or implementation evidence exists yet.
Linux path and symlink behavior is the accepted Stage A platform boundary;
cross-platform support requires separate platform-specific verification.
Code-constructed fixtures may drift from schema and reference-field inventory;
seed validation and a fail-closed completeness assertion remain mandatory.
File replacement races remain a risk unless copy operates from a validated
descriptor where supported and rechecks type and digest. Synthetic Git tests
can inherit environment state unless configuration is explicit. A separate
Codex role is process-separated but not organizationally independent, so the
human owner remains the final authority.

## Owner gate and sequence

Before any Stage A source edit, the owner must record a new decision bound to:

1. request commit `7fb07b272a4a0ec749f688e3143a0995563b53e5`;
2. architecture response commit
   `e048bac626414ca73155250d77a5a1910f7904dd` and its recorded SHA-256;
3. the immutable commit containing this verification response and its recorded
   SHA-256; and
4. the single authorized implementation path
   `scripts/validate-production-plan.mjs`.

After implementation, a different verifier decision must bind the exact Stage
A implementation commit and all local and exact-head evidence. A separate
owner decision must accept that result. Publishing an evidence-only slice then
requires its own exact authorization. Stage B requires a fresh architecture,
verification, implementation, evidence, and owner gate against the accepted
Stage A lineage.

No current authorization permits editing the validator, committing the frozen
activation candidate, activating or completing HK-001, adding BLD-005,
modifying BLD-001, changing packages, lockfiles, workflows, dependencies,
product code, local files, refs, GitHub objects, repository settings, or release
state. Any failed or widened gate stops progression and requires a new reviewed
decision.
