import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import Ajv2020 from "ajv/dist/2020.js";
import { DEFAULT_STANDARD_SOURCE as SOURCE, STACK_FILES, createStackRemote, resolveStandardStack, checkWikiStack, compareReleaseVersions, parseReleaseVersion, canonicalStandardSource } from "./standard-stack.mjs";
import { run as cli } from "./standard-stack-cli.mjs";

const R = "a".repeat(40), OLD = "b".repeat(40), TREE = "c".repeat(40), ANNOTATED = "d".repeat(40);
const WHEN = "2026-10-26T12:00:00Z";
const sha = (type, bytes) => createHash(type).update(bytes).digest("hex");
function release(tag = "v0.1.0-rc.10", id = 10) {
  return { id, tag_name: tag, draft: false, immutable: true, published_at: "2026-10-23T10:00:00Z", html_url: `${SOURCE}/releases/tag/${tag}` };
}
function fixture({ releases = [release("v0.1.0-rc.9", 9), release()], mutate = () => {} } = {}) {
  const repo = { id: 1, full_name: "denchco/knowledge-base-wiki-standard", html_url: SOURCE, default_branch: "main" };
  const workflow = { id: 20, path: ".github/workflows/verify.yml", state: "active" };
  const run = { id: 50, workflow_id: 20, path: workflow.path, head_sha: R, head_commit: { id: R },
    head_branch: "main", event: "push", repository: repo, head_repository: repo, status: "completed", conclusion: "success",
    run_attempt: 1, created_at: "2026-10-23T08:00:00Z", updated_at: "2026-10-23T09:00:00Z", html_url: `${SOURCE}/actions/runs/50` };
  const blobs = new Map(), tree = [];
  for (const file of STACK_FILES) {
    const bytes = Buffer.from(`Exact release bytes for ${file}\n`);
    const id = sha("sha1", Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]));
    tree.push({ path: file, type: "blob", mode: "100644", sha: id });
    blobs.set(id, { sha: id, encoding: "base64", content: bytes.toString("base64"), size: bytes.length });
  }
  const state = { repo, workflow, run, runs: [run], releases, tree, blobs, annotated: false, tagRevisions: {},
    compare: { status: "ahead", ahead_by: 1, behind_by: 0, base_commit: { sha: OLD }, merge_base_commit: { sha: OLD } }, requests: [] };
  mutate(state);
  const fetchImpl = async (url, options) => {
    state.requests.push({ url, options });
    assert.equal(options.method, "GET"); assert.equal(options.redirect, "error");
    const u = new URL(url), p = u.pathname.replace("/repos/denchco/knowledge-base-wiki-standard", "");
    assert.equal(u.origin, "https://api.github.com");
    let value;
    if (p === "") value = state.repo;
    else if (p === "/releases") value = state.releases.slice((Number(u.searchParams.get("page")) - 1) * 100, Number(u.searchParams.get("page")) * 100);
    else if (p.startsWith("/releases/tags/")) value = state.releases.find(item => item.tag_name === decodeURIComponent(p.slice("/releases/tags/".length)));
    else if (p.startsWith("/git/ref/tags/")) {
      const tag = decodeURIComponent(p.slice("/git/ref/tags/".length));
      value = { ref: `refs/tags/${tag}`, object: { type: state.annotated ? "tag" : "commit", sha: state.annotated ? ANNOTATED : state.tagRevisions[tag] ?? R } };
    }
    else if (p === `/git/tags/${ANNOTATED}`) value = { sha: ANNOTATED, object: { type: "commit", sha: R } };
    else if (p.startsWith("/git/commits/")) value = { sha: p.split("/").at(-1), tree: { sha: TREE } };
    else if (p === `/git/trees/${TREE}`) value = { sha: TREE, tree: state.tree, truncated: false };
    else if (p.startsWith("/git/blobs/")) value = state.blobs.get(p.split("/").at(-1));
    else if (p === "/actions/workflows/verify.yml") value = state.workflow;
    else if (p === "/actions/workflows/verify.yml/runs") value = { total_count: state.runs.length, workflow_runs: state.runs.slice((Number(u.searchParams.get("page")) - 1) * 100, Number(u.searchParams.get("page")) * 100) };
    else if (p.startsWith("/actions/runs/")) value = state.run;
    else if (p.startsWith("/compare/")) value = state.compare;
    else throw new Error(`Unexpected GET ${p}`);
    return { status: value ? 200 : 404, json: async () => structuredClone(value) };
  };
  return { state, fetchImpl, options: { source: SOURCE, fetchImpl, now: WHEN, token: "fixture-token" } };
}
const code = expected => error => error.code === expected;

