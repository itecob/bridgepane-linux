# Architecture response: HK-001 validator self-test lifecycle isolation

- **Response ID:** ARS-HK-001-VST-001
- **Request:** AR-HK-001-VST-001
- **Request commit:** `7fb07b272a4a0ec749f688e3143a0995563b53e5`
- **Architecture request path:**
  `docs/production-readiness/requests/architecture/HK-001-validator-self-test.md`
- **Architecture request SHA-256:**
  `85089b7d984a9e11797fb24fafa432d9f7c9ab73d381b5ade4ada8b784aa56ca`
- **Verification request:** VR-HK-001-VST-001
- **Verification request SHA-256:**
  `c0f6fea3f3f5ccb320f742e3b664e7f0dcaea4c0a15b80cf2bfa3ce65e3bdf6e`
- **Owner protocol authorization:**
  https://github.com/itecob/bridgepane-linux/pull/11#issuecomment-5118315822
- **Architect:** Codex independent architecture role
- **Response date:** 2026-07-29
- **Decision:** approve with required controls
- **Stage A implementation permitted:** no; immutable verification acceptance and
  subsequent exact owner implementation authorization are still required
- **Stage B implementation permitted:** no

## Decision

Approve a narrowly separated Stage A correction to the self-test fixture
architecture. The defect is in test construction: cases inherit lifecycle state
and repository contents from a mutable production ledger. Production validation
semantics are not defective and must not change.

Stage A has one implementation path:

- `scripts/validate-production-plan.mjs`

No production plan, package, lockfile, workflow, product, dependency, release,
repository setting, Git ref, or GitHub object may change in the Stage A
implementation commit. The committed production plan must retain HK-001 as
`planned`; BLD-005 must not exist; and BLD-001 must remain unchanged.

Stage A evidence is required, but it cannot be completed until the exact
implementation head and exact-head checks exist. If the owner authorizes
`docs/production-readiness/evidence/HK-001.md`, publish evidence as a subsequent
evidence-only slice bound to the immutable Stage A implementation commit. It is
not part of the validator implementation commit. The current uncommitted
activation evidence is diagnostic input and must not be reused as Stage A
evidence.

The frozen activation candidate remains prohibited from commit. Its plan,
evidence, and patch digests identify reproduced input only. Preserve it as a
patch or in its isolated worktree until disposition is authorized; do not reset,
clean, stage, commit, or silently reverse it.

## Trust boundary and invariant

```text
live checkout (untrusted mutable lifecycle state)
       |
       | schema/protocol shape only; no default lifecycle inheritance
       v
canonical fixture constructors in validator source
       |
       +-- explicit item IDs, states, graph, dates, owners, evidence
       |
       +-- allowlisted local-reference closure
                    |
                    | validate source -> copy exact bytes -> verify digest
                    v
             isolated temporary repository
                    |
                    | all validation resolves against fixture root only
                    v
          production validator under self-test
```

The test harness may read the source checkout only while constructing a fixture.
Once construction finishes, validation must remain correct if the source
checkout is unavailable. No resolver may fall back from the fixture root to the
live checkout.

## Stage A architecture

### 1. Canonical fixture model

Replace the mutable default seed with code-constructed, schema-valid canonical
seeds. A seed may reuse immutable field values from a parsed plan only after it
overwrites every field relevant to the rule being tested. It must never inherit
an item's status, lifecycle metadata, dependency edges, evidence bindings, or
local-reference availability by default.

Provide small constructors with explicit inputs rather than one shared mutable
fixture. At minimum the constructors must represent:

- a canonical valid alpha-plan envelope;
- a canonical work item selected by `id`;
- valid `planned`, `ready`, `in_progress`, `in_review`, and `complete`
  projections; and
- an isolated dependency graph.

Each constructor returns a fresh deep value. Tests must locate items with an
exact-ID helper that fails if an ID is absent or duplicated. Array-index
selection and cross-test fixture reuse are prohibited.

