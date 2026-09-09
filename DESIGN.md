---
version: "0.1.0-candidate"
name: "DenchCo Knowledge Base Wiki Standard"
description: "Deterministic DenchCo visual and interaction contract for a production Zensical evidence-linked wiki."
colors:
  primary: "#174a5b"
  accent: "#0b7285"
  accentDark: "#075866"
  accentDarker: "#06444f"
  accentVisited: "#096777"
  accentLight: "#42a5b3"
  accentLightest: "#d9f0f3"
  accentTransparent: "rgb(11 114 133 / 10%)"
  accentTransparentStrong: "rgb(11 114 133 / 16%)"
  accentContrast: "#ffffff"
  background: "#f6f8f9"
  text: "#1f2933"
  muted: "#52606d"
  border: "#aab7c0"
  surface: "#ffffff"
  tableHeader: "#d9f0f3"
  link: "#0b7285"
  conditional: "#a15c00"
  success: "#007f3b"
  warning: "#d5281b"
  darkPrimary: "#dff6f7"
  darkAccent: "#66c5d1"
  darkAccentDark: "#8cdbe4"
  darkAccentDarker: "#c3f1f5"
  darkAccentVisited: "#9ed1d9"
  darkAccentLight: "#5db0bc"
  darkAccentLightest: "#16323a"
  darkAccentTransparent: "rgb(102 197 209 / 10%)"
  darkAccentTransparentStrong: "rgb(102 197 209 / 16%)"
  darkAccentContrast: "#111a1e"
  darkBackground: "#111a1e"
  darkSurface: "#18242a"
  darkText: "#e5eef1"
  darkMuted: "#b5c2c9"
  darkBorder: "#798f9a"
  darkFocus: "#8cdbe4"
  darkFocusContrast: "#111a1e"
  darkConditional: "#edbc74"
  darkSuccess: "#90d7aa"
  darkWarning: "#ffa69e"
typography:
  body:
    fontFamily: "system-ui"
    fontSize: "1rem"
    lineHeight: "1.6"
  heading:
    fontFamily: "system-ui"
    fontWeight: "700"
    lineHeight: "1.25"
rounded:
  sm: ".2rem"
  md: ".35rem"
  lg: ".5rem"
shape:
  componentRadius: ".35rem"
  componentRadiusSmall: ".2rem"
  componentRadiusLarge: ".5rem"
  diagramNodeRadius: "5px"
  diagramEmphasisLineWidth: "3px"
  diagramLabelMaskWidth: "4px"
  componentBorderWidth: "1px"
  technicalFrameBorderWidth: "1.75px"
  headerTitleContentRailOffset: "10.5rem"
  sourceRowRailWidth: ".25rem"
  accentRailWidth: ".3rem"
  layoutWidthControlContentRailOffset: "2rem"
  listMarkerIndent: "1.2rem"
  listMarkerSize: "1em"
  compactDataFontSize: ".64rem"
  diagramTextSize: ".64rem"
  sequentialMenuRailWidth: "1.5px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  draftStatusIconSize: ".9rem"
