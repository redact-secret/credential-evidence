import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { KINDS, repoRoot, validateTree } from "../scripts/lib/validator.mjs";
import { examplesDir, exampleEntries, errorsOf, integrityAfter } from "./helpers.mjs";

test("every example record validates and cross-references resolve", () => {
  const { total, errors } = validateTree([examplesDir]);
  assert.ok(total > 0);
  assert.deepEqual(errors, []);
});

test("examples cover every entity kind", () => {
  const kinds = new Set(exampleEntries().map((e) => e.record.kind));
  for (const kind of KINDS) assert.ok(kinds.has(kind), `no example of ${kind}`);
});

test("validation is deterministic across runs", () => {
  assert.deepEqual(validateTree([examplesDir]), validateTree([examplesDir]));
});

test("fixture content files match their recorded digest and spans", () => {
  for (const { path, record } of exampleEntries()) {
    if (record.kind !== "fixture-projection") continue;
    const bytes = readFileSync(join(repoRoot, record.content.path));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), record.content.sha256, `${path} digest`);
    for (const span of record.expected.spans) assert.ok(span.end <= bytes.length, `${path} span within content`);
  }
});

test("a family has multiple historical format contracts", () => {
  const contracts = exampleEntries().filter((e) => e.record.kind === "format-contract" && e.record.family === "examplecloud:api-key");
  assert.equal(contracts.length, 2);
  assert.deepEqual(contracts.map((c) => c.record.period).sort(), ["current", "historical"]);
});

test("one case involves several families and a family is used by several cases", () => {
  const cases = exampleEntries().filter((e) => e.record.kind === "case").map((e) => e.record);
  assert.ok(cases.some((c) => c.families.length >= 2));
  const uses = cases.filter((c) => c.families.some((f) => f.family === "examplecloud:api-key"));
  assert.ok(uses.length >= 3);
});

test("generated fixtures record lineage back to authored records", () => {
  const generated = exampleEntries().map((e) => e.record).filter((r) => r.kind === "fixture-projection" && r.generated);
  assert.ok(generated.length >= 2);
  for (const r of generated) {
    assert.equal(r.origin.type, "generation-rule");
    assert.ok(r.origin.inputs.some((i) => i.kind === "case"));
  }
});

test("optional external references never reach the root of a record", () => {
  const mapped = exampleEntries().filter((e) => e.record.externalRefs?.some((r) => r.system.endsWith("detector")));
  assert.ok(mapped.length > 0, "examples should show an optional detector mapping");
  for (const { record } of mapped) assert.deepEqual(errorsOf(record), []);
});

test("integrity: baseline example set has no problems", () => {
  assert.deepEqual(integrityAfter(() => {}), []);
});
