// The credential-eval twin.sibling_family export (ADR 0026 addendum; credential-eval ADR 0020, contract revision 1.9).
// Invariants over the live tree, derived from its own records: no test asserts a ledger count (a later record changes it).

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildSnapshot, siblingFamilyCount } from "../scripts/export/lib/projection.mjs";
import { loadCanonicalInputs } from "../scripts/export/lib/source.mjs";
import { evalExportProblem } from "../scripts/release/lib/bundle.mjs";

const inputs = loadCanonicalInputs();
const stated = new Map();
for (const r of inputs.records) {
  if (r.kind !== "fixture-set") continue;
  for (const item of r.fixtures) if (item.lineage?.siblingFamily) stated.set(item.id, item.lineage.siblingFamily);
}

describe("the default export stays the closed v1 document", () => {
  const v1 = buildSnapshot(inputs);
  test("no twin carries sibling_family and the accounting has no block for it", () => {
    assert.equal(v1.snapshot.cases.some((c) => c.twin && "sibling_family" in c.twin), false);
    assert.equal(v1.accounting.twinSiblingFamily, undefined);
    assert.equal(siblingFamilyCount(v1.snapshot.cases), 0);
  });
});

describe("the release export", () => {
  const rel = buildSnapshot(inputs, { representation: true, siblingFamily: true });
  const byId = new Map(rel.snapshot.cases.map((c) => [c.id, c]));

  test("every twin whose records name a sibling family carries it, as the same family id", () => {
    for (const [id, sibling] of stated) {
      const c = byId.get(id);
      if (c?.twin) assert.equal(c.twin.sibling_family, sibling, id);
    }
  });

  test("no other twin carries it, and each has a scope family other than its sibling", () => {
    for (const c of rel.snapshot.cases) {
      if (c.twin?.sibling_family === undefined) continue;
      assert.equal(stated.get(c.id), c.twin.sibling_family, `${c.id}: sibling_family is not in the records`);
      assert.notEqual(c.grouping.family, undefined, `${c.id}: no scope family`);
      assert.notEqual(c.grouping.family, c.twin.sibling_family, `${c.id}: scope equals sibling`);
    }
  });

  test("it is the only difference from the same export without it", () => {
    const without = buildSnapshot(inputs, { representation: true });
    const strip = (cases) => cases.map((c) => { const o = structuredClone(c); if (o.twin) delete o.twin.sibling_family; return o; });
    assert.deepEqual(strip(rel.snapshot.cases), strip(without.snapshot.cases));
  });

  test("the manifest counts what the snapshot carries, and a different count is refused", () => {
    const n = siblingFamilyCount(rel.snapshot.cases);
    assert.equal(rel.accounting.twinSiblingFamily?.exported, n > 0 ? n : undefined);
    assert.equal(evalExportProblem(rel.accounting, rel.snapshot.cases.length, rel.fixtures, rel.snapshot), null);
    const wrong = structuredClone(rel.accounting);
    wrong.twinSiblingFamily = { exported: n + 1 };
    assert.match(evalExportProblem(wrong, rel.snapshot.cases.length, rel.fixtures, rel.snapshot), /twinSiblingFamily\.exported/);
    if (n > 0) {
      const missing = structuredClone(rel.accounting);
      delete missing.twinSiblingFamily;
      assert.match(evalExportProblem(missing, rel.snapshot.cases.length, rel.fixtures, rel.snapshot), /\(absent\)/);
    }
  });
});

describe("an input the engine would refuse is not exported", () => {
  const withSibling = (change) => {
    const records = structuredClone(inputs.records);
    for (const r of records) {
      if (r.kind !== "fixture-set") continue;
      const item = r.fixtures.find((i) => i.lineage?.siblingFamily && i.cell?.families?.length === 1);
      if (item) { change(item); return { ...inputs, records }; }
    }
    return undefined;
  };

  test("a sibling family equal to the twin's scope family fails the export", (t) => {
    const mutated = withSibling((item) => { item.lineage.siblingFamily = item.cell.families[0]; });
    if (!mutated) return t.skip("no single-family sibling twin in the records");
    assert.throws(() => buildSnapshot(mutated, { representation: true, siblingFamily: true }), /equals the twin's scope family/);
  });
});
