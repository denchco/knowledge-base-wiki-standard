---
type: Guide
title: Update an existing Wiki safely
description: Move an existing Wiki to one approved immutable Standard stack while preserving local knowledge and settings.
status: draft
---

# Update an existing Wiki safely

An existing Wiki updates through a reviewed implementation patch. Select one immutable Standard release, adapt its applicable components, verify the target Wiki, then record the new pin. Keep the Wiki's subject, evidence and local settings throughout the change.

The canonical agent prompt is `prompts/update-wiki.md` in the Standard repository. This guide applies the existing [update and release requirements](../spec/requirements.md). It adds a reusable procedure and a bounded regression test.

## Give the agent one task

```text
Update this Wiki to the approved immutable Standard release.
Follow prompts/update-wiki.md in the Standard repository.
Preserve subject content, source evidence, local settings and deviations.
Complete verification and open the PR for manual approval.
```

The agent uses authority already present in the request. It asks one question at a time when a material unknown blocks safe work. A release check reads availability. It does not authorise implementation, merge, adoption or deployment.

## Review the complete component change

Start in the trusted Standard checkout.

```sh
npm run standard:stack -- check <wiki> --json
npm run standard:stack -- resolve --json
npm run conformance:diff -- <wiki> --json
npm run conformance:upgrade-plan -- <wiki> --json
```

Save the selected tag, full commit and dated release/Verify evidence. Check the local tag resolves to that exact commit. If the user approved an exact release, verify that release directly and retain it. Stop when the evidence is unavailable, inconsistent or has changed.

The [stack selector](../spec/conformance.md) verifies a published, non-draft, native-immutable release and its exact-commit trusted Verify result. An explicit historical `--standard-revision` plan is unverified release selection. A historical fixture uses that mode and makes no production adoption claim.

The upgrade planner covers manifest and requirement changes. Review the implementation separately. A dependency version often requires its lock, adapter, configuration and tests together.

| Review item | Evidence to retain |
|---|---|
| Exact source and target | Approved tag, full SHA, release evidence and ancestry |
| Applicable components | Changed paths, consumer path mappings, local adaptations and excluded paths with reasons |
| Supporting closure | Relevant unchanged locks, builders, configuration, checks and CI |
| File preconditions | Consumer commit, clean boundary, before hashes, file modes and proposed hashes |
| Preservation | Subject files, source/evidence identities, unknown metadata, role mappings, settings and deviations |
| Qualification | Current audits, selected-profile checks, graph/build/browser results and final-tree receipt |
| Recovery | Prior consumer commit, prior Standard pin, frozen install commands and rollback procedure |

Preserve local work in a separate clean review boundary. A modified file, unresolved merge or stale hash stops the affected patch. Review the local difference before creating a new plan. Keep the original bytes available.

## Apply and verify

1. Adapt the approved components in their dependency order. Merge local contract changes and preserve the consumer's package identity, URLs, branding and settings.
2. Install the selected frozen stack with its exact runtimes. Use `npm ci`, `uv sync --frozen` and matched browser installation where selected.
3. Rebuild declared derived outputs and run the target's complete verification. Include current audits and every applicable selected-profile proof obligation.
4. Check component preservation before changing adoption metadata. If validation needs a proposed pin or snapshot, review it in the isolated candidate branch with adoption pending. Record adoption of the release tag and full Standard revision only after all target checks pass. Preserve unknown fields and deviations.
5. Run complete final-tree verification again. Check the diff and preservation record. Commit under the target's provenance policy and open the requested PR.
6. Retain the rollback plan. Leave merge for manual approval when requested. Deploy only under separately granted authority.

The current source and target release commits remain immutable. New compatible component changes need another qualified release. The update never grants permission to change another Wiki's pin.

## rc.14 to rc.15 regression

The executable test uses exact released source at rc.14 `d2fc92204c11eb8c30501cf644540a0daff3cf53` and rc.15 `7be18abaefe7f2f1fc1205a7524e2a5627b99357`. It uses a synthetic independent consumer with subject content, source evidence, unknown metadata, local settings and a documented deviation.

The recipe `migrations/rc14-to-rc15.json` accounts for every changed release path. It groups the Python stack, guarded graph adapter, renderer, selected CI, local contracts and Standard-only records. It also identifies unchanged supporting closure. The fixture applies real release file additions and removals. A reviewed package adaptation preserves the consumer's identity and service endpoint. Its package retains reference scripts to test the released file delta. The fixture tests file changes and preservation.

| Component | Bounded test obligation |
|---|---|
| Graphify `0.9.106` | Plan the guarded wrapper and fixtures before renderer removal |
| Zensical `0.1.1` and UI `0.0.42` | Replace the old patcher with the native checksum checker and build/browser closure |
| Removed files | Delete the old patcher and its test |
| Consumer content | Preserve subject, evidence, unknown metadata, settings and deviations |
| Local changes | Reject dirty state, changed baselines, stale review hashes and incomplete patches |
| Qualification boundary | Report remote release evidence and full target qualification as not checked |

Run the bounded regression from a full-history Standard checkout.

```sh
node --test scripts/wiki-update-review.test.mjs
```

The read-only helper can capture a component review. Provide an explicit decision for every path in the recipe. Use `exact-file` for an unchanged reference baseline, `reviewed-adaptation` with exact `baseline` and `proposed` SHA-256/mode identities for an adapted file, or `out-of-scope` with a reason. `manual-adaptation` records an unresolved blocker. Paths are repository-relative.

```sh
npm run wiki:update:review -- plan <wiki> migrations/rc14-to-rc15.json <decisions.json>
npm run wiki:update:review -- check-before <wiki> <review.json>
npm run wiki:update:review -- check-after <wiki> <review.json>
```

Save the JSON report outside the consumer repository so it does not invalidate the captured clean boundary. The report contains its review digest, expected consumer commit, file identities and preserved-file identities. The helper checks these identities and performs no writes. A reviewed adaptation needs its own reviewed patch bytes. The report is a checksum guard and cannot apply a migration.

This regression does not install environments, run the renderer or browsers, verify native release immutability, change a consumer pin or prove Standard Production conformance. The real target still needs its complete verification and final-tree receipt before adoption.