test("semantic release ordering includes numeric rc identifiers and ignores build metadata precedence", () => {
  assert(compareReleaseVersions("v0.1.0-rc.10", "v0.1.0-rc.9") > 0);
  assert(compareReleaseVersions("v0.1.0", "v0.1.0-rc.99") > 0);
  assert(compareReleaseVersions("v2.0.0-alpha.2", "v1.99.99") > 0);
  assert.equal(compareReleaseVersions("1.0.0+one", "v1.0.0+two"), 0);
  for (const bad of ["main", "v1.0", "v1.0.0-rc.01", "v01.0.0", "v1.0.0-"]) assert.equal(parseReleaseVersion(bad), null);
});

test("latest immutable rc resolves exact annotated commit, trusted CI and checked blob digests using GET only", async () => {
  const f = fixture({ mutate: s => { s.annotated = true; } });
  const report = await resolveStandardStack(f.options);
  assert.equal(report.stack.tag, "v0.1.0-rc.10"); assert.equal(report.stack.revision, R);
  assert.equal(report.currentVulnerabilityClearance, "not-checked"); assert.equal(report.writesPerformed, false);
  assert.equal(report.stack.files.length, STACK_FILES.length);
  const validate = new Ajv2020({ strict: true }).compile(JSON.parse(fs.readFileSync(new URL("../schema/standard-stack-report-v1.json", import.meta.url))));
  assert(validate(report), JSON.stringify(validate.errors));
  for (const { url, options } of f.state.requests) {
    assert(url.startsWith("https://api.github.com/repos/denchco/knowledge-base-wiki-standard"));
    assert.equal(options.headers.Authorization, "Bearer fixture-token");
  }
  assert(f.state.requests.some(r => r.url.includes(`/git/commits/${R}`)));
  assert(f.state.requests.every(r => !r.url.includes("/HEAD") && !r.url.includes("/main/")));
});

test("release listing paginates before selecting the semantic newest candidate", async () => {
  const releases = Array.from({ length: 101 }, (_, i) => release(`v0.1.0-rc.${i + 1}`, i + 1));
  const f = fixture({ releases });
  const report = await resolveStandardStack(f.options);
  assert.equal(report.stack.tag, "v0.1.0-rc.101");
  assert(f.state.requests.some(r => r.url.endsWith("/releases?per_page=100&page=2")));
});

test("report schema requires each declared stack file exactly once, regardless of differing hashes", async () => {
  const report = await resolveStandardStack(fixture().options);
  const validate = new Ajv2020({ strict: true }).compile(JSON.parse(fs.readFileSync(new URL("../schema/standard-stack-report-v1.json", import.meta.url))));
  for (const file of STACK_FILES) {
    const duplicate = structuredClone(report);
    const missing = file === "package.json" ? "package-lock.json" : "package.json";
    const replacement = { ...duplicate.stack.files.find(item => item.path === file), sha256: "0".repeat(64) };
    duplicate.stack.files[duplicate.stack.files.findIndex(item => item.path === missing)] = replacement;
    assert.equal(duplicate.stack.files.length, STACK_FILES.length);
    assert.equal(validate(duplicate), false, `Duplicate ${file} with absent ${missing} must fail`);
    assert(validate.errors.some(error => error.keyword === "contains"), JSON.stringify(validate.errors));
    const omitted = structuredClone(report);
    omitted.stack.files = omitted.stack.files.filter(item => item.path !== file);
    assert.equal(validate(omitted), false, `Missing ${file} must fail`);
  }
  assert(validate(report), JSON.stringify(validate.errors));
});

test("mutable, draft, unpublished and same-precedence ambiguous releases cannot establish latest", async () => {
  for (const change of [{ immutable: false }, { draft: true }]) {
    const f = fixture({ releases: [{ ...release(), ...change }] });
    await assert.rejects(resolveStandardStack(f.options), code("STACK-NO-RELEASE"));
  }
  await assert.rejects(resolveStandardStack(fixture({ releases: [{ ...release(), published_at: null }] }).options), code("STACK-IDENTITY"));
  await assert.rejects(resolveStandardStack(fixture({ releases: [release("1.0.0+a", 1), release("v1.0.0+b", 2)] }).options), code("STACK-AMBIGUOUS"));
});

test("newest eligible release cannot fall back to older release when verification is absent or unsuccessful", async () => {
  for (const mutate of [s => { s.runs = []; }, s => { s.run.conclusion = "failure"; }, s => { s.run.status = "in_progress"; }]) {
    const f = fixture({ mutate });
    await assert.rejects(resolveStandardStack(f.options), error => ["STACK-VERIFY-MISSING", "STACK-VERIFY-FAILED"].includes(error.code));
    assert(!f.state.requests.some(r => r.url.includes("/releases/tags/v0.1.0-rc.9")));
  }
});

