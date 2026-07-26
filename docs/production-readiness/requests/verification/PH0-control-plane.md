# Verification request: PH0 control plane and housekeeping

- **Request ID:** VR-PH0-001
- **Work items:** CTL-001, HK-001, GOV-001, GOV-002
- **Requested by:** itecob
- **Requested on:** 2026-07-26
- **Status:** requested
- **Target:** final PH0 commit and live GitHub configuration

## Objective

Independently determine whether PH0 creates a lossless, reviewable, fail-closed
control plane. Verification challenges the architecture and does not rely on
implementer assertions.

## Pre-implementation review

Review the architecture request and response for destructive history operations,
mixed PR scope, administrator or Actions bypasses, mutable build inputs,
duplicated status, unverifiable acceptance, weak rollback, and single-maintainer
assumptions that defeat independent release approval.

Return approve, approve with required changes, or block.

## Required automated verification

1. `npm run verify` passes on the exact final commit.
2. Plan validation reports no schema, dependency, phase, owner, request,
   response, reference, or evidence errors.
3. Negative fixtures fail for:
   - stable version with an open blocker;
   - active work without architecture and verification requests;
   - implementation without accepted responses;
   - unknown or cyclic dependencies;
   - completion without independent review and evidence;
   - missing issue linkage after GOV-002 completes.
4. Each PR diff contains only declared work-item scope.
5. Required CI executes from a clean checkout.

## Required Git verification

- Record `git fsck`, branch tips, merge bases, and patch IDs before and after.
- Prove `93cc2bb` and `65ad9ea` remain reachable remotely.
- Prove useful `HANDOFF.md` information was preserved or deliberately rejected
  before removal and that the file was never staged accidentally.
- Confirm a clean baseline and no shared-history rewrite.

## Required GitHub verification

- Export effective `main` and `v*` rules.
- Test or simulate direct push, force-push, tag mutation, missing check,
  unresolved conversation, and unapproved release failure paths.
- Verify PR workflows are read-only and cannot access release credentials.
- Verify private vulnerability reporting and the SECURITY.md path.
- Verify release-environment reviewer and deployment restrictions.
- Verify every non-planned item has one issue link back to the ledger without a
  second status field.
- Verify PRs 6, 7, and 8 match the accepted disposition.

## Evidence required

Final commit and branch URLs, PR and issue inventory, redacted ruleset and
environment exports, command transcripts, immutable CI links, negative-test
outputs, before/after branch topology, reviewer identity, limitations, and
residual risk.

## Failure conditions

Fail PH0 for lost work, prose-only controls, ordinary-path bypass, mutable Action
references, excess workflow privilege, completion without requests/responses/
evidence, silent ledger drift, unreproducible verification, or evidence that
does not identify the exact code and configuration tested.

## Requested response

Return decision, required changes, exact evidence plan, independence limits, and
mapping to CTL-001, HK-001, GOV-001, and GOV-002.
