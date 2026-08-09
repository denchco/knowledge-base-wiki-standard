import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  approveProposal,
  canonicalPayloadBytes,
  createGitHubRemote,
  deriveProposalId,
  inspectAll,
  inspectRecord,
  linkIssue,
  loadFormContract,
  markerFor,
  openProposal,
  payloadDigest,
  prepareProposal,
  recordAdoption,
  recordDecision,
  recordRelease,
  recordSubmissionObservation,
  registryDiagnostics,
  renderIssuePayload,
  scanProposalSafety,
  stableJson,
  strictJson,
  syncCheck,
} from "./standard-proposal-core.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "scripts/standard-proposal-cli.mjs");
const VALID_FIXTURE = path.join(ROOT, "fixtures/conforming/standard-proposal-valid");
const INVALID_FIXTURES = path.join(ROOT, "fixtures/nonconforming");
const FIXTURE_FORM = readFileSync(path.join(VALID_FIXTURE, "standard-change.yml"), "utf8");
const STANDARD_FORM = readFileSync(path.join(ROOT, "standard-proposals/standard-change-form-v1.yml"), "utf8");
const OLD_STANDARD = "2222222222222222222222222222222222222222";
const RELEASE_REVISION = "4444444444444444444444444444444444444444";
const REGISTRY_REVISION = "5555555555555555555555555555555555555555";

function fixtureRecord() {
  return strictJson(readFileSync(path.join(VALID_FIXTURE, "record.json"), "utf8"), "valid fixture");
}

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function makeConsumer({ formSource = FIXTURE_FORM } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), "dkbws-proposal-"));
  mkdirSync(path.join(root, "evidence"), { recursive: true });
  writeFileSync(path.join(root, ".gitignore"), "output/\n", "utf8");
  writeFileSync(path.join(root, ".wiki-standard.yaml"), `standard:\n  revision: "${OLD_STANDARD}"\n`, "utf8");
  writeFileSync(path.join(root, "evidence/implementation.md"), "# Verified implementation\n", "utf8");
  git(root, ["init", "--quiet"]);
  git(root, ["add", ".gitignore", ".wiki-standard.yaml", "evidence/implementation.md"]);
  git(root, ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "commit", "--quiet", "-m", "implementation"]);
  const implementationCommit = git(root, ["rev-parse", "HEAD"]);
  const record = fixtureRecord();
  record.origin.implementationCommit = implementationCommit;
  record.origin.pinnedStandardRevision = OLD_STANDARD;
  record.target.issueFormSha256 = loadFormContract({ source: formSource }).sha256;
  record.id = deriveProposalId({ slug: record.slug, implementationCommit });
  record.workflow.payload.marker = markerFor(record.id);
  const file = path.join(root, "standard-proposals", `${record.slug}.json`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, stableJson(record), "utf8");
  return { root, file, record, implementationCommit, formSource };
}

function readRecord(consumer) {
  return strictJson(readFileSync(consumer.file, "utf8"), consumer.file);
}

function prepareAndApprove(consumer) {
  const prepared = prepareProposal({
    root: consumer.root,
    selector: consumer.record.slug,
    formSource: consumer.formSource,
    now: new Date("2026-08-07T12:10:00Z"),
  });
  return approveProposal({
    root: consumer.root,
    selector: consumer.record.slug,
    digest: prepared.payload.digest,
    authority: "consumer-maintainer",
    formSource: consumer.formSource,
    now: new Date("2026-08-07T12:11:00Z"),
  });
}

