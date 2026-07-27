# Architecture response: PH0 control plane and housekeeping

- **Response ID:** ARS-PH0-001
- **Request:** AR-PH0-001
- **Request commit:** `622c43ded20b5b485be4ccd9c5b39e4bc5fbf72d`
- **Architect:** Codex independent architecture role
- **Response date:** 2026-07-26
- **Decision:** approve with required changes
- **Implementer:** Codex implementation role
- **Verifier:** Codex independent verification role
- **Human acceptance owner:** itecob
- **Implementation permitted:** only the response-publication branch and process
  PR pending digest-bound human acceptance

## Decision

Adopt a process-bootstrap PR before replaying any control-plane implementation.
Preserve all existing commits remotely for provenance, but do not merge the
existing stacked branch as proof of architecture-first compliance. CTL-001 is a
governance retrofit whose prototype predates this workflow.

A second maintainer must be appointed before release-environment approval or any
governance item is complete.

## Corrected current state

- `origin/main`: `161439c3ed2dbccf554b53436a8ee7cded4f6c69`
- Local dependency prototype: `93cc2bb`
- Local control-plane prototype: `65ad9ea`
- Frozen request commit: `622c43d`
- `HANDOFF.md` is untracked and stale.
- PR 6 contains incompatible Vite 8/plugin-react changes.
- PRs 7 and 8 pass CI but use mutable Action tags.
- GitHub lacks branch/tag rulesets, release environment, private vulnerability
  reporting, tags, releases, and a work-item issue inventory.
- Only `itecob` has repository access, so independent release approval is not
  currently possible.

## Trust boundaries

```text
developer workspace
  -> preserved review refs
  -> protected GitHub source and pull requests
  -> read-only PR verification
  -> qualified immutable artifacts
  -> independently approved stable-release environment
  -> GitHub release, attestations, and consumer verification

plan.json <-> issue/PR links
    |
    +-> sole status authority and committed evidence
```

GitHub executes ledger work; it does not supersede ledger status.

## Lossless bootstrap and migration

### Slice 0: preservation

Before mutation, record status, refs, topology, merge bases, trees, patch IDs,
full fsck, remote refs, and SHA-256 of `HANDOFF.md`. Confirm expected ancestry
and that intended remote refs do not exist.

Push an immutable preservation branch at `622c43d`, verify through GitHub that
`93cc2bb`, `65ad9ea`, and `622c43d` are reachable, and retain the branch
through PH0 acceptance. Never force-update or prune it.

Rollback: stop on any mismatch. Preservation does not move existing history.

### Slice 1: process bootstrap

Create `ph0/process-bootstrap` from exact `origin/main`. Copy the frozen
workflow, templates, requests, architecture response, verification response, and
deviation record byte-for-byte. Add human acceptance. Open a process-documents-
only PR; no ledger implementation, dependency, workflow, settings, or product
change belongs in it.

Rollback: revert through a PR and preserve the review branch.

### Slice 2: CTL-001

After bootstrap merges, create `ph0/ctl-001` from updated `origin/main`.
Replay the content, not history, of the control-plane prototype and add the
base-aware transition validator plus all accepted fixtures. The implementation
must descend from the accepted requests and responses.

Rollback: revert the CTL PR. The prototype remains on the preservation branch.

### Slice 3: HK-001

After CTL-001 completes, create `ph0/hk-001`. Replay the compatible dependency
patch, preserving `verify:plan`, and verify semantic package/lock equivalence.

For `HANDOFF.md`, record its digest and classify every claim as retained,
already governed, stale, transient, or rejected. Remove the session-only file
only after review accepts the disposition. Evidence can prove current index and
history state; it cannot prove whether a file was transiently staged in the past.

Rollback: revert merged changes; retain original commits, digest, and disposition.

### Slice 4: GOV-001

Add policy-as-code desired-state manifests, full Action SHA pinning,
least-privilege workflows, governance runbooks, and read-only export/diff tools.
Apply settings only after merge and independent approval of the planned diff.

### Slice 5: GOV-002

Add issue/PR templates, canonical ledger links, base-aware transition and
traceability validation, tracking issues, and normalized desired/live drift
checks. No later phase may activate before completion.

## Pull-request disposition

- PR 6: do not merge; close as superseded only after HK-001 replacement passes.
- PR 7: do not merge mutable `@v4`; supersede with reviewed full SHA.
- PR 8: do not merge mutable `@v7`; supersede with reviewed full SHA.
- Pin every Action in GOV-001, not only the three Dependabot changes.
- Do not delete Dependabot branches until replacement evidence is recorded.

## Governance specification

### Main

Apply rules to administrators:

- pull request required;
- one approval from a person other than the final pusher;
- code-owner review for governance, security, release, and ledger files;
- dismiss stale approval and require approval after latest push;
- resolved conversations and up-to-date branch;
- actual check contexts for `verify`, `dependency-review`, and CodeQL
  `analyze`, captured from a calibration PR;
- no force-push or deletion;
- linear history and squash merge;
- no ordinary administrator or Actions bypass.

### Release tags

Protect `v*` from update, force-update, and deletion. Restrict creation to the
release-manager role, validate SemVer, require a qualified protected-main commit,
and use signed annotated tags with recorded verification. Actions consume but do
not create tags.

### Stable-release environment

Allow only protected release tags. Require a reviewer distinct from the
initiator and prevent self-review. PRs cannot access the environment. Only the
publish job uses it. Build jobs use `contents: read`; attestation alone receives
`id-token: write` and `attestations: write`; publication alone receives
`contents: write`. Verify downloaded qualified artifacts by immutable identity
before publication.

### Emergency path

No standing bypass. A named backup administrator may temporarily alter a rule
only for a recorded incident with before/after exports, reason, time limit,
restoration, and retrospective review. Two-person approval is required whenever
available.

## Traceability and drift enforcement

Ledger items gain one tracking issue, frozen request IDs and revisions, accepted
response paths, implementation PRs, exact source commits, immutable evidence
links, named roles, and deviation records.

Issues contain no status field. They repeat work-item ID, criteria, dependencies,
owner, test plan, and canonical ledger link.

The validator must be base-aware and enforce legal transitions, immutable
requests after implementation, non-weakened criteria, accepted responses,
owner/reviewer separation, exact evidence binding, and exactly-one issue after
GOV-002. Desired governance manifests are normalized against read-only live
exports. Stable release fails on any blocker or detected configuration drift.

## Required changes and residual risks

- Verification must accept this architecture and finalize fixture scope.
- The project owner must record human acceptance.
- A backup maintainer and non-admin verification identity are required.
- Repository-plan support for rules and environments must be confirmed.
- Required-check integration IDs must come from a calibration PR.
- Signed-tag enforcement may require additional verification.
- Live exports must redact secrets and personal reviewer data.

## Work-item mapping

- **CTL-001:** process bootstrap, ledger, responses, base-aware validator,
  transition fixtures, evidence binding, deviation record.
- **HK-001:** preservation, dependency replay, handoff disposition, PR 6/7/8,
  dangling-object adjudication, clean baseline.
- **GOV-001:** branch/tag rules, Actions, least privilege, private reporting,
  release environment, backup maintainer, emergency policy.
- **GOV-002:** issue linkage, templates, PR scope, desired/live drift detection.

No PH1 work is authorized until all four items are independently verified and
completed through a reviewed ledger update.
## Verification-required amendment

This section supersedes any less-specific migration, governance, or rollback
language above.

### Expanded trust boundaries

```text
local Git object database and refs
  |  no credentials in evidence
  |  preserved refs + exact patch/digest checks
  v
GitHub source-control boundary
  |-- protected main and preservation refs
  |-- protected release-tag refs
  |-- issues/PRs -------- links only --------+
  |-- plan.json (only status authority)      |
  |-- committed requests/responses/evidence <-+
  |
  | read-only token for PR jobs
  v
GitHub Actions execution boundary
  |-- untrusted PR code: contents read, no secrets/OIDC/environment
  |-- qualified build: ephemeral isolated runner
  |-- attestation job: narrowly scoped OIDC
  |-- immutable artifact identity + digest
  v
stable-release environment boundary
  |-- distinct human reviewer; self-review and admin bypass disabled
  |-- protected v* deployment policy
  |-- publication-only GITHUB_TOKEN
  v
artifact-promotion boundary
  |-- promote already-qualified bytes; never rebuild
  |-- checksums + artifact SBOM + provenance
  v
GitHub release and consumer verification
```

CI credentials, environment approval, and release credentials are separate trust
boundaries. Issues and PRs may link to evidence but cannot change ledger state.

### Exact preservation refs

Create local refs only after confirming each object with
`git cat-file -e <sha>^{commit}`:

- `refs/heads/preservation/ph0-lineage-20260726` -> `622c43d`
- `refs/heads/preservation/ph0-dangling-3bb70f6-20260726` -> `3bb70f6`

Prechecks record `show-ref`, `fsck --full --no-reflogs`, object type, commit
tree, parents, merge bases, stable patch IDs, remote refs, and absence of both
remote names. Stop on any mismatch.

