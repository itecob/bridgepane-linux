# Readiness evidence

This directory stores durable evidence for completed production-readiness work.
Do not commit credentials, OAuth data, personal information, raw user content,
or unredacted diagnostic logs.

Each evidence record must be Markdown and include:

- work-item ID;
- source commit SHA and, where relevant, release-candidate tag;
- exact command or manual procedure;
- operating system, architecture, display server, toolchain, and package type;
- expected and actual result;
- links to immutable CI runs, artifacts, attestations, or review decisions;
- execution date and accountable reviewer;
- redactions or limitations.

Large logs and binaries belong in retained CI or release artifacts. Commit a
small evidence record here containing their immutable links and digests.

Evidence is append-only after a release. Corrections use a new record that
links to and supersedes the original.
