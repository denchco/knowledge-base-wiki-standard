# Design QA — Mermaid native-default reference treatment

Date: 2026-08-04  
Result: **Pass**

## Scope

- Standard homepage system overview.
- Standard architecture authority overview.
- Desktop, tablet, and mobile content widths in the pinned Zensical and Mermaid runtimes.

## Origin and classification

- Originating implementation: **Health IT Governance Beyond the NHS**, `docs/research/information-lifecycle.md` at immutable revision `c96d235c18094243b6493d8aa1c74a38d65eb947` (`SRC-019`).
- The observed local page had citation-only working-copy changes; its plain Mermaid diagram is unchanged from that immutable revision.
- Reuse classification: **Preferred** default for DenchCo entry and architecture diagrams under `DKBWS-DESIGN-001`.
- The comparator and this repository use the same effective Mermaid adapter. The visible difference therefore came from diagram-level initialization and semantic class opt-ins, not from a different runtime.

## Revised result

- Both diagrams remain five-node, four-relationship, top-to-bottom flows.
- Diagram-level `init`, `class`, `classDef`, `style`, and `linkStyle` directives are absent, so Mermaid supplies its native node treatment, spacing, padding, and `basis` routing.
- Every node uses the same rectangular geometry and every relationship uses an ordinary arrow.
- Accessible titles/descriptions, labels, topology, and adjacent explanatory prose preserve the material authority distinction without colour-dependent node styling.
- Optional semantic role support remains in the adapter for compatibility, but the reference diagrams do not opt into it.
- No node overlaps, connector/text intersections, displaced scrolling, or page overflow were detected.

## Verification matrix

| Check | Result |
|---|---|
| Static native-default and topology contract | Pass |
| Desktop rendered fit | Pass |
| Tablet rendered fit | Pass |
| Mobile rendered fit | Pass |
| Node-overlap probe | Pass |
| Connector/text collision probe | Pass |
| Accessibility metadata retained | Pass |
| In-app visual inspection | Pass |

The pinned runtime browser contract visits the homepage and architecture route at 1256px desktop, 768px tablet, and 390px mobile widths.
