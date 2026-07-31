# Verification response: HK-001 lossless housekeeping

- **Response ID:** VRS-HK-001
- **Request ID:** VR-HK-001
- **Request revision:** `e10aafb021ec3bec6c2410764b2f31c6d5291f17`
- **Architecture response:**
  `51883a7eab1cb791940d3506b0fb3dbd375bc3cb`
- **Architecture-response SHA-256:**
  `6d6c03c400e63e2382169e2e34d14b86d91a6750d1662098f265b440c3e93bb1`
- **Decision:** accepted with required changes; implementation blocked
- **Authority:** Role-separated verifier-agent review, not independent-human
  approval.

The lossless staged direction is sound, but the following gaps block owner
implementation authorization.

## Revalidated facts

- Request document digests match:
  - architecture:
    `02449eba862e3224cfa5fa332560acdf3dfeb6be47bd6de2383772cc08b599d6`;
  - verification:
    `59fc68edae5398e6065299e32d3a9180a81485f33f096383d408c31ea5a337e5`.
- Remote `main` is `bfab2ace4607a78597d557389fc785e2bba46791`.
- Local `main` remains at `93cc2bb`; the original checkout remains at
  `622c43d`.
- Both old lines merge-base with current main at `161439c`.
- Remote preservation refs remain at `622c43d` and `3bb70f6`.
- The original checkout contains exactly the four declared untracked files.
- The three protocol files have Git-blob identity equal to tracked merged-main
  copies.
- `HANDOFF.md` is 4,982 bytes with SHA-256
  `1ac18c92b9547357eea00b0dfc83f09074ed02957449d4a02722c8a8728905af`
  and Git blob `4a74d96c82459f44ffca8941404bb2edb684d2bf`.
- `git fsck` reports dangling commit
  `f3b4f356a9e47cadf5aaf6e0ba7ea810e71d3f17` and associated objects.
- Moving PR state:
  - PR 6 is open at
    `dfb03f28d5974a7326f13a94575694caa582e359`; exact-head
    `npm ci` fails on the Vite 8 and Electron Vite 5 peer conflict;
  - PR 7 is open at
    `225b70edf8d1786104aa5f10c6a377cb46c89fc8`; it proposes mutable
    `attest-build-provenance@v4`;
  - PR 8 is open at
    `d91154cf0f6eee48ca36c4f79573667f5c459621`; it proposes mutable
    `setup-node@v7`.

## Required architecture changes

### 1. HANDOFF privacy and uniqueness

“No unique durable fact” is not proven by category-level conclusions. The
documented smoke-test semantics appear absent from authoritative documentation
and require an explicit retain, extract, or reject decision.

Before archival or removal, produce a table for every HANDOFF statement with:

- line range;
- classification;
- authoritative destination and exact citation;
- stale or rejected rationale;
- privacy classification; and
- retained wording, if any.

Public archival defaults to prohibited until the owner separately accepts
permanent disclosure after automated scanning and manual privacy review. The
exact bytes contain local absolute paths at lines 7 and 86 and historical
operational and security state. A bounded pattern scan found no credential but
does not establish privacy safety.

If public archival is declined, preserve exact bytes in an owner-approved,
recoverable non-public location, record SHA-256 and Git-blob identity, prove
recovery, and retain the original until that proof passes.

### 2. Toolchain ledger item

Before activation, define the exact ID, phase, title, owner, dependencies,
release-blocker setting, acceptance criteria, evidence, references, controls,
residual risks, and planned status. HK-001 must not implement the correction.

### 3. Dependency matrix and policy reconstruction

Add the omitted `@types/jsdom` decision and bind compatibility claims to exact
lock metadata or authoritative upstream requirements.

Confirmed metadata:

- Vite 8 and plugin-react 6 require Node `^20.19 || >=22.12`;
- Electron Vite 5 supports only Vite 5 through 7;
- jsdom 30 requires Node `^22.22.2 || ^24.15 || >=26`;
- jest-dom 7 introduces Node 22 and
  `@testing-library/dom >=10 <11` contracts; and
