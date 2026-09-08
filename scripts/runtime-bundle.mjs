import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { build, version as esbuildVersion } from "esbuild";

export const runtimeVersions = Object.freeze({ mermaid: "11.17.2", dompurify: "3.4.15", esbuild: "0.28.2", "vis-network": "10.1.2", "3d-force-graph": "1.80.0" });
const outputDirectory = "docs/assets/vendor";
const mermaidOutput = `${outputDirectory}/mermaid.min.js`;
const entryPoint = "scripts/mermaid-runtime-entry.mjs";
const sanitizerInput = "node_modules/dompurify/dist/purify.es.mjs";
const copiedAssets = [
  { name: "vis-network", source: "node_modules/vis-network/standalone/umd/vis-network.min.js", destination: `${outputDirectory}/vis-network.min.js` },
  { name: "3d-force-graph", source: "node_modules/3d-force-graph/dist/3d-force-graph.min.js", destination: `${outputDirectory}/3d-force-graph.min.js` },
];
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function inspectSanitizer({ inputs, source, output, expected = runtimeVersions.dompurify }) {
  const sanitizerPaths = Object.keys(inputs).filter((name) => /(?:^|\/)dompurify\//.test(name));
  if (sanitizerPaths.length !== 1 || sanitizerPaths[0] !== sanitizerInput) {
    throw new Error(`Mermaid must embed exactly the locked DOMPurify module; found ${sanitizerPaths.join(", ") || "none"}`);
  }
  const sourceVersion = source.match(/DOMPurify\.version\s*=\s*['"]([^'"]+)['"]/u)?.[1];
  if (sourceVersion !== expected) throw new Error(`DOMPurify source embeds ${sourceVersion ?? "no version"}; expected ${expected}`);
  const banners = [...output.matchAll(/DOMPurify\s+(\d+\.\d+\.\d+)/gu)].map((match) => match[1]);
  if (!banners.length || banners.some((version) => version !== expected)) {
    throw new Error(`Mermaid bundle contains an unqualified DOMPurify license/version: ${banners.join(", ") || "absent"}`);
  }
  const embeddedVersions = [...output.matchAll(/\.version\s*=\s*['"](3\.\d+\.\d+)['"]/gu)].map((match) => match[1]);
  if (embeddedVersions.length !== 1 || embeddedVersions[0] !== expected) {
    throw new Error(`Mermaid bundle must contain one DOMPurify ${expected} implementation; found ${embeddedVersions.join(", ") || "none"}`);
  }
  if (Object.keys(inputs).some((name) => /mermaid\/(?:dist\/)?mermaid\.(?:min\.js|esm(?:\.min)?\.mjs)$/u.test(name))) {
    throw new Error("Mermaid prebuilt bundle cannot substitute for the external-dependency core");
  }
}

export async function buildRuntimeAssets(root = process.cwd()) {
  const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
  const lockBytes = read("package-lock.json");
  const lock = JSON.parse(lockBytes);
  const pkg = JSON.parse(read("package.json"));
  for (const [name, expected] of Object.entries(runtimeVersions)) {
    if (pkg.devDependencies?.[name] !== expected || lock.packages?.[`node_modules/${name}`]?.version !== expected) {
      throw new Error(`${name} must be directly pinned and locked at ${expected}`);
    }
  }
  if (esbuildVersion !== runtimeVersions.esbuild) throw new Error(`Unqualified esbuild ${esbuildVersion}`);
  const result = await build({
    absWorkingDir: root,
    entryPoints: [entryPoint],
    outfile: mermaidOutput,
    alias: { dompurify: path.join(root, sanitizerInput) },
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    minify: true,
    legalComments: "inline",
    sourcemap: false,
    metafile: true,
    write: false,
    logLevel: "silent",
  });
  if (result.outputFiles.length !== 1) throw new Error("Mermaid runtime must be a single self-contained script");
  const output = result.outputFiles[0].text;
  const { inputs, outputs } = result.metafile;
  if (Object.values(outputs).some((item) => item.imports.length)) throw new Error("Mermaid runtime contains unresolved browser imports");
  inspectSanitizer({ inputs, source: read(sanitizerInput), output });

  const packages = new Map();
  function componentFor(source) {
    if (!source.startsWith("node_modules/")) return null;
    let directory = path.posix.dirname(source);
    while (directory.startsWith("node_modules")) {
      const manifest = path.join(root, directory, "package.json");
      if (fs.existsSync(manifest)) {
        if (packages.has(directory)) return packages.get(directory);
        const installed = JSON.parse(fs.readFileSync(manifest, "utf8"));
        // Some distribution directories have a package.json declaring only type.
        if (!installed.name || !installed.version) { directory = path.posix.dirname(directory); continue; }
        const locked = lock.packages?.[directory];
        if (!locked?.integrity || installed.version !== locked.version) throw new Error(`Bundle input ${source} is absent from or differs from the audited lock`);
        const component = {
          type: "library", "bom-ref": directory, name: installed.name, version: installed.version,
          purl: `pkg:npm/${installed.name.replace("@", "%40")}@${installed.version}`,
          properties: [{ name: "dkbws:lock-integrity", value: locked.integrity }],
        };
        if (typeof installed.license === "string") component.licenses = [{ license: { name: installed.license } }];
        packages.set(directory, component);
        return component;
      }
      directory = path.posix.dirname(directory);
    }
    throw new Error(`Cannot identify locked package for bundle input ${source}`);
  }
  const inputEvidence = Object.keys(inputs).sort().map((source) => {
    if (path.isAbsolute(source) || source.split("/").includes("..")) throw new Error(`Nonportable bundle input ${source}`);
    const bytes = fs.readFileSync(path.join(root, source));
    const component = componentFor(source);
    return { path: source, bytes: bytes.length, sha256: sha256(bytes), component: component?.["bom-ref"] ?? "repository-entry" };
  });
  // A prebuilt sanitizer hidden inside a Mermaid chunk would evade a simple
  // package inventory. Reject its implementation marker before emitting assets.
  for (const source of inputEvidence.filter((item) => item.path.startsWith("node_modules/mermaid/"))) {
    if (/DOMPurify\.version\s*=|DOMPurify\s+\d+\.\d+\.\d+/u.test(read(source.path))) {
      throw new Error(`Mermaid input hides an embedded DOMPurify: ${source.path}`);
    }
  }
  const assets = new Map([[mermaidOutput, output]]);
  const runtimeEvidence = [{ path: mermaidOutput, sha256: sha256(output), bytes: Buffer.byteLength(output), coverage: "resolved-core-module-inputs", components: [...packages.keys()].sort() }];
  for (const asset of copiedAssets) {
    const content = `${read(asset.source).replace(/\n?\/\/[#@] sourceMappingURL=.*$/u, "").replace(/\n$/u, "")}\n`;
    const component = componentFor(asset.source);
    component.properties.push({ name: "dkbws:dependency-coverage", value: "opaque-upstream-prebundle; transitive embedded code is not independently attested" });
    assets.set(asset.destination, content);
    runtimeEvidence.push({ path: asset.destination, sha256: sha256(content), bytes: Buffer.byteLength(content), source: asset.source, sourceSha256: sha256(read(asset.source)), coverage: "opaque-upstream-prebundle", components: [component["bom-ref"]] });
  }
  const manifest = {
    schemaVersion: 1,
    builder: { name: "esbuild", version: esbuildVersion, entryPoint, target: "es2022", format: "iife", minify: true, sanitizerInput },
    packageLockSha256: sha256(lockBytes),
    sanitizer: { name: "dompurify", version: runtimeVersions.dompurify, source: sanitizerInput },
    inputs: inputEvidence,
    metafile: result.metafile,
    assets: runtimeEvidence,
  };
  const sortedComponents = [...packages.values()].sort((a, b) => a["bom-ref"].localeCompare(b["bom-ref"], "en"));
  const sbom = {
    bomFormat: "CycloneDX", specVersion: "1.6", version: 1,
    metadata: {
      tools: { components: [{ type: "application", name: "esbuild", version: esbuildVersion }] },
      properties: [
        { name: "dkbws:package-lock-sha256", value: sha256(lockBytes) },
        { name: "dkbws:coverage", value: "Mermaid core resolved inputs; copied graph prebundles identify upstream packages only. This is an inventory, not a vulnerability audit." },
      ],
    },
    components: [...sortedComponents, ...runtimeEvidence.map((asset) => ({ type: "file", "bom-ref": asset.path, name: asset.path, hashes: [{ alg: "SHA-256", content: asset.sha256 }], properties: [{ name: "dkbws:dependency-coverage", value: asset.coverage }] }))],
    dependencies: runtimeEvidence.map((asset) => ({ ref: asset.path, dependsOn: asset.components })),
  };
  assets.set(`${outputDirectory}/runtime-metafile.json`, json(manifest));
  assets.set(`${outputDirectory}/runtime-sbom.json`, json(sbom));
  return assets;
}

export function compareRuntimeAssets(assets, root = process.cwd()) {
  const failures = [];
  for (const [relative, expected] of assets) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) failures.push(`Missing ${relative}`);
    else if (!fs.readFileSync(absolute).equals(Buffer.from(expected))) failures.push(`Runtime asset or dependency evidence differs: ${relative}`);
  }
  return failures;
}
