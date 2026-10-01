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

test("fixture set items must resolve their case, agree with it, match their digest and keep spans inside the content", () => {
  const set = (rec) => rec("fixture-set", "examplecloud-carriers");
  expectError(integrityAfter((entries, rec) => { set(rec).fixtures[0].case = "gone"; }), /case 'gone' does not exist/);
  expectError(integrityAfter((entries, rec) => { set(rec).fixtures[0].expected = { outcome: "must-not-flag", spans: [] }; }), /disagrees with case/);
  expectError(integrityAfter((entries, rec) => { set(rec).fixtures[0].text += "x"; }), /sha256 does not match text/);
  expectError(integrityAfter((entries, rec) => { set(rec).fixtures[0].expected.spans[0].end = 9999; }), /ends after the content/);
  expectError(integrityAfter((entries, rec) => { set(rec).fixtures[0].expected.spans[0].envelope = { start: 30, end: 40, reason: "x" }; }), /envelope must enclose/);
  expectError(integrityAfter((entries, rec) => { set(rec).fixtures[1].lineage.of = "gone--nope"; }), /lineage\.of unknown fixture/);
  expectError(integrityAfter((entries, rec) => { set(rec).fixtures[0].id = "other--api-key"; }), /must start with the set id/);
});

test("a fixture id may not be claimed twice across projections and set items", () => {
  expectError(integrityAfter((entries, rec) => { rec("fixture-set", "examplecloud-carriers").fixtures[0].id = "env-assignment--api-key"; }), /duplicate fixture id/);
});

test("an assertable case with no fixture projection is reported", () => {
  const errors = integrityAfter((entries) => {
    const at = entries.findIndex((e) => e.record.kind === "fixture-set" && e.record.id === "examplecloud-carriers");
    entries.splice(at, 1);
    const twin = entries.findIndex((e) => e.record.kind === "fixture-projection" && e.record.id === "env-assignment--api-key-truncated-twin");
    entries.splice(twin, 1);
  });
  expectError(errors, /has an assertable expectation but no fixture projects it/);
});

// --- ADR 0012: per-fixture families override and non-asserting candidate reading

test("a families override must narrow its Case's families", () => {
  const point = (families) => (entries, rec) => {
    const item = rec("fixture-set", "examplecloud-carriers").fixtures[0];
    item.case = "examplecloud-api-key-beside-webhook-secret";
    item.families = families;
  };
  const ok = integrityAfter(point(["examplecloud:api-key"]));
  assert.ok(!ok.some((e) => /families override/.test(e)), ok.join("\n"));
  expectError(integrityAfter(point(["aws:iam-user-access-key"])), /families override 'aws:iam-user-access-key' is not a family of case/);
  expectError(integrityAfter(point(["examplecloud:webhook-secret", "examplecloud:api-key"])), /families override equals the families of case/);
});

test("a candidate reading must stay inside the content and propose a secret span", () => {
  const withReading = (spans) => (entries, rec) => {
    const item = rec("fixture-set", "examplecloud-carriers").fixtures[0];
    item.candidateReading = { asserting: false, outcome: "must-flag", spans };
  };
  expectError(integrityAfter(withReading([{ start: 0, end: 100000, role: "secret" }])), /candidateReading\.spans\[0\] ends after the content/);
  expectError(integrityAfter(withReading([{ start: 0, end: 2, role: "companion" }])), /a must-flag candidateReading needs a secret span/);
  expectError(integrityAfter(withReading([{ start: 4, end: 8, role: "secret" }, { start: 2, end: 6, role: "secret" }])), /sorted and disjoint/);
});
