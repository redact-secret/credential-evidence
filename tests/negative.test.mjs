import assert from "node:assert/strict";
import { test } from "node:test";
import { errorsOf, example } from "./helpers.mjs";

const rejected = (record, pattern) => {
  const errors = errorsOf(record);
  assert.ok(errors.length > 0, "expected the record to be rejected");
  if (pattern) assert.ok(errors.some((e) => pattern.test(e)), `no error matching ${pattern} in:\n${errors.join("\n")}`);
};

const withField = (record, field, value) => ({ ...record, [field]: value });

// --- Boundary: no scanner or product status in canonical records ------------

test("scanner support status at the root is rejected on every entity", () => {
  const roots = [
    example("provider", "examplecloud"),
    example("family", "examplecloud:api-key"),
    example("format-contract", "examplecloud:api-key@2"),
    example("evidence-source", "examplecloud-token-format-doc"),
    example("variant", "examplecloud-api-key-prefixed-live"),
    example("benign-sibling", "examplecloud-public-key-id"),
    example("case", "examplecloud-api-key-in-env-assignment"),
    example("fixture-projection", "env-assignment--api-key"),
    example("evidence-review-history", "review-examplecloud-api-key-in-env-assignment"),
  ];
  for (const record of roots) {
    for (const field of ["supportStatus", "status"]) {
      for (const value of ["stable", "provisional", "pending"]) {
        rejected(withField(record, field, value), /must NOT have additional properties/);
      }
    }
  }
});

test("detector identifiers at the root are rejected", () => {
  const family = example("family", "examplecloud:api-key");
  rejected(withField(family, "detectors", ["aws-access-key"]), /additional properties 'detectors'/);
  rejected(withField(family, "detectorId", "aws-access-key"), /additional properties 'detectorId'/);
  const fixture = example("fixture-projection", "env-assignment--api-key");
  rejected(withField(fixture, "detectors", ["github-token"]), /additional properties 'detectors'/);
});

test("stable, provisional and pending are not accepted as evidence values", () => {
  const family = example("family", "examplecloud:api-key");
  rejected(withField(family, "lifecycle", "stable"));
  const c = example("case", "examplecloud-api-key-in-env-assignment");
  rejected({ ...c, expectation: { ...c.expectation, basis: "provisional" } });
  rejected({ ...c, expectation: { ...c.expectation, outcome: "pending" } });
});

test("external references cannot smuggle extra product fields", () => {
  const family = example("family", "examplecloud:webhook-secret");
  rejected({ ...family, externalRefs: [{ system: "example-scanner", id: "x", supportStatus: "stable" }] }, /additional properties 'supportStatus'/);
});

// --- IDs and slugs -----------------------------------------------------------

test("bad provider ids are rejected", () => {
  const p = example("provider", "examplecloud");
  for (const id of ["ExampleCloud", "example_cloud", "example cloud", "-examplecloud", "examplecloud-", "example--cloud", "", "a".repeat(97), "example:cloud"]) {
    rejected(withField(p, "id", id), /pattern|fewer than 1|more than 96/);
  }
});

test("bad family ids are rejected", () => {
  const f = example("family", "examplecloud:api-key");
  for (const id of ["api-key", "examplecloud:", ":api-key", "ExampleCloud:api-key", "examplecloud:api_key", "examplecloud:api:key", "examplecloud/api-key", "examplecloud:api-key@2"]) {
    rejected(withField(f, "id", id), /pattern/);
  }
});

test("bad contract ids are rejected", () => {
  const c = example("format-contract", "examplecloud:api-key@2");
  for (const id of ["examplecloud:api-key", "examplecloud:api-key@0", "examplecloud:api-key@v2", "examplecloud:api-key@02", "examplecloud:api-key@-1", "api-key@2"]) {
    rejected(withField(c, "id", id), /pattern/);
  }
});

test("bad fixture ids are rejected", () => {
  const fx = example("fixture-projection", "env-assignment--api-key");
  for (const id of ["env-assignment", "Env--Key", "env_assignment--key", "env-assignment---key", "--key", "env--"]) {
    rejected(withField(fx, "id", id), /pattern/);
  }
});

test("bad case ids and cross-references by id are rejected", () => {
  const c = example("case", "examplecloud-api-key-in-env-assignment");
  for (const id of ["Has Space", "trailing-", "UPPER", "snake_case", "dot.ted", "a".repeat(97)]) rejected(withField(c, "id", id));
  rejected({ ...c, families: [{ family: "not a family id", role: "subject" }] }, /pattern/);
  rejected({ ...c, relations: [{ type: "twin-of", target: "Not_A_Slug" }] }, /pattern/);
});

// --- Structure, dates, versions ----------------------------------------------

test("schemaVersion and kind are required and dispatch to a known schema", () => {
  const p = example("provider", "examplecloud");
  const { kind, ...noKind } = p;
  assert.ok(kind);
  rejected(noKind, /missing string field 'kind'/);
  rejected(withField(p, "kind", "detector"), /unknown kind/);
  rejected(withField(p, "schemaVersion", 2), /no schema for kind 'provider' schemaVersion 2/);
  rejected(withField(p, "schemaVersion", "1"), /missing integer field/);
  rejected([p], /must be a JSON object/);
});

