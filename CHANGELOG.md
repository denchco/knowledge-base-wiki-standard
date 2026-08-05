# Changelog

All notable standard changes are recorded here. The candidate follows Semantic Versioning for its declared conformance contract.

## Unreleased

- Added conditional `DKBWS-LINK-002` for exact reader evidence navigation: each displayed registered source identity is an independent internal link to its exact source-register row, lists retain every identity, compact ranges link their displayed endpoints, and direct links naming official authorities or publications use registered source URLs.
- Added stable source-row anchors, visible bracket-preserving link styling, an optional idempotent migration helper, stable lint diagnostics, Unicode/fence/Markdown regression fixtures, and desktop/mobile built-output proof of keyboard focus, accessible identity, exact fragment, destination row, and containment.
- Migration: applicable Human Wikis first add stable anchors to the mapped source register, then convert visible identities into individual exact-row links, audit named authority URLs against the register, preserve local grammar and deviations, and add a representative browser journey. Upgrade planning remains read-only and automatic rewriting is optional; subject-empty, agent-only, and citation-free consumers record the rule as not applicable without inventing evidence.
- Strengthened `DKBWS-PROV-001` so every file-changing Standard Production development turn ends with its persistent changes in a JJ commit after verification and Git/Jujutsu inspection. Failed or unrun checks are disclosed in the commit and response rather than used to leave work uncommitted; no subjective “substantive work” threshold or no-change empty commit remains.
- Migration: Standard Production maintainers update shared agent instructions, maintenance guidance, and the end-of-turn helper, then apply the rule prospectively from the upgraded revision. Existing JJ history is not rewritten; Portable Core and explicit Git-only distribution/CI checkouts are unchanged.
- Added conditional `DKBWS-HUMAN-003` for dedicated, readable, trailing-column-aligned draft markers in primary navigation. The Zensical reference adapter uses SVG Repo's CC0 Pen Circle asset and verifies its tooltip, mask, and chevron-centre geometry in built output.
- Extended `DKBWS-HUMAN-003` browser proof to require vertical row centring for the draft marker and stock chevron plus absence of page overflow.
- Added a proposal-first GitHub issue form for user-authored consumer improvements, plus consumer-agent routing that preserves origin evidence, uses an ignored scrubbed draft and read-only duplicate search, requires exact-payload authority before remote submission, and grants no implicit PR, release, publication, migration, pin, or conformance authority.
- Migration: Human Wikis that expose generic draft information markers in primary navigation add a dedicated open-licensed draft-edit asset, readable status mapping, licence record, alignment rule, row-centre/overflow browser evidence, and a non-draft negative control. Wikis without navigation status markers record `DKBWS-HUMAN-003` as not applicable; equivalent renderer-native markers remain valid.
- Made `DKBWS-UPDATE-001` revision-aware: lifecycle tools load candidate and consumer inputs from exact commits, compare source and ancestry independently of version labels, expose introduced profile requirements, and block missing, unresolved, newer, diverged, or inconsistent pins.
- Fixed `DKBWS-PROV-001` and documentation-sync root discovery to remove only terminal record delimiters, preserving filesystem-significant trailing spaces; added positive final-component and negative nested-root fixtures.
- Reserved verification receipt/report paths for their declared schemas and added a negative consumer-summary fixture. Consumer starter adaptation now excludes Standard-maintainer `sync:documentation:*` and `verify:workspace` unless independently declared; CI fetches full history for revision fixtures.
- Completed the independent-consumer starter closure with consumer-owned licensing, stronger four-subcontrol security/source templates, correct `graph-shell` 2D/3D templates, fail-closed graph routes, independent representative browser routes, and mobile table overflow evidence.
- Migration: consumers reconcile `standard.revision` with its declared version before repinning; rename ad hoc `output/verification/receipt.json` summaries, emit receipt-v1 plus the paired conformance report, remove copied maintainer-only sync commands, choose a consumer licence explicitly, and regenerate graph pages from the governed hooks.
- Returned the reference entry and architecture diagrams to plain Mermaid source with renderer-default node treatment, removing diagram-level initialization and semantic class opt-ins while retaining accessible descriptions, native `basis` connectors, short top-to-bottom topology, and rendered collision checks under `DKBWS-DESIGN-001`.
- Migration: existing consumers and adapted semantic-role diagrams remain compatible. New or edited entry/architecture diagrams should start without diagram-level styling directives, keep authority meaning in labels, order, accessible descriptions, and prose, and introduce an optional `kb-*` role only for a recorded material distinction that remains understandable without colour.
- Restored the released three-product structure while retaining plain Mermaid defaults: Human, Agent, and Graph now appear as separate sibling nodes derived directly from canonical knowledge in both reference diagrams, and all three homepage paths converge on verification. Fitting diagram surfaces are centred in the content rail; at the 390px reference viewport, the native three-column rank uses a bounded, centred pane overflow without page overflow. Browser proof now samples the continuously rendered 2D and WebGL Graphify canvases directly instead of waiting for an animated element screenshot.
- Migration: no released topology migration is required from `v0.1.0-rc.3`, which already used three product nodes. Any interim adaptation that collapsed them splits the combined node and updates its accessible description and prose; profiles that do not present all three surfaces are unchanged.
- Reworked the repository README around a first-time user's URL-only AI-agent journey, with explicit adaptive questions, automatic defaults, expected outputs, trust badges, and the governed DENCH | CO wordmark.
- Replaced the field-based instantiation prompt with a repository-URL-only bootstrap. The agent now starts with research-seed-versus-subject-empty discovery, inspects supplied material before follow-up, asks questions sequentially, and confirms an evidenced or default accent hex.
- Added automatic Standard Production, independent local target, conflict-free loopback URL, local runtime, and no-deployment defaults. External publication and deployment remain separately authorised.
- Migration: callers now provide only the normative GitHub repository URL. Subject-empty starts use an awaiting-seed state instead of inventing a governing question; existing consumers and immutable pins remain unchanged.
- Simplified the canonical bootstrap prompt so users point only at the standard GitHub repository; the implementation agent now resolves the current default-branch HEAD automatically and pins its exact commit SHA before acting.
- Migration: remove the user-supplied standard revision from bootstrap prompts. Existing consumer manifests retain their current immutable pins.

