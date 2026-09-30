// Tests for the reclassifying import (#12 stage B), the semantic tree it writes and the
// fixture materialization.
//
// Two groups. The first reads only committed records and always runs. The second
// compares the records with the pinned legacy revision (it runs the legacy fixture
// generators) and runs when a legacy checkout is reachable (LEGACY_BENCHMARKS_DIR or a
// sibling directory); set REQUIRE_LEGACY=1 to make a missing checkout a failure.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { identityViolations } from "../scripts/lib/identity.mjs";
import { buildMaterialization } from "../scripts/lib/materialize.mjs";
import { checkIntegrity, repoRoot, validateTree } from "../scripts/lib/validator.mjs";
import { CASES } from "../scripts/migrate/authored/cases.mjs";
import { SCENARIOS } from "../scripts/migrate/authored/scenarios.mjs";
import { scrubFileName, scrubName } from "../scripts/migrate/lib/build-records.mjs";
import { classifyAgg, RULES } from "../scripts/migrate/lib/classify.mjs";
import { loadLegacyModel, loadTaxonomy } from "../scripts/migrate/lib/legacy-model.mjs";
import { findLegacyDir, LEGACY_PATHS, LEGACY_REVISION, loadGeneratedCorpora, materializeLegacy, readLegacyJson } from "../scripts/migrate/lib/legacy-source.mjs";

const { errors, records } = validateTree([join(repoRoot, "records"), join(repoRoot, "migration")]);
const all = records.map((r) => r.record);
const entries = records;
const byKind = (kind) => all.filter((r) => r.kind === kind);
const cases = byKind("case");
const scenarios = byKind("scenario");
const plans = byKind("fixture-plan");
const sets = byKind("fixture-set");
const maps = byKind("legacy-map");
const caseById = new Map(cases.map((c) => [c.id, c]));
const scenarioById = new Map(scenarios.map((s) => [s.id, s]));
const items = sets.flatMap((s) => s.fixtures.map((item) => ({ set: s, item })));
const itemById = new Map(items.map((x) => [x.item.id, x]));

const dirBytes = (dir) => {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    n += statSync(p).isDirectory() ? dirBytes(p) : statSync(p).size;
  }
  return n;
};

