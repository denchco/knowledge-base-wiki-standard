---
type: Release Preparation
title: Reader defaults release record
description: Exact implementation inventory, publication boundaries and consumer migration checks.
status: draft
---

# Reader defaults release record

This record documents immutable `v0.1.0-rc.6` at `8c134952dacfcd7a60c8da82d59aecb67117c512`, published on 21 October 2026. It includes Wide defaults, numeric superscript citations, status-free navigation and complete conformance proof, together with the earlier integrations below. The later registry records four accepted contributions as included. Documentation migration, protected deployment and public reader verification are complete for the recorded revision. [SRC-067](../sources.md#src-067), [SRC-069](../sources.md#src-069)

The owner authorised implementation, verification, a committed handoff and preparation of this package on 19 October 2026. On 20 October, the owner authorised patched Graphify qualification, protected publication, an immutable release and Documentation synchronization with live reader verification. Other consumer pins remain unchanged. The Standard-owned corrections extend `DKBWS-DESIGN-001`, `DKBWS-LINK-002` and `DKBWS-VERIFY-002`. The three consumer-derived mechanisms retain their original records and are accepted under decision `b0b5e8021a5a93feb767e486699ec7c524955da6`.

## Revision boundary

| Boundary | Exact identity | Meaning |
|---|---|---|
| Protected implementation publication and immutable release | `8c134952dacfcd7a60c8da82d59aecb67117c512` (`v0.1.0-rc.6`) | PR #38 merged the qualified implementation; exact-revision post-merge Verify passed; the public release is non-draft and immutable |
| Qualified implementation before merge | `65a10d97fd838faebf2f2ba4d6b10a7b82308006` | Complete maintainer verification and read-only provenance passed; its tree matches the release merge |
| Documentation migration merge | `4df1493c737b355b25c7846f40bb13b997f100c3`, pinned to Standard `8c134952dacfcd7a60c8da82d59aecb67117c512` | Protected PR #38 merged after successful local and pull-request verification; exact-merge Verify `39575448965` and Pages `39576050643` passed, with deployment complete at `2026-10-21T09:20:35Z`; the public runtime contract passed at `2026-10-21T09:23:50.756Z` |
| Starting local candidate | `281bb0785fed2fad36663b0866965c78e4a9a3ec` | Historical integration boundary before the reader-default corrections |
| Post-release registry | A separate later commit descending from `8c134952dacfcd7a60c8da82d59aecb67117c512` | Records inclusion after the immutable release; its exact committed identity is supplied by history |

The historical verification archives under `output/verification/reader-defaults-release-<full-sourceRevision>/` preserve their original revision, file and evidence hashes. They are disposable evidence, not public release assets or canonical knowledge. The release publishes only the inspected plugin, runtime inventory, public qualification manifest and checksums. A new source change requires fresh verification; historical receipts do not prove the later tree.

## Change inventory

| Change | Technical integration | Formal decision | Release | Consumer adoption |
|---|---|---|---|---|
| Native light/dark appearance | In remote main; reviewed correction `bfeaecc02098e2bcc75f14b09fa7f6179d783f9f` | Accepted reusable proposal in governed issue #7 and the Standard registry | Included in rc.6 | Separate consumer decision; not implied |
| Security/updater maintenance and writing policy | In remote main through `d339a0e30de41c4a3260f22c00c96898299a1834` | Existing Standard changes and merged protected pull requests | Included in rc.6 | Existing pins retained |
| Configurable appearance mechanism | Integrated from `dc14307508a24b170c7401f9469a1ee83115ec1f` | Accepted reusable contribution in governed issue #33 and the Standard registry | Included in rc.6 | Not considered in originating record |
| Standard blue branding and wordmark | Integrated from `31ee99b4c9c2da71e60c006d93a03f0e8ccff724` | Owner-requested Standard presentation change | Included in rc.6 | Standard-specific branding; starter identity remains consumer-owned |
| Content-first development handoff | Integrated from `a54fab364ea0ef98b6bf1a57fb3b399dae9952e4` | Accepted reusable contribution in governed issue #34 and the Standard registry | Included in rc.6 | Not considered in originating record |
| Status-free navigation and `DKBWS-HUMAN-003` retirement | Integrated from `281bb0785fed2fad36663b0866965c78e4a9a3ec` | Owner-requested Standard retirement; COPPER TIGER supplies precedent | Included in rc.6 | Existing pins retained |
| Wide baseline and complete proof accounting | Released implementation | Owner-requested Standard correction | Included in rc.6 | Existing pins retained |
| Numeric superscript citations | Citation-specific implementation and repaired notes ported into the released implementation | Required baseline in rc.6; accepted preferred contribution in governed issue #32 and the Standard registry | Included in rc.6 | Not considered in originating record |

The native appearance decision agrees with the registry. All four accepted decisions are ancestors of the release. Their immutable origins and decision evidence remain unchanged.

The [three-contribution intake review](proposal-intake-review.md) records the current acceptance scope and all three exact prepared public payloads.

## Consumer origins and completed intake

| Contribution | Authoritative record | Immutable origin and pin | Originating record state, unchanged by Standard publication |
|---|---|---|---|
| Numeric citations | DShCR `standard-proposals/dshcr-numeric-source-citations.json`; preparation commit `f47c53dccd5873d83735316762d41ac5f0514d77` | Implementation `885700d67e3a408c08818747b601d857f3f40576`; Standard pin `4aae4d4efbcea526f28ec8bcbfaf203dae34bc25` | Exact payload approved; issue [#32](https://github.com/denchco/knowledge-base-wiki-standard/issues/32) linked; preferred acceptance recorded; release pending; adoption not considered |
| Configurable appearance | Thirlwall `standard-proposals/configurable-appearance-family.json`; preparation commit `136f7c47df1bd4c2a23417221f6272030e9c2733` | Implementation `0def10afdb6126508ec257321a39d8e5adc9b048`; Standard pin `d339a0e30de41c4a3260f22c00c96898299a1834` | Exact payload approved; issue [#33](https://github.com/denchco/knowledge-base-wiki-standard/issues/33) linked; reusable acceptance recorded; release pending; adoption not considered |
| Content-first handoff | Thirlwall `standard-proposals/content-first-development-next-steps.json`; preparation commit `3fd3eab7f1838da5f5a43b905e3d9e3e64647ea4` | Implementation `ad966d4e43b56931ea22db804c4fde10704d043b`; Standard pin `d339a0e30de41c4a3260f22c00c96898299a1834` | Exact payload approved; issue [#34](https://github.com/denchco/knowledge-base-wiki-standard/issues/34) linked; reusable acceptance recorded; release pending; adoption not considered |

The citation port preserves Standard implementation `a4172dee568500aabccbec5c4d8bb9c11381c397` and explanatory-note repair `91d4aaab8029de2dbc1e5bd96876b8032f03e96a` as its implementation history. It does not replace newer appearance, writing or navigation work with the old branch. [SRC-061](../sources.md#src-061)

On 19 October 2026, governed `check` and GET-only `sync --check` validated all three records and returned current with no diagnostics. The remote form matched each prepared form digest, no issue marker required linkage, and no pending contribution was reported accepted or released. The preserved `ced1ee1588ce3640b6c0a680b15f5dec4f2fdee7` archive retains those preparation-time results and payloads. The post-acceptance package captured record validation, exact rendered payloads and GET-only reconciliation against the then-published acceptance registry. It does not establish current reconciliation against the later release ledger.

The owner subsequently approved all three exact reviewed payloads and delegated final submission through their governed forms on 19 October 2026. The originating records contain those approvals. The governed submissions and exact issue-linkage checks completed. The [acceptance publication](https://github.com/denchco/knowledge-base-wiki-standard/pull/35) records decision `b0b5e8021a5a93feb767e486699ec7c524955da6` and publishes the matching registry at `c836eb7184cb836193b229f68fe487e70e3e3bfc`. Consumer linkage and acceptance use separate JJ commits. The later Standard registry records rc.6 inclusion; the untouched originating records retain release pending and adoption not considered. Any payload or form edit invalidates approval. Preserve the original project record instead of creating another proposal for the same contribution. [The intake workflow](../llm-wiki/standard-proposals.md) defines the transitions.

The release replaces the affected Graphify `0.9.55` pin with `0.9.70` and requires the guarded reference indexing command. The qualification excludes external Fortran preprocessing. A patched dependency label alone does not qualify arbitrary input. Complete graph, browser, input-boundary and security checks passed before publication. Certifi `2026.10.19` and exact uv `0.13.4` passed the same release qualification. The earlier locked Python audit did not report `GHSA-pcc4-rvhr-2pr8`; that result did not clear the separate GitHub finding. See [STD-VAL-011](../validation-queue.md).

The candidate compatibility rule under `DKBWS-RELEASE-001` permits this pre-`1.0.0` release only with explicit incompatible-change and migration notes. `DKBWS-HUMAN-003` is retired; `DKBWS-HUMAN-001` requires status-free navigation; `DKBWS-DESIGN-001`, `DKBWS-LINK-002` and `DKBWS-VERIFY-002` change the defaults and required evidence. Existing release contracts remain intact.

## Publication and migration state

1. Complete maintainer verification, missing-proof fixtures, all-page citation checks and fresh-reader width checks passed for the qualified implementation.
2. Exact approved payloads, issue linkage and accepted decisions remain preserved. The new Standard release ledger does not update originating consumer records.
3. Protected PR #38 merged the implementation. Post-merge Verify passed on the exact released revision.
4. Public immutable rc.6 was published at `2026-10-21T09:01:13Z`. This later registry records inclusion without rewriting the release or prior tags.
5. Documentation merged at `4df1493c737b355b25c7846f40bb13b997f100c3` with its snapshot and declaration pinned to the exact released Standard revision. Its renderer, width control and navigation override passed local verification, protected CI, Pages deployment and the actual public runtime contract. The public proof covers fresh Wide, saved Standard/Wide choices across reload, navigation and mobile return, retained section controls and mobile keyboard source-row navigation. [SRC-069](../sources.md#src-069)
6. Each other consumer requires separate migration authority. Follow the [reader-defaults migration](../reference/reader-defaults-migration.md) and [navigation migration](../reference/navigation-status-migration.md), then verify its own content, saved preferences, source-row journeys and full selected profile before recording adoption.

The rc.6 audit retained two low-severity KaTeX/Mermaid-chain findings below the unchanged moderate failure threshold. That historical observation remains preserved. The owner has now authorised a bounded rc.7 qualification and publication pass. The candidate retains Mermaid `11.17.2` and selects exact KaTeX `0.18.2` through a scoped compatibility exception; its fresh audit reports zero findings and focused math/security checks pass. Complete qualification, protected publication and Documentation synchronization remain pending. PR #37's broader Mermaid 12 pair is not selected. [SRC-068](../sources.md#src-068), [SRC-070](../sources.md#src-070)

The [current status](status.md) and [validation queue](../validation-queue.md) track the remaining bounded work. Dedicated MCP, deployment expansion and automatic upgrade application are not prerequisites for these reader defaults.
