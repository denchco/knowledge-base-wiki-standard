# Dependency Contract

Dependencies are classified so consumers can distinguish required knowledge-format support from one reference implementation.

| Class | Required for | Dependencies |
|---|---|---|
| Universal | Reading and editing | UTF-8, Markdown, YAML frontmatter, and Git-compatible files; no Jujutsu CLI is required for Portable Core reading |
| Standard validation | Conformance | Node.js 24 LTS+, npm, Draft 2020-12 validation through `ajv==8.20.0`, exactly pinned `yaml==2.9.0` |
| Reference renderer | Human Wiki | Python 3.12+, `uv`, exactly pinned `zensical==0.0.52`; installed-lock audit through `pip-audit==2.10.1` |
| Knowledge graph | Graph-Linked capability | exactly pinned `graphifyy==0.9.32` |
| Browser runtimes | Production diagrams/graphs | `mermaid==11.16.0`, `vis-network==10.1.0`, `3d-force-graph==1.80.0` |
| Browser verification | Rendered conformance | `@playwright/test==1.62.1` and its matching Chromium binary |
| Design validation | Design-Governed capability | `@google/design.md==0.4.0` |
| Local provenance | Standard Production maintenance workspace | Git 2.41 or newer; exactly `jj==0.39.0` is the reference-qualified Jujutsu CLI; colocated `.git` and `.jj` roots |
| Persistent macOS runtime | `macos-launchd` adapter | Node.js, `launchctl`; generated user LaunchAgent, no sudo |
| Deployment adapter | Not selected | No deployment CLI or credentials are required; add and qualify a locked adapter before publication to a hosting target |
| MCP integration | Optional | GitHub MCP Server initially; a dedicated standard MCP is a later adapter |

## Repeatable reference build

The reference distribution has three install surfaces:

```sh
npm ci
uv sync --frozen
npm run browser:install
```

- `npm ci` installs the exact Node dependency graph in `package-lock.json`.
- `uv sync --frozen` installs the exact Python dependency graph in `uv.lock`.
- `npm run browser:install` installs the Chromium revision matched to the pinned Playwright package. It is required for `npm run verify`, but not for reading or building Markdown.
- Linux CI uses `npm run browser:install:ci` to install Chromium and its operating-system libraries.

The repeatable commands are:

| Command | Contract |
|---|---|
| `npm run prepare:runtime` | Copies Mermaid, vis-network, and 3d-force-graph browser bundles from the pinned local packages into ignored generated assets. |
| `npm run graph:update` | Prepares local runtimes, updates Graphify, enriches six relationship layers, and publishes the shared 2D/3D dataset. |
| `npm run build:site` | Prepares local runtimes and performs a strict Zensical build. |
| `npm run build` | Regenerates the graph publication and then performs the strict site build. |
| `npm run check` | Runs source/content, adoption, lifecycle, Draft 2020-12 artifact, provenance, npm/Python vulnerability, design, and visual-contract checks without starting a server. |
| `npm run conformance:full-report -- --target . --receipt output/verification/receipt.json` | Consumes an explicit schema-valid verification receipt and emits the selected-profile report; absent gates remain `not-checked`. |
| `npm run audit:node` | Audits the exact npm lock graph and fails high or critical known vulnerabilities. |
| `npm run audit:python` | Audits the locally installed environment reconstructed from `uv.lock`; run after `uv sync --frozen`. |
| `npm run verify` | Snapshots every tracked and unignored canonical file, runs build/check/Graphify/browser gates, and fails any canonical mutation while permitting only declared ignored derived outputs. |

The provenance checker is read-only and has two explicit modes. Maintainer mode proves `DKBWS-PROV-001` by checking the Git root and version, the `jj` version, the colocated Jujutsu/Git roots, and a readable current Jujutsu change with working-copy snapshotting disabled. Distribution/CI mode checks only the Git-distributed surface and reports Jujutsu as not checked; it does not prove a Standard Production maintenance workspace.

Successful `npm run verify` writes an ignored `output/verification/receipt.json` and `output/verification/conformance-report.json`. The receipt records each command gate, local evidence identifiers and digests, the canonical-input before/after result, and the explicit provenance mode. The report builder schema-validates both inputs and output, distinguishes evaluation completeness from conformance outcome, and refuses to infer passes for missing gates. Maintainer verification requires a conformant complete report. Git-only CI permits only the explicit `DKBWS-PROV-001` `not-checked` gap; any other failure or unevaluated requirement still fails CI.

The CI reference uses Node 24 Active LTS with `actions/checkout` pinned to `de0fac2e4500dabe0009e67214ff5f5447ce83dd` (v6.0.2), `actions/setup-node` pinned to `48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e` (v6.4.0), and `astral-sh/setup-uv` pinned to `08807647e7069bb48b6ef5acd8ec9567f424441b` (v8.1.0). CI explicitly selects provenance `distribution` mode; that receipt remains `not-checked` for Jujutsu and is not a maintainer-provenance pass.

`docs/assets/vendor/`, `docs/assets/graphify/`, `graphify-out/`, `.cache/`, `output/verification/`, `GRAPH_REPORT.md`, and `site/` are generated and ignored. A clean clone reconstructs them from canonical source and locked dependencies. Dependency environments (`node_modules/` and `.venv/`) and repository control data (`.git/` and `.jj/`) are outside the verification snapshot; installation and workspace setup happen before verification.

No rendered page may load Mermaid, vis-network, or 3d-force-graph from a public CDN. The browser contract records requests and fails on public-CDN use, failed local assets, console errors, blank diagrams/canvases, unusable controls, or desktop/mobile overflow.

## Tested renderer compatibility

The Zensical reference adapter is tested and supported at exactly `zensical==0.0.52`. Its CSS selectors, closed-shadow Mermaid adapter, navigation/search lifecycle, Standard/Wide geometry, and strict build are verified against that version. A different Zensical version is unsupported until its lock is updated deliberately and the complete source, graph, strict-build, desktop, and mobile browser contracts pass. Portable OKF knowledge and the core conformance profile remain renderer-neutral.

## Reproducibility rules

- Exact production/runtime pins live in `pyproject.toml` and `package-lock.json`.
- `uv.lock` and `package-lock.json` are committed.
- CI installs from locks and runs the same mutation-safe verification contract, failing additions, deletions, or content changes to tracked or unignored canonical files.
- Optional profiles must declare their additional dependencies and checks.
- “Latest” is never a build input. Upgrades are deliberate changes with migration evidence.
- Installing npm, Python, uv, Chromium, Jujutsu, or deployment CLIs may require network access; the built Human Wiki and its diagram/graph runtimes do not.

## Provenance compatibility note

The candidate is locally reference-qualified with Git `2.50.1` and Jujutsu `0.39.0`. Git `2.41` is the minimum supported Git boundary because current Jujutsu Git interoperability no longer supports older Git versions. Upstream Jujutsu `0.42.0` is recorded as available as of 3 August 2026, but it is **not yet reference-qualified** for this candidate: it must not replace `0.39.0` until the read-only provenance check and complete Standard Production verification suite pass and the dependency contract is deliberately updated.
