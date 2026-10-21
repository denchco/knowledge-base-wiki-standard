---
type: Release Preparation
title: Reader defaults release preparation
description: Exact implementation inventory, publication boundaries and consumer migration checks.
status: draft
---

# Reader defaults release preparation

This record prepares `v0.1.0-rc.6` for Wide defaults, numeric superscript citations and complete conformance proof. It also accounts for earlier local changes that are absent from the published release. Publication is authorised; release inclusion is recorded only after the immutable release exists.

The owner authorised implementation, verification, a committed handoff and preparation of this package on 19 October 2026. On 20 October, the owner authorised patched Graphify qualification, protected publication, an immutable release and Documentation synchronization with live reader verification. Other consumer pins remain unchanged. The Standard-owned corrections extend `DKBWS-DESIGN-001`, `DKBWS-LINK-002` and `DKBWS-VERIFY-002`. The three consumer-derived mechanisms retain their original records and are accepted under decision `b0b5e8021a5a93feb767e486699ec7c524955da6`.

## Revision boundary

| Boundary | Exact identity | Meaning |
|---|---|---|
| Last observed remote main | `c836eb7184cb836193b229f68fe487e70e3e3bfc` | Protected acceptance publication; contains the three decisions, while the broader candidate implementation remains local |
| Current immutable release and Documentation pin | `fa805c78dfc9fae77b394e4ce3af980767e932c8` (`v0.1.0-rc.5`) | Existing release evidence; unchanged by this preparation |
| Starting local candidate | `281bb0785fed2fad36663b0866965c78e4a9a3ec` | Includes the four local integrations listed below; parent of this corrective work |
| Prepared implementation | Full `sourceRevision` in the generated package manifest | The clean committed revision containing this record and the verified implementation, not an inferred branch name |

After the turn commit, the generated package lives under `output/verification/reader-defaults-release-<full-sourceRevision>/`. Its manifest binds the full source revision, prior revision boundaries, canonical file hashes, verification evidence hashes, proposal identities and pending actions. It contains the migration guide and captured verification output. The package is disposable evidence; this record, source files and authoritative proposal records remain canonical. A new source change requires new verification and a newly bound package.

## Change inventory

| Change | Technical integration | Formal decision | Release | Consumer adoption |
|---|---|---|---|---|
| Native light/dark appearance | In remote main; reviewed correction `bfeaecc02098e2bcc75f14b09fa7f6179d783f9f` | Accepted reusable proposal in governed issue #7 and the Standard registry | Registry remains pending; outside rc.5 | Separate consumer decision; not implied |
| Security/updater maintenance and writing policy | In remote main through `d339a0e30de41c4a3260f22c00c96898299a1834` | Existing Standard changes and merged protected pull requests | Outside rc.5 | Existing pins retained |
| Configurable appearance mechanism | Local `dc14307508a24b170c7401f9469a1ee83115ec1f` | Accepted reusable contribution in governed issue #33 and the Standard registry | Pending | Not considered in originating record |
| Standard blue branding and wordmark | Local `31ee99b4c9c2da71e60c006d93a03f0e8ccff724` | Owner-requested Standard presentation change | Pending | Standard-specific branding; starter identity remains consumer-owned |
| Content-first development handoff | Local `a54fab364ea0ef98b6bf1a57fb3b399dae9952e4` | Accepted reusable contribution in governed issue #34 and the Standard registry | Pending | Not considered in originating record |
| Status-free navigation and `DKBWS-HUMAN-003` retirement | Local `281bb0785fed2fad36663b0866965c78e4a9a3ec` | Owner-requested Standard retirement; COPPER TIGER supplies precedent | Pending | Existing pins retained |
| Wide baseline and complete proof accounting | Current prepared implementation | Owner-requested Standard correction | Pending | Existing pins retained |
| Numeric superscript citations | Citation-specific implementation and repaired notes ported into the current prepared implementation | Required baseline in this candidate; accepted preferred contribution in governed issue #32 and the Standard registry | Pending | Not considered in originating record |

The native appearance revision above must agree with the registry. A source or registry difference invalidates the package inventory and must be reconciled before publication.

The [three-contribution intake review](proposal-intake-review.md) records the current acceptance scope and all three exact prepared public payloads.

## Consumer origins and completed intake

