# Owner review packet: PH0 process bootstrap

This packet is for the BridgePane project owner. It assumes no familiarity with
Git internals, GitHub administration, or cryptographic hashes.

## Decision requested

Choose one:

- **Accept:** authorize merging this process-only PR and starting CTL-001.
- **Request changes:** describe what is unclear, incorrect, or unacceptable.
- **Reject:** stop this process and do not begin implementation.

No approval requires manually calculating or comparing hashes. CI records and
checks the digital fingerprints automatically.

## What is changing?

This PR adds the working agreement that agents must follow before changing
BridgePane's security, governance, build, or release behavior. It includes:

- rules for separate architect, implementer, and verifier agent roles;
- the PH0 architecture request and response;
- the PH0 verification request and response;
- the sole-human-authority amendment;
- a record that the earlier control-plane prototype predates this workflow.

It changes documentation only. It does not change or release the application.

## Why is it needed?

Without a frozen architecture and verification plan, an implementing agent could
change scope or weaken success criteria after discovering failures. This process
freezes the intended design and proof before implementation begins.

## Important decisions

1. `itecob` is the only human authority. No second human is required.
2. Agent reviews are role-separated technical review, not independent-human
   approval.
3. Future implementation uses small, ordered PRs from clean `main`.
4. Existing prototype commits are planned for verified remote preservation after
   this process is accepted; they are not yet remotely preserved or compliant.
5. Security and release work must pass automated gates and explicit owner review.
6. A stable release has a minimum 24-hour cooling period and two owner decisions:
   one before qualification and one immediately before publication.
7. The same tested artifact is promoted; it is never rebuilt after approval.

## What could go wrong?

- A compromised sole-owner account could alter governance.
- Agents can share blind spots even when assigned different roles.
- Self-review can miss mistakes another person might notice.
- If the owner becomes unavailable, releases and security response stop.
- Excessive process could slow useful fixes.

The amendment uses automated negative tests, immutable evidence, account recovery,
cooling periods, and explicit risk records to reduce these risks. It cannot remove
the inherent one-human limitation.

## What has been verified?

The process branch was created directly from clean `origin/main`. The evidence
below applies to accepted response commit R. The new amendment commit is pending
until it is pushed and its fresh checks pass; fresh acceptance is blocked until
automation posts that exact result.

- [PR #9](https://github.com/itecob/bridgepane-linux/pull/9)
- [Accepted response commit R](https://github.com/itecob/bridgepane-linux/commit/bc7548fad71534f3ef957f9d6395eb3f9222b1b4)
- [Architecture request at R](https://github.com/itecob/bridgepane-linux/blob/bc7548fad71534f3ef957f9d6395eb3f9222b1b4/docs/production-readiness/requests/architecture/PH0-control-plane.md)
- [Verification request at R](https://github.com/itecob/bridgepane-linux/blob/bc7548fad71534f3ef957f9d6395eb3f9222b1b4/docs/production-readiness/requests/verification/PH0-control-plane.md)
- [Architecture response at R](https://github.com/itecob/bridgepane-linux/blob/bc7548fad71534f3ef957f9d6395eb3f9222b1b4/docs/production-readiness/responses/architecture/PH0-control-plane.md)
- [Verification response at R](https://github.com/itecob/bridgepane-linux/blob/bc7548fad71534f3ef957f9d6395eb3f9222b1b4/docs/production-readiness/responses/verification/PH0-control-plane.md)
- [CI verify and dependency review](https://github.com/itecob/bridgepane-linux/actions/runs/30206030678)
- [CodeQL analysis](https://github.com/itecob/bridgepane-linux/actions/runs/30206030686)

| Check | Result |
| --- | --- |
| Existing test suite | Passed: 22 tests |
| Strict TypeScript | Passed |
| Production builds | Passed |
| Release-policy check | Passed |
| Dependency review | Passed |
| CodeQL | Passed |
| PR CI verification | Passed |

The installed application runtime currently has no known audited production
dependency vulnerability. However, 16 high-severity findings exist in packaging
tools used to produce installers. If those tools were compromised, they could
contaminate release artifacts even though users do not install the tools. Stable
release therefore remains blocked until the risk register exit condition passes.
This process PR does not waive or resolve that risk.

## What acceptance authorizes

Acceptance authorizes:

- merging this documentation-only bootstrap;
- creating the compliant CTL-001 implementation branch and PR;
- building the ledger validator and its positive/negative fixtures;
- continuing through PH0 one reviewed slice at a time.

## What acceptance does not authorize

Acceptance does not authorize:

- declaring CTL-001 or PH0 complete;
- changing GitHub protections or credentials immediately;
- deleting `HANDOFF.md`;
- publishing packages or a stable release;
- accepting dependency or security risks;
- bypassing failed checks;
- claiming independent-human review.

Those actions retain their own architecture, verification, evidence, and owner
gates.

## How to undo this

Before merge, close the PR. Nothing in the application or GitHub settings changes.

After merge, revert the process-bootstrap commit through a new PR. Stop all PH0
implementation until the replacement process is accepted.

## Documents to read

Start with this packet. For more detail, read in this order:

1. [Sole-human-authority amendment](../amendments/PH0-sole-human-authority.md)
2. [Architecture request](../requests/architecture/PH0-control-plane.md)
3. [Architecture response](../responses/architecture/PH0-control-plane.md)
4. [Verification request](../requests/verification/PH0-control-plane.md)
5. [Verification response](../responses/verification/PH0-control-plane.md)
6. [Agentic workflow](../AGENTIC_WORKFLOW.md)
7. [Prototype process deviation](../deviations/CTL-001-pre-workflow.md)

## Unresolved conditions

- CTL-001 still needs its compliant implementation and validator fixtures.
- GitHub protections and release settings remain unchanged.
- Owner account-recovery controls must be established before GOV-001 completes.
- Package, sandbox, privacy, legal, and stable-release gates remain open.

## Suggested owner response

The earlier acceptance comment covers response commit R but predates the sole-human
amendment and this review packet. Fresh acceptance of the amended commit is
required. After it is committed and all checks pass, automation posts a prefilled
PR response containing a clickable exact commit link and machine-verified digest
result. The owner chooses Accept, Request changes, or Reject in plain language.

If requesting changes, plain language is enough. No hashes or Git commands are
required.
