---
type: Migration Guide
title: Status-free navigation migration
description: Retirement of DKBWS-HUMAN-003 and migration of the reference navigation adapter.
status: draft
---

# Status-free navigation migration

`DKBWS-HUMAN-003` is retired from the unreleased Standard on 19 October 2026. Its identifier remains reserved and must not be reused. Historical releases, changelog entries and source records retain their original meaning.

The Human Wiki default now omits lifecycle status from navigation under `DKBWS-HUMAN-001`. The reference adapter renders no status icon or tooltip, including generic fallback information icons. Source lifecycle metadata, page titles, section controls and navigation accessibility remain intact.

## Origin and scope

The owner requested this Standard retirement after COPPER TIGER's verified implementation at `e6ccef8ed7be1230a3cd0f9fc233fb97a4960831`. The inspected consumer commit removes draft artwork and tooltips, hides the renderer's draft fallback, and retains source metadata. It pins Standard revision `d339a0e30de41c4a3260f22c00c96898299a1834` and records the older conditional rule as not applicable. The supplied verification claim belongs to that consumer revision; it is not proof of this Standard change. [SRC-060](../sources.md#src-060)

This retirement applies to the Standard's active specifications, inherited profiles, reference adapter, starter, conformance checks and fixtures. The Standard uses a status-free default for all lifecycle values, including unmapped values. It does not copy COPPER TIGER's subject content or change its pin. The consumer implementation is supporting precedent, not a submitted proposal, release or adoption record.

## Consumer migration

Consumers keep their current pinned contract until they explicitly adopt a revision that contains this retirement. Consumers on older pins may still record the conditional rule as not applicable when their navigation omits draft status.

1. Review the exact old and proposed Standard revisions. Confirm that the profile diff removes `DKBWS-HUMAN-003`; do not renumber the remaining requirements.
2. Preserve lifecycle frontmatter and source-register metadata. Remove only navigation status presentation and its obsolete configuration, assets, design tokens, tooltip mappings and marker geometry checks.
3. For the Zensical reference adapter, carry `overrides/partials/nav-item.html` and set `project.theme.custom_dir = "overrides"`. Merge with an existing override directory instead of replacing unrelated customisations. Removing `project.extra.status` alone is insufficient: the renderer still emits a fallback icon for status metadata.
4. Remove the unused Pen Circle asset and its active licence inventory entry. Retain historical source and licence records where they document a previous release. The new navigation override carries the pinned Zensical template's MIT notice.
5. Remove `DKBWS-HUMAN-003` from active profile mappings, receipt generation and conformance fixtures. Retain old reports as historical evidence. Remove any obsolete local deviation only as part of the reviewed adoption.
6. Rebuild the Human Wiki and run the complete selected-profile verification. Check draft, stable, deprecated and unmapped lifecycle values at desktop and mobile widths. Confirm absent status markup and tooltips, readable titles, keyboard focus, working section controls and no page overflow.
7. Record the reviewed migration and verification in the consumer's own history. Change its Standard pin only under separate adoption authority.

The override derives from the exact Zensical `0.0.59` navigation template. It removes the status macro and its calls while retaining native title, section, index and table-of-contents logic. Template comparison fixtures detect upstream drift. A renderer upgrade requires a fresh comparison and browser qualification. [SRC-032](../sources.md#src-032)

## Verification and history boundary

The active requirement catalogue and selected-profile reports exclude the retired identifier. Revision-aware lifecycle fixtures still resolve older pins that included it and report its removal. Current dogfood comparison rows follow the active identifier catalogue. Their retained `DKBWS-HUMAN-001` findings cover only the historical build/URL scope and explicitly leave the new navigation behaviour unassessed. Original observations remain available in Git and released snapshots.

The reference checks verify absence of rendered status markup as well as preserved navigation behaviour. They do not certify every browser or assistive technology. The end-of-turn commit records the completed verification and any failed or unrun gate. This change does not publish a release, update the Documentation snapshot or authorise a consumer migration.

See the [retired requirement record](../spec/requirements.md#retired-requirements), [profile contract](../spec/profiles.md) and [candidate status](../project/status.md).
