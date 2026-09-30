import assert from "node:assert/strict";
import { test } from "node:test";
import { errorsOf, example, integrityAfter } from "./helpers.mjs";

const rejected = (record, pattern) => {
  const errors = errorsOf(record);
  assert.ok(errors.length > 0, "expected the record to be rejected");
  if (pattern) assert.ok(errors.some((e) => pattern.test(e)), `no error matching ${pattern} in:\n${errors.join("\n")}`);
};
const clone = (r) => structuredClone(r);
const scenario = () => clone(example("scenario", "documentation-placeholder"));
const plan = () => clone(example("fixture-plan", "examplecloud-api-key-near-misses"));
const map = () => clone(example("legacy-map", "examplecloud-import"));

test("the 1.1 and 1.2 example records stay valid under schema revision 1.3.0", () => {
  assert.deepEqual(errorsOf(example("case", "examplecloud-api-key-in-env-assignment")), []);
  assert.deepEqual(errorsOf(example("fixture-set", "examplecloud-carriers")), []);
  assert.deepEqual(errorsOf(example("fixture-projection", "env-assignment--api-key")), []);
});

// --- scenario ---------------------------------------------------------------

test("scenario: requires semantics, outcome class, applicability and evidence basis", () => {
  for (const field of ["semantics", "expectedOutcomeClass", "applicability", "evidenceBasis", "description"]) {
    const s = scenario();
    delete s[field];
    rejected(s, new RegExp(`must have required property '${field}'`));
  }
});

test("scenario: applicability fields must match appliesTo", () => {
  const s = scenario();
  s.applicability = { appliesTo: "families", rationale: "x" };
  rejected(s, /families/);
  s.applicability = { appliesTo: "family-classes", classes: ["a"], families: ["examplecloud:api-key"], rationale: "x" };
  rejected(s);
  s.applicability = { appliesTo: "any-family", classes: ["a"], rationale: "x" };
  rejected(s);
  s.applicability = { appliesTo: "families", families: ["examplecloud:api-key"], rationale: "x" };
  assert.deepEqual(errorsOf(s), []);
});

test("scenario: by-projection is an allowed outcome class, an unknown class is not", () => {
  const s = scenario();
  s.expectedOutcomeClass = "by-projection";
  assert.deepEqual(errorsOf(s), []);
  s.expectedOutcomeClass = "stable";
  rejected(s);
});

test("scenario: unresolved basis forces not-assertable, supported bases need sources", () => {
  const s = scenario();
  s.evidenceBasis = { basis: "unresolved", rationale: "x", sources: [], observedAt: "2026-09-30" };
  rejected(s);
  s.expectedOutcomeClass = "not-assertable";
  assert.deepEqual(errorsOf(s), []);
  const t = scenario();
  t.evidenceBasis.sources = [];
  rejected(t, /fewer than 1 items|must NOT have fewer/);
});

test("scenario: no scanner fields or unknown properties", () => {
  rejected({ ...scenario(), detectors: ["x"] }, /additional properties 'detectors'/);
  rejected({ ...scenario(), supportStatus: "stable" }, /additional properties/);
});

test("scenario: integrity checks families and sources", () => {
  const errors = integrityAfter((entries, get) => {
    const s = get("scenario", "documentation-placeholder");
    s.applicability = { appliesTo: "families", families: ["examplecloud:nope"], rationale: "x" };
    s.evidenceBasis.sources = [{ sourceId: "no-such-source", supports: "x" }];
  });
  assert.ok(errors.some((e) => /unknown family 'examplecloud:nope'/.test(e)));
  assert.ok(errors.some((e) => /unknown evidence-source 'no-such-source'/.test(e)));
});

// --- fixture-plan -----------------------------------------------------------

test("fixture-plan: requires matrix, generation and lineage", () => {
  for (const field of ["matrix", "generation", "lineage"]) {
    const p = plan();
    delete p[field];
    rejected(p, new RegExp(`must have required property '${field}'`));
  }
});

test("fixture-plan: a listed family selection needs ids, all-applicable forbids them", () => {
  const p = plan();
  delete p.matrix.families.ids;
  rejected(p);
  p.matrix.families = { select: "all-applicable", ids: ["examplecloud:api-key"] };
  rejected(p);
  p.matrix.families = { select: "all-applicable" };
  assert.deepEqual(errorsOf(p), []);
});

test("fixture-plan: a plan reclassified from cases must name what it was derived from", () => {
  const p = plan();
  p.lineage = { origin: "reclassified-from-cases" };
  rejected(p);
});

