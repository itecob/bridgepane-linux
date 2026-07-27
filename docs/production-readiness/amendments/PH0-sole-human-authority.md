# PH0 amendment: sole-human authority model

- **Amendment ID:** AMD-PH0-001
- **Applies to:** AGENTIC_WORKFLOW.md, AR-PH0-001, VR-PH0-001, ARS-PH0-001, VRS-PH0-001
- **Reason:** BridgePane has exactly one human maintainer and authority, `itecob`.
- **Architect decision:** approve with compensating controls
- **Verifier decision:** approve with compensating controls
- **Human decision:** pending owner review
- **Status:** superseding amendment; effective only after owner acceptance

## Truthful authority model

`itecob` is the sole human authority. Architect, implementer, and verifier
agents remain separate technical roles, but their reviews are not independent
human review and cannot accept project risk. Owner approval is the human-in-the-
loop gate.

This amendment supersedes every PH0 requirement for:

- a second or backup human maintainer;
- approval by a person other than the final pusher;
- mandatory human CODEOWNERS or approving-review requirements;
- a distinct human release reviewer;
- environment `prevent_self_review=true`;
- two-person emergency approval;
- two-human onboarding;
- a non-admin human verifier or test reporter;
- release blocking on a second person's GitHub ID;
- any claim of independent-human certification.

A second maintainer remains beneficial but is not a release prerequisite.

## Required agentic separation

- Architecture, implementation, and verification use separate agent roles.
- The verifier is read-only while forming its decision.
- Security, governance, and release changes require an architecture response,
  verifier response, automated checks, and explicit owner authority.
- Agent reports state model, context, and authority limitations.
- Agents cannot mark their own implementation complete without verifier evidence.

## Solo-main branch control

The `main` ruleset requires pull requests but zero human approvals, because
GitHub does not count self-approval. It also requires:

- successful `verify`, dependency-review, CodeQL, policy, and evidence checks;
- current branch and resolved conversations;
- no force-push or deletion;
- linear history and squash merge;
- full Action SHA pinning;
- an owner review packet on security, governance, release, and ledger PRs.

For security, governance, release, and ledger PRs, the owner may merge only two
hours after both the last material push and all required gates become green. A
change to code, architecture, acceptance criteria, evidence, permissions, or risk
resets the timer; spelling-only changes do not. The PR records the timer start.
This is owner authorization, not independent review.

## Solo release gate

The `stable-release` environment uses:

- sole required reviewer: `itecob`;
- `prevent_self_review=false`, because true would deadlock the project;
- wait timer of at least 24 hours;
- protected `v*` deployment policy;
- qualified-artifact manifest produced before the wait;
- signed annotated tag and protected-main ancestry;
- verified checksums, artifact-content SBOM, and provenance;
- tested artifact promoted without rebuild;
- first owner qualification bound to the candidate commit and artifact manifest;
- that qualification starts the 24-hour environment wait;
- second explicit owner environment approval after the wait.

Only the final publish job uses the environment. Pull-request and build jobs have
no release credentials.

An emergency security release may shorten the wait only through a recorded
incident decision, named risk, and mandatory post-release review.

## Compensating controls

Because human separation of duties is unavailable:

- use two hardware-backed authentication factors stored separately;
- store recovery codes and signing-key backup offline;
- test account and signing-key recovery without exposing secrets;
- document succession, archival, and end-of-life behavior;
- use no long-lived release token when `GITHUB_TOKEN` suffices;
- pin Actions to full SHAs and keep permissions job-scoped;
- build on ephemeral runners;
- publish exactly the tested bytes;
- retain immutable PR, CI, attestation, ledger, and settings evidence;
- maintain public desired-state manifests and scheduled read-only drift checks;
- require adversarial negative tests and a separate verifier-agent report;
- prohibit silent acceptance of failed, skipped, stale, or ambiguous checks.

A least-privilege machine identity may test denial paths. It receives no human
authority, administration, release secrets, or bypass.

## Emergency governance

There is no fictitious break-glass person. If protections block an urgent repair,
the owner must first export current settings, open an incident record, explain why
the normal route cannot work, make the narrowest time-limited change, restore the
prior configuration immediately, run drift verification, and publish a post-
incident packet. Failed tests, convenience, and release timing are not emergencies.

## Ledger corrections

The compliant CTL implementation distinguishes:

- `verificationReviews`: agent/tool evidence, findings, source commit, commands,
  limitations, and decision;
- `authorityApproval`: owner, decision, date, reviewed commit, and review packet;
- `independenceLimitations`: one-human and shared-system limitations;
- `residualRisks`: accepted risks and review date.

No agent review can populate `authorityApproval`, accept residual risk, or complete
a work item. Completion requires automated evidence bound to the exact commit, a
separate verifier-agent report, and explicit `itecob` approval of that same
commit through the owner review packet. A commit change invalidates approval.

Upon owner acceptance, this amendment immediately supersedes the conflicting
workflow and plan requirements below. CTL-001 must encode the correction:

- GOV-001 backup-maintainer requirement;
- BLD-004 second-maintainer requirement;
- REL-003 and OPS independent-human approval requirements;
- the agentic workflow's absolute prohibition on same-human security or release
  approval.

## Residual risk requiring owner acceptance

- One compromised owner account can ultimately alter governance.
- Agent review cannot provide organizational independence.
- Self-review increases correlated-error risk.
- If the owner is unavailable, security response and releases stop.
- Project continuity is not guaranteed.

Controls reduce but cannot eliminate these facts. BridgePane must describe
maintenance as best-effort and must not claim dual control, independent
certification, or guaranteed response continuity.