Lifecycle projection must set and clear all status-coupled fields explicitly:
owner, blocker, completion date, evidence, verifier, review, protocol, and
release-blocker metadata as required by the accepted schema. It must not rely on
whatever those fields contain in the source ledger. Completed projections use
synthetic fixture evidence and dates, never production completion evidence.

### 2. Explicit dependency seeds

Build each dependency case from an otherwise-valid isolated graph. Use exact IDs
`HK-001` for the dependency and `CTL-001` for the dependent, located by ID. In
this fixture only:

- `HK-001.dependsOn` is exactly `[]`;
- `CTL-001.dependsOn` is exactly `["HK-001"]`;
- no other item depends on either target;
- all non-target graph edges and phase conditions are seeded so they cannot
  produce diagnostics; and
- release remains an alpha version so stable-release logic is not incidental.

For each case, construct both target states explicitly. Do not obtain either
state by changing one field on the live item.

The required dependency matrix is:

| Dependency | Dependent | Expected result |
| --- | --- | --- |
| `planned` | `in_progress` | exact incomplete-dependency diagnostic naming `planned` |
| `planned` | `complete` | exact incomplete-dependency diagnostic naming `planned` |
| `ready` | `in_progress` | exact incomplete-dependency diagnostic naming `ready` |
| `ready` | `complete` | exact incomplete-dependency diagnostic naming `ready` |
| `complete` | `in_progress` | no dependency diagnostic |
| `complete` | `complete` | no dependency diagnostic |

The first four fixtures must contain no cycle. Each negative case asserts the
complete diagnostic set, not merely substring presence, so an unexpected cycle,
reference failure, phase failure, or second cause fails the case.

Existing cycle coverage remains a separate case with an intentionally seeded
cycle and an exact cycle diagnostic. Dependency-state and cycle tests must not
share a mutation.

### 3. Live-ledger variance

Add a wrapper matrix that presents source-ledger variants in which HK-001 is:

- canonical `planned`;
- canonical `ready`; and
- structurally valid `complete`.

For each source variant, run the full self-test suite from a fresh fixture. The
canonical test outcomes and case inventory must be identical. This proves the
harness does not import the source lifecycle state. A completed source variant
must populate every completion-coupled field legally; suppressing completion
validation is prohibited.

### 4. Hermetic reference provisioning

Use an allowlisted reference closure, not a recursive checkout copy and not an
arbitrary string scan. The allowlist is formed only from repository-relative
file fields already recognized by production validation, plus explicit harness
bootstrap files such as `package.json` and `package-lock.json` when the selected
fixture requires them. The collector must return a sorted, de-duplicated set so
fixture contents are deterministic and reviewable.

Before copying each reference, fail closed unless all of these conditions hold:

1. The value is a non-empty normalized repository-relative path.
2. It contains no NUL, absolute prefix, drive prefix, empty segment, `.` segment,
   or `..` segment after normalization.
3. Every source path component is inspected with `lstat`; no component or final
   object is a symbolic link.
4. The source `realpath` remains beneath the source repository root using a
   path-component-aware containment check, not a string-prefix check.
5. The source exists and is a regular file, not a directory, device, socket,
   FIFO, or other special type.
6. The destination path remains beneath the temporary repository root; existing
   destination components are not symlinks.
7. Parent directories are created inside that root only, and the destination is
   created without overwriting an unexpected existing object.
8. SHA-256 of the destination bytes equals SHA-256 of the source bytes after
   copy.

Missing or unsafe sources fail fixture construction with a specific diagnostic;
they are never omitted. The helper returns a manifest containing relative path,
type, byte count, and SHA-256 for evidence and assertions.

After provisioning, invoke validation with the temporary repository as its sole
root. A missing file in that repository must produce the normal production
missing-reference diagnostic. Reference checks must not receive a fixture-mode
exception.

### 5. Temporary and synthetic Git repositories

All temporary repository constructors, including pull-request, main-push,
local-merge-base, shallow-history, and historical-digest cases, use the same
canonical seed and safe provisioning helper. Each repository receives only the
files declared by its case and closure manifest. It must initialize its own Git
history, refs, identities, and environment without reading global mutable Git
configuration where an explicit value is available.

