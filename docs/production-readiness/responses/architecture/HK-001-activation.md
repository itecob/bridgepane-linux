# Architecture response: HK-001 Stage B activation

- **Response ID:** ARS-HK-001-B
- **Request:** AR-HK-001-B
- **Request commit:** `6ad41e95286f7294e71435ef4edf7e06f2a0fc81`
- **Architecture request SHA-256:**
  `80b148b1b2aa33166fee0dbbcb704043f08ff32f0f4020db144074d477047ec5`
- **Verification request:** VR-HK-001-B
- **Verification request SHA-256:**
  `02ff3c9ea6ad8b0c9ce10b4ce8731c74a3fe004e1fa25fee6e82eaa0d3069f51`
- **Accepted Stage A evidence head:**
  `d5b7af809c77c65f9d1c92dd5e7d606ece0c673d`
- **Accepted Stage A evidence SHA-256:**
  `194af5593159fe09928896636e1eb95cc228adcabc7b8ebf39d85b48decfbf75`
- **Owner protocol authorization:**
  https://github.com/itecob/bridgepane-linux/pull/11#issuecomment-5140048551
- **Architect:** Codex independent architecture role
- **Response date:** 2026-07-31
- **Decision:** accept with exact controls
- **Implementation authorized:** no

## Decision

Accept a two-commit Stage B evidence transaction with one atomic activation
boundary. The first commit must change the plan and append preauthorization
evidence together. The second commit may append exact-head results to the
evidence file only. Neither commit completes HK-001.

This response is protocol documentation. Implementation remains prohibited
until the verification response is committed and accepted and `itecob` issues
a new authorization bound to the exact protocol head, response digests,
accepted Stage A base, field-level target, and two permitted implementation
paths.

The earlier uncommitted candidate is reproduction input only. Its bytes,
patch, staging state, and evidence must not be used, deleted, or mutated by
Stage B. Reconstruct the target from accepted head
`d5b7af809c77c65f9d1c92dd5e7d606ece0c673d`.

## Transaction boundary

```text
accepted Stage A evidence head d5b7af8
       |
       +-- immutable Stage B requests
       +-- accepted architecture/verification responses
       +-- owner preimplementation authorization
       v
B1 atomic activation commit
  plan.json + append-only HK evidence
  HK planned -> ready; BLD-005 planned; no completion
       |
       +-- exact-head checks
       +-- independent implementation-verifier comment
       +-- owner acceptance of B1 and evidence-publication authorization
       v
B2 evidence-publication commit
  append-only HK evidence; plan byte-identical to B1
       |
       +-- exact B2 verifier comment
       +-- terminal owner acceptance comment
       v
Stage B accepted; HK remains ready and release-blocking
```

B1 is the activation instant. The ready ledger and the evidence that lawfully
exists before activation are one commit; they must never be separate. B2 does
not retroactively authorize B1 and cannot repair an unauthorized activation.
It records subsequent exact-head observations and acceptance.

An evidence file cannot contain the Git commit that contains itself, nor its
own final file digest. Do not use a placeholder, mutable branch, PR head, or
fabricated hash. B1 evidence binds the accepted base, protocol commits and
digests, preimplementation verifier record, owner authorization, target-file
precommit digests, and cumulative patch digest. B2 records the immutable B1
commit, B1 file/blob/patch digests, checks, verifier URL, and owner B1 decision.
B2 itself is terminally bound by immutable post-publication verifier and owner
comments naming the B2 commit and evidence SHA-256. No third evidence commit is
created merely to record those terminal comments.

## Exact implementation base and scope

Both commits must descend without history rewriting from accepted Stage A
evidence head `d5b7af809c77c65f9d1c92dd5e7d606ece0c673d` plus only the accepted
Stage B protocol-document commits. Before editing, compare the production
files to the accepted Stage A tree, not to the frozen candidate.

The cumulative Stage B diff from the accepted Stage A evidence head may name
exactly:

- `docs/production-readiness/plan.json`; and
- `docs/production-readiness/evidence/HK-001.md`.

B1 changes both paths. B2 changes only the evidence path. No mode, rename,
symlink, submodule, or binary replacement is permitted. Package, lockfile,
workflow, dependency, product, local cleanup, Git ref, PR, branch, repository
setting, and release state remain unchanged.

The accepted Stage A evidence must be retained byte-for-byte as the prefix of
the Stage B evidence file. Its historical SHA-256 remains
`194af5593159fe09928896636e1eb95cc228adcabc7b8ebf39d85b48decfbf75`.
Stage B adds clearly delimited appendices; it must not revise a Stage A word,
table, decision, limitation, or risk.

