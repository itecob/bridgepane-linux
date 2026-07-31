# Verification request: HK-001 lossless housekeeping

- **Request ID:** VR-HK-001
- **Work item:** HK-001
- **Requested by:** itecob
- **Requested on:** 2026-07-28
- **Status:** requested
- **Baseline:** merged `main` commit
  `bfab2ace4607a78597d557389fc785e2bba46791`
- **Target:** exact HK-001 commits, reconciled local state, PR dispositions, and
  immutable evidence

## Objective

Independently prove that HK-001 preserves all intentional work, rejects stale
or incompatible changes, resolves PRs 6, 7, and 8 without weakening
supply-chain policy, and leaves a reproducible clean baseline. Verification
must challenge both the architecture and implementer assertions.

## Pre-implementation review

Review AR-HK-001 and its architecture response for:

- destructive or implicit Git operations;
- merging the divergent local `main` tree instead of reconstructing intent;
- accidental staging or loss of untracked content;
- stale or moving Dependabot heads;
- grouped dependency upgrades that conceal which change caused a failure;
- lockfile regeneration under an undeclared Node or npm version;
- mutable Action tags presented as a security improvement;
- premature BLD-001, BLD-002, GOV-001, or GOV-002 work;
- a clean-baseline claim that ignores the user's original checkout;
- rollback that depends on reflogs, stashes, or undocumented local-only state.

Return accept, accept with required changes, or reject before implementation.

## Required Git verification

1. Record exact local and remote branch tips, upstreams, merge bases, worktrees,
   preservation refs, and `git fsck` results before and after.
2. Record patch IDs and tree or blob digests for `93cc2bb`, `622c43d`,
   `HANDOFF.md`, and every untracked deviation or response file.
3. Prove that no implementation step merges the old local `main` tree into
   current `main`.
4. If dependency intent is reconstructed, compare it path-by-path and
   package-by-package with `93cc2bb`; explain every retained and rejected
   hunk.
5. Prove each original commit and useful file remains recoverable until the
   replacement is merged and separately accepted.
6. Confirm the final claimed baseline is clean under the architecture's exact
   definition, with ignored generated output inventoried separately.

## Required dependency verification

For each accepted package change:

1. Identify the current, proposed, and rejected versions and the compatibility
   contract with Node 22, Electron 43, Electron Vite 5, Vite, TypeScript, jsdom,
   and the test stack.
2. Generate `package-lock.json` from the declared Node and npm versions only;
   reject unrelated lockfile churn.
3. Run `npm ci`, strict TypeScript checks, all tests, release validation,
   production-plan validation and fixtures, both builds, and applicable
   packaging smoke checks.
4. Run production and full-graph audits separately. Production must remain
   zero; changes to the known 16 high build-tool findings must be attributed
   package by package and may not be hidden by severity-only totals.
5. Generate and compare dependency trees and SBOMs for unexpected production
   surface.
6. Test package changes in isolated commits or matrices so a grouped failure is
   diagnosable.

## Required HANDOFF and file verification

- Classify each `HANDOFF.md` statement as unique/current, duplicated,
  superseded, stale, sensitive, or rejected.
- Verify every retained fact exists in one authoritative destination.
- Scan retained content for credentials, tokens, personal paths, private data,
  and unsafe diagnostic material.
- Before any removal, prove the original bytes and digest are preserved in the
  review evidence and that the owner authorized the accepted disposition.
- Compare untracked protocol files byte-for-byte with merged tracked files;
  never assume matching names imply matching content.

## Required PR verification

- Re-query PRs 6, 7, and 8 immediately before mutation and bind decisions to
  their exact head SHAs.
- For PR 6, reproduce or explain the failed verify result and prove that any
  replacement separates compatible from incompatible major updates.
- For PRs 7 and 8, inspect upstream release and security changes but reject
  merging mutable major tags as full-SHA pinning.
- A closed or superseded PR must receive a factual comment linking the accepted
  replacement, rejection rationale, or BLD-001 deferral.
- Verify no PR closure, rebase command, merge, or branch deletion occurs before
  owner authorization.

## Required end-to-end verification

- `npm run verify` passes locally and in exact-head CI.
- Dependency review and CodeQL pass.
- The plan still reports stable release blocked.
- CTL-001 remains complete and unchanged.
- HK-001 evidence identifies the exact source commit, environment, commands,
  local-state reconciliation, PR URLs, verifier decision, owner decision, and
  residual risks.
- A clean checkout from the final remote baseline reproduces verification.

## Failure conditions

Reject HK-001 for lost or unreachable work, destructive history edits, an
unexplained lockfile, grouped unbisectable upgrades, new production
vulnerabilities, reduced test coverage, mutable Action tags merged as a
pinning solution, unreviewed PR closure, stale facts presented as current,
credentials in evidence, dirty-state ambiguity, scope leakage into later
phases, or completion not bound to exact immutable evidence.

## Requested response

Return a pre-implementation decision, required changes, an exact verification
matrix, evidence requirements, independence limitations, residual risks, and
the owner gates required before local cleanup, dependency commits, PR
disposition, and HK-001 completion.
