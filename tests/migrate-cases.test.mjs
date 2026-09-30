// Tests for the case and fixture import (#4) and the fixture materialization.
//
// Two groups. The first reads only committed records and always runs. The
// second compares the records with the pinned legacy revision (it runs the legacy
// fixture generators) and runs when a legacy checkout is reachable
// (LEGACY_BENCHMARKS_DIR or a sibling directory); set REQUIRE_LEGACY=1 to make a
// missing checkout a failure instead of a skip.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { buildMaterialization } from "../scripts/lib/materialize.mjs";
import { checkIntegrity, repoRoot, validateTree } from "../scripts/lib/validator.mjs";
import { buildCaseImport, loadTaxonomy, OWNED_SYSTEM } from "../scripts/migrate/lib/case-import.mjs";
import { findLegacyDir, LEGACY_PATHS, LEGACY_REVISION, loadGeneratedCorpora, materializeLegacy, readLegacyJson } from "../scripts/migrate/lib/legacy-source.mjs";

const recordsDir = join(repoRoot, "records");
const { errors, records } = validateTree([recordsDir]);
const all = records.map((r) => r.record);
const byKind = (kind) => all.filter((r) => r.kind === kind);
const cases = byKind("case").filter((c) => (c.externalRefs ?? []).some((r) => r.system === OWNED_SYSTEM));
const sets = byKind("fixture-set");
const caseById = new Map(cases.map((c) => [c.id, c]));
const items = sets.flatMap((s) => s.fixtures.map((item) => ({ set: s, item })));
const AUTHORED_SUITES = ["accuracy", "real-world-shapes", "token-contexts"];

const dirBytes = (dir) => {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    n += statSync(p).isDirectory() ? dirBytes(p) : statSync(p).size;
  }
  return n;
};

