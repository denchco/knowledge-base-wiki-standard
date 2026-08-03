---
type: Conformance Report
title: Five-project dogfood comparison
description: Read-only inferred audit of five deliberately different local wikis against the 0.1.0 candidate.
status: draft
okf_version: "0.2"
---

# Five-project dogfood comparison

## Outcome

The candidate can describe all five projects, but it cannot yet make a fair formal conformance decision without two modes:

1. **Formal claim mode** validates a project's declared `.wiki-standard.yaml`.
2. **Adoption audit mode** infers role mappings and capabilities without silently promoting a legacy claim or inventing waivers.

All five projects predate the unpublished DenchCo candidate and none declares its manifest, so all five formal claims are currently `FAIL`. That result is correct but incomplete: the inferred audits show substantial reusable conformance evidence and expose several weaknesses in the candidate itself.

No `WAIVED` result was recognised. A narrative decision not to adopt OKF, Graph publication, JJ, hosting, Ask, or another capability is `NOT_IMPLEMENTED` or `NOT_APPLICABLE`; it becomes `WAIVED` only through a standard manifest naming the requirement and rationale.

## Snapshot and method

- Standard: `0.1.0-candidate`, audited against commit `c3469da5bd2be4587d6d9e256c99c9557a61faec` plus the candidate working tree on 3 August 2026.
- Projects: NHS Data Sharing, Regulation 28, InterSystems, X-Lab, and Palantir.
- Every nearest `AGENTS.md` was read.
- Every project had `graphify-out/graph.json`; a scoped Graphify query was run before source inspection.
- Canonical roles were mapped semantically rather than by fixed filename.
- Audited projects were not modified and mutating verification commands were not run.
- Declared local URLs were probed when one existed.

## Requirement result summary

| Project | Closest candidate position | PASS | FAIL | WAIVED | NOT APPLICABLE | NOT IMPLEMENTED |
|---|---|---:|---:|---:|---:|---:|
| [NHS Data Sharing](nhs-data-sharing.json) | Standard Production + Question-Led | 12 | 5 | 0 | 1 | 3 |
| [Regulation 28](regulation-28.json) | Evidence/Human/Graph/Design + Generated Analytical + Ask | 12 | 3 | 0 | 1 | 5 |
| [InterSystems](intersystems.json) | Evidence/Human/Graph/Design + Material compatibility | 11 | 3 | 0 | 2 | 5 |
| [X-Lab](x-lab.json) | Evidence/Human + Material compatibility + Source Extraction | 6 | 5 | 0 | 2 | 8 |
| [Palantir](palantir.json) | Standard Production candidate + Question-Led, without OKF/deployment | 12 | 3 | 0 | 1 | 5 |

These counts are diagnostic rather than rankings. X-Lab deliberately omits capabilities that its purpose does not currently justify. Regulation 28's legacy Level 4 label similarly prevents the audit from silently treating advanced Ask/deployment work as a higher formal claim.

The 21-row catalogue includes the separately added bundle-mapping, provenance, and machine-report obligations (`DKBWS-OKF-003`, `DKBWS-PROV-001`, and `DKBWS-VERIFY-002`). Because these projects predate the candidate and make no DenchCo claim, absent capabilities are reported as `NOT_IMPLEMENTED`, not silently promoted to formal failures. The four existing colocated Git/Jujutsu workspaces are inferred `PASS` evidence for provenance; X-Lab remains `NOT_IMPLEMENTED` because its inspected project record deliberately retained Git without JJ.

## Component comparison