describe("the semantic tree (no legacy checkout needed)", () => {
  test("every record validates: schema, references, cell and evidence integrity, legacy-map targets", () => {
    assert.deepEqual(errors, []);
    assert.equal(items.length, 5925);
  });

  test("the tree is shaped: tens of Cases, tens of Scenarios, a few plans, sets by provider", () => {
    assert.ok(cases.length >= 40 && cases.length <= 99, `cases: ${cases.length}`);
    assert.ok(scenarios.length >= 20 && scenarios.length <= 99, `scenarios: ${scenarios.length}`);
    assert.equal(plans.length, 5);
    assert.ok(sets.length < 120);
    assert.equal(cases.length, CASES.length);
    assert.equal(scenarios.length, SCENARIOS.length);
  });

  test("records live in the semantic directories and carry no legacy coordinate in id or path (zero baseline)", () => {
    const dirOf = { scenario: "records/scenarios/", case: "records/cases/", "fixture-plan": "records/fixture-plans/", "fixture-set": "records/fixtures/" };
    for (const { path, record } of entries) {
      if (dirOf[record.kind]) {
        assert.ok(path.startsWith(dirOf[record.kind]), path);
        assert.equal(path, `${dirOf[record.kind]}${record.id}.json`);
        assert.deepEqual(identityViolations(record, path), [], path);
      }
    }
    assert.ok(!existsSync(join(repoRoot, "scripts", "lint", "identity-baseline.json")), "the identity baseline is gone");
  });

  test("every fixture projects a Case or a plan cell, agrees with its outcome and cites its own evidence", () => {
    let cellItems = 0;
    let caseItems = 0;
    for (const { set, item } of items) {
      assert.ok(Boolean(item.case) !== Boolean(item.cell), `${item.id}: exactly one of case and cell`);
      assert.ok(item.evidence && set.evidence[item.evidence], `${item.id}: evidence`);
      if (item.case) {
        caseItems += 1;
        assert.equal(item.expected.outcome, caseById.get(item.case).expectation.outcome, item.id);
      } else {
        cellItems += 1;
        const plan = plans.find((p) => p.id === item.cell.plan);
        assert.ok(plan.matrix.targets.some((t) => t.id === item.cell.scenario), item.id);
        assert.ok(item.cell.families.every((f) => plan.matrix.families.ids.includes(f)), item.id);
        assert.equal(scenarioById.get(item.cell.scenario).expectedOutcomeClass, item.expected.outcome, item.id);
      }
      const { basis } = set.evidence[item.evidence];
      assert.equal(basis === "unresolved", item.expected.outcome === "not-assertable", item.id);
    }
    assert.equal(caseItems + cellItems, 5925);
    assert.ok(caseItems < 400 && cellItems > 5500, `case fixtures ${caseItems}, cell fixtures ${cellItems}`);
    const projected = new Set(items.map(({ item }) => item.case).filter(Boolean));
    for (const c of cases) assert.ok(projected.has(c.id), `${c.id}: no fixture`);
  });

  test("evidence tier is not identity: no id, path or grouping carries a tier, and mixed-tier fixtures share a Case", () => {
    for (const r of [...cases, ...scenarios, ...plans, ...sets]) assert.doesNotMatch(r.id, /(^|-)(t[0-3]|tier|project-policy|provider-documented|tool-corroborated|unresolved)(-|$)/, r.id);
    // a Case whose fixtures differ in basis stays one record
    const mixed = cases.filter((c) => new Set(items.filter(({ item }) => item.case === c.id).map(({ set, item }) => set.evidence[item.evidence].basis)).size > 1);
    assert.ok(mixed.length >= 1);
    for (const c of mixed) assert.equal(cases.filter((x) => x.id === c.id).length, 1);
    const weakest = (bases) => ["unresolved", "project-policy", "tool-corroborated", "provider-documented"].find((b) => bases.has(b));
    for (const c of cases) {
      const bases = new Set(items.filter(({ item }) => item.case === c.id).map(({ set, item }) => set.evidence[item.evidence].basis));
      assert.equal(c.expectation.basis, weakest(bases), `${c.id}: the case states the weakest basis of its fixtures`);
    }
  });

  test("Cases are hand-authored: specific prose, never template wording, scenario references that resolve", () => {
    const seen = new Set();
    for (const c of cases) {
      for (const field of ["title", "summary", "rationale"]) assert.ok(c[field].length >= 25, `${c.id} ${field}`);
      assert.ok(c.expectation.rationale.length >= 40, c.id);
      assert.doesNotMatch(`${c.title} ${c.summary} ${c.rationale}`, /one-property twin|Covers \d+ input|must be flagged$|benign .* controls$/i, c.id);
      assert.ok(!seen.has(c.summary), `${c.id}: duplicate summary`);
      seen.add(c.summary);
      for (const s of c.scenarios ?? []) assert.ok(scenarioById.has(s), `${c.id}: ${s}`);
      assert.match(c.notes, /Project-authored by the Redact Secret project/);
      assert.equal(c.lifecycle, "draft");
      if (["provider-documented", "tool-corroborated"].includes(c.expectation.basis)) assert.ok(c.expectation.sources.length > 0, c.id);
    }
    const authored = new Map(CASES.map((c) => [c.id, c]));
    for (const c of cases) assert.equal(c.summary, authored.get(c.id).summary);
  });

  test("Scenarios are written once: no family names, per-scenario semantics, and every plan target exists", () => {
    const families = byKind("family");
    for (const s of scenarios) {
      assert.ok(s.description.length >= 40 && s.semantics.length >= 40, s.id);
      assert.equal(s.applicability.appliesTo, "any-family", s.id);
      for (const f of families.slice(0, 40)) assert.ok(!s.description.includes(f.name) || f.name.length < 5, `${s.id} mentions ${f.name}`);
      assert.equal(s.lifecycle, "draft");
    }
    for (const p of plans) {
      assert.equal(p.lineage.origin, "reclassified-from-cases");
      assert.equal(p.matrix.coverage, "sparse");
      for (const t of p.matrix.targets) assert.ok(scenarioById.has(t.id), `${p.id}: ${t.id}`);
      const cellSets = new Set(items.filter(({ item }) => item.cell?.plan === p.id).map(({ set }) => set.id));
      assert.deepEqual([...cellSets].sort(), [...p.output].sort(), `${p.id}: output sets`);
    }
    // the one carrier of a scenario's reasoning is the scenario: a plan holds no prose of its own beyond its description
    assert.ok(!plans.some((p) => "summary" in p || "rationale" in p));
  });

  test("authored and generated content are separated; generated sets record their generator", () => {
    for (const s of sets) {
      if (s.generated) {
        assert.equal(s.origin.type, "generation-rule", s.id);
        assert.equal(s.origin.generator.sourceRevision, LEGACY_REVISION);
        assert.ok(!s.id.startsWith("authored-"), s.id);
      } else {
        assert.equal(s.origin.type, "authored-cases", s.id);
        assert.ok(s.id.startsWith("authored-"), s.id);
      }
      assert.equal(s.imported, undefined, `${s.id}: sets are organised by provider, not by suite`);
    }
    assert.equal(items.filter(({ set }) => !set.generated).length, 140);
    assert.equal(items.filter(({ set }) => set.generated).length, 5785);
  });

  test("twin and mutation lineage is preserved at fixture level", () => {
    let twins = 0;
    for (const { item } of items) {
      if (!item.lineage) continue;
      twins += 1;
      assert.equal(item.lineage.relation, "twin-of");
      assert.ok(itemById.has(item.lineage.of), `${item.id}: lineage.of`);
      assert.notEqual(item.lineage.of, item.id);
    }
    assert.equal(twins, 1391);
  });

  test("the legacy map traces every legacy suite, imported case and fixture; nothing is dropped", () => {
    const entriesOf = maps.flatMap((m) => m.entries);
    const of = (type) => entriesOf.filter((e) => e.legacy.type === type);
    assert.equal(maps.length, 67);
    assert.equal(of("suite").length, 67);
    assert.equal(of("case").length, 1925);
    assert.equal(of("fixture").length, 5925);
    assert.ok(!entriesOf.some((e) => e.relation === "dropped" || e.canonical === null));
    const mapped = new Set(of("fixture").map((e) => e.canonical.id));
    assert.equal(mapped.size, 5925);
    for (const { item } of items) assert.ok(mapped.has(item.id), item.id);
    for (const m of maps) {
      assert.equal(m.source.revision, LEGACY_REVISION);
      for (const e of m.entries) if (e.legacy.type === "fixture") assert.ok(e.legacy.id.startsWith(`${m.id}--`), e.legacy.id);
    }
    // legacy names appear only in the map and in provenance
    const relations = new Map();
    for (const e of of("case")) relations.set(e.relation, (relations.get(e.relation) ?? 0) + 1);
    assert.deepEqual([...relations.keys()].sort(), ["merged", "reclassified-as-projection", "reclassified-as-scenario", "same"]);
    assert.equal([...relations.values()].reduce((a, b) => a + b, 0), 1925);
  });

  test("no legacy coordinate outside provenance: ids, paths, plan and cell references, evidence keys", () => {
    for (const { set, item } of items) {
      assert.doesNotMatch(item.id, /beta-?\d|milestone-?\d|(issue|pr|gh)-?\d|detector|trufflehog|gitleaks/, item.id);
      assert.doesNotMatch(item.path, /beta-?\d|milestone-?\d|(issue|pr|gh)-?\d/i, item.path);
      assert.ok(item.id.startsWith(`${set.id}--`));
    }
    for (const c of cases) for (const x of c.externalRefs ?? []) assert.ok(["legacy-benchmark-source", "redact-secret-benchmarks-issue", "redact-secret-issue"].includes(x.system), `${c.id}: ${x.system}`);
  });

  test("names scrub to coordinate-free ids deterministically and keep file extensions", () => {
    assert.equal(scrubName("issue-254-changed-id"), "changed-id");
    assert.equal(scrubName("detector-aws-beta8-env"), "aws-env");
    assert.equal(scrubName("issue-254"), "fixture");
    assert.equal(scrubFileName("issue-254-changed-id.txt"), "changed-id.txt");
    assert.equal(scrubFileName("package-lock.json"), "package-lock.json");
    assert.equal(scrubFileName("Dockerfile"), "Dockerfile");
  });

  test("no scanner detector assignment, support status or product state enters the canonical model", () => {
    const bannedKeys = /^(detectors?|detectorIds?|arrivalTargets|supportStatus|status|stage|score|tier|expectedAction|policyFamily|policyConformance|candidate|promotion)$/;
    const walk = (v, rec) => {
      if (Array.isArray(v)) v.forEach((x) => walk(x, rec));
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) (assert.doesNotMatch(k, bannedKeys, `${rec.id}: key ${k}`), walk(x, rec));
    };
    for (const r of [...cases, ...scenarios, ...plans]) walk(r, r);
    for (const s of sets) {
      const { fixtures, evidence, ...rest } = s;
      walk(rest, s);
      for (const f of fixtures) for (const k of Object.keys(f)) assert.doesNotMatch(k, bannedKeys, `${f.id}: key ${k}`);
    }
  });

  test("incidents carry a failure mode, a date and a product pointer, on a Case or on the cell fixture", () => {
    const list = [...cases.flatMap((c) => c.incidents ?? []), ...items.flatMap(({ item }) => item.incidents ?? [])];
    assert.ok(list.length >= 50);
    for (const i of list) {
      assert.ok(["false-alarm", "missed-credential", "partial-coverage"].includes(i.failureMode));
      assert.match(i.observedAt, /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(i.externalRefs[0].system, "redact-secret-issue");
    }
    for (const { item } of items) if (item.incidents) assert.ok(item.cell, `${item.id}: incidents on a Case fixture belong to the Case`);
  });

  test("fixture content and spans are byte-exact, within the content, and envelopes enclose their span", () => {
    for (const { item } of items) {
      const bytes = Buffer.from(item.text, "utf8");
      assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256, item.id);
      for (const s of item.expected.spans) {
        assert.ok(s.end <= bytes.length && s.start < s.end, item.id);
        if (s.envelope) assert.ok(s.envelope.start <= s.start && s.envelope.end >= s.end && s.envelope.end <= bytes.length, item.id);
      }
      if (item.expected.outcome === "not-assertable") assert.deepEqual(item.expected.spans, []);
    }
  });

  test("every fixture set states how its secret-shaped values were built and that they are synthetic", () => {
    for (const s of sets) assert.match(s.notes, /synthetic/i, s.id);
  });

  test("the tree stays compact: sharded sets, evidence entries shared between fixtures", () => {
    const total = ["cases", "scenarios", "fixture-plans", "fixtures"].reduce((n, d) => n + dirBytes(join(repoRoot, "records", d)), 0);
    assert.ok(total < 12 * 1024 * 1024, `the semantic tree takes ${total} bytes`);
    assert.ok(dirBytes(join(repoRoot, "migration")) < 4 * 1024 * 1024);
    const entriesTotal = sets.reduce((n, s) => n + Object.keys(s.evidence).length, 0);
    assert.ok(entriesTotal < items.length / 2, `${entriesTotal} evidence entries for ${items.length} fixtures`);
  });

  test("integrity: a dangling case, cell, evidence key or lineage in a fixture set is reported", () => {
    const set = structuredClone(sets.find((s) => s.id === "authored-github"));
    const cellItem = set.fixtures.find((i) => i.cell);
    const caseItem = set.fixtures.find((i) => i.case);
    caseItem.case = "gone";
    cellItem.cell = { ...cellItem.cell, plan: "no-such-plan" };
    const third = set.fixtures.filter((i) => i !== cellItem && i !== caseItem)[0];
    third.evidence = "ev-missing";
    third.sha256 = "0".repeat(64);
    const fourth = set.fixtures.filter((i) => ![cellItem, caseItem, third].includes(i))[0];
    fourth.lineage = { relation: "twin-of", of: "authored-github--nothing" };
    const problems = checkIntegrity([{ path: "set.json", record: set }]).join("\n");
    assert.match(problems, /case 'gone' does not exist/);
    assert.match(problems, /cell\.plan 'no-such-plan' does not exist/);
    assert.match(problems, /evidence 'ev-missing' is not in the set's evidence map/);
    assert.match(problems, /sha256 does not match text/);
    assert.match(problems, /lineage\.of unknown fixture/);
  });
});

