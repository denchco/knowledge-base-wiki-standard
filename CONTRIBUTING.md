# Contributing

This candidate accepts implementation-led proposals and defect reports through issues. Unsolicited code pull requests are not yet open; maintainers will explicitly invite an implementation change after intake when appropriate.

## Propose a reusable change

Use one tracked JSON record under `standard-proposals/` when a user-authored consumer implementation exposes a potentially reusable pattern or Standard defect. Preserve the originating project, full Git-compatible implementation commit, optional JJ change ID, and pinned Standard revision, then describe the problem and outcome, proposed reuse class, affected contract, dependencies and simpler fallback, implementation evidence, accessibility/browser results, verification fixture, disclosure/licensing state, and migration impact. A requirement ID may be `unknown` or `new-requirement` at intake; the maintainer assigns stable normative wording before acceptance.

After the verified implementation is committed, use:

```sh
npm run standard:proposal -- new <slug>
npm run standard:proposal -- check <id>
npm run standard:proposal -- prepare <id>
npm run standard:proposal -- show <id>
npm run standard:proposal -- record <id> --approve <sha256> --by <authority>
npm run standard:proposal -- open <id>
```

`prepare` creates only a disposable sanitised payload under ignored `output/standard-proposals/`. `show` presents the exact repository, title, labels, body, stable hidden marker, governed form SHA-256, and payload SHA-256. Approval is valid only for both recorded digests; any payload or form edit invalidates it. `open` searches open and closed issues by marker, verifies the published `standard-change.yml` form and `standard-change` label, then opens the governed form. The user performs GitHub's final submission. If the form or label is unavailable, or the network outcome is ambiguous, stop and reconcile by marker; never substitute an automatic issue write.

After submission, record the matching issue URL locally and close the turn with the repository's JJ phase. Later use `record` only for an explicit Standard decision, immutable release mapping, or separately authorised consumer adoption, and use `sync --check` for read-only reconciliation. The Standard registry, not issue open/closed state, is authoritative for acceptance and release inclusion.

Filing a proposal does not promote the pattern. It remains `experimental` or project-owned until maintainer review classifies it as `project-specific`, `reusable`, `preferred`, or `core`. Do not upload patches, screenshots, or evidence automatically. The tracked record remains authoritative; generated payloads are recreatable output.

Issue authority does not authorize a pull request, release, publication, migration, consumer pin change, adoption, or conformance change. Each remains a separate reviewed action and, where it changes persistent files, a separate JJ-recorded turn.

Do not include secrets, personal or confidential data, or vulnerability details. Use [GitHub private vulnerability reporting](https://github.com/denchco/knowledge-base-wiki-standard/security/advisories/new) for security reports.

A change is complete when it identifies affected requirements and profiles, updates canonical specification and agent context, adds or changes diagnostics and fixtures, records migration impact, updates the log/changelog, and passes `npm run verify` without rewriting canonical source.

Generated files are never edited as substitutes for canonical inputs. Topic-specific preferences remain local unless their reuse class and fallback are demonstrated.
