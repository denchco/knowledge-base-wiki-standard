---
type: Guide
title: Your first Wiki and its released stack
description: Start from a verified immutable release and control later upgrades.
status: draft
---

# Your first Wiki and its released stack

The commands in this guide require Standard `v0.1.0-rc.9` or later. Existing Wikis receive them through an authorised migration to that verified immutable release.

Give an implementation agent the Standard repository URL:

```text
https://github.com/denchco/knowledge-base-wiki-standard
```

The agent asks whether to start from research material or an empty local Wiki. It reads your material, resolves safe defaults and confirms your accent colour. You do not need to choose package versions or assemble a software stack.

## What the first build uses

The agent selects the latest published, non-draft, native-immutable Standard release. Semantic version ordering includes prereleases such as `rc.8`. It checks that the tag resolves to the exact released commit and that trusted `Verify` checks passed for that commit on push/main. Missing or failed evidence stops selection. The development branch and an older successful release are not fallback choices.

That release fixes the tool versions, dependency locks, configuration contracts and verification code. The agent installs those frozen dependencies and records the exact release in your Wiki. It then creates your own content and configuration, builds the Wiki and runs the required checks. A subject-empty Wiki starts without invented claims, evidence or a governing question.

This is an agent-led implementation. The planning command does not create a complete runnable Wiki by itself. The agent supplies and verifies the selected renderer, scripts, runtime assets and local service before reporting readiness.

## What stays fixed

Your Wiki keeps its released stack. A newer library, renderer or Standard improvement does not silently replace it. Your own research, configuration and documented local differences remain yours. The original immutable release stays available.

Release qualification is dated evidence. Current security audits still run and may find a later-reported problem. The agent reports that failure and its effect on readiness. It does not hide the finding or upgrade dependencies without authority.

## How to check for a newer release

The agent can run this read-only command from a checkout that carries the released stack checker:

```sh
npm run standard:stack -- check /path/to/wiki
```

It compares your recorded revision with the currently verified release. It does not install software, edit content or change the pin. To inspect the selected release alone, use:

```sh
npm run standard:stack -- resolve --json
```

A newer release is an option for review. If you authorise migration, the agent checks compatibility, preserves unknown fields and local differences, prepares the changes and runs full verification. Only that completed migration records adoption. Publication or deployment needs its own authority when it is outside the requested migration.

Explicit historical or development revision plans can inspect other source. They remain unverified plans and cannot establish readiness for a production build.

The [release and conformance contract](../spec/conformance.md#immutable-release-stack-checks) defines the evidence. The [prompt contract](../spec/prompts.md) defines the implementation workflow.
