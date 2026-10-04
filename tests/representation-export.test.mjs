// The credential-eval representation export (ADR 0018): the mapping, the facts digest, the loss check and the release
// accounting. Synthetic inputs and invariants only: no test asserts a ledger value of the live tree (a repin re-keys them).

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildSnapshot } from "../scripts/export/lib/projection.mjs";
import { caseRepresentation, factsCounts, factsDigest, factsOf, REPRESENTATION_CONTRACT, representationAccounting, spanFacts } from "../scripts/export/lib/representation-facts.mjs";
import { loadCanonicalInputs } from "../scripts/export/lib/source.mjs";
import { evalExportProblem } from "../scripts/release/lib/bundle.mjs";

const HEX = "ab".repeat(32);

describe("mapping an item to snapshot facts", () => {
  test("a span's decoded fact gets snake_case steps and a sha256: prefix; the other span facts pass through", () => {
    const f = spanFacts({
      start: 0, end: 4, role: "secret", base: "x--base",
      fragments: [{ start: 0, end: 2 }, { start: 3, end: 4 }],
      decoded: { via: [{ codec: "base64", alphabet: "url-safe", padding: "unpadded" }, { codec: "strip-codepoints", codePoints: ["U+200B"] }], sha256: HEX, bytes: 9 },
    });
    assert.deepEqual(f, {
      base: "x--base",
      fragments: [{ start: 0, end: 2 }, { start: 3, end: 4 }],
      decoded: { via: [{ codec: "base64", alphabet: "url-safe", padding: "unpadded" }, { codec: "strip-codepoints", code_points: ["U+200B"] }], sha256: `sha256:${HEX}`, bytes: 9 },
    });
    assert.deepEqual(spanFacts({ start: 0, end: 1, role: "secret" }), {});
  });

  test("case-level facts: defaults are omitted and camelCase step keys become snake_case", () => {
    assert.equal(caseRepresentation({ inputValidity: "valid" }), undefined);
    assert.equal(caseRepresentation({}), undefined);
    assert.deepEqual(caseRepresentation({ derivation: { kind: "authored-base" } }), { derivation: { kind: "authored-base" } });
    const r = caseRepresentation({
      inputValidity: "unpaired-surrogate-split",
      derivation: { kind: "projection", bases: ["a--b"] },
      transformation: { note: "free text stays in the records", steps: [{ op: "fragment", mechanism: "m", lineBreak: "lf", width: 8, reconstruction: "unresolved" }, { op: "insert-codepoints", codePoints: ["U+200B"], positions: "inside" }, { op: "place", placement: "head", fillerBytes: 10 }] },
      chunking: { unit: "utf16-code-unit", boundaries: [3] },
    });
    assert.deepEqual(r, {
      input_validity: "unpaired-surrogate-split",
      derivation: { kind: "projection", bases: ["a--b"] },
      transformation: { steps: [{ op: "fragment", mechanism: "m", line_break: "lf", width: 8, reconstruction: "unresolved" }, { op: "insert-codepoints", code_points: ["U+200B"], positions: "inside" }, { op: "place", placement: "head", filler_bytes: 10 }] },
      chunking: { unit: "utf16-code-unit", boundaries: [3] },
    });
  });
});

