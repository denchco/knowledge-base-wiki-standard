---
type: Intake Review
title: Three-contribution intake review
description: Exact public payloads and reviewed acceptance scope for three consumer contributions.
status: draft
---

# Three-contribution intake review

The owner authorised completion of intake and acceptance for these three contributions on 19 October 2026. The technical review supports acceptance against Standard revision `ced1ee1588ce3640b6c0a680b15f5dec4f2fdee7`. The owner then approved all three exact payloads below and delegated their final submission through the governed forms. The approvals are recorded in the originating records. Browser authentication must complete before submission; no issue linkage or completed acceptance is claimed yet.

The originating records remain authoritative. Their immutable implementations and pins were checked again. Read-only `check` and `sync --check` returned valid and current with no diagnostics. Searches covered open and closed issues by each stable marker and found no submitted match. The 121-file verification archive for the reviewed Standard revision passed all recorded size and SHA-256 checks. Its full-profile report is complete and conformant.

## Acceptance scope

| Contribution | Classification | Accepted requirement mapping after exact issue linkage |
|---|---|---|
| DShCR numeric citations | Preferred | `DKBWS-LINK-002` |
| Configurable appearance family | Reusable | `DKBWS-DESIGN-001`, `DKBWS-PROMPT-001`, `DKBWS-RENDER-001`, `DKBWS-VERIFY-001` |
| Content-first development handoff | Reusable | `DKBWS-PROMPT-001` |

Numeric citations preserve identity-derived numbers, leading zeroes, authored order, exact source-row links, accessible identities and explanatory notes. `DKBWS-RENDER-001` remains an affected compatibility constraint in the original proposal; citation semantics do not add a separate dependency or network obligation.

The appearance mechanism supplies validated configuration, deterministic colour derivation, native preference preservation, renderer and graph integration, and source and browser checks. The originating pale-green identity stays project-specific. The later Standard-owned Wide baseline is a separate correction. The original payload describes the contribution at preparation time and is preserved below.

The handoff mechanism requires a grounded assessment of the continuing Wiki subject and evidence after each development cycle. Shared instructions, starter guidance and captured-response fixtures carry the policy. Those fixtures prove structure and instruction consistency; they do not certify the quality of uncaptured responses.

## Submission boundary

Each payload below includes its exact repository, title, labels and body. Its digest covers the compact ordered JSON object `{repository,title,labels,body}` with no trailing newline. All three bind governed form SHA-256 `3624749c2915771b98dabb7ec93f7ae34618da7b914bd28d20a557abd86f4adf`. The public form still matches that digest.

The standing `AGENTS.md` rule says: “the user performs final submission.” The owner's explicit delegation covers only these three exact payloads. The general rule remains in force. Any payload or form edit invalidates approval. The [governed workflow](../llm-wiki/standard-proposals.md) requires verified exact issue linkage before a terminal decision can be recorded.

After submission, record each observed issue linkage and acceptance in separate Jujutsu phases. Publish the matching acceptance registry through the governed repository process, then reconcile the consumer records against it. Release inclusion, Documentation synchronisation and consumer adoption remain separate. Existing pins do not change.

## Exact prepared payloads

### DShCR numeric citations

- Repository: `https://github.com/denchco/knowledge-base-wiki-standard`
- Title: [Standard change]: Prefer stable numeric superscript source citations with direct register links
- Labels: `enhancement`, `standard-change`
- Payload SHA-256: `a58526e8511572a250f7f73f287b0492ffa52e3d4d90e8c8c4dbbf74e4080514`
- Form SHA-256: `3624749c2915771b98dabb7ec93f7ae34618da7b914bd28d20a557abd86f4adf`

The following block is the exact issue body.

````markdown
### Proposal schema version

1.0

### Stable proposal identifier

DKBWS-PROP-dshcr-numeric-source-citations-6f20cb144cc87ed7977425df68469964