function memoryRemote({
  form = FIXTURE_FORM,
  labels = ["enhancement", "standard-change"],
  issues = [],
  registry = emptyRegistry(),
  registries = null,
  tags = {},
  revisions = null,
  ancestry = null,
  releases = null,
} = {}) {
  const exactRegistries = registries ?? { [REGISTRY_REVISION]: registry };
  const resolvedRevisions = revisions ?? { [REGISTRY_REVISION]: REGISTRY_REVISION };
  const ancestryResults = ancestry ?? { [`${RELEASE_REVISION}..${REGISTRY_REVISION}`]: true };
  const publishedReleases = releases ?? {
    "v1.2.3": { tag_name: "v1.2.3", draft: false, immutable: true },
  };
  return {
    methods: [],
    registryRequests: [],
    async getForm() { this.methods.push("GET"); if (form instanceof Error) throw form; return Buffer.from(form); },
    async getLabels() { this.methods.push("GET"); if (labels instanceof Error) throw labels; return labels; },
    async searchIssues(marker) { this.methods.push("GET"); return issues.filter((issue) => issue.body?.includes(marker)); },
    async searchTitle(title) { this.methods.push("GET"); return issues.filter((issue) => issue.title === title); },
    async getIssue(number) { this.methods.push("GET"); return issues.find((issue) => issue.number === number); },
    async getRegistry(revision = null) {
      this.methods.push("GET");
      this.registryRequests.push(revision);
      return revision ? exactRegistries[revision] ?? null : registry;
    },
    async getRelease(tag) { this.methods.push("GET"); return publishedReleases[tag] ?? null; },
    async resolveRevision(revision) { this.methods.push("GET"); return resolvedRevisions[revision] ?? null; },
    async isDescendant(ancestor, descendant) { this.methods.push("GET"); return ancestryResults[`${ancestor}..${descendant}`] === true; },
    async resolveTag(tag) { this.methods.push("GET"); if (!tags[tag]) throw new Error(`missing tag ${tag}`); return tags[tag]; },
  };
}

function emptyRegistry(entries = []) {
  return {
    $schema: "https://denchco.github.io/knowledge-base-wiki-documentation/schema/standard-proposal-registry-v1.json",
    registryVersion: "1.0",
    targetRepository: "https://github.com/denchco/knowledge-base-wiki-standard",
    entries,
  };
}

function acceptedRegistryEntry(record, {
  tag = "v1.2.3",
  revision = RELEASE_REVISION,
  issue = { url: "https://github.com/denchco/knowledge-base-wiki-standard/issues/1", number: 1 },
} = {}) {
  return {
    id: record.id,
    marker: record.workflow.payload.marker,
    intakeMode: "governed-issue",
    origin: {
      project: record.origin.project,
      publicUrl: record.origin.publicUrl,
      implementationCommit: record.origin.implementationCommit,
      verificationCommit: record.origin.implementationCommit,
      pinnedStandardRevision: record.origin.pinnedStandardRevision,
    },
    issue,
    classification: record.workflow.upstream.classification,
    decision: "accepted",
    decisionDate: record.workflow.upstream.decidedAt,
    decisionRevision: record.workflow.upstream.decisionRevision,
    decisionEvidence: record.workflow.upstream.evidence,
    acceptedRequirements: [...record.workflow.acceptance.requirementIds],
    release: { status: "included", tag, revision, recordedAt: "2026-08-07T12:30:00Z" },
    notes: "Published acceptance and immutable release fixture.",
  };
}

function treeHash(root) {
  const hash = createHash("sha256");
  function visit(directory) {
    for (const name of readdirSync(directory).sort()) {
      if (name === ".git") continue;
      const file = path.join(directory, name);
      hash.update(path.relative(root, file));
      if (statSync(file).isDirectory()) visit(file);
      else hash.update(readFileSync(file));
    }
  }
  visit(root);
  return hash.digest("hex");
}

function cli(...args) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd: ROOT, encoding: "utf8" });
}

test("deterministic ID preserves the historical bridge identity", () => {
  assert.equal(
    deriveProposalId({
      slug: "uk-digital-health-reader-source-navigation",
      implementationCommit: "3a085ebbfa66dea87d96700c7a735cf65def5ef6",
    }),
    "DKBWS-PROP-uk-digital-health-reader-source-navigation-38f4b5cbcddce10fbcde32f70862143b",
  );
});

test("valid fixture renders fixed-key canonical bytes with the marker as the final byte token", () => {
  const record = fixtureRecord();
  const inspected = inspectRecord(record, { formSource: FIXTURE_FORM, resolveProvenance: false });
  assert.deepEqual(inspected.diagnostics, []);
  const rendered = renderIssuePayload(record, { formSource: FIXTURE_FORM });
  assert.equal(rendered.digest, "02a495aeac79a14766c2cc64f24a8d119c2bcdac1f078b37db7b64025f722ae6");
  assert.equal(rendered.payload.body.endsWith(record.workflow.payload.marker), true);
  assert.equal(rendered.payload.body.endsWith("\n"), false);
  assert.equal(rendered.payload.body.split(record.workflow.payload.marker).length - 1, 1);
  const expected = JSON.stringify({
    repository: rendered.payload.repository,
    title: rendered.payload.title,
    labels: rendered.payload.labels,
    body: rendered.payload.body,
  });
  assert.equal(canonicalPayloadBytes(rendered.payload).toString("utf8"), expected);
  assert.equal(payloadDigest(rendered.payload), rendered.digest);
  assert.equal(canonicalPayloadBytes(rendered.payload).includes(10, canonicalPayloadBytes(rendered.payload).length - 1), false);
});

