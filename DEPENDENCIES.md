# Dependency Contract

Dependencies are classified so consumers can distinguish required knowledge-format support from one reference implementation.

| Class | Required for | Dependencies |
|---|---|---|
| Universal | Reading and editing | UTF-8, Markdown, YAML frontmatter, Git-compatible files |
| Standard validation | Conformance | Node.js 22+, npm, JSON Schema-compatible validator; repository scripts use Node built-ins initially |
| Reference renderer | Human Wiki | Python 3.12+, `uv`, exactly pinned `zensical==0.0.51` |
| Knowledge graph | Graph-Linked capability | exactly pinned `graphifyy==0.8.35` |
| Browser runtimes | Production diagrams/graphs | `mermaid==11.16.0`, `vis-network==10.1.0`, `3d-force-graph==1.77.0` |
| Browser verification | Rendered conformance | `@playwright/test==1.55.1` and its matching Chromium binary |
| Design validation | Design-Governed capability | `@google/design.md==0.2.0` |
| Local provenance | Maintained-project profile | Git; Jujutsu (`jj`) is required by the DenchCo production profile and optional in portable core |
| Persistent macOS runtime | `macos-launchd` adapter | Node.js, `launchctl`; generated user LaunchAgent, no sudo |
| Reference deployment | Cloudflare profile | `wrangler==4.114.0`, GitHub Actions, Cloudflare credentials outside source |
| MCP integration | Optional | GitHub MCP Server initially; a dedicated standard MCP is a later adapter |

## Reproducibility rules

- Exact production/runtime pins live in `pyproject.toml` and `package-lock.json`.
- `uv.lock` and `package-lock.json` are committed.
- CI installs from locks and fails if verification changes tracked files.
- Optional profiles must declare their additional dependencies and checks.
- “Latest” is never a build input. Upgrades are deliberate changes with migration evidence.
