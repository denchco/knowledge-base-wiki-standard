# Design QA — Mermaid native-default split-product reference treatment

Date: 2026-08-05
Result: **Pass**

## Scope

- Standard homepage system overview.
- Standard architecture authority overview.
- Desktop, tablet, and mobile content widths in the pinned Zensical and Mermaid runtimes.

## Origin and classification

- Originating implementation: **Health IT Governance Beyond the NHS**, `docs/research/information-lifecycle.md` at immutable revision `c96d235c18094243b6493d8aa1c74a38d65eb947` (`SRC-019`).
- The observed local page had citation-only working-copy changes; its plain Mermaid diagram is unchanged from that immutable revision.
- Reuse classification: **Preferred** plain-source default for DenchCo entry and architecture diagrams under `DKBWS-DESIGN-001`.
- The comparator and this repository use the same effective Mermaid adapter. The visible difference therefore came from diagram-level initialization and semantic class opt-ins, not from a different runtime.
- `SRC-019` supports the renderer-default source treatment only. The separate three-product topology restores the structure released in `v0.1.0-rc.3`; it is not attributed to that consumer precedent.

## Revised result

- The homepage is a seven-node, eight-relationship top-to-bottom flow: canonical knowledge fans out to separate Human, Agent, and Graph nodes, and all three paths rejoin at Verification.
- The architecture authority view is a seven-node, six-relationship top-to-bottom flow: canonical knowledge fans out to the same three separately presented derived surfaces without adding a downstream authority stage.
- Both rendered surfaces are centred within the content rail at desktop and tablet widths through safe grid alignment; their Mermaid-native internal geometry and spacing are unchanged.
- Diagram-level `init`, `class`, `classDef`, `style`, and `linkStyle` directives are absent, so Mermaid supplies its native node treatment, spacing, padding, and `basis` routing.
- Every node uses the same rectangular geometry and every relationship uses an ordinary arrow.
- Accessible titles/descriptions, labels, topology, and adjacent explanatory prose preserve the material authority distinction without colour-dependent node styling. The three product boxes remain views over one shared corpus, not independent knowledge authorities.
- Optional semantic role support remains in the adapter for compatibility, but the reference diagrams do not opt into it.
- No node overlaps, connector/text intersections, or page overflow were detected. At 390px, the 410px native diagram width exceeds the 358px content rail by 52px and opens at the governed centred position of `scrollLeft: 26`; desktop and tablet widths need no contained scroll.

## Verification matrix

| Check | Result |
|---|---|
| Static native-default and topology contract | Pass |
| Desktop rendered fit | Pass |
| Tablet rendered fit | Pass |
| Fitting-surface centring | Pass |
| Mobile bounded centred containment | Pass — 52px within the 60px limit |
| Node-overlap probe | Pass |
| Connector/text collision probe | Pass |
| Accessibility metadata retained | Pass |
| In-app visual inspection | Pass |

The pinned runtime browser contract visits the homepage and architecture route at 1256px desktop, 768px tablet, and 390px mobile widths, and rejects an uncentred mobile diagram, more than 60px of contained overflow, or any page overflow.
