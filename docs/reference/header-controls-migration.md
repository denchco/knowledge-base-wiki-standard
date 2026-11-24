---
type: Migration Guide
title: Shared header controls migration
description: Adopt the semantic header controls and their complete browser proof contract.
status: draft
---

# Shared header controls migration

`DKBWS-DESIGN-002` adds a common reference header to Standard Production. It is a reusable candidate for new-Wiki defaults and separately reviewed existing-Wiki migrations. The [promotion review](../project/header-controls-review.md) records the exact consumer origin and the distinct acceptance, release and adoption stages. [SRC-091](../sources.md#src-091)

## Required behaviour

Search, Wide, appearance controls and visible mobile menu/search actions have a `1.6rem` height and `.4rem` rounding. Icon-only controls are square. Do not frame logos as controls. Centre the actual SVG in each icon-only control on both axes within `.5` CSS pixels, even when icon sizes differ. Keep Wide's icon/text group centred with its SVG aligned vertically. Keep native hidden-label and responsive visibility rules.

Carry the shared resting, hover and pointer-down roles and the rules for all controls together. Replace legacy fixed hover colours with the Wiki’s own accent family. The unconfigured reference uses its blue palette. Wide uses bold text and `aria-pressed` for its persistent state. Remove any selected colour override, width-only shadow or inset stripe so it shares the same painted height and edges as every other action. Make the Search icon and shortcut follow the complete control state. Keep keyboard focus visible on a separate outline.

Search's magnifier and shortcut badge remain readable in every state. Normal text and the shortcut badge meet `4.5:1` contrast; meaningful icons and visible focus meet `3:1` against their adjacent background. Keep keyboard operation, search, width selection, appearance switching, reload/navigation and saved preferences intact. The bounded mobile adapter supplies keyboard semantics to the native menu/search labels without replacing their controllers.

For revisions containing the control-contrast update, carry `headerControlText`, the common fill-coloured border and the light and dark navigation selection roles. Test resting and selected fills against the header at 3:1. Use the same 1 CSS pixel border in the current fill colour for every action. Hover and pointer-down fills must also reach 3:1. Check each control at its actual surrounding colour. Keep the logo unframed. Check that current links in each sidebar share the same tint (at least 1.2:1 against the sidebar), have bold text at 4.5:1, and line up with ordinary links without an inline-start rail. The 1.2:1 tint threshold is a design choice.

### Reproducing a configured accent

Use the versioned `deriveAppearance` generator and test the final six-digit sRGB colours. When white contrasts more strongly with the header, the resting, hover and pointer-down fills start at OKLCH lightness 0.90, 0.82 and 0.75. Otherwise they start at 0.38, 0.46 and 0.53. Preserve the seed hue and cap chroma at 0.035, 0.055 and 0.075 respectively. Move lightness outwards until the rounded fill meets 4.10:1, 3.55:1 and 3.00:1 against the header. The generator selects a common ink that reaches 4.5:1 on all three fills. For seed `#32541c`, the three results are `#d4e4cd`, `#b5cda9` and `#9ab989`, with ink `#21291d`. Without a configured seed, use the scheme’s accent, dark-accent and darker-accent roles with the scheme’s accent-contrast ink.

## Complete migration

1. Select an accepted, published native-immutable Standard release that contains this change. Resolve its exact tag and full commit; require successful protected verification on that revision. The current rc.9 release does not contain this candidate. A branch, draft PR or older passing release is not the adoption target.
2. Inspect the target's renderer, profile, existing changes, branding, deviations and repository protection. Preserve consumer-owned content and unknown fields. Record a compatibility assessment for another renderer; do not apply Zensical selectors to it by assumption.
3. Carry the shared theme and width CSS, native Wiki keyboard adapter, appearance generator and preparer, design guidance and exact dependency closure together. Preserve the existing width and palette storage keys and native visibility. Remove superseded local header rules that would override the shared semantics, while retaining unrelated target styles.
4. Carry the header contract, negative fixtures, generic real-renderer fixture and browser runner. Add the gate to the target's complete verification command. Install both matching Chromium and WebKit binaries from its qualified Playwright version. Carry the package/CI commands and complete named-proof receipt mapping; source files alone cannot establish browser proof.
5. For a new Wiki, use the released starter's shared header default with its own branding and subject-empty content. Do not copy Standard or private consumer knowledge into the target. Starter entries remain a planning recipe until the complete target implementation is verified.
6. Regenerate declared derived assets. Run the complete selected-profile target verification, including fresh dependency audits, both-engine header tests and existing reader/appearance/runtime checks. In a maintenance workspace, run the read-only provenance check and commit the migration through Jujutsu.
7. Open a separate protected adoption PR for that Wiki. Record its exact Standard release pin, target commit, verification and compatibility result. After merge, record adoption separately from Standard acceptance and release inclusion. Deploy and verify the public site only when that target's authorised scope includes deployment.

## Browser evidence

Both engines must test both appearances, desktop and mobile, Standard and Wide, reload and navigation. Assert matching dimensions, opaque backgrounds, exact hover pairs including selected Wide, actual SVG centring, readable Search pseudo-elements, keyboard focus and accessible contrast. Deliberately broken geometry, opacity, hover, centring, visibility and contrast must fail the negative fixtures.

Exercise 200% rendered layout zoom, 200% text resize and 320 CSS pixel reflow. Record these exact methods rather than claiming native browser-chrome or operating-system zoom coverage. Preserve the existing reader tests so a passing header fixture cannot hide a search, navigation, preference or content regression.

The complete receipt needs `header-source`, `header-fixtures`, `browser-chromium`, `browser-webkit`, `browser-header-interaction` and `browser-header-reflow` for `DKBWS-DESIGN-002`. Missing proof must remain not checked. Older receipts remain historical and do not acquire these proofs automatically.

## Compatibility and rollout

The candidate adds a requirement to the pre-1.0 Standard Production profile. Earlier immutable releases keep their original contracts. Existing Wikis remain on their recorded pins until their own migration passes. The Standard's acceptance registry, immutable release and each consumer adoption record are separate authorities; neither an implementation merge nor a dependency label establishes adoption.