describe("imported cases and fixture sets (no legacy checkout needed)", () => {
  test("every record validates: schema, references, case to fixture and fixture to case integrity", () => {
    assert.deepEqual(errors, []);
    assert.ok(cases.length > 1000);
    assert.equal(sets.length, 67);
    assert.equal(items.length, 5925);
  });

  test("every fixture traces to an existing case and agrees with its outcome", () => {
    for (const { item } of items) {
      const c = caseById.get(item.case);
      assert.ok(c, `${item.id}: case ${item.case}`);
      assert.equal(item.expected.outcome, c.expectation.outcome, item.id);
    }
    const projected = new Set(items.map(({ item }) => item.case));
    for (const c of cases) if (c.expectation.outcome !== "not-assertable") assert.ok(projected.has(c.id), `${c.id}: no fixture`);
    // one case, many fixtures
    const perCase = new Map();
    for (const { item } of items) perCase.set(item.case, (perCase.get(item.case) ?? 0) + 1);
    assert.ok([...perCase.values()].some((n) => n >= 10), "some case has many fixture projections");
  });

  test("authored and generated fixtures are explicitly separated, generated ones record their generator", () => {
    for (const s of sets) {
      if (AUTHORED_SUITES.includes(s.id)) {
        assert.equal(s.origin.type, "authored-cases");
        assert.equal(s.generated, false);
      } else {
        assert.equal(s.origin.type, "generation-rule", s.id);
        assert.equal(s.generated, true);
        assert.equal(s.origin.generator.sourceRevision, LEGACY_REVISION);
        assert.match(s.origin.generator.entrypoint, /^fixtures\/generated\/.+\.mjs$/);
        assert.ok(s.origin.generator.version.length > 0);
      }
      assert.equal(s.imported.revision, LEGACY_REVISION);
    }
    assert.equal(items.filter(({ set }) => !set.generated).length, 140);
  });

  test("twin and mutation lineage is preserved at case and fixture level", () => {
    const fixtureIds = new Map(items.map(({ item }) => [item.id, item]));
    let twins = 0;
    for (const { item } of items) {
      if (!item.lineage) continue;
      twins += 1;
      const positive = fixtureIds.get(item.lineage.of);
      assert.ok(positive, `${item.id}: lineage.of`);
      assert.equal(item.lineage.relation, "twin-of");
      const twinCase = caseById.get(item.case);
      const posCase = caseById.get(positive.case);
      assert.ok(twinCase.caseTypes.includes("twin") && twinCase.caseTypes.includes("mutation"), `${item.case} typed twin`);
      assert.ok(
        twinCase.relations.some((r) => r.type === "twin-of" && r.target === posCase.id && r.mutationKind === item.lineage.mutationKind),
        `${item.id}: case relation to ${posCase.id}`,
      );
    }
    assert.equal(twins, 1391);
    for (const c of cases.filter((x) => x.caseTypes.includes("twin"))) assert.ok(c.relations?.length, c.id);
  });

  test("cases are readable without scanner output: what, why, expected outcome and evidence", () => {
    for (const c of cases) {
      for (const field of ["title", "summary", "rationale"]) assert.ok(c[field].length >= 10, `${c.id} ${field}`);
      assert.ok(["must-flag", "must-not-flag", "not-assertable"].includes(c.expectation.outcome));
      assert.ok(c.expectation.rationale.length > 0);
      if (["provider-documented", "tool-corroborated"].includes(c.expectation.basis)) assert.ok(c.expectation.sources.length > 0, c.id);
      assert.match(c.notes, /Project-authored by the Redact Secret project/);
      assert.equal(c.lifecycle, "draft");
    }
    // spot check the wording of a hand-written and a templated case
    const m6 = cases.find((c) => c.id.startsWith("milestone-6-closed-263-") && c.expectation.outcome === "must-not-flag");
    assert.match(m6.title, /template/i);
    assert.ok(m6.scenarios.includes("templated-reference"));
    const m6flag = cases.find((c) => c.id.startsWith("milestone-6-closed-263-") && c.expectation.outcome === "must-flag");
    assert.match(m6flag.summary, /begin a template|embed one/);
  });

  test("cross-provider themes are represented", () => {
    const withTheme = (t) => cases.filter((c) => c.scenarios.includes(t));
    for (const theme of ["documentation-placeholder", "templated-reference", "partial-span-leakage", "high-signal-assignment-false-positive", "cross-provider"]) {
      assert.ok(withTheme(theme).length >= 5, `theme ${theme}`);
    }
    assert.ok(cases.some((c) => c.caseTypes.includes("cross-family") && c.families.length >= 2));
    // partial-span leakage is backed by authored envelopes on real fixtures
    const enveloped = items.filter(({ item }) => item.expected.spans.some((s) => s.envelope));
    assert.ok(enveloped.length >= 90);
    for (const { item } of enveloped) assert.ok(caseById.get(item.case).scenarios.includes("partial-span-leakage"), item.id);
  });

  test("cases reference #3 families, contracts and sources by id and never a detector", () => {
    const families = new Set(byKind("family").map((f) => f.id));
    const used = new Set();
    for (const c of cases) for (const f of c.families) (assert.ok(families.has(f.family), `${c.id}: ${f.family}`), used.add(f.family));
    assert.ok(used.size >= 150, `families referenced: ${used.size}`);
    const sources = new Set(byKind("evidence-source").map((s) => s.id));
    for (const c of cases) for (const s of c.expectation.sources) assert.ok(sources.has(s.sourceId), `${c.id}: ${s.sourceId}`);
  });

  test("no scanner detector assignment, support status or product state enters the canonical model", () => {
    const bannedKeys = /^(detectors?|detectorIds?|arrivalTargets|supportStatus|status|stage|score|tier|expectedAction|policyFamily|policyConformance|candidate|promotion)$/;
    const bannedWords = /\b(stable|provisional|pending|supportStatus)\b/i;
    const walk = (v, path, rec) => {
      if (typeof v === "string") {
        // structured wording only; free text such as legacy rationale may quote history
        if (/^\/(title|summary|rationale)$/.test(path)) assert.doesNotMatch(v, bannedWords, `${rec.id} ${path}`);
      } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}/${i}`, rec));
      else if (v && typeof v === "object") {
        for (const [k, x] of Object.entries(v)) {
          if (path === "" || !path.endsWith("/fixtures")) assert.doesNotMatch(k, bannedKeys, `${rec.id}: key ${k}`);
          walk(x, `${path}/${k}`, rec);
        }
      }
    };
    for (const c of cases) walk(c, "", c);
    for (const s of sets) {
      // Set titles, descriptions and notes quote the legacy suite verbatim; only structure is checked.
      const { fixtures, title, description, notes, ...rest } = s;
      walk(rest, "", s);
      for (const f of fixtures) for (const k of Object.keys(f)) assert.doesNotMatch(k, bannedKeys, `${f.id}: key ${k}`);
    }
    const systems = new Set();
    for (const r of [...cases, ...sets]) for (const x of r.externalRefs ?? []) systems.add(x.system);
    assert.deepEqual([...systems].sort(), ["legacy-cases-import", "redact-secret-benchmarks-issue", "redact-secret-issue"]);
  });

  test("provenance: every record names the pinned legacy revision and a permalink", () => {
    for (const r of [...cases, ...sets]) {
      const refs = r.externalRefs.filter((x) => x.system === OWNED_SYSTEM);
      assert.ok(refs.length >= 1, r.id);
      for (const ref of refs) {
        assert.equal(ref.id.slice(0, 40), LEGACY_REVISION);
        assert.equal(ref.url, `https://github.com/redact-secret/redact-secret-benchmarks/blob/${ref.id.slice(0, 40)}/${ref.id.slice(41)}`);
      }
    }
  });

  test("evidence bases follow the governance rules", () => {
    for (const c of cases) {
      const { basis, outcome } = c.expectation;
      if (basis === "unresolved") assert.equal(outcome, "not-assertable", c.id);
      if (outcome === "not-assertable") assert.equal(basis, "unresolved", c.id);
    }
    // T0 fixtures are unscored in legacy: not assertable, no spans
    const unresolved = cases.filter((c) => c.expectation.basis === "unresolved");
    assert.equal(unresolved.length, 14);
    for (const { item } of items) if (item.expected.outcome === "not-assertable") assert.deepEqual(item.expected.spans, []);
  });

  test("incidents carry a failure mode, a date and a product pointer, never a verdict of a scanner", () => {
    const withIncidents = cases.filter((c) => c.incidents?.length);
    assert.ok(withIncidents.length >= 60);
    for (const c of withIncidents) {
      for (const i of c.incidents) {
        assert.ok(["false-alarm", "missed-credential", "partial-coverage"].includes(i.failureMode));
        assert.match(i.observedAt, /^\d{4}-\d{2}-\d{2}$/);
        assert.equal(i.externalRefs[0].system, "redact-secret-issue");
      }
    }
  });

  test("fixture content and spans are byte-exact, within the content, and envelopes enclose their span", () => {
    for (const { item } of items) {
      const bytes = Buffer.from(item.text, "utf8");
      assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256, item.id);
      for (const s of item.expected.spans) {
        assert.ok(s.end <= bytes.length && s.start < s.end, item.id);
        if (s.envelope) assert.ok(s.envelope.start <= s.start && s.envelope.end >= s.end && s.envelope.end <= bytes.length, item.id);
      }
    }
  });

  test("every fixture set states how its secret-shaped values were built and that they are synthetic", () => {
    for (const s of sets) assert.match(s.notes, /synthetic/i, s.id);
  });

  test("the projection layer stays compact: sharded sets, not one file per fixture", () => {
    assert.ok(sets.length < 100);
    const total = dirBytes(join(recordsDir, "cases")) + dirBytes(join(recordsDir, "fixtures"));
    assert.ok(total < 16 * 1024 * 1024, `cases and fixtures take ${total} bytes`);
  });

  test("integrity: a dangling case or lineage in a fixture set is reported", () => {
    const entries = [];
    for (const c of cases.slice(0, 3)) entries.push({ path: `${c.id}.json`, record: structuredClone(c) });
    const set = structuredClone(sets.find((s) => s.id === "token-contexts"));
    set.fixtures[0].case = "gone";
    set.fixtures[1].lineage = { relation: "twin-of", of: "token-contexts--nothing" };
    set.fixtures[2].sha256 = "0".repeat(64);
    set.fixtures[3].expected = { outcome: "must-flag", spans: [{ start: 0, end: 99999, role: "secret" }] };
    entries.push({ path: "set.json", record: set });
    const problems = checkIntegrity(entries).join("\n");
    assert.match(problems, /case 'gone' does not exist/);
    assert.match(problems, /lineage\.of unknown fixture/);
    assert.match(problems, /sha256 does not match text/);
    assert.match(problems, /ends after the content/);
  });
});