### Problem and observed behaviour

Sequential renderer footnote numbers hide stable SRC identities, adjacent references run together, and a second source-footnote list creates an unnecessary navigation step.

### Intended outcome

Render SRC-002 as superscript 002, retain leading zeroes and authored order, separate adjacent citations with comma and space in superscript, and link each directly to its registered SRC row with the full accessible identity. Preserve canonical Markdown and explanatory notes.

### Originating consumer or implementation

dshcr-research

### Immutable originating revision

885700d67e3a408c08818747b601d857f3f40576

### Jujutsu change identifier (optional)

lvqunvsynrvqxzvyxnmvrtlpsmnpwwzr

### Pinned Standard revision

4aae4d4efbcea526f28ec8bcbfaf203dae34bc25

### Proposed reuse class

Preferred

### Affected profiles and requirements

Profiles: human-and-agent, standard-production
Requirements: DKBWS-LINK-002, DKBWS-RENDER-001

### Dependencies, limitations, and simpler fallback

Dependencies:
- DShCR uses locked Zensical 0.0.59 and its existing Node Markdown projection; no new runtime dependency is required. The Standard adapter uses the already locked Python Markdown dependency.

Limitations:
- DShCR browser evidence covers Chromium at desktop and mobile widths, not a complete accessibility or browser certification.
- The proposal concerns interface behaviour only; it does not revalidate clinical evidence, adopt a Standard release, or claim an upstream decision.
- Existing explicitly declared citation grammars remain valid until a deliberate renderer migration.

Simpler fallback: Keep canonical Markdown source links or registered source footnotes readable without the renderer; retain explanatory and ordinary notes rather than deleting content.

### Evidence and implementation record

- scripts/prepare-wiki.mjs
- scripts/prepare-wiki.test.mjs
- wiki/assets/research.css
- docs/ui-verification.md

Licensing: not-applicable
- Behaviour-only proposal written for the user-authorised Standard update. It contains no copied clinical evidence, attachments or third-party source content; source implementation artifacts remain in the originating repository. No automatic upload or publication is authorised.

### Accessibility and browser evidence

Accessibility — applicable: docs/ui-verification.md records full accessible source labels, independent native links, superscript grouping and responsive containment; no full WCAG or screen-reader certification is claimed.
Browser — applicable: docs/ui-verification.md records 19 superscript groups without a redundant footer on implementation cases, exact SRC-120 navigation, desktop 1630 x 1000 and mobile 390 x 844 checks.

### Verification and fixture proposal

- `UV_CACHE_DIR=<temporary-cache> npm run verify` — pass; docs/ui-verification.md; SHA-256 f1d73ebf108f672b3eaaa3bd0916812b9c7e6e5b4e5dcbc292a2069ef1cd96b0
- `npm run check:provenance` — pass; docs/ui-verification.md

### Migration and compatibility impact

Update the renderer, styles, source lint and fixtures together. Preserve SRC identifiers, exact source-row targets, canonical authoring bytes, the evidence-governed profile and the existing Standard pin. This local candidate does not authorise release or consumer adoption.

### Safety and authority

- [x] I have removed secrets, personal or confidential data, and vulnerability details; security reports use the private advisory route.
- [x] I have authority to share the linked implementation evidence and its licensing status is cleared or not applicable.
- [x] I understand that this issue proposes review and does not itself promote the pattern or authorize publication.

### Stable deduplication marker

<!-- dkbws-standard-proposal-form-sha256:3624749c2915771b98dabb7ec93f7ae34618da7b914bd28d20a557abd86f4adf -->
<!-- dkbws-standard-proposal:v1:DKBWS-PROP-dshcr-numeric-source-citations-6f20cb144cc87ed7977425df68469964 -->
````

### Configurable appearance family

