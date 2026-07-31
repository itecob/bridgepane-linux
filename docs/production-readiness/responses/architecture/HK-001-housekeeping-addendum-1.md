# Architecture addendum: HK-001 verifier-required controls

- **Addendum ID:** ARS-HK-001-A1
- **Original request:** `e10aafb021ec3bec6c2410764b2f31c6d5291f17`
- **Architecture response:** `51883a7eab1cb791940d3506b0fb3dbd375bc3cb`
- **Architecture-response SHA-256:**
  `6d6c03c400e63e2382169e2e34d14b86d91a6750d1662098f265b440c3e93bb1`
- **Verification response:** `a65f85cba3d7f24918618db94fb2d977375d0c04`
- **Verification-response SHA-256:**
  `950a56ed5c378eee28e793b9a6ed17dfba9118b169e0e0b4c0a66df90b68b059`
- **Decision:** accepted with required controls
- **Authority:** Agent architecture review only. Implementation remains
  blocked until the verifier accepts this addendum and `itecob` authorizes
  the exact response commit.

This addendum supersedes conflicting portions of `51883a7`, especially public
HANDOFF archival, incomplete cleanup paths, and the underspecified toolchain
item.

## HANDOFF statement classification

Implementation evidence must reproduce this table with line range,
classification, exact authoritative citation, retain/extract/reject decision,
rationale, privacy class, and retained wording.

| Lines | Decision and authoritative treatment |
| --- | --- |
| 1–3 | Reject session title and date as transient metadata. |
| 7 | Reject local absolute path as private environment data. |
| 8 | Duplicate; bind to `package.json.repository` and `homepage`. |
| 9 | Reject dynamic repository state; live default-branch evidence is authoritative. |
| 10–13 | Duplicate; bind name, description, license, and version to package metadata and README release status. |
| 15–17 | Duplicate; bind to README disclaimer and NOTICE. |
| 21–26 | Reject stale synchronization and baseline state. |
| 28–30 | Duplicate; bind to README release status, RELEASING, and DEPENDENCY_RISK. |
| 32–40 | Reject historical verification snapshot; immutable CI evidence is authoritative. |
| 42–43 | Reject mutable settings snapshot; GOV-001 exports are authoritative. |
| 47 | Duplicate mode introduction; bind to README architecture. |
| 49 | Duplicate; bind to README and PRIVACY ChatGPT-session descriptions. |
| 50 | Duplicate; bind to README Codex architecture. |
| 52–55 | Duplicate; bind to PRIVACY, SECURITY, and authentication policy. |
| 57–59 | Duplicate; bind to README plugin and OpenClaw sections. |
| 63 | Reject session-oriented instructional preface. |
| 65 | Duplicate; bind to SECURITY remote-content boundary. |
| 66 | Duplicate; bind to PRIVACY and SECURITY partition requirements. |
| 67–68 | Duplicate; bind to `desktop/main/security.ts` and threat-model navigation control. |
| 69 | Duplicate; bind to threat-model external-link control. |
| 70–71 | Duplicate; bind to SECURITY IPC and sandbox boundary. |
| 72–73 | Duplicate; bind to SECURITY credential stripping. |
| 74 | Duplicate; bind to SECURITY login policy. |
| 75 | Duplicate; bind to threat-model plugin invocation control. |
| 76 | Duplicate; bind to SECURITY and Linux sandbox policy. |
| 77–78 | Duplicate; bind to threat-model RPC mapping and fail-closed behavior. |
| 80–81 | Reject session instructions; the production workflow is authoritative. |
| 86 | Reject private absolute path. |
| 87 | Duplicate development command; bind to README development instructions. |
| 88 | Duplicate; bind to production-readiness README verification instructions. |
| 89 | Retain only through corrected smoke semantics below. |
| 90 | Duplicate; bind to README development instructions. |
| 93–94 | Unique; retain by extraction with corrected smoke semantics. |
| 99–100 | Duplicate; bind to package scripts and release documentation. |
| 103 | Duplicate; bind to package build output and release documentation. |
| 104 | Duplicate; bind to README and release policy for experimental AppImage. |
| 108–109 | Reject moving PR state. |
| 110–112 | Duplicate; bind to DEPENDENCY_RISK. |
| 113–115 | Duplicate; bind to dependency-risk rejected remediation. |
| 116–118 | Duplicate; bind to RELEASING. |
| 122–128 | Duplicate; bind to README and package metadata. |
| 129–130 | Duplicate; bind to gitignore, SECURITY, and contributor policy. |
| 134 | Reject self-reference to the retiring file. |
| 135 | Reject dynamic session-start instruction. |
| 136 | Duplicate command guidance; it is not current-result evidence. |
| 137–138 | Duplicate; bind to README release status and the ledger. |

