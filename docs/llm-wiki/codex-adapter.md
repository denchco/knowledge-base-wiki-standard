---
type: Agent Guide
title: Optional Codex adapter
description: Package and qualify a locally trusted response check without changing the portable Standard.
status: draft
---

# Optional Codex adapter

The Wiki Standard plugin combines a repository-first skill with an optional Stop hook. The [OpenAI hook contract](https://learn.chatgpt.com/docs/hooks) ([SRC-026](../sources.md#src-026)) supplies `last_assistant_message` and `stop_hook_active`. A blocking decision requests another turn continuation; it does not reject a turn before delivery. Local and plugin hooks require review and trust, and disabled or unavailable hooks supply no enforcement evidence. The [plugin packaging guide](https://learn.chatgpt.com/docs/build-plugins) is registered as [SRC-027](../sources.md#src-027).

This adapter applies the existing `DKBWS-PROMPT-002` link checker and the structural part of `DKBWS-PROMPT-001`. It does not create a new portable profile requirement. `STD-VAL-007` now has a supported optional guardrail; universal pre-send interception remains unproven.

## Build and share

Run `npm run plugin:package` from a verified Standard checkout. The generated `output/plugins/wiki-standard/` directory contains a plugin manifest, the skill, `hooks/hooks.json`, the same response validator bytes used by the repository, and `package-integrity.json` with SHA-256 hashes. Share that complete directory using a supported local or team plugin source. The source skeleton at `plugins/wiki-standard/` needs packaging before installation because its validators are maintained once under `scripts/`.

Packaging does not edit a personal marketplace, install a plugin, trust hooks, enable a project, or add MCP credentials. The host discovers the default `hooks/hooks.json`; no private registry or global installation is needed to build the artifact. The recipient chooses installation and reviews the actual generated commands through the host's hook trust UI.

## Explicit project activation

Activation is a separate local choice. The target must have its selected Node environment, the manifest parser `yaml` from its locked dependencies, `.wiki-standard.yaml`, and `capabilities.development_response_links: live-wiki`. Its `capabilities.human_wiki_url` is the origin authority; the hook reads it directly rather than accepting a duplicated URL in the opt-in file.

After local authorization, create `.codex/wiki-standard-stop.json` at the Wiki root:

```json
{
  "schemaVersion": 1,
  "enabled": true,
  "liveMode": "managed"
}
```

Use `managed` for local preview. The target's `scripts/dev-service.mjs` must expose the qualified, read-only `inspectManagedServiceStatus()` contract. Loopback URLs cannot select the weaker HTTP-only mode. A deployed canonical HTTP(S) Wiki may select `http`, which checks response routes for HTTP 200 without redirects. The selected host must also trust the plugin's exact hook definition. Installation alone is insufficient. Hook changes require renewed host review; do not bypass that review automatically.

The alternative repository-local setup uses the same `Stop` definition with a fixed command pointing at `scripts/codex-stop-hook.mjs`. Choose one host registration to avoid duplicate callbacks. Copying the optional files or the Standard manifest is not consumer adoption, and activating a hook does not authorise publications or evidence changes.

## What the check proves

The hook receives JSON on stdin and produces bounded JSON on stdout. It never executes message text, reads the transcript, writes a captured response to disk, or includes message text, URLs, or exception details in the generated continuation prompt. It locates the nearest explicit opt-in without crossing an independent repository boundary.

Link checks cover the existing Markdown, HTML, URI, and GFM rules. When the captured message contains Wiki navigation, the selected live check verifies those routes; managed mode also proves exact registered identity and canonical URL. Messages without Wiki navigation do not require a running preview. Input is limited to 1 MiB and eight distinct Wiki routes per callback to remain within the 30-second host timeout.

The handoff check detects repeated or empty Next Steps sections and more than three top-level items. It cannot determine whether an item is relevant to the user's goal, whether work is complete, or whether a parked investigation has new evidence. Those semantic decisions remain in the shared agent contract and skill. Code examples are excluded from structural checks.

A first detected violation requests one focused correction. If `stop_hook_active` is already true, another failure produces an explicit retry-exhausted warning without asking for another continuation. Invalid input, absent message content, malformed configuration, runtime failure, or route-budget exhaustion produces a warning that validation was not established. Host process failure or timeout is also a failed check, never a pass. No result claims an absolute delivery barrier.

`npm run conformance:test` exercises valid and invalid responses, unavailable routes, missing input, bounded retries, malformed JSON, adversarial message text, manifest origin selection, opt-in boundaries, and packaged execution. Live activation in an actual trusted host remains an operator qualification step; it is not implied by fixture success.

## Optional future adapters

The [MCP 2026-07-28 announcement](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/blog/content/posts/2026-07-28-spec-ga/index.md) ([SRC-028](../sources.md#src-028)) confirms the stateless core, deterministic cacheable listings, Tasks extension, and authorization changes. A future selected adapter should declare and negotiate that protocol baseline and qualify its client/server compatibility before claiming it. This plugin introduces no MCP server.

[GitHub MCP Server 1.12.0](https://github.com/github/github-mcp-server/releases/tag/v1.12.0) ([SRC-029](../sources.md#src-029)) adds ruleset tooling, expected-HEAD merge protection, and Agent Plugin support. Its [versioned configuration](https://github.com/github/github-mcp-server/blob/v1.12.0/docs/server-configuration.md) supports explicit tool subsets and read-only mode. If separately selected, enable only the needed read tools and minimal repository-scoped credentials; local `--read-only` or remote `X-MCP-Readonly` excludes write tools. A ruleset or merge capability does not authorise its use. The existing files, CLI, Git, and governed proposal route still cover the demonstrated Standard workflows, so a dedicated Standard MCP remains deferred.
