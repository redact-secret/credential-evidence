// Review state `maintainer-only` (schema revision 1.7.0, ADR 0020): a first-class, validated state that is never `reviewed`,
// valid only on a project-policy basis and only with a `decided` event, and counted by every release.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { reviewStateAccounting, reviewStateProblem } from "../scripts/release/lib/review-state.mjs";
import { errorsOf, example, integrityAfter } from "./helpers.mjs";

const MAINTAINER = { id: "example-maintainer", role: "maintainer", affiliation: "project-maintainer" };
const decided = (over = {}) => ({
  seq: 99,
  type: "decided",
  at: "2026-10-04",
  actor: MAINTAINER,
  note: "Decided under the solo-maintainer period; not a review.",
  dissent: "The strongest counter-argument.",
  reversingEvidence: "The evidence that would reverse it.",
  ...over,
});

describe("schema", () => {
  test("a decided event needs dissent, reversing evidence and a maintainer actor", () => {
    const h = example("evidence-review-history", "review-examplecloud-api-key-in-env-assignment");
    const events = h.events.length;
    const withEvent = (e) => ({ ...h, events: [...h.events, { ...e, seq: events + 1 }] });
    assert.deepEqual(errorsOf(withEvent(decided())), []);
    const { dissent, ...noDissent } = decided();
    assert.ok(errorsOf(withEvent(noDissent)).length > 0, "dissent is required");
    const { reversingEvidence, ...noReversing } = decided();
    assert.ok(errorsOf(withEvent(noReversing)).length > 0, "reversingEvidence is required");
    assert.ok(errorsOf(withEvent(decided({ actor: { ...MAINTAINER, role: "reviewer" } }))).length > 0, "a reviewer role is not a decision");
    assert.ok(errorsOf(withEvent(decided({ actor: { ...MAINTAINER, affiliation: "external" } }))).length > 0, "an external actor is not the maintainer");
    assert.ok(errorsOf(withEvent({ ...decided(), type: "reviewed", verdict: "supports" })).length > 0, "dissent is only for a decided event");
  });

  test("an evidence entry's reviewState needs decidedIn and a project-policy basis", () => {
    const set = example("fixture-set", "examplecloud-cells");
    const entry = (over) => ({ ...set, evidence: { ...set.evidence, "ev-body-length": { ...set.evidence["ev-body-length"], basis: "project-policy", ...over } } });
    assert.deepEqual(errorsOf(entry({ reviewState: "maintainer-only", decidedIn: { kind: "case", id: "x" } })), []);
    assert.ok(errorsOf(entry({ reviewState: "maintainer-only" })).length > 0, "decidedIn is required");
    assert.ok(errorsOf(entry({ reviewState: "maintainer-only", decidedIn: { kind: "case", id: "x" }, basis: "provider-documented" })).length > 0, "never on provider-documented");
    assert.ok(errorsOf(entry({ reviewState: "reviewed", decidedIn: { kind: "case", id: "x" } })).length > 0, "never reviewed");
  });
});

describe("integrity", () => {
  const CASE = "examplecloud-retired-hex-key-in-config"; // a project-policy example

  test("maintainer-only without a decided event is rejected, with one it is accepted", () => {
    const without = integrityAfter((_, get) => {
      get("case", CASE).lifecycle = "maintainer-only";
    });
    assert.ok(without.some((e) => /needs a 'decided' event/.test(e)), without.join("\n"));
    const withEvent = integrityAfter((entries, get) => {
      get("case", CASE).lifecycle = "maintainer-only";
      entries.push({
        path: "examples/valid/x/review.x.json",
        record: { schemaVersion: 1, kind: "evidence-review-history", id: "review-x", subject: { kind: "case", id: CASE }, events: [{ ...decided(), seq: 1 }] },
      });
    });
    assert.deepEqual(withEvent.filter((e) => /maintainer-only/.test(e)), []);
  });

  test("maintainer-only never covers provider-documented, tool-corroborated or unresolved bases", () => {
    for (const id of ["examplecloud-api-key-in-env-assignment", "examplecloud-api-key-truncated-body-twin", "examplecloud-key-in-escaped-newline-text"]) {
      const errors = integrityAfter((entries, get) => {
        get("case", id).lifecycle = "maintainer-only";
        entries.push({
          path: "examples/valid/x/review.x.json",
          record: { schemaVersion: 1, kind: "evidence-review-history", id: "review-x", subject: { kind: "case", id }, events: [{ ...decided(), seq: 1 }] },
        });
      });
      assert.ok(errors.some((e) => /needs basis 'project-policy'/.test(e)), `${id}: ${errors.join("\n")}`);
    }
  });

  test("only a case or a scenario carries the lifecycle", () => {
    const errors = integrityAfter((_, get) => {
      get("family", "examplecloud:api-key").lifecycle = "maintainer-only";
    });
    assert.ok(errors.some((e) => /only for a case or a scenario/.test(e)), errors.join("\n"));
  });

  test("an evidence entry's decidedIn must name a record with a decided event", () => {
    const errors = integrityAfter((_, get) => {
      const set = get("fixture-set", "examplecloud-cells");
      set.evidence["ev-body-length"] = { ...set.evidence["ev-body-length"], basis: "project-policy", reviewState: "maintainer-only", decidedIn: { kind: "case", id: CASE } };
    });
    assert.ok(errors.some((e) => /reviewState 'maintainer-only' needs a 'decided' event/.test(e)), errors.join("\n"));
  });
});

describe("release accounting", () => {
  const item = (id, extra, outcome = "must-flag") => ({ id, expected: { outcome, spans: [] }, ...extra });
  const records = () => [
    { kind: "case", id: "c1", lifecycle: "maintainer-only" },
    { kind: "case", id: "c2", lifecycle: "draft" },
    { kind: "scenario", id: "s1", lifecycle: "reviewed" },
    { kind: "evidence-review-history", id: "h", events: [decided(), { seq: 2, type: "authored" }] },
    {
      kind: "fixture-set",
      id: "set",
      evidence: { a: { reviewState: "maintainer-only" }, b: { basis: "project-policy" } },
      fixtures: [item("1", { case: "c1" }), item("2", { case: "c2" }), item("3", { cell: { scenario: "s1" } }), item("4", { case: "c2", evidence: "a" }, "must-not-flag"), item("5", { case: "c1", evidence: "b" })],
    },
  ];

  test("counts maintainer-only by evidence entry first, then by the case or scenario", () => {
    const r = reviewStateAccounting(records());
    assert.deepEqual(r.fixtures, { total: 5, draft: 2, maintainerOnly: 2, reviewed: 1 });
    assert.deepEqual(r.maintainerOnly, { fixtures: 2, fixturesByOutcome: { "must-flag": 1, "must-not-flag": 1 }, records: { case: 1, scenario: 0 }, decisions: 1 });
  });

  test("a recorded reviewState that differs from the records is a problem", () => {
    const recorded = reviewStateAccounting(records());
    assert.equal(reviewStateProblem(recorded, records()), null);
    assert.match(reviewStateProblem({ ...recorded, maintainerOnly: { ...recorded.maintainerOnly, fixtures: 3 } }, records()), /differs/);
    assert.equal(reviewStateProblem(undefined, records()), null);
  });
});