### Authoritative smoke semantics

Extract this meaning into the README development and smoke section:

> `npm run smoke` launches the configured local Codex binary's real
> app-server, initializes it, calls `account/read` without refreshing a
> token, requires an existing ChatGPT OAuth account, emits selected platform
> and authentication metadata, and then stops the child. It does not start a
> model turn. Passing this smoke test does not prove Linux sandbox
> availability, command execution, model access, or full application
> compatibility.

This wording is bound to `scripts/smoke.ts`.

## HANDOFF privacy and recovery

Public archival of the exact HANDOFF bytes is prohibited by default. Do not add
the contents to Git history, a PR comment, a public artifact, or committed
evidence.

The preferred path is non-public preservation:

1. Copy the exact 4,982 bytes to an owner-controlled location outside every Git
   worktree and outside `/tmp`.
2. Restrict access to the owner.
3. Preserve SHA-256
   `1ac18c92b9547357eea00b0dfc83f09074ed02957449d4a02722c8a8728905af`
   and Git blob `4a74d96c82459f44ffca8941404bb2edb684d2bf`.
4. Restore to a temporary test location, recompute both identities, and compare
   byte-for-byte.
5. Public evidence records only an opaque archive identifier, hashes, date,
   recovery result, and owner decision—not the private path or contents.
6. Keep the original until recovery succeeds.

Public preservation instead requires a separate irreversible-disclosure packet,
automated secret scan, manual line-level privacy review, exact proposed public
path, and explicit owner approval. If neither path is accepted and proven,
`HANDOFF.md` remains untouched and HK-001 cannot complete.

## Planned toolchain ledger item

Add exactly:

- **ID:** BLD-005
- **Phase:** PH4
- **Title:** Align the Node, npm, type-definition, and test-tool compatibility contract
- **Status:** planned
- **Release blocker:** true
- **Owner:** itecob
- **Reviewer:** null
- **Dependencies:** TST-002 and TST-004
- **Controls:** SSDF-PS.1, SSDF-PW.4, SSDF-PW.6, SLSA-BUILD-L2
- **References:** `package.json`, `package-lock.json`,
  `.github/workflows/ci.yml`, `.github/workflows/release.yml`, and
  `docs/RELEASING.md`

Acceptance criteria:

1. One supported Node range and exact release-build Node and npm pair are
   documented and enforced.
2. `package.json.engines` satisfies every direct build and test tool's
   authoritative engine requirement.
3. `@types/node` matches the tested minimum runtime or an enforced API check
   prevents use of newer-only APIs.
4. Node types, jsdom types, jsdom, TypeScript, Vite, plugin-react, Electron
   Vite, and the test stack have a reviewed compatibility matrix.
5. CI rejects unsupported Node and npm combinations and tests every advertised
   source-build combination.
6. The declared toolchain reproduces the lockfile without unexplained
   dependency or SBOM drift.

Evidence required:

- authoritative package metadata manifest with retrieval time, URL, response
  digest, and package integrity;
- Node/npm and peer compatibility matrix;
- positive CI matrix and unsupported-version negative tests;
- `npm ls` and `npm explain` output;
- lockfile, normalized dependency-tree, and SBOM comparison;
- production and full-graph audits; and
- verifier-agent decision and owner approval.

Residual risks: newer-only type APIs, package engine floors above the declared
runtime floor, package-manager lock drift, and an unqualified current
development-stack production contract.