test("form contract, illegal state, safety, and duplicate identity fail closed", () => {
  const brokenForm = readFileSync(path.join(INVALID_FIXTURES, "standard-proposal-form/standard-change.yml"), "utf8");
  assert.throws(() => loadFormContract({ source: brokenForm }), (error) => error.code === "DKBWS-PROP-FORM-CONTRACT-001");

  const state = fixtureRecord();
  state.workflow.upstream.decision = "accepted";
  assert.ok(inspectRecord(state, { formSource: FIXTURE_FORM, resolveProvenance: false }).diagnostics.some((item) => item.code === "DKBWS-PROP-SCHEMA-001"));

  const directPrepared = fixtureRecord();
  directPrepared.workflow.local.implementationStatus = "pending";
  directPrepared.workflow.local.verificationStatus = "pending";
  directPrepared.workflow.payload = {
    ...directPrepared.workflow.payload,
    status: "prepared",
    digest: "a".repeat(64),
    formSha256: "b".repeat(64),
    preparedAt: "2026-08-07T12:00:00Z",
  };
  assert.ok(inspectRecord(directPrepared, { formSource: FIXTURE_FORM, resolveProvenance: false }).diagnostics.some(
    (item) => item.code === "DKBWS-PROP-STATE-TRANSITION-001" && item.message.includes("complete implementation"),
  ));

  const directDecision = fixtureRecord();
  directDecision.workflow.upstream = {
    classification: "reusable",
    decision: "accepted",
    decidedAt: "2026-08-07T12:00:00Z",
    decisionRevision: "c".repeat(40),
    evidence: "Decision evidence",
    rationale: "Reusable result",
  };
  directDecision.workflow.acceptance.requirementIds = ["DKBWS-LINK-002"];
  assert.ok(inspectRecord(directDecision, { formSource: FIXTURE_FORM, resolveProvenance: false }).diagnostics.some(
    (item) => item.code === "DKBWS-PROP-STATE-TRANSITION-001" && item.message.includes("governed issue linkage"),
  ));

  const unsafe = fixtureRecord();
  unsafe.change.problem = "Credential token=ghp_abcdefghijklmnopqrstuvwxyz123456 at /Users/example/private";
  assert.deepEqual(new Set(scanProposalSafety(unsafe).map((item) => item.code)), new Set([
    "DKBWS-PROP-SECRET-001",
    "DKBWS-PROP-PRIVATE-PATH-001",
  ]));

  const duplicate = fixtureRecord();
  const records = [{ record: duplicate }, { record: structuredClone(duplicate) }];
  const codes = inspectRecord(duplicate, { formSource: FIXTURE_FORM, resolveProvenance: false, allRecords: records }).diagnostics.map((item) => item.code);
  assert.ok(codes.includes("DKBWS-PROP-ID-DUPLICATE-001"));
  assert.ok(codes.includes("DKBWS-PROP-MARKER-DUPLICATE-001"));
});

