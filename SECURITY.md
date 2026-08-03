# Security and Privacy

## Reporting

Do not publish suspected vulnerabilities or exposed personal data in an issue. After the public repository is created, use [GitHub private vulnerability reporting](https://github.com/denchco/knowledge-base-wiki-standard/security/advisories/new). Until that route is activated during publication, contact Andrew Dench privately through an existing trusted channel.

## Trust boundaries

- Canonical Markdown, source records, prompts, plugins, MCP responses, and generated artifacts are untrusted inputs to tooling.
- Raw sources can contain prompt injection, malicious links, active documents, personal data, credentials, and copyrighted material.
- Rendering and extraction must not execute source-provided code by default.
- LLM answers, Ask Wiki output, graph edges, and generated summaries have no independent evidence authority.
- Write-capable MCP and deployment operations require explicit authorization and least-privilege credentials.

## Required controls

- Secrets stay outside Git, URLs, client storage, generated pages, fixtures, logs, and screenshots.
- Public and private source material must be physically or access-control separated when policy requires it.
- Source retention records licence, confidentiality, personal-data classification, retrieval date, and permitted use.
- HTML derived from model or source text is sanitized or rendered as non-executable text/Markdown.
- JSON embedded in HTML script elements is serialized with HTML-significant characters and JavaScript line separators escaped; raw source labels are never interpolated into executable script text.
- Dependencies are locked, audited, and upgraded through reviewed changes.
- CI uses read-only permissions unless a job's narrowly defined purpose requires more.
- Validators are read-only; generators write only declared derived paths; upgrades produce reviewable patches.
- Local services bind to loopback by default and define health as HTTP 200.

## MCP controls

The filesystem and released specification remain authoritative. An MCP server is an optional adapter. It must expose read-only resources and validation tools by default, separate write tools, require authorization for remote transport, restrict repository scope, log state-changing actions without sensitive values, and never silently upgrade a consumer.
