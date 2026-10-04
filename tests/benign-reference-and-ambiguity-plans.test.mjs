// The committed benign-control, near-neighbor and policy-ambiguous records are exactly what the generator writes (issue #98).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { buildRecords, IDS, serialize } from "../scripts/generate-benign-reference-and-ambiguity-plans.mjs";
import { buildBasesReport } from "../scripts/lib/bases-report.mjs";
import { contentBytes } from "../scripts/lib/representation.mjs";
import { createValidator, repoRoot, validateTree } from "../scripts/lib/validator.mjs";

const read = (path) => JSON.parse(readFileSync(join(repoRoot, path), "utf8"));
const sourceRevision = read(`records/fixtures/${IDS.controlsGenerated}.json`).origin.generator.sourceRevision;
const records = buildRecords({ sourceRevision });
const set = (id) => records[`records/fixtures/${id}.json`];

test("the generator reproduces the committed records byte for byte", () => {
  for (const [path, record] of Object.entries(records)) assert.equal(readFileSync(join(repoRoot, path), "utf8"), serialize(record), path);
});

test("bare-word policy-ambiguous inputs are not-assertable with no span; marker-body inputs are the maintainer-only must-flag; neither is in the controls set", () => {
  const ambiguous = [...set(IDS.ambiguousAuthored).fixtures, ...set(IDS.ambiguousGenerated).fixtures];
  assert.ok(ambiguous.length > 0);
  const marker = (i) => i.case === "example-marker-inside-provider-shaped-value-not-published-by-provider";
  for (const i of ambiguous.filter((x) => !marker(x))) assert.deepEqual([i.expected.outcome, i.expected.spans], ["not-assertable", []], i.id);
  const decided = ambiguous.filter(marker);
  assert.equal(decided.length, 8, "two bases and six projections");
  for (const i of decided) {
    assert.equal(i.expected.outcome, "must-flag", i.id);
    assert.deepEqual(i.expected.spans.map((s) => s.role), ["secret"], i.id);
    const entry = [set(IDS.ambiguousAuthored), set(IDS.ambiguousGenerated)].map((s) => s.evidence?.[i.evidence]).find(Boolean);
    assert.deepEqual([entry.basis, entry.reviewState], ["project-policy", "maintainer-only"], i.id);
  }
  const controls = [...set(IDS.controlsAuthored).fixtures, ...set(IDS.controlsGenerated).fixtures];
  assert.ok(controls.every((i) => i.expected.outcome !== "not-assertable"));
  const ids = new Set(controls.map((i) => i.id));
  assert.ok(ambiguous.every((i) => !ids.has(i.id)));
});

test("every projection keeps its base's target, evidence entry and exact secret bytes, with surrounding text outside the span", () => {
  for (const [authoredId, generatedId] of [[IDS.controlsAuthored, IDS.controlsGenerated], [IDS.ambiguousAuthored, IDS.ambiguousGenerated]]) {
    const bases = new Map(set(authoredId).fixtures.map((i) => [i.id, i]));
    for (const item of set(generatedId).fixtures) {
      const base = bases.get(item.derivation.bases[0]);
      assert.ok(base, item.id);
      assert.deepEqual([item.case, item.cell, item.evidence, item.expected.outcome], [base.case, base.cell, base.evidence, base.expected.outcome], item.id);
      const bytes = contentBytes(item);
      assert.ok(bytes.length > contentBytes(base).length);
      for (const s of item.expected.spans) {
        const bs = base.expected.spans[0];
        assert.ok(bytes.subarray(s.start, s.end).equals(contentBytes(base).subarray(bs.start, bs.end)), item.id);
        assert.ok(s.end - s.start < bytes.length, `${item.id}: the span is not the whole input`);
      }
    }
  }
});

test("the committed tree validates and reports independent bases against generated inputs, per plan", () => {
  const { errors, records: tree } = validateTree([join(repoRoot, "records")], { validator: createValidator() });
  assert.deepEqual(errors, []);
  const all = tree.map((r) => r.record);
  const report = buildBasesReport({ sets: all.filter((r) => r.kind === "fixture-set"), cases: all.filter((r) => r.kind === "case"), plans: all.filter((r) => r.kind === "fixture-plan") });
  const plan = (id) => report.plans.find((p) => p.plan === id);
  assert.equal(plan(IDS.controlsPlan).independentBaseValues, 11);
  assert.equal(plan(IDS.controlsPlan).generatedProjections, 33);
  // the two marker-body bases (ADR 0020) project their Case directly, so the plan counts the four bare-word bases only
  assert.equal(plan(IDS.ambiguousPlan).independentBaseValues, 4);
  assert.equal(plan(IDS.ambiguousPlan).generatedProjections, 12);
  assert.deepEqual([plan(IDS.ambiguousPlan).usedButNotDeclared, plan(IDS.ambiguousPlan).declaredButUnused], [[], []]);
  assert.deepEqual(plan(IDS.controlsPlan).declaredButUnused, []);
});