test("the pre-registry exception is bound to the one immutable historical bridge", () => {
  const historicalRegistry = strictJson(readFileSync(path.join(ROOT, "standard-proposals/registry.json"), "utf8"), "historical registry");
  assert.deepEqual(registryDiagnostics(historicalRegistry), []);

  const forged = acceptedRegistryEntry(fixtureRecord());
  forged.intakeMode = "pre-registry-local-history";
  forged.issue = null;
  const diagnostics = registryDiagnostics(emptyRegistry([forged]));
  assert.ok(diagnostics.some((item) => item.code === "DKBWS-PROP-HISTORICAL-BRIDGE-001"));

  const root = mkdtempSync(path.join(os.tmpdir(), "dkbws-proposal-registry-"));
  try {
    mkdirSync(path.join(root, "standard-proposals"), { recursive: true });
    writeFileSync(path.join(root, "standard-proposals/registry.json"), stableJson(emptyRegistry([forged])), "utf8");
    const inspected = inspectAll({ root, formSource: FIXTURE_FORM, resolveProvenance: false });
    assert.equal(inspected.status, "invalid");
    assert.ok(inspected.diagnostics.some((item) => item.code === "DKBWS-PROP-HISTORICAL-BRIDGE-001"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the GitHub release-proof adapter remains GET-only and reads registry bytes by exact revision", async () => {
  const registry = emptyRegistry();
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, method: options?.method });
    let value;
    if (url.includes("/contents/standard-proposals/registry.json")) {
      value = { encoding: "base64", content: Buffer.from(stableJson(registry)).toString("base64") };
    } else if (url.includes(`/commits/${REGISTRY_REVISION}`)) {
      value = { sha: REGISTRY_REVISION };
    } else if (url.includes(`/compare/${RELEASE_REVISION}...${REGISTRY_REVISION}`)) {
      value = { status: "ahead" };
    } else if (url.includes("/releases/tags/v1.2.3")) {
      value = { tag_name: "v1.2.3", draft: false, immutable: true };
    } else if (url.includes("/git/ref/tags/v1.2.3")) {
      value = { object: { type: "commit", sha: RELEASE_REVISION } };
    } else {
      return { ok: false, status: 404, async json() { return {}; } };
    }
    return { ok: true, status: 200, async json() { return value; } };
  };
  const remote = createGitHubRemote(undefined, { fetchImpl });
  assert.deepEqual(await remote.getRegistry(REGISTRY_REVISION), registry);
  assert.equal(await remote.resolveRevision(REGISTRY_REVISION), REGISTRY_REVISION);
  assert.equal(await remote.isDescendant(RELEASE_REVISION, REGISTRY_REVISION), true);
  assert.deepEqual(await remote.getRelease("v1.2.3"), { tag_name: "v1.2.3", draft: false, immutable: true });
  assert.equal(await remote.resolveTag("v1.2.3"), RELEASE_REVISION);
  assert.equal(calls.every((call) => call.method === "GET"), true);
  assert.ok(calls.some((call) => call.url.endsWith(`/contents/standard-proposals/registry.json?ref=${REGISTRY_REVISION}`)));
});

test("prepare binds the form, approval becomes stale on payload change, and both submission observations freeze payload", () => {
  for (const status of ["submission-ambiguous", "submitted-unlinked"]) {
    const consumer = makeConsumer();
    try {
      const approved = prepareAndApprove(consumer);
      assert.equal(approved.record.workflow.approval.status, "approved");
      recordSubmissionObservation({
        root: consumer.root,
        selector: consumer.record.slug,
        status,
        formSource: FIXTURE_FORM,
        now: new Date("2026-08-07T12:12:00Z"),
      });
      assert.equal(readRecord(consumer).workflow.issue.status, status);
      assert.throws(
        () => prepareProposal({ root: consumer.root, selector: consumer.record.slug, formSource: FIXTURE_FORM }),
        (error) => error.code === "DKBWS-PROP-STATE-TRANSITION-001",
      );
    } finally {
      rmSync(consumer.root, { recursive: true, force: true });
    }
  }

  const consumer = makeConsumer();
  try {
    prepareAndApprove(consumer);
    const changed = readRecord(consumer);
    changed.change.intendedOutcome += " The governed result is explicit.";
    writeFileSync(consumer.file, stableJson(changed), "utf8");
    const prepared = prepareProposal({ root: consumer.root, selector: consumer.record.slug, formSource: FIXTURE_FORM });
    assert.equal(prepared.record.workflow.approval.status, "stale");
    assert.notEqual(prepared.record.workflow.approval.digest, prepared.record.workflow.payload.digest);
  } finally {
    rmSync(consumer.root, { recursive: true, force: true });
  }
});

