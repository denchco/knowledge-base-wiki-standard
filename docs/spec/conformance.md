---
type: Conformance Specification
title: Conformance
description: How implementations make and prove claims.
status: draft
---

# Conformance

## Claim contents

A conformance claim MUST state:

- standard version and immutable revision where released;
- canonical standard source, pinned independently of the explanatory documentation site;
- selected profile;
- role-to-path mappings;
- capability states;
- tracked proposal identifiers and lifecycle states when Standard-change intake applies;
- deviations and waivers with reasons;
- last verification result and environment;
- manual checks that remain outstanding.

The candidate catalogue records each requirement's stable ID, normative statement, applicability, and verification method. Machine diagnostics add code, severity, message, location, and remediation when a check can provide them. Introduction/deprecation metadata is not yet a catalogue field and MUST NOT be claimed until a versioned catalogue schema adds it.

The selected profile is an exhaustive requirement closure. A formal report MUST enumerate every inherited requirement ID and MUST NOT silently omit an element because the target uses another renderer, path layout, parser, or runtime adapter. Normative outcomes are absolute when applicable; implementation identity is not. A consumer-specific algorithm, route name, corpus count, or example remains evidence unless the catalogue deliberately makes it normative. Conditional absence is recorded as `not-applicable` with its predicate evidence, while unavailable proof remains `not-checked` or fails an asserted claim.

The conformance kit contains positive and negative fixtures. A source/configuration assertion cannot prove browser-visible behaviour; rendered claims require built-output browser checks. In particular, `DKBWS-HUMAN-002` passes only when computed governing-question rail and text colours both equal the runtime-resolved active accent at each supported verification viewport and an ordinary quotation remains neutral. `DKBWS-HUMAN-004` additionally requires an authoritative question mapping, an exact-text scan over the declared bounded reader set, and desktop/mobile browser proof on every route where that question repeats; paraphrases and records outside the bounded reader set remain neutral controls. `DKBWS-HUMAN-003` measures the draft marker and stock chevron against their own row centres and rejects horizontal page overflow. `DKBWS-LINK-002` requires source lint and a built-output journey that focuses a representative source link, preserves its accessible identity and citation grammar, follows its exact fragment, and confirms the destination anchor belongs to the intended source-register row at desktop and mobile widths.

`inspect` and `validate` are wholly read-only. `verify` MUST leave canonical inputs unchanged, but MAY rebuild declared derived outputs in deterministic paths so freshness can be proved. A project MUST list those derived paths; unexpected worktree changes fail verification. Upgrade remains a separate explicit, reviewable operation.

For `DKBWS-UPDATE-002`, conformance validates every tracked proposal and the Standard acceptance/release registry against their pinned schemas and direct lifecycle-state invariants. It proves immutable implementation provenance; null/non-null state metadata; preparation, approval, issue-linkage, decision, release, and adoption prerequisites; terminal transition refusal; unique proposal identifiers and hidden markers; deterministic payload bytes and SHA-256 approval binding; sanitized public content; exact issue linkage; explicit decision; and later adoption separation. A release result additionally resolves and reads registry bytes at the exact full `registryRevision`, proves that revision strictly descends from the recorded release revision, requires a matching public release with the exact tag, `draft: false`, and `immutable: true`, and resolves the tag to the exact release revision. `pre-registry-local-history` is valid only for the one immutable UK Digital Health `DKBWS-LINK-002` bridge encoded by workflow v1; it is not available to new work. A closed issue is never acceptance evidence. Proposal validation and verification perform no remote writes, and repeated read-only checks leave no Jujutsu working-copy change.

For `DKBWS-PROMPT-002`, conformance requires the exact `development_response_links: live-wiki` capability, an absolute HTTP(S) `human_wiki_url`, managed root/starter instruction parity, and positive/negative response-link fixtures. A captured response passes only when every navigable Wiki destination uses the configured origin and no file or editor link substitutes for a rendered route; fixtures cover inline/reference/autolink Markdown, entity-decoded HTML `a`/`area` links, and plain GFM-autolinked HTTP(S) text, with code, comments, and images held as negative controls. For a managed local URL, `--managed-live` also requires complete exact service status, equality with the registered canonical origin, and HTTP 200 from every displayed Wiki route. Repository verification cannot inspect an uncaptured conversational response, so host-level pre-send enforcement remains the explicit `STD-VAL-007` adapter boundary rather than an inferred guarantee.