## Exact HK-001 target

All HK fields not listed as changed remain byte-for-byte semantically equal to
the accepted Stage A ledger. Locate exactly one item by ID; array-position
mutation is prohibited.

| Field | B1 target |
| --- | --- |
| `id` | `HK-001` |
| `phase` | `PH0` |
| `title` | unchanged |
| `status` | `ready` |
| `releaseBlocker` | `true` |
| `owner` | `itecob` |
| `reviewer` | `null` |
| `dependsOn` | exactly `["CTL-001"]` |
| `controls` | exactly `["SSDF-PS.1"]` |
| `acceptanceCriteria` | unchanged, including the unfulfilled HANDOFF and PR obligations |
| `evidenceRequired` | unchanged |
| `evidence` | the committed HK evidence path, accepted Stage A commit URL, preimplementation verifier URL, and preimplementation owner-authorization URL only |
| `references` | exactly `["package-lock.json", "docs/production-readiness/evidence/HK-001.md"]` |
| `issue` | `null` |
| `completedAt` | absent |
| `sourceCommit` | absent |
| `blocker` | absent |

The evidence URLs must match the validator's immutable same-repository URL
grammar. The accepted Stage A commit URL is:

`https://github.com/itecob/bridgepane-linux/commit/d5b7af809c77c65f9d1c92dd5e7d606ece0c673d`.

Set top-level `updated` to `2026-07-31`. If B1 cannot be created on the
authorized date, stop and obtain a revised date-bound authorization rather than
backdating or silently changing the target.

### Protocol and authority fields

HK-001 `protocol` must contain exactly two role pairs:

- architecture request ID `AR-HK-001-B`, revision
  `6ad41e95286f7294e71435ef4edf7e06f2a0fc81`, the request path, and SHA-256
  `80b148b1b2aa33166fee0dbbcb704043f08ff32f0f4020db144074d477047ec5`;
- architecture response ID `ARS-HK-001-B`, its exact publication commit,
  response path, final SHA-256, request revision `6ad41e...`, and decision
  `accepted`;
- verification request ID `VR-HK-001-B`, revision
  `6ad41e95286f7294e71435ef4edf7e06f2a0fc81`, the request path, and SHA-256
  `02ff3c9ea6ad8b0c9ce10b4ce8731c74a3fe004e1fa25fee6e82eaa0d3069f51`;
  and
- verification response ID `VRS-HK-001-B`, its exact publication commit,
  response path, final SHA-256, request revision `6ad41e...`, and decision
  `accepted`.

Each response `revision` is the commit in which that response path has its
declared bytes. Both working-tree and historical digests must match.

`verificationReviews` initially contains exactly the accepted
preimplementation verifier record. Its `role` is `verifier-agent`, decision is
`accepted`, `reviewedCommit` is the exact verification-response/protocol head,
and URL is the immutable repository comment that accepts that head. This is a
protocol review, not a false claim of B1 implementation verification.

`authorityApproval` initially contains exactly the post-response
preimplementation owner decision: owner `itecob`, decision `accepted`, date in
`YYYY-MM-DD`, `reviewedCommit` equal to the same protocol head, and its immutable
repository comment URL. That owner comment must explicitly authorize B1's
accepted base, exact two paths, field-level transformation, BLD-005 contract,
HANDOFF-reference treatment, known risks, and prohibitions.

Set `independenceLimitations` exactly to:

- `One human authority; agent-process separation is not independent-human review`.

Set `residualRisks` to retain at least these distinct statements:

- fixture path and no-follow controls are Linux-specific;
- a malicious same-UID actor remains outside the accepted pathname-race trust boundary;
- pull-request CI executes GitHub's generated merge commit while checks must also bind the exact head;
- local dependency installation may be absent and must be supplied by exact-head CI without changing the lockfile;
- 16 high-severity full-graph build-tool findings remain open and release-blocking;
- Node/npm/type/test-tool compatibility remains unqualified until BLD-005 completes;
- agent-process verifier separation is not independent-human review;
- HANDOFF privacy, preservation, reconciliation, and cleanup obligations remain incomplete;
- a private checkout path was historically disclosed publicly and cannot be erased by later file edits; and
- evidence cannot embed the commit containing itself and therefore requires terminal external bindings.

The preimplementation owner decision must explicitly accept or reject the
irreversible historical-path disclosure risk required by the accepted HK
addendum. Rejection or silence blocks B1.