- Repository: `https://github.com/denchco/knowledge-base-wiki-standard`
- Title: [Standard change]: Generate a reusable colour family and configurable appearance defaults
- Labels: `enhancement`, `standard-change`
- Payload SHA-256: `a2df6614797be42909b60d9756c344a76368ee4d350915e2064bc94116d8f117`
- Form SHA-256: `3624749c2915771b98dabb7ec93f7ae34618da7b914bd28d20a557abd86f4adf`

The following block is the exact issue body.

````markdown
### Proposal schema version

1.0

### Stable proposal identifier

DKBWS-PROP-configurable-appearance-family-070ebc0d2b395466901499f48f72d8d0

### Problem and observed behaviour

The consumer received the confirmed accent #e1efdd, but its first implementation barely displayed that colour and used a more chromatic dark green. Later corrections required coordinated edits to theme tokens, graph fallbacks, defaults and tests. The pinned Standard already requires a confirmed accent, a documented derived family, accessible contrast, native palette persistence and browser checks. Those initial failures were implementation defects against existing instructions. The reusable improvement is an executable configuration and derivation mechanism that makes those instructions repeatable; it is not a request to legitimise the defects.

### Intended outcome

Provide one consumer configuration for the exact brand accent, initial appearance and desktop width. Derive accessible colour roles with a documented, deterministic method that preserves the chosen hue and chroma where the sRGB gamut allows. Preserve the exact brand colour for suitable visible surfaces and use derived colours for text, controls and focus. Generate or consistently adapt the renderer, Mermaid and graph theme roles from that configuration. Saved reader preferences take precedence over initial defaults. Add pale-colour and fresh-profile fixtures that test the requested result, not merely agreement between duplicated tokens. The consumer choices #e1efdd, light appearance and wide desktop layout remain examples and project preferences, not universal Standard defaults.

### Originating consumer or implementation

Thirlwall Inquiry: Implications for Defence Healthcare

### Immutable originating revision

0def10afdb6126508ec257321a39d8e5adc9b048

### Jujutsu change identifier (optional)

tntwtmvsprrmvxzklwzquqqvkymwqrqp

### Pinned Standard revision

d339a0e30de41c4a3260f22c00c96898299a1834

### Proposed reuse class

Reusable

### Affected profiles and requirements

Profiles: standard-production
Requirements: DKBWS-DESIGN-001, DKBWS-PROMPT-001, DKBWS-RENDER-001, DKBWS-VERIFY-001

### Dependencies, limitations, and simpler fallback

Dependencies:
- The consumer uses the pinned Zensical 0.0.59 reference adapter and repository-local browser runtimes.
- Keep native Zensical palette storage and its checked-state restoration adapter. Do not add a second appearance preference store.
- A reusable generator needs deterministic colour conversion, sRGB gamut handling and contrast checks. Consumer configuration must be validated before generated assets are accepted.

Limitations:
- The committed consumer proves one palette and one set of defaults. Its family is recorded and applied locally; it is not yet a general palette generator.
- The consumer repository and verification artifacts are not published by this proposal. Public URLs identify the Standard baseline only. Local hashes and reported results are not independent upstream verification.
- The local candidate now tests pale, dark, saturated and neutral input colours, saved preferences and width-storage failure. Its isolated browser fixtures do not establish compatibility with every consumer theme. Unsupported renderer configurations fail explicitly and require adapter review.
- No proposal submission, Standard acceptance, immutable release or consumer adoption is claimed. The existing immutable pin remains unchanged.
- The payload contains implementation observations and references only. It contains no topic evidence, consumer files or attachments.

Simpler fallback: Retain the existing documented manual adapter with named colour roles and full browser checks. This remains usable but requires coordinated edits and does not prevent inconsistent repeated implementation.

### Evidence and implementation record

