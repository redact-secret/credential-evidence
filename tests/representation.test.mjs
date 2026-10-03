// Schema revision 1.6.0 (ADR 0016): representation and lineage of transformed credentials, authored bases versus
// generated projections, and the base-sample report. All values are the synthetic ExampleCloud examples.

import assert from "node:assert/strict";
import { test } from "node:test";
import { buildBasesReport, renderBasesReport } from "../scripts/lib/bases-report.mjs";
import { buildMaterialization } from "../scripts/lib/materialize.mjs";
import { MAX_CONTENT_BYTES, contentBytes, decodeVia, sha256Hex, splitsSurrogatePair } from "../scripts/lib/representation.mjs";
import { errorsOf, example, exampleEntries, integrityAfter } from "./helpers.mjs";

const A = "examplecloud-representation-authored";
const G = "examplecloud-representation-generated";
const authored = () => example("fixture-set", A);
const generated = () => example("fixture-set", G);
const find = (set, name) => set.fixtures.find((f) => f.id === `${set.id}--${name}`);

/** Integrity problems after `mutate(getSet, getPlan)` edits copies of the representation examples. */
const problemsAfter = (mutate) =>
  integrityAfter((entries, get) => mutate({ authored: get("fixture-set", A), generated: get("fixture-set", G), plan: get("fixture-plan", "examplecloud-representation-projections") }));
const mentions = (problems, pattern) => assert.ok(problems.some((p) => pattern.test(p)), `no problem matching ${pattern} in:\n${problems.join("\n")}`);

test("the worked examples validate and every claim in them is re-derived by the validator", () => {
  assert.deepEqual(problemsAfter(() => {}), []);
  for (const set of [authored(), generated()]) assert.deepEqual(errorsOf(set), []);
});

test("the examples cover every representation the issue list names", () => {
  const items = authored().fixtures;
  const steps = items.flatMap((f) => f.transformation?.steps ?? []);
  const has = (pred) => assert.ok(steps.some(pred));
  has((s) => s.op === "encode" && s.codec === "base64" && s.alphabet === "standard" && s.padding === "padded");
  has((s) => s.op === "encode" && s.codec === "base64" && s.alphabet === "url-safe" && s.padding === "unpadded");
  has((s) => s.op === "encode" && s.codec === "hex" && s.case === "upper");
  has((s) => s.op === "embed" && s.mode === "whole-value");
  has((s) => s.op === "embed" && s.mode === "embedded");
  has((s) => s.op === "fragment" && s.reconstruction === "reconstructs-original");
  has((s) => s.op === "fragment" && s.reconstruction === "inserts-separator");
  has((s) => s.op === "fragment" && s.reconstruction === "unresolved");
  has((s) => s.op === "insert-codepoints");
  const nested = items.find((f) => f.expected.spans.some((s) => s.decoded?.via.length === 2));
  assert.ok(nested, "a nested (two-layer) encoding");
  assert.ok(items.some((f) => f.bytesHex !== undefined && f.inputValidity === "invalid-utf8"));
  assert.ok(items.some((f) => f.chunking?.unit === "utf8-byte" && f.inputValidity === undefined));
  assert.ok(items.some((f) => f.chunking?.unit === "utf16-code-unit" && f.inputValidity === "unpaired-surrogate-split"));
  assert.ok(generated().fixtures.some((f) => f.expected.spans.length === 2 && new Set(f.expected.spans.map((s) => s.base)).size === 2), "a mixed-secret input");
  assert.ok(generated().fixtures.some((f) => f.expected.spans.length === 2 && new Set(f.expected.spans.map((s) => s.base)).size === 1), "a repeated secret with separate spans");
});

test("a recipe assembles the exact bytes and its size is bounded", () => {
  const set = generated();
  const all = exampleEntries().map((e) => e.record).filter((r) => r.kind === "fixture-set");
  const bases = new Map(all.flatMap((s) => s.fixtures.filter((f) => f.derivation?.kind === "authored-base").map((f) => [f.id, Buffer.from(f.text)])));
  for (const item of set.fixtures) {
    const bytes = contentBytes(item, (id) => bases.get(id));
    assert.equal(sha256Hex(bytes), item.sha256);
    for (const s of item.expected.spans) assert.ok(s.end <= bytes.length);
  }
  const huge = { recipe: { parts: [{ repeat: { text: "x".repeat(256), times: 4194304 } }] } };
  assert.throws(() => contentBytes(huge), /expands beyond/);
  assert.equal(MAX_CONTENT_BYTES, 4 * 1024 * 1024);
  assert.throws(() => contentBytes({ recipe: { parts: [{ fixture: "nope--x" }] } }), /not an authored base/);
});