| Contribution | Authoritative record | Immutable origin and pin | Current formal state |
|---|---|---|---|
| Numeric citations | DShCR `standard-proposals/dshcr-numeric-source-citations.json`; preparation commit `f47c53dccd5873d83735316762d41ac5f0514d77` | Implementation `885700d67e3a408c08818747b601d857f3f40576`; Standard pin `4aae4d4efbcea526f28ec8bcbfaf203dae34bc25` | Exact payload approved; issue [#32](https://github.com/denchco/knowledge-base-wiki-standard/issues/32) linked; preferred acceptance recorded; release pending; adoption not considered |
| Configurable appearance | Thirlwall `standard-proposals/configurable-appearance-family.json`; preparation commit `136f7c47df1bd4c2a23417221f6272030e9c2733` | Implementation `0def10afdb6126508ec257321a39d8e5adc9b048`; Standard pin `d339a0e30de41c4a3260f22c00c96898299a1834` | Exact payload approved; issue [#33](https://github.com/denchco/knowledge-base-wiki-standard/issues/33) linked; reusable acceptance recorded; release pending; adoption not considered |
| Content-first handoff | Thirlwall `standard-proposals/content-first-development-next-steps.json`; preparation commit `3fd3eab7f1838da5f5a43b905e3d9e3e64647ea4` | Implementation `ad966d4e43b56931ea22db804c4fde10704d043b`; Standard pin `d339a0e30de41c4a3260f22c00c96898299a1834` | Exact payload approved; issue [#34](https://github.com/denchco/knowledge-base-wiki-standard/issues/34) linked; reusable acceptance recorded; release pending; adoption not considered |

The citation port preserves Standard implementation `a4172dee568500aabccbec5c4d8bb9c11381c397` and explanatory-note repair `91d4aaab8029de2dbc1e5bd96876b8032f03e96a` as its implementation history. It does not replace newer appearance, writing or navigation work with the old branch. [SRC-061](../sources.md#src-061)

On 19 October 2026, governed `check` and GET-only `sync --check` validated all three records and returned current with no diagnostics. The remote form matched each prepared form digest, no issue marker required linkage, and no pending contribution was reported accepted or released. The preserved `ced1ee1588ce3640b6c0a680b15f5dec4f2fdee7` archive retains those preparation-time results and payloads. The fresh post-acceptance package captures current record validation, exact rendered payloads and GET-only reconciliation against the published registry.

The owner subsequently approved all three exact reviewed payloads and delegated final submission through their governed forms on 19 October 2026. The originating records contain those approvals. The governed submissions and exact issue-linkage checks completed. The [acceptance publication](https://github.com/denchco/knowledge-base-wiki-standard/pull/35) records decision `b0b5e8021a5a93feb767e486699ec7c524955da6` and publishes the matching registry at `c836eb7184cb836193b229f68fe487e70e3e3bfc`. Consumer linkage and acceptance use separate JJ commits; release and adoption remain pending. Any payload or form edit invalidates approval. Preserve the original project record instead of creating another proposal for the same contribution. [The intake workflow](../llm-wiki/standard-proposals.md) defines the transitions.

The candidate replaces the affected Graphify `0.9.55` pin with `0.9.70` and requires the guarded reference indexing command. The qualification excludes external Fortran preprocessing. A patched dependency label alone does not qualify arbitrary input. Complete graph, browser, input-boundary and security checks must pass before publication. The earlier locked Python audit did not report `GHSA-pcc4-rvhr-2pr8`; that result did not clear the separate GitHub finding. See [STD-VAL-011](../validation-queue.md).

The candidate compatibility rule under `DKBWS-RELEASE-001` permits this pre-`1.0.0` release only with explicit incompatible-change and migration notes. `DKBWS-HUMAN-003` is retired; `DKBWS-HUMAN-001` requires status-free navigation; `DKBWS-DESIGN-001`, `DKBWS-LINK-002` and `DKBWS-VERIFY-002` change the defaults and required evidence. Existing release contracts remain intact.

## Publication and migration sequence

1. Review the exact generated package revision and its complete verification results. Confirm that negative proof fixtures reject incomplete receipts and that all-page citation checks and fresh-reader width checks pass.
2. Retain the completed issue-linkage and acceptance evidence against the reviewed integration. Reconcile the consumer records with the published registry; their accepted states do not establish release inclusion.
3. Publish the authorised candidate through the protected pull-request and verification process. Reconcile any later remote changes and verify the exact merged revision.
4. Publish the authorised immutable release, then record inclusion against a strictly later registry revision. Retain historical tags and source records.
5. Synchronise Documentation to that exact released revision and adapt its own renderer, width control, navigation override and verification. A snapshot update alone does not change those Documentation-owned files. Publish through its protected process and verify fresh-reader Wide, saved preferences and status-free navigation on the public Wiki.
6. For each authorised consumer, follow the [reader-defaults migration](../reference/reader-defaults-migration.md) and [navigation migration](../reference/navigation-status-migration.md). Verify its own content, saved preferences, source-row journeys and full selected profile before recording adoption.

The [current status](status.md) and [validation queue](../validation-queue.md) track the remaining bounded work. Dedicated MCP, deployment expansion and automatic upgrade application are not prerequisites for these reader defaults.
