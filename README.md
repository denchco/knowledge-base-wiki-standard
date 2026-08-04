# DenchCo Knowledge Base Wiki Standard

An OKF-compatible standard for evidence-governed, human- and AI-maintained wikis.

Public human documentation: <https://denchco.github.io/knowledge-base-wiki-documentation/>

This repository is the canonical source for the specification, profiles, schemas, prompts, subject-empty starter, and reference-qualified conformance tooling. It combines:

- the persistent, compounding wiki model from Karpathy's LLM Wiki;
- Open Knowledge Format (OKF) v0.2 as the portable knowledge foundation;
- separate but coordinated Human Wiki and LLM Wiki products;
- Zensical and the DenchCo governed visual profile as the primary human renderer;
- source, evidence, uncertainty, Graphify, design, browser, runtime, and release governance.

## Repository boundary

This is the sole normative standard repository, intended for `denchco/knowledge-base-wiki-standard`. The separate public documentation site explains and demonstrates the standard but is not normative.

Do not use this repository root as a topic Wiki or recursively copy it into one. Its `docs/`, `knowledge/`, evidence, dogfood reports, and project records are about the standard itself. Independent knowledge bases start from the subject-empty [`starter/`](starter/) recipe, create their own content, pin an immutable standard revision, and choose their own URL and deployment.

Canonical schemas live in this repository's `schema/` directory. Public endpoints are mirrored at <https://denchco.github.io/knowledge-base-wiki-documentation/schema/> for discovery; validation uses the schema copy from the consumer's pinned standard checkout or release artifact and therefore has no runtime dependency on Pages.

## Status

Version `0.1.0-candidate`. The executable candidate and its first five-project dogfood cycle are complete. The public source is `denchco/knowledge-base-wiki-standard`; immutable prereleases `v0.1.0-rc.1`, `v0.1.0-rc.2`, and `v0.1.0-rc.3` are published from their exact CI-green commits. `v0.1.0-rc.3` is the current released candidate and adds governed question styling, semantic responsive Mermaid architecture, and deterministic repository/local-versus-public publication scoping without changing the manifest or OKF content model.

The npm implementation package uses the same `0.1.0-candidate` identifier. Python project metadata encodes that prerelease as PEP 440 `0.1.0rc0`; neither denotes a public `0.1.0` release.

## Start

Standard Production maintenance requires Git `2.41` or newer and the reference-qualified Jujutsu `0.39.0`. Initialize the colocated Jujutsu workspace only when `.jj` is absent; never reinitialize an existing workspace:

```sh
git --version
jj --version
test -d .jj || jj git init --colocate .
npm ci
uv sync --frozen
npm run browser:install
node scripts/check-provenance.mjs --mode maintainer
npm run verify
npm run service:register
npm run service:start
```

`jj --version` MUST report `jj 0.39.0` for this candidate. Portable Core remains Git-only compatible. An explicitly Git-only distribution/CI checkout uses `node scripts/check-provenance.mjs --mode distribution`; that mode verifies the Git surface and reports Jujutsu maintainer provenance as `not-checked`, never as a Standard Production maintainer pass.

The local wiki is reserved at <http://127.0.0.1:8017/>.

## Canonical entry points

- `docs/spec/index.md` — normative specification.
- `.wiki-standard.yaml` — this repository's conformance declaration.
- `knowledge/` — explicit portable OKF v0.2 knowledge bundle.
- `DEPENDENCIES.md` — dependency classes, pins, and installation requirements.
- `prompts/instantiate-wiki.md` — canonical repeatable bootstrap prompt.
- `starter/starter.yaml` — allowlisted subject-empty consumer recipe.
- `AGENTS.md` — shared Codex/Claude operating, clarification, completion, and cycle-guard contract.
- `CLAUDE.md` — Claude Code import of the canonical `AGENTS.md` instructions.
- `docs/llm-wiki/index.md` — compact agent-facing wiki.
- `docs/project/status.md` — current bounded priorities, separate from parked work.
- `docs/conformance/index.md` — dogfood reports and conformance evidence.

The lifecycle CLI is read-only in this candidate:

```sh
npm run conformance:inspect -- . --json
npm run conformance:validate -- . --strict --json
npm run conformance:export-okf -- .
npm run conformance:diff -- /path/to/consumer --json
npm run conformance:upgrade-plan -- /path/to/consumer --json
npm run conformance:init-plan -- /path/to/new-wiki --profile standard-production --json
```

For a complete independent-target plan, also supply `--standard-revision`, `--wiki-url`, and `--deployment` (`none` is valid). The plan classifies each target path as rendered from a subject-empty template, authored from target evidence, or adapted from the pinned release.

`upgrade` and `init` emit review plans only. They have no apply mode and never create or rewrite target files.

## Documentation synchronization

The private `denchco/knowledge-base-wiki-documentation` source publishes the public help/example site. It consumes an isolated, hash-checked snapshot of this repository; its Pages build takes the pinned specification and public schemas from that snapshot while retaining documentation-owned explanations and presentation.

After a local standard change, update and verify the sibling documentation repository with:

```sh
npm run sync:documentation:apply
npm run sync:documentation:check
npm run verify:workspace
```

The apply command writes only `.denchco-standard-snapshot/` in the sibling repository and refuses modified or unmanaged snapshot files. `verify:workspace` combines the complete standard gate with the real sibling drift check. Before a release, commit and fully verify this repository, reapply the snapshot so it records the clean commit, then verify and commit the documentation repository. Documentation CI checks the snapshot against the immutable standard tag before Pages can deploy.

Although this is the canonical template source, it is deliberately not a one-click GitHub Template repository: GitHub's template operation copies the whole default branch, including the standard's own specification and evidence. Consumers instead use the allowlisted [`starter/`](starter/) recipe so a new knowledge base begins subject-empty.

## Authority

Only this repository's `docs/spec/`, `schema/`, and released profile definitions are normative. The private documentation source, its public Pages artifact, generated indexes, Graphify output, examples, and fixtures demonstrate or explain the standard; they do not supersede it.

## Licence

Copyright (c) 2026 Andrew Dench. The repository's original work is available under the [MIT License](LICENSE); third-party material retains its own terms. See `LICENSING.md` for the boundary.