components:
  page:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
  link:
    textColor: "{colors.link}"
  link-active:
    textColor: "{colors.accentDarker}"
  link-visited:
    textColor: "{colors.accentVisited}"
  highlight-subtle:
    backgroundColor: "{colors.accentLightest}"
  interactive-rest:
    backgroundColor: "{colors.accentTransparent}"
  interactive-selected:
    backgroundColor: "{colors.accentTransparentStrong}"
  accent-on-color:
    textColor: "{colors.accentContrast}"
  status-conditional:
    textColor: "{colors.conditional}"
  status-success:
    textColor: "{colors.success}"
  status-warning:
    textColor: "{colors.warning}"
  status-draft:
    size: "{spacing.draftStatusIconSize}"
  table-header:
    backgroundColor: "{colors.tableHeader}"
    textColor: "{colors.text}"
  navigation-active:
    textColor: "{colors.accentDark}"
    backgroundColor: "{colors.tableHeader}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
  button-primary-hover:
    backgroundColor: "{colors.accentDark}"
    textColor: "{colors.surface}"
  focus-ring:
    backgroundColor: "{colors.accentDark}"
  muted-text:
    textColor: "{colors.muted}"
  governing-question:
    textColor: "{colors.accent}"
  bordered-panel:
    backgroundColor: "{colors.border}"
  diagram-boundary:
    backgroundColor: "{colors.accentLight}"
  header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
  search-button:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
  dark-page:
    backgroundColor: "{colors.darkBackground}"
    textColor: "{colors.darkText}"
  dark-link:
    textColor: "{colors.darkAccent}"
  dark-link-active:
    textColor: "{colors.darkAccentDarker}"
  dark-link-visited:
    textColor: "{colors.darkAccentVisited}"
  dark-highlight-subtle:
    backgroundColor: "{colors.darkAccentLightest}"
  dark-interactive-rest:
    backgroundColor: "{colors.darkAccentTransparent}"
  dark-interactive-selected:
    backgroundColor: "{colors.darkAccentTransparentStrong}"
  dark-accent-on-color:
    textColor: "{colors.darkAccentContrast}"
  dark-status-conditional:
    textColor: "{colors.darkConditional}"
  dark-status-success:
    textColor: "{colors.darkSuccess}"
  dark-status-warning:
    textColor: "{colors.darkWarning}"
  dark-status-draft:
    size: "{spacing.draftStatusIconSize}"
  dark-table-header:
    backgroundColor: "{colors.darkAccentLightest}"
    textColor: "{colors.darkText}"
  dark-navigation-active:
    textColor: "{colors.darkAccentDark}"
    backgroundColor: "{colors.darkAccentLightest}"
  dark-button-primary:
    backgroundColor: "{colors.darkAccent}"
    textColor: "{colors.darkAccentContrast}"
  dark-button-primary-hover:
    backgroundColor: "{colors.darkAccentDark}"
    textColor: "{colors.darkAccentContrast}"
  dark-focus-ring:
    backgroundColor: "{colors.darkAccentDark}"
  dark-muted-text:
    textColor: "{colors.darkMuted}"
  dark-governing-question:
    textColor: "{colors.darkAccent}"
  dark-bordered-panel:
    backgroundColor: "{colors.darkBorder}"
  dark-diagram-boundary:
    backgroundColor: "{colors.darkAccentLight}"
  dark-header:
    backgroundColor: "{colors.darkSurface}"
    textColor: "{colors.darkText}"
  dark-search-button:
    backgroundColor: "{colors.darkBackground}"
    textColor: "{colors.darkText}"
  dark-brand:
    textColor: "{colors.darkPrimary}"
  dark-focus-indicator:
    backgroundColor: "{colors.darkFocus}"
    textColor: "{colors.darkFocusContrast}"
---

# Design Contract

This is the deterministic DenchCo reference shell consolidated from the mature Regulation 28, NHS Data Sharing, Risk Appetite, Palantir, and EPMA scaffold implementations. Zensical owns the production header, native appearance selection, navigation, search, responsive drawers, typography, and page outline. DenchCo assets add governed tokens, content components, Graphify presentation, and the Standard/Wide preference.

The shell may look identical across topics. The topic's reader model, navigation labels, source schema, evidence records, synthesis, and generated views must be rebuilt from the new subject rather than copied from a reference corpus.

## Token Contract

