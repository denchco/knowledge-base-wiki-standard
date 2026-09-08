---
type: Agent Guide
title: Web discovery
description: Path-scoped llms.txt v2 and derived Markdown page alternates.
status: draft
---

# Web discovery

The [llms.txt v2 proposal](https://llmstxt.org/) and its [August 2026 changes](https://llmstxt.org/changes.html) are registered as [SRC-004](../sources.md#src-004). The proposal now specifies page-to-Markdown discovery through `rel="alternate"` with `type="text/markdown"`, and discovery-file selection through `rel="describedby"`. A file covers its own URL path and the most specific applicable discovery file wins. This makes a GitHub Pages project path a complete publication scope.

The reference build runs `npm run build:llms` after the strict renderer build. `scripts/publish-llms.mjs` derives a Markdown alternate from each maintained Markdown page that has an actual built HTML route. A page at `guide/page/` advertises `guide/page/index.md`; both it and the root page advertise the discovery file under the built canonical root. The renderer's canonical URL supplies the root, so the same code supports loopback previews and the separate documentation project's public path.

The publisher strips authoring frontmatter, preserves code examples, rebases common Markdown and HTML resource destinations, and places an authority notice in each alternate. Canonical source remains untouched. The discovery file stays concise and points to selected Markdown alternates; Optional links are a reading convention, without expansion-tool semantics. HTML discovery tags are used because they work on static Pages hosting without custom HTTP headers.

## Verification and migration

The existing `DKBWS-LLM-001` authority and generated-boundary requirement carries this reference-adapter improvement. No consumer acquires an automatic update obligation merely because the upstream proposal changed. Consumers selecting this adapter bring its complete build/test closure from their pinned Standard release, author their own discovery links, and keep their own canonical site root.

Fixtures prove origin-root and project-subpath output, exact advertised targets, Markdown/resource rebasing, code preservation, idempotence, canonical-source immutability, and rejection of missing discovery targets or missing canonical identity. The complete build additionally validates every relative llms.txt destination against an emitted artifact. Verification rebuilds only `site/`; no Markdown alternate is copied back into the maintained corpus.

For a site page, read its `describedby` location, search or skim the discovery file, and follow only the relevant Markdown links. For normative decisions, use the exact released repository specification and source register; web alternatives remain derived views of those authorities.

## Qualified renderer integration

Zensical `0.0.59` treats every alternate link as a language variant and otherwise requests a sitemap beside the Markdown alternate. The pinned `patch:renderer` build adapter restricts that one selector to alternates with `hreflang`. It verifies the exact upstream and patched SHA-256 digests, preserves upstream licence comments, changes no source-map reference (this upstream bundle has none), and gives the changed script a matching content-hash filename. Missing, duplicate, or changed patch targets require requalification and fail the build. Markdown discovery links remain intact.

The strict static build applies this adapter before publishing discovery. `check:renderer` verifies the generated result, and the browser contract opens search, finds and follows an actual architecture result, tests Escape and reopening, and rejects off-origin code, data, and sitemap requests. The existing configured Google Fonts stylesheet and font files are outside that runtime boundary; all genuine browser errors still fail verification.

The live `dev` command serves from isolated `site-local/` using generated `zensical.local.toml`; it does not run the static discovery publisher or renderer postprocessing. The live watch preview therefore makes no Markdown-alternate claim. Discovery qualification applies to `site/` after the complete static build. A separately requested local static build must finish its publisher and adapter before its discovery output is qualified.