- baseline already resolves `@types/node` 24 while declaring Node
  `>=22.0.0`.

The Dependabot reconstruction must be exactly the three-line minor and patch
grouping hunk. Major updates remain separately proposed, not accepted.

At every slice enforce:

- `package.json` SHA-256
  `94c2e078d73203d5d77c71451cfd264ecd2b87bd7b4dd80bcf583a490294aa85`;
- `package-lock.json` SHA-256
  `747067841cfa6c6cdef342bcc4088d53c0903d3b85f3e78cbc0c7fc16ea5441f`.

No `npm install`, lock regeneration, forced resolution, package edit, or
dependency PR merge is permitted.

### 4. Dangling-object disposition

For `f3b4f356`, record parent `350c48f`, tree `39deecb`, the six changed
paths, patch and tree digests, comparison with accepted CTL history, and a
retain or reject rationale.

Retention requires owner-approved named local and remote preservation refs
before cleanup and proof of reachability. Rejection requires explicit owner
authorization for eventual expiration after immutable evidence. Do not run or
trigger manual garbage collection.

### 5. Exact cleanup paths

The mutation packet must list all four files and every possible directory:

- `docs/production-readiness/deviations`;
- `docs/production-readiness/responses/architecture`;
- `docs/production-readiness/responses/verification`;
- `docs/production-readiness/responses`.

Immediately before mutation, repeat byte and blob checks. Remove only literal,
validated file paths. Remove directories deepest-first with non-recursive
`rmdir --`. Prohibit recursion, globs, variables, `git clean`, and broad
directory targets. Any non-empty-directory failure stops cleanup.

### 6. Clean-baseline definition

A branch ref without a worktree cannot be status-clean. Define:

- worktrees by exact HEAD and empty porcelain output;
- unattached local `main` by exact ref and tree identity plus documented
  intentional divergence;
- ignored files as separately inventoried;
- fresh remote checkout by clean status, exact final main, and full
  verification;
- original checkout by exact `622c43d` and no tracked or untracked changes
  after authorized cleanup; and
- retained objects and preservation refs by explicit reachability.

### 7. PR mutation race and upstream evidence

Each owner packet must bind PR number, exact head, proposed comment or digest,
close disposition, observed checks and files, rationale, and deferred ledger
link.

Required sequence:

1. Re-query state, head, files, and checks.
2. Post the approved comment.
3. Re-query again before close.
4. Stop on any mismatch.
5. Close without deleting the branch.
6. Re-query and record final state, head, and comment URL.
7. Reopen and escalate if a race produced an unapproved result.

Green historical checks do not qualify PRs 7 or 8 against current main. Add
authoritative upstream release and security-note evidence before deferral.

### 8. Cooling period

The two-hour period starts only after the final immutable implementation packet
and exact-commit verifier decision exist. No commits, cleanup, PR-head movement,
PR mutation, failed or rerun checks, or evidence change may occur. Any change
resets the clock. Record UTC start and end. Final owner completion approval
occurs only afterward.

## Exact verification matrix

| Gate | Required observation |
| --- | --- |
| Protocol identity | Exact request/response revisions and all three SHA-256 values |
| Initial topology | Worktrees, tips, merge bases, preservation refs, remote main, and fsck |
| Slice scope | Only authorized paths per commit; cumulative scope explained |
| Package drift | Exact package and lockfile hashes at every commit |
| Dependabot policy | Only minor and patch grouping; syntax and intent reviewed |
| Toolchain record | Exact owner-approved planned item; no implementation |
| HANDOFF | Line classification, privacy review, archive decision, and recovery proof |
| Protocol duplicates | SHA-256 and Git-blob equality immediately before deletion |
| Dangling commit | Immutable classification and preserve or expire decision |
| Local cleanup | Literal four-file inventory and explicit rmdir paths |
| PR 6 | Exact head, ERESOLVE transcript, matrix, comment, and closure evidence |
| PR 7 and 8 | Exact heads, upstream review, BLD-001 deferral, comments, and closures |
| Regression | npm ci, full verify, 22 tests, 107 fixtures, builds, and release validation |
| Supply chain | Production audit zero; 16 findings unchanged; tree and SBOM identity |
| CTL and HK | CTL complete and unchanged; only legal HK transitions |
| Final baseline | Clean fresh checkout and worktrees; ignored inventory separate |
| Cooling | Uninterrupted two-hour evidence and subsequent owner decision |
| Completion | Exact source, verifier, owner, evidence URLs, and blockers enforced |

