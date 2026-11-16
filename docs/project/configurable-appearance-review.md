---
type: Technical Review
title: Configurable appearance contribution review
description: Thirlwall contribution provenance, review repairs and governed acceptance.
status: draft
---

# Configurable appearance contribution review

The reusable mechanism is reviewed, integrated and included in immutable rc.6. Governed issue [#33](https://github.com/denchco/knowledge-base-wiki-standard/issues/33) is accepted as reusable under decision `b0b5e8021a5a93feb767e486699ec7c524955da6`. The [acceptance publication](https://github.com/denchco/knowledge-base-wiki-standard/pull/35) publishes that decision and its registry entry. The authoritative consumer record remains `standard-proposals/configurable-appearance-family.json` in Thirlwall; this review does not duplicate or replace it.

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

At technical review, the prepared proposal file matched its recorded commit byte for byte. Its preparation-time SHA-256 is `3ef9e32537960eb0af7104c550c0aa8e54517147b20c10f3e1fdffd684a1ad7c`. The original implementation is an ancestor of that record commit. The candidate applies to the pinned Standard baseline without conflicts.

Graphify discovery was query-first. Its truncated result led to the scoped graph report, design contract, appearance implementation and governed proposal workflow. Graph output supplied navigation only.

## Scope and accepted classification

The accepted classification is **reusable** within Standard Production. One optional validated configuration supplies the brand seed, fresh appearance and desktop width. Shared OKLCH derivation provides named renderer, Mermaid and graph roles, with contrast checked after sRGB rounding. Zensical retains appearance storage ownership; the width control retains its existing storage key.

Pale green `#e1efdd`, light appearance and wide layout remain Thirlwall choices. At the reviewed integration commit, the Standard had no appearance configuration and retained its teal, light and standard-width defaults. A later, separately authorised Standard presentation change aligns its blue family, white page and wordmark with the public Documentation Wiki. That change does not alter this contribution's origin or review evidence. The later [reader-default correction](../reference/reader-defaults-migration.md) makes Wide the unconfigured baseline; it preserves the original contribution history and saved reader choices. Existing consumers retain their pins and manual token adapters until they select a migration.

This adapter implements existing `DKBWS-DESIGN-001`, `DKBWS-PROMPT-001`, `DKBWS-RENDER-001` and `DKBWS-VERIFY-001` obligations. It adds no profile requirement or waiver. Migration requires the schema, generator, build/live configuration, graph integration, width fallback, ignored-output declarations and tests together. Unsupported renderer configuration fails explicitly.

## Review findings and repairs

1. **Saved preferences during adoption.** The candidate reordered native palette blocks to select a dark default. Zensical 0.0.59 restores a saved radio index, so that change reversed previously saved light and dark choices. The integration preserves canonical radio order. Native `media = "all"` and `media = "not all"` select the fresh default without following the operating-system theme. No extra storage key or preference controller is introduced. Unit tests cover both canonical orders and repeated default changes. Browser cases save choices through the old native controls, then retain them through adoption, a later default change, navigation and reload.
2. **Design contract consistency.** The neutral header rule now explicitly describes the unconfigured shell. The optional configured header and selected navigation use the exact brand seed with contrasting text. The starter distinguishes the brand seed from derived active text colours and requires the completed named token map to reflect the generated roles.

## Verification evidence

The saved candidate evidence was checked against the exact candidate, not assumed current. All 42 canonical evidence references, covering 41 unique files, match that commit. The saved receipt digest is `eef7f081b8041071a1e2c44092245970d1826b014b28ce046fd4ea1723c7dfe2`; its appearance report contains nine passing cases. Its distribution report leaves maintainer provenance and the managed service unverified. A separate saved provenance check passes.

The initial integration passed complete maintainer verification before the review repairs. That result did not expose the adoption defect. After repair, 26 focused unit and configuration tests passed, along with 13 real-renderer appearance cases. A fresh full-content pale-green/dark/wide build passed the complete browser contract, including source links, Mermaid, search, mobile containment and both graph views. Desktop and mobile fixture screenshots were inspected.

The final handoff runs complete `npm run verify:workspace` on the repaired Standard tree, plus the read-only maintainer provenance check. Its JJ commit description records the final outcomes and local evidence digests. The current receipt and conformance report are generated under `output/verification/`; they are verification evidence, not canonical knowledge. At that technical handoff, the released Documentation snapshot still matched rc.5. Its later authorised rc.6 migration, protected deployment and public reader verification are now complete at Documentation revision `4df1493c737b355b25c7846f40bb13b997f100c3`; this contribution does not authorise other consumer pin changes.

The actual Standard service is checked through `service:status` and the fail-closed `service:preview` handoff. Its exact contract passes with the existing pinned Standard toolchain. The earlier shell mismatch was resolved by using that toolchain; no service identity or registered endpoint was changed.

## Formal acceptance boundary

Read-only checks on 7 October 2026 confirmed a valid consumer record, matching published form bytes, both required labels, and no open or closed issue matching the proposal marker. `standard:proposal sync --check` returned no diagnostics and made no writes.

- Prepared payload SHA-256: `a2df6614797be42909b60d9756c344a76368ee4d350915e2064bc94116d8f117`.
- Governed form SHA-256: `3624749c2915771b98dabb7ec93f7ae34618da7b914bd28d20a557abd86f4adf`.

The owner approved the exact payload and delegated its final governed-form submission. Issue #33 matches the approved payload digest, and the published form matches the governed form digest. Its issue-linkage and accepted-decision records use separate consumer JJ commits. The Standard registry retains reusable acceptance under `b0b5e8021a5a93feb767e486699ec7c524955da6` and now records rc.6 inclusion. The originating record remains unchanged at release pending and adoption not considered.

The completed [tracked proposal workflow](../llm-wiki/standard-proposals.md) preserves the exact preparation-time payload. The completed acceptance-phase reconciliation compared the consumer record with the then-published acceptance registry; it does not establish reconciliation against the later release ledger. The original implementation, pin and review evidence remain unchanged.

Immutable rc.6 inclusion is recorded in the later Standard registry. Thirlwall release reconciliation and any pin or adoption change remain separate governed transitions; Standard publication does not authorise them.

| Parked transition | `blocked_by` | `reopen_when` | `last_checked` |
|---|---|---|---|
| Thirlwall adoption | No consumer adoption authority | The owner selects an exact released revision and authorises verified migration | 2026-10-21 |

See [project status](status.md) for the current bounded priority.