test("spoofed repository, workflow, branch, event or SHA cannot qualify a release", async () => {
  for (const mutate of [
    s => { s.run.head_sha = OLD; }, s => { s.run.head_commit.id = OLD; },
    s => { s.run.event = "pull_request"; }, s => { s.run.head_branch = "feature"; },
    s => { s.run.workflow_id = 99; }, s => { s.run.path = ".github/workflows/not-verify.yml"; },
    s => { s.run.head_repository = { ...s.repo, id: 99 }; },
    s => { s.run.repository = { ...s.repo, full_name: "attacker/fork" }; },
    s => { s.run.html_url = "https://github.com/attacker/fork/actions/runs/50"; },
  ]) await assert.rejects(resolveStandardStack(fixture({ mutate }).options), code("STACK-VERIFY-IDENTITY"));
});

test("latest run and attempt failures are not masked by earlier success", async () => {
  const f = fixture({ mutate: s => {
    s.runs = [{ ...s.run, id: 49, html_url: `${SOURCE}/actions/runs/49`, updated_at: "2026-10-23T08:30:00Z" }, s.run];
    s.run.run_attempt = 2; s.run.conclusion = "failure";
  } });
  await assert.rejects(resolveStandardStack(f.options), code("STACK-VERIFY-FAILED"));
  const changed = fixture();
  const fetchImpl = async (url, options) => {
    const response = await changed.fetchImpl(url, options);
    if (url.endsWith("/actions/runs/50")) return { status: 200, json: async () => ({ ...await response.json(), run_attempt: 2 }) };
    return response;
  };
  await assert.rejects(resolveStandardStack({ ...changed.options, fetchImpl }), code("STACK-VERIFY-CHANGED"));
});

test("workflow pagination includes a newer failure after a full first page", async () => {
  const f = fixture({ mutate: s => {
    s.runs = Array.from({ length: 101 }, (_, i) => ({ ...s.run, id: i + 1,
      html_url: `${SOURCE}/actions/runs/${i + 1}`, conclusion: i === 100 ? "failure" : "success" }));
    s.run = s.runs[100];
  } });
  await assert.rejects(resolveStandardStack(f.options), code("STACK-VERIFY-FAILED"));
  assert(f.state.requests.some(r => r.url.includes("/runs?") && r.url.endsWith("page=2")));
});

test("a newer release or run appearing during exact file reads invalidates the observation", async () => {
  for (const kind of ["release", "run"]) {
    const f = fixture();
    let changed = false;
    const fetchImpl = async (url, options) => {
      if (url.includes("/git/blobs/") && !changed) {
        changed = true;
        if (kind === "release") f.state.releases.push(release("v0.1.0-rc.11", 11));
        else f.state.runs.push({ ...f.state.run, id: 51, html_url: `${SOURCE}/actions/runs/51`,
          updated_at: "2026-10-23T11:00:00Z", conclusion: "failure" });
      }
      return f.fetchImpl(url, options);
    };
    await assert.rejects(resolveStandardStack({ ...f.options, fetchImpl }), code(kind === "release" ? "STACK-RELEASE" : "STACK-VERIFY-CHANGED"));
  }
});

test("exact release file symlinks, incomplete trees and false blob contents fail closed", async () => {
  await assert.rejects(resolveStandardStack(fixture({ mutate: s => { s.tree[0].mode = "120000"; } }).options), code("STACK-FILES"));
  await assert.rejects(resolveStandardStack(fixture({ mutate: s => { s.tree.pop(); } }).options), code("STACK-FILES"));
  await assert.rejects(resolveStandardStack(fixture({ mutate: s => { [...s.blobs.values()][0].content = Buffer.from("changed").toString("base64"); } }).options), code("STACK-FILES"));
});

test("network failure, malformed results and truncated run pages do not produce a stack", async () => {
  await assert.rejects(resolveStandardStack({ fetchImpl: async () => { throw new Error("offline"); } }), code("STACK-NETWORK"));
  await assert.rejects(resolveStandardStack({ fetchImpl: async () => ({ status: 403 }) }), code("STACK-NETWORK"));
  const f = fixture();
  const fetchImpl = async (url, options) => url.includes("/runs?")
    ? { status: 200, json: async () => ({ total_count: 2, workflow_runs: [f.state.run] }) } : f.fetchImpl(url, options);
  await assert.rejects(resolveStandardStack({ ...f.options, fetchImpl }), code("STACK-PAGINATION"));
});

test("source parsing rejects credentials and third-party hosts before transport", () => {
  assert.equal(canonicalStandardSource(`${SOURCE}.git/`), SOURCE);
  for (const source of ["https://github.com.attacker.test/a/b", "http://github.com/a/b", "https://token@github.com/a/b", `${SOURCE}?token=secret`, `${SOURCE}#main`]) {
    assert.throws(() => createStackRemote(source), code("STACK-SOURCE"));
  }
});