## Owner gates

Separate exact decisions are mandatory for:

1. amended architecture and verification responses;
2. each implementation slice and path set;
3. public HANDOFF disclosure or non-public preservation;
4. dangling-commit preservation or eventual expiration;
5. literal local cleanup operations;
6. each PR comment and closure at a named head;
7. final verifier result and residuals after cooling; and
8. HK completion.

## Residuals

- Sixteen high build-tool findings remain release-blocking.
- Runtime, type-surface, and build-tool minimums remain inconsistent.
- Major dependency updates remain deferred.
- Mutable Action tags remain until BLD-001.
- Historical branches remain intentionally divergent.
- Public archival is irreversible.
- PR heads can move between observations.
- Sole-owner compromise or unavailability remains a governance risk.

No HK-001 implementation, local deletion, PR comment or closure, or completion
is authorized until these required changes are incorporated and the sole owner
accepts the exact final response commit.

## Final addendum decision

- **Reviewed corrective addendum:**
  `3a6199a549b2a22e5971f9b2eb1d84d34c23d131`
- **Corrective-addendum SHA-256:**
  `b200d34d1ef4f7ac9e2969aaa1c695ee8a851cb310d1a5008c73298a8e4d278e`
- **Final decision:** accepted for owner review

The corrective addendum closes the two remaining findings.

Canonical dangling-object evidence was reproduced:

- recursive tree-listing SHA-256:
  `1abdfe62f119760f52295b238b205c8bea80109f8c7064da35c2faa947cb28b2`;
- Git tree:
  `39deecb780a1cda3a9b9a4c8efc95585cd214c6d`;
- stable patch ID:
  `6997d04c9b6266f4c0d4082839496b5c8b94b212`.

Public cleanup specifications now use repository-relative paths. The literal
absolute execution root remains only in an owner-approved private packet.
Execution requires a physical, symlink-free root matching Git's top level,
exact original HEAD, containment, type, and digest checks. Only individual
`unlink --` and non-recursive `rmdir --` operations are permitted.

The architecture truthfully records that the earlier public revision
`be3ed1abb939cea19474cfe93c9e9859e514e4d6` irreversibly disclosed a
private absolute checkout path. Owner acceptance of that residual, or
separately authorized incident handling, is required before implementation.
History rewriting and claims that a later edit erases disclosure remain
prohibited.

No implementation occurred. Relative to merged baseline
`bfab2ace4607a78597d557389fc785e2bba46791`, the HK branch contains only
the accepted request and response documents. The plan, Dependabot policy,
README, packages, lockfile, workflows, dependencies, product code, original
local files, refs, dependency PRs, and repository settings remain unchanged.

### Owner-authorizable initial slice

After accepting the exact final response commit and the irreversible-disclosure
residual, the owner may authorize only:

- `docs/production-readiness/plan.json`;
- `docs/production-readiness/evidence/HK-001.md`.

The slice may legally activate HK-001, add planned BLD-005, add BLD-005 to
`BLD-001.dependsOn`, bind the accepted protocol and owner authorization, and
record residual risks. HK-001 must remain incomplete.

The slice may not modify README, Dependabot policy, packages, lockfile,
workflows, product code, HANDOFF, original local files, refs, PRs, branches, or
settings. This final decision is role-separated verifier-agent technical
review, not independent-human approval.