test("materialization carries the new facts only on items that state them, and expands recipes", () => {
  const records = exampleEntries().map((e) => e.record);
  const built = buildMaterialization({ sets: records.filter((r) => r.kind === "fixture-set"), cases: records.filter((r) => r.kind === "case"), scenarios: records.filter((r) => r.kind === "scenario") });
  const byId = new Map(built.manifest.fixtures.map((f) => [f.id, f]));
  const legacyShaped = byId.get("examplecloud-carriers--api-key-double-quoted");
  for (const k of ["derivation", "transformation", "chunking", "inputValidity"]) assert.equal(k in legacyShaped, false, `${k} must be absent on an unattributed item`);
  const head = byId.get(`${G}--key-at-head-of-64k`);
  assert.equal(head.bytes, 65536 + 41 + 22);
  assert.equal(head.derivation.kind, "projection");
  assert.deepEqual(head.derivation.bases, [`${A}--api-key-base`]);
  assert.equal(built.files.get(head.path).length, head.bytes);
  assert.equal(byId.get(`${A}--key-after-invalid-utf8-bytes`).inputValidity, "invalid-utf8");
  assert.equal(byId.get(`${A}--key-after-emoji-byte-chunked`).inputValidity, undefined);
  assert.equal(byId.get(`${A}--key-base64-standard-padded-whole`).expected.spans[0].decoded.via[0].codec, "base64");
  assert.equal(built.digest, buildMaterialization({ sets: records.filter((r) => r.kind === "fixture-set"), cases: records.filter((r) => r.kind === "case"), scenarios: records.filter((r) => r.kind === "scenario") }).digest, "deterministic");
});

test("decoding is strict: alphabet, padding, case and canonical form", () => {
  const std = { codec: "base64", alphabet: "standard", padding: "padded" };
  assert.equal(decodeVia(Buffer.from("aGk="), [std]).toString(), "hi");
  assert.throws(() => decodeVia(Buffer.from("aGk"), [std]), /padded/);
  assert.throws(() => decodeVia(Buffer.from("aGk="), [{ ...std, padding: "unpadded" }]), /unpadded/);
  assert.throws(() => decodeVia(Buffer.from("a-k="), [std]), /standard base64/);
  assert.throws(() => decodeVia(Buffer.from("aGl="), [std]), /canonical/);
  assert.equal(decodeVia(Buffer.from("-_8"), [{ codec: "base64", alphabet: "url-safe", padding: "unpadded" }]).toString("hex"), "fbff");
  assert.throws(() => decodeVia(Buffer.from("6A"), [{ codec: "hex", case: "lower" }]), /lower-case/);
  assert.throws(() => decodeVia(Buffer.from("6a"), [{ codec: "hex", case: "mixed" }]), /both cases/);
  assert.equal(decodeVia(Buffer.from("6A6b"), [{ codec: "hex", case: "mixed" }]).toString(), "jk");
  assert.equal(decodeVia(Buffer.from("a​b"), [{ codec: "strip-codepoints", codePoints: ["U+200B"] }]).toString(), "ab");
  assert.equal(decodeVia(Buffer.from("é"), [{ codec: "normalize", form: "nfc" }]).toString(), "é");
  assert.throws(() => decodeVia(Buffer.from([0xff]), [{ codec: "normalize", form: "nfc" }]), /UTF-8/);
});

test("surrogate pair boundaries are counted in UTF-16 code units", () => {
  const t = "k\u{1F511}x";
  assert.equal(splitsSurrogatePair(t, 1), false);
  assert.equal(splitsSurrogatePair(t, 2), true);
  assert.equal(splitsSurrogatePair(t, 3), false);
});

// ---- Each rule fires ---------------------------------------------------------