test("existing Wiki checks report ancestry without changing any target bytes or pins", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "standard-stack-target-"));
  try {
    const manifest = `standard:\n  source: ${SOURCE}\n  revision: ${OLD}\nunknown: keep\n`;
    fs.writeFileSync(path.join(root, ".wiki-standard.yaml"), manifest);
    fs.writeFileSync(path.join(root, "subject.md"), "User knowledge\n");
    for (const [status, ahead, behind, merge, relation] of [
      ["ahead", 2, 0, OLD, "update-available"], ["behind", 0, 2, R, "ahead"], ["diverged", 2, 3, TREE, "diverged"],
    ]) {
      const f = fixture({ mutate: s => { Object.assign(s.compare, { status, ahead_by: ahead, behind_by: behind, merge_base_commit: { sha: merge } }); } });
      const report = await checkWikiStack(root, f.options);
      assert.equal(report.relation, relation); assert.equal(report.migration, "explicit-user-selection-and-target-verification-required");
      assert.equal(report.installed.tag, null); assert.equal(report.installed.releaseIdentity, "not-recorded");
      assert.equal(report.installedFileIntegrity, "not-checked");
      assert.equal(fs.readFileSync(path.join(root, ".wiki-standard.yaml"), "utf8"), manifest);
      assert.equal(fs.readFileSync(path.join(root, "subject.md"), "utf8"), "User knowledge\n");
      assert.deepEqual(fs.readdirSync(root).sort(), [".wiki-standard.yaml", "subject.md"]);
    }
    fs.writeFileSync(path.join(root, ".wiki-standard.yaml"), manifest.replace(OLD, R));
    assert.equal((await checkWikiStack(root, fixture().options)).relation, "same");
    fs.writeFileSync(path.join(root, ".wiki-standard.yaml"), manifest.replace(OLD, "main"));
    await assert.rejects(checkWikiStack(root, fixture().options), code("STACK-INSTALLED"));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("installed release tags must bind the exact declared pin, including same-revision checks", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "standard-stack-tag-"));
  const writeManifest = (revision, tag) => {
    const text = `standard:\n  source: ${SOURCE}\n  revision: ${revision}\ncapabilities:\n  standard_release_tag: ${tag}\n`;
    fs.writeFileSync(path.join(root, ".wiki-standard.yaml"), text);
    return text;
  };
  try {
    writeManifest(R, "v0.1.0-rc.10");
    const report = await checkWikiStack(root, fixture().options);
    assert.equal(report.relation, "same"); assert.equal(report.installed.tag, "v0.1.0-rc.10");
    assert.equal(report.installed.releaseIdentity, "verified-immutable-release");
    const validate = new Ajv2020({ strict: true }).compile(JSON.parse(fs.readFileSync(new URL("../schema/standard-stack-report-v1.json", import.meta.url))));
    assert(validate(report), JSON.stringify(validate.errors));
    const original = writeManifest(R, "v0.1.0-rc.9");
    await assert.rejects(checkWikiStack(root, fixture({ mutate: s => { s.tagRevisions["v0.1.0-rc.9"] = OLD; } }).options), code("STACK-INSTALLED"));
    assert.equal(fs.readFileSync(path.join(root, ".wiki-standard.yaml"), "utf8"), original);
    writeManifest(OLD, "v0.1.0-rc.9");
    assert.equal((await checkWikiStack(root, fixture({ mutate: s => { s.tagRevisions["v0.1.0-rc.9"] = OLD; } }).options)).relation, "update-available");
    await assert.rejects(checkWikiStack(root, fixture({ mutate: s => { s.releases[0].immutable = false; } }).options), code("STACK-RELEASE"));
    writeManifest(R, "main");
    await assert.rejects(checkWikiStack(root, fixture().options), code("STACK-INSTALLED"));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("CLI exposes only resolve and read-only check and emits bounded machine failures", async () => {
  let output = "", resolutions = 0;
  const emit = text => { output += text; };
  const report = await resolveStandardStack(fixture().options);
  const deps = { stdout: emit, stderr: emit, resolve: async () => { resolutions++; return report; } };
  assert.equal(await cli(["resolve", "--json"], deps), 0);
  assert.equal(JSON.parse(output).stack.revision, R); assert.equal(resolutions, 1);
  for (const args of [["apply", "--json"], ["resolve", "--output", "/tmp/forbidden", "--json"], ["check", "--json"], ["resolve", "--json", "--json"]]) {
    output = ""; assert.equal(await cli(args, deps), 2); assert.equal(JSON.parse(output).writesPerformed, false);
  }
  assert.equal(resolutions, 1);
  output = "";
  assert.equal(await cli(["check", "/wiki"], { ...deps, check: async () => ({ ...report, operation: "check", relation: "same" }) }), 0);
  assert.match(output, /Declared installed pin: same/);
  assert.match(output, /Local file integrity and conformance not checked/);
});