| Component | NHS Data Sharing | Regulation 28 | InterSystems | X-Lab | Palantir |
|---|---|---|---|---|---|
| Candidate manifest | FAIL | FAIL | FAIL | FAIL | FAIL |
| Human renderer | Zensical 0.0.51 | Zensical 0.0.50 | Material 9.7.6 | Material 9.7.6 | Zensical 0.0.52 |
| Human Wiki | PASS | PASS | PASS | FAIL: no stable URL | PASS |
| Operational LLM Wiki | PASS | PASS | PASS | PASS | PASS |
| Stable source identities | PASS | PASS | PASS | FAIL | PASS |
| Claim limitations/gaps | PASS | PASS | PASS | PASS | PASS |
| OKF v0.2 | FAIL: custom catalogue | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED |
| Contextual inbound links | PASS, registry checked | PASS, no finite registry | PASS, no finite registry | PASS, no finite registry | PASS, registry checked |
| Raw Graphify | PASS | PASS | PASS | PASS | PASS |
| Shared published 2D/3D | PASS | PASS | PASS | NOT IMPLEMENTED | PASS |
| Local graph browser runtimes | FAIL: unpkg | FAIL: unpkg | NOT APPLICABLE to selected profile; CDN remains | NOT APPLICABLE | FAIL: unpkg |
| Design governance | PASS | PASS | PASS | FAIL: no lint/check | PASS |
| One verification command | PASS | PASS | PASS | PASS | PASS |
| Current local HTTP health | 200 PASS | 200 PASS | 404 FAIL | NOT IMPLEMENTED | 200 PASS |
| Git/Jujutsu maintenance provenance | PASS | PASS | PASS | NOT IMPLEMENTED | PASS |
| Deployment | PASS | PASS | PASS | NOT IMPLEMENTED | NOT IMPLEMENTED: readiness only |
| Bounded Ask | NOT APPLICABLE | PASS | PASS | NOT IMPLEMENTED | NOT APPLICABLE |
| Complete repository security/source policy | FAIL | FAIL | FAIL | FAIL | FAIL |
| Standard-aware upgrade | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED | NOT IMPLEMENTED |

## Canonical role mappings that must remain valid

The dogfood set proves that conformance cannot depend on one filename convention.

| Canonical role | Valid observed paths |
|---|---|
| Source register | `docs/evidence/sources.md`; `docs/sources.md`; `docs/sources/index.md` |
| Evidence matrix | `docs/evidence/matrix.md`; `docs/evidence-matrix.md`; generated `docs/evidence/matrix.md` backed by canonical `docs/evidence/claims.csv` |
| Validation queue | `docs/evidence/validation-queue.md`; `docs/evidence-validation-queue.md`; `docs/further-research-priorities.md` |
| Research log | `docs/evidence/research-log.md`; `docs/log.md` |
| LLM Wiki | `docs/llm-wiki/`; `docs/llm/`; distributed rules in `AGENTS.md` plus the LLM entry and maintenance pages |
| Graph publication | `docs/assets/generated/`; `docs/assets/graphify/` |
| Human renderer | `zensical.toml`; `mkdocs.yml` through the Material compatibility adapter |

The manifest should be the authoritative mapping after adoption. Adoption audit heuristics should suggest mappings with evidence and confidence, then require review; they must not rewrite or relocate files.

## Runtime evidence

| Project | Declared local URL | Audit result |
|---|---|---|
| NHS Data Sharing | `http://127.0.0.1:8015/` | HTTP 200 |
| Regulation 28 | `http://127.0.0.1:8000/` | HTTP 200 |
| InterSystems | `http://127.0.0.1:8002/` | HTTP 404 despite a listening `mkdocs serve` process |
| X-Lab | None selected | NOT IMPLEMENTED |
| Palantir | `http://127.0.0.1:8016/` | HTTP 200 |

InterSystems is the important negative fixture: service registration, a listener, logs and a historical conformance statement cannot substitute for an HTTP 200 response at the canonical URL.

## Dependency findings

| Project | Reproducible strengths | Missing or external inputs |
|---|---|---|
| NHS Data Sharing | Locked Zensical 0.0.51, Graphify 0.8.35, Wrangler 4.114.0 | Published graphs use unpkg; browser test runner is not repository-pinned |
| Regulation 28 | Locked Zensical 0.0.50 and Wrangler 4.112.0 | Graphify is not in the Python lock; graph runtimes use unpkg; browser runner not pinned |
| InterSystems | Locked MkDocs/Material and separate Graphify tool pin | Graph/Mermaid use CDNs; design lint is fetched by `npx`; browser runner not pinned |
| X-Lab | Exact Python build/extraction pins and separate Graphify 0.8.35 pin | No browser, service, deployment or JJ dependency because those capabilities are not selected |
| Palantir | Locked Zensical 0.0.52 and Wrangler 4.112.0 | Graphify not in Python lock; graph runtimes use unpkg; browser runner not pinned |