## HANDOFF deferred obligation

`HANDOFF.md` is absent from the clean accepted checkout. Remove it from active
`references`; retaining it would make the active item invalid. Do not copy,
publish, recreate, delete, inspect, or claim reconciliation of its contents in
Stage B.

Append only this identity and disposition to evidence:

- historical SHA-256
  `1ac18c92b9547357eea00b0dfc83f09074ed02957449d4a02722c8a8728905af`;
- historical Git blob `4a74d96c82459f44ffca8941404bb2edb684d2bf`;
- source status: historically untracked and absent from the accepted clean
  checkout;
- disposition: deferred, unresolved, privacy-sensitive, and required before
  HK completion; and
- authority: the prior accepted HK architecture and addenda, without copying
  the private bytes or a private absolute path.

The existing HANDOFF acceptance criterion remains unchanged. Removing an
unsafe reference is not reconciliation, preservation, relocation, removal of
the historical source, or satisfaction of that criterion. Later non-public
recovery, classification, cleanup, or public disclosure requires its own owner
packet and authorization.

## Exact BLD-005 definition

Insert BLD-005 immediately before BLD-001 in the PH4 item sequence. Locate all
items by exact unique ID. BLD-005 is:

```json
{
  "id": "BLD-005",
  "phase": "PH4",
  "title": "Align the Node, npm, type-definition, and test-tool compatibility contract",
  "status": "planned",
  "releaseBlocker": true,
  "owner": "itecob",
  "reviewer": null,
  "dependsOn": ["TST-002", "TST-004"],
  "controls": ["SSDF-PS.1", "SSDF-PW.4", "SSDF-PW.6", "SLSA-BUILD-L2"],
  "acceptanceCriteria": [
    "One supported Node range and exact release-build Node and npm pair are documented and enforced",
    "package.json.engines satisfies every direct build and test tool's authoritative engine requirement",
    "@types/node matches the tested minimum runtime or an enforced API check prevents use of newer-only APIs",
    "Node types, jsdom types, jsdom, TypeScript, Vite, plugin-react, Electron Vite, and the test stack have a reviewed compatibility matrix",
    "CI rejects unsupported Node and npm combinations and tests every advertised source-build combination",
    "The declared toolchain reproduces the lockfile without unexplained dependency-tree or SBOM drift"
  ],
  "evidenceRequired": [
    "Authoritative package metadata manifest with retrieval time, URL, response digest, and package integrity",
    "Node/npm and peer compatibility matrix",
    "Positive CI matrix and unsupported-version negative tests",
    "npm ls and npm explain output",
    "Lockfile, normalized dependency-tree, and SBOM comparison",
    "Production and full-graph audits",
    "Verifier-agent decision and owner approval"
  ],
  "evidence": [],
  "references": [
    "package.json",
    "package-lock.json",
    ".github/workflows/ci.yml",
    ".github/workflows/release.yml",
    "docs/RELEASING.md"
  ],
  "residualRisks": [
    "Newer-only type APIs",
    "Package engine floors above the declared runtime floor",
    "Package-manager lock drift",
    "Unqualified current development-stack production contract"
  ],
  "issue": null
}
```

This exactly accepts the requested compatibility contract. Stage B records it;
it does not research, solve, test, or complete it.

Change BLD-001 `dependsOn` from exactly `["TST-002", "TST-004"]` to exactly
`["TST-002", "TST-004", "BLD-005"]`. Appending preserves accepted order.
No other BLD-001 field changes.

B1 must yield exactly 29 items, 26 open release blockers, and status counts
`planned=27`, `ready=1`, `in_progress=0`, `in_review=0`, `blocked=0`,
`complete=1`. Product stage remains `alpha`; stable version and release remain
prohibited.

## Evidence appendices

### B1 preauthorization appendix

Append to the exact accepted Stage A evidence bytes:

- Stage B request/response IDs, paths, publication commits, SHA-256 values, and
  decisions;
- accepted Stage A implementation/evidence commits and evidence digest;
- preimplementation verifier and owner records and their exact protocol head;
- exact two-path authorization and all non-goals;
- the field-level HK, BLD-005, and BLD-001 target;
- HANDOFF identity and explicitly deferred disposition;
- before/target item counts, blocker counts, statuses, reference closure, and
  package invariants;
- frozen-candidate identities labeled unaccepted and unused;
- implementation roles, process-only independence limitation, residual risks,
  and rollback/stop rules; and
- pre-edit and precommit command results, complete diagnostics, candidate file
  SHA-256 values, and cumulative binary-patch SHA-256.

