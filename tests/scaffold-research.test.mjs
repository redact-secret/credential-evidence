// record:new kinds added for the research skills (issue #23): variant, benign-sibling,
// family-narrative, review (new and --append) and fixture (an item of an authored set).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { PLACEHOLDER } from "../scripts/lib/placeholders.mjs";
import { loadIndex, planRecord, ScaffoldError } from "../scripts/lib/scaffold.mjs";
import { createValidator, repoRoot, validateTree } from "../scripts/lib/validator.mjs";

const validator = createValidator();
const today = "2026-10-01";
const index = loadIndex(repoRoot);
const aws = "aws:iam-user-access-key";
const plan = (kind, args, opts = {}, idx = index) => planRecord(kind, args, opts, { index: idx, today, validator });
const refused = (kind, args, opts, re, idx = index) => assert.throws(() => plan(kind, args, opts, idx), (e) => e instanceof ScaffoldError && re.test(e.message), `${kind} ${args} ${JSON.stringify(opts)}`);

test("variant: needs a family, a type and a first change; history is append-only data, not guessed", () => {
  const opts = { family: aws, name: "Retired form", "variant-type": "historical-form", change: "retired" };
  const p = plan("variant", ["retired-example-form"], opts);
  assert.deepEqual(validator.validateRecord(p.record), []);
  assert.equal(p.path, "records/variants/aws/retired-example-form.json");
  assert.equal(p.record.history.length, 1);
  assert.equal(p.record.history[0].change, "retired");
  assert.deepEqual(p.record.history[0].sources, []);
  assert.deepEqual(p.record.effective, { from: null, until: null });
  assert.ok(p.record.history[0].note.includes(PLACEHOLDER));
  refused("variant", ["x-form"], { ...opts, family: "aws:nothing" }, /unknown family/);
  refused("variant", ["x-form"], { ...opts, "variant-type": "bogus" }, /--variant-type/);
  refused("variant", ["x-form"], { ...opts, change: undefined }, /--change/);
  refused("variant", ["x-form"], { ...opts, contract: "gitlab:nope@1" }, /unknown contract/);
  refused("variant", ["x-form"], { ...opts, replaces: "no-such-variant" }, /unknown variant/);
  refused("variant", ["beta8-form"], opts, /forbidden identity coordinate/);
});

test("benign-sibling: starts unresolved with no sources and no sample", () => {
  const p = plan("benign-sibling", ["example-public-id"], { family: [aws, "aws:iam-user-secret-access-key"], "sibling-class": "public-identifier", name: "Public id" });
  assert.deepEqual(validator.validateRecord(p.record), []);
  assert.equal(p.path, "records/siblings/aws/example-public-id.json");
  assert.equal(p.record.evidenceClass, "unresolved");
  assert.deepEqual(p.record.sources, []);
  assert.equal(p.record.samples, undefined);
  refused("benign-sibling", ["x-sib"], { "sibling-class": "public-identifier", name: "x" }, /--family/);
  refused("benign-sibling", ["x-sib"], { family: aws, "sibling-class": "nonsense", name: "x" }, /--sibling-class/);
  refused("benign-sibling", ["x-sib"], { family: "aws:nothing", "sibling-class": "lookalike", name: "x" }, /unknown family/);
});

test("family-narrative: one unresolved placeholder per section, contract resolved, no project name in notes", () => {
  const withoutNarrative = [...index.filter((e) => !(e.record.kind === "family-narrative" && e.record.id === aws))];
  const p = plan("family-narrative", [aws], {}, withoutNarrative);
  assert.deepEqual(validator.validateRecord(p.record), []);
  assert.equal(p.path, "records/narratives/aws/iam-user-access-key.json");
  assert.deepEqual(Object.keys(p.record.sections), ["shape", "issuance", "lifecycle", "collisions", "openQuestions"]);
  assert.ok(p.record.contract.startsWith(`${aws}@`));
  assert.ok(p.record.sections.shape[0].evidenceClass === "unresolved");
  assert.ok(!/Redact Secret/.test(p.record.notes), "the narrative lint rejects the project name in notes");
  refused("family-narrative", [aws], {}, /already exists/);
  refused("family-narrative", ["aws:nothing"], {}, /unknown family/);
});