## 0.1.0-rc.3 — 2026-08-04

- Added `DKBWS-HUMAN-002`: every displayed governing-question callout is machine-identifiable and renders both its inline-start rail and question text in the active accent colour, while ordinary quotations remain neutral.
- Activated the reference implementation on the Standard homepage and subject-empty starter, and added static plus desktop/mobile rendered checks with positive and negative controls.
- Migration: existing Human Wikis with a governing-question callout add the semantic marker, bind both colours to the active accent family, and record browser evidence. Human Wikis without the callout mark the conditional rule not applicable.
- Added a reusable, accent-family Mermaid grammar for source, evidence, snapshot, normative, canonical, product, derived, consumer, and verification roles, including closed-shadow rendering and executable style checks.
- Corrected the reference system flow so evidence governance precedes canonical synthesis; derived Human, LLM, and Graphify surfaces now visibly fan out from one canonical corpus instead of appearing to create authority.
- Migration: adapted Mermaid diagrams retain their complete topology and accessible description, assign semantic role classes, distinguish derived surfaces from authority, and prove fit at desktop, tablet, and mobile widths.
- Added deterministic publication-scope markers so project-specific adoption recommendations remain available in the repository and local Wiki while public Pages, search, and Graphify derivatives omit them.
- Added malformed-marker, local-retention, public-omission, and raw-report exclusion checks for the publication boundary.

## 0.1.0-rc.2 — 2026-08-04

- Added a shared Codex/Claude instruction surface: canonical `AGENTS.md`, Claude's `@AGENTS.md` import, and byte-identical Standard-maintainer skills in both discovery locations.
- Tightened `DKBWS-PROMPT-001` from an unconditional exactly-three handoff quota to a completion-first maximum of three eligible recommendations, with goal linkage, one-pass completion conditions, cycle guards, and structured parked-work reopen fields.
- Added subject-empty `CLAUDE.md` and project-status templates, plus starter and static-validation coverage for portable instruction loading.
- Reconciled stale publication roadmap and validation items after immutable `v0.1.0-rc.1` and recorded the remaining second-consumer, evidence-led compatibility, and conditional MCP gates.
- Published the instruction and handoff changes as a separately verified immutable prerelease; the declared implementation version remains `0.1.0-candidate`.

## 0.1.0-candidate — 2026-08-03

- Established the OKF v0.2-compatible canonical specification.
- Defined coordinated Human and LLM Wiki products.
- Selected pinned Zensical and the DenchCo visual profile as the first-class reference renderer.
- Added evidence, Graphify, conformance, prompt, dependency, Git/Jujutsu, runtime, release, security, source-policy, and future MCP contracts.
- Added stable `DKBWS-PROV-001` and a read-only checker for Git/Jujutsu versions, root colocation, and readable current phase, with an explicit non-equivalent Git-only distribution/CI mode.
- Added executable OKF v0.2 validation, strict guidance diagnostics, lossless export, lifecycle planning, and positive/negative fixtures.
- Added the governed Zensical runtime, local Mermaid/graph dependencies, versioned Graphify 2D/3D publication, visual checks, and built-output browser verification.
- Bound each Graphify publication and summary to the repository build-baseline commit and reject stale or mismatched provenance markers.
- Added the operational LLM Wiki and root-site `llms.txt` discovery surface over the same canonical knowledge.
- Completed five read-only cross-project dogfood audits and reconciled formal-vs-inferred reporting, status, security, verification, renderer, graph-schema, Jujutsu, and release semantics.
- Selected one repository-wide MIT License for original code and accompanying documentation, copyright Andrew Dench, while preserving third-party terms.
- Separated the normative standard repository from the public documentation site and independent consumer repositories; added a subject-empty, allowlisted starter contract with pinned revisions and consumer-owned URL/deployment inputs.
- Established the public-standard and private-documentation/public-Pages repository boundary, public schema endpoint, GitHub private vulnerability reporting route, and CI-gated immutable `v0.1.0-rc.1` prerelease process.
- Classified project-specific dogfood adoption recommendations as canonical repository/local audit material and reserved deterministic public-documentation omission as a release-gated follow-on without changing their evidence or authority.
- Added deterministic standard-to-documentation synchronization with an explicit allowlist, per-file hashes and modes, isolated writes, drift checks, and conflict refusal.
- Made Graphify's inline 2D/3D JSON serialization script-safe against hostile Markdown labels and added a dedicated security fixture.
- Aligned distribution-mode verification with selected profile capabilities so declared optional capabilities remain visible without becoming false CI gaps; maintainer-only Jujutsu provenance remains explicitly not checked.