- `accentDark`, `accentDarker`, `accentVisited`, `accentLight`, `accentLightest`, `accentTransparent`, `accentTransparentStrong`, and `accentContrast` form one complete, replaceable accent family.
- `conditional`, `success`, and `warning` are semantic states, not alternate brand colours.
- `componentRadiusSmall`, `componentRadius`, and `componentRadiusLarge` bound rectangular corners at `.2rem`, `.35rem`, and `.5rem`.
- `diagramNodeRadius` governs Mermaid boxes; `diagramEmphasisLineWidth` distinguishes an explicitly stronger authoritative relationship from ordinary technical lines; `diagramLabelMaskWidth` is a downstream legibility fallback and never makes a line routed through text acceptable.
- `componentBorderWidth`, `technicalFrameBorderWidth`, `sourceRowRailWidth`, and `accentRailWidth` govern every visible line. The Graphify pane rail is `1.75px`; the iframe inside it is borderless.
- `layoutWidthControlContentRailOffset` right-aligns the Standard/Wide control with the central body/content rail.
- `headerTitleContentRailOffset` aligns the visible desktop title with that body/content rail without embedding a raw geometry value in the selector.
- `listMarkerIndent` puts a body-scale square marker on the body-text rail; `listMarkerSize` keeps the marker visually equal to its list text.
- `compactDataFontSize` and `diagramTextSize` keep Mermaid labels at the same reduced scale as tables.
- `sequentialMenuRailWidth` governs the quiet grey in-page progress menu; only the active section takes the accent.
- Full pill radii are reserved for compact status labels.
- Diagram text follows reduced table text sizing; ordinary body copy remains the renderer baseline.

The DenchCo standard wiki keeps this teal family. A conforming derived wiki may replace the complete accent family in this file and `docs/assets/theme.css`, then regenerate Graphify so 2D and 3D interactions inherit it. Do not alter Zensical chrome structure to create a topic identity.

## Appearance

The reference adapter offers native Zensical light (`default`) and dark (`slate`) palettes. Light remains the initial Standard appearance; a consumer may choose another initial palette and records that choice here. The native sun/moon control sits immediately before Wide, names the action it performs, retains keyboard focus and remains visible on mobile when Wide is hidden. Zensical owns the saved preference and its navigation/reload behaviour; do not add a competing storage key or appearance controller.

The unprefixed `colors` tokens define the light family; `dark`-prefixed tokens in the same supported map define the dark family. Surface, foreground, accent, visited, focus and status roles must remain legible in both appearances. Recompute renderer and width-control aliases on the scheme-bearing body, rather than inheriting colours already resolved on `:root`. Verify at least 4.5:1 for normal text and 3:1 for non-text interactive boundaries, including translucent selected states. Graph search and unchecked filters use the focus colour for an explicit interactive boundary; the quieter border colour remains decorative.

Mermaid keeps its ordinary source-level node treatment and semantic roles; shared theme variables maintain label, connector and marker contrast. Both graph views inherit a same-origin parent's native scheme, or use the saved native preference and configured initial palette when opened directly. Graph appearance changes update colours in place and preserve selection and camera position. A graph colour remains a navigation aid, never new evidence.

Verify both appearances at desktop and mobile widths, control order, keyboard operation, persistence after navigation and reload, search readability, diagrams, both graph views and no page overflow. Adopting this adapter is an explicit consumer change: add the two native palettes, complete named colour families, graph bridge assets and browser assertions together. It changes no source identity, knowledge content, deployment or consumer pin automatically.

## Content And Navigation