test("observed-at values must be real ISO dates", () => {
  const s = example("evidence-source", "examplecloud-token-format-doc");
  for (const observedAt of ["yesterday", "2026-13-01", "2026-9-30", "2026-09-30 10:00", "2026-09-30T10:00:00+02:00", ""]) {
    rejected({ ...s, observations: [{ ...s.observations[0], observedAt }] }, /pattern/);
  }
  rejected({ ...s, observations: [] }, /fewer than 1 items/);
});

test("a claim needs a source unless it is project policy or unresolved", () => {
  const c = example("format-contract", "examplecloud:api-key@2");
  const claim = { ...c.claims[0], sources: [] };
  rejected({ ...c, claims: [claim] }, /fewer than 1 items/);
  const policy = { ...claim, evidenceClass: "project-policy" };
  assert.deepEqual(errorsOf({ ...c, claims: [policy] }), []);
});

test("unresolved evidence cannot carry a firm outcome", () => {
  const c = example("case", "examplecloud-api-key-in-env-assignment");
  rejected({ ...c, expectation: { ...c.expectation, basis: "unresolved", sources: [] } }, /outcome|constant/);
  assert.deepEqual(errorsOf({ ...c, expectation: { ...c.expectation, basis: "unresolved", outcome: "not-assertable", sources: [] } }), []);
});

test("case family rules: unscoped reason and cross-family arity", () => {
  const c = example("case", "examplecloud-api-key-in-env-assignment");
  rejected({ ...c, families: [] }, /unscopedReason/);
  assert.deepEqual(errorsOf({ ...c, families: [], unscopedReason: "Generic context control, no provider." }), []);
  rejected({ ...c, unscopedReason: "not allowed with families" });
  rejected({ ...c, caseTypes: ["positive", "cross-family"] }, /fewer than 2 items/);
});

test("research state rules on families", () => {
  const f = example("family", "examplecloud:api-key");
  rejected({ ...f, research: { state: "unresearched", researchedAt: "2026-09-29" } });
  assert.deepEqual(errorsOf({ ...f, research: { state: "unresearched", researchedAt: null } }), []);
  rejected({ ...f, research: { state: "researched", researchedAt: null } });
});

// --- Pinned links -------------------------------------------------------------

test("GitHub links must be pinned; branches and live-unpinned are rejected", () => {
  const r = example("evidence-review-history", "review-aws-iam-user-access-key");
  const event = r.events[0];
  const link = (url, pin) => ({ ...r, events: [{ ...event, evidence: [{ url, pin }] }] });
  const branchUrl = "https://github.com/example/repo/blob/main/docs/keys.md";
  rejected(link(branchUrl, { kind: "live-unpinned" }));
  rejected(link(branchUrl, { kind: "commit-permalink", commit: "main" }), /pattern/);
  rejected(link("https://raw.githubusercontent.com/example/repo/main/keys.md", { kind: "live-unpinned" }));
  rejected(link("http://insecure.example.com/x", { kind: "archive-snapshot", archiveUrl: "https://web.archive.org/x" }), /pattern/);
  assert.deepEqual(errorsOf(link(branchUrl, { kind: "commit-permalink", commit: "0123456789abcdef0123456789abcdef01234567" })), []);
  assert.deepEqual(errorsOf(link("https://docs.example.com/page", { kind: "live-unpinned" })), []);
});

// --- Fixtures -----------------------------------------------------------------

test("fixture provenance rules", () => {
  const fx = example("fixture-projection", "env-assignment--api-key");
  const { origin, ...noOrigin } = fx;
  assert.ok(origin);
  rejected(noOrigin, /missing property 'origin'|required property 'origin'/);
  rejected(withField(fx, "origin", { type: "scanner-output", detector: "x" }));
  rejected(withField(fx, "generated", true), /constant|allowed value/);
  const gen = example("fixture-projection", "env-assignment--api-key-json");
  rejected(withField(gen, "generated", false), /constant|allowed value/);
  rejected({ ...gen, origin: { ...gen.origin, inputs: [] } }, /fewer than 1 items/);
  rejected({ ...gen, origin: { ...gen.origin, generator: { name: "g" } } }, /version/);
});

test("fixture expectation and content rules", () => {
  const twin = example("fixture-projection", "env-assignment--api-key-truncated-twin");
  rejected({ ...twin, expected: { outcome: "must-not-flag", spans: [{ start: 0, end: 4, role: "secret" }] } }, /more than 0 items/);
  for (const path of ["../outside.txt", "/etc/passwd", "a/../b.txt", "with space.txt"]) {
    rejected({ ...twin, content: { ...twin.content, path } }, /pattern|must NOT be valid/);
  }
  rejected({ ...twin, content: { ...twin.content, sha256: "ABC" } }, /pattern/);
});

test("review history events are typed and disclose affiliation", () => {
  const r = example("evidence-review-history", "review-examplecloud-api-key-in-env-assignment");
  const e = r.events[0];
  rejected({ ...r, events: [] }, /fewer than 1 items/);
  rejected({ ...r, events: [{ ...e, type: "stable" }] }, /allowed values/);
  rejected({ ...r, events: [{ ...e, actor: { id: "x", role: "reviewer" } }] }, /affiliation/);
  rejected({ ...r, events: [{ ...e, actor: { ...e.actor, affiliation: "independent" } }] }, /allowed values/);
});