For `DKBWS-RUNTIME-002`, fixtures prove exact comparison of all twelve governed registry fields, byte identity of the installed service definition, the loaded job, static-marker identity, component-by-component status failure, exact canonical-URL equality, browser-opener failure, and a fail-closed `service:preview` handoff. Complete maintainer verification then runs live `service:status`; only that maintainer gate supplies current managed-service evidence. Distribution/CI mode records both `DKBWS-RUNTIME-002` and `local_service` as `not-checked` because it does not own or load the user's persistent service.

## Formal claims and adoption audits

Formal conformance and inferred adoption evidence are different report modes:

- **formal claim mode** validates the project's own manifest, selected profile, declared deviations, waivers, and evidence;
- **adoption audit mode** proposes role mappings and reports observed capabilities, evidence paths, and confidence without inventing a claim or changing the target.

A missing manifest therefore fails a formal DenchCo claim, but it does not erase useful adoption evidence. Inferred mappings MUST require human review before they become canonical. A legacy label, prose exclusion, or absent capability MUST NOT be silently converted into a waiver.

## OKF v0.2 boundary

OKF portability and DenchCo profile conformance are related but distinct claims. The OKF v0.2 hard-conformance boundary is deliberately small:

1. every non-reserved `.md` concept has parseable YAML frontmatter;
2. every concept has a non-empty `type`;
3. reserved `index.md` and `log.md` files follow their defined structures.

Missing optional metadata, unknown concept types, unknown producer fields, broken concept links, and missing index files MUST NOT make an OKF bundle nonconformant. When provenance, trust, lifecycle, or attestation metadata is supplied, the validator reports deviations from the v0.2 conventions as warnings. DenchCo `--strict` validation promotes those warnings to a failing command without misrepresenting the underlying OKF portability result.

### OKF source and timestamp migration

