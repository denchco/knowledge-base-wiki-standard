#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { builtinModules, createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build, version as esbuildVersion } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DESIGN_VALIDATOR_ROOT = path.join(ROOT, "tools/design-md");
const UPSTREAM_REVISION = "9bf8eae67128b6cc55ad9bf86665767deb4c11cd";
const ZOD_VERSION = "4.6.6";
const digest = value => createHash("sha256").update(value).digest("hex");
const relative = value => path.relative(ROOT, value).split(path.sep).join("/");
function invariant(condition, message) { if (!condition) throw new Error(message); }
function json(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }

function sourceFiles(directory) {
  return fs.readdirSync(directory).sort().flatMap(name => {
    const file = path.join(directory, name), stat = fs.lstatSync(file);
    invariant(!stat.isSymbolicLink(), "Vendored design validator sources must not contain symlinks.");
    return stat.isDirectory() ? sourceFiles(file) : [file];
  });
}

export function checkDesignValidatorSources(packageRoot = DESIGN_VALIDATOR_ROOT) {
  const provenance = json(path.join(packageRoot, "upstream-provenance.json"));
  const pkg = json(path.join(packageRoot, "package.json"));
  invariant(pkg.name === "@denchco/design-md-validator" && pkg.version === "0.4.0-denchco.1"
    && pkg.license === "Apache-2.0" && pkg.private === true,
  "Design validator package identity differs from the reviewed adaptation.");
  invariant(provenance.source === "https://github.com/google-labs-code/design.md"
    && provenance.revision === UPSTREAM_REVISION && provenance.tag === "0.4.0"
    && provenance.license === "Apache-2.0", "Design validator upstream identity does not match the reviewed source.");
  invariant(JSON.stringify(pkg.dependencies) === JSON.stringify(provenance.dependencies)
    && pkg.dependencies.zod === ZOD_VERSION, "Design validator dependency pins differ from the reviewed provenance.");
  const files = sourceFiles(path.join(packageRoot, "upstream"));
  invariant(files.every(file => path.basename(file).toLowerCase() !== "package.json"),
    "Historical upstream metadata must not be an active package.json manifest.");
  const upstreamManifest = provenance.files.filter(entry => entry.upstreamPath === "packages/cli/package.json");
  invariant(upstreamManifest.length === 1 && upstreamManifest[0].path === "upstream/packages/cli/package.json.upstream"
    && upstreamManifest[0].changes.length === 0 && upstreamManifest[0].sha256 === upstreamManifest[0].upstreamSha256,
  "Original upstream package metadata must remain unchanged in its noninstallable archive.");
  const seen = new Set();
  for (const entry of provenance.files) {
    invariant(typeof entry.path === "string" && entry.path.startsWith("upstream/")
      && !entry.path.includes("\\") && entry.path.split("/").every(part => part && part !== "." && part !== "..")
      && !seen.has(entry.path), "Design validator provenance contains an invalid or duplicate source path.");
    seen.add(entry.path);
    const file = path.join(packageRoot, entry.path), stat = fs.lstatSync(file);
    invariant(stat.isFile() && !stat.isSymbolicLink() && digest(fs.readFileSync(file)) === entry.sha256,
      `Design validator source differs from its reviewed hash: ${entry.path}`);
    invariant(/^[a-f0-9]{40}$/.test(entry.gitBlob) && /^[a-f0-9]{64}$/.test(entry.upstreamSha256),
      `Design validator upstream blob evidence is invalid: ${entry.path}`);
    invariant(entry.changes.length > 0 || entry.sha256 === entry.upstreamSha256,
      `Unrecorded upstream source modification: ${entry.path}`);
  }
  invariant(JSON.stringify(files.map(file => path.relative(packageRoot, file).split(path.sep).join("/")).sort())
    === JSON.stringify([...seen].sort()), "Design validator source inventory is incomplete.");
  return { provenance, pkg };
}

function owningPackage(file) {
  let directory = path.dirname(file);
  while (directory !== path.dirname(directory)) {
    const manifest = path.join(directory, "package.json");
    if (fs.existsSync(manifest)) {
      const pkg = json(manifest);
      if (typeof pkg.name === "string" && typeof pkg.version === "string") return { root: directory, ...pkg };
    }
    directory = path.dirname(directory);
  }
  throw new Error(`No package identity for design validator build input: ${relative(file)}`);
}

