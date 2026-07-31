# Architecture corrective addendum: HK-001 canonical evidence and private cleanup root

- **Addendum ID:** ARS-HK-001-A2
- **Corrects architecture revision:**
  `be3ed1abb939cea19474cfe93c9e9859e514e4d6`
- **Decision:** accepted with required changes
- **Scope:** This addendum changes only the two controls below. Every other
  accepted HK-001 control remains unchanged.

## Canonical dangling-tree evidence

Replace the prior tree-listing digest with the canonical recursive tree-listing
digest. The exact evidence command is:

```text
git ls-tree -r --full-tree f3b4f356a9e47cadf5aaf6e0ba7ea810e71d3f17 | sha256sum
```

The required result is:

```text
1abdfe62f119760f52295b238b205c8bea80109f8c7064da35c2faa947cb28b2
```

The dangling-object packet must distinguish:

- Git tree object ID:
  `39deecb780a1cda3a9b9a4c8efc95585cd214c6d`;
- canonical recursive tree-listing SHA-256:
  `1abdfe62f119760f52295b238b205c8bea80109f8c7064da35c2faa947cb28b2`;
- stable patch ID:
  `6997d04c9b6266f4c0d4082839496b5c8b94b212`.

The earlier `4bf5de...` value came from a noncanonical tree display and must
not be accepted as evidence.

## Repository-relative public cleanup specification

Public documentation and committed evidence may identify cleanup targets only
by these repository-relative paths.

Files:

```text
HANDOFF.md
docs/production-readiness/deviations/CTL-001-pre-workflow.md
docs/production-readiness/responses/architecture/PH0-control-plane.md
docs/production-readiness/responses/verification/PH0-control-plane.md
```

Directories, removed deepest-first where applicable:

```text
docs/production-readiness/deviations
docs/production-readiness/responses/architecture
docs/production-readiness/responses/verification
docs/production-readiness/responses
```

Public instructions must not contain the private absolute checkout root.

### Private execution-packet root validation

Immediately before every cleanup operation, the owner-approved private packet
must:

1. Resolve the candidate checkout root to a physical, absolute, symlink-free
   path.
2. Compare it byte-for-byte with the owner-approved expected root stored only
   in the private packet.
3. Require Git's reported top-level directory, after physical resolution, to
   equal that same root.
4. Require HEAD to equal
   `622c43ded20b5b485be4ccd9c5b39e4bc5fbf72d`.
5. Require the root not to be `/`, a home directory, an empty value, or any
   ancestor of the approved checkout.
6. Revalidate target type, repository-relative path, digest or blob identity,
   and containment beneath the validated root.
7. Stop on any mismatch, symlink, unexpected file, non-empty directory, or
   changed HEAD.

After validation, the private packet contains one literal absolute target for
each operation. It must not use variables, globs, substitutions, recursion,
broad targets, or runtime path construction.

Files are removed individually with nonrecursive `unlink --`. Directories are
removed individually with nonrecursive `rmdir --`. `rm -r`, `git clean`,
and equivalent operations are prohibited.

## Irreversible disclosure gate

Revision `be3ed1abb939cea19474cfe93c9e9859e514e4d6` already disclosed the
private absolute checkout path on a public branch. Removing that text later
does not remove it from Git history, GitHub caches, clones, logs, or mirrors.

Before any HK implementation, the owner must explicitly record either:

- acceptance of this irreversible disclosure and its residual privacy risk; or
- rejection, which blocks implementation pending separately authorized
  incident handling.

This addendum does not authorize history rewriting, force-pushing, branch
deletion, or claims that later removal erases the disclosure.

No HK-001 implementation may begin until the verifier accepts this correction
and `itecob` accepts both the exact corrected response commit and the
irreversible-disclosure risk.
