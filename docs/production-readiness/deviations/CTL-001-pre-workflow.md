# CTL-001 process deviation: prototype predates agentic workflow

- **Deviation ID:** DEV-CTL-001
- **Work item:** CTL-001
- **Prototype commit:** `65ad9ea2db5adc024cf66fe5c7abc0edf106dddb`
- **Recorded:** 2026-07-26
- **Owner:** itecob
- **Status:** open until the compliant CTL-001 replay is verified

## Deviation

The first readiness ledger and validator prototype was implemented before the
architecture-request, verification-request, response, and human-acceptance
sequence became mandatory. It is design input, not compliant evidence.

## Impact

The prototype cannot complete CTL-001 or be merged as the compliant
implementation. It must be reviewed through AR-PH0-001 and VR-PH0-001 and
replayed only after the process-bootstrap pair is accepted.

## Corrective action

1. Preserve the prototype and amended dangling prototype remotely.
2. Merge the process-bootstrap documents from clean `origin/main`.
3. Replay only the authorized `93cc2bb..65ad9ea` delta after acceptance.
4. Add the base-aware validator and accepted fixtures.
5. Bind evidence to the final merged CTL-001 commit.
6. Close this deviation only after independent evidence review.

## Non-claims

This record does not claim the prototype followed the later workflow, that agent
review is independent human approval, or that CTL-001 is complete.
