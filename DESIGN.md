---
version: "0.1.0"
name: "DenchCo Knowledge Base Wiki Standard"
description: "Governed Zensical visual contract for the canonical standard wiki."
colors:
  primary: "#174A5B"
  accent: "#0B7285"
  accentDark: "#075866"
  accentLight: "#D9F0F3"
  background: "#F6F8F9"
  surface: "#FFFFFF"
  text: "#1F2933"
  muted: "#52606D"
  border: "#AAB7C0"
  focus: "#075866"
shape:
  componentRadius: ".35rem"
  diagramNodeRadius: "5px"
  componentBorderWidth: "1px"
  technicalFrameBorderWidth: "1.75px"
typography:
  body:
    fontFamily: "system-ui"
    fontSize: "1rem"
    lineHeight: "1.6"
---

# Design Contract

Zensical owns navigation, search, responsive chrome, typography, and the page outline. The DenchCo layer supplies a restrained teal accent family, semantic state separation, governed content components, diagrams, graph frames, and layout tokens.

## Required behaviour

- White header, neutral closed Search control, and dark header content.
- Accent reserved for links, focus, interaction, and current position.
- Rectangular components use named radii no greater than `.5rem`; pills are limited to compact status labels.
- Mermaid and evidence tables share compact-data typography where used together.
- Diagram edges, nodes, labels, arrowheads, and clusters inherit governed tokens.
- Standard and Wide layouts retain aligned content rails.
- Keyboard focus, contrast, narrow-screen overflow, and nonblank technical views are browser-verified.

The style is the first-class default, but topic information architecture and evidence structures must be rebuilt for each subject.