test("fixture-plan: targets resolve and outcomes agree with the target", () => {
  const errors = integrityAfter((entries, get) => {
    const p = get("fixture-plan", "examplecloud-api-key-near-misses");
    p.matrix.targets = [
      { type: "scenario", id: "missing-scenario" },
      { type: "scenario", id: "documentation-placeholder", expectedOutcome: "must-flag" },
      { type: "scenario", id: "truncated-body-near-miss" },
      { type: "case", id: "examplecloud-docs-placeholder-under-credential-name", expectedOutcome: "must-flag" },
    ];
    p.generation.inputs = [{ kind: "case", id: "no-such-case" }];
    p.output = ["no-such-set"];
  });
  assert.ok(errors.some((e) => /unknown scenario 'missing-scenario'/.test(e)));
  assert.ok(errors.some((e) => /'must-flag' disagrees with scenario 'documentation-placeholder'/.test(e)));
  assert.ok(errors.some((e) => /scenario 'truncated-body-near-miss' is by-projection; expectedOutcome is required/.test(e)));
  assert.ok(errors.some((e) => /disagrees with case/.test(e)));
  assert.ok(errors.some((e) => /unknown case 'no-such-case'/.test(e)));
  assert.ok(errors.some((e) => /unknown fixture-set 'no-such-set'/.test(e)));
});

test("fixture-plan: a listed family outside a scenario's listed applicability is rejected", () => {
  const errors = integrityAfter((entries, get) => {
    get("scenario", "documentation-placeholder").applicability = { appliesTo: "families", families: ["examplecloud:webhook-secret"], rationale: "x" };
  });
  assert.ok(errors.some((e) => /family 'examplecloud:api-key' is outside the applicability of scenario 'documentation-placeholder'/.test(e)));
});

test("fixture-plan: all-applicable cannot target a case", () => {
  const errors = integrityAfter((entries, get) => {
    get("fixture-plan", "examplecloud-api-key-near-misses").matrix.families = { select: "all-applicable" };
  });
  assert.ok(errors.some((e) => /a case has no applicability/.test(e)));
});

test("fixture-plan: the example plan and its baseline integrity are clean", () => {
  assert.deepEqual(integrityAfter(() => {}), []);
});

// --- legacy-map -------------------------------------------------------------

test("legacy-map: a dropped entry has a null canonical and a note; others need a canonical", () => {
  const m = map();
  m.entries[4].note = undefined;
  delete m.entries[4].note;
  rejected(m);
  const n = map();
  n.entries[4].canonical = { type: "case", id: "examplecloud-api-key-truncated-body-twin" };
  rejected(n);
  const o = map();
  o.entries[0].canonical = null;
  rejected(o);
});

test("legacy-map: may carry legacy names on the legacy side verbatim", () => {
  const m = map();
  m.entries[0].legacy.id = "beta8-1012a";
  assert.deepEqual(errorsOf(m), []);
});

test("legacy-map: canonical targets must exist and legacy entries must be unique", () => {
  const errors = integrityAfter((entries, get) => {
    const m = get("legacy-map", "examplecloud-import");
    m.entries.push({ ...m.entries[1] });
    m.entries.push({ legacy: { type: "case", id: "beta9-101-other" }, canonical: { type: "scenario", id: "no-such-scenario" }, relation: "same" });
    m.entries.push({ legacy: { type: "fixture", id: "beta9-101--other" }, canonical: { type: "fixture", id: "examplecloud-carriers--no-such" }, relation: "same" });
  });
  assert.ok(errors.some((e) => /duplicate legacy case/.test(e)));
  assert.ok(errors.some((e) => /canonical scenario 'no-such-scenario' does not exist/.test(e)));
  assert.ok(errors.some((e) => /canonical fixture 'examplecloud-carriers--no-such' does not exist/.test(e)));
});

test("review history can target a scenario and a fixture plan", () => {
  const base = clone(example("evidence-review-history", "review-examplecloud-api-key-in-env-assignment"));
  for (const [kind, id] of [["scenario", "documentation-placeholder"], ["fixture-plan", "examplecloud-api-key-near-misses"]]) {
    const r = { ...base, subject: { kind, id } };
    assert.deepEqual(errorsOf(r), []);
  }
  const errors = integrityAfter((entries) => {
    entries.find((e) => e.record.kind === "evidence-review-history").record.subject = { kind: "scenario", id: "missing" };
  });
  assert.ok(errors.some((e) => /subject scenario 'missing' does not exist/.test(e)));
});

// --- schema revision 1.3.0 (ADR 0008): cells, evidence, sparse coverage, fan-out map entries -----------

const cellSet = () => clone(example("fixture-set", "examplecloud-cells"));

test("fixture-set: an item projects exactly one of a case and a plan cell", () => {
  assert.deepEqual(errorsOf(cellSet()), []);
  const both = cellSet();
  both.fixtures[0].case = "examplecloud-api-key-in-env-assignment";
  rejected(both);
  const neither = cellSet();
  delete neither.fixtures[0].cell;
  rejected(neither);
  const noFamilies = cellSet();
  noFamilies.fixtures[0].cell.families = [];
  rejected(noFamilies);
});

