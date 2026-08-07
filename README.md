<p align="center">
  <img src="docs/assets/brand/denchco-wordmark.png" alt="DENCH | CO" width="280">
</p>

<h1 align="center">DenchCo Knowledge Base Wiki Standard</h1>

<p align="center">
  Build a trustworthy, searchable knowledge base with an AI coding agent—even if this is your first one.
</p>

<p align="center">
  <a href="https://github.com/denchco/knowledge-base-wiki-standard/actions/workflows/verify.yml"><img src="https://github.com/denchco/knowledge-base-wiki-standard/actions/workflows/verify.yml/badge.svg?branch=main" alt="Verify"></a>
  <a href="https://github.com/denchco/knowledge-base-wiki-standard/releases"><img src="https://img.shields.io/github/v/release/denchco/knowledge-base-wiki-standard?include_prereleases&sort=semver&label=release" alt="Latest release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/denchco/knowledge-base-wiki-standard" alt="MIT License"></a>
  <a href="https://denchco.github.io/knowledge-base-wiki-documentation/"><img src="https://img.shields.io/badge/documentation-read-0b7285" alt="Documentation"></a>
</p>

The Standard keeps editable Markdown, source records, evidence, uncertainty, a human-facing wiki, and an agent-facing wiki working as one maintainable knowledge base.

## Give this URL to an AI agent

Open Codex, Claude Code, or another coding agent that can read GitHub repositories, write local files, and run commands. Start it in the folder where you want to work, then paste this repository address:

```text
https://github.com/denchco/knowledge-base-wiki-standard
```

That is the whole starting prompt. You do not need to find a prompt file, choose a release, fill in a project brief, or decide on a profile, folder, local Wiki address, or deployment service first.

The agent begins by asking whether you want:

- a **research topic seed**—text, a file, a folder, a web page, or another repository that gives it something to investigate; or
- a **subject-empty local wiki**—the complete governed structure, ready for research material later.

If you already gave it a seed or asked for a blank wiki, it skips that question. It reads any supplied material and inspects any existing workspace before asking what is still unresolved.

## Questions you may be asked

The agent asks one question at a time. The number changes as your answers resolve—or reveal—what matters.

| Decision | When it is asked |
|---|---|
| Research seed or subject-empty start | First, unless your request already says which |
| Project title | For a subject-empty wiki, or when a seed does not support a responsible title |
| Accent colour | Always confirmed: the agent proposes an evidenced colour or the default `#0b7285`, then asks whether to use or replace it |
| Audience, reader task, or intended outcome | Only when the seed does not make it clear and the answer would change the structure |
| Research extent | Only when it is unclear whether to use just the supplied material or add authoritative external sources |
| Sensitive or restricted material | Only when privacy, licensing, retention, or source authority cannot be resolved safely |
| Target folder | Only when there is a collision or more than one sensible repository boundary |

The agent does **not** routinely ask you for a version tag, profile, local URL, service adapter, or deployment choice.

## What happens automatically

- The current default branch is resolved to an exact commit and that immutable revision is recorded in your wiki.
- `standard-production` is selected unless the evidence calls for another profile.
- A separate local project folder and a conflict-free local Wiki address are chosen.
- A title, audience, reader task, intended outcome, and source boundary are inferred where the material supports them.
- An accessible colour family is derived from the confirmed accent colour and checked for contrast.
- External publishing stays off unless you explicitly ask for it.
- The wiki is built, checked, and handed back with its verified live local address and any known limitations; file or editor links do not substitute for Wiki navigation.

## What you receive

- **Plain Markdown source** that remains readable and editable without specialist software.
- **A searchable Human Wiki** for reading, explaining, and navigating the subject.
- **One consistent governing question** wherever its exact wording is deliberately repeated for readers.
- **An LLM Wiki** that helps AI agents find the right context and maintain the same knowledge safely.
- **Source and evidence records** that distinguish supported claims, uncertainty, gaps, and work still to validate, with each displayed source identity linked to its exact registered row.
- **Diagrams and a knowledge graph** where the selected profile requires them.
- **Repeatable checks** and a record of exactly which Standard revision was used.
- **Live Wiki navigation in development responses**, rooted at the configured canonical address and checked against file/editor or clickable repository-path fallbacks.

A subject-empty start creates the structure without inventing research claims, evidence, concepts, or a governing question.

## Documentation

