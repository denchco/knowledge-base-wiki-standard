# DenchCo Knowledge Base Wiki Standard

An OKF-compatible standard for evidence-governed, human- and AI-maintained wikis.

This repository is the canonical source for the specification, profiles, schemas, prompts, conformance tooling, and reference Zensical wiki. It combines:

- the persistent, compounding wiki model from Karpathy's LLM Wiki;
- Open Knowledge Format (OKF) v0.2 as the portable knowledge foundation;
- separate but coordinated Human Wiki and LLM Wiki products;
- Zensical and the DenchCo governed visual profile as the primary human renderer;
- source, evidence, uncertainty, Graphify, design, browser, runtime, and release governance.

## Status

Version `0.1.0-candidate`. GitHub publication is intentionally deferred until the local specification and conformance kit pass their first dogfood cycle.

## Start

```sh
npm install
uv sync
npm run verify
npm run service:register
npm run service:start
```

The local wiki is reserved at <http://127.0.0.1:8017/>.

## Canonical entry points

- `docs/spec/index.md` — normative specification.
- `.wiki-standard.yaml` — this repository's conformance declaration.
- `DEPENDENCIES.md` — dependency classes, pins, and installation requirements.
- `prompts/instantiate-wiki.md` — canonical repeatable bootstrap prompt.
- `AGENTS.md` — agent operating and clarification contract.
- `docs/llm-wiki/index.md` — compact agent-facing wiki.

## Authority

Only `docs/spec/`, `schema/`, and released profile definitions are normative. The rendered site, generated indexes, Graphify output, examples, and fixtures demonstrate or test the standard; they do not supersede it.