test("fixture-set: evidence entries follow the evidence rules (supported bases need sources)", () => {
  const s = cellSet();
  s.evidence["ev-body-length"].sources = [];
  rejected(s, /fewer than 1 items|must NOT have fewer/);
  const t = cellSet();
  t.evidence["ev-placeholder"].basis = "made-up";
  rejected(t);
});

test("cells: the plan, scenario, families, outcome and output sets must all agree", () => {
  const errors = integrityAfter((entries, get) => {
    const set = get("fixture-set", "examplecloud-cells");
    set.fixtures[0].cell.plan = "no-such-plan";
    set.fixtures[1].cell.scenario = "truncated-body-near-miss";
    set.fixtures[1].expected.outcome = "must-flag";
    set.fixtures[1].expected.spans = [{ start: 21, end: 33, role: "secret" }];
    set.fixtures[1].cell.families = ["examplecloud:webhook-secret"];
    get("fixture-plan", "examplecloud-api-key-near-misses").output = ["examplecloud-carriers"];
  });
  assert.ok(errors.some((e) => /cell\.plan 'no-such-plan' does not exist/.test(e)), errors.join("\n"));
  assert.ok(errors.some((e) => /is not an outcome plan 'examplecloud-api-key-near-misses' gives scenario 'truncated-body-near-miss'/.test(e)), errors.join("\n"));
  assert.ok(errors.some((e) => /cell family 'examplecloud:webhook-secret' is not a family of plan/.test(e)));
  assert.ok(errors.some((e) => /declares its output sets but does not list 'examplecloud-cells'/.test(e)));
});

test("cells: a scenario that is not a target of the plan is rejected, and an unresolved evidence entry needs not-assertable", () => {
  const errors = integrityAfter((entries, get) => {
    const set = get("fixture-set", "examplecloud-cells");
    set.fixtures[0].cell.scenario = "documentation-placeholder";
    get("fixture-plan", "examplecloud-api-key-near-misses").matrix.targets = [{ type: "scenario", id: "truncated-body-near-miss", expectedOutcome: "must-not-flag" }];
    set.fixtures[1].expected.outcome = "must-flag";
    set.fixtures[1].expected.spans = [{ start: 21, end: 33, role: "secret" }];
    set.evidence["ev-placeholder"].basis = "unresolved";
  });
  assert.ok(errors.some((e) => /scenario 'documentation-placeholder' is not a target of plan/.test(e)), errors.join("\n"));
  assert.ok(errors.some((e) => /unresolved evidence requires outcome not-assertable/.test(e)), errors.join("\n"));
});

test("evidence keys must resolve and be used", () => {
  const errors = integrityAfter((entries, get) => {
    const set = get("fixture-set", "examplecloud-cells");
    set.fixtures[0].evidence = "ev-missing";
    set.evidence["ev-unused"] = { basis: "project-policy", rationale: "x", sources: [], observedAt: "2026-09-30" };
  });
  assert.ok(errors.some((e) => /evidence 'ev-missing' is not in the set's evidence map/.test(e)));
  assert.ok(errors.some((e) => /evidence 'ev-unused' is cited by no fixture/.test(e)));
});

test("case.scenarios are references to scenario records", () => {
  assert.deepEqual(integrityAfter(() => {}), []);
  const errors = integrityAfter((entries, get) => {
    get("case", "examplecloud-docs-placeholder-under-credential-name").scenarios = ["documentation-placeholder", "not-a-scenario"];
  });
  assert.ok(errors.some((e) => /scenarios: 'not-a-scenario' is not a scenario record/.test(e)));
});

test("fixture-plan: coverage is complete or sparse", () => {
  const p = plan();
  p.matrix.coverage = "sparse";
  assert.deepEqual(errorsOf(p), []);
  p.matrix.coverage = "partial";
  rejected(p);
});

test("legacy-map: one legacy entity may fan out to several canonical records; a legacy suite carries its title", () => {
  const m = map();
  m.entries[0].canonical = [{ type: "scenario", id: "documentation-placeholder" }, { type: "fixture-plan", id: "examplecloud-api-key-near-misses" }];
  assert.deepEqual(errorsOf(m), []);
  m.entries[0].canonical = [{ type: "scenario", id: "documentation-placeholder" }];
  rejected(m);
  const n = map();
  n.entries[0].legacy = { type: "suite", id: "accuracy", path: "fixtures/accuracy/corpus.json", title: "Accuracy", description: "x", scenarioIds: ["regression-behavior"] };
  assert.deepEqual(errorsOf(n), []);
});

test("legacy-map: a legacy entity is listed once across all shards", () => {
  const errors = integrityAfter((entries) => {
    const shard = entries.find((e) => e.record.kind === "legacy-map");
    entries.push({ path: "examples/valid/examplecloud/legacy-map.second-shard.json", record: { ...clone(shard.record), id: "second-shard" } });
  });
  assert.ok(errors.some((e) => /duplicate legacy .* \(also /.test(e)), errors.join("\n"));
});