describe("materialization", () => {
  const built = buildMaterialization({ sets, cases: byKind("case") });

  test("every fixture becomes one file and one manifest entry that needs no case semantics", () => {
    assert.equal(built.files.size, 5925);
    assert.equal(built.manifest.count, 5925);
    for (const e of built.manifest.fixtures) {
      assert.ok(built.files.has(e.path));
      assert.equal(createHash("sha256").update(built.files.get(e.path)).digest("hex"), e.sha256);
      assert.ok(["must-flag", "must-not-flag", "may-flag", "not-assertable"].includes(e.expected.outcome));
      assert.ok(Array.isArray(e.expected.spans));
    }
  });

  test("the digest is stable and matches the migration report", () => {
    const again = buildMaterialization({ sets: structuredClone(sets), cases: structuredClone(byKind("case")) });
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

describe("cases and fixtures against the pinned legacy revision", { skip: skipReason ?? false }, () => {
  let built;
  let generated;
  before(() => {
    const readTree = (sub) => byKind(sub === "families" ? "family" : sub === "sources" ? "evidence-source" : "provider");
    generated = loadGeneratedCorpora(legacy.root);
    built = buildCaseImport({ root: legacy.root, generated, taxonomy: loadTaxonomy(readTree) });
  });

  test("the legacy generators reproduce the committed hash manifest byte for byte", () => {
    for (const [id, r] of Object.entries(generated.reproduction)) assert.ok(r.matches, id);
    assert.equal(Object.keys(generated.reproduction).length, 64);
  });

  test("every legacy fixture is imported with identical content and expected spans", () => {
    const legacyCorpora = new Map(Object.entries(generated.corpora));
    for (const [id, path] of Object.entries(LEGACY_PATHS.authoredCorpora)) legacyCorpora.set(id, readLegacyJson(legacy.root, path));
    const imported = new Map(items.map(({ item }) => [item.id, item]));
    let n = 0;
    for (const [suite, corpus] of legacyCorpora) {
      for (const f of corpus.fixtures) {
        n += 1;
        const item = imported.get(`${suite}--${f.id}`);
        assert.ok(item, `${suite}--${f.id} not imported`);
        assert.equal(item.text, f.content);
        assert.equal(item.path, f.path);
        if (item.expected.outcome === "must-flag") {
          assert.deepEqual(
            item.expected.spans.map((s) => [s.start, s.end, s.role]),
            f.expected.map((s) => [s.start, s.end, s.role ?? "secret"]),
            `${suite}--${f.id}`,
          );
        }
        // twin lineage equals legacy twinOf
        assert.equal(item.lineage?.of, f.twinOf ? `${suite}--${f.twinOf}` : undefined);
      }
    }
    assert.equal(n, imported.size);
    assert.equal(n, 5925);
  });

  test("case families and scenarios equal the legacy semantic index", () => {
    const idx = readLegacyJson(legacy.root, LEGACY_PATHS.fixtureIndexFile);
    const bySlug = new Map(idx.fixtures.map((f) => [f.slug, f]));
    const perCase = new Map();
    for (const { item } of items) {
      const e = bySlug.get(item.id);
      const acc = perCase.get(item.case) ?? { fam: new Set(), sc: new Set() };
      e.familyIds.forEach((x) => acc.fam.add(x));
      e.scenarioIds.forEach((x) => acc.sc.add(x));
      perCase.set(item.case, acc);
    }
    for (const [id, acc] of perCase) {
      const c = caseById.get(id);
      assert.deepEqual(c.families.map((f) => f.family), [...acc.fam].sort(), id);
      for (const s of acc.sc) assert.ok(c.scenarios.includes(s), `${id}: ${s}`);
    }
  });

  test("every known-gap incident on an imported fixture is attached to that fixture's case", () => {
    const gaps = readLegacyJson(legacy.root, LEGACY_PATHS.knownGapsFile).issues;
    const caseOf = new Map(items.map(({ item }) => [item.id, item.case]));
    let attached = 0;
    for (const g of gaps) {
      for (const slug of g.fixtures) {
        if (!caseOf.has(slug)) continue;
        const c = caseById.get(caseOf.get(slug));
        assert.ok(c.incidents?.some((i) => i.externalRefs[0].url === g.url), `${g.id} on ${c.id}`);
        attached += 1;
      }
    }
    assert.ok(attached > 100);
  });

  test("the generated tree and report are byte-identical to a fresh import (idempotent)", () => {
    for (const [path, text] of built.files) assert.equal(readFileSync(join(repoRoot, path), "utf8"), text, path);
    const out = spawnSync(process.execPath, [join(repoRoot, "scripts/migrate/import-cases.mjs"), "--check", "--legacy", findLegacyDir()], { encoding: "utf8" });
    assert.equal(out.status, 0, out.stdout + out.stderr);
  });
});
