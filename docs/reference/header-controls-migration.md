---
type: Migration Guide
title: Shared header controls migration
description: Adopt the semantic header controls and their complete browser proof contract.
status: draft
---

# Shared header controls migration

`DKBWS-DESIGN-002` adds a common reference header to Standard Production. It is a reusable candidate for new-Wiki defaults and separately reviewed existing-Wiki migrations. The [promotion review](../project/header-controls-review.md) records the exact consumer origin and the distinct acceptance, release and adoption stages. [SRC-090](../sources.md#src-090)

## Required behaviour

Search, Wide, appearance controls and visible mobile menu/search actions have a `1.6rem` height and `.4rem` rounding. Icon-only controls are square. Do not frame logos as controls. Centre the actual SVG in each icon-only control on both axes within `.5` CSS pixels, even when icon sizes differ. Keep Wide's icon/text group centred with its SVG aligned vertically. Keep native hidden-label and responsive visibility rules.

Use semantic opaque surfaces for rest, hover and selected states. Preserve the Wiki's brand, header and native palette configuration. Hover uses background `#aaa08d` with foreground `#29251f` in light appearance, and background `#948774` with foreground `#201c17` in dark appearance. Selected Wide uses the same hover pair. Change foreground and background together without an intervening low-contrast crossfade.

Search's magnifier and shortcut badge remain readable in every state. Normal text and the shortcut badge meet `4.5:1` contrast; meaningful icons and visible focus meet `3:1` against their adjacent background. Keep keyboard operation, search, width selection, appearance switching, reload/navigation and saved preferences intact. The bounded mobile adapter supplies keyboard semantics to the native menu/search labels without replacing their controllers.

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
