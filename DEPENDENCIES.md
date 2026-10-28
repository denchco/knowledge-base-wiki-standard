# Dependency Contract

Dependencies are classified so consumers can distinguish required knowledge-format support from one reference implementation.

| Class | Required for | Dependencies |
|---|---|---|
| Universal | Reading and editing | UTF-8, Markdown, YAML frontmatter, and Git-compatible files; no Jujutsu CLI is required for Portable Core reading |
| Standard validation | Conformance | exactly Node.js `24.20.0`, enforced by `.node-version`, the package engine, npm `engine-strict`, the runtime check, and CI; Draft 2020-12 validation through `ajv==8.20.0` with locked `fast-uri==3.1.9`; exactly pinned `yaml==2.9.0` |
| Reference renderer | Human Wiki | Python `3.12.14` and uv `0.13.4` for the reference build (consumer minimum Python 3.12+), exactly pinned `zensical==0.0.59`; installed-lock audit through `pip-audit==2.10.1`, with CacheControl `0.14.4`, filelock `4.2.1` and msgpack `1.2.3` in its frozen cache dependency chain |
| Knowledge graph | Graph-Linked capability | exactly pinned `graphifyy==0.9.70`, with guarded reference indexing |
| Browser runtimes | Production diagrams/graphs | `mermaid==11.17.2` with exact scoped `katex==0.18.2` override and locked `dompurify==3.4.17`, `vis-network==10.1.2`, `3d-force-graph==1.80.0` |
| Browser verification | Rendered conformance | `@playwright/test==1.63.0` and its matching Chromium binary |
| Design validation | Design-Governed capability | local `@denchco/design-md-validator==0.4.0-denchco.1` from reviewed Google `design.md` `0.4.0` source, built with exact Zod `4.6.6` and `esbuild==0.28.2`; source, licence and dependency proofs under `tools/design-md/` |
| Local provenance | Standard Production maintenance workspace | Git 2.41 or newer; exactly `jj==0.45.1` is the reference-qualified Jujutsu CLI; colocated `.git` and `.jj` roots |
| Persistent macOS runtime | `macos-launchd` adapter | Node.js, `launchctl`; generated user LaunchAgent, no sudo |
| Deployment adapter | Not selected | No deployment CLI or credentials are required; add and qualify a locked adapter before publication to a hosting target |
| Documentation synchronization | Standard maintainer integration | Sibling Git repository at the contract's portable default path or an explicit runtime path; uses the existing Node, Ajv, and YAML dependencies and stores no absolute path |
| Proposal integration | Optional consumer-to-Standard handoff | Existing Node, Ajv, and YAML dependencies for local record validation and preview generation; a browser and network are used only for an explicitly requested governed-form check/open or registry comparison |
| MCP integration | Optional | Separately selected read-only GitHub MCP; a dedicated Standard MCP remains deferred until evidence shows an unmet workflow |

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
| `npm run prepare:runtime` | Builds Mermaid’s core with exact DOMPurify `3.4.17` using `esbuild==0.28.2`; copies graph bundles and emits inspected runtime metadata and a CycloneDX SBOM into ignored assets. |
| `npm run graph:update` | Prepares local runtimes, checks the bounded corpus and exact Graphify identity, disables external preprocessing, updates the graph in process, enriches six relationship layers, and publishes the shared 2D/3D dataset. |
| `npm run check:graphify-inputs` | Checks the guarded indexing boundary and runs benign-input, unsupported-input and symlink rejection fixtures. |
| `npm run build:site` | Prepares local runtimes and performs a strict Zensical build. |
| `npm run build` | Regenerates the graph publication and then performs the strict site build. |
| `npm run standard:stack -- resolve --json` | Reads the latest immutable release, exact tag/commit, trusted Verify evidence and selected stack file hashes. Emits a dated report; changes no repository. |
| `npm run standard:stack -- check <wiki> --json` | Reads the installed manifest and compares its frozen revision with the verified release. Reports availability without changing pins, installing dependencies or migrating content. |
| `npm run check` | Runs source/content, tracked Standard-proposal, canonical governing-question consistency, exact reader-to-source-row links, adoption, lifecycle, Draft 2020-12 artifact, provenance, npm/Python vulnerability, design, and visual-contract checks without starting a server or making remote writes. |
| `npm run check:governing-question` | Checks the manifest-mapped canonical question and every exact repetition in its bounded reader-source set; subject-empty or non-selected profiles report a deliberate not-applicable result. |
| `npm run response:next-steps:check -- --input <draft>` | Checks a captured development-cycle response for one to three ordered next steps with a proposed update, purpose and completion condition, or the explicit no-update outcome; grounding remains an agent review. |
| `npm run response:links:check -- --base-url <canonical-url>` | Checks a captured development-response draft from standard input (or the declared input file) and rejects file/editor URLs, clickable local or repository-relative paths, and live Wiki URLs outside the configured canonical HTTP(S) origin. |
| `npm run check:citations-built` | Checks every generated reader page against canonical citation identities and counts, numeric superscript markup, exact row targets and accessibility metadata. |
| `npm run sources:link` | Optionally and idempotently converts visible source identities on bounded reader evidence surfaces into individual exact-row links; it is an explicit authoring migration, never part of read-only checking or upgrade planning. |
| `npm run standard:proposal -- check --all` | Read-only validation of every tracked proposal record and its state transitions; it performs no network access. |
| `npm run standard:proposal -- prepare <id>` | Builds a disposable scrubbed payload preview from one valid tracked record; it performs no remote write. |
| `npm run standard:proposal -- open <id>` | Fails closed unless the governed form, required label, immutable prepared payload, and submission marker agree, then performs only a browser open; the user submits the form. |
| `npm run conformance:full-report -- --target . --receipt output/verification/receipt.json` | Consumes an explicit schema-valid verification receipt and emits the selected-profile report; every required proof obligation must be present and passing; absent proof remains `not-checked`. |
| `npm run audit:node` | Audits the exact npm lock graph and fails moderate, high, or critical known vulnerabilities. |
| `npm run audit:python` | Audits the locally installed environment reconstructed from `uv.lock`; run after `uv sync --frozen`. |
| `npm run check:python-tooling` | Checks exact cache-chain versions, actual pip-audit/CacheControl calls, file-lock exclusion and bounded malformed-msgpack rejection. |
| `npm run design:lint` | Validates reviewed source and actual Zod input bytes, builds the lint API into ignored cache output, and reports findings without changing `DESIGN.md`. |
| `node scripts/design-validator.mjs identity --json` | Rebuilds in memory and reports source, lock, compiler-input and generated-module hashes without writing files; it does not run a vulnerability audit. |
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