test("open is GET-only, reconciles one marker, and preserves exact review data on form or label failure", async () => {
  const consumer = makeConsumer();
  try {
    prepareAndApprove(consumer);
    const record = readRecord(consumer);
    const rendered = renderIssuePayload(record, { formSource: FIXTURE_FORM });
    const remote = memoryRemote();
    const ready = await openProposal({ root: consumer.root, selector: record.slug, remote, formSource: FIXTURE_FORM });
    assert.equal(ready.status, "ready-for-user-submission");
    assert.deepEqual(remote.methods, ["GET", "GET", "GET", "GET"]);
    assert.equal(ready.payload.payload.body, rendered.payload.body);

    const issue = {
      number: 17,
      html_url: "https://github.com/denchco/knowledge-base-wiki-standard/issues/17",
      state: "open",
      title: rendered.payload.title,
      labels: rendered.payload.labels,
      body: rendered.payload.body,
    };
    const reconciled = await openProposal({ root: consumer.root, selector: record.slug, remote: memoryRemote({ issues: [issue] }), formSource: FIXTURE_FORM });
    assert.equal(reconciled.status, "reconcile-existing");

    for (const failingRemote of [memoryRemote({ form: new Error("404") }), memoryRemote({ labels: new Error("404") })]) {
      await assert.rejects(
        openProposal({ root: consumer.root, selector: record.slug, remote: failingRemote, formSource: FIXTURE_FORM }),
        (error) => {
          assert.match(error.code, /FORM-UNPUBLISHED|LABEL-UNAVAILABLE/);
          assert.equal(error.details.body, rendered.payload.body);
          assert.equal(error.details.sha256, rendered.digest);
          assert.equal(error.details.formSha256, rendered.formSha256);
          return true;
        },
      );
    }
  } finally {
    rmSync(consumer.root, { recursive: true, force: true });
  }
});

test("CLI open emits structured approved payload when the public form is absent and show refuses unsafe records without writes", () => {
  const consumer = makeConsumer({ formSource: STANDARD_FORM });
  const remoteRoot = mkdtempSync(path.join(os.tmpdir(), "dkbws-proposal-remote-"));
  try {
    prepareAndApprove(consumer);
    writeFileSync(path.join(remoteRoot, "labels.json"), stableJson(["enhancement", "standard-change"]), "utf8");
    writeFileSync(path.join(remoteRoot, "issues.json"), stableJson([]), "utf8");
    writeFileSync(path.join(remoteRoot, "registry.json"), stableJson(emptyRegistry()), "utf8");
    const opened = cli("open", consumer.record.slug, "--root", consumer.root, "--remote-fixture", remoteRoot, "--no-browser", "--json");
    assert.equal(opened.status, 1);
    const failure = JSON.parse(opened.stderr);
    assert.equal(failure.code, "DKBWS-PROP-FORM-UNPUBLISHED-001");
    assert.equal(failure.payload.body.endsWith(readRecord(consumer).workflow.payload.marker), true);
    assert.equal(failure.payload.sha256, readRecord(consumer).workflow.payload.digest);

    const unsafe = readRecord(consumer);
    unsafe.change.problem = "token=ghp_abcdefghijklmnopqrstuvwxyz123456 at /Users/example/private";
    writeFileSync(consumer.file, stableJson(unsafe), "utf8");
    const before = readFileSync(consumer.file, "utf8");
    const shown = cli("show", consumer.record.slug, "--root", consumer.root, "--json");
    assert.equal(shown.status, 1);
    assert.equal(JSON.parse(shown.stderr).code, "DKBWS-PROP-SECRET-001");
    assert.equal(readFileSync(consumer.file, "utf8"), before);
  } finally {
    rmSync(consumer.root, { recursive: true, force: true });
    rmSync(remoteRoot, { recursive: true, force: true });
  }
});

test("exact marker reconciliation links a closed issue but closure remains informational, not acceptance", async () => {
  const consumer = makeConsumer();
  try {
    prepareAndApprove(consumer);
    const record = readRecord(consumer);
    const rendered = renderIssuePayload(record, { formSource: FIXTURE_FORM });
    const issue = {
      number: 31,
      html_url: "https://github.com/denchco/knowledge-base-wiki-standard/issues/31",
      state: "closed",
      title: rendered.payload.title,
      labels: rendered.payload.labels,
      body: rendered.payload.body,
    };
    const linked = await linkIssue({
      root: consumer.root,
      selector: record.slug,
      issueUrl: issue.html_url,
      remote: memoryRemote({ issues: [issue] }),
      formSource: FIXTURE_FORM,
      now: new Date("2026-08-07T12:20:00Z"),
    });
    assert.equal(linked.record.workflow.issue.status, "linked");
    assert.equal(linked.record.workflow.upstream.decision, "pending");
    const diagnostics = inspectRecord(linked.record, { root: consumer.root, file: consumer.file, formSource: FIXTURE_FORM }).diagnostics;
    assert.ok(diagnostics.some((item) => item.code === "DKBWS-PROP-CLOSED-NOT-DECISION-001" && item.severity === "info"));
    assert.equal(diagnostics.some((item) => item.severity === "error"), false);
  } finally {
    rmSync(consumer.root, { recursive: true, force: true });
  }
});

