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

test("the 1.1 example records stay valid under schema revision 1.2.0", () => {
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
