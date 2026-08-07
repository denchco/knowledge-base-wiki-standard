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
| Documentation synchronization | Standard maintainer integration | Sibling Git repository at the contract's portable default path or an explicit runtime path; uses the existing Node, Ajv, and YAML dependencies and stores no absolute path |
| Proposal integration | Optional consumer-to-Standard handoff | Existing Node, Ajv, and YAML dependencies for local record validation and preview generation; a browser and network are used only for an explicitly requested governed-form check/open or registry comparison |
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
| `npm run check` | Runs source/content, tracked Standard-proposal, canonical governing-question consistency, exact reader-to-source-row links, adoption, lifecycle, Draft 2020-12 artifact, provenance, npm/Python vulnerability, design, and visual-contract checks without starting a server or making remote writes. |
| `npm run check:governing-question` | Checks the manifest-mapped canonical question and every exact repetition in its bounded reader-source set; subject-empty or non-selected profiles report a deliberate not-applicable result. |
| `npm run sources:link` | Optionally and idempotently converts visible source identities on bounded reader evidence surfaces into individual exact-row links; it is an explicit authoring migration, never part of read-only checking or upgrade planning. |
| `npm run standard:proposal -- check --all` | Read-only validation of every tracked proposal record and its state transitions; it performs no network access. |
| `npm run standard:proposal -- prepare <id>` | Builds a disposable scrubbed payload preview from one valid tracked record; it performs no remote write. |
| `npm run standard:proposal -- open <id>` | Fails closed unless the governed form, required label, immutable prepared payload, and submission marker agree, then performs only a browser open; the user submits the form. |
| `npm run conformance:full-report -- --target . --receipt output/verification/receipt.json` | Consumes an explicit schema-valid verification receipt and emits the selected-profile report; absent gates remain `not-checked`. |
| `npm run audit:node` | Audits the exact npm lock graph and fails high or critical known vulnerabilities. |
| `npm run audit:python` | Audits the locally installed environment reconstructed from `uv.lock`; run after `uv sync --frozen`. |
| `npm run verify` | Snapshots every tracked and unignored canonical file, runs build/check/Graphify/browser gates, and fails any canonical mutation while permitting only declared ignored derived outputs. |
| `npm run service:register` | Serializes shared-register and live-listener checks under an exclusive bounded lock, atomically reserves the configured service ID and loopback endpoint, and refuses conflicts without stopping another service. |
| `npm run service:start` | Registers, installs, and loads the macOS user LaunchAgent, then waits for the exact static service identity marker. |
| `npm run service:status` | Fails unless registry ownership, LaunchAgent installation/load, HTTP 200, and the configured marker service ID all agree. |
| `npm run sync:documentation:apply` | Explicitly refreshes only the sibling documentation repository's managed standard snapshot; refuses local edits and unmanaged snapshot paths. |
| `npm run sync:documentation:check` | Read-only comparison of every allowlisted file hash, byte count, mode, contract digest, and standard revision. |
| `npm run verify:workspace` | Runs complete standard verification and then proves the real sibling documentation snapshot is current. |
| `npm run jj:phase -- -m "Development-turn summary"` | Runs complete verification, inspects Git and Jujutsu state, and records the turn's persistent changes in a JJ commit. A failed verification is disclosed in the commit and returned as a failing command; a clean turn creates no empty commit. |

The provenance checker is read-only and has two explicit modes. Maintainer mode proves `DKBWS-PROV-001` by checking the Git root and version, the `jj` version, the colocated Jujutsu/Git roots, and a readable current Jujutsu change with working-copy snapshotting disabled. Distribution/CI mode checks only the Git-distributed surface and reports Jujutsu as not checked; it does not prove a Standard Production maintenance workspace.

The macOS managed-preview adapter keeps its versioned inventory at `~/.config/codex-dev-servers/registry.json`, its exclusive lock beside that file, generated LaunchAgent under `~/Library/LaunchAgents/`, and service logs under `~/.local/state/codex-dev-servers/`. The registry binds a stable service ID to its owning project root, endpoint, command, adapter label, and health path. One bounded lock transaction reloads the register, checks registered assignments, and probes an exclusive live bind before a same-directory atomic rename publishes the complete update. Stale recovery removes only an aged lock whose recorded owner process is no longer live. Registration never kills or overwrites a listener to make a requested port free. The static `/assets/service-identity.json` marker conforms to `schema/service-identity-v1.json`. Foreground or port-zero browser checks remain useful `DKBWS-RUNTIME-001` evidence but cannot prove this persistent adapter.

