import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { join } from "node:path";
import { checkIdentity, collectViolations, identityViolations } from "../scripts/lib/identity.mjs";
import { repoRoot, validateTree } from "../scripts/lib/validator.mjs";
import { example, exampleEntries } from "./helpers.mjs";

const scenario = () => example("scenario", "documentation-placeholder");
const withId = (record, id) => ({ ...record, id });
const at = (name, kind = "scenario") => `records/${kind}s/${name}.json`;

test("clean semantic ids and paths have no violations", () => {
  for (const id of ["documentation-placeholder", "prefix-near-miss", "wrong-alphabet", "public-identifier", "templated-reference", "issuer-claims", "partial-span-leakage", "chunk-boundary"]) {
    assert.deepEqual(identityViolations(withId(scenario(), id), at(id)), [], id);
  }
  for (const { path, record } of exampleEntries()) assert.deepEqual(identityViolations(record, path), [], path);
});

test("migration coordinates in a canonical id are rejected", () => {
  const cases = {
    "beta8-207-placeholder": "beta-coordinate",
    "beta-8-placeholder": "beta-coordinate",
    "placeholder-milestone-6": "milestone-coordinate",
    "milestone6-controls": "milestone-coordinate",
    "placeholder-issue-254": "issue-coordinate",
    "issue254": "issue-coordinate",
    "pr-12-placeholder": "issue-coordinate",
    "redact-secret-101-placeholder": "repository-issue-coordinate",
    "rc2-placeholder": "release-coordinate",
    "release-3-placeholder": "release-coordinate",
    "aws-detector-placeholder": "detector-identifier",
    "trufflehog-placeholder": "scanner-name",
    "gitleaks-near-miss": "scanner-name",
  };
  for (const [id, code] of Object.entries(cases)) {
    assert.ok(identityViolations(withId(scenario(), id), at("clean-name")).includes(code), `${id} should give ${code}`);
  }
});

test("legacy suite names are rejected as an id or id prefix", () => {
  for (const id of ["accuracy", "accuracy-context", "negative-controls", "reference-syntax-bracket", "milestone-6-closed-254-aws"]) {
    assert.ok(identityViolations(withId(scenario(), id), at("clean-name")).includes("legacy-suite-name"), id);
  }
  // A suite name inside a longer, different word sequence is not a suite reference.
  assert.deepEqual(identityViolations(withId(scenario(), "loss-of-accuracy"), at("loss-of-accuracy")), []);
});

test("migration coordinates in a record file path are rejected even with a clean id", () => {
  assert.deepEqual(identityViolations(scenario(), "records/cases/beta8-207/documentation-placeholder.json"), ["beta-coordinate"]);
  assert.deepEqual(identityViolations(scenario(), "records/fixtures/accuracy.json"), ["legacy-suite-name"]);
  assert.deepEqual(identityViolations(scenario(), "records/scenarios/milestone-6/documentation-placeholder.json"), ["milestone-coordinate"]);
});

test("the lint covers scenario, case, fixture-plan and fixture-set and ignores other kinds", () => {
  for (const [kind, id] of [["scenario", "documentation-placeholder"], ["case", "examplecloud-api-key-in-env-assignment"], ["fixture-plan", "examplecloud-api-key-near-misses"], ["fixture-set", "examplecloud-carriers"]]) {
    const bad = withId(example(kind, id), "beta8-207-thing");
    assert.deepEqual(identityViolations(bad, at("clean-name")), ["beta-coordinate"], kind);
  }
  // Fixture projections, contracts and sources are outside the identity scope.
  const fixture = example("fixture-projection", "env-assignment--api-key");
  assert.deepEqual(identityViolations(withId(fixture, "beta8-207--thing"), "x/beta8-207.json"), []);
});

test("a coordinate in a fixture id inside a set is rejected", () => {
  const set = structuredClone(example("fixture-set", "examplecloud-carriers"));
  set.fixtures[0].id = "examplecloud-carriers--beta8-207-variant";
  assert.deepEqual(identityViolations(set, at("examplecloud-carriers", "fixture-set")), ["beta-coordinate"]);
});

test("coordinates are allowed in provenance: externalRefs, imported and the legacy map", () => {
  const s = { ...scenario(), externalRefs: [{ system: "legacy-cases-import", id: "beta8-207-atlassian-api-token-control-placeholder" }] };
  assert.deepEqual(identityViolations(s, at("documentation-placeholder")), []);
  const set = structuredClone(example("fixture-set", "examplecloud-carriers"));
  set.imported = { repository: "o/r", revision: "0".repeat(40), path: "corpora/beta8-207.json", legacyId: "beta8-207" };
  assert.deepEqual(identityViolations(set, at("examplecloud-carriers", "fixture-set")), []);
  const map = example("legacy-map", "examplecloud-import");
  assert.ok(map.entries.some((e) => e.legacy.id.startsWith("beta9-")));
  assert.deepEqual(identityViolations(map, "migration/legacy-map.json"), []);
});

test("a record with a coordinate in its id or path fails; there is no baseline to hide it in", () => {
  const entries = [{ path: at("beta8-207-x"), record: withId(scenario(), "beta8-207-x") }];
  const errors = checkIdentity(entries);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /identity lint: beta-coordinate/);
  assert.deepEqual(checkIdentity([{ path: at("documentation-placeholder"), record: scenario() }]), []);
});

test("a coordinate in a fixture's path inside a set is rejected too", () => {
  const set = structuredClone(example("fixture-set", "examplecloud-carriers"));
  set.fixtures[0].path = "issue-254-changed-id/issue-254-changed-id.txt";
  assert.deepEqual(identityViolations(set, at("examplecloud-carriers", "fixture-set")), ["issue-coordinate"]);
});

test("the repository has zero violations and the baseline mechanics are gone", () => {
  const { records } = validateTree([join(repoRoot, "records"), join(repoRoot, "migration")], { identity: false });
  assert.deepEqual(collectViolations(records), {});
  assert.deepEqual(checkIdentity(records), []);
  assert.ok(!existsSync(join(repoRoot, "scripts", "lint", "identity-baseline.json")));
  const lib = readFileSync(join(repoRoot, "scripts", "lib", "identity.mjs"), "utf8");
  assert.doesNotMatch(lib, /loadBaseline|writeBaseline|BASELINE_PATH|--shrink/);
});

test("npm run lint:identity passes on the repository with zero violations", () => {
  const r = spawnSync(process.execPath, [join(repoRoot, "scripts", "lint-identity.mjs")], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^OK: .* 0 violations/);
});

test("validateTree fails a new record that carries a coordinate and accepts a clean one", () => {
  const dir = mkdtempSync(join(tmpdir(), "identity-"));
  try {
    const policy = { ...scenario(), evidenceBasis: { basis: "project-policy", rationale: "Project policy.", sources: [], observedAt: "2026-09-30" } };
    writeFileSync(join(dir, "ok.json"), JSON.stringify(policy));
    writeFileSync(join(dir, "bad.json"), JSON.stringify(withId(policy, "beta8-207-placeholder")));
    const { errors } = validateTree([dir], { root: dir });
    assert.equal(errors.length, 1, errors.join("\n"));
    assert.match(errors[0], /^bad\.json: identity lint: beta-coordinate/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
