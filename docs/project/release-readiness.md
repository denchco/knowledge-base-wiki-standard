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

## rc.7 math dependency follow-up

The rc.6 audit retained two low-severity KaTeX/Mermaid-chain findings. That historical observation remains preserved. The owner authorised this bounded follow-up on 21 October 2026. Immutable `v0.1.0-rc.7` at `5de406bfee155993308cd789dc4eacae7e49f5de` retains Mermaid `11.17.2` and qualifies exact KaTeX `0.18.2` through the scoped compatibility exception. The fresh npm audit reports zero findings. Complete maintainer verification, read-only provenance, protected PR #40 and exact-revision post-merge Verify `39589261838` passed. Public release `419462084` was read back non-draft and immutable at the exact tag. PR #37's broader Mermaid 12 pair was not selected. [SRC-068](../sources.md#src-068), [SRC-070](../sources.md#src-070), [SRC-071](../sources.md#src-071)

Documentation adopted that exact release through protected PR #39 at `701b21a557636af6038566a7db7bff68764ff17a`. Exact-merge Verify `39591626389` and Pages `39592191890` passed; deployment completed at `2026-10-21T11:29:23Z`. Actual public browser proof at `2026-10-21T11:32:18.004Z` confirms the reader defaults and source navigation, plus accessible native MathML, inert untrusted commands and no external math requests. Earlier releases, the proposal registry and other consumer pins remain unchanged. [SRC-072](../sources.md#src-072)

The [current status](status.md) and [validation queue](../validation-queue.md) record completion and the conditions for reopening a supported gap. Dedicated MCP, deployment expansion and automatic upgrade application are not prerequisites for these reader defaults.

## rc.8 sanitizer dependency follow-up

The owner authorised protected publication of the qualified DOMPurify patch on 23 October 2026, explicitly retaining Documentation and all other consumer pins. Immutable `v0.1.0-rc.8` resolves to `e4814a0715481edbba56189e34e93a3d76d88421`. Protected PR #42 carries qualified implementation `e057591c8a8cb5f25d788f9db16b1e1e60997411`; its tree matches the release merge. Pull-request Verify and Dependency Review passed, followed by push/main Verify `39932360257` on the exact release revision. Public release `421678175`, published at `2026-10-23T09:51:15Z`, was read back non-draft and immutable. All five downloaded assets match the reviewed package. [SRC-077](../sources.md#src-077)