`DKBWS-PROMPT-002` uses the existing Node validation runtime plus the manifest's configured canonical Human Wiki URL; it introduces no third-party package. Before a development response displays Wiki navigation, the selected managed-service adapter proves exact service identity and every route proves HTTP availability. The checker operates on a captured draft, permits a plain repository path only as a non-Wiki implementation-artifact identifier, and fails when a clickable file-based substitute is presented. Absolute interception of an uncaptured response is outside repository control unless the selected agent host exposes a pre-send hook or mandatory response artifact.

When `DKBWS-HUMAN-004` applies, the manifest maps one canonical governing-question source and a bounded set of reader sources. The source checker requires every exact reader-facing repetition to use the governed `DKBWS-HUMAN-002` callout, and the browser contract verifies every discovered repetition route at desktop and mobile widths. A reference checker or route layout is an adapter; the normative outcome, exclusions, explicit profile result, and migration proof remain portable. Subject-empty Wikis omit the mapping and record the conditional requirement as not applicable rather than inventing a question.

Successful `npm run verify` writes an ignored `output/verification/receipt.json` and `output/verification/conformance-report.json`. The receipt records each command gate, local evidence identifiers and digests, the canonical-input before/after result, and the explicit provenance mode. The report builder schema-validates both inputs and output, distinguishes evaluation completeness from conformance outcome, and refuses to infer passes for missing gates. Maintainer verification requires a conformant complete report. Git-only CI permits only the explicit `DKBWS-PROV-001` `not-checked` gap; any other failure or unevaluated requirement still fails CI.

Those two output paths are reserved for their declared schemas in Standard and consumer adapters. An ad hoc build/browser summary uses a different filename. Normal consumers also exclude this Standard's `sync:documentation:*`, `verify:workspace`, and sibling-documentation snapshot contract unless they independently declare and implement that maintainer integration.

