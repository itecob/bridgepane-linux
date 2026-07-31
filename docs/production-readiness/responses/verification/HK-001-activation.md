# Verification response: HK-001 Stage B activation

- **Response ID:** VRS-HK-001-B
- **Request:** VR-HK-001-B
- **Request commit:** `6ad41e95286f7294e71435ef4edf7e06f2a0fc81`
- **Architecture request SHA-256:**
  `80b148b1b2aa33166fee0dbbcb704043f08ff32f0f4020db144074d477047ec5`
- **Verification request SHA-256:**
  `02ff3c9ea6ad8b0c9ce10b4ce8731c74a3fe004e1fa25fee6e82eaa0d3069f51`
- **Architecture response:** ARS-HK-001-B
- **Architecture response commit:**
  `e372bd6e1001ea9359bf391c3bcbb8824c2277ba`
- **Architecture response SHA-256:**
  `e8429fd9a11740bc7109234518c9b88f9fe85067997c93ebc5c20cebf30ae5f8`
- **Prior rejected architecture response:**
  `4790602c341647cfe4d0a912dacdb7b65947829e`
- **Prior rejected architecture response SHA-256:**
  `805c0d77a76d849c33efe0b076041544b11ebdecf91e6516a59701a1d3255d20`
- **Verification rejection commit:**
  `0e83959b8e162ee6383df9c05ff493cc477eb3a5`
- **Verification rejection SHA-256:**
  `7445ec4e6a008f029449d625133a1896ca9476ed3469466e287fcfd8e778a7b6`
- **Accepted Stage A evidence head:**
  `d5b7af809c77c65f9d1c92dd5e7d606ece0c673d`
- **Accepted Stage A evidence SHA-256:**
  `194af5593159fe09928896636e1eb95cc228adcabc7b8ebf39d85b48decfbf75`
- **Owner protocol authorization:**
  https://github.com/itecob/bridgepane-linux/pull/11#issuecomment-5140048551
- **Verifier:** Codex role-separated verifier
- **Response date:** 2026-07-31
- **Decision:** accepted for owner preimplementation review with binding controls
- **Implementation authorized:** no

## Decision

Accept the corrected architecture response at
`e372bd6e1001ea9359bf391c3bcbb8824c2277ba` for human-owner
preimplementation review. It adopts all three controls required by the prior
verification rejection:

1. protocol, implementation, commit, and full-lineage scopes now name exact
   bases and distinguish four, two, and six paths;
2. B1 and B2 prohibit every identity derived from their own evidence bytes and
   use immutable post-publication verifier and owner comments; and
3. rollback is selected-base-aware, limits ordinary B1 reversion to an
   unmerged Stage A-based lineage, and requires a separately authorized forward
   `ready -> blocked` rollback with explicit BLD graph disposition after ready
   enters the selected base.

The accepted field-level HK, HANDOFF, BLD-005, BLD-001, date, evidence-prefix,
gate, negative-case, residual-risk, and stable-release controls remain intact.
This is protocol acceptance only. It does not authorize a plan or evidence
edit, B1, B2, HK activation, BLD creation, or any external mutation.

## Independently reproduced source state

The request and response documents have the recorded SHA-256 values above.
The owner comment authorizes only the four Stage B protocol-document paths and
explicitly prohibits plan, evidence, HK, BLD, package, dependency, workflow,
product, local, ref, PR, branch, setting, cleanup, and release mutations.

At corrected architecture response head
`e372bd6e1001ea9359bf391c3bcbb8824c2277ba`:

- the worktree is clean;
- the plan SHA-256 is
  `aab9a6af7ef376eedf11cd57183c9c82d454ee2f52223f630cefb04b23b024c8`;
- the Stage A evidence SHA-256 is
  `194af5593159fe09928896636e1eb95cc228adcabc7b8ebf39d85b48decfbf75`;
- `package.json` SHA-256 is
  `94c2e078d73203d5d77c71451cfd264ecd2b87bd7b4dd80bcf583a490294aa85`;
- `package-lock.json` SHA-256 is
  `747067841cfa6c6cdef342bcc4088d53c0903d3b85f3e78cbc0c7fc16ea5441f`;
- the plan contains 28 items and 25 open release blockers;
- status counts are 27 `planned`, zero `ready`, zero `in_progress`, zero
  `in_review`, zero `blocked`, and one `complete`;
- HK-001 is uniquely present, `planned`, incomplete, release-blocking, owned
  by `itecob`, and depends only on complete CTL-001;
- HK-001 still has the unresolved HANDOFF acceptance criterion and currently
  references absent historical `HANDOFF.md` plus `package-lock.json`;
- BLD-005 is absent;
- BLD-001 depends exactly on TST-002 then TST-004; and
- the package remains an alpha version and stable release is prohibited.