test("a decoded span must decode, hash and equal its base", () => {
  const b64 = (set) => find(set, "key-base64-standard-padded-whole");
  mentions(problemsAfter(({ authored: s }) => { b64(s).expected.spans[0].decoded.sha256 = "0".repeat(64); }), /decoded\.sha256 does not match/);
  mentions(problemsAfter(({ authored: s }) => { b64(s).expected.spans[0].decoded.bytes = 40; }), /decoded\.bytes is 40/);
  mentions(problemsAfter(({ authored: s }) => { b64(s).expected.spans[0].decoded.via[0].alphabet = "url-safe"; b64(s).expected.spans[0].decoded.via[0].padding = "unpadded"; }), /decoded\.via\[0\] \(base64\)/);
  mentions(problemsAfter(({ authored: s }) => { b64(s).expected.spans[0].base = `${A}--second-api-key-base`; }), /not in derivation\.bases/);
  mentions(problemsAfter(({ authored: s }) => { b64(s).derivation.bases = [`${A}--second-api-key-base`]; b64(s).expected.spans[0].base = `${A}--second-api-key-base`; }), /not the value of base/);
  mentions(problemsAfter(({ authored: s }) => { delete b64(s).expected.spans[0].decoded; }), /not the value of base .* states no decoded\.via/);
  mentions(problemsAfter(({ authored: s }) => { delete b64(s).expected.spans[0].base; }), /secret span of a projection names its base/);
});