Synthetic commits use deterministic content and explicit parent topology. Tests
must select base and head by exact object ID, not current branch aliases. No
fixture command may fetch, contact a remote, mutate the live object database, or
write outside its temporary root.

Cleanup is limited to the exact harness-created temporary directory after its
resolved path is checked against the expected temporary parent. A failed case
must retain enough manifest and diagnostic information in captured output for
review without exposing credentials or unrelated checkout contents.

### 6. Production-semantics freeze

The correction may refactor self-test construction and self-test-only helpers,
but it must not alter production rules, accepted diagnostics, command-line
behavior, reference interpretation, base selection, transition policy,
historical digest policy, completion gates, workflow gates, package gates, or
stable-release prohibition.

Changing the expected lifecycle word from `planned` to `ready`, accepting both
words in one assertion, filtering extra diagnostics, disabling reference checks,
or special-casing HK-001 in production validation is rejected.

## Stage A verification matrix

The accepted verifier must inspect fixture code and graph construction in
addition to command results.

| Case | Required proof |
| --- | --- |
| Reproduction | Before correction, the frozen candidate produces the recorded ready-dependency, cycle, and missing-reference failures |
| ID safety | Missing and duplicate CTL-001 or HK-001 fail fixture construction; no target is selected by array index |
| Lifecycle seeds | Planned, ready, in-progress, in-review, and complete projections set/clear every coupled field explicitly |
| Planned dependency | Both active and completed dependents fail only for the planned dependency |
| Ready dependency | Both active and completed dependents fail only for the ready dependency |
| Complete dependency | Otherwise-identical active and completed dependents pass dependency validation |
| Cycle isolation | Dependency cases are acyclic; the dedicated cycle case still fails exactly for a cycle |
| Reference closure | The manifest is sorted, de-duplicated, contained, regular-file-only, and byte-identical |
| Provisioned reference | An active-item local reference validates using only its fixture copy |
| Missing reference | Removing that copy produces the exact normal missing-reference diagnostic |
| Unsafe paths | Absolute, traversal, NUL, symlink, wrong-type, missing-source, and out-of-root cases fail closed |
| Destination safety | Destination traversal, symlinked parents, overwrite, and out-of-root cases fail closed |
| Hermeticity | Validation succeeds after source access is removed or made unusable after provisioning |
| Source variance | Identical complete suite passes with source HK-001 planned, ready, and structurally complete |
| Existing semantics | Every prior named self-test remains and its assertion is no weaker |
| Git scenarios | PR, main-push, merge-base, shallow-history, history-digest, transition, completion, workflow, package, and release cases remain green |

Required local commands at the exact Stage A implementation head are:

```text
node scripts/validate-production-plan.mjs
node scripts/validate-production-plan.mjs --self-test
npm run verify
npm audit --omit=dev
```

Run any repository-defined full audit separately and record known build-chain
risk rather than concealing it. Record test and case counts before and after;
removing or renaming an existing case requires a reviewed one-for-one mapping.

Exact-head GitHub checks must include verify, dependency review, analyze/CodeQL,
and every required check configured for the branch. Package and lockfile SHA-256
must remain exactly:

- `package.json`:
  `94c2e078d73203d5d77c71451cfd264ecd2b87bd7b4dd80bcf583a490294aa85`
- `package-lock.json`:
  `747067841cfa6c6cdef342bcc4088d53c0903d3b85f3e78cbc0c7fc16ea5441f`

The Stage A scope check must prove the implementation commit changes only
`scripts/validate-production-plan.mjs`. A later, separately authorized evidence
commit may change only `docs/production-readiness/evidence/HK-001.md` and must
bind the implementation commit rather than alter its result.

## Required evidence

The evidence-only slice must record:

- request, response, verification-response, and owner-authorization immutable
  identities and digests;
- exact baseline, Stage A implementation, verification, and evidence commits;
- frozen candidate digests as reproduction input, clearly marked unaccepted;
- before-and-after complete diagnostic sets;
- fixture constructor inventory, explicit ID/state/graph matrix, and reference
  manifest;
