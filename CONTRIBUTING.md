# Contributing

This candidate accepts implementation-led proposals and defect reports through issues. Unsolicited code pull requests are not yet open; maintainers will explicitly invite an implementation change after intake when appropriate.

## Propose a reusable change

Use the [standard-change issue form](https://github.com/denchco/knowledge-base-wiki-standard/issues/new?template=standard-change.yml) when a user-authored consumer implementation exposes a potentially reusable pattern or Standard defect. Preserve the originating project and immutable revision, then describe the problem and outcome, proposed reuse class, affected contract, dependencies and simpler fallback, implementation evidence, accessibility/browser results, verification fixture, and migration impact. A requirement ID may be unknown or new at intake; the maintainer assigns stable normative wording before implementation.

Filing a proposal does not promote the pattern. It remains `experimental` or project-owned until maintainer review classifies it as `project-specific`, `reusable`, `preferred`, or `core`. Agents may prepare an ignored `output/standard-change-proposal.md` after completing and verifying the user's local change, and may search existing issues read-only, but must not submit it remotely without explicit authority. Before any remote write they must scrub restricted content, show the exact repository, title, body, and labels, and obtain that authority. If the issue form is unavailable, stop with the local draft rather than substituting a connector or CLI write.

Issue authority does not authorize a pull request, release, publication, migration, consumer pin change, or conformance change. Each remains a separate reviewed action.

Do not include secrets, personal or confidential data, or vulnerability details. Use [GitHub private vulnerability reporting](https://github.com/denchco/knowledge-base-wiki-standard/security/advisories/new) for security reports.

A change is complete when it identifies affected requirements and profiles, updates canonical specification and agent context, adds or changes diagnostics and fixtures, records migration impact, updates the log/changelog, and passes `npm run verify` without rewriting canonical source.

Generated files are never edited as substitutes for canonical inputs. Topic-specific preferences remain local unless their reuse class and fallback are demonstrated.