- Local unpublished Standard candidate commit 3ec5e3c545d3d6bc423d42983910217cff4abee8: adds validated config/wiki-appearance.json, shared OKLCH derivation, generated native renderer defaults, graph roles, starter adaptation instructions and integrated unit/browser checks. This is a review candidate, not an accepted or released Standard change.
- Consumer commit 0def10afdb6126508ec257321a39d8e5adc9b048: DESIGN.md records the OKLCH derivation; docs/assets/theme.css, scripts/publish-graphify-assets.mjs and browser/style checks carry the matching family.
- Consumer commit 9156fd7c5c299eed8362b76e82e28f8ccfb3e22f: wide desktop and light appearance defaults preserve explicit saved choices.
- Consumer commit 6c670c449f2f5bc6effa8eb9cf1ac0aceda9210e: exact pale accent surfaces, selected-state contrast and component-specific checks correct the original local implementation.
- Public baseline instructions: https://github.com/denchco/knowledge-base-wiki-standard/blob/d339a0e30de41c4a3260f22c00c96898299a1834/starter/templates/DESIGN.md.tmpl
- Public starter recipe: https://github.com/denchco/knowledge-base-wiki-standard/blob/d339a0e30de41c4a3260f22c00c96898299a1834/starter/starter.yaml

Licensing: cleared
- The referenced Standard baseline is MIT-licensed: https://github.com/denchco/knowledge-base-wiki-standard/blob/d339a0e30de41c4a3260f22c00c96898299a1834/LICENSE
- The consumer LICENSING.md retains the Standard MIT terms for adapted implementation files. This payload shares observations and references, not implementation files or original research content. It grants no new redistribution licence for the consumer corpus.
- The user authorised preparation of this improvement proposal. Approval of the exact payload and any final form submission remain pending.

### Accessibility and browser evidence

Accessibility — applicable: The consumer dark sage #505c4d was derived from the pale accent by retaining OKLCH hue and chroma while reducing lightness. Its contrast against #e1efdd is 5.91:1. Browser checks cover rendered text, selected icons and visible focus. The general mechanism must meet at least 4.5:1 for normal text and 3:1 for non-text interactive boundaries against each actual background; hue similarity alone is insufficient. The candidate also checks final rounded sRGB roles across 394 input colours and measures rendered contrast in its browser fixtures.
Browser — applicable: The consumer browser suite passed desktop and 390px mobile checks, light/dark switching, navigation/reload persistence and both graph views. Wide remains a desktop preference. A reusable adapter must separately test fresh profiles, explicit saved alternatives and storage failure without assuming an operating-system theme. The candidate passed nine real-renderer appearance cases and the complete existing browser contract with pale-green/Dark/Wide configuration, as well as without configuration.

### Verification and fixture proposal

- `npm run verify` — pass; Local output/verification/receipt.json for the committed consumer implementation: all command gates and the canonical-input mutation guard passed; read-only maintainer provenance passed. This historical digest identifies local evidence, not a published report.; SHA-256 ea9336f0aabaf087a324f0e305d294f36e7592e78a4a05d313be84170df2d5b0
- `npm run check:browser (within npm run verify)` — pass; Local output/verification/browser/contract.json from the same run reports ok:true. It covers light/dark appearance, desktop/mobile layout, native focus and persistence, exact pale surfaces, source links, diagrams and 2D/3D graphs. The timestamp is the containing verification completion time.; SHA-256 e032884c123926c13d46a22fd482737545715fbf763f33a19704ae882ee5ae40
- `DKBWS_PROVENANCE_MODE=distribution npm run verify (isolated Standard candidate)` — pass; Local candidate verification passed its build, 182 unit and contract tests, existing full browser checks, nine configured appearance cases, schemas, audits and canonical mutation guard. A separate read-only maintainer provenance check passed. The isolated candidate has no managed service, so the distribution report remains partial with its explicit maintainer-only gaps. The receipt precedes the final commit description; its canonical evidence hashes identify the verified code.; SHA-256 eef7f081b8041071a1e2c44092245970d1826b014b28ce046fd4ea1723c7dfe2
- `Full browser contract against isolated pale-green/Dark/Wide Standard fixture` — pass; The additional full-content fixture passed configured defaults, native persistence, source links, diagrams, mobile table scrolling, search and both graph views. The recorded timestamp is the containing candidate verification completion time, after this fixture completed. Local log only; no upstream independent verification.; SHA-256 2ad83a0d0be15f53b1253f81c4a63facbb033b3e35799b3418340f47e785ee74

