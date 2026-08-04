# Changelog

All notable standard changes are recorded here. The candidate follows Semantic Versioning for its declared conformance contract.

## Unreleased

- Simplified the reference Mermaid diagrams into short, predominantly linear top-to-bottom flows with no edge labels or cluster-title crossings. Static complexity limits and rendered text/connector collision checks now enforce the clearer layout under `DKBWS-DESIGN-001`.
- Migration: existing consumers are unchanged. New or adapted entry/architecture diagrams should keep to five nodes and five relationships, use at most one parallel branch, and move detailed distinctions into nearby prose or a separate diagram.
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