test("review: authored by default, agents cannot write a review, unresolved events are numbered", () => {
  const noHistory = index.filter((e) => !(e.record.kind === "evidence-review-history" && e.record.subject.kind === "family-narrative" && e.record.subject.id === aws));
  const p = plan("review", [`family-narrative:${aws}`], { actor: "test-agent", role: "automation", note: "Drafted by an agent.", unresolved: ["shape/a-statement=No source gives the length.", "openQuestions/other-statement=Disputed, with a comma."] }, noHistory);
  assert.deepEqual(validator.validateRecord(p.record), []);
  assert.equal(p.path, "records/narrative-reviews/aws/iam-user-access-key.json");
  assert.deepEqual(p.record.events.map((e) => [e.seq, e.type, e.verdict]), [[1, "authored", undefined], [2, "observed", "not-assertable"], [3, "observed", "not-assertable"]]);
  assert.match(p.record.events[2].note, /Disputed, with a comma\./);
  assert.match(p.note, /a-statement -> unresolved\.reviewEvent 2; other-statement -> unresolved\.reviewEvent 3/);
  refused("review", [`family-narrative:${aws}`], { actor: "a", event: "reviewed" }, /second person/, noHistory);
  refused("review", [`family-narrative:${aws}`], { actor: "a", event: "resolved" }, /second person/, noHistory);
  refused("review", [`family-narrative:${aws}`], { actor: "a", role: "reviewer" }, /--role/, noHistory);
  refused("review", [`family-narrative:${aws}`], { actor: "a", unresolved: ["bogus=x"] }, /--unresolved/, noHistory);
  refused("review", [`family-narrative:${aws}`], { actor: "a" }, /already holds the review history/);
  refused("review", ["provider:aws"], { actor: "a" }, /review subject/);
  refused("review", ["case:no-such-case"], { actor: "a" }, /unknown case/);
});

test("review: an evidence-source is a supported subject, and --unresolved names a statement directly outside a narrative (#86)", () => {
  const hasHistory = (id) => index.some((h) => h.record.kind === "evidence-review-history" && h.record.subject.kind === "evidence-source" && h.record.subject.id === id);
  const src = index.find((e) => e.record.kind === "evidence-source" && !hasHistory(e.record.id)).record;
  const p = plan("review", [`evidence-source:${src.id}`], { actor: "test-agent", role: "automation", note: "Re-read the page; the version line is not shown.", unresolved: ["version-line=The page does not show which API version the key belongs to."] });
  assert.deepEqual(validator.validateRecord(p.record), []);
  assert.deepEqual(p.record.subject, { kind: "evidence-source", id: src.id });
  assert.equal(p.path, `records/reviews/evidence-source/${src.id}.json`);
  assert.deepEqual(p.record.events.map((e) => [e.seq, e.type, e.verdict]), [[1, "authored", undefined], [2, "observed", "not-assertable"]]);
  assert.match(p.record.events[1].note, /^Statement 'version-line' is recorded as unresolved: The page does not show/);
  assert.match(p.note, /set these on the evidence-source: version-line -> unresolved\.reviewEvent 2/);
  // outside a narrative there are no sections: the narrative form is refused with the right shape, and so is a bare id inside one
  refused("review", [`evidence-source:${src.id}`], { actor: "a", unresolved: ["shape/version-line=x"] }, /--unresolved for a evidence-source must be <statement-id>=<reason>/);
  const noNarrativeHistory = index.filter((e) => !(e.record.kind === "evidence-review-history" && e.record.subject.kind === "family-narrative" && e.record.subject.id === aws));
  refused("review", [`family-narrative:${aws}`], { actor: "a", unresolved: ["version-line=x"] }, /--unresolved for a family-narrative must be <section>\/<statement-id>=<reason>/, noNarrativeHistory);
});