- all new and retained case names and counts;
- exact command lines, exit status, and relevant output;
- exact-head GitHub check names, conclusions, commit identities, and URLs;
- implementation and evidence patch scopes;
- package and lockfile SHA-256 invariants;
- architect, implementer, verifier, human owner, and independence limitations;
- deviations, known full-audit build-chain findings, and residual risks; and
- the subsequent explicit owner acceptance or rejection.

Generated logs must be reviewed for credentials, tokens, absolute personal
paths, and unrelated repository contents before publication. A digest alone is
not evidence of semantic review.

## Stage A sequence and rollback

1. Preserve the frozen candidate identities and export its patch without
   staging or committing it.
2. In a clean Stage A worktree based on the accepted request/response lineage,
   confirm the committed plan still has HK-001 `planned` and that package hashes
   match.
3. Obtain immutable verification acceptance and exact owner authorization for
   the single validator path.
4. Implement and locally verify the validator correction.
5. Commit only the validator path and run exact-head CI.
6. Obtain independent verification of the exact commit.
7. After separate owner authorization, publish the evidence-only slice.
8. Obtain owner acceptance before beginning any activation request.

Rollback uses a reviewed `git revert` of the Stage A implementation commit and,
if necessary, a separate reviewed revert of the evidence commit. Destructive
reset, clean, history rewriting, force-push, deletion of the frozen candidate,
or reuse of its evidence is prohibited. A failed gate stops progression; it does
not authorize a broader correction.

## Stage B separation

Stage B is a new implementation transaction, not a continuation of Stage A. It
requires the accepted Stage A source commit, green exact-head checks, independent
verification, owner acceptance, a rebuilt activation evidence record, and a new
exact owner authorization.

Only Stage B may modify:

- `docs/production-readiness/plan.json`; and
- `docs/production-readiness/evidence/HK-001.md`.

Stage B must recreate rather than blindly apply the frozen candidate. It must
legally transition HK-001 from `planned` to `ready`, leave HK-001 incomplete and
release-blocking, add BLD-005 exactly as accepted, and add BLD-005 to
`BLD-001.dependsOn` without removing prior dependencies. Its evidence must bind
the accepted Stage A commit and corrected self-test results. The two approved
package hashes remain invariant, and stable release remains prohibited.

Validator repair and activation must never be squashed into one commit or one
acceptance decision. Failure or rollback of Stage A invalidates any proposed
Stage B evidence binding.

## Residual risks and required controls

- Code-constructed fixtures can diverge from the schema. Mitigate by validating
  every seed before mutation and retaining an explicit schema-field inventory.
- The allowlisted closure can omit a newly introduced local-reference field.
  Mitigate by keeping one canonical reference extractor shared with normal
  validation or by a completeness assertion that fails when an unclassified
  local-reference field is introduced.
- File-system containment behavior differs by platform. Stage A acceptance is
  Linux-specific; future cross-platform use requires platform-specific path and
  symlink cases.
- A source file can change between validation and copy. Open and copy from a
  validated descriptor where supported, then verify type and digest again;
  any mismatch fails the fixture.
- Git tests can inherit environment state. Explicitly set identities, config,
  paths, and object IDs, and prohibit network operations.
- One Codex verifier is process-independent but not organizationally
  independent. Record that limitation and retain human owner acceptance.
- The existing build-chain audit risk remains open. Stage A neither fixes nor
  accepts it and cannot advance stable-release status.
- The frozen uncommitted candidate can be accidentally staged. Verify clean
  Stage A scope before every commit and retain it only in its isolated worktree
  or a digest-bound patch.

## Acceptance conditions

This architecture is accepted for verification review only. Implementation
remains blocked until:

1. the response is immutable and its digest is recorded;
2. an independent verifier accepts this exact response against
   VR-HK-001-VST-001;
3. the human owner records exact path- and commit-bound Stage A authorization;
4. the clean Stage A base proves the production plan and package invariants; and
5. the current uncommitted activation candidate remains outside the Stage A
   commit.

No statement in this response authorizes HK-001 activation, completion, BLD-005,
dependency-PR mutation, repository-setting mutation, ref mutation, release, or
stable-version publication.