describe("classification rules", () => {
  const agg = (over) => ({ suite: "beta8-207", group: "#207 · x", role: "base", roleKind: "base", outcome: "must-flag", tier: "T3", legacyCaseId: "x", ...over });

  test("structure decides: tier T0 first, then carriers, authored cases, twins, controls, positives, lookalikes", () => {
    assert.equal(classifyAgg(agg({ tier: "T0", outcome: "not-assertable" })).rule, "unsettled-evidence");
    assert.equal(classifyAgg(agg({ role: "twin-length", roleKind: "twin", outcome: "must-not-flag" })).target.id, "wrong-length");
    assert.equal(classifyAgg(agg({ role: "control-reference", roleKind: "control", outcome: "must-not-flag" })).target.id, "templated-reference");
    assert.equal(classifyAgg(agg({ role: "control-near-miss", roleKind: "control", outcome: "must-flag" })).target.id, "credential-named-literal-near-miss");
    assert.equal(classifyAgg(agg({})).target.id, "documented-format-literal");
    assert.equal(classifyAgg(agg({ outcome: "must-not-flag" })).target.id, "benign-lookalike");
    assert.equal(classifyAgg(agg({ suite: "context-edges", group: "Quoting" })).rule, "carrier-scenario");
    assert.equal(classifyAgg(agg({ suite: "accuracy", group: "Token formats" })).target.id, "early-filler-token-assignments");
    assert.deepEqual(new Set(RULES.map((r) => r.class)), new Set(["case", "scenario", "projection"]));
  });

  test("there is no silent default: an unknown twin kind, control type or hand-authored group stops the import", () => {
    assert.throws(() => classifyAgg(agg({ role: "twin-gloss", roleKind: "twin", outcome: "must-not-flag" })), /no scenario for twin mutation kind/);
    assert.throws(() => classifyAgg(agg({ role: "control-mystery", roleKind: "control", outcome: "must-not-flag" })), /no scenario for control type/);
    assert.throws(() => classifyAgg(agg({ suite: "sendgrid-regressions", group: "Unheard of" })), /neither a carrier group nor listed/);
    assert.throws(() => classifyAgg(agg({ outcome: "may-flag" })), /no classification rule/);
  });
});