test("nested layers are applied in order and the transformation must mirror them", () => {
  const nested = (s) => find(s, "key-base64-nested-url-safe-over-standard");
  mentions(problemsAfter(({ authored: s }) => { nested(s).expected.spans[0].decoded.via.reverse(); }), /decoded\.via\[0\]/);
  mentions(problemsAfter(({ authored: s }) => { nested(s).transformation.steps.reverse(); }), /not the reverse of the span's decoded\.via/);
  mentions(problemsAfter(({ authored: s }) => { delete nested(s).transformation; }), /decoded needs a transformation/);
});

test("fragments are sorted, disjoint, bounded by the span, and need a reconstructing mechanism", () => {
  const f = (s) => find(s, "key-split-by-shell-line-continuation");
  mentions(problemsAfter(({ authored: s }) => { const fr = f(s).expected.spans[0].fragments; f(s).expected.spans[0].fragments = [fr[1], fr[0]]; }), /sorted, disjoint/);
  mentions(problemsAfter(({ authored: s }) => { f(s).expected.spans[0].fragments[0].start += 1; }), /start where the span starts/);
  mentions(problemsAfter(({ authored: s }) => { f(s).expected.spans[0].fragments[1].end = f(s).expected.spans[0].end + 1; }), /inside the span|end where it ends/);
  mentions(problemsAfter(({ authored: s }) => { f(s).transformation.steps[0].reconstruction = "inserts-separator"; }), /cannot back a must-flag/);
  mentions(problemsAfter(({ authored: s }) => { f(s).transformation.steps[0].reconstruction = "unresolved"; }), /cannot back a must-flag|unresolved/);
  mentions(problemsAfter(({ authored: s }) => { delete f(s).transformation; f(s).derivation = { kind: "projection", bases: [`${A}--api-key-base`] }; }), /fragment step in transformation/);
  // a joined value that is not an exact base is caught
  mentions(problemsAfter(({ authored: s }) => { const sp = f(s).expected.spans[0]; sp.fragments[1].end -= 1; sp.end -= 1; }), /not the value of base/);
});

test("an unresolved reading is not assertable", () => {
  const e = (s) => find(s, "key-with-escaped-newline-text");
  mentions(problemsAfter(({ authored: s }) => { e(s).expected.outcome = "must-not-flag"; }), /disagrees with case|unresolved reconstruction is not assertable/);
});

test("input validity is verified, not trusted", () => {
  mentions(problemsAfter(({ authored: s }) => { delete find(s, "key-after-invalid-utf8-bytes").inputValidity; }), /not valid UTF-8/);
  mentions(problemsAfter(({ authored: s }) => { find(s, "key-after-emoji-byte-chunked").inputValidity = "invalid-utf8"; }), /valid UTF-8/);
  mentions(problemsAfter(({ authored: s }) => { delete find(s, "key-after-emoji-utf16-pair-split").inputValidity; }), /must be unpaired-surrogate-split/);
  mentions(problemsAfter(({ authored: s }) => { find(s, "key-after-emoji-utf16-pair-split").chunking.boundaries = [7]; }), /no utf16-code-unit chunk boundary separates/);
  mentions(problemsAfter(({ authored: s }) => { find(s, "key-after-emoji-byte-chunked").chunking.boundaries = [900]; }), /inside the content/);
  mentions(problemsAfter(({ authored: s }) => { find(s, "key-after-emoji-byte-chunked").chunking.boundaries = [7, 7]; }), /strictly increasing/);
  // an expected rejection is never a detection expectation
  const bad = structuredClone(find(authored(), "key-after-emoji-utf16-pair-split"));
  bad.expected = { outcome: "must-flag", spans: [{ start: 6, end: 47, role: "secret" }] };
  assert.ok(errorsOf({ ...authored(), fixtures: [bad] }).some((e) => /not-assertable|constant/.test(e)));
});

test("a UTF-8 byte boundary inside a multibyte sequence is valid; UTF-16 pair splits are not", () => {
  const item = find(authored(), "key-after-emoji-byte-chunked");
  assert.deepEqual(item.chunking, { unit: "utf8-byte", boundaries: [7] });
  const bytes = Buffer.from(item.text);
  assert.ok((bytes[7] & 0xc0) === 0x80, "boundary 7 falls on a continuation byte");
});

test("authored bases and projections keep their roles", () => {
  mentions(problemsAfter(({ authored: s }) => { s.generated = true; s.origin = { type: "generation-rule", rule: "r", generator: { name: "g", version: "1", sourceRevision: "1".repeat(40), entrypoint: "e.mjs" } }; }), /only for a hand-authored set/);
  mentions(problemsAfter(({ authored: s }) => { find(s, "api-key-base").expected.spans.push({ start: 0, end: 4, role: "secret" }); }), /at most one secret span/);
  mentions(problemsAfter(({ authored: s }) => { find(s, "api-key-base").expected.spans[0].base = `${A}--second-api-key-base`; }), /states no base/);
  mentions(problemsAfter(({ authored: s }) => { find(s, "key-base64-standard-padded-whole").derivation.bases = [`${A}--key-base64-nested-url-safe-over-standard`]; }), /is not an authored base/);
  mentions(problemsAfter(({ authored: s }) => { find(s, "key-base64-standard-padded-whole").derivation.bases = ["nowhere--x"]; }), /unknown fixture/);
  mentions(problemsAfter(({ authored: s }) => { delete find(s, "key-base64-standard-padded-whole").derivation; }), /need derivation\.kind projection/);
  mentions(problemsAfter(({ generated: g }) => { g.fixtures[0].derivation.bases = [`${A}--second-api-key-base`]; }), /recipe inserts .* does not list/);
  mentions(problemsAfter(({ generated: g }) => { g.fixtures[0].recipe.parts[0].fixture = `${A}--key-base64-standard-padded-whole`; g.fixtures[0].derivation.bases = [`${A}--key-base64-standard-padded-whole`]; }), /not an authored base/);
});

test("a plan declares its bases and its cells may use only those", () => {
  mentions(problemsAfter(({ plan }) => { plan.generation.inputs = plan.generation.inputs.filter((i) => i.id !== `${A}--second-api-key-base`); }), /is not a fixture input of plan/);
  mentions(problemsAfter(({ plan }) => { plan.generation.inputs.push({ kind: "fixture", id: `${A}--key-base64-standard-padded-whole` }); }), /is not an authored base/);
  mentions(problemsAfter(({ plan }) => { plan.generation.inputs.push({ kind: "fixture", id: "nowhere--x" }); }), /unknown fixture/);
});

test("schema: one content form, closed vocabularies, bounded recipes", () => {
  const set = authored();
  const base = find(set, "api-key-base");
  const withItem = (item) => errorsOf({ ...set, fixtures: [item] });
  assert.deepEqual(withItem(base), []);
  assert.ok(withItem({ ...base, bytesHex: "00" }).length, "text and bytesHex together");
  assert.ok(withItem((({ text, ...r }) => r)(base)).length, "no content at all");
  assert.ok(withItem({ ...(({ text, ...r }) => r)(base), bytesHex: "abc" }).length, "odd hex");
  assert.ok(withItem({ ...(({ text, ...r }) => r)(base), bytesHex: "AB" }).length, "upper-case hex");
  assert.ok(withItem({ ...base, derivation: { kind: "authored-base", bases: ["a--b"] } }).length, "bases only on a projection");
  assert.ok(withItem({ ...base, derivation: { kind: "projection" } }).length, "a projection names its bases");
  assert.ok(withItem({ ...base, transformation: { steps: [{ op: "encode", codec: "rot13" }] } }).length);
  assert.ok(withItem({ ...base, derivation: { kind: "authored-base" }, transformation: { steps: [{ op: "repeat", count: 2 }] } }).length, "an authored base is not transformed");
  assert.ok(withItem({ ...base, inputValidity: "rejected" }).length);
  assert.ok(withItem({ ...base, inputValidity: "invalid-utf8" }).length, "not-valid input is not assertable");
  const proj = find(set, "key-split-by-shell-line-continuation");
  assert.ok(withItem({ ...proj, transformation: { steps: [{ op: "fragment", mechanism: "m", lineBreak: "lf" }] } }).length, "reconstruction is required");
  assert.ok(withItem({ ...proj, transformation: { steps: [{ op: "fragment", mechanism: "m", lineBreak: "lf", reconstruction: "joins" }] } }).length);
  const gen = generated();
  const g0 = gen.fixtures[0];
  assert.ok(errorsOf({ ...gen, fixtures: [{ ...g0, recipe: { parts: [{ repeat: { text: "x", times: 4194305 } }] } }] }).length, "repeat ceiling");
  assert.ok(errorsOf({ ...gen, fixtures: [{ ...g0, recipe: { parts: [] } }] }).length);
  assert.ok(errorsOf({ ...gen, fixtures: [{ ...g0, recipe: { parts: [{ text: "x", fixture: "a--b" }] } }] }).length);
  const span = base.expected.spans[0];
  assert.ok(withItem({ ...base, expected: { outcome: "must-flag", spans: [{ ...span, fragments: [{ start: 1, end: 2 }] }] } }).length, "fragments need at least two");
  assert.ok(withItem({ ...base, expected: { outcome: "must-flag", spans: [{ ...span, decoded: { via: [], sha256: "0".repeat(64), bytes: 1 } }] } }).length, "via needs a step");
  assert.ok(withItem({ ...base, expected: { outcome: "must-flag", spans: [{ ...span, decoded: { via: [{ codec: "strip-codepoints", codePoints: ["200B"] }], sha256: "0".repeat(64), bytes: 1 } }] } }).length, "code point syntax");
});

// ---- The report --------------------------------------------------------------

test("the base report counts independent bases apart from generated projections", () => {
  const records = exampleEntries().map((e) => e.record);
  const input = { sets: records.filter((r) => r.kind === "fixture-set"), cases: records.filter((r) => r.kind === "case"), plans: records.filter((r) => r.kind === "fixture-plan") };
  const report = buildBasesReport(input);
  assert.equal(report.totals.authoredBases, 3);
  assert.equal(report.totals.generatedProjections, 5);
  assert.equal(report.totals.authoredProjections, 11);
  assert.equal(report.totals.unattributed, 4);
  const plan = report.plans.find((p) => p.plan === "examplecloud-representation-projections");
  assert.equal(plan.generatedProjections, 5);
  assert.equal(plan.independentBaseValues, 2, "five generated inputs, two independent bases");
  assert.deepEqual(plan.usedButNotDeclared, []);
  assert.deepEqual(plan.declaredButUnused, []);
  const old = report.plans.find((p) => p.plan === "examplecloud-api-key-near-misses");
  assert.deepEqual([old.generatedProjections, old.unattributed, old.independentBaseValues], [0, 2, 0]);
  assert.equal(renderBasesReport(buildBasesReport(input)), renderBasesReport(buildBasesReport({ ...input, sets: [...input.sets].reverse() })), "order of input never changes the report");
});

test("two base ids holding the same value count once", () => {
  const records = exampleEntries().map((e) => structuredClone(e.record));
  const set = records.find((r) => r.id === A);
  const twin = structuredClone(find(set, "api-key-base"));
  twin.id = `${A}--api-key-base-again`;
  twin.path = "api-key-base-again/input.txt";
  set.fixtures.push(twin);
  const gen = records.find((r) => r.id === G);
  gen.fixtures[1].derivation.bases = [twin.id];
  gen.fixtures[1].recipe.parts[1].fixture = twin.id;
  const report = buildBasesReport({ sets: records.filter((r) => r.kind === "fixture-set"), cases: records.filter((r) => r.kind === "case"), plans: records.filter((r) => r.kind === "fixture-plan") });
  assert.equal(report.totals.authoredBases, 4);
  assert.equal(report.totals.distinctAuthoredBaseValues, 3);
  assert.deepEqual(report.duplicateBaseValues, [[`${A}--api-key-base`, twin.id].sort()]);
  assert.equal(report.plans.find((p) => p.plan === "examplecloud-representation-projections").independentBaseValues, 2);
});