export function checkDesignValidatorZodInput(packageRoot, file) {
  const proof = json(path.join(DESIGN_VALIDATOR_ROOT, "zod-4.6.6-inputs.json"));
  const pkg = json(path.join(packageRoot, "package.json"));
  invariant(pkg.name === "zod" && pkg.version === ZOD_VERSION && proof.package === "zod" && proof.version === ZOD_VERSION,
    "Design validator Zod source identity differs from the reviewed distribution.");
  const name = path.relative(packageRoot, file).split(path.sep).join("/");
  const matches = proof.files.filter(entry => entry.path === name);
  invariant(matches.length === 1, `Design validator reached an unreviewed Zod source file: ${name}`);
  const bytes = fs.readFileSync(file), expected = matches[0];
  invariant(bytes.length === expected.bytes && digest(bytes) === expected.sha256,
    `Design validator Zod source bytes differ from the integrity-verified 4.6.6 distribution: ${name}`);
  return bytes;
}

function writeDerived(file, bytes) {
  if (fs.existsSync(file) && fs.readFileSync(file).equals(Buffer.from(bytes))) return;
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporary, bytes);
  fs.renameSync(temporary, file);
}

export async function buildDesignValidator({ load = true } = {}) {
  const { provenance, pkg } = checkDesignValidatorSources();
  const lockBytes = fs.readFileSync(path.join(ROOT, "package-lock.json")), lock = JSON.parse(lockBytes);
  const zodProofBytes = fs.readFileSync(path.join(DESIGN_VALIDATOR_ROOT, "zod-4.6.6-inputs.json")), zodProof = JSON.parse(zodProofBytes);
  const verifiedZodInputs = new Map();
  const requireFromPackage = createRequire(path.join(DESIGN_VALIDATOR_ROOT, "package.json"));
  for (const [name, expected] of Object.entries(pkg.dependencies)) {
    const installed = owningPackage(requireFromPackage.resolve(name));
    invariant(installed.name === name && installed.version === expected,
      `Design validator requires ${name} ${expected}; installed ${installed.version}. Run the locked npm install.`);
  }
  const result = await build({
    absWorkingDir: ROOT, entryPoints: [relative(path.join(DESIGN_VALIDATOR_ROOT, "index.ts"))],
    outfile: ".cache/design-validator/index.mjs", bundle: true, packages: "bundle",
    platform: "node", format: "esm", target: "node24", write: false, metafile: true,
    minify: false, legalComments: "inline", logLevel: "silent",
    banner: { js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);' },
    plugins: [{ name: "verified-zod-source", setup(context) {
      context.onLoad({ filter: /[/\\]node_modules[/\\]zod[/\\].*\.(?:m?js|cjs)$/ }, args => {
        const installed = owningPackage(args.path);
        const bytes = checkDesignValidatorZodInput(installed.root, args.path);
        verifiedZodInputs.set(args.path, bytes);
        return { contents: bytes, loader: "js", resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  const modules = new Map(), inputs = [];
  for (const input of Object.keys(result.metafile.inputs).sort()) {
    const absolute = path.resolve(ROOT, input), bytes = verifiedZodInputs.get(absolute) ?? fs.readFileSync(absolute);
    inputs.push({ path: relative(absolute), sha256: digest(bytes), bytes: bytes.length });
    if (input.replaceAll("\\", "/").split("/").includes("node_modules")) {
      const installed = owningPackage(absolute);
      const lockPath = relative(installed.root), locked = lock.packages?.[lockPath];
      invariant(locked?.version === installed.version && typeof locked.integrity === "string" && locked.integrity.startsWith("sha512-"),
        `Design validator input lacks exact locked package integrity: ${lockPath}`);
      modules.set(`${installed.name}@${installed.version}:${lockPath}`, { name: installed.name, version: installed.version, lockPath, integrity: locked.integrity });
      if (installed.name === "zod") {
        invariant(installed.version === ZOD_VERSION && !/[/\\]v3[/\\]/.test(absolute)
          && verifiedZodInputs.has(absolute) && locked.integrity === zodProof.integrity,
          "Design validator build reached an unqualified Zod implementation.");
      }
    }
  }
  for (const [name, version] of Object.entries(pkg.dependencies)) {
    invariant([...modules.values()].some(item => item.name === name && item.version === version), `Design validator did not load the pinned ${name} implementation.`);
    invariant([...modules.values()].filter(item => item.name === name).length === 1,
      `Design validator bundled multiple ${name} implementations.`);
  }
  const builtins = new Set(builtinModules.flatMap(name => [name, `node:${name}`]));
  for (const output of Object.values(result.metafile.outputs)) {
    invariant(output.imports.every(item => item.external && builtins.has(item.path)),
      "Design validator build left a non-builtin runtime dependency unresolved.");
  }
  const moduleBytes = result.outputFiles[0].contents;
  const receipt = { schemaVersion: 1, tool: `${pkg.name}@${pkg.version}`,
    source: { repository: provenance.source, tag: provenance.tag, revision: provenance.revision,
      provenanceSha256: digest(fs.readFileSync(path.join(DESIGN_VALIDATOR_ROOT, "upstream-provenance.json"))), files: provenance.files },
    builderSha256: digest(fs.readFileSync(fileURLToPath(import.meta.url))),
    packageManifestSha256: digest(fs.readFileSync(path.join(DESIGN_VALIDATOR_ROOT, "package.json"))),
    zodSourceProof: { path: "tools/design-md/zod-4.6.6-inputs.json", sha256: digest(zodProofBytes), distribution: zodProof.distribution,
      archiveSha256: zodProof.archiveSha256, integrity: zodProof.integrity, verifiedInputCount: verifiedZodInputs.size },
    packageLockSha256: digest(lockBytes), nodeVersion: process.versions.node,
    esbuildVersion, target: "node24", zodVersion: ZOD_VERSION,
    bundleSha256: digest(moduleBytes), inputs, packages: [...modules.values()].sort((a, b) => a.name.localeCompare(b.name)) };
  const fingerprint = digest(JSON.stringify(receipt));
  if (!load) return { receipt, fingerprint };
  const directory = path.join(ROOT, ".cache/design-validator", fingerprint);
  fs.mkdirSync(directory, { recursive: true });
  writeDerived(path.join(directory, "index.mjs"), moduleBytes);
  writeDerived(path.join(directory, "spec-config.yaml"), fs.readFileSync(path.join(DESIGN_VALIDATOR_ROOT, "upstream/packages/cli/src/linter/spec-config.yaml")));
  writeDerived(path.join(directory, "build-receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
  const api = await import(pathToFileURL(path.join(directory, "index.mjs")).href);
  invariant(api.DEFAULT_RULE_DESCRIPTORS.length === 11, "Design validator must retain all eleven upstream default lint rules.");
  return { api, receipt, fingerprint, directory };
}

const HELP = "Usage: node scripts/design-validator.mjs lint <DESIGN.md|-> [--format json|text|markdown|md]\n       node scripts/design-validator.mjs identity [--json]\n";
export async function run(argv, { stdout = value => process.stdout.write(value), stderr = value => process.stderr.write(value), stdin = process.stdin, load = buildDesignValidator } = {}) {
  if (argv.length === 1 && ["--help", "-h"].includes(argv[0])) { stdout(HELP); return 0; }
  if (argv[0] === "identity" && (argv.length === 1 || (argv.length === 2 && argv[1] === "--json"))) {
    try {
      const { receipt, fingerprint } = await load({ load: false });
      stdout(JSON.stringify({ readOnly: true, writesPerformed: false, fingerprint, ...receipt }, null, 2) + "\n");
      return 0;
    } catch (error) { stderr(`Design validator identity failed: ${error.message}\n`); return 2; }
  }
  const [command, file, ...args] = argv;
  let format = "json";
  if (args.length === 2 && args[0] === "--format" && ["json", "text", "markdown", "md"].includes(args[1])) format = args[1];
  else if (args.length) { stderr(HELP); return 2; }
  if (command !== "lint" || !file || (file.startsWith("-") && file !== "-")) { stderr(HELP); return 2; }
  try {
    const { api } = await load();
    const content = await api.readInput(file, stdin);
    const report = api.lint(content);
    stdout(api.formatOutput({ findings: report.findings, summary: report.summary }, { format }) + "\n");
    return report.summary.errors > 0 ? 1 : 0;
  } catch (error) {
    stderr(`Design validation failed: ${error.friendlyMessage ?? error.message}\n`);
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await run(process.argv.slice(2));