test("review --append adds events after the last seq and never touches earlier ones; an imported history takes one too (ADR 0015)", () => {
  const mine = {
    path: "records/reviews/mine/x.json",
    record: { schemaVersion: 1, kind: "evidence-review-history", id: "review-mine-x", subject: { kind: "family", id: aws }, events: [{ seq: 1, type: "authored", at: "2026-09-30", actor: { id: "a", role: "author", affiliation: "project-maintainer" }, note: "first" }] },
  };
  const idx = [...index.filter((e) => !(e.record.kind === "evidence-review-history" && e.record.subject.kind === "family" && e.record.subject.id === aws)), mine];
  const p = plan("review", [`family:${aws}`], { actor: "b", role: "automation", append: true, event: "observed", verdict: "inconclusive", note: "second" }, idx);
  assert.equal(p.append, true);
  assert.equal(p.path, mine.path);
  assert.deepEqual(p.record.events[0], mine.record.events[0]);
  assert.deepEqual(p.record.events.map((e) => e.seq), [1, 2]);
  assert.equal(p.record.events[1].verdict, "inconclusive");
  assert.deepEqual(validator.validateRecord(p.record), []);
  // the imported history of an AWS family is no longer refused: the edit is declared as a baseline amendment by the CLI
  const imported = plan("review", [`family:${aws}`], { actor: "b", role: "automation", append: true, event: "observed", verdict: "inconclusive", note: "Re-read; unchanged." });
  assert.equal(imported.append, true);
  assert.ok(imported.record.externalRefs.some((r) => r.system.startsWith("legacy-")));
  assert.deepEqual(imported.record.events.slice(0, -1), index.find((e) => e.path === imported.path).record.events);
  refused("review", ["case:no-such"], { actor: "b", append: true }, /unknown case/);
  const withHistory = new Set(index.filter((e) => e.record.kind === "evidence-review-history" && e.record.subject.kind === "case").map((e) => e.record.subject.id));
  const someCase = index.find((e) => e.record.kind === "case" && !withHistory.has(e.record.id)).record.id;
  refused("review", [`case:${someCase}`], { actor: "b", append: true }, /no review history exists/);
});

// ---------------------------------------------------------------- fixture, end to end in a scratch root

function cli(args) {
  return spawnSync(process.execPath, [join(repoRoot, "scripts", "record-new.mjs"), ...args], { encoding: "utf8" });
}

