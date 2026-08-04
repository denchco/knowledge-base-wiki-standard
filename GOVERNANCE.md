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

Implementation-led intake uses `.github/ISSUE_TEMPLATE/standard-change.yml`. A proposer may record an affected requirement as unknown or new; a stable ID and normative wording become mandatory before a normative implementation is accepted. Local preparation follows verified-project-first, read-only duplicate search, disclosure/licence scrub, and exact remote-payload approval. If the form is unavailable, preparation stops at the ignored local draft. Submission preserves the originating consumer and immutable revision but does not itself promote the pattern or authorize a PR, release, publication, migration, pin, or conformance change.

Patterns progress through `experimental`, `project-specific`, `reusable`, `preferred`, and `core`. Complexity alone is not promotion evidence. A promoted pattern records its reuse class, dependencies, accessibility and browser evidence, limitations, and simpler fallback.

Deprecation begins in a minor release. Removal or a change that invalidates a previously conforming implementation requires a major release. Security corrections may accelerate this process but must remain documented.

Local projects never track `main` as their conformance pin. They consume immutable releases and receive reviewable migration patches or pull requests.
