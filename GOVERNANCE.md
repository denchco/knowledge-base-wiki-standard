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

Before `1.0.0`, candidate prereleases may change or retire conformance requirements. Under `DKBWS-RELEASE-001`, each incompatible candidate change MUST identify affected requirement IDs, compatibility impact, verification criteria and an explicit migration in the changelog and release notes. Previous immutable releases MUST remain intact. Consumer pins and adoption states change only through separately authorised migration.

From `1.0.0`, deprecation begins in a minor release. Removal or a change that invalidates a previously conforming implementation requires a major release. Security corrections may accelerate deprecation but must remain documented.

Local projects never track `main` as their conformance pin. They consume immutable releases and receive reviewable migration patches or pull requests. A proposal, accepted decision, or release-available result never changes a consumer pin automatically.

## Immutable release stacks

Each Standard release binds its exact source revision, tool pins, dependency locks, configuration contracts and verification implementation. Improvements require a new verified immutable release. Existing releases remain unchanged, including when later audit evidence reports a vulnerability.

For a first build, `DKBWS-PROMPT-001` selects the latest published, non-draft release with native immutability. Semantic version ordering includes prereleases such as `rc.8`. Selection proves exact tag-to-SHA resolution and successful trusted `Verify` evidence for push/main at that SHA. The latest applicable run and attempt must succeed. Missing or unsuccessful evidence blocks selection; it does not authorise fallback to `main` or an older release.

Under `DKBWS-UPDATE-001`, `npm run standard:stack -- check <wiki>` is a read-only availability and identity check. A newer release never changes an existing Wiki's pin, locks, configuration or content. Migration requires explicit authority, a compatible reviewed patch, preserved unknown fields and deviations, and complete verification. Install the selected release's dependencies from frozen locks.

Under `DKBWS-RELEASE-001`, qualification records its date, exact release and CI evidence. It does not promise continued vulnerability clearance. Current required audits and verification still apply. An explicit historical or development revision may support an offline plan; without verified release evidence, it is not a default production stack.