The release selects exact DOMPurify `3.4.17`, retaining Mermaid `11.17.2` and KaTeX `0.18.2`. The runtime metafile and CycloneDX inventory bind the exact sanitizer source, version and integrity to the package lock. The public qualification records a fresh zero-finding npm audit of that lock. The earlier inert differential probes cover four affected behaviours and ordinary SVG controls; they do not establish Wiki exploitability or general sanitizer safety. [SRC-073](../sources.md#src-073), [SRC-074](../sources.md#src-074), [SRC-075](../sources.md#src-075), [SRC-076](../sources.md#src-076)

Migration requires the direct pin, frozen lock, runtime builder, entry guard and regression fixtures together. Reinstall with `npm ci`, regenerate runtime and graph assets, and run complete selected-profile verification. Earlier immutable releases and the proposal registry retain their recorded state. Documentation remains at its recorded rc.7 revision; this publication performs no consumer migration, pin change or deployment.

## rc.8 Documentation adoption after separate authorisation

The owner subsequently authorised Documentation migration, protected publication and public-site proof. The historical migration and deployment are separate from the Standard publication above, which left all consumer pins unchanged. The current tooling-audit failure is recorded below. Documentation adopted the exact immutable rc.8 revision `e4814a0715481edbba56189e34e93a3d76d88421`. Its clean 283-file snapshot has digest `7a4e80f69656660502ec08a1474e24b3ecf4671396037d047f318d4943f69d10`. The Standard release, proposal registry and other consumer pins retain their recorded state. [SRC-078](../sources.md#src-078)

| Evidence | Recorded result |
|---|---|
| Local qualification | Complete Documentation maintainer verification and the separate read-only provenance check passed before the 23 October migration commit. This is historical evidence, not a current full-verification pass. |
| Protected migration | PR #40 merged at `6e47505624731e52dcaa5abe058190f4c1c75548` after required `verify` and `standard-snapshot` checks passed. |
| Exact-merge Verify | Run `39982006293`, attempt `1`, completed successfully for push/main at the exact Documentation merge. |
| Protected Pages | Run `39982662370`, attempt `1`, completed successfully for that same revision; deployment `7282734010` completed at `2026-10-23T15:58:51Z`. |
| Public readback | Observed at `2026-10-26T06:57:53.914Z`; public-proof artifact SHA-256 `92b105f86690cb6f600aedfebb33418c7dfb3f2508572cf15cf44bd21f304b64`. |

The actual public runtime bytes match the exact Documentation rebuild. The rebuilt Mermaid runtime metadata and CycloneDX inventory identify one DOMPurify `3.4.17` implementation with retained Mermaid `11.17.2` and KaTeX `0.18.2`. The public reference declaration identifies the exact release and snapshot digest. Public graph identity binds the Documentation revision; every published schema matches the released snapshot bytes.

Public browser verification passed the reader defaults, saved width and palette choices, status-free navigation, mobile keyboard source-row navigation and numeric citations. Native MathML passed at desktop and mobile widths; untrusted math commands remained inert and made no external requests. Public artifact checks retained the governed branding and tested the declared omissions across published routes, Markdown alternatives, discovery, search and graph content. These observations establish this deployment at the recorded time, not continuous availability or general sanitizer safety. [SRC-078](../sources.md#src-078)

### Historical verification failure observed on 26 October

The saved post-merge Documentation full-verification attempt failed in `check` at the npm audit gate. The failure was read back on 26 October; the readback does not establish that run’s date. Subsequent gates are not proved by that attempt. Fresh audits of both current locks on 26 October independently return exit 1, with one moderate and two high package findings. The recorded successful 23 October Verify and Pages runs remain historical deployment evidence. The public browser proof above is a separate check and does not clear the failing tooling gate. [SRC-079](../sources.md#src-079)

At that checkpoint, fast-uri `3.1.9` still required qualification, and the reviewed Zod fix lay outside the validator's declared range. Changing only the npm lock could not replace its embedded Zod `3.25.76` bytes. The later rc.9 record below closes the scoped repair without rewriting this failed attempt or the earlier deployment. [STD-VAL-014](../validation-queue.md) records the exact closure evidence.

## rc.9 frozen-stack release and Documentation adoption

Protected PR #50 publishes immutable `v0.1.0-rc.9` at `8800e139d73fd58ee1bd756d3e5497f62ed678e4`, carrying the frozen-stack lifecycle and four tooling repairs. Qualified head `fbe0816ec00c4a7a720cc6be3096b88ebbc49c63` passes complete maintainer verification; its tree equals the release. Protected head checks, exact-merge Verify `40606700715`, immutable publication and five-asset readback pass. Documentation adopts that exact release through PR #45 at `25d72256aa29abd6039095e1fbca3c2363d234e8`. Complete target verification, Verify `40609554287`, Pages `40610127257` and public proof at `2026-10-28T00:44:32.106Z` pass. Other Wikis retain their pins. [SRC-088](../sources.md#src-088), [SRC-089](../sources.md#src-089)

Public release `426128023` was published at `2026-10-28T00:16:57Z`. The qualification manifest SHA-256 is `a09fda24db0dee8813862c099a8f2b0d64531003b13f72b40924293b3b5a0d27`; the downloaded-asset readback SHA-256 is `8a4faa53b5cff475b7a4996a31870b00640d6e86e5375a6719e8917453317d30`. The package binds zero npm findings at `2026-10-28T00:15:27Z` and zero installed-Python findings at `2026-10-28T00:15:31Z` to the exact release locks and applicable Python environment. These observations are dated; they do not clear future advisories. [SRC-088](../sources.md#src-088)

| Released change | Applicable requirements | Evidence |
|---|---|---|
| First builds select the latest verified immutable stack; existing Wikis check availability without mutation | `DKBWS-PROMPT-001`, `DKBWS-UPDATE-001`, `DKBWS-RELEASE-001` | Offline identity/failure fixtures and live read-only rc.8 resolution; explicit historical/development plans remain unverified selections. [SRC-080](../sources.md#src-080) |
| fast-uri `3.1.9` with retained Ajv `8.20.0` | `DKBWS-SEC-001`, `DKBWS-VERIFY-001` | Six inert URI and local schema-resolution fixtures, including old-version controls. [SRC-082](../sources.md#src-082) |
| Sourced design validator `0.4.0-denchco.1` with exact Zod `4.6.6` | `DKBWS-DESIGN-001`, `DKBWS-SEC-001`, `DKBWS-VERIFY-001` | Twelve tests, all nine upstream fixture baselines, retained eleven rules, archive/source provenance and checks on all 95 compiled Zod inputs; stale labelled bytes and active archived manifests fail. [SRC-083](../sources.md#src-083), [SRC-087](../sources.md#src-087) |
| filelock `4.2.1` and msgpack `1.2.3` | `DKBWS-SEC-001`, `DKBWS-VERIFY-001` | Five tests of exact installed versions, actual cache calls, process exclusion and bounded malformed decoding; retained pip-audit, CacheControl, Graphify and Zensical. [SRC-084](../sources.md#src-084), [SRC-085](../sources.md#src-085) |
| Fresh Standard dependency audits | `DKBWS-SEC-001` | Zero findings in both release audits, with exact lock and platform-applicable Python environment proof. Complete release and target verification pass. Earlier local results remain dated. [SRC-086](../sources.md#src-086), [SRC-088](../sources.md#src-088), [SRC-089](../sources.md#src-089) |

### Migration impact and completed gates

1. Carry the release resolver, report schema, revised prompt, initializer and relevant starter closure from the selected release. Record the release tag and full commit. Update checks never install or migrate.
2. Carry both frozen locks and the complete local design package, licence, provenance, archived upstream manifest, Zod input proof, wrapper, tests and command wiring. Remove the former nested upstream `package.json`. A lock-only override cannot repair the old opaque bundle. Reinstall with `npm ci` and `uv sync --frozen` using the exact qualified toolchain.
3. Regenerate declared runtime and graph outputs, then pass complete Standard verification and read-only maintainer provenance before publication. Retain DOMPurify `3.4.17`, Mermaid `11.17.2`, KaTeX `0.18.2`, Zensical `0.0.59` and Graphify `0.9.70`.
4. After exact-merge Verify and immutable release readback pass, adopt the exact release in Documentation. Refresh its allowed snapshot and project-owned tooling, run complete target verification, then prove the protected deployment and actual public site.

Filelock 4 changes `SoftReadWriteLock`'s disk protocol. The inspected pip-audit cache does not use it; compatibility evidence covers its actual atomic cache path and ordinary `FileLock`. The design migration retains recoverable malformed-YAML warnings and the current `DESIGN.md` result of zero errors, one warning and one information finding. No broader lock-mode, arbitrary-input or general vulnerability-clearance claim follows from these tests. [SRC-083](../sources.md#src-083), [SRC-084](../sources.md#src-084), [SRC-086](../sources.md#src-086)
