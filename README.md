# DenchCo Knowledge Base Wiki Standard

An OKF-compatible standard for evidence-governed, human- and AI-maintained wikis.

This repository is the canonical source for the specification, profiles, schemas, prompts, conformance tooling, and reference Zensical wiki. It combines:

- the persistent, compounding wiki model from Karpathy's LLM Wiki;
- Open Knowledge Format (OKF) v0.2 as the portable knowledge foundation;
- separate but coordinated Human Wiki and LLM Wiki products;
- Zensical and the DenchCo governed visual profile as the primary human renderer;
- source, evidence, uncertainty, Graphify, design, browser, runtime, and release governance.

## Status

Version `0.1.0-candidate`. The executable local candidate and its first five-project dogfood cycle are complete. GitHub publication remains intentionally deferred until licence, ownership, visibility, security-contact, and release decisions are explicit.

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
- `AGENTS.md` — agent operating and clarification contract.
- `docs/llm-wiki/index.md` — compact agent-facing wiki.
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

`upgrade` and `init` emit review plans only. They have no apply mode and never create or rewrite target files.

## Authority

Only `docs/spec/`, `schema/`, and released profile definitions are normative. The rendered site, generated indexes, Graphify output, examples, and fixtures demonstrate or test the standard; they do not supersede it.