The read-only probe proves the workspace substrate. The end-of-development-turn helper and instruction fixture prove the required operating mechanism; reviewable JJ history remains the evidence that completed turns actually used it. The commit trigger is every file-changing development-turn boundary, not a subjective significance threshold.

When `DKBWS-HUMAN-004` applies, the manifest maps one canonical governing-question source and a bounded set of reader sources. The source checker requires every exact reader-facing repetition to use the governed `DKBWS-HUMAN-002` callout, and the browser contract verifies every discovered repetition route at desktop and mobile widths. A reference checker or route layout is an adapter; the normative outcome, exclusions, explicit profile result, and migration proof remain portable. Subject-empty Wikis omit the mapping and record the conditional requirement as not applicable rather than inventing a question.

Successful `npm run verify` writes an ignored `output/verification/receipt.json` and `output/verification/conformance-report.json`. The receipt records each command gate, local evidence identifiers and digests, the canonical-input before/after result, and the explicit provenance mode. The report builder schema-validates both inputs and output, distinguishes evaluation completeness from conformance outcome, and refuses to infer passes for missing gates. Maintainer verification requires a conformant complete report. Git-only CI permits only the explicit `DKBWS-PROV-001` `not-checked` gap; any other failure or unevaluated requirement still fails CI.

Those two output paths are reserved for their declared schemas in Standard and consumer adapters. An ad hoc build/browser summary uses a different filename. Normal consumers also exclude this Standard's `sync:documentation:*`, `verify:workspace`, and sibling-documentation snapshot contract unless they independently declare and implement that maintainer integration.

Proposal records under `standard-proposals/` are canonical, tracked consumer or Standard-maintainer records. Prepared payloads under `output/standard-proposals/` are generated, ignored, and reconstructible. Local validation never needs network access; the CLI performs no issue submission, attachment upload, release publication, or consumer-pin mutation. Those actions remain with their separately named human authorities.

The CI reference uses Node 24 Active LTS with `actions/checkout` pinned to `de0fac2e4500dabe0009e67214ff5f5447ce83dd` (v6.0.2), full Git history (`fetch-depth: 0`) so revision-aware lifecycle fixtures can resolve immutable historical pins, `actions/setup-node` pinned to `48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e` (v6.4.0), and `astral-sh/setup-uv` pinned to `08807647e7069bb48b6ef5acd8ec9567f424441b` (v8.1.0). CI explicitly selects provenance `distribution` mode; that receipt remains `not-checked` for Jujutsu and is not a maintainer-provenance pass.

`docs/assets/vendor/`, `docs/assets/graphify/`, `graphify-out/`, `.cache/`, `output/verification/`, `output/standard-proposals/`, `GRAPH_REPORT.md`, and `site/` are generated and ignored. A clean clone reconstructs them from canonical source and locked dependencies. Dependency environments (`node_modules/` and `.venv/`) and repository control data (`.git/` and `.jj/`) are outside the verification snapshot; installation and workspace setup happen before verification.

No rendered page may load Mermaid, vis-network, or 3d-force-graph from a public CDN. The browser contract resolves question, Mermaid, architecture, table, list, reader-source-link, source-register, and graph representatives independently; records requests; fails closed when a selected-profile graph route is absent; and rejects public-CDN use, failed local assets, console errors, blank diagrams/canvases, broken exact-row citation journeys, unusable controls, uncontained mobile tables, or desktop/mobile overflow.

Adapters whose homepage does not contain every representative shape set local-path-only `DKBWS_BROWSER_QUESTION_ROUTE`, `DKBWS_BROWSER_MERMAID_ROUTE`, `DKBWS_BROWSER_ARCHITECTURE_ROUTE`, `DKBWS_BROWSER_TABLE_ROUTE`, `DKBWS_BROWSER_LIST_ROUTE`, and `DKBWS_BROWSER_SOURCE_LINKS_ROUTE` values. The source-register destination route is derived from the manifest's mapped role. Graph routes use the corresponding `_GRAPH_2D_ROUTE` and `_GRAPH_3D_ROUTE` overrides. Mermaid source inspection is inferred from the route or supplied through `_MERMAID_SOURCE` and `_ARCHITECTURE_SOURCE`; remote, query-bearing, fragment-bearing, and traversal values are rejected. A manifest may record `DKBWS-LINK-002` as not applicable when its Human Wiki displays no source identities; the browser contract then skips this representative rather than inventing a citation.

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