`DKBWS-OKF-001` now resolves OKF v0.2 through the immutable specification and relocation evidence in [the source register](../sources.md#src-002), with machine-readable identity in `config/okf-source-lock.json`. The canonical and frozen specifications retrieved on 7 September 2026 have identical hashes; the old location is nevertheless explicitly superseded. An unpinned version label cannot date an earlier content change.

The optional timestamp fields are `sources[].last_modified`, both bounds of shared and per-source `usage_window`, `generated.at`, every `verified.at`, and `stale_after`. DenchCo's schema and validator accept extended ISO datetimes with seconds, optional fractional seconds, and `Z` or a signed `HH:MM` offset. They reject date-only values, absent offsets, impossible calendar dates, and invalid clock or offset components. Usage windows compare instants after offset conversion. Staleness is evaluated at `00:00:00Z` on the reported `evaluationDate`; `--date YYYY-MM-DD` selects that reproducible day boundary. It is not a live freshness monitor.

These remain guidance diagnostics in portability mode, as specified by upstream section 11. `--strict` fails on the warnings. Log headings and DenchCo manifest deviation dates retain their date-only contracts; unknown local fields are never guessed to be timestamps.

Migration MUST preserve source precision. Where an instant and its offset are evidenced, record that datetime. Where only a date is known, retain it with a documented deviation, or move it through a reviewed edit to an explicitly local date/precision extension and omit the optional timestamp. Do not append an invented midnight or offset to real evidence. Validation, export, and upgrade planning perform no such rewrite. The synthetic conforming fixture uses defined UTC instants; separate legacy-date and local-extension fixtures prove lossless preservation and strict diagnostics. Canonical knowledge already contained valid offset datetimes and required no timestamp fabrication.

The source-lock schema requires identity and retrieval fields; offline checks verify structure and register agreement. The recorded SHA-256 values were computed from the retrieved immutable raw files. An offline schema pass does not re-fetch or independently prove those remote bytes. A changed upstream digest reopens `STD-VAL-001` for comparison and review before changing the supported lock.

Every DenchCo manifest MUST map `roles.okf_bundle` to one repository-relative directory. A bare OKF directory MAY be inspected without a DenchCo manifest, but the result is not a DenchCo profile claim.

## Read-only CLI

The canonical commands are:

```sh
npm run --silent conformance:inspect -- [target] --json
npm run --silent conformance:validate -- [target] --json
npm run --silent conformance:export-okf -- [target]
npm run --silent conformance:diff -- [target] --json
npm run --silent conformance:upgrade-plan -- [target] --json
npm run --silent conformance:init-plan -- [target] --profile standard-production --json
node scripts/full-profile-report.mjs --target [target] --receipt output/verification/receipt.json
npm run conformance:test
```

`inspect` returns observations even when errors exist. `validate` exits `1` for hard errors, or for warnings when `--strict` is selected. Both accept `--date YYYY-MM-DD` so freshness results can be reproduced. Exit code `2` is reserved for invalid CLI usage or tool failure.

`export-okf` emits a deterministic, lossless JSON rendition to standard output. It includes parsed frontmatter, the Markdown body, the exact source text, and a SHA-256 digest for each file. This proves that unknown OKF extension fields and lexical source survive the tool boundary. The JSON rendition is a tooling/MCP interchange envelope, not a replacement OKF distribution unit: canonical OKF remains a Markdown directory distributed directly, through Git, or in a tar/zip archive.

No command above modifies the target. A caller MAY redirect export output to a new artifact; the CLI never selects or overwrites an output file itself.

The full-profile report builder consumes `schema/verification-receipt-v1.json`. A receipt names the selected profile, evaluation date, environment, canonical-input mutation result, and explicit gate results with evidence references. An absent gate remains `not-checked`; a successful command does not implicitly pass requirements that its receipt does not name. The report builder materializes an explicit result for every inherited requirement, so missing evidence cannot make an obligation disappear. `DKBWS-PROV-001` accepts only the read-only maintainer-mode provenance receipt with both Git and Jujutsu passing plus a successful instruction/helper gate for the development-turn commit rule, and `DKBWS-SEC-001` requires all four subcontrols. The generated report distinguishes complete evaluation from a conformant outcome and validates itself against `schema/conformance-report-v1.json` before emission. The reference paths `output/verification/receipt.json` and `output/verification/conformance-report.json` are reserved for those two schema-valid artifacts; an ad hoc project summary at either path is a failing fixture, not partial evidence.

When Standard Production selects `standard_change_intake`, the full-profile receipt MUST include an explicit `DKBWS-UPDATE-002` gate result. A manifest declaration alone cannot pass it; absent proposal-schema, direct-state/terminal-transition, payload-binding, exact registry-revision/ancestry, public immutable-release, historical-bridge, disclosure, and remote-write-negative evidence remains `not-checked`.

When a Human-and-Agent profile selects `development_response_links: live-wiki`, the full-profile receipt MUST include an explicit `DKBWS-PROMPT-002` result. Capability declaration alone cannot pass it; absent canonical-URL validation, instruction parity, Markdown/HTML/plain-GFM response-lint fixtures, or `--managed-live` identity and route evidence remains `not-checked`.

When Standard Production selects `local_service`, the full-profile receipt MUST include an explicit maintainer-only `DKBWS-RUNTIME-002` result from live `service:status`. Static fixtures are necessary but do not substitute for the current exact registration, installed job, loaded job, identity marker, and canonical URL. Distribution/CI receipts deliberately leave this requirement and capability `not-checked` alongside maintainer Jujutsu provenance.

## Lifecycle diff and plans

`diff` compares a consumer manifest with this candidate's manifest, selected profile, inherited requirement set, and normative requirement catalogue. Candidate inputs are read from the exact candidate commit named in the result, and the result records their hashes so a later review can establish exactly which Standard material informed the comparison. It MUST distinguish a candidate upgrade from an attempted downgrade or an unparseable version relation. It MUST retain unknown or superseded deviation IDs for manual migration rather than deleting them.

Lifecycle identity comprises Standard name, canonical source, version label, and immutable revision. For the same name and source, the tool resolves revision commits and compares ancestry independently of the version relation. It then loads the consumer-pinned manifest, profile inheritance, and requirement catalogue from that revision and reports introduced or removed requirement IDs. A missing or unresolved revision, consumer-newer or diverged ancestry, inconsistent version/revision pair, or same-version older revision produces an explicit manual blocking action. A source mismatch prevents automatic version planning.

`upgrade` is planning-only in the candidate and MUST reject calls without `--dry-run`. Its JSON-patch-style review plan contains:

- a SHA-256 precondition for the exact consumer manifest inspected;
- `test` operations before any proposed replacement;
- only changes that are deterministic and do not alter the selected profile;
- separate manual actions for role, capability, OKF-version, deviation, and profile decisions;
- an explicit preservation list covering roles, capabilities, deviations, unknown OKF fields, and canonical Markdown;
- `applySupported: false` and `writesPerformed: false`.

There is deliberately no apply command in this candidate. Applying a reviewed plan is a later, separately authorized implementation workflow with complete verification and an end-of-development-turn Jujutsu commit.

`init` is also planning-only and MUST reject calls without `--dry-run`. It derives a proposed manifest, role layout, requirement set, and staged implementation sequence from the canonical instantiation prompt and selected profile. It does not copy a full template. Existing paths are reported as `preserve-and-review`; absent paths are classified as `propose-render`, `propose-author`, or `propose-adapt`; and no directory or file is created. Missing material context is surfaced through the canonical sequential `Question 1 of N` protocol.

The initialization layout is governed by `starter/starter.yaml`. It classifies subject-empty templates, target-authored content, and implementation files that require adaptation from the pinned release. With no bootstrap context, the planner's first unresolved input is the research-topic-seed-versus-subject-empty choice. A complete implementation records the automatically resolved immutable Standard revision and conflict-free loopback Wiki URL, and defaults deployment to none; these routine values are not user questions. The plan loads its manifest, profile, requirement catalogue, prompt, and starter from that exact revision, so an explicit tag is resolved to a commit rather than relabeling current working-tree content. The read-only planner records seed inspection and managed loopback reservation as pending automatic resolutions rather than fetching arbitrary material, emitting a fake URL, or claiming readiness to render. Persistent reservation includes the shared-register check, live-listener preflight, project-owned static identity marker, platform user-service adapter, fail-closed status, and exact canonical browser handoff required by `DKBWS-RUNTIME-002`; a port-zero verification server proves only `DKBWS-RUNTIME-001`. The implementation agent inspects a supplied seed before deriving or asking for purpose details, and asks for an accent choice using an evidenced candidate or `#0b7285`. The Standard's `docs/`, `knowledge/`, evidence, dogfood, fixtures, documentation deployment, maintainer-only `sync:documentation:*` commands, and `verify:workspace` remain reference-only unless a consumer independently declares the corresponding capability.

Canonical schemas are versioned in this standard repository. The documentation site mirrors public discovery endpoints under <https://denchco.github.io/knowledge-base-wiki-documentation/schema/>, but conformance validation uses schemas from the pinned local standard checkout or release artifact and does not require network access to that mirror.

## Diagnostics and reports

Machine reports conform to `schema/conformance-report-v1.json`. Every diagnostic has a stable code, severity, message, and—where applicable—a requirement ID, repository-relative file, line, field, and remediation. Reports distinguish:

- `okf.conformant`: the OKF v0.2 portability result;
- `manifest.valid`: the DenchCo manifest result;
- `requirementResults`: checks that are passed, failed, waived, not applicable, or not checked by this CLI;
- `summary.profileComplete`: whether every requirement in the selected profile has evidence from the complete verification pipeline.

An OKF/manifest-only run MUST report unimplemented browser, renderer, graph, runtime, security, and release checks as `not-checked`; it MUST NOT infer full profile conformance from the absence of errors in its narrower scope.

`DKBWS-PROV-001` combines a read-only Git/Jujutsu workspace probe with an executable instruction/helper fixture. The probe MUST establish a supported Git version and repository root, a reference-qualified `jj` version, a Jujutsu workspace and Git store colocated with that same root, and a readable current change while disabling working-copy snapshotting. The fixture MUST prove that the shared agent instructions and consumer starter use the same end-of-development-turn boundary, that a changed turn records a JJ commit after verification and state inspection, that failed verification is disclosed rather than used to leave changes uncommitted, and that a clean turn creates no empty commit. Command-output normalization removes only the terminal record delimiter; it must not trim filesystem-significant spaces from a repository path.

Repository state cannot reconstruct conversational turn boundaries by itself. A historical claim therefore also requires reviewable turn-commit history; the automated gate proves the workspace and enforced mechanism, not that an unobserved past agent followed it. A Git-only release archive or CI checkout may select the explicit distribution mode; that result is `not-checked` for Jujutsu maintainer provenance and MUST NOT be promoted to a full maintainer-workspace pass.

Formal requirement results use this algorithm:

- `pass`: the requirement applies and sufficient evidence satisfies it;
- `fail`: the requirement is mandatory or claimed and evidence contradicts or incompletely satisfies it;
- `waived`: the manifest names the applicable requirement, authority, rationale, and review or expiry state;
- `not-applicable`: the selected profile and project facts make the requirement irrelevant;
- `not-checked`: this validator did not execute the required check.

A manifest deviation with `status: waived` MUST name a non-empty `authority` and MUST carry at least one explicit ISO date: `expires` or `reviewed_at`. `pending`, `deviates`, and `not-applicable` records MAY use those lifecycle fields but do not inherit the waiver-only requirement.

Adoption-audit capability observations may additionally use `not-implemented` when a relevant optional capability is absent and no claim is made for it. `not-implemented` is never a substitute for `fail` after a formal profile makes the capability mandatory.

Every adoption audit MUST declare bounded `HIGH`, `MEDIUM`, or `LOW` confidence for the inferred audit, profile assessment, role mappings, capabilities, and requirement observations. Confidence qualifies inference strength; it never changes a status or converts inferred evidence into a formal claim.

`HIGH` means direct inspected or probed evidence with little interpretive ambiguity; `MEDIUM` means a bounded inference or absence finding from scoped inspection; `LOW` means provisional evidence that needs further inspection before adoption.

`DKBWS-SEC-001` remains one portable-core obligation but produces separately reportable subcontrols: `secrets-and-authorization`, `personal-and-confidential-data`, `copyright-licensing-and-retention`, and `untrusted-and-generated-content`. An aggregate pass requires all applicable subcontrols to pass.

Renderer adapters publish a tested compatibility range; each implementation still records one exact pin. Graph-publication adapters similarly declare a schema version and migration path. Validators MUST inspect built network references when local runtimes are claimed and MUST NOT accept a graph artifact merely because it is syntactically valid JSON. When the selected profile requires `DKBWS-GRAPH-001`, complete verification fails closed if either 2D or 3D route is missing and exercises both views at desktop and mobile widths; selectively disabling a route is diagnostic mode, not complete evidence.

Graph-assisted inspection is query-first, not graph-only. If a scoped query has insufficient recall, inspection continues through the graph wiki/report and then scoped canonical sources; the graph is orientation evidence, not proof of completeness.

`DKBWS-RELEASE-001` governs releases of this standard and public releases of an implementation that advertise DenchCo conformance. A local deployment, readiness record, or healthy commit does not by itself constitute an immutable release.

## Schemas and fixtures

- `schema/manifest-v1.json` defines the DenchCo declaration and requires `roles.okf_bundle`.
- `schema/okf-v0.2-frontmatter.json` describes the optional OKF field families while retaining `additionalProperties: true`.
- `schema/conformance-report-v1.json` defines machine-readable diagnostics and requirement results.
- `schema/verification-receipt-v1.json` defines the explicit gate-evidence input to full-profile reporting.
- `schema/adoption-audit-report-v1.json` defines portable, confidence-qualified inferred audit records separately from formal claims.
- `schema/okf-export-v1.json` defines the lossless JSON rendition.
- `schema/lifecycle-plan-v1.json` defines diff, upgrade-plan, and init-plan artifacts.
- `schema/standard-proposal-record-v1.json` and `schema/standard-proposal-registry-v1.json` define consumer proposal state and Standard decision/release mapping independently of GitHub issue state.
- Managed-service fixtures cover every governed registry field, exact installed job bytes, component status, canonical preview handoff, and opener failure; response-link fixtures cover Markdown, entity-decoded HTML, plain GFM autolinks, and managed identity/route failures.
- Proposal lifecycle fixtures cover direct-state invariants, terminal transitions, exact issue identity, exact registry-revision bytes, strict release-to-registry ancestry, non-draft immutable public releases, and rejection of any non-exact historical bridge.
- `fixtures/conforming/okf-v0.2` includes provenance, both trust forms, lifecycle, attested computation, and a nested unknown extension.
- `fixtures/nonconforming/okf-v0.2` proves every hard structural failure class.
- `fixtures/nonconforming/okf-guidance` proves the portable-versus-strict distinction.
- `fixtures/nonconforming/okf-date-precision` retains historical date-only metadata; `fixtures/conforming/okf-local-date-extension` preserves day precision without claiming an instant.
- `schema/okf-source-lock-v1.json` and `config/okf-source-lock.json` bind source location, immutable content identity, retrieval, and supersession.
- `fixtures/nonconforming/manifest` proves manifest diagnostics independently of bundle parsing.
- `fixtures/lifecycle/consumer-old` proves a conservative version diff, guarded upgrade plan, deviation preservation, and byte-for-byte non-mutation.
- `fixtures/lifecycle/consumer-rc3` proves that an equal version label at an older immutable revision exposes introduced profile requirements and blocks silent repinning.
- `fixtures/nonconforming/verification-receipt/consumer-summary.json` proves that an ad hoc consumer summary cannot occupy the reserved receipt-v1 path.