Direct validation passes with 28 items and 25 blockers. The complete accepted
self-test passes all 145 cases, including planned/ready/complete source
variance, exact-ID lookup, isolated dependency diagnostics, reference
provisioning, missing and unsafe references, containment, no-follow copying,
source-removal hermeticity, history selection, lifecycle, workflow, package,
and release cases.

The frozen candidate identities remain reproduction input only:

- plan SHA-256
  `cd58ffd9a1c306d2a8d460959bcb48a72148adb13f33279cd215117c8fbc00c7`;
- evidence SHA-256
  `7cfacb471b9245a783f143977c33d25612d20e1afcbd986d06de5bdfb92b321e`;
- tracked plan patch SHA-256
  `7717a5e36759ffaa8daed7ec14fad0df45f68cc14d34ad3d88218fd76aabb8f4`.

They are unaccepted, are not present as authorized implementation state, and
must not be applied, staged, deleted, cleaned, or used as evidence.

## Accepted target controls

Subject to a corrected transaction architecture, the following controls are
accepted.

### HK-001 target

B1 may locate exactly one HK-001 by ID and change only the explicitly accepted
fields. Array-position mutation is prohibited.

| Field | Accepted B1 target |
| --- | --- |
| `status` | `ready` |
| `releaseBlocker` | `true` |
| `owner` | `itecob` |
| `reviewer` | `null` |
| `dependsOn` | exactly `['CTL-001']` |
| `controls` | exactly `['SSDF-PS.1']` |
| `acceptanceCriteria` | byte-for-byte semantic preservation, including unresolved HANDOFF and PR obligations |
| `evidenceRequired` | unchanged |
| `references` | exactly `package-lock.json` and the committed HK-001 evidence path |
| `issue` | `null` |
| `completedAt`, `sourceCommit`, `blocker` | absent |

HK evidence may contain only the committed evidence path, accepted Stage A
commit URL, accepted preimplementation verifier-comment URL, and accepted
preimplementation owner-comment URL. Local paths must be committed, normalized,
regular, non-symlinked, contained, provisioned by fixtures, and semantically
required. External values must match the validator's immutable same-repository
URL grammar.

HK protocol must bind exact Stage B request and response IDs, paths,
publication commits, SHA-256 values, request revisions, and accepted decisions.
The initial verification review and authority approval bind the exact final
protocol head and immutable accepting comments. They are preimplementation
records and must not be described as B1 implementation verification.

The limitation must state exactly that one human is the authority and agent
process separation is not independent-human review. Residual risks must retain
all ten architecture-required statements, including Linux specificity,
same-UID race boundaries, generated merge-commit CI, dependency availability,
16 high build-tool findings, unresolved toolchain qualification, process-only
independence, HANDOFF obligations, irreversible historical-path disclosure,
and external evidence binding.

Set `updated` to the actual authorized implementation date. If that date is
not 2026-07-31, stop and obtain a revised date-bound owner decision; do not
backdate.

### HANDOFF deferral

The historical HANDOFF path is absent from the clean accepted checkout and
must not remain an active local reference. Removing it from `references` is
accepted only as reference hygiene. It does not satisfy or weaken the existing
acceptance criterion and does not claim reconciliation, preservation,
relocation, deletion, or public disclosure.

The appendix may record only the accepted historical SHA-256
`1ac18c92b9547357eea00b0dfc83f09074ed02957449d4a02722c8a8728905af`,
Git blob `4a74d96c82459f44ffca8941404bb2edb684d2bf`, historically untracked and
currently absent status, privacy-sensitive unresolved disposition, and prior
authority. It must not reproduce content or a private absolute path. Completion
remains blocked pending separately authorized private preservation,
classification, cleanup, and PR resolution.

The B1 owner decision must explicitly accept the irreversible public
historical-path disclosure residual. Silence or rejection blocks activation.

### BLD-005 and BLD-001

The complete BLD-005 JSON definition in ARS-HK-001-B is accepted exactly. It
matches the prior accepted HK architecture addendum: PH4, `planned`, owner
`itecob`, release-blocking, dependencies TST-002 then TST-004, four named
controls, six acceptance criteria, seven evidence requirements, five local
references, four residual risks, and null issue. Insert it immediately before
BLD-001. Stage B records the work; it does not research, solve, activate, or
complete BLD-005.

Append BLD-005 to BLD-001 dependencies, yielding exactly TST-002, TST-004,
BLD-005 in that order. No other BLD-001 field changes. This graph is acyclic,
uses only same-or-earlier phase dependencies, and is valid because both PH4
items remain planned.

The exact target has 29 items, 26 open blockers, 27 planned, one ready, no
in-progress/in-review/blocked items, and one complete item. Product stage and
package version remain alpha.

