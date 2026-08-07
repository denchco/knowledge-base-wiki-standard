# Security and Privacy

## Reporting

Do not publish suspected vulnerabilities or exposed personal data in an issue. [GitHub private vulnerability reporting](https://github.com/denchco/knowledge-base-wiki-standard/security/advisories/new) is active for this repository; use that route for security reports.

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
- Proposal `check`, `show`, and `sync --check` are read-only. `prepare` writes only a sanitised disposable payload below ignored `output/standard-proposals/`; `record` updates only the selected tracked proposal record; `open` performs GET-only form, label, and duplicate checks and never submits an issue.
- Proposal tooling rejects secrets, private absolute paths, personal or confidential data, restricted evidence, vulnerability detail, and unlicensed material. Suspected vulnerabilities leave the public proposal workflow and use private reporting; patches, screenshots, and evidence files are never uploaded automatically.
- Local services bind to loopback. Persistent managed previews reserve their endpoint in the user-scoped shared register, refuse unmanaged listeners, expose only the non-secret static service identity marker, and require its exact ID in addition to HTTP 200.

## MCP controls

The filesystem and released specification remain authoritative. An MCP server is an optional adapter. It must expose read-only resources and validation tools by default, separate write tools, require authorization for remote transport, restrict repository scope, log state-changing actions without sensitive values, and never silently upgrade a consumer.