This supports a capability-scoped dependency contract. Universal reading must remain Markdown/YAML/Git-compatible; optional adapters must carry their own installation, lock, external-service, offline, secret and verification declarations.

## Candidate defects exposed by dogfooding

### 1. Formal claim and inferred audit are conflated

Missing `.wiki-standard.yaml` should fail a formal claim but must not erase observed capability evidence. Reports need separate `formal_conformance` and `profile_assessment` fields, as the JSON dogfood reports demonstrate.

### 2. OKF needs semantic validation

NHS Data Sharing's `okf-out/bundle.json` says `okfCompatible: true`, but it is a custom path catalogue with no `okf_version`, concept metadata, source mapping or unknown-field round-trip proof. Self-declaration must never pass `DKBWS-OKF-001` or `DKBWS-OKF-002`.

### 3. Security is too compound

`DKBWS-SEC-001` combines secrets, personal data, copyright and source retention. Every project has some strong controls, yet every project fails at least one missing sub-boundary. Split the diagnostic evidence into separately reportable subcontrols even if one aggregate requirement remains.

### 4. “Read-only verification” is ambiguous

All builds write a site artifact. NHS, Regulation 28, X-Lab and Palantir also refresh tracked generated artifacts during verification, while InterSystems regenerates Graphify in a temporary copy. The standard should define whether read-only means:

- canonical inputs are immutable;
- the tracked working tree is immutable; or
- verification may write only to declared disposable output paths.

The last form is the easiest to verify deterministically. Generation and repair should remain explicit commands.

### 5. Local runtime checks must inspect network references

NHS Data Sharing, Regulation 28, InterSystems and Palantir publish 2D/3D graph HTML that loads `vis-network` or `3d-force-graph` from unpkg. File presence and version strings are insufficient; the browser/network contract must fail remote runtime dependencies when local runtime capability is claimed.

### 6. Renderer conformance needs compatibility ranges

The projects exactly pin Zensical 0.0.50, 0.0.51 and 0.0.52. Conformance should require an exact project pin within a release-tested compatibility range, not equality with the standard repository's current reference pin. The adapter manifest should record supported versions and fixtures.

### 7. Graph publication schemas have evolved

Newer `summary.json` files use `nodes`, `edges` and an `interconnections` object. InterSystems uses `nodeCount`, `edgeCount` and top-level relationship counts. Either publish a canonical output schema with migrations or allow versioned graph-publication adapters. Do not accept a file merely because it is valid JSON.

### 8. Graphify query-first needs a fallback rule

All graph queries were useful for orientation but returned shallow subsets for broad architecture questions. The standard should require query-first, then scoped source inspection when recall is insufficient; it must not treat the graph as complete evidence.

### 9. Git/Jujutsu provenance needs a stable requirement and workspace boundary

The initial profile prose mentioned Jujutsu without a stable requirement ID or an executable distinction between maintainer workspaces and Git-only distributions. `DKBWS-PROV-001` now applies to Standard Production maintenance workspaces: Git remains interoperable history, Jujutsu is colocated at the same root, and a read-only checker verifies versions and the current change without snapshotting. Portable Core and explicit distribution/CI checkouts remain Git-only; X-Lab therefore remains `NOT_IMPLEMENTED` rather than failing a profile it does not claim.

### 10. Release scope is ambiguous

Clarify whether `DKBWS-RELEASE-001` governs releases of the DenchCo standard, public releases of a conforming wiki, or both. Project deployment and exact-commit health are not automatically immutable standard tags with migration notes.

### 11. Status semantics need an algorithm