test("registry rejects duplicate issue identity and non-deterministic accepted-requirement ordering", () => {
  const makePending = (slug, commit) => {
    const id = deriveProposalId({ slug, implementationCommit: commit });
    return {
      id,
      marker: markerFor(id),
      intakeMode: "governed-issue",
      origin: { project: slug, publicUrl: null, implementationCommit: commit, verificationCommit: commit, pinnedStandardRevision: OLD_STANDARD },
      issue: { url: "https://github.com/denchco/knowledge-base-wiki-standard/issues/7", number: 7 },
      classification: "pending",
      decision: "pending",
      decisionDate: null,
      decisionRevision: null,
      decisionEvidence: null,
      acceptedRequirements: [],
      release: { status: "pending", tag: null, revision: null, recordedAt: null },
      notes: "Pending governed intake.",
    };
  };
  const duplicateEntries = [makePending("alpha-proposal", "a".repeat(40)), makePending("beta-proposal", "b".repeat(40))]
    .sort((left, right) => left.id.localeCompare(right.id));
  const duplicateCodes = registryDiagnostics(emptyRegistry(duplicateEntries)).map((item) => item.code);
  assert.equal(duplicateCodes.filter((code) => code === "DKBWS-PROP-ISSUE-DUPLICATE-001").length, 2);

  const accepted = acceptedRegistryEntry({
    ...fixtureRecord(),
    workflow: {
      ...fixtureRecord().workflow,
      upstream: { classification: "reusable", decision: "accepted", decidedAt: "2026-08-07T12:00:00Z", decisionRevision: "c".repeat(40), evidence: "Decision evidence", rationale: "Reusable result" },
      acceptance: { requirementIds: ["DKBWS-ZZZ-002", "DKBWS-AAA-001"] },
    },
  });
  accepted.acceptedRequirements = ["DKBWS-ZZZ-002", "DKBWS-AAA-001"];
  assert.ok(registryDiagnostics(emptyRegistry([accepted])).some((item) => item.code === "DKBWS-PROP-REGISTRY-ORDER-001"));
});

