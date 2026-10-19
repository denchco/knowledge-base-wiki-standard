---
type: Release Preparation
title: Reader defaults release preparation
description: Exact implementation inventory, publication boundaries and consumer migration checks.
status: draft
---

# Reader defaults release preparation

This record prepares one reviewable candidate for Wide defaults, numeric superscript citations and complete conformance proof. It also accounts for earlier local changes that are absent from the published release. It does not record a new release or consumer adoption.

The owner authorised implementation, verification, a committed handoff and preparation of this package on 19 October 2026. The Standard-owned corrections extend `DKBWS-DESIGN-001`, `DKBWS-LINK-002` and `DKBWS-VERIFY-002`. Consumer-derived mechanisms retain their original proposal records and pending formal states.

## Revision boundary

| Boundary | Exact identity | Meaning |
|---|---|---|
| Last observed remote main | `d339a0e30de41c4a3260f22c00c96898299a1834` | Read through `git ls-remote` on 19 October 2026; contains the merged October maintenance and writing policy |
| Current immutable release and Documentation pin | `fa805c78dfc9fae77b394e4ce3af980767e932c8` (`v0.1.0-rc.5`) | Existing release evidence; unchanged by this preparation |
| Starting local candidate | `281bb0785fed2fad36663b0866965c78e4a9a3ec` | Includes the four local integrations listed below; parent of this corrective work |
| Prepared implementation | Full `sourceRevision` in the generated package manifest | The clean committed revision containing this record and the verified implementation, not an inferred branch name |

After the turn commit, the generated package lives under `output/verification/reader-defaults-release-<full-sourceRevision>/`. Its manifest binds the full source revision, prior revision boundaries, canonical file hashes, verification evidence hashes, proposal identities and pending actions. It contains the migration guide and captured verification output. The package is disposable evidence; this record, source files and authoritative proposal records remain canonical. A new source change requires new verification and a newly bound package.

## Change inventory

| Change | Technical integration | Formal decision | Release | Consumer adoption |
|---|---|---|---|---|
| Native light/dark appearance | In remote main; reviewed correction `bfeaecc02098e2bcc75f14b09fa7f6179d783f9f` | Accepted reusable proposal in governed issue #7 and the Standard registry | Registry remains pending; outside rc.5 | Separate consumer decision; not implied |
| Security/updater maintenance and writing policy | In remote main through `d339a0e30de41c4a3260f22c00c96898299a1834` | Existing Standard changes and merged protected pull requests | Outside rc.5 | Existing pins retained |
| Configurable appearance mechanism | Local `dc14307508a24b170c7401f9469a1ee83115ec1f` | Reusable technical recommendation; governed proposal decision pending | Pending | Not considered in originating record |
| Standard blue branding and wordmark | Local `31ee99b4c9c2da71e60c006d93a03f0e8ccff724` | Owner-requested Standard presentation change | Pending | Standard-specific branding; starter identity remains consumer-owned |
| Content-first development handoff | Local `a54fab364ea0ef98b6bf1a57fb3b399dae9952e4` | Governed consumer proposal decision pending | Pending | Not considered in originating record |
| Status-free navigation and `DKBWS-HUMAN-003` retirement | Local `281bb0785fed2fad36663b0866965c78e4a9a3ec` | Owner-requested Standard retirement; COPPER TIGER supplies precedent | Pending | Existing pins retained |
| Wide baseline and complete proof accounting | Current prepared implementation | Owner-requested Standard correction | Pending | Existing pins retained |
| Numeric superscript citations | Citation-specific implementation and repaired notes ported into the current prepared implementation | Required baseline in this candidate; originating consumer proposal remains decision-pending | Pending | Not considered in originating record |

The native appearance revision above must agree with the registry. A source or registry difference invalidates the package inventory and must be reconciled before publication.

## Consumer origins and pending intake

| Contribution | Authoritative record | Immutable origin and pin | Remaining formal state |
|---|---|---|---|
| Numeric citations | DShCR `standard-proposals/dshcr-numeric-source-citations.json`; record commit `f47c53dccd5873d83735316762d41ac5f0514d77` | Implementation `885700d67e3a408c08818747b601d857f3f40576`; Standard pin `4aae4d4efbcea526f28ec8bcbfaf203dae34bc25` | Payload prepared; exact-payload approval pending; issue not submitted; decision and release pending; adoption not considered |
| Configurable appearance | Thirlwall `standard-proposals/configurable-appearance-family.json`; record commit `136f7c47df1bd4c2a23417221f6272030e9c2733` | Implementation `0def10afdb6126508ec257321a39d8e5adc9b048`; Standard pin `d339a0e30de41c4a3260f22c00c96898299a1834` | Payload prepared; exact-payload approval pending; issue not submitted; decision and release pending; adoption not considered |
| Content-first handoff | Thirlwall `standard-proposals/content-first-development-next-steps.json`; record commit `3fd3eab7f1838da5f5a43b905e3d9e3e64647ea4` | Implementation `ad966d4e43b56931ea22db804c4fde10704d043b`; Standard pin `d339a0e30de41c4a3260f22c00c96898299a1834` | Payload prepared; exact-payload approval pending; issue not submitted; decision and release pending; adoption not considered |

The citation port preserves Standard implementation `a4172dee568500aabccbec5c4d8bb9c11381c397` and explanatory-note repair `91d4aaab8029de2dbc1e5bd96876b8032f03e96a` as its implementation history. It does not replace newer appearance, writing or navigation work with the old branch. [SRC-061](../sources.md#src-061)

On 19 October 2026, governed `check` and GET-only `sync --check` validated all three records and returned current with no diagnostics. The remote form matched each prepared form digest, no issue marker required linkage, and no pending contribution was reported accepted or released. The generated package retains these read-only results and the exact rendered payloads for review.

Existing payload approvals cannot be inferred from this implementation request. Reconcile each exact prepared payload and any changed proposal scope before a governed submission. Preserve the original project record instead of creating another proposal for the same contribution. [The intake workflow](../llm-wiki/standard-proposals.md) defines the transitions.

## Publication and migration sequence

1. Review the exact generated package revision and its complete verification results. Confirm that negative proof fixtures reject incomplete receipts and that all-page citation checks and fresh-reader width checks pass.
2. Complete the pending governed proposal decisions against the reviewed integration. Record issue linkage and decisions as separate provenance phases. No proposal may be reported accepted merely because its code is present.
3. Publish the chosen candidate through the protected pull-request and verification process when authorised. Reconcile any later remote changes and verify the exact merged revision.
4. Publish a separately authorised immutable release, then record inclusion against a strictly later registry revision. Retain historical tags and source records.
5. Synchronise Documentation to that exact released revision and verify its snapshot and reader presentation. A prepared local package does not change the live Documentation pin.
6. For each authorised consumer, follow the [reader-defaults migration](../reference/reader-defaults-migration.md) and [navigation migration](../reference/navigation-status-migration.md). Verify its own content, saved preferences, source-row journeys and full selected profile before recording adoption.

The [current status](status.md) and [validation queue](../validation-queue.md) track the remaining bounded work. Dedicated MCP, deployment expansion and automatic upgrade application are not prerequisites for these reader defaults.