### Migration and compatibility impact

Introduce the mechanism as an explicit, reviewed adapter improvement. Existing consumers retain their declared tokens, defaults, saved preference keys and pinned revision until they choose migration. Do not infer adoption from an issue or draft implementation. Adoption requires accepted changes in an immutable Standard release and a separate verified consumer update.

### Safety and authority

- [x] I have removed secrets, personal or confidential data, and vulnerability details; security reports use the private advisory route.
- [x] I have authority to share the linked implementation evidence and its licensing status is cleared or not applicable.
- [x] I understand that this issue proposes review and does not itself promote the pattern or authorize publication.

### Stable deduplication marker

<!-- dkbws-standard-proposal-form-sha256:3624749c2915771b98dabb7ec93f7ae34618da7b914bd28d20a557abd86f4adf -->
<!-- dkbws-standard-proposal:v1:DKBWS-PROP-configurable-appearance-family-070ebc0d2b395466901499f48f72d8d0 -->
````

### Content-first development handoff

- Repository: `https://github.com/denchco/knowledge-base-wiki-standard`
- Title: [Standard change]: Provide content-first next steps after every development cycle
- Labels: `enhancement`, `standard-change`
- Payload SHA-256: `188db2cb41c269049d772dc668f7a9c33ab0d14e81131c16ab0366af3c72127e`
- Form SHA-256: `3624749c2915771b98dabb7ec93f7ae34618da7b914bd28d20a557abd86f4adf`

The following block is the exact issue body.

````markdown
### Proposal schema version

1.0

### Stable proposal identifier

DKBWS-PROP-content-first-development-next-steps-08dfca0ab059007d75c4ed691a19f8bf

### Problem and observed behaviour

The existing completion policy suppresses next steps once the last requested task is complete and excludes useful content refinements. In a maintained reference wiki this caused initial coverage to be described as final completion, while a stale technical handoff displaced topic development. The user requested a consistent content-first assessment after every development cycle and confirmed the required format.

### Intended outcome

After every development cycle, assess the continuing wiki purpose, evidence and current priorities. Present up to three recommendations in priority order, with Proposed update, Why it matters and Done when for each. Prefer bounded subject-content and evidence improvements; required verification failures still take precedence. Check completed work and handoff evidence before selection. Preserve blocked-work triggers and prohibit filler, automatic execution and an exactly-three quota. If no grounded recommendation is available, state that explicitly.

### Originating consumer or implementation

Thirlwall Inquiry: Implications for Defence Healthcare

### Immutable originating revision

ad966d4e43b56931ea22db804c4fde10704d043b

### Jujutsu change identifier (optional)

kuyopmxkzpsknyrpytonzplloprtrmvq

### Pinned Standard revision

d339a0e30de41c4a3260f22c00c96898299a1834

### Proposed reuse class

Reusable

### Affected profiles and requirements

Profiles: human-and-agent, standard-production, managed-full
Requirements: DKBWS-PROMPT-001

### Dependencies, limitations, and simpler fallback

Dependencies:
- Existing project-purpose, evidence, status and validation-queue records supply the context for selecting grounded recommendations.
- The managed handoff block, bootstrap prompt, root/starter instructions and Codex/Claude skills must remain consistent. No new third-party runtime dependency is required.

Limitations:
- Instruction and fixture checks can enforce cadence, structure and explicit selection rules; they cannot certify the quality or novelty of an uncaptured model response.
- A grounded content recommendation is a proposal for user selection, not authority to start research or perform an external action.
- Formal Standard intake, acceptance, release and consumer adoption are separate pending transitions. No external issue, message, attachment or publication is created.

