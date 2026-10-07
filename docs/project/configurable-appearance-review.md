---
type: Technical Review
title: Configurable appearance contribution review
description: Thirlwall contribution provenance, review repairs and pending formal acceptance.
status: draft
---

# Configurable appearance contribution review

The reusable mechanism is reviewed and integrated locally for a verified technical handoff. Formal Standard acceptance remains pending governed intake and an explicit maintainer decision. The authoritative consumer record remains `standard-proposals/configurable-appearance-family.json` in Thirlwall; this review does not duplicate or replace it.

## Recorded origin

| Record | Exact identity |
|---|---|
| Proposal | `DKBWS-PROP-configurable-appearance-family-070ebc0d2b395466901499f48f72d8d0` |
| Originating project | Thirlwall Inquiry: Implications for Defence Healthcare |
| Consumer implementation | `0def10afdb6126508ec257321a39d8e5adc9b048` |
| Consumer JJ change | `tntwtmvsprrmvxzklwzquqqvkymwqrqp` |
| Pinned Standard revision | `d339a0e30de41c4a3260f22c00c96898299a1834` |
| Proposal-record commit | `136f7c47df1bd4c2a23417221f6272030e9c2733` |
| Reviewed candidate | `3ec5e3c545d3d6bc423d42983910217cff4abee8` |

The proposal file matches its recorded commit byte for byte. Its SHA-256 is `3ef9e32537960eb0af7104c550c0aa8e54517147b20c10f3e1fdffd684a1ad7c`. The original implementation is an ancestor of that record commit. The candidate applies to the pinned Standard baseline without conflicts.

Graphify discovery was query-first. Its truncated result led to the scoped graph report, design contract, appearance implementation and governed proposal workflow. Graph output supplied navigation only.

## Scope and classification recommendation

The technical recommendation is **reusable** within Standard Production. One optional validated configuration supplies the brand seed, fresh appearance and desktop width. Shared OKLCH derivation provides named renderer, Mermaid and graph roles, with contrast checked after sRGB rounding. Zensical retains appearance storage ownership; the width control retains its existing storage key.

Pale green `#e1efdd`, light appearance and wide layout remain Thirlwall choices. The Standard has no appearance configuration and retains its teal, light and standard-width defaults. Existing consumers retain their pins and manual token adapters until they select a migration.

This adapter implements existing `DKBWS-DESIGN-001`, `DKBWS-PROMPT-001`, `DKBWS-RENDER-001` and `DKBWS-VERIFY-001` obligations. It adds no profile requirement or waiver. Migration requires the schema, generator, build/live configuration, graph integration, width fallback, ignored-output declarations and tests together. Unsupported renderer configuration fails explicitly.

## Review findings and repairs

1. **Saved preferences during adoption.** The candidate reordered native palette blocks to select a dark default. Zensical 0.0.59 restores a saved radio index, so that change reversed previously saved light and dark choices. The integration preserves canonical radio order. Native `media = "all"` and `media = "not all"` select the fresh default without following the operating-system theme. No extra storage key or preference controller is introduced. Unit tests cover both canonical orders and repeated default changes. Browser cases save choices through the old native controls, then retain them through adoption, a later default change, navigation and reload.
2. **Design contract consistency.** The neutral header rule now explicitly describes the unconfigured shell. The optional configured header and selected navigation use the exact brand seed with contrasting text. The starter distinguishes the brand seed from derived active text colours and requires the completed named token map to reflect the generated roles.

## Verification evidence

The saved candidate evidence was checked against the exact candidate, not assumed current. All 42 canonical evidence references, covering 41 unique files, match that commit. The saved receipt digest is `eef7f081b8041071a1e2c44092245970d1826b014b28ce046fd4ea1723c7dfe2`; its appearance report contains nine passing cases. Its distribution report leaves maintainer provenance and the managed service unverified. A separate saved provenance check passes.

The initial integration passed complete maintainer verification before the review repairs. That result did not expose the adoption defect. After repair, 26 focused unit and configuration tests passed, along with 13 real-renderer appearance cases. A fresh full-content pale-green/dark/wide build passed the complete browser contract, including source links, Mermaid, search, mobile containment and both graph views. Desktop and mobile fixture screenshots were inspected.

The final handoff runs complete `npm run verify:workspace` on the repaired Standard tree, plus the read-only maintainer provenance check. Its JJ commit description records the final outcomes and local evidence digests. The current receipt and conformance report are generated under `output/verification/`; they are verification evidence, not canonical knowledge. The released Documentation snapshot still matches rc.5; no snapshot update or pin change is part of this contribution.

The actual Standard service is checked through `service:status` and the fail-closed `service:preview` handoff. Its exact contract passes with the existing pinned Standard toolchain. The earlier shell mismatch was resolved by using that toolchain; no service identity or registered endpoint was changed.

## Formal acceptance boundary

Read-only checks on 7 October 2026 confirmed a valid consumer record, matching published form bytes, both required labels, and no open or closed issue matching the proposal marker. `standard:proposal sync --check` returned no diagnostics and made no writes.

- Prepared payload SHA-256: `a2df6614797be42909b60d9756c344a76368ee4d350915e2064bc94116d8f117`.
- Governed form SHA-256: `3624749c2915771b98dabb7ec93f7ae34618da7b914bd28d20a557abd86f4adf`.

Approval remains pending. The issue is not submitted. Formal classification, acceptance and release inclusion remain pending; adoption remains not considered. The Standard registry cannot receive a new governed-issue entry until exact issue linkage exists. Its single historical exception is unavailable to this proposal.

Follow the [tracked proposal workflow](../llm-wiki/standard-proposals.md):

1. Review and explicitly approve the existing exact payload, then record approval against its digest and form revision in Thirlwall. If the payload changes to describe this review, prepare it again and approve the new digest. Open the governed form only when requested; the user submits it.
2. Reconcile the submitted issue by its stable marker and exact payload. Record the observed issue linkage in its own JJ phase.
3. Obtain the Standard maintainer's explicit reusable acceptance decision against the verified full integration commit and named requirement IDs. Record it in the Standard registry, then record the corresponding consumer decision in a separate JJ phase.

Immutable release inclusion and any Thirlwall pin change require later, separate decisions. Technical integration does not authorise publication, release or consumer adoption.

| Parked transition | `blocked_by` | `reopen_when` | `last_checked` |
|---|---|---|---|
| Formal intake and acceptance | Exact-payload approval, user submission, exact issue linkage and explicit maintainer decision | The authorised user supplies approval or the governed issue becomes available for reconciliation | 2026-10-07 |

See [project status](status.md) for the current bounded priority.
