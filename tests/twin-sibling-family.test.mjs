// lineage.siblingFamily (schema revision 1.8.0, ADR 0026): a twin whose value is a real credential of another family of the
// same provider names that family. The field is checked against the families, the provider and the scoped family's contract.

import assert from "node:assert/strict";
import { test } from "node:test";
import { errorsOf, example, integrityAfter } from "./helpers.mjs";

const TWIN = "env-assignment--api-key-truncated-twin";
const SIBLING_CLAIM = {
  id: "field-sibling-classes",
  statement: "ExampleCloud webhook secrets are a different class of the same provider; they are real secrets of another class.",
  evidenceClass: "unresolved",
  temporality: "current",
  observedAt: "2026-09-30",
  sources: [],
};
const expectError = (errors, pattern) => assert.ok(errors.some((e) => pattern.test(e)), `no error matching ${pattern} in:\n${errors.join("\n")}`);
const mark = (sibling, { claim = true, relation } = {}) => (entries, rec) => {
  if (claim) rec("format-contract", "examplecloud:api-key@2").claims.push(structuredClone(SIBLING_CLAIM));
  const twin = rec("fixture-projection", TWIN);
  twin.lineage.siblingFamily = sibling;
  if (relation) twin.lineage.relation = relation;
};

test("a twin may name the sibling family when the scoped family's contract states sibling classes", () => {
  assert.deepEqual(integrityAfter(mark("examplecloud:webhook-secret")), []);
});

test("the sibling family must exist", () => {
  expectError(integrityAfter(mark("examplecloud:no-such-class")), /siblingFamily 'examplecloud:no-such-class' does not exist/);
});

test("the sibling family must be of the provider of the scoped family", () => {
  const errors = integrityAfter((entries, rec) => {
    mark("othercloud:key")(entries, rec);
    entries.push({ path: "p.json", record: { ...structuredClone(example("provider", "examplecloud")), id: "othercloud", name: "OtherCloud (fictional)" } });
    entries.push({ path: "f.json", record: { ...structuredClone(example("family", "examplecloud:api-key")), id: "othercloud:key", provider: "othercloud" } });
  });
  expectError(errors, /not of the provider of scoped family 'examplecloud:api-key'/);
});

test("the evidence must already treat the sibling as a sibling class", () => {
  expectError(integrityAfter(mark("examplecloud:webhook-secret", { claim: false })), /not stated by the evidence/);
});

test("a twin cannot name its own scoped family as the sibling", () => {
  expectError(integrityAfter(mark("examplecloud:api-key")), /needs the twin to be scoped to another family/);
});

test("only a twin-of relation can carry it", () => {
  expectError(integrityAfter(mark("examplecloud:webhook-secret", { relation: "mutation-of" })), /only for a twin-of relation/);
});

test("the schema takes a family id, never free text", () => {
  const twin = example("fixture-projection", TWIN);
  assert.deepEqual(errorsOf({ ...twin, lineage: { ...twin.lineage, siblingFamily: "examplecloud:webhook-secret" } }), []);
  assert.ok(errorsOf({ ...twin, lineage: { ...twin.lineage, siblingFamily: "the Claude API key class" } }).length > 0);
});