Simpler fallback: Apply the confirmed pattern manually from project instructions, using current project status and evidence limits. Explicitly report when no grounded recommendation exists.

### Evidence and implementation record

- Consumer commit ad966d4e43b56931ea22db804c4fde10704d043b records the user-confirmed standing instruction in AGENTS.md and docs/llm-wiki/maintenance.md, two bounded content priorities in docs/project/status.md, and reconciliation of the completed technical handoff.
- The implementation retains the pinned managed block and records the explicit user preference separately. It does not claim adoption of a later Standard revision.
- Standard candidate commit b1d2de08fa8b5383dd50878e3bbec314097c9cf8 (JJ lsusoysvqyrzkorxvtkysmwwsuvqntqm), based on 31ee99b4c9c2da71e60c006d93a03f0e8ccff724, updates DKBWS-PROMPT-001, shared instructions, starter, Codex/Claude/plugin skills, bootstrap, discovery guidance and captured-response checks. It is technically integrated in the local Standard checkout; formal intake, acceptance and release remain pending.

Licensing: cleared
- The Standard baseline is MIT-licensed; adapted implementation instructions retain its notices.
- The proposal shares original workflow observations and the user-confirmed preference, with commit identities and verification summaries. It contains no topic source extracts or internal Defence material.

### Accessibility and browser evidence

Accessibility — not-applicable: This changes development-response structure and selection policy. It introduces no new visual control or colour-dependent meaning; plain numbered text remains readable.
Browser — not-applicable: The reusable change concerns agent instructions and structured handoffs. Existing complete browser checks remain part of verification; no browser runtime behaviour is added.

### Verification and fixture proposal

- `npm run verify; npm run check:provenance` — pass; Complete consumer verification and independent read-only maintainer provenance passed. The report is complete and conformant; the canonical mutation guard passed. The saved receipt identifies the verified consumer origin, not an upstream certification.; SHA-256 f308a4ffd473c9dc1e5ce9421a098c843a9de680ab102ecf146c5de0d7bc491a
- `DKBWS_PROVENANCE_MODE=distribution npm run verify; npm run check:provenance` — pass; The isolated Standard candidate passed 189 tests, the complete runtime/browser contract, 13 appearance cases, schema and audit thresholds, and the canonical mutation guard. Its distribution report deliberately leaves DKBWS-PROV-001 and DKBWS-RUNTIME-002 not checked. A separate read-only maintainer provenance check passed. This receipt does not claim a managed service for the isolated checkout.; SHA-256 c80caf1a48ee205ce1bfbdd9652b2c0c983536db63a958a4c6bea9a2b4fab8e7

### Migration and compatibility impact

Update the DKBWS-PROMPT-001 handoff contract, instruction copies, starter, skills, bootstrap wording and relevant fixtures together. Existing consumers keep their immutable pins and declared preferences until a reviewed migration. A user may request a local standing override without claiming Standard release adoption. Do not rewrite topic content or invent priorities during migration.

### Safety and authority

- [x] I have removed secrets, personal or confidential data, and vulnerability details; security reports use the private advisory route.
- [x] I have authority to share the linked implementation evidence and its licensing status is cleared or not applicable.
- [x] I understand that this issue proposes review and does not itself promote the pattern or authorize publication.

### Stable deduplication marker

<!-- dkbws-standard-proposal-form-sha256:3624749c2915771b98dabb7ec93f7ae34618da7b914bd28d20a557abd86f4adf -->
<!-- dkbws-standard-proposal:v1:DKBWS-PROP-content-first-development-next-steps-08dfca0ab059007d75c4ed691a19f8bf -->
````

The [release preparation record](release-readiness.md) retains the integration inventory and publication boundaries.
