// The committed context, repeated-secret and large-input records are exactly what the generator writes (issue #99).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { buildRecords, fillerFor, IDS, SEED, serialize } from "../scripts/generate-context-large-input-plans.mjs";
import { buildBasesReport } from "../scripts/lib/bases-report.mjs";
import { contentBytes } from "../scripts/lib/representation.mjs";
import { createValidator, repoRoot, validateTree } from "../scripts/lib/validator.mjs";

const read = (path) => JSON.parse(readFileSync(join(repoRoot, path), "utf8"));
const committed = read(`records/fixtures/${IDS.largeSet}.json`);
const sourceRevision = committed.origin.generator.sourceRevision;

test("the generator reproduces the committed records byte for byte, so a regeneration is a no-op", () => {
  const records = buildRecords({ sourceRevision });
  for (const [path, record] of Object.entries(records)) assert.equal(readFileSync(join(repoRoot, path), "utf8"), serialize(record), path);
});

test("the output depends on the seed and on nothing else", () => {
  const a = buildRecords({ sourceRevision });
  const again = buildRecords({ sourceRevision });
  assert.deepEqual(a, again);
  const other = [...Array(64).keys()].map((n) => `seed-${n}`).find((s) => fillerFor(s) !== fillerFor(SEED));
  const changed = buildRecords({ sourceRevision, seed: other });
  assert.notEqual(JSON.stringify(a[`records/fixtures/${IDS.largeSet}.json`]), JSON.stringify(changed[`records/fixtures/${IDS.largeSet}.json`]));
});

test("eight authored bases, 122 correlated projections, no Case and no Scenario of its own", () => {
  const records = Object.values(buildRecords({ sourceRevision }));
  assert.deepEqual([...new Set(records.map((r) => r.kind))].sort(), ["fixture-plan", "fixture-set"]);
  const sets = records.filter((r) => r.kind === "fixture-set");
  const items = sets.flatMap((s) => s.fixtures);
  assert.equal(items.filter((i) => i.derivation.kind === "authored-base").length, 8);
  assert.equal(items.filter((i) => i.derivation.kind === "projection").length, 122);
  assert.ok(items.every((i) => i.case === undefined && i.cell), "every item projects a plan cell, never a Case");
});

test("every occurrence of a secret has its own span and its own base, in every input", () => {
  const records = buildRecords({ sourceRevision });
  const sets = Object.values(records).filter((r) => r.kind === "fixture-set");
  const items = new Map(sets.flatMap((s) => s.fixtures.map((i) => [i.id, i])));
  const baseBytes = (id) => contentBytes(items.get(id));
  for (const item of items.values()) {
    if (item.derivation.kind !== "projection") continue;
    const bytes = contentBytes(item, baseBytes);
    for (const s of item.expected.spans) {
      const base = items.get(s.base);
      const span = base.expected.spans[0];
      assert.ok(bytes.subarray(s.start, s.end).equals(contentBytes(base).subarray(span.start, span.end)), `${item.id}: span holds its base value`);
    }
    const occurrences = item.recipe?.parts.filter((p) => p.fixture).length;
    if (occurrences !== undefined) assert.equal(item.expected.spans.length, occurrences, `${item.id}: one span per inserted occurrence`);
  }
});

test("the committed tree validates and reports eight independent bases against 122 generated inputs, per plan", () => {
  const { errors, records } = validateTree([join(repoRoot, "records")], { validator: createValidator() });
  assert.deepEqual(errors, []);
  const all = records.map((r) => r.record);
  const report = buildBasesReport({ sets: all.filter((r) => r.kind === "fixture-set"), cases: all.filter((r) => r.kind === "case"), plans: all.filter((r) => r.kind === "fixture-plan") });
  const plan = (id) => report.plans.find((p) => p.plan === id);
  assert.equal(plan(IDS.largePlan).independentBaseValues, 8);
  assert.equal(plan(IDS.largePlan).generatedProjections, 66);
  assert.equal(plan(IDS.contextPlan).independentBaseValues, 4);
  assert.equal(plan(IDS.contextPlan).generatedProjections, 56);
  for (const id of [IDS.contextPlan, IDS.largePlan]) assert.deepEqual([plan(id).usedButNotDeclared, plan(id).declaredButUnused], [[], []]);
});
