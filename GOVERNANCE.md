# Governance

## Candidate governance

The DenchCo maintainer owns candidate releases. Public governance will be reviewed before `1.0.0`.

Normative changes require:

1. a proposal describing the problem and applicability;
2. stable requirement IDs and explicit normative wording;
3. evidence and local implementation precedent where relevant;
4. automated or manual verification criteria;
5. positive and negative fixtures for automatable behaviour;
6. migration and compatibility impact;
7. changelog entry and maintainer review.

Implementation-led intake uses a tracked `standard-proposals/<id>.json` record plus `.github/ISSUE_TEMPLATE/standard-change.yml`. The record preserves the verified originating implementation, optional JJ navigation ID, pinned Standard revision, disclosure/licence state, deterministic payload digest, issue linkage, explicit decision, accepted requirements, release inclusion, and any later consumer adoption. A proposer may record an affected requirement as `unknown` or `new-requirement`; a stable ID and normative wording become mandatory before acceptance.

Local preparation follows verified-project-first, machine validation, read-only open-and-closed duplicate search by stable hidden marker, disclosure/licence scrub, and approval bound to the SHA-256 of the exact repository, title, labels, body, and governed form bytes. Generated payloads are ignored and disposable; the tracked record is authoritative. Any payload or form change invalidates approval. If the published form or `standard-change` label is unavailable, or a network result is ambiguous, preparation fails closed and reconciles by marker. No CLI fallback submits the issue, and no patches, screenshots, or evidence are uploaded automatically.

Maintainer triage records classification and decision in the versioned Standard registry. An issue being closed never means accepted. Accepted entries name their stable requirement IDs; rejected and withdrawn entries remain durable deduplication history. Inclusion is recorded only after an immutable tag resolves to the stated full release commit. Because a registry file cannot contain the hash of its own commit, release inclusion is a post-release ledger update in a later verified JJ turn. Consumer pin review and adoption remain separate, explicitly authorised actions.

Patterns progress through `experimental`, `project-specific`, `reusable`, `preferred`, and `core`. Complexity alone is not promotion evidence. A promoted pattern records its reuse class, dependencies, accessibility and browser evidence, limitations, and simpler fallback.

Deprecation begins in a minor release. Removal or a change that invalidates a previously conforming implementation requires a major release. Security corrections may accelerate this process but must remain documented.

Local projects never track `main` as their conformance pin. They consume immutable releases and receive reviewable migration patches or pull requests. A proposal, accepted decision, or release-available result never changes a consumer pin automatically.