The precommit evidence must not claim that B1 exists, passed exact-head CI, or
was independently implementation-verified.

### B2 exact-head appendix

After B1 exact-head verification and owner acceptance, append only:

- exact B1 commit, parent, tree, two changed blob IDs, file SHA-256 values,
  binary-patch digest, and cumulative two-file scope;
- legal-transition output against the accepted base;
- complete direct-validator and 145-case self-test results and case inventory;
- source-variance/reference-provisioning results;
- `npm run verify`, build, tests, release-policy, SBOM, and audit results;
- exact-head check names, tested SHAs, conclusions, run/job URLs, and timestamps;
- verifier implementation decision URL and owner B1 acceptance/authorization
  URL;
- production-audit zero and the separately reported 16-high full-graph result;
- unchanged package, lockfile, workflow, dependency, and product identities;
- stable-release rejection, deviations, stop-condition observations, and
  residual-risk acceptance; and
- B2 proposed file SHA-256 and patch digest, without claiming its future commit.

After B2 publication, the verifier and owner bind its exact commit and final
evidence SHA-256 in immutable comments. Those comments are the terminal
external evidence. They do not modify the plan's preimplementation
`authorityApproval` and do not authorize HK completion.

## Required sequence and gates

### Before any edit

1. Verify exact accepted Stage A evidence head, request commit, request file
   digests, owner protocol comment, and accepted Stage A evidence digest.
2. Verify plan SHA-256
   `aab9a6af7ef376eedf11cd57183c9c82d454ee2f52223f630cefb04b23b024c8`,
   28 items, 25 blockers, HK planned, no BLD-005, and BLD-001 dependencies
   exactly TST-002 then TST-004.
3. Verify package SHA-256
   `94c2e078d73203d5d77c71451cfd264ecd2b87bd7b4dd80bcf583a490294aa85`
   and lockfile SHA-256
   `747067841cfa6c6cdef342bcc4088d53c0903d3b85f3e78cbc0c7fc16ea5441f`.
4. Verify the accepted 145-case suite and Stage A exact-head evidence.
5. Commit and independently accept this response and the Stage B verification
   response.
6. Obtain the new owner preimplementation decision described above. Existing
   comment `5140048551` authorizes protocol documents only and is insufficient.

### B1 precommit

1. Reconstruct only the two files from the accepted base.
2. Prove the Stage A evidence is an exact byte prefix and the reference closure
   contains only committed, safe local paths.
3. Compare candidate state to every field-level target and negative rule.
4. Run direct validation, all 145 fixtures, and `npm run verify` without package
   installation or mutation beyond already available dependencies.
5. Record full and production audits without concealing the known 16 highs.
6. Confirm cumulative diff, modes, and binary patch name exactly two paths;
   confirm package, lockfile, workflows, dependencies, product, refs, PRs,
   settings, cleanup, and release state did not change.
7. Stop on any mismatch; otherwise commit both files atomically.

### B1 postcommit

1. Recompute commit, parent, tree, blobs, file and patch digests, counts, and
   cumulative scope.
2. Rerun local gates from the exact commit.
3. Run exact-head GitHub verify, dependency review, analyze, and CodeQL.
4. A separate verifier inspects the actual diff, complete diagnostics,
   reference closure, and checks, then posts an immutable exact-B1 decision.
5. The owner accepts or rejects exact B1. Acceptance may authorize only the B2
   evidence path and exact appendix content class.

### B2 publication and terminal gate

1. Append the exact-head appendix; do not alter the B1 plan or prior evidence.
2. Verify B2 cumulative scope still names only the two accepted paths and its
   commit scope names evidence only.
3. Re-run direct validation, all fixtures, `npm run verify`, audits, and
   exact-head required checks for B2.
4. A separate verifier posts a terminal decision naming exact B2 and final
   evidence digest.
5. The owner posts terminal acceptance or rejection naming the same identities.
   Acceptance ends Stage B but leaves HK ready and incomplete.

## Verification matrix