test("decision, immutable release ledger, read-only sync, and authorised adoption remain separate", async () => {
  const consumer = makeConsumer();
  try {
    prepareAndApprove(consumer);
    const prepared = readRecord(consumer);
    const rendered = renderIssuePayload(prepared, { formSource: FIXTURE_FORM });
    const issue = {
      number: 41,
      html_url: "https://github.com/denchco/knowledge-base-wiki-standard/issues/41",
      state: "open",
      title: rendered.payload.title,
      labels: rendered.payload.labels,
      body: rendered.payload.body,
    };
    await linkIssue({ root: consumer.root, selector: prepared.slug, issueUrl: issue.html_url, remote: memoryRemote({ issues: [issue] }), formSource: FIXTURE_FORM });
    assert.throws(
      () => recordDecision({ root: consumer.root, selector: prepared.slug, decision: "accepted", classification: "reusable", decisionRevision: "c".repeat(40), evidence: "Decision evidence", rationale: "Reusable result", requirementIds: [] }),
      /at least one requirement/,
    );
    const decided = recordDecision({
      root: consumer.root,
      selector: prepared.slug,
      decision: "accepted",
      classification: "reusable",
      decisionRevision: "c".repeat(40),
      evidence: "Decision evidence",
      rationale: "Reusable result",
      requirementIds: ["DKBWS-LINK-002"],
      formSource: FIXTURE_FORM,
      now: new Date("2026-08-07T12:25:00Z"),
    }).record;
    const entry = acceptedRegistryEntry(decided, { issue: { url: issue.html_url, number: issue.number } });
    const registry = emptyRegistry([entry]);
    await assert.rejects(
      recordRelease({
        root: consumer.root,
        selector: prepared.slug,
        tag: "v1.2.3",
        revision: RELEASE_REVISION,
        registryRevision: REGISTRY_REVISION,
        remote: memoryRemote({ registry, tags: { "v1.2.3": RELEASE_REVISION }, revisions: { [REGISTRY_REVISION]: "6".repeat(40) } }),
      }),
      (error) => error.code === "DKBWS-PROP-REGISTRY-REVISION-001",
    );
    await assert.rejects(
      recordRelease({
        root: consumer.root,
        selector: prepared.slug,
        tag: "v1.2.3",
        revision: RELEASE_REVISION,
        registryRevision: REGISTRY_REVISION,
        remote: memoryRemote({ registry, tags: { "v1.2.3": RELEASE_REVISION }, ancestry: {} }),
      }),
      (error) => error.code === "DKBWS-PROP-REGISTRY-ANCESTRY-001",
    );
    for (const releases of [
      {},
      { "v1.2.3": { tag_name: "v1.2.3", draft: true, immutable: true } },
      { "v1.2.3": { tag_name: "v1.2.3", draft: false, immutable: false } },
    ]) {
      await assert.rejects(
        recordRelease({
          root: consumer.root,
          selector: prepared.slug,
          tag: "v1.2.3",
          revision: RELEASE_REVISION,
          registryRevision: REGISTRY_REVISION,
          remote: memoryRemote({ registry, tags: { "v1.2.3": RELEASE_REVISION }, releases }),
        }),
        (error) => error.code === "DKBWS-PROP-RELEASE-IMMUTABLE-001",
      );
    }
    await assert.rejects(
      recordRelease({ root: consumer.root, selector: prepared.slug, tag: "v1.2.3", revision: RELEASE_REVISION, registryRevision: REGISTRY_REVISION, remote: memoryRemote({ registry, tags: { "v1.2.3": "f".repeat(40) } }) }),
      (error) => error.code === "DKBWS-PROP-RELEASE-001",
    );
    const remote = memoryRemote({ issues: [issue], registry, tags: { "v1.2.3": RELEASE_REVISION } });
    const released = await recordRelease({
      root: consumer.root,
      selector: prepared.slug,
      tag: "v1.2.3",
      revision: RELEASE_REVISION,
      registryRevision: REGISTRY_REVISION,
      remote,
      now: new Date("2026-08-07T12:31:00Z"),
    });
    assert.equal(released.record.workflow.release.status, "included");
    assert.deepEqual(remote.registryRequests, [REGISTRY_REVISION]);
    await assert.rejects(
      recordRelease({
        root: consumer.root,
        selector: prepared.slug,
        tag: "v1.2.3",
        revision: RELEASE_REVISION,
        registryRevision: REGISTRY_REVISION,
        remote,
      }),
      (error) => error.code === "DKBWS-PROP-STATE-TRANSITION-001",
    );

    const directAdoption = readRecord(consumer);
    directAdoption.workflow.adoption = {
      status: "adopted",
      authority: { by: "direct-editor", at: "2026-08-07T12:32:00Z" },
      fromStandardRevision: OLD_STANDARD,
      toStandardRevision: RELEASE_REVISION,
      consumerRevision: "f".repeat(40),
      adoptedAt: "2026-08-07T12:32:00Z",
      verification: ["Unverified direct edit"],
    };
    writeFileSync(consumer.file, stableJson(directAdoption), "utf8");
    assert.ok(inspectAll({ root: consumer.root, formSource: FIXTURE_FORM }).diagnostics.some(
      (item) => item.code === "DKBWS-PROP-ADOPTION-AUTHORITY-001" && item.message.includes("does not resolve"),
    ));
    writeFileSync(consumer.file, stableJson(released.record), "utf8");

    const before = treeHash(consumer.root);
    const syncRemote = memoryRemote({ issues: [issue], registry, tags: { "v1.2.3": RELEASE_REVISION } });
    const first = await syncCheck({ root: consumer.root, remote: syncRemote, formSource: FIXTURE_FORM });
    const second = await syncCheck({ root: consumer.root, remote: syncRemote, formSource: FIXTURE_FORM });
    assert.equal(first.status, "current");
    assert.deepEqual(second.diagnostics, first.diagnostics);
    assert.ok(first.diagnostics.some((item) => item.code === "DKBWS-PROP-RELEASE-AVAILABLE-001"));
    assert.equal(treeHash(consumer.root), before);
    assert.equal(syncRemote.methods.every((method) => method === "GET"), true);
    assert.ok(syncRemote.registryRequests.includes(REGISTRY_REVISION));

    const exactReleasedRecord = readRecord(consumer);
    const falseRegistryRevision = structuredClone(exactReleasedRecord);
    falseRegistryRevision.workflow.release.registryRevision = "6".repeat(40);
    writeFileSync(consumer.file, stableJson(falseRegistryRevision), "utf8");
    const falseRevisionSync = await syncCheck({
      root: consumer.root,
      remote: memoryRemote({ issues: [issue], registry, tags: { "v1.2.3": RELEASE_REVISION } }),
      formSource: FIXTURE_FORM,
    });
    assert.equal(falseRevisionSync.status, "invalid");
    assert.ok(falseRevisionSync.diagnostics.some((item) => item.code === "DKBWS-PROP-REGISTRY-REVISION-001"));
    writeFileSync(consumer.file, stableJson(exactReleasedRecord), "utf8");

    const tamperedIssue = { ...issue, title: `${issue.title} altered` };
    const tamperedSync = await syncCheck({
      root: consumer.root,
      remote: memoryRemote({ issues: [tamperedIssue], registry, tags: { "v1.2.3": RELEASE_REVISION } }),
      formSource: FIXTURE_FORM,
    });
    assert.equal(tamperedSync.status, "invalid");
    assert.ok(tamperedSync.diagnostics.some((item) => item.code === "DKBWS-PROP-ISSUE-PAYLOAD-001"));

    assert.throws(
      () => recordAdoption({ root: consumer.root, selector: prepared.slug, authority: "separate-consumer-authority", fromStandardRevision: OLD_STANDARD, toStandardRevision: RELEASE_REVISION, consumerRevision: consumer.implementationCommit, verification: ["npm run verify passed"] }),
      (error) => error.code === "DKBWS-PROP-ADOPTION-AUTHORITY-001",
    );
    writeFileSync(path.join(consumer.root, ".wiki-standard.yaml"), `standard:\n  revision: "${RELEASE_REVISION}"\n`, "utf8");
    git(consumer.root, ["add", ".wiki-standard.yaml"]);
    git(consumer.root, ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "commit", "--quiet", "-m", "adopt release"]);
    const consumerRevision = git(consumer.root, ["rev-parse", "HEAD"]);
    assert.throws(
      () => recordAdoption({ root: consumer.root, selector: prepared.slug, authority: "separate-consumer-authority", fromStandardRevision: "3".repeat(40), toStandardRevision: RELEASE_REVISION, consumerRevision, verification: ["npm run verify passed"] }),
      (error) => error.code === "DKBWS-PROP-ADOPTION-AUTHORITY-001",
    );
    const adopted = recordAdoption({
      root: consumer.root,
      selector: prepared.slug,
      authority: "separate-consumer-authority",
      fromStandardRevision: OLD_STANDARD,
      toStandardRevision: RELEASE_REVISION,
      consumerRevision,
      verification: ["npm run verify passed"],
      now: new Date("2026-08-07T12:40:00Z"),
    });
    assert.equal(adopted.record.workflow.adoption.status, "adopted");
    assert.equal(adopted.record.workflow.adoption.authority.by, "separate-consumer-authority");
  } finally {
    rmSync(consumer.root, { recursive: true, force: true });
  }
});

test("check is repeatable and read-only for a valid tracked proposal", () => {
  const consumer = makeConsumer();
  try {
    const before = treeHash(consumer.root);
    const first = inspectAll({ root: consumer.root, formSource: FIXTURE_FORM });
    const second = inspectAll({ root: consumer.root, formSource: FIXTURE_FORM });
    assert.equal(first.status, "valid");
    assert.deepEqual(second.diagnostics, first.diagnostics);
    assert.equal(first.readOnly, true);
    assert.equal(first.writesPerformed, false);
    assert.equal(treeHash(consumer.root), before);
  } finally {
    rmSync(consumer.root, { recursive: true, force: true });
  }
});