test("fixture: computed sha256 and UTF-8 byte spans, outcome taken from the case, authored sets only", () => {
  const root = mkdtempSync(join(tmpdir(), "record-new-fixture-"));
  try {
    const run = (...a) => cli([...a, "--root", root, "--date", today]);
    const ok = (r) => assert.equal(r.status, 0, r.stderr + r.stdout);
    ok(run("provider", "examplevendor", "--name", "Example Vendor"));
    ok(run("family", "examplevendor:api-key", "--name", "API key", "--description", "A key the vendor documents."));
    ok(run("case", "example-key-in-env-line", "--title", "Key in an env line", "--type", "positive", "--family", "examplevendor:api-key=subject"));
    const caseFile = join(root, "records/cases/example-key-in-env-line.json");

    // a not-assertable case cannot have a fixture: it would assert nothing
    const early = run("fixture", "example-key-in-env-line", "--set", "examplevendor-authored", "--name", "env-line", "--text", "K=v", "--secret", "v");
    assert.equal(early.status, 1);
    assert.match(early.stderr, /not-assertable/);

    // raise the case the way an author would: documented basis needs a source
    ok(run("source", "https://docs.example.org/keys", "--source-type", "provider-documentation", "--observer", "test-agent", "--title", "Keys"));
    const sourceId = loadIndex(root).find((e) => e.record.kind === "evidence-source").record.id;
    const rec = JSON.parse(readFileSync(caseFile, "utf8"));
    rec.summary = "A key in an env line.";
    rec.rationale = "The value follows the documented grammar.";
    rec.expectation = { outcome: "must-flag", basis: "provider-documented", rationale: "Matches the documented grammar.", sources: [{ sourceId, supports: "Documents the grammar." }], observedAt: today };
    writeFileSync(caseFile, `${JSON.stringify(rec, null, 2)}\n`);

    const text = "ÅPI_KEY=exv_SYNTHETIC0000000000000000\n";
    const value = "exv_SYNTHETIC0000000000000000";
    ok(run("fixture", "example-key-in-env-line", "--set", "examplevendor-authored", "--name", "env-line", "--text", text, "--secret", value, "--context", "shell-assignment", "--title", "ExampleVendor authored fixtures"));
    const set = JSON.parse(readFileSync(join(root, "records/fixtures/examplevendor-authored.json"), "utf8"));
    assert.equal(set.generated, false);
    assert.deepEqual(set.origin, { type: "authored-cases" });
    const item = set.fixtures[0];
    assert.equal(item.id, "examplevendor-authored--env-line");
    assert.equal(item.case, "example-key-in-env-line");
    assert.equal(item.sha256, createHash("sha256").update(Buffer.from(text, "utf8")).digest("hex"));
    // "Å" is two bytes in UTF-8, so a character offset would be wrong by one
    const start = Buffer.from(text, "utf8").indexOf(Buffer.from(value));
    assert.equal(start, text.indexOf(value) + 1);
    assert.deepEqual(item.expected, { outcome: "must-flag", spans: [{ start, end: start + Buffer.byteLength(value), role: "secret", note: "Synthetic value; never issued." }] });

    // a second item appends to the same authored set; nothing earlier changes
    ok(run("fixture", "example-key-in-env-line", "--set", "examplevendor-authored", "--name", "env-line-two", "--text", `${value}\n`, "--secret", value));
    const set2 = JSON.parse(readFileSync(join(root, "records/fixtures/examplevendor-authored.json"), "utf8"));
    assert.equal(set2.fixtures.length, 2);
    assert.deepEqual(set2.fixtures[0], item);

    // refusals
    const again = run("fixture", "example-key-in-env-line", "--set", "examplevendor-authored", "--name", "env-line", "--text", text, "--secret", value);
    assert.equal(again.status, 1);
    assert.match(again.stderr, /already exists/);
    const none = run("fixture", "example-key-in-env-line", "--set", "examplevendor-authored", "--name", "no-secret", "--text", "K=v");
    assert.match(none.stderr, /must-flag fixture needs at least one --secret/);
    const missing = run("fixture", "example-key-in-env-line", "--set", "examplevendor-authored", "--name", "gone", "--text", "K=v", "--secret", "absent");
    assert.match(missing.stderr, /does not occur/);
    const twice = run("fixture", "example-key-in-env-line", "--set", "examplevendor-authored", "--name", "twice", "--text", "a a", "--secret", "a");
    assert.match(twice.stderr, /more than once/);
    const both = run("fixture", "example-key-in-env-line", "--set", "examplevendor-authored", "--name", "both", "--text", "x", "--text-file", "y", "--secret", "x");
    assert.match(both.stderr, /exactly one of --text/);
    const legacySuite = run("fixture", "example-key-in-env-line", "--set", "accuracy", "--name", "x", "--text", "k", "--secret", "k");
    assert.equal(legacySuite.status, 1);
    assert.match(legacySuite.stderr, /forbidden identity coordinate/);

    // the whole scratch tree validates: the case is projected, the fixture agrees with its outcome
    const tree = validateTree([join(root, "records")], { root });
    assert.deepEqual(tree.errors, []);

    // a generated or imported set is never extended by hand
    const gen = JSON.parse(readFileSync(join(root, "records/fixtures/examplevendor-authored.json"), "utf8"));
    gen.id = "generated-set";
    gen.fixtures = gen.fixtures.map((f) => ({ ...f, id: f.id.replace("examplevendor-authored", "generated-set") }));
    gen.generated = true;
    gen.origin = { type: "generation-rule", rule: "r", generator: { name: "g", version: "1", sourceRevision: "1".repeat(40), entrypoint: "g.mjs" } };
    writeFileSync(join(root, "records/fixtures/generated-set.json"), `${JSON.stringify(gen, null, 2)}\n`);
    const refusedSet = run("fixture", "example-key-in-env-line", "--set", "generated-set", "--name", "more", "--text", "k", "--secret", "k");
    assert.equal(refusedSet.status, 1);
    assert.match(refusedSet.stderr, /generated or imported/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fixture: a must-not-flag case takes no spans", () => {
  const root = mkdtempSync(join(tmpdir(), "record-new-fixture-silent-"));
  try {
    const run = (...a) => cli([...a, "--root", root, "--date", today]);
    assert.equal(run("provider", "examplevendor", "--name", "Example Vendor").status, 0);
    assert.equal(run("family", "examplevendor:public-id", "--name", "Public id", "--description", "A public id.").status, 0);
    assert.equal(run("case", "example-public-id-in-page", "--title", "Public id in a page", "--type", "benign", "--family", "examplevendor:public-id=subject").status, 0);
    const caseFile = join(root, "records/cases/example-public-id-in-page.json");
    const rec = JSON.parse(readFileSync(caseFile, "utf8"));
    rec.summary = "s";
    rec.rationale = "r";
    rec.expectation = { outcome: "must-not-flag", basis: "project-policy", rationale: "Maintainer decision recorded.", sources: [], observedAt: today };
    writeFileSync(caseFile, `${JSON.stringify(rec, null, 2)}\n`);
    const spans = run("fixture", "example-public-id-in-page", "--set", "examplevendor-authored", "--name", "page", "--text", "id=pub_x", "--secret", "pub_x");
    assert.equal(spans.status, 1);
    assert.match(spans.stderr, /has no spans/);
    const ok = run("fixture", "example-public-id-in-page", "--set", "examplevendor-authored", "--name", "page", "--text", "id=pub_x", "--title", "Authored");
    assert.equal(ok.status, 0, ok.stderr);
    assert.deepEqual(JSON.parse(readFileSync(join(root, "records/fixtures/examplevendor-authored.json"), "utf8")).fixtures[0].expected, { outcome: "must-not-flag", spans: [] });
    assert.deepEqual(validateTree([join(root, "records")], { root }).errors, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI: review and narrative skeletons through the command line", () => {
  const root = mkdtempSync(join(tmpdir(), "record-new-review-"));
  try {
    const run = (...a) => cli([...a, "--root", root, "--date", today]);
    const ok = (r) => assert.equal(r.status, 0, r.stderr + r.stdout);
    ok(run("provider", "examplevendor", "--name", "Example Vendor"));
    ok(run("family", "examplevendor:api-key", "--name", "API key", "--description", "A key."));
    ok(run("contract", "examplevendor:api-key"));
    const n = run("family-narrative", "examplevendor:api-key");
    ok(n);
    assert.match(n.stdout, /10 field\(s\) to write/);
    const r = run("review", "family-narrative:examplevendor:api-key", "--actor", "test-agent", "--role", "automation", "--note", "Drafted by an agent.", "--unresolved", "shape/length=Not documented.");
    ok(r);
    assert.match(r.stdout, /length -> unresolved\.reviewEvent 2/);
    const more = run("review", "family-narrative:examplevendor:api-key", "--append", "--event", "observed", "--actor", "test-agent", "--role", "automation", "--note", "Re-read; unchanged.");
    ok(more);
    assert.match(more.stdout, /appended to records\/narrative-reviews\/examplevendor\/api-key\.json/);
    const hist = JSON.parse(readFileSync(join(root, "records/narrative-reviews/examplevendor/api-key.json"), "utf8"));
    assert.deepEqual(hist.events.map((e) => e.seq), [1, 2, 3]);
    ok(run("variant", "example-retired-form", "--family", "examplevendor:api-key", "--name", "Retired form", "--variant-type", "historical-form", "--change", "retired"));
    ok(run("benign-sibling", "example-public-id", "--family", "examplevendor:api-key", "--sibling-class", "public-identifier", "--name", "Public id"));
    // every skeleton fails the placeholder lint until written
    const tree = validateTree([join(root, "records")], { root });
    assert.ok(tree.errors.some((e) => e.includes("placeholder:")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