Push both refs with explicit source and destination SHAs, never wildcard
refspecs. Read them back through both `git ls-remote` and the GitHub API.
Immediately create an active branch ruleset named
`PH0 preservation refs 20260726` targeting exactly
`refs/heads/preservation/ph0-*`, with empty `bypass_actors` and deletion,
update, and non-fast-forward restrictions. Export and digest the effective
ruleset.

A normal branch is not called immutable before that ruleset is verified. The
gap between initial push and protection is recorded as a bootstrap limitation;
no other actor currently has repository access. Rollback before protection is
to stop while retaining both local refs. After protection, rollback requires a
reviewed ruleset change and never deletes either preservation ref during PH0.
The dangling commit is thereby adjudicated as an obsolete amended prototype
retained for audit; pruning is prohibited.

### Exact isolated deltas

CTL-001 replays only `93cc2bb..65ad9ea`. Its allowed path set is:

```text
docs/production-readiness/README.md
docs/production-readiness/evidence/CTL-001.md
docs/production-readiness/evidence/README.md
docs/production-readiness/plan.json
package.json
scripts/validate-production-plan.mjs
```

HK-001 replays only `161439c..93cc2bb`. Its allowed path set is:

```text
.github/dependabot.yml
package-lock.json
package.json
```

Before and after replay, assert exact name-status output, patch ID, and that CTL
does not change dependency versions or the lockfile while HK does not remove
`verify:plan`. Any additional path or semantic delta stops the slice and
returns it to architecture review.

### Governance feasibility resolved

The repository is a public personal repository. Read-only API probes confirmed
that repository rulesets, environments, repository Actions policy, private
vulnerability reporting, and immutable-release settings endpoints are
available. Required environment reviewers and prevent-self-review are supported
for public repositories on current GitHub plans.

No main, preservation, or tag-immutability ruleset has a bypass actor. Personal
repositories cannot use `OrganizationAdmin` or team actors. The sole explicit
creation actor is GitHub user `itecob`, numeric actor ID `212975193`, in a
separate tag-creation-only ruleset. This does not bypass the independent
tag-update/deletion ruleset.

Tag rulesets cannot prove annotated-tag signature or SemVer validity by
themselves. A creation ruleset restricts `refs/tags/v*` creation to the named
release manager; a separate no-bypass ruleset blocks update and deletion.
A required workflow validates strict SemVer, protected-main ancestry, annotated
tag type, and `git verify-tag` against the documented release public key before
any environment deployment. Failed validation never publishes.

### Identity onboarding sequence

Before enabling main protection or creating the release environment, the owner
must nominate and onboard:

1. one backup administrator for recovery and rule ownership; and
2. one distinct non-admin verifier/release approver with repository read access.

Precheck each username, numeric ID, current permission, invitation state, and
documented consent. Invite with the minimum role required. Confirm acceptance
from a separate authenticated session before protection changes. Do not remove
an accepted collaborator as automated rollback after that person has reviewed;
reversal requires a separate reviewed offboarding record.

No GOV-001 completion, release approval, or adversarial protection claim is
possible until both identities exist. Process bootstrap and local validator work
may proceed before onboarding; live governance mutation may not.

### Mutation transaction table

| Mutation | Read-only precheck | Apply and verify | Rollback |
| --- | --- | --- | --- |
| Preservation refs | Object, ref, fsck, remote-name checks | Explicit push, API readback, protection export | Stop and retain local/remote evidence; never prune |
| Main ruleset | Export all effective rules and real check integration IDs | Create from reviewed manifest; read back normalized JSON | Delete newly created ruleset or restore exact prior export |
| Preservation ruleset | Confirm exact refs and no matching existing rule | Empty bypass list; update/delete/non-fast-forward restrictions | Restore prior export; never delete preserved refs |
| Tag creation rule | Confirm actor ID 212975193 and exact `refs/tags/v*` target | Creation restriction with only named User bypass | Delete new rule or restore prior export; no tag mutation |
| Tag immutability rule | Export existing tag rules | Empty bypass; update/deletion/non-fast-forward restrictions | Restore prior export; retain all tags |
| Actions policy | Export repository and selected-actions policy; verify workflows already use full SHAs | Set `allowed_actions=selected`, `sha_pinning_required=true`, and exact reviewed `owner/action@sha` patterns | Restore captured policy and selected-action payload |
| Workflow permissions | Export default and per-workflow permissions | Keep default `read`, PR jobs read-only, isolate attestation/publish scopes | Revert workflow PR and restore captured default |
| Private reporting | GET current state and SECURITY.md target | Enable, read back, then run benign report with verifier identity | Disable only through reviewed decision; close test report as test |
| Release environment | Confirm accepted reviewer ID and no existing environment | Create `stable-release`, prevent self-review/admin bypass, custom protected `v*` tag policy; read back | Delete newly created environment if unused, otherwise restore captured payload |
| Collaborators | Export collaborators/invitations and verify identity/consent | Invite minimum role and confirm acceptance independently | Cancel unaccepted invitation; accepted offboarding requires review |
| Templates | Clean diff and fixture validation | Merge reviewed files | Revert through PR |
| Tracking issues | Verify no existing work-item issue | Create exactly one issue and record URL in same ledger change | Close as superseded with audit comment; never silently delete |
| PR 6/7/8 closure | Replacement merged, evidence/comment prepared, current state exported | Comment with replacement and close individually | Reopen with audit comment if replacement is reverted |
| Private-report test | Verifier account and disclosure instructions confirmed | Submit harmless test, triage, close, retain redacted record | Mark invalid test and document; never expose sensitive content |