## Accepted corrected transaction controls

### 1. Separate lineage scope from implementation scope

At rejected response head `4790602c341647cfe4d0a912dacdb7b65947829e`, a diff
from Stage A head `d5b7af809c77c65f9d1c92dd5e7d606ece0c673d` already
contained three protocol paths. Publication of the prior verification response
added the fourth. The corrected architecture now defines all scopes exactly:

- protocol delta, Stage A head to final protocol head: exactly the two Stage B
  request paths and two Stage B response paths;
- B1 commit scope: exactly plan and HK evidence;
- implementation delta, final protocol head to B1: exactly plan and HK
  evidence;
- B2 commit scope: exactly HK evidence;
- implementation delta, final protocol head to B2: exactly plan and HK
  evidence; and
- full Stage B lineage delta, Stage A head to B1 or B2: exactly four protocol
  paths plus plan and HK evidence.

Every check must specify which base it uses. A two-path assertion against the
Stage A head is rejected. Unexpected paths, modes, renames, symlinks,
submodules, binary replacements, or protocol rewrites stop work.

### 2. Remove circular digest requirements

Neither B1 nor B2 may contain its own final evidence-file SHA-256, own Git blob,
own commit, own tree, or any patch digest that includes that same evidence
file. Labeling such a value “precommit” or “proposed” does not remove the
circularity.

The corrected evidence model is:

- B1 appendix records immutable input digests, the accepted Stage A evidence
  prefix digest, exact target plan digest, protocol and authorization records,
  commands, state, and a content specification; it does not claim B1 exists or
  record B1's final evidence or patch digest;
- after B1, the verifier and owner comments externally bind exact B1, parent,
  tree, blobs, final file digests, and patch digest;
- B2 may record those already-existing B1 identities and comments plus B1
  exact-head results;
- B2 does not contain its own final evidence/blob/patch/commit/tree digest; and
- terminal post-B2 verifier and owner comments externally bind exact B2,
  parent, tree, evidence blob and SHA-256, B2 patch digest, cumulative scopes,
  checks, residuals, and decision.

Any optional prepublication content digest must be defined over a separate,
immutable payload whose bytes do not contain that digest. It must not be
misrepresented as the final evidence-file or patch digest.

### 3. Make rollback base-aware

A normal revert of B2 to B1 evidence is permitted while the plan is unchanged.
A normal revert of B1 is accepted only on an unmerged activation lineage whose
validation base still contains the accepted Stage A `planned` ledger. Before
revert, prove the exact base-selection mode and selected base commit and prove
that the resulting plan validates as `planned` against that base.

If B1 or an equivalent ready ledger has become part of the selected base,
ordinary reversion to `planned` is prohibited: it is an illegal
`ready -> planned` transition and removes governance records protected after
activation. Require a separately architected, verified, and owner-authorized
forward rollback. At minimum it transitions HK legally to `blocked`, supplies
a blocker explanation, preserves accepted protocol/review/authority/
limitation/risk records and evidence history, and does not conceal external
comments. BLD-005 or graph disposition must be explicitly decided; it cannot
be silently erased. A later return to `planned` requires an accepted validator
or lifecycle design that lawfully represents it.

Remote comments remain audit history and receive correction comments after any
rollback. Reset, clean, history rewriting, force-push, ref deletion, broad file
removal, and evidence rewriting remain prohibited.

## Required B1/B2 verification

### Preimplementation owner gate

After architecture response `e372bd6e1001ea9359bf391c3bcbb8824c2277ba`
and this final verification response are immutable, the owner must name their
exact commits and SHA-256 values, final protocol head,
accepted Stage A base, actual date, exact B1 two paths, field-level HK target,
complete BLD-005 and BLD-001 graph, HANDOFF treatment, external-binding model,
corrected scope bases, rollback distinction, residual risks, irreversible
disclosure acceptance, and prohibitions. Comment 5140048551 is protocol-only
and is insufficient.

### B1 gates

Before editing and immediately before commit, prove:

- exact accepted base and final protocol ancestry;
- exact protocol and implementation scope definitions above;
- Stage A evidence is a byte-identical prefix followed by a clear delimiter;
- unique HK-001, BLD-005, and BLD-001 IDs and exact field targets;
- legal `planned -> ready` transition with a complete empty diagnostic set;
- exact reference closure and immutable URL manifest;
- all protocol working-tree and historical digests;
- 29-item, 26-blocker, and exact status counts;
- unchanged package, lockfile, workflow, dependency-tree, product, local,
  cleanup, ref, PR, branch, setting, and release state;
- exact package/lock/Stage A evidence invariants;
- direct validator, all 145 ordered fixtures, source variance, reference,
  containment, hermeticity, history, lifecycle, and stable-release rejection;