- Use one governing question and answer-first routes when the topic is a decision, comparison, compliance, purchase, build, migration, or operational interpretation.
- Mark every displayed governing-question callout as `governing-question`; render both its inline-start rail and all question text in the active accent colour at every supported viewport. When the Wiki declares one canonical question, use that governed component for every verbatim repetition in its bounded reader set. Keep paraphrases and unrelated quotations neutral.
- Keep entry pages concise and route to canonical detail.
- Use square list markers aligned to the body-text rail, restrained sequential navigation, contextual links, and stable source-row anchors.
- Render every displayed `SRC-NNN` as an independently focusable internal link to its exact source-register row while preserving the visible `[SRC-NNN]` grammar. Lists keep separate link targets and compact ranges link their displayed endpoints. Do not suppress the native focus indication or make brackets the only accessible label.
- When primary navigation exposes a page's `draft` status, use the registered Pen Circle edit marker with the native “Draft — research in progress” tooltip. In the Zensical reference adapter its trailing centre aligns with the stock nested-navigation chevron column; stable or deprecated states retain their own semantics and artwork.
- Do not rely on navigation alone for discoverability; canonical pages need contextual inbound links and LLM routing links.
- Avoid marketing heroes, nested cards, decorative panels, and prose that overstates evidence.
- Tables, Mermaid diagrams, and Graphify frames use named border and radius tokens only.
- Canonical Mermaid diagrams begin with Mermaid's ordinary node treatment. Do not add diagram-level `init`, `class`, `classDef`, `style`, or `linkStyle` directives merely to restyle ordinary entry or architecture nodes; labels, order, accessible descriptions, and adjacent prose carry their authority semantics. The existing `kb-source`, `kb-evidence`, `kb-snapshot`, `kb-normative`, `kb-canonical`, `kb-product`, `kb-derived`, `kb-consumer`, and `kb-verification` grammar remains an optional compatibility mechanism when a material distinction genuinely requires visual reinforcement. It is not the default and may never be the only carrier of meaning.
- Canonical entry and architecture diagrams use one top-to-bottom reading direction, Mermaid's native `basis` connectors, consistent rectangular node geometry, ordinary arrows, and no edge labels. Other reference diagrams use no more than five nodes and five visible relationships. The single bounded three-product fan-out may use up to seven nodes and eight visible relationships and counts as one coordinated branch group. Reference diagrams inherit the renderer's node, rank, and padding defaults. Only bounded overrides proven necessary to fit the content rail or preserve legibility may depart from those defaults, and the reason must be recorded. The reference Human, Agent, and Graph fan-out uses exactly `flowchart.nodeSpacing: 40` because the renderer's 50px default exceeds the governed mobile ceiling under Linux Chromium text metrics; no other diagram-level initialization is permitted on those canonical diagrams. Put finer distinctions in nearby prose or a separate diagram.
- When Human, Agent, and Graph surfaces are all shown, use three separately labelled sibling boxes, each reached directly from canonical knowledge. Where verification follows, each path rejoins it. Their visual separation does not make them separate canonical corpora or evidence authorities.
- No connector may intersect a node label or cluster title, and nodes may not overlap. Prefer cluster-free flows on narrow content rails; use a subgraph only when nesting is itself material and rendered checks prove its title and contents remain clear.
- Canonical diagrams preserve accessible titles/descriptions and material path order while fitting the content rail at desktop, tablet, and mobile widths. The diagram surface is centred within the content rail whenever its intrinsic width fits. Contained scrolling is a downstream fallback, not a simplification target. After labels have been shortened and the exact bounded 40px three-product node spacing applied, the branch may exceed the 390px reference content rail by no more than 60px; safe centring falls back to start alignment for the oversized surface, the pane opens at its horizontal centre, and no page overflow is created.
- The production header remains on the restrained surface/text treatment and the search button remains neutral; interaction states alone take the accent.
- Mermaid `11.17.2`, vis-network `10.1.2`, and 3d-force-graph `1.80.0` are local
  production dependencies. `prepare:runtime` publishes their browser bundles
  before Zensical starts, and `mermaid-adapter.js` injects
  the governed radius, text, and line tokens into Zensical's closed diagram
  shadow root. Outer-page Mermaid selectors and the renderer CDN fallback are
  not accepted as the production implementation.

## Production Boundary

- Renderer: exactly pinned Zensical production in `pyproject.toml` and `uv.lock`.
- Diagram and graph runtimes: exactly pinned local Mermaid, vis-network, and
  3d-force-graph packages in `package-lock.json`; no public-CDN fallback is part
  of the production contract.
- Hosting: no deployment adapter is selected in this candidate; hosting remains separate from the portable knowledge contract.
- Source control: Git interoperability plus local JJ phase provenance; GitHub publication is a separate release action.
- Material for MkDocs is absent from this production path; an existing-project compatibility adapter may preserve it without changing the Zensical-first reference.
- Verification covers strict build, deterministic tokens, generated artifacts,
  Graphify 2D/3D and six relationship layers, local browser runtimes, Playwright
  `1.63.0` rendered desktop/mobile geometry, pixel checks, controls, overflow,
  and public-CDN exclusion. Deployment and public HTTP health are separate
  release-adapter gates.