Use the [first-wiki guide](https://denchco.github.io/knowledge-base-wiki-documentation/getting-started/) for a plain-language walkthrough, or browse the full [Documentation](https://denchco.github.io/knowledge-base-wiki-documentation/) for examples and explanations.

This repository defines and verifies the Standard. The Documentation explains how to use it.

## How the Standard works

The implementation combines:

- the persistent, compounding wiki model from Karpathy's LLM Wiki;
- Open Knowledge Format (OKF) v0.2 as the portable knowledge foundation;
- coordinated Human and LLM Wiki views over the same canonical knowledge;
- explicit source, evidence, uncertainty, design, runtime, and release governance; and
- Zensical, Graphify, browser checks, Git, and Jujutsu in the Standard Production profile.

Only this repository's released specification, schemas, and profile definitions are normative. A new knowledge base is created from the subject-empty [`starter/`](starter/) recipe rather than by copying this repository and its own documentation or evidence.

<details>
<summary><strong>Candidate status</strong></summary>

The implementation version is `0.1.0-candidate`. Immutable prereleases `v0.1.0-rc.1`, `v0.1.0-rc.2`, and `v0.1.0-rc.3` are published; the repository's current default branch may contain verified unreleased improvements.

The npm package uses `0.1.0-candidate`. Python project metadata represents the candidate as PEP 440 `0.1.0rc0`; neither denotes a public `0.1.0` release.

</details>

<details>
<summary><strong>Propose a reusable change</strong></summary>

A consumer wiki follows the [tracked Standard proposal workflow](docs/llm-wiki/standard-proposals.md) and keeps each reusable improvement in a `standard-proposals/` record. The record is the durable authority for the originating project and immutable revision, the verified local implementation, the exact reviewed public payload, and every later decision. Generated files under `output/standard-proposals/` are disposable previews only.

```sh
npm run standard:proposal -- new <slug>
npm run standard:proposal -- check --all
npm run standard:proposal -- prepare <id>
npm run standard:proposal -- show <id>
npm run standard:proposal -- open <id>
```

`check` and `show` are read-only. `prepare` creates a local preview, and `open` performs only a fail-closed availability check before opening the governed issue form in the user's browser. The command never submits an issue or uploads attachments. The exact prepared payload needs explicit digest-bound approval, and the user remains responsible for the form's final Submit action.

An issue is only intake. Acceptance is a separate Standard-maintainer decision; release publication is a separate release-authority action; and changing a consumer's Standard pin is a separate adoption decision recorded by that consumer. A closed issue proves none of those later states.

</details>

<details>
<summary><strong>For Standard maintainers</strong></summary>

Standard Production maintenance requires Git `2.41` or newer and the reference-qualified Jujutsu `0.39.0`. Initialize the colocated Jujutsu workspace only when `.jj` is absent:

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

`jj --version` must report `jj 0.39.0` for this candidate. An explicitly Git-only distribution or CI checkout uses `node scripts/check-provenance.mjs --mode distribution`; that narrower check never proves the maintainer-workspace obligation.

End every file-changing development turn with the helper below before giving the final response. It runs complete verification, inspects Git and Jujutsu state, records the turn's changes in a JJ commit, discloses a verification failure in that commit while returning the failing status, and creates no empty commit for a clean turn:

```sh
npm run jj:phase -- -m "Development-turn summary"
```

The [local Standard wiki](http://127.0.0.1:8017/) is reserved as `denchco-kb-wiki-standard` on port `8017`. `service:start` serializes the user-scoped register and live-bind checks under an exclusive lock, atomically publishes the reservation, and then installs the LaunchAgent. `service:status` succeeds only when the exact registration, installed and loaded adapter, and [`service-identity.json`](docs/assets/service-identity.json) marker all agree; an unrelated HTTP 200 is unhealthy.

Before a development response presents Wiki navigation, verify the managed service identity and every displayed route, then validate the captured draft:

```sh
npm run response:links:check -- --base-url http://127.0.0.1:8017/
```

`DKBWS-PROMPT-002` rejects file/editor URLs, clickable local-filesystem paths, repository-relative links, and live Wiki URLs outside the configured origin. A plain repository path may identify a non-Wiki implementation artifact, but it is not Wiki navigation. The checker makes captured violations nonconforming; absolute interception of an uncaptured response requires a host-provided pre-send hook.

</details>

<details>
<summary><strong>Technical reference and lifecycle CLI</strong></summary>

Canonical entry points:

- [`docs/spec/index.md`](docs/spec/index.md)—normative specification.
- [`.wiki-standard.yaml`](.wiki-standard.yaml)—this repository's conformance declaration.
- [`prompts/instantiate-wiki.md`](prompts/instantiate-wiki.md)—canonical adaptive bootstrap behaviour.
- [`starter/starter.yaml`](starter/starter.yaml)—allowlisted subject-empty consumer recipe.
- [`knowledge/`](knowledge/)—portable OKF v0.2 knowledge bundle about the Standard.
- [`AGENTS.md`](AGENTS.md) and [`CLAUDE.md`](CLAUDE.md)—shared Codex and Claude operating contract.
- [`docs/llm-wiki/index.md`](docs/llm-wiki/index.md)—compact agent-facing wiki.
- [`docs/project/status.md`](docs/project/status.md)—current bounded priorities and parked work.
- [`docs/conformance/index.md`](docs/conformance/index.md)—dogfood reports and conformance evidence.
- [`docs/llm-wiki/standard-proposals.md`](docs/llm-wiki/standard-proposals.md)—tracked proposal records, Standard decision registry, and release/adoption boundaries.

The lifecycle CLI is read-only or planning-only in this candidate:

```sh
npm run conformance:inspect -- . --json
npm run conformance:validate -- . --strict --json
npm run conformance:export-okf -- .
npm run conformance:diff -- /path/to/consumer --json
npm run conformance:upgrade-plan -- /path/to/consumer --json
npm run conformance:init-plan -- /path/to/new-wiki --profile standard-production --json
npm run standard:proposal -- check --all
```

`upgrade` and `init` emit review plans only. They have no apply mode and never create or rewrite target files.

</details>

<details>
<summary><strong>Documentation synchronization</strong></summary>

The Documentation build consumes an isolated, hash-checked snapshot of this repository while retaining its own explanatory content and presentation. After a local Standard change, maintainers can inspect sibling drift with:

```sh
npm run sync:documentation:check
```

Refreshing the managed snapshot is a deliberate release step:

```sh
npm run sync:documentation:apply
npm run verify:workspace
```

The apply command writes only `.denchco-standard-snapshot/` in the sibling Documentation repository and refuses modified or unmanaged snapshot files. Pages deployment separately verifies the pinned immutable Standard tag.

</details>

## Security and licence

Report vulnerabilities through the [private security advisory route](https://github.com/denchco/knowledge-base-wiki-standard/security/advisories/new), not a public issue.

Copyright (c) 2026 Andrew Dench. Original work is available under the [MIT License](LICENSE); third-party material keeps its own terms. See [Licensing](LICENSING.md) for the DenchCo identity and third-party boundary.
