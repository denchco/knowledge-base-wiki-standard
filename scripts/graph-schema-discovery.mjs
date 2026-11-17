import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { parse } from "yaml";

/** One file-level identity per maintained root schema, without keyword nodes. */
export function maintainedSchemas(root) {
  const directory = path.join(root, "schema");
  if (!fs.existsSync(directory)) return [];
  if (!fs.lstatSync(directory).isDirectory()) throw new Error("Schema discovery requires a regular schema directory");
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.name.endsWith(".json"))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(entry => {
      if (!entry.isFile()) throw new Error(`Schema discovery requires a regular file: schema/${entry.name}`);
      const source_file = `schema/${entry.name}`;
      const bytes = fs.readFileSync(path.join(root, source_file));
      const schema = JSON.parse(bytes.toString("utf8"));
      if (typeof schema.$id !== "string" || !schema.$id.trim()) {
        throw new Error(`Schema discovery requires an exact $id: ${source_file}`);
      }
      return {
        id: `schema:${source_file}`,
        label: entry.name,
        title: schema.title ?? entry.name,
        file_type: "json-schema",
        source_file,
        source_location: "L1",
        schema_id: schema.$id,
        source_sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    });
}

/** Only a declared public repository and exact build baseline can form a link. */
export function schemaSourceUrl(root, record, revision) {
  const manifestPath = path.join(root, ".wiki-standard.yaml");
  if (!fs.existsSync(manifestPath) || !/^[a-f0-9]{40}$/.test(revision ?? "")) return undefined;
  const repository = parse(fs.readFileSync(manifestPath, "utf8"))?.capabilities?.public_repository;
  if (typeof repository !== "string" || !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(repository)) return undefined;
  const baseline = spawnSync("git", ["show", `${revision}:${record.source_file}`], { cwd: root, stdio: ["ignore", "pipe", "ignore"] });
  if (baseline.status !== 0 || createHash("sha256").update(baseline.stdout).digest("hex") !== record.source_sha256) return undefined;
  return `${repository.replace(/\/$/, "")}/blob/${revision}/${record.source_file}#L1`;
}

export function schemaDiscoveryFailures(root, graph) {
  const failures = [];
  const nodes = graph.nodes ?? [];
  const records = maintainedSchemas(root);
  for (const record of records) {
    const matches = nodes.filter(node => node.file_type === "json-schema" && node.source_file === record.source_file);
    if (matches.length !== 1) {
      failures.push(`${record.source_file} requires exactly one schema discovery node, found ${matches.length}`);
      continue;
    }
    const node = matches[0];
    for (const key of ["id", "label", "source_location", "schema_id", "source_sha256"]) {
      if (node[key] !== record[key]) failures.push(`${record.source_file} has stale or incorrect ${key}`);
    }
    const expectedUrl = schemaSourceUrl(root, record, graph.built_at_commit);
    if (node.source_url !== expectedUrl) failures.push(`${record.source_file} has an incorrect canonical source link`);
  }
  const maintainedPaths = new Set(records.map(record => record.source_file));
  for (const node of nodes.filter(node => node.file_type === "json-schema")) {
    if (!maintainedPaths.has(node.source_file)) failures.push(`Stale schema discovery node: ${node.source_file}`);
  }
  return failures;
}

export function lookupPublishedSchema(root, query, graph) {
  const failures = schemaDiscoveryFailures(root, graph);
  if (failures.length) throw new Error(failures.join("\n"));
  const matches = graph.nodes.filter(node => node.file_type === "json-schema"
    && [node.label, node.source_file, node.schema_id].includes(query));
  if (matches.length !== 1) throw new Error(`Expected one exact maintained schema for ${JSON.stringify(query)}, found ${matches.length}`);
  return matches[0];
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    const query = args.find(argument => argument !== "--json");
    if (!query || args.filter(argument => argument !== "--json").length !== 1) {
      throw new Error("Usage: npm run graph:schema -- <exact-schema-name|path|$id> [--json]");
    }
    const root = process.cwd();
    const graph = JSON.parse(fs.readFileSync(path.join(root, process.env.GRAPHIFY_TARGET_DIR ?? "docs/assets/graphify", "graph.json"), "utf8"));
    const node = lookupPublishedSchema(root, query, graph);
    console.log(args.includes("--json") ? JSON.stringify(node, null, 2)
      : `${node.label}\nIdentity: ${node.schema_id}\nCanonical source: ${node.source_file}:${node.source_location}\nSHA-256: ${node.source_sha256}${node.source_url ? `\nBuild baseline: ${node.source_url}` : ""}`);
  } catch (error) {
    console.error(`Schema discovery failed: ${error.message}`);
    process.exitCode = 1;
  }
}