Proposal records under `standard-proposals/` are canonical, tracked consumer or Standard-maintainer records. Prepared payloads under `output/standard-proposals/` are generated, ignored, and reconstructible. Local validation never needs network access; the CLI performs no issue submission, attachment upload, release publication, or consumer-pin mutation. Those actions remain with their separately named human authorities.

The CI reference uses Ubuntu `24.04`, Python `3.12.14`, uv `0.13.4`, npm `11.19.0`, and exactly Node `24.20.0` Active LTS with `actions/checkout` pinned to `3d3c42e5aac5ba805825da76410c181273ba90b1` (v7.0.1), full Git history (`fetch-depth: 0`) so revision-aware lifecycle fixtures can resolve immutable historical pins, `actions/setup-node` pinned to `820762786026740c76f36085b0efc47a31fe5020` (v7.0.0), and `astral-sh/setup-uv` pinned to `20cfd1bf945f4377ade1205e4dbc17946fc9a30d` (v10.0.1). CI explicitly selects provenance `distribution` mode; that receipt remains `not-checked` for Jujutsu and is not a maintainer-provenance pass. A newer major Node release is not inferred compatible merely because its version number is higher.

`docs/assets/vendor/`, `docs/assets/graphify/`, `graphify-out/`, `.cache/`, `output/verification/`, `output/standard-proposals/`, `GRAPH_REPORT.md`, `site/`, `site-local/`, and `zensical.local.toml` are generated and ignored. The live Zensical service uses the generated local configuration and writes only `site-local/`, keeping its watcher separate from the postprocessed static `site/` build. A clean clone reconstructs them from canonical source and locked dependencies. Dependency environments (`node_modules/` and `.venv/`) and repository control data (`.git/` and `.jj/`) are outside the verification snapshot; installation and workspace setup happen before verification.

No rendered page may load Mermaid, vis-network, or 3d-force-graph from a public CDN. The browser contract resolves question, Mermaid, architecture, table, list, reader-source-link, source-register, and graph representatives independently; records requests; checks numeric citations on every citation-bearing reader route; fails closed when a selected-profile graph route is absent; and rejects public-CDN use, failed local assets, console errors, blank diagrams/canvases, broken exact-row citation journeys, unusable controls, uncontained mobile tables, or desktop/mobile overflow.

Adapters whose homepage does not contain every representative shape set local-path-only `DKBWS_BROWSER_QUESTION_ROUTE`, `DKBWS_BROWSER_MERMAID_ROUTE`, `DKBWS_BROWSER_ARCHITECTURE_ROUTE`, `DKBWS_BROWSER_TABLE_ROUTE`, `DKBWS_BROWSER_LIST_ROUTE`, and `DKBWS_BROWSER_SOURCE_LINKS_ROUTE` values. The source-register destination route is derived from the manifest's mapped role. Graph routes use the corresponding `_GRAPH_2D_ROUTE` and `_GRAPH_3D_ROUTE` overrides. Mermaid source inspection is inferred from the route or supplied through `_MERMAID_SOURCE` and `_ARCHITECTURE_SOURCE`; remote, query-bearing, fragment-bearing, and traversal values are rejected. A manifest may record `DKBWS-LINK-002` as not applicable when its Human Wiki displays no source identities; the browser contract then skips this representative rather than inventing a citation.

## Tested renderer compatibility

