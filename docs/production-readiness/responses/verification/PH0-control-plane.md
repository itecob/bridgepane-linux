# Verification response: PH0 control plane and housekeeping

- **Response ID:** VRS-PH0-001
- **Request:** VR-PH0-001
- **Request commit:** `622c43ded20b5b485be4ccd9c5b39e4bc5fbf72d`
- **Verifier:** Codex independent verification role
- **Response date:** 2026-07-26
- **Decision:** approve with required changes
- **Human acceptance owner:** itecob
- **Implementation permitted:** only publication of the response-pair branch and
  process PR needed for human acceptance; no PH0 implementation

## Decision

The request-freezing defect is resolved: the agentic workflow, architecture
request, verification request, and templates are committed. The index was clean
at review time; only `HANDOFF.md` remained untracked and absent from Git.

The amended architecture response satisfies the substantive design requirements.
PH0 implementation remains blocked until the exact response pair is committed
and receives digest-bound human acceptance. Only a non-destructive response-
publication branch push and process PR are authorized before that acceptance.
Preservation refs, settings, housekeeping, governance, and product mutations
remain prohibited. CTL-001 predates the workflow and is recorded at
`docs/production-readiness/deviations/CTL-001-pre-workflow.md` rather than
retroactively described as compliant.

## Required changes before implementation

1. Record exact request revision, decision, named roles, rollback, residual risks,
   and human acceptance for both responses.
2. Follow the amended architecture exact preservation refs and clean-origin
   sequence without rebase, force-push, deletion, or pruning: preserve `622c43d`
   and `3bb70f6`, replay only `93cc2bb..65ad9ea` for CTL-001, and later
   replay only `161439c..93cc2bb` for HK-001 with path and patch assertions.
3. Hash `HANDOFF.md`, classify every durable and stale claim, preserve valid
   facts in governed evidence, then deliberately remove or replace it.
4. Extend the ledger and validator with architecture request/response,
   verification request/response, accepted status, issue link, exact source SHA,
   evidence, owner/reviewer independence, and deviation fields.
5. Make validation base-aware so it detects illegal status transitions, weakened
   criteria, request mutation, and evidence weakening across commits.
6. Resolve the conflict between PH0's immutable-Action failure condition and
   BLD-001's later phase. Action SHA pinning and release least privilege must
   move into PH0 or the PH0 contract must be superseded.
7. Resolve single-maintainer governance before GOV-001 completion with a backup
   maintainer, independent approval, stale-review dismissal, no normal-path
   administrator/Actions bypass, and audited emergency access.
8. Commit the exact response pair as commit R, publish only the process branch
   and PR, obtain owner review identifying R and all four request/response
   digests, then commit acceptance record A referencing R. All other remote and
   local PH0 mutations wait for acceptance.

## Required validator fixtures

Isolated negative fixtures must assert the specific failure for:

- stable version with an open blocker;
- active work missing either request or response;
- response not accepted or bound to stale request/source;
- request mutation after implementation begins;
- unknown, self, or cyclic dependencies;
- incomplete dependency or earlier blocking phase;
- active work without one named owner;
- completion with owner equal to reviewer;
- completion without date, exact source SHA, evidence, or immutable evidence URL;
- missing or malformed local evidence;
- GOV-002 complete with zero, duplicate, malformed, or shared tracking issues;
- duplicate work-item, phase, or phase order;
- direct illegal status transition;
- weakened criteria, blocker status, or evidence requirements;
- mutable workflow `uses:` reference;
- PR workflow with write, secret, OIDC, attestation, or publication capability;
- release job without a protected environment;
- path traversal or repository-external plan reference.

Positive fixtures must cover every legal transition and a genuinely complete
stable-release scenario.

## Required evidence

### Automated

Run from a fresh checkout of the exact final remote commit:

1. `npm ci`
2. `npm run verify`
3. validator fixture suite
4. workflow policy validation
5. clean-tree assertion
6. production dependency audit
7. PR scope-to-work-item validation
8. immutable CI run and job URLs bound to the source SHA

Required check contexts must come from actual PR runs.

### Local Git

Capture before and after topology, refs, merge bases, stable patch IDs,
`git fsck --full --no-reflogs`, reachability of `93cc2bb`, `65ad9ea`, and
dangling `3bb70f6`, remote refs, cached paths, HANDOFF history, and SHA-256 of
the handoff and governed replacement. Do not prune the dangling commit in PH0.

Stable patch IDs observed:

- `93cc2bb`: `976df66b3cc0eafe3cd0340f723f7f9314009d9f`
- `65ad9ea`: `3f02205db11aa91a7f9b31ba548a1afce748ed5c`

### Live GitHub

Export timestamped, redacted JSON and digests for repository settings, effective
main/tag rules, Actions policy, workflow permissions, environment protection,
private vulnerability reporting, collaborators/bypass actors, required checks,
issues, PRs, and work-item linkage.

Use a separate non-admin identity and disposable probe refs for safe adversarial
tests. Never test protections by risking unauthorized mutation of `main` or a
real release tag.

## Work-item mapping

- **CTL-001:** request/response schema, base-aware transitions, fixtures, exact
  evidence binding, and process-deviation record.
- **HK-001:** exact topology, reachability, patch identity, handoff disposition,
  dangling-object adjudication, PR 6/7/8 disposition, and clean baseline.
- **GOV-001:** branch/tag rules, SHA-pinned Actions, least privilege, private
  reporting, protected environment, backup maintainer, and bypass policy.
- **GOV-002:** exactly-one issue linkage, templates without duplicate status,
  PR-scope control, drift monitoring, and issue inventory.

## Independence limitation

The verifier made no edits or GitHub mutations and is separate from the
implementation role, but is still a Codex agent operating for the same
repository owner. It cannot satisfy independent human approval for governance,
release workflow, security acceptance, or stable release. Live adversarial
testing also requires a second non-admin GitHub identity.