- `PASS`: applicable and evidenced.
- `FAIL`: applicable or claimed, but an obligation is contradicted or incomplete.
- `WAIVED`: applicable requirement explicitly waived in the manifest with authority, reason and expiry/review state.
- `NOT_APPLICABLE`: the selected profile or project facts make the requirement irrelevant.
- `NOT_IMPLEMENTED`: relevant capability is absent and no conformance claim is made for it.

Narrative exclusions must not silently become waivers. A missing mandatory core requirement is `FAIL`, not `NOT_IMPLEMENTED`, once a formal profile is selected.

## Candidate disposition after the audit

The audit was used as a design test, not left as a static scorecard:

| Finding | Candidate disposition |
|---|---|
| Formal claims vs inferred adoption | Two report modes and their authority boundary are now normative. |
| Superficial OKF self-declaration | Executable v0.2 hard validation, strict guidance diagnostics, lossless export, and positive/negative fixtures now exist. |
| Compound security result | `DKBWS-SEC-001` now has four separately reportable subcontrols while preserving one portable-core requirement ID. |
| Ambiguous read-only verification | Canonical-input immutability and declared derived-output writes are now distinct. |
| CDN/runtime leakage | The reference browser contract records network activity and rejects public runtime CDNs. |
| Renderer drift | The reference adapter records one exact tested Zensical pin; any version change requires full requalification. |
| Graph output shape drift | `graph.json` and `summary.json` now declare publication schema version `1.0` and have Draft 2020-12 schemas. |
| Shallow Graphify queries | Query-first now has an explicit wiki/report/scoped-source fallback. |
| Git/Jujutsu provenance ambiguity | `DKBWS-PROV-001` now makes colocated Jujutsu mandatory for Standard Production maintenance workspaces, retains Git-only Portable Core/distribution compatibility, and has an executable read-only checker. |
| Release ambiguity | The release rule now covers the standard and public implementation releases that advertise conformance. |
| Status ambiguity | Formal and adoption-audit status algorithms are now normative; waivers require authority plus expiry or review state. |

The audited projects retain their recorded gaps. Candidate improvements do not retroactively make those projects conformant or authorize their migration.

## Project-specific next adoption steps

### NHS Data Sharing

1. Add the manifest with mappings to the stronger `docs/evidence/` and concept-registry implementation.
2. Replace the custom OKF catalogue with a validator-backed v0.2 sidecar and round-trip fixtures.
3. Vendor graph runtimes and complete the repository security/source policy and upgrade contract.

### Regulation 28

1. Map canonical CSV inputs separately from generated Markdown views.
2. Add an OKF sidecar without changing the deliberate evidence authority chain.
3. Vendor graph runtimes and preserve the analytical map, technical graph and bounded Ask as separate capabilities.

### InterSystems

1. Select the Material compatibility adapter and existing legacy role mappings in a manifest.
2. Diagnose the current port-8002 HTTP 404 before claiming runtime health.
3. Implement the already-designed non-destructive OKF sidecar and complete repository policy mappings.

### X-Lab

1. Map `docs/llm/`, `docs/sources/index.md` and `docs/further-research-priorities.md` without renaming them.
2. Add stable source IDs and executable design lint.
3. Keep OKF, JJ, graph publication and hosting optional until their profiles are deliberately selected.

### Palantir

1. Add the manifest while preserving the explicit no-OKF/no-Ask/no-deployment boundaries.
2. Add OKF v0.2 and local graph runtimes before a Standard Production claim.
3. Treat deployment as `NOT_IMPLEMENTED` until a production URL and exact commit pass real health/browser checks.

## Audit limitations

- NHS Data Sharing and X-Lab had substantial pre-existing working-tree changes; their reports describe the inspected working tree, not only `git_head`.
- Historical CI and browser records were inspected but not replayed because the relevant commands regenerate project artifacts.
- Public production URLs were not externally health-probed in this sub-audit.
- No audited project was edited. Only the five JSON reports and this comparison were created in the DenchCo candidate repository.