describe("facts digest and counts", () => {
  const cases = [
    { id: "b", expected: [{ start: 0, end: 3, role: "secret", base: "a", decoded: { via: [{ codec: "normalize", form: "nfc" }], sha256: `sha256:${HEX}`, bytes: 3 } }], representation: { derivation: { kind: "projection", bases: ["a"] }, transformation: { steps: [{ op: "embed", mode: "whole-value" }] } } },
    { id: "a", expected: [{ start: 0, end: 1, role: "secret" }, { start: 2, end: 9, role: "secret", fragments: [{ start: 2, end: 4 }, { start: 6, end: 9 }] }] },
    { id: "c", expected: [], representation: { input_validity: "unpaired-surrogate-split", chunking: { unit: "utf16-code-unit", boundaries: [1] } } },
    { id: "d", expected: [{ start: 0, end: 1, role: "secret" }] },
  ];

  test("only cases and spans that carry a fact are listed, sorted by case id, with the span's position in expected[]", () => {
    const facts = factsOf(cases);
    assert.deepEqual(facts.map((f) => f.case_id), ["a", "b", "c"]);
    assert.equal(facts[0].spans[0].index, 1);
    assert.equal("representation" in facts[0], false);
    assert.deepEqual(facts[2].spans, []);
  });

  test("the digest is stable under case order and changes with any fact", () => {
    const d = factsDigest(cases);
    assert.match(d, /^sha256:[0-9a-f]{64}$/);
    assert.equal(factsDigest([...cases].reverse()), d);
    const changed = structuredClone(cases);
    changed[1].expected[1].fragments[1].end = 8;
    assert.notEqual(factsDigest(changed), d);
    assert.equal(factsDigest(cases.filter((c) => c.id === "d")), factsDigest([]));
  });

  test("counts follow the engine's report; normalize is carried but unverified", () => {
    assert.deepEqual(factsCounts(cases), { cases: 3, transformed_cases: 1, chunked_cases: 1, expected_rejections: 1, fragmented_spans: 1, fragments: 2, decoded_spans: 1, decoded_verified: 0, decoded_unverified: 1 });
    assert.equal(representationAccounting(cases).contract, REPRESENTATION_CONTRACT);
  });
});

describe("the live tree", () => {
  const inputs = loadCanonicalInputs();
  const v1 = buildSnapshot(inputs);
  const rep = buildSnapshot(inputs, { representation: true });
  const strip = (c) => {
    const o = structuredClone(c);
    delete o.representation;
    for (const s of o.expected) for (const k of ["base", "fragments", "decoded"]) delete s[k];
    return o;
  };

  test("the default export is the closed v1 document: no contract declaration, no fact, no accounting block", () => {
    assert.equal(v1.snapshot.identity.representation, undefined);
    assert.equal(v1.accounting.representation, undefined);
    for (const c of v1.snapshot.cases) {
      assert.equal(c.representation, undefined);
      for (const s of c.expected) for (const k of ["base", "fragments", "decoded"]) assert.equal(s[k], undefined);
    }
  });

  test("the representation export only adds facts: same cases, content, spans, tiers and kinds as the v1 export", () => {
    assert.equal(rep.snapshot.identity.representation, REPRESENTATION_CONTRACT);
    assert.deepEqual(rep.snapshot.cases.map(strip), v1.snapshot.cases);
    assert.deepEqual(rep.notExported, v1.notExported);
  });

  test("a case never gains or loses an expectation: every case that carries a fact keeps a tier its evidence gave it", () => {
    for (const c of rep.snapshot.cases) {
      if (c.representation?.input_validity !== undefined) {
        assert.deepEqual(c.expected, [], c.id);
        assert.equal(c.grouping.tier, "T0", c.id);
        assert.equal(typeof c.content, "string", c.id);
      }
    }
  });

  test("invalid-utf8 stays out of the snapshot and is counted; the accounting still adds up", () => {
    assert.ok(rep.snapshot.cases.every((c) => c.representation?.input_validity !== "invalid-utf8"));
    assert.equal(rep.accounting.exported + rep.accounting.notExported.total, rep.accounting.materialized);
    for (const n of rep.accounting.notExported.cases) assert.equal(n.reason, "invalid-utf8");
  });

  test("the accounting records the digest and counts of what was written, and the release check recomputes them", () => {
    assert.deepEqual(rep.accounting.representation, representationAccounting(rep.snapshot.cases));
    const fixtures = rep.accounting.materialized;
    assert.equal(evalExportProblem(rep.accounting, rep.snapshot.cases.length, fixtures, rep.snapshot), null);
    // a fact lost from the snapshot after the accounting was taken is a defect
    const lossy = structuredClone(rep.snapshot);
    const victim = lossy.cases.find((c) => c.expected.some((s) => s.fragments));
    if (victim) {
      for (const s of victim.expected) delete s.fragments;
      assert.match(evalExportProblem(rep.accounting, lossy.cases.length, fixtures, lossy), /differs from the facts the snapshot carries/);
    }
    // the declaration and the accounting must agree
    const undeclared = structuredClone(rep.snapshot);
    delete undeclared.identity.representation;
    assert.match(evalExportProblem(rep.accounting, undeclared.cases.length, fixtures, undeclared), /disagree about whether/);
  });
});