All exports are timestamped, redacted, hashed, and stored before mutation.
A failed verification stops the transaction; subsequent mutations do not run.

### Exact Actions policy

GOV-001 first replaces every workflow tag with a reviewed 40-character SHA for:

- `actions/checkout`
- `actions/setup-node`
- `actions/upload-artifact`
- `actions/download-artifact`
- `actions/attest-build-provenance`
- `actions/attest-sbom`
- `actions/dependency-review-action`
- `github/codeql-action/init`
- `github/codeql-action/analyze`

After the pinned workflow commit is on protected main, set repository policy to
`enabled=true`, `allowed_actions=selected`, and
`sha_pinning_required=true`. The selected-action payload contains only the
exact reviewed `owner/repository@sha` references in current workflows;
`github_owned_allowed` and `verified_allowed` remain false. An Action update
must change the workflow and desired policy in one reviewed PR, then apply the
policy expansion before the workflow merge and remove the old SHA afterward.

Current read-only state is `allowed_actions=all`,
`sha_pinning_required=false`, default workflow permissions `read`, and
pull-request review approval disabled.

### Exact release environment

The desired environment is `stable-release` with:

- required reviewer: the onboarded non-admin verifier's numeric User ID;
- `prevent_self_review=true`;
- administrator bypass disabled;
- `wait_timer=0`;
- protected branches disabled and custom deployment policy enabled;
- one custom deployment tag policy matching `v*`;
- no environment access from pull-request jobs;
- no stored long-lived secrets.

The architecture manifest cannot be accepted for live application until the
reviewer username and ID are supplied and independently confirmed.

### Private vulnerability reporting

Enable the repository endpoint, verify `enabled=true`, and confirm SECURITY.md
uses GitHub's private-reporting route. The non-admin verifier submits a harmless
report labeled as a governance test. The owner triages and closes it without
publishing content; evidence records only metadata and redacted screenshots.

### Human acceptance and digest binding

Human acceptance is a committed
`docs/production-readiness/responses/acceptance/PH0-control-plane.md` record
containing:

- full 40-character bootstrap source commit;
- SHA-256 of both requests and both responses;
- response decisions and unresolved conditions;
- GitHub login and date of the project owner;
- explicit accept or reject statement;
- URL of the GitHub PR review or commit comment that identifies the same commit
  and digests.

The acceptance record is not self-validating. The validator recomputes digests,
checks the full commit binding, and requires the immutable GitHub review URL.
Any request/response change invalidates acceptance and returns PH0 to review.

### Remaining gate

This response can be accepted for process bootstrap after independent verifier
approval and owner acceptance. Live GOV-001 operations remain blocked until the
backup administrator and non-admin verifier identities are supplied and
accepted.

## Non-self-referential acceptance sequence

The following sequence supersedes Slice 0 ordering above:

1. From exact `origin/main`, create `agent/ph0-process-bootstrap` containing
   only the agentic workflow, templates, both frozen requests, both responses,
   and `docs/production-readiness/deviations/CTL-001-pre-workflow.md`.
2. Commit those exact files as response commit **R** and record its full SHA plus
   SHA-256 of both requests and both responses.
3. Push only that branch and open a draft process PR. This publication is the
   sole remote mutation allowed before human acceptance.
4. The owner reviews exact R and posts a GitHub review or commit comment
   containing R, all four digests, and an explicit accept or reject decision.
5. Add acceptance record **A** in a later commit. A references R and the immutable
   review URL; it never attempts to reference its own commit.
6. After A passes protocol validation and merges, begin preservation and the
   remaining slices. No preservation ref, setting, housekeeping, governance, or
   product mutation occurs before A.

The preservation design remains mandatory but moves after protocol acceptance.
