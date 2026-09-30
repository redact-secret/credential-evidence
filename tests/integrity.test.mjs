import assert from "node:assert/strict";
import { test } from "node:test";
import { integrityAfter } from "./helpers.mjs";

const expectError = (errors, pattern) => assert.ok(errors.some((e) => pattern.test(e)), `no error matching ${pattern} in:\n${errors.join("\n")}`);

test("dangling provider reference is reported", () => {
  expectError(integrityAfter((entries, rec) => { rec("family", "examplecloud:api-key").provider = "nosuchprovider"; }), /unknown provider/);
});

test("family id must start with its provider", () => {
  expectError(integrityAfter((entries, rec) => { rec("family", "examplecloud:api-key").provider = "aws"; }), /must start with its provider/);
});

test("duplicate ids within a kind are reported", () => {
  const errors = integrityAfter((entries) => {
    const copy = structuredClone(entries.find((e) => e.record.kind === "provider").record);
    entries.push({ path: "dup.json", record: copy });
  });
  expectError(errors, /duplicate provider id/);
});

test("contract id must equal family@revision and chains must move forward", () => {
  expectError(integrityAfter((entries, rec) => { rec("format-contract", "examplecloud:api-key@2").revision = 3; }), /must equal/);
  expectError(integrityAfter((entries, rec) => { rec("format-contract", "examplecloud:api-key@1").supersedes = "examplecloud:api-key@2"; }), /not older/);
  expectError(integrityAfter((entries, rec) => { rec("format-contract", "examplecloud:api-key@2").supersedes = "examplecloud:api-key@9"; }), /unknown contract/);
  expectError(integrityAfter((entries, rec) => { rec("format-contract", "examplecloud:api-key@2").supersedes = null; }), /only revision 1/);
  expectError(integrityAfter((entries, rec) => { rec("format-contract", "examplecloud:api-key@2").supersedes = "examplecloud:webhook-secret@1"; }), /another family/);
});

test("currentContract must belong to its family", () => {
  expectError(integrityAfter((entries, rec) => { rec("family", "examplecloud:api-key").currentContract = "examplecloud:webhook-secret@1"; }), /belongs to family/);
});

test("historical claims must not rely on live-unpinned sources", () => {
  const errors = integrityAfter((entries, rec) => {
    rec("evidence-source", "examplecloud-legacy-key-announcement").locator.pin = { kind: "live-unpinned" };
  });
  expectError(errors, /historical fact but cites live-unpinned/);
});

test("unknown source citations are reported", () => {
  expectError(integrityAfter((entries, rec) => { rec("case", "examplecloud-api-key-in-env-assignment").expectation.sources[0].sourceId = "missing-source"; }), /unknown evidence-source/);
});

test("case references to families, contracts and other cases must resolve", () => {
  expectError(integrityAfter((entries, rec) => { rec("case", "examplecloud-api-key-in-env-assignment").families[0].family = "examplecloud:nope"; }), /unknown family/);
  expectError(integrityAfter((entries, rec) => { rec("case", "examplecloud-api-key-in-env-assignment").families[0].contract = "examplecloud:webhook-secret@1"; }), /belongs to family/);
  expectError(integrityAfter((entries, rec) => { rec("case", "examplecloud-api-key-truncated-body-twin").relations[0].target = "gone"; }), /unknown case/);
});

test("fixture must agree with its authored case and resolve its origin", () => {
  expectError(integrityAfter((entries, rec) => { rec("fixture-projection", "env-assignment--api-key").expected.outcome = "must-not-flag"; rec("fixture-projection", "env-assignment--api-key").expected.spans = []; }), /disagrees with case/);
  expectError(integrityAfter((entries, rec) => { rec("fixture-projection", "env-assignment--api-key").origin.case = "gone"; }), /does not exist/);
  expectError(integrityAfter((entries, rec) => { rec("fixture-projection", "env-assignment--api-key-json").origin.inputs[0].id = "gone"; }), /unknown case/);
  expectError(integrityAfter((entries, rec) => { rec("fixture-projection", "env-assignment--api-key-truncated-twin").lineage.of = "gone--nope"; }), /unknown fixture/);
  expectError(integrityAfter((entries, rec) => { rec("fixture-projection", "env-assignment--api-key").expected.spans[0].end = 3; }), /end must be greater/);
});

test("review history subject and sequence must be consistent", () => {
  expectError(integrityAfter((entries, rec) => { rec("evidence-review-history", "review-examplecloud-api-key-in-env-assignment").subject.id = "gone"; }), /does not exist/);
  expectError(integrityAfter((entries, rec) => { rec("evidence-review-history", "review-examplecloud-api-key-in-env-assignment").events[1].seq = 5; }), /seq must be 2/);
});

test("source observations are append-only in time order", () => {
  expectError(integrityAfter((entries, rec) => { rec("evidence-source", "examplecloud-token-format-doc").observations.reverse(); }), /non-decreasing/);
});