The reference Mermaid `11.17.2` core uses an exact KaTeX `0.18.2` compatibility exception to its upstream `^0.16.47` range. KaTeX `0.18.2` is the first patched release for `GHSA-238p-pmpm-9mq7`. The direct pin and scoped npm override select one implementation; the bundle alias, runtime version guard, input hashes and SBOM identify the code actually shipped. Mermaid `12.2.0` is not selected by this repair. [SRC-070](docs/sources.md#src-070)

The exception applies to Mermaid's public `renderToString` calls. Fixtures cover its MathML and HTML-plus-MathML output modes, inherited trust/settings and macro rejection, and missing or old dependency evidence. Browser checks exercise native MathML fractions and integrals, accessible descriptions, untrusted commands, local-only requests and desktop/mobile containment. The reference browser qualification does not expand to arbitrary browsers or KaTeX's private APIs.

Migration requires the exact direct pin, scoped override, frozen lock, runtime builder, entry point and matching fixtures together. Run `npm ci`, rebuild runtime and graph assets, inspect their dependency evidence, and run complete verification. A lock-only replacement does not carry this compatibility contract. Other consumer pins remain separately authorised.

The Graphify reference adapter uses exactly `graphifyy==0.9.70`, the first patched version listed for `GHSA-pcc4-rvhr-2pr8`. Indexing must use `scripts/graphify-update.py` through `npm run graph:update`. The wrapper rejects unsupported preprocessed Fortran inputs and corpus symlinks, checks the installed API boundary, and disables external preprocessing during extraction. Direct indexing commands bypass this qualified boundary. Read-only queries of the generated graph remain available.

Migration requires the wrapper, its fixtures, the exact frozen lock, package command checks and complete graph/browser verification together. Do not copy only the dependency pin. This qualification covers the declared reference corpus; it does not establish safe extraction of arbitrary untrusted corpora or qualify later Graphify versions. [SRC-062](docs/sources.md#src-062), [SRC-064](docs/sources.md#src-064)

The Zensical reference adapter is tested and supported at exactly `zensical==0.0.59`. Its CSS selectors, closed-shadow Mermaid adapter, navigation/search lifecycle, Standard/Wide geometry, and strict build are verified against that version. A different Zensical version is unsupported until its lock is updated deliberately and the complete source, graph, strict-build, desktop, and mobile browser contracts pass. Portable OKF knowledge and the core conformance profile remain renderer-neutral.

## rc.9 tooling qualification

The rc.9 release selects fast-uri `3.1.9` within Ajv `8.20.0`'s existing dependency range. Six focused tests cover the four registered URI advisories, the actual Ajv resolver and local Draft 2020-12 references. Inert differential controls distinguish the fixes from `3.1.8`; no tested URI is fetched or executed. [SRC-082](docs/sources.md#src-082)

The local design checker retains Google's parser, model and eleven lint rules at commit `9bf8eae67128b6cc55ad9bf86665767deb4c11cd`. Its two Zod 4 adaptations preserve nested defaults and explicit string-key records. Twelve tests retain all nine upstream fixture results, malformed-input diagnostics and read-only CLI behaviour, and check the upstream metadata archive. The build checks 95 Zod source files against hashes from the integrity-verified `4.6.6` npm archive, then compiles those checked bytes. A stale implementation fails even when its package label still says `4.6.6`. The old opaque npm bundle is no longer used. The Apache-2.0 licence and upstream notices remain with the copied source. [SRC-083](docs/sources.md#src-083), [SRC-087](docs/sources.md#src-087)

GitHub Dependency Review flagged the retained upstream manifest's historical Zod range. Its unchanged bytes now reside in `tools/design-md/upstream/packages/cli/package.json.upstream`, with the original path and hashes in provenance. The wrapper rejects any active `package.json` under `upstream/`, including one added to the provenance inventory. The active adapter manifest retains exact Zod `4.6.6`; all 288 compiler inputs and the compiled module remain unchanged. No audit rule is waived. [SRC-087](docs/sources.md#src-087)

The Python lock changes only filelock `3.32.2` to `4.2.1` and msgpack `1.2.1` to `1.2.3`. It retains pip-audit `2.10.1`, CacheControl `0.14.4`, Graphify `0.9.70` and Zensical `0.0.59`. Five focused tests cover actual cache serialization, atomic writes, `Vary`, deletion, ordinary `FileLock` exclusion and bounded rejected-map memory retention. The inspected pip-audit cache uses atomic replacement; it does not acquire filelock's reader/writer locks. Filelock 4 changes the `SoftReadWriteLock` disk protocol, but that mode is outside these call paths. This qualification does not establish cross-version compatibility for other lock modes or arbitrary msgpack streaming use. [SRC-084](docs/sources.md#src-084), [SRC-085](docs/sources.md#src-085)

All 23 focused tests pass after the archive guard was added. Complete Standard maintainer verification, protected release checks and immutable rc.9 readback bind `8800e139d73fd58ee1bd756d3e5497f62ed678e4`. The release package records zero npm findings at `2026-10-28T00:15:27Z` and zero installed-Python findings at `2026-10-28T00:15:31Z`, with exact lock and environment coverage. Documentation adopted that release at `25d72256aa29abd6039095e1fbca3c2363d234e8`; its full checks, protected deployment and public proof pass. `STD-VAL-014` is resolved for these exact revisions and dates. The browser stack retains DOMPurify `3.4.17`, Mermaid `11.17.2` and KaTeX `0.18.2`. [SRC-086](docs/sources.md#src-086), [SRC-087](docs/sources.md#src-087), [SRC-088](docs/sources.md#src-088), [SRC-089](docs/sources.md#src-089)

Migration carries the frozen locks, local design source and provenance, archived upstream manifest, input-hash proof, wrapper, fixtures and package commands together. Remove the former nested `upstream/packages/cli/package.json` when adopting the archive path. Run `npm ci` and `uv sync --frozen`, regenerate declared outputs, then run complete selected-profile verification. A Zod lock override cannot replace the earlier embedded bundle. Existing releases and other consumer pins remain unchanged.

## Reproducibility rules

- Exact production/runtime pins live in `.node-version`, `package.json`, `pyproject.toml`, and `package-lock.json`; `.npmrc` makes the Node engine fail closed during npm installation.
- `uv.lock` and `package-lock.json` are committed.
- CI installs from locks and runs the same mutation-safe verification contract, failing additions, deletions, or content changes to tracked or unignored canonical files.
- Optional profiles must declare their additional dependencies and checks.
- “Latest” is never a build input. Upgrades are deliberate changes with migration evidence.
- Installing npm, Python, uv, Chromium, Jujutsu, or deployment CLIs may require network access; the built Human Wiki and its diagram/graph runtimes do not.

## Provenance compatibility note

The candidate is locally reference-qualified with Git `2.50.1` and Jujutsu `0.45.1`. Git `2.41` is the minimum supported Git boundary because current Jujutsu Git interoperability no longer supports older Git versions. Qualification covered the read-only maintainer provenance probe, the repository's complete Standard Production verification contract, and real colocated initialization, root, Git-root, raw Git-SHA lookup, log-template, status, and commit operations. Jujutsu remains a pre-1.0 exact dependency: another version requires the same deliberate qualification and contract update rather than being inferred compatible from a range.

## Runtime bundle and update evidence

The 23 October 2026 sanitizer qualification selects exact DOMPurify `3.4.17`, retaining Mermaid `11.17.2` and KaTeX `0.18.2`. A fresh audit reported three advisories against the former `3.4.16` pin; reviewed affected-version metadata identifies `3.4.17` as patched. The release and npm metadata identify commit `a77a3e78b59f72fa4d1c83f22e121ad9cc7d3575`. Frozen installation changes only DOMPurify; the fresh 23 October npm audit reports zero findings. That result is bounded by the audit database at execution time. [SRC-073](docs/sources.md#src-073), [SRC-074](docs/sources.md#src-074), [SRC-075](docs/sources.md#src-075), [SRC-076](docs/sources.md#src-076)

The advisories concern template/shadow-root DOM modes, in-place sanitization with removing hooks, and XHTML/SMIL allowlists. Inspection found none of these modes in the current strict Mermaid adapter or its call sites. This inspection does not establish Wiki exploitability and does not waive the audit gate. Inert Chromium probes reproduce four affected behaviours on `3.4.16` and confirm their removal on `3.4.17`, while ordinary SVG controls pass on both. They dispatch no events, evaluate no templates and make no network requests.

Migration carries the direct pin, frozen lock, runtime builder, embedded-version guard and negative fixtures together. Run `npm ci`, regenerate runtime and graph assets, then run complete maintainer verification, including both audits, browser contracts and read-only provenance. The previous sanitizer is rejected even when a package label claims the current version. Immutable releases and consumer pins retain their separately governed revisions.

The rc.6 security qualification also selects uv `0.13.4` and locked `certifi==2026.10.19` after the Python security announcement on 20 October 2026. Both remove the affected certificate trust material from their respective distributions. The exact local/CI uv version and resolver bootstrap floor are updated together. Earlier resolver qualification below remains historical evidence, not current binary qualification. Migration reinstalls the selected uv binary, performs frozen dependency installation and reruns complete verification. [SRC-065](docs/sources.md#src-065), [SRC-066](docs/sources.md#src-066)

The Mermaid core is built with exactly `esbuild==0.28.2` against direct, overridden `dompurify==3.4.17`. `fast-uri==3.1.8` is locked while Ajv remains `8.20.0`; the Python lock selects `urllib3==2.8.0` for its proxy TLS and streaming security fixes. `npm run check:runtime` reconstructs the bundle in memory and verifies embedded sanitizer identity, all observed build inputs, package/lock agreement, and output/metafile/SBOM hashes. The generated CycloneDX SBOM states that copied graph prebundles have opaque transitive coverage; npm audit alone does not inspect those embedded internals.

The exact Node, npm, Python and uv reference binaries are checked by `npm run check:toolchain`; `.python-version` selects the reference interpreter. `tool.uv.required-version` is a resolver bootstrap floor (`>=0.13.4`) so Dependabot can propose lock changes using its supplied uv. This does not qualify another runtime: verification, direct build/serve/graph commands, and Python audits reject any uv other than `0.13.4` before project execution. Verification records this preflight in its receipt; scheduled security audits explicitly run the same check after frozen installation. Broader consumer Python minimums remain distinct from this tested reference. Ubuntu `24.04` selects the runner OS release, not an immutable VM image; hosted runner image updates and live vulnerability databases are outside bit-for-bit environment reproducibility.

The [uv version constraint](https://docs.astral.sh/uv/reference/settings/#required-version) and the [Dependabot lock updater](https://github.com/dependabot/dependabot-core/blob/c3365efe2baf165f6b908b7c54cb2e7380985ec0/uv/lib/dependabot/uv/file_updater/lock_file_updater.rb) define this resolver boundary. On 2 October 2026, actual uv `0.12.15` rejected the former equality, accepted the floor, and generated a targeted security lock that exact uv `0.12.10` consumed. All four direct Python entry points also rejected actual uv `0.12.15` before work. On 3 October, fresh hosted run `37103486583` passed against merged revision `fef1392548381276a03ca89a2ede435a3d04ec08`: supplied uv `0.12.18` resolved `graphifyy==0.9.72` and `zensical==0.0.66`, each with exit status zero. This proves the hosted resolver repair; the resulting upgrade proposals still require separate reference qualification. [SRC-046](docs/sources.md#src-046)

Weekly scheduled audits check the installed locks and generated runtime evidence. Dependabot opens reviewable pull requests for npm, uv and Actions; it has no merge or publication authority. Dependency Review rejects moderate-or-higher new vulnerabilities on Standard pull requests.

Snapshot checks compare Documentation's declared release tag and full commit by default, independently of development main. `--development` explicitly compares mutable sources. `--standard-revision <full-commit>` selects exact candidate bytes without claiming release status. Only the exact published release commit is adopted as the Documentation release pin.

## Immutable stack selection

Each released source revision binds the full tested toolchain, locks, configuration and verification implementation. Initialisation selects the latest verified immutable release and records both its tag and full commit. Install its frozen dependency graph; do not resolve each package independently to its newest version. New compatible changes require a new release.

The read-only stack commands use the existing Node runtime and GitHub HTTPS API. They add no npm dependency or required GitHub CLI. An optional API credential changes access, not release qualification. Missing, inconsistent or unavailable remote evidence fails selection instead of falling back to the development branch. The report hashes selected exact-revision stack files; the commit identifies the complete source tree. These hashes do not authorize copying the Standard's subject corpus.

An existing Wiki keeps its stack during update checks. Only an authorised, reviewable migration may change it, after adapting the full relevant dependency closure and passing target checks. Historical release verification does not claim that today's advisory database is clear. The 26 October audit failures remain historical evidence. Immutable rc.9 repairs those tooling findings and the later msgpack finding. Complete release verification and separately authorised Documentation adoption/deployment are recorded for `8800e139d73fd58ee1bd756d3e5497f62ed678e4` and `25d72256aa29abd6039095e1fbca3c2363d234e8`. The dated audit results do not establish future vulnerability clearance. [SRC-088](docs/sources.md#src-088), [SRC-089](docs/sources.md#src-089) [SRC-079](docs/sources.md#src-079), [SRC-081](docs/sources.md#src-081), [SRC-085](docs/sources.md#src-085), [SRC-086](docs/sources.md#src-086)