Add BLD-005 to `BLD-001.dependsOn` without removing existing dependencies.
HK-001 records this item only.

## Dependency metadata and invariants

Add `@types/jsdom` to the decision matrix: baseline declaration and resolution
28.0.3; dependencies `@types/node: "*"`, `undici-types: ^7.21.0`,
`parse5: ^8.0.0`, and `@types/tough-cookie: "*"`; no peer or engine range.
Retain unchanged while BLD-005 resolves wildcard Node-type coupling.

Every compatibility statement binds to exact lock metadata and
publisher-controlled registry or official release metadata with retrieval UTC
and content SHA-256. Record:

- Electron Vite 5 accepts Vite 5–7 and requires Node
  `^20.19 || >=22.12`;
- Vite 7.3.6 requires Node `^20.19 || >=22.12`;
- Vite 8.1.5 has that Node floor but is outside Electron Vite 5's peer range;
- plugin-react 6.0.4 requires Vite 8;
- jsdom 27.4.0 requires Node `^20.19 || ^22.12 || >=24`;
- jsdom 30 requires Node `^22.22.2 || ^24.15 || >=26`;
- jest-dom 7 requires Node 22 and testing-library DOM 10; and
- the baseline resolves Node 24 types while declaring Node `>=22.0.0`.

The only Dependabot change is literally:

```yaml
        update-types:
          - minor
          - patch
```

No other whitespace, ordering, ecosystem, schedule, limit, or grouping change
is permitted. Major updates remain separately proposed, not accepted.

At the beginning and end of every slice require:

- `package.json` SHA-256
  `94c2e078d73203d5d77c71451cfd264ecd2b87bd7b4dd80bcf583a490294aa85`;
- `package-lock.json` SHA-256
  `747067841cfa6c6cdef342bcc4088d53c0903d3b85f3e78cbc0c7fc16ea5441f`.

Any mismatch stops work. Package installation, lock regeneration, forced
resolution, package edits, and dependency-PR merges are prohibited.

## Dangling f3b4f356 preservation packet

Record:

- commit `f3b4f356a9e47cadf5aaf6e0ba7ea810e71d3f17`;
- parent `350c48f042da85f54af058aafb03c06a189a55b2`;
- tree `39deecb780a1cda3a9b9a4c8efc95585cd214c6d`;
- stable patch ID `6997d04c9b6266f4c0d4082839496b5c8b94b212`;
- tree-listing SHA-256
  `4bf5de88816f30a0b8924caa1714ee20c5b83284aa2905e07fc23d1862c12d64`;
- the six changed paths: production-readiness README, CTL evidence, evidence
  README, plan, package manifest, and plan validator; and
- blob, tree, and stable-patch comparisons with `ae61ca2`, `c873e7b`,
  and merged CTL history.

Fail-safe disposition is retain. After owner authorization, create without
force:

- local `preservation/hk-001-dangling-f3b4f356-20260728`;
- remote `preservation/hk-001-dangling-f3b4f356-20260728`.

Prove both resolve to the exact commit and that a fresh fetch reads the commit,
parent, tree, and six blobs. Do not trigger garbage collection. Rejection and
eventual expiration require a separate owner decision.

## Literal cleanup packet

Immediately before cleanup, prove the original checkout remains at `622c43d`,
contains exactly the four reviewed untracked files, and repeat all byte, blob,
and tracked-copy comparisons.

Only literal `unlink --` operations for these files are permitted:

- `/home/itecob/bridgepane-linux/HANDOFF.md`;
- `/home/itecob/bridgepane-linux/docs/production-readiness/deviations/CTL-001-pre-workflow.md`;
- `/home/itecob/bridgepane-linux/docs/production-readiness/responses/architecture/PH0-control-plane.md`;
- `/home/itecob/bridgepane-linux/docs/production-readiness/responses/verification/PH0-control-plane.md`.

HANDOFF may be unlinked only after recovery or approved public archival. The
protocol files require immediate reconfirmation of tracked blob identity.

Then attempt only non-recursive `rmdir --`, deepest-first, on:

- `/home/itecob/bridgepane-linux/docs/production-readiness/deviations`;
- `/home/itecob/bridgepane-linux/docs/production-readiness/responses/architecture`;
- `/home/itecob/bridgepane-linux/docs/production-readiness/responses/verification`;
- `/home/itecob/bridgepane-linux/docs/production-readiness/responses`.

Any failure stops cleanup. Recursion, globs, variables, substitutions, broad
targets, `git clean`, stash-only recovery, and directory-deletion tools are
prohibited.

## Correct clean-baseline semantics

- Worktrees require recorded exact HEAD and empty
  `git status --porcelain=v2 --untracked-files=all`.
- The HK worktree must be clean at the exact final source.
- The original checkout must remain at `622c43d` and become porcelain-empty
  only after authorized cleanup.
- Local `main` has no worktree. Record exact ref `93cc2bb`, tree,
  merge-base `161439c`, and intentional divergence; do not call it clean.
- Ignored files are inventoried separately and neither deleted nor treated as
  source changes.
- A fresh checkout must resolve exact final remote main, be porcelain-empty,
  and pass `npm ci` and full verification.
- Preservation refs and retained commits require local and remote reachability
  proof. Dangling objects remain separately reported until classified.

Clean does not mean synchronized, current, garbage-collected, or free of ignored
output.

## PR owner packet and race control

Each PR packet records number and URL, base and exact base SHA, head and
observation UTC, state and mergeability, complete files and blob identities,
every check and tested SHA, exact comment text and digest, disposition,
rationale, failure or compatibility evidence, authoritative upstream evidence,
deferred ledger links, and owner decision and authorization URL.

For PRs 7 and 8, upstream evidence includes official release notes,
tag-to-commit resolution, `action.yml`, runtime and interface changes, and
official advisories. Dependabot prose is insufficient.

Execute independently for each PR:

1. Re-query state, base, head, files, and checks.
2. Compare with the approved packet.
3. Post the exact approved comment and verify its digest.
4. Re-query state, base, head, files, and checks.
5. Stop on mismatch.
6. Close without deleting the branch.
7. Re-query and record final state and comment.
8. Reopen immediately and escalate on an unapproved race.

Batch closure is prohibited.

## Two-hour cooling period

The clock starts at the latest of the final immutable implementation and
evidence packet, all required checks becoming successful, and the exact-commit
verifier decision being posted. Record UTC start and earliest end.

Reset for any commit or branch change; source, plan, evidence, digest, protocol,
risk, or owner-packet change; failed, cancelled, skipped, new, or rerun required
check; verifier change; main movement or base/mergeability change; cleanup;
preservation-ref mutation; PR 6, 7, or 8 state change; new relevant advisory; or
unrecorded remote mutation. Identical read-only observation does not reset it.

Final owner completion approval occurs only after uninterrupted cooling and
binds the unchanged source and evidence.

## Amended repository paths

Permitted implementation paths are limited to:

- `.github/dependabot.yml`;
- `README.md`;
- `docs/production-readiness/plan.json`;
- `docs/production-readiness/evidence/HK-001.md`;
- `docs/production-readiness/evidence/HK-001/dependency-decisions.md`;
- `docs/production-readiness/evidence/HK-001/handoff-classification.md`;
- `docs/production-readiness/evidence/HK-001/reconciliation.json`;
- `docs/production-readiness/evidence/HK-001/dangling-f3b4f356.md`; and
- accepted HK response and addendum paths.

Package files, workflows, dependencies, product code, and repository settings
remain prohibited.

## Owner gates

Separate owner decisions are required for:

1. this addendum and corresponding verifier response;
2. BLD-005 creation and dependency wiring;
3. each implementation slice and exact path set;
4. HANDOFF non-public recovery or public disclosure;
5. dangling-commit preservation or expiration;
6. the literal cleanup packet;
7. each PR comment and closure packet; and
8. final residual risks, cooling evidence, and HK completion.

No implementation, archive publication, ref creation, local cleanup, PR
mutation, or completion is authorized until the applicable gate is recorded.