| Gate | Required observation |
| --- | --- |
| Base | Exact accepted Stage A head, plan/evidence/package/lock digests and source state |
| Scope | B1 exactly two files; B2 evidence only; cumulative exactly two files |
| Transition | Only legal HK `planned -> ready`; all complete diagnostic sets empty |
| HK state | Unique HK ID, ready, owner-bound, incomplete, release-blocking, unchanged criteria |
| Protocol | Exact request/response IDs, revisions, paths, digests, decisions and request bindings |
| Authority | Immutable preimplementation verifier and owner records bind exact protocol head and disclose process-only independence |
| References | Every active local reference and protocol path is normalized, committed, regular, provisioned, digest-correct and non-symlinked |
| HANDOFF | Absent reference removed; identities and deferred obligation retained without content publication or completion claim |
| BLD-005 | Unique, exact accepted definition, planned, release-blocking, and unsolved |
| BLD-001 | Dependencies exactly TST-002, TST-004, BLD-005; no other field change |
| Counts | 29 items, 26 open blockers, 27 planned, one ready, one complete |
| Stage A | Accepted evidence remains a byte-identical prefix and historical digest remains reproducible |
| Validator | Direct validation and all 145 fixtures, exact inventory, source variance, closure, containment, hermeticity, lifecycle and history cases pass |
| Repository | Package, lockfile, workflow, dependency, product, cleanup, refs, PRs, branches, settings and releases unchanged |
| Audits | Production audit zero; 16 high full-graph build-tool findings explicitly remain open |
| CI | Exact-head verify, dependency-review, analyze and CodeQL succeed for B1 and B2 |
| Release | Product remains alpha and stable-release validation explicitly rejects publication |
| Evidence | B1 and B2 appendices contain exact identities, outputs, limitations, deviations, risks and immutable external decisions |

Verification must explicitly reject HK `in_progress`, `in_review`, `complete`,
non-blocking, ownerless, or assigned-reviewer state; missing or duplicate HK or
BLD-005; BLD-005 active, non-blocking, incomplete-schema, or solved; reordered,
missing, unknown, self, cyclic, incomplete-status, or cross-phase-invalid
dependencies; missing TST-002, TST-004, or BLD-005 on BLD-001; stale protocol
revisions/digests; mutable or foreign URLs; missing authority, limitation, or
risk records; unsafe, absent, uncommitted, absolute, traversal, symlinked, or
unprovisioned references; evidence-prefix rewrite; candidate-byte reuse;
fixture inventory regression; hidden/reclassified audit findings; any third
path or external mutation; stable product state; and any completion claim.

Every negative assertion compares the complete diagnostic set. Green CI alone
is insufficient; the verifier reviews the field diff, graph, reference
manifest, evidence prefix, and tested SHA.

## Rollback

Before B1, rollback is no mutation: preserve and abandon the candidate after an
owner decision. After B1 but before B2, rollback is a reviewed revert of B1,
which atomically returns both plan and evidence to the Stage A state. After B2,
rollback uses reviewed reverts in reverse order: B2 first, then B1. Recompute
the base-aware validator and all invariants after each revert.

Never reset, clean, rewrite history, force-push, delete refs or branches, mutate
the frozen candidate, broadly remove files, or use an evidence edit to disguise
rollback. Remote comments remain audit history and must receive a correction
comment if their authorized state is reverted.

## Stop conditions

Stop without broadening scope for any:

- base, ancestry, request/response revision, digest, owner URL, or accepted
  Stage A evidence mismatch;
- missing/duplicate target ID, field, count, ordering, dependency, or protocol
  mismatch;
- evidence prefix change or self-referential/placeholder identity;
- missing, changed, unsafe, uncommitted, symlinked, or unprovisioned reference;
- plan, evidence, package, lockfile, workflow, dependency-tree, product, audit,
  fixture-inventory, or stable-release invariant mismatch;
- unexpected path, file mode, rename, submodule, binary file, Git/ref/PR/branch,
  setting, cleanup, or release mutation;
- failed, skipped, cancelled, stale-SHA, pending, or rerun required check;
- verifier rejection, owner silence/rejection, insufficient disclosure-risk
  acceptance, or changed protocol after authorization; or
- attempt to stage, apply, delete, clean, or treat the frozen candidate as
  accepted input.

A stop requires a new bounded request and owner decision. It does not authorize
a shortcut, repair in place, or wider implementation.

## Residual decision

The proposed activation is representable by the accepted schema and validator
only under the two-commit/external-terminal-binding model above. It deliberately
does not claim organizationally independent review, cross-platform fixture
assurance, full local dependency execution, build-chain vulnerability closure,
toolchain compatibility, HANDOFF reconciliation, repository cleanliness, PR
resolution, HK completion, or release readiness.

No Stage B implementation, plan/evidence edit, candidate disposition, package
operation, cleanup, Git/ref/PR/branch/settings mutation, BLD-005 work, HK
completion, merge, release, or stable publication is authorized by this
response.