- local `npm run verify`, builds, tests, release checks, SBOM, production audit,
  and full audit where dependencies are available, with deviations stated; and
- no frozen-candidate byte, staging, deletion, or evidence reuse.

B1 commits plan and the preauthorization appendix atomically. Green CI alone
is insufficient. A separate verifier reviews the exact diff, graph, evidence
prefix, reference manifest, complete diagnostics, audits, and tested SHA.
Exact-head verify, dependency review, analyze, and CodeQL must pass. The owner
then accepts or rejects exact B1 and may authorize only the B2 evidence path.

### B2 and terminal gates

B2 appends only already-existing B1 identities, exact-head outputs, verifier
decision, owner B1 decision/B2 authorization, audits, deviations, and risks.
It does not alter the B1 plan or prior evidence bytes. Re-run direct validation,
145 fixtures, repository verification, audits, stable-release rejection, and
all exact-head checks. Verify B2 commit scope and both corrected cumulative
scope bases.

A terminal verifier comment and terminal owner decision must name exact B2,
its parent, evidence SHA-256/blob, patch digest, final scopes, check URLs,
limitations, and residuals. These external records end Stage B but do not
alter preimplementation plan authority, complete HK, authorize merge, or
authorize release.

## Mandatory negative matrix

The corrected protocol and implementation verification must reject complete
diagnostic sets for:

- HK missing, duplicate, `in_progress`, `in_review`, `complete`, blocked at
  activation, non-blocking, ownerless, assigned reviewer, completed source, or
  changed acceptance/evidence requirements;
- BLD-005 missing, duplicate, active, non-blocking, incomplete, reordered,
  solved, or different from the exact accepted field definition;
- BLD-001 missing or reordering TST-002, TST-004, or BLD-005, or changing any
  other field;
- unknown, self, cyclic, incomplete-status, or later-phase dependencies;
- stale request/response revision, request binding, decision, digest, path, or
  historical bytes;
- missing, duplicate, mutable, foreign, stale-commit, or misdescribed verifier
  and owner records;
- missing limitation, residual, irreversible-disclosure decision, or exact
  implementation date;
- unsafe, absent, uncommitted, absolute, traversal, symlinked, out-of-root,
  non-regular, unprovisioned, or semantically unnecessary local paths;
- reintroduction, content publication, private-path disclosure, reconciliation
  claim, or acceptance-criterion removal for HANDOFF;
- any Stage A evidence-prefix change;
- any self commit/blob/file/patch digest embedded in B1 or B2;
- use of a Stage A base for a two-file cumulative assertion, or use of a
  protocol-head base for a six-file lineage assertion;
- item, blocker, status, case count, ordered inventory, source variance,
  reference closure, audit, or package invariant drift;
- hidden or reclassified 16-high full-graph findings;
- unexpected file, mode, rename, symlink, submodule, binary, package,
  lockfile, workflow, dependency, product, cleanup, ref, PR, branch, setting,
  merge, release, or stable-state mutation;
- blind candidate reuse or candidate staging, deletion, cleaning, or mutation;
  and
- a B1 revert against a base that already contains HK ready, or any rollback
  that removes immutable accepted governance history.

Every negative assertion compares the complete emitted diagnostic set. Every
command, exit status, digest, selected base, path set, count, manifest, check,
URL, timestamp, deviation, and residual is recorded.

## Residual risks and limitations

The accepted target does not resolve:

- Linux-specific fixture, no-follow, FIFO, and containment behavior;
- malicious same-UID mutation outside the accepted pathname trust boundary;
- GitHub PR checks executing a generated merge commit while metadata binds the
  exact head;
- unavailable local dependencies where exact-head CI supplies coverage;
- 16 high-severity full dependency-graph build-tool findings;
- Node/npm/type/test compatibility until BLD-005 completes;
- agent-process rather than organizational or independent-human review;
- HANDOFF privacy, preservation, reconciliation, cleanup, and PR obligations;
- irreversible public historical-path disclosure;
- external terminal bindings required by evidence self-reference; and
- lifecycle rollback asymmetry after an active ledger becomes the selected
  base.

The response verifies protocol architecture only. No B1 or B2 bytes, commits,
checks, implementation verifier decision, or owner implementation decision
exist. This verifier is process-separated but not organizationally independent.

## Decision boundary

No statement in this response authorizes a plan or evidence edit, HK activation
or completion, BLD-005 creation or work, BLD-001 mutation, candidate
disposition, package operation, dependency change, cleanup, Git/ref/PR/branch/
setting mutation, merge, release, or stable publication.

Implementation remains blocked until this final response is committed and its
digest is recorded, an immutable verifier record accepts the exact final
protocol head, and the human owner issues a new exact preimplementation
authorization satisfying every gate in this response and the corrected
architecture.
