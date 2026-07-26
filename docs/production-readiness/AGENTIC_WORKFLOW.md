# Agentic delivery workflow

Production-readiness work uses explicit architect, implementer, and verifier
responsibilities. A person may hold more than one role only when no independent
reviewer is available, and never for stable-release approval, security-boundary
approval, dependency-risk acceptance, or release-workflow approval.

## Required sequence

1. Commit an architecture request before implementation. It identifies work-item
   IDs, current state, invariants, decisions, constraints, risks, and rollback.
2. Record an architecture response that accepts, changes, or blocks the proposal.
   Material decisions become ADRs.
3. Commit the verification request before implementation so acceptance cannot be
   weakened after failures are discovered.
4. Record a verifier response that challenges the design, adds adversarial cases,
   and states whether the proposed evidence can prove acceptance.
5. Only after both responses are accepted may the ledger item enter
   `in_progress`.
6. Implement narrowly from the accepted requests, with tests.
7. Verify the final commit independently and record immutable evidence.
8. Complete work only through a reviewed ledger update.

## Role boundaries

### Architect

- Owns component boundaries, invariants, interfaces, dependencies, migrations,
  failure behavior, and rollback.
- Identifies every security and privacy boundary change.
- Rejects hidden scope, irreversible migration, and unverifiable acceptance.
- Does not declare implementation complete.

### Implementer

- Works from accepted architecture and verification requests.
- Uses small commits tied to work-item IDs.
- Adds tests before or with behavior changes.
- Does not silently change scope, acceptance, evidence, or architecture.

### Verifier

- Remains independent for security, release, governance, and risk decisions.
- Tests negative behavior and failure paths, not only successful operation.
- Records source commit, environment, commands, output, and limitations.
- Rejects missing, ambiguous, stale, or non-reproducible evidence.

## Storage and immutability

Requests live under `requests/architecture/` and `requests/verification/`.
Responses live under `responses/architecture/` and
`responses/verification/`. Names use `PHx-<scope>.md`.

Requests become immutable when implementation begins. Corrections use a
superseding version and update the ledger. Responses identify the request
revision and exact source commit reviewed.

## Coding controls

- Preserve the threat model and repository security invariants.
- Prefer small typed interfaces and centralized deterministic policy.
- Fail closed at every trust boundary.
- Bound inputs, time, memory, concurrency, retries, and retained state.
- Keep side effects at IPC and process edges.
- Never weaken tests to make an implementation pass.
- Never mix unrelated cleanup with a security or release-boundary change.
- Avoid new dependencies when the platform can safely provide the behavior.
- Run narrow tests during implementation and `npm run verify` before review.

## Handoff format

Every role handoff states work-item IDs, source commit, files changed, decisions,
commands and results, risks, rollback, unresolved questions, and requested next
role. Conversation summaries and untracked handoff files are not project status;
the ledger and committed evidence are authoritative.