describe("materialization", () => {
  const built = buildMaterialization({ sets, cases, scenarios });

  test("every fixture becomes one file and one manifest entry that needs no case semantics", () => {
    assert.equal(built.files.size, 5925);
    assert.equal(built.manifest.count, 5925);
    assert.equal(built.manifest.formatVersion, 2);
    for (const e of built.manifest.fixtures) {
      assert.ok(built.files.has(e.path));
      assert.equal(createHash("sha256").update(built.files.get(e.path)).digest("hex"), e.sha256);
      assert.ok(["must-flag", "must-not-flag", "may-flag", "not-assertable"].includes(e.expected.outcome));
      assert.ok(Array.isArray(e.expected.spans));
      assert.ok(["case", "scenario"].includes(e.target.type));
      assert.ok(e.families.length > 0 || e.target.type === "case");
      assert.ok(["provider-documented", "tool-corroborated", "project-policy", "unresolved"].includes(e.basis));
      assert.equal(e.case === undefined, e.target.type !== "case");
    }
    const paths = built.manifest.fixtures.map((e) => e.path);
    assert.equal(new Set(paths).size, paths.length);
  });

  test("the digest is stable and matches the migration report", () => {
    const again = buildMaterialization({ sets: structuredClone(sets), cases: structuredClone(cases), scenarios: structuredClone(scenarios) });
    assert.equal(again.digest, built.digest);
    assert.equal(again.manifestText, built.manifestText);
    const report = readFileSync(join(repoRoot, "docs", "migration", "cases-report.md"), "utf8");
    assert.equal(/materialization digest: `([0-9a-f]{64})`/.exec(report)[1], built.digest);
  });

  test("the CLI writes, checks and detects drift", () => {
    const out = mkdtempSync(join(tmpdir(), "materialized-"));
    try {
      const cli = join(repoRoot, "scripts", "materialize-fixtures.mjs");
      const run = (...args) => spawnSync(process.execPath, [cli, "--out", join(out, "tree"), ...args], { encoding: "utf8" });
      assert.equal(run().status, 0);
      assert.equal(run("--check").status, 0);
      const first = built.manifest.fixtures[0].path;
      const abs = join(out, "tree", first);
      assert.ok(existsSync(abs));
      spawnSync("bash", ["-c", `printf x >> '${abs}'`]);
      const bad = run("--check");
      assert.equal(bad.status, 1);
      assert.match(bad.stderr, /differs in output/);
      // refuses to clobber a directory that is not a previous materialization
      const foreign = join(out, "foreign");
      spawnSync("mkdir", ["-p", foreign]);
      spawnSync("bash", ["-c", `printf x > '${join(foreign, "keep.txt")}'`]);
      const refuse = spawnSync(process.execPath, [cli, "--out", foreign], { encoding: "utf8" });
      assert.equal(refuse.status, 1);
      assert.match(refuse.stderr, /refusing to replace/);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});

// -------------------------------------------------------------- against legacy

let legacy = null;
let skipReason = null;
try {
  legacy = materializeLegacy(findLegacyDir(), LEGACY_REVISION, ["benchmarks", "scanners", "fixtures", "package.json"]);
} catch (e) {
  skipReason = `legacy checkout unavailable: ${e.message.split("\n")[0]}`;
  if (process.env.REQUIRE_LEGACY) throw e;
}
after(() => legacy?.cleanup());

describe("the tree against the pinned legacy revision", { skip: skipReason ?? false }, () => {
  let model;
  let generated;
  before(() => {
    const readTree = (sub) => byKind(sub === "families" ? "family" : sub === "sources" ? "evidence-source" : "provider");
    generated = loadGeneratedCorpora(legacy.root);
    model = loadLegacyModel({ root: legacy.root, generated, taxonomy: loadTaxonomy(readTree) });
  });

  test("the legacy generators reproduce the committed hash manifest byte for byte", () => {
    for (const [id, r] of Object.entries(generated.reproduction)) assert.ok(r.matches, id);
    assert.equal(Object.keys(generated.reproduction).length, 64);
  });

  test("every legacy fixture maps to one canonical fixture with identical content, spans and twin lineage", () => {
    const legacyCorpora = new Map(Object.entries(generated.corpora));
    for (const [id, path] of Object.entries(LEGACY_PATHS.authoredCorpora)) legacyCorpora.set(id, readLegacyJson(legacy.root, path));
    const mapEntry = new Map(maps.flatMap((m) => m.entries.filter((e) => e.legacy.type === "fixture").map((e) => [e.legacy.id, e])));
    let n = 0;
    for (const [suite, corpus] of legacyCorpora) {
      for (const f of corpus.fixtures) {
        n += 1;
        const slug = `${suite}--${f.id}`;
        const e = mapEntry.get(slug);
        assert.ok(e, `${slug} is not in the legacy map`);
        assert.equal(e.legacy.path, f.path);
        const { item } = itemById.get(e.canonical.id);
        assert.equal(item.text, f.content);
        if (item.expected.outcome === "must-flag") {
          assert.deepEqual(item.expected.spans.map((s) => [s.start, s.end, s.role]), f.expected.map((s) => [s.start, s.end, s.role ?? "secret"]), slug);
        }
        const twinOf = f.twinOf ? mapEntry.get(`${suite}--${f.twinOf}`).canonical.id : undefined;
        assert.equal(item.lineage?.of, twinOf, slug);
      }
    }
    assert.equal(n, 5925);
    assert.equal(mapEntry.size, 5925);
  });

  test("every legacy imported case is mapped, and its fixtures are the ones the map says", () => {
    const caseEntries = maps.flatMap((m) => m.entries.filter((e) => e.legacy.type === "case"));
    assert.equal(caseEntries.length, model.aggs.length);
    const byId = new Map(caseEntries.map((e) => [e.legacy.id, e]));
    for (const a of model.aggs) assert.ok(byId.has(a.legacyCaseId), a.legacyCaseId);
  });

  test("a fixture's families equal the legacy semantic index (cells exactly; Cases as the union of their fixtures)", () => {
    const idx = readLegacyJson(legacy.root, LEGACY_PATHS.fixtureIndexFile);
    const bySlug = new Map(idx.fixtures.map((f) => [f.slug, f]));
    const mapEntry = new Map(maps.flatMap((m) => m.entries.filter((e) => e.legacy.type === "fixture").map((e) => [e.legacy.id, e])));
    const union = new Map();
    for (const [slug, e] of mapEntry) {
      const { item } = itemById.get(e.canonical.id);
      const fams = bySlug.get(slug).familyIds;
      if (item.cell) assert.deepEqual([...item.cell.families].sort(), [...fams].sort(), slug);
      else union.set(item.case, new Set([...(union.get(item.case) ?? []), ...fams]));
    }
    for (const [id, fams] of union) assert.deepEqual(caseById.get(id).families.map((f) => f.family), [...fams].sort(), id);
  });

  test("every known-gap incident on a legacy fixture is kept, on its Case or on the cell fixture", () => {
    const gaps = readLegacyJson(legacy.root, LEGACY_PATHS.knownGapsFile).issues;
    const mapEntry = new Map(maps.flatMap((m) => m.entries.filter((e) => e.legacy.type === "fixture").map((e) => [e.legacy.id, e])));
    let attached = 0;
    for (const g of gaps) {
      for (const slug of g.fixtures) {
        const e = mapEntry.get(slug);
        if (!e) continue;
        const { item } = itemById.get(e.canonical.id);
        const list = item.case ? caseById.get(item.case).incidents : item.incidents;
        assert.ok(list?.some((i) => i.externalRefs[0].url === g.url), `${g.id} on ${item.id}`);
        attached += 1;
      }
    }
    assert.ok(attached > 100);
  });

  test("the generated tree and reports are byte-identical to a fresh import (idempotent)", () => {
    const out = spawnSync(process.execPath, [join(repoRoot, "scripts/migrate/import-cases.mjs"), "--check", "--legacy", findLegacyDir()], { encoding: "utf8" });
    assert.equal(out.status, 0, out.stdout + out.stderr);
  });
});
