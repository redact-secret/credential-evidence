// Tests for the legacy projection exporter (#6). No legacy checkout is needed: the
// exporter reads only records/ and the consumer vocabulary.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, test } from "node:test";
import { repoRoot } from "../scripts/lib/validator.mjs";
import { MANIFEST_PATH, generate } from "../scripts/export/legacy-projection.mjs";
import { buildProjection, digestJson, GENERATOR, indexRecords } from "../scripts/export/lib/projection.mjs";
import { collectFixtures } from "../scripts/export/lib/fixtures.mjs";
import { loadLegacyNames, nameFixtures } from "../scripts/export/lib/legacy-map.mjs";
import { loadCanonicalInputs } from "../scripts/export/lib/source.mjs";

const inputs = loadCanonicalInputs();
const { projection } = generate();
const sha = (t) => createHash("sha256").update(t).digest("hex");
const parsed = (path) => JSON.parse(projection.artifacts.get(path));
const ix = indexRecords(inputs.records);
const catalog = projection.catalog;

describe("legacy projection: determinism and provenance", () => {
  test("two builds from the same records are byte-identical", () => {
    const again = buildProjection(inputs);
    assert.equal(again.manifestText, projection.manifestText);
    assert.deepEqual([...again.artifacts.keys()], [...projection.artifacts.keys()]);
    for (const [path, text] of projection.artifacts) assert.equal(again.artifacts.get(path), text, path);
  });

  test("the committed manifest equals the regenerated one", () => {
    assert.ok(existsSync(join(repoRoot, MANIFEST_PATH)), "run npm run export:legacy");
    assert.equal(readFileSync(join(repoRoot, MANIFEST_PATH), "utf8"), projection.manifestText);
  });

  test("every artifact carries source revision, schema revision, generator version and a matching sha256", () => {
    const { manifest } = projection;
    assert.equal(manifest.artifacts.length, projection.artifacts.size);
    assert.match(manifest.sourceRevision.digest, /^[0-9a-f]{64}$/);
    assert.equal(manifest.sourceRevision.kind, "records-tree-sha256");
    assert.equal(manifest.schemaRevision, "1.5.0");
    for (const e of manifest.artifacts) {
      const text = projection.artifacts.get(e.path);
      assert.ok(text !== undefined, e.path);
      assert.equal(e.sha256, sha(text), e.path);
      assert.equal(e.bytes, Buffer.byteLength(text), e.path);
      assert.deepEqual(e.sourceRevision, manifest.sourceRevision);
      assert.equal(e.schemaRevision, manifest.schemaRevision);
      assert.deepEqual(e.generator, GENERATOR);
      assert.match(e.generator.version, /^\d+\.\d+\.\d+$/);
    }
    const sorted = [...manifest.artifacts].map((e) => e.path);
    assert.deepEqual(sorted, [...sorted].sort(), "artifacts are listed by path");
    assert.equal(manifest.projectionDigest, sha(manifest.artifacts.map((e) => `${e.path} ${e.sha256}`).join("\n")));
  });

  test("the source revision changes when a record changes, and the projection follows", () => {
    const records = structuredClone(inputs.records);
    const fam = records.find((r) => r.kind === "family");
    fam.name = `${fam.name} (edited)`;
    const changed = buildProjection({ ...inputs, records, sourceDigest: sha("different tree") });
    assert.notEqual(changed.manifest.projectionDigest, projection.manifest.projectionDigest);
    const tax = JSON.parse(changed.artifacts.get("benchmarks/support/taxonomy.json"));
    assert.ok(tax.families.some((f) => f.id === fam.id && f.name === fam.name));
  });
});

describe("legacy projection: content", () => {
  const taxonomy = parsed("benchmarks/support/taxonomy.json");
  const semantics = parsed("benchmarks/fixture-semantics.json");
  const index = parsed("benchmarks/fixture-index.json");
  const categories = parsed("benchmarks/categories.json");
  const sets = [...ix.sets.values()];

  test("covers every provider, family, legacy suite and fixture (the suites come from the legacy map, not from the sets)", () => {
    assert.equal(taxonomy.families.length, ix.families.size);
    assert.equal(taxonomy.providers.length, ix.providers.size - 1, "the null-provider 'generic' is not a legacy provider");
    assert.equal(categories.length, 67);
    assert.equal(categories.length, catalog.suites.length);
    assert.notEqual(categories.length, sets.length, "canonical sets are by provider, the projected categories are the legacy suites");
    const fixtures = sets.reduce((s, x) => s + x.fixtures.length, 0);
    assert.equal(index.fixtures.length, fixtures);
    assert.equal(semantics.fixtures.length, fixtures);
    assert.equal(index.identity.fixtureCount, fixtures);
    assert.equal(parsed("benchmarks/support/dossier-frontmatter.json").providers.aws.families.length > 0, true);
  });

  test("taxonomy, index and semantics are sorted by stable id", () => {
    const sorted = (xs) => [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    assert.deepEqual(taxonomy.families.map((f) => f.id), sorted(taxonomy.families.map((f) => f.id)));
    assert.deepEqual(semantics.fixtures.map((f) => f.slug), sorted(semantics.fixtures.map((f) => f.slug)));
    assert.deepEqual(categories.map((c) => c.id), sorted(categories.map((c) => c.id)));
  });

  test("the index identity digest is the legacy digestJson of its payload", () => {
    const { identity, ...payload } = index;
    assert.equal(identity.digest, digestJson(payload));
    assert.equal(index.sources.scenarios.digest, digestJson(parsed("benchmarks/scenarios.json")));
    assert.equal(index.sources.taxonomy.digest, digestJson(taxonomy));
    assert.equal(index.sources.reviewedMetadata.digest, digestJson(semantics));
  });

  test("corpus fixtures carry the exact recorded text and the scanner-neutral truth fields, under their legacy suite and name", () => {
    for (const suite of catalog.suites) {
      const corpus = parsed(categories.find((c) => c.id === suite.id).corpus);
      assert.equal(corpus.schemaVersion, 2);
      const members = catalog.fixtures.filter((f) => f.suite === suite.id);
      assert.equal(corpus.fixtures.length, members.length, suite.id);
      const byId = new Map(corpus.fixtures.map((f) => [f.id, f]));
      for (const m of members) {
        const f = byId.get(m.name);
        assert.ok(f, m.slug);
        assert.equal(sha(f.content), m.fixture.item.sha256, m.slug);
        assert.equal(f.path, m.legacyPath);
        assert.equal(f.group, m.fixture.item.case ?? m.fixture.item.cell.scenario, "the legacy display group is the canonical Case or Scenario id");
        // an unresolved fixture's legacy spans are its non-asserting candidate reading (ADR 0012), never canonical expected spans
        const legacySpans = m.fixture.item.candidateReading?.spans ?? m.fixture.item.expected.spans;
        assert.deepEqual(f.expected.map((s) => [s.start, s.end, s.role]), legacySpans.map((s) => [s.start, s.end, s.role]));
        if (m.fixture.item.expected.outcome === "not-assertable") assert.equal(f.assessment.tier, "T0");
        if (m.fixture.item.expected.outcome === "not-assertable") assert.equal(f.assessment.kind, m.fixture.item.candidateReading ? "must-redact" : "must-not-flag", m.slug);
        if (m.fixture.item.expected.outcome === "must-flag") assert.ok(["must-redact", "policy"].includes(f.assessment.kind), m.slug);
        if (m.fixture.item.expected.outcome === "must-not-flag") assert.equal(f.assessment.kind, "must-not-flag");
        // the tier the legacy file shows is the fixture's own evidence basis, not its Case's or Scenario's
        const basis = m.fixture.evidence.basis;
        const tier = { "provider-documented": "T1", "tool-corroborated": "T2", "project-policy": "T3", unresolved: "T0" }[basis];
        assert.equal(f.assessment.tier, tier, m.slug);
      }
    }
  });

  test("legacy names come only from the legacy map: canonical ids never appear in the legacy shapes", () => {
    for (const m of catalog.fixtures) assert.notEqual(m.slug, m.fixture.id);
    const corpusText = [...projection.artifacts].filter(([p]) => p.startsWith("fixtures/")).map(([, t]) => t).join("\n");
    for (const set of sets.slice(0, 20)) assert.ok(!corpusText.includes(`"${set.id}--`), set.id);
  });

  test("no product state is invented: no support status, milestone, pin, expected action or per-fixture detector", () => {
    const banned = /"(supportStatus|expectedAction|policyFamily|policyConformance|arrivalTargets|milestone|release|redactSecretRevision|redactSecretVersion)"/;
    for (const [path, text] of projection.artifacts) {
      if (path === "overlay-interface.json") continue;
      assert.doesNotMatch(text, banned, path);
      if (path.startsWith("fixtures/")) assert.doesNotMatch(text, /"detectors"/, path);
    }
    // the only detector names are mapping metadata passed through from optional externalRefs
    const fromRefs = new Set([...ix.families.values()].flatMap((f) => (f.externalRefs ?? []).filter((r) => r.system === "redact-secret-detector").map((r) => r.id)));
    for (const f of taxonomy.families) for (const d of f.detectors) assert.ok(fromRefs.has(d), `${f.id}: ${d}`);
    assert.match(taxonomy.sourceNote, /^GENERATED PROJECTION/);
  });

  test("the overlay interface names every overlay and covers every fixture slug", () => {
    const overlay = parsed("overlay-interface.json");
    assert.equal(overlay.format, "credential-evidence/legacy-projection-overlay-interface");
    const ids = overlay.overlays.map((o) => o.id);
    assert.deepEqual(ids, ["fixture-detectors", "taxonomy-support-status", "fixture-provenance", "corpus-fixture-extras", "pin-manifest", "known-gaps"]);
    const detectors = overlay.overlays.find((o) => o.id === "fixture-detectors");
    assert.equal(detectors.keys.count, index.fixtures.length);
    assert.equal(detectors.keys.sha256, sha(index.fixtures.map((f) => f.slug).sort().join("\n")));
    for (const o of overlay.overlays) assert.ok(o.reason.length > 20 && o.owner && o.legacyPath && o.shape, o.id);
    assert.ok(!projection.artifacts.has("benchmarks/fixture-detectors.json"), "fixture-detectors.json is an overlay, never emitted");
    assert.ok(!projection.artifacts.has("benchmarks/pin-manifest.json"));
    assert.ok(!projection.artifacts.has("benchmarks/known-gaps.json"));
  });

  test("an unresolved fixture's non-asserting candidate projects as legacy T0 candidate spans, and its twin keeps its twin fields (ADR 0012)", () => {
    const twin = catalog.bySlug.get("detector-coverage--databricks-personal-access-token-rotated-shape-bare-twin");
    assert.ok(twin?.fixture.item.lineage, "canonical lineage is kept");
    const positive = catalog.byCanonicalId.get(twin.fixture.item.lineage.of);
    assert.equal(positive.fixture.outcome, "not-assertable");
    assert.equal(positive.fixture.item.candidateReading.asserting, false);
    assert.deepEqual(positive.fixture.item.expected.spans, [], "a candidate is never an expected span");
    const corpus = parsed("fixtures/generated/detector-coverage.json");
    const p = corpus.fixtures.find((x) => x.id === positive.name);
    assert.deepEqual(p.assessment, { ...p.assessment, kind: "must-redact", tier: "T0" });
    assert.deepEqual(p.expected.map((sp) => [sp.start, sp.end, sp.role]), positive.fixture.item.candidateReading.spans.map((sp) => [sp.start, sp.end, sp.role]));
    const f = corpus.fixtures.find((x) => x.id === "databricks-personal-access-token-rotated-shape-bare-twin");
    assert.equal(f.twinOf, positive.name);
  });

  test("candidates exist only on not-assertable fixtures, and a families override narrows its Case and reaches the index (ADR 0012)", () => {
    const rows = collectFixtures(ix);
    const withCandidate = rows.filter((r) => r.item.candidateReading);
    assert.ok(withCandidate.length > 0);
    for (const r of withCandidate) assert.equal(r.outcome, "not-assertable", r.id);
    const overridden = rows.filter((r) => r.item.families);
    assert.ok(overridden.length > 0);
    const index = parsed("benchmarks/fixture-index.json");
    const indexBySlug = new Map(index.fixtures.map((x) => [x.slug, x]));
    for (const r of overridden) {
      const caseFamilies = ix.cases.get(r.caseId).families.map((f) => f.family);
      assert.ok(r.item.families.every((f) => caseFamilies.includes(f)), r.id);
      assert.ok(r.item.families.length < caseFamilies.length, r.id);
      assert.deepEqual(r.families, [...r.item.families].sort(), r.id);
      const legacy = catalog.byCanonicalId.get(r.id);
      assert.deepEqual(indexBySlug.get(legacy.slug).familyIds, r.families, r.id);
      if (!r.families.length) assert.equal(indexBySlug.get(legacy.slug).unscopedReason, r.item.unscopedReason, r.id);
    }
  });
});

// ------------------------------------------------------- credential-eval input

const canon = (v) => (Array.isArray(v) ? `[${v.map(canon).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}` : JSON.stringify(v));

function findCredentialEval() {
  for (let dir = repoRoot; dirname(dir) !== dir; dir = dirname(dir)) {
    const schema = join(dirname(dir), "credential-eval", "schemas", "corpus-snapshot-v1.schema.json");
    if (existsSync(schema)) return schema;
  }
  return null;
}

describe("credential-eval corpus snapshot", () => {
  const snapshot = parsed("credential-eval/corpus-snapshot.json");
  const legacyIds = parsed("credential-eval/legacy-id-map.json");
  const fixtures = [...ix.sets.values()].flatMap((x) => x.fixtures.map((item) => ({ set: x, item })));

  test("one case per fixture, unique ids and paths, sorted by id, no detector assignment", () => {
    assert.equal(snapshot.schema, "credential-eval/corpus-snapshot/v1");
    assert.equal(snapshot.cases.length, fixtures.length);
    const ids = snapshot.cases.map((c) => c.id);
    assert.deepEqual(ids, [...ids].sort());
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(new Set(snapshot.cases.map((c) => c.path)).size, ids.length);
    for (const c of snapshot.cases) {
      assert.match(c.id, /^[a-z0-9][a-z0-9-]*$/);
      assert.ok(c.id.length <= 256, c.id);
      assert.match(c.path, /^(?!\/)(?!.*\/$)(?!.*\/\/)(?!(.*\/)?\.{1,2}(\/|$))[A-Za-z0-9_./-]+$/, c.path);
      assert.equal(c.grouping.targets, undefined, c.id);
      assert.ok(["must-redact", "must-not-flag", "policy"].includes(c.grouping.kind));
    }
  });

  test("the snapshot is in canonical names: canonical fixture ids, materialized paths, Case or Scenario groups; no legacy name", () => {
    const byId = new Map(snapshot.cases.map((c) => [c.id, c]));
    for (const { set, item } of fixtures) {
      const c = byId.get(item.id);
      assert.ok(c, `canonical fixture id ${item.id} is the snapshot case id`);
      assert.equal(c.path, `${set.id}/${item.path}`);
      assert.equal(c.grouping.group, item.case ?? item.cell.scenario);
      if (c.twin) assert.equal(c.twin.twin_of, item.lineage.of, "twin lineage is by canonical id");
    }
    const legacySlugs = new Set(catalog.fixtures.map((f) => f.slug));
    const legacySuites = new Set(catalog.suites.map((s) => s.id));
    for (const c of snapshot.cases) {
      assert.ok(!legacySlugs.has(c.id), c.id);
      assert.ok(!legacySuites.has(c.path.split("/")[0]), c.path);
      assert.ok(!legacySuites.has(c.grouping.group), c.grouping.group);
    }
  });

  test("an unresolved case carries no expected span in the snapshot, whatever its candidate; its kind is the candidate's (ADR 0012)", () => {
    const byId = new Map(snapshot.cases.map((c) => [c.id, c]));
    let seen = 0;
    for (const { item } of fixtures) {
      if (item.expected.outcome !== "not-assertable") continue;
      const c = byId.get(item.id);
      assert.equal(c.grouping.tier, "T0", item.id);
      assert.deepEqual(c.expected, [], item.id);
      assert.equal(c.grouping.kind, item.candidateReading ? "must-redact" : "must-not-flag", item.id);
      if (item.candidateReading) seen += 1;
    }
    assert.ok(seen > 0);
    for (const c of snapshot.cases) if (c.twin) assert.ok(byId.get(c.twin.twin_of).expected.some((sp) => sp.role === "secret"), c.id);
  });

  test("the corpus digest is credential-eval's rule: sha256 of canonical JSON of the cases sorted by id", () => {
    assert.equal(snapshot.identity.corpus_digest, `sha256:${sha(canon(snapshot.cases))}`);
    assert.equal(snapshot.identity.source, "credential-evidence");
    assert.equal(snapshot.identity.revision, `records-tree-sha256:${projection.manifest.sourceRevision.digest}`);
    assert.equal(snapshot.identity.evidence_schema, "credential-evidence/schema/1.5.0");
  });

  test("the legacy id map re-keys every snapshot case to its legacy fixture id and corpus path, and only the map says so", () => {
    assert.equal(legacyIds.format, "credential-evidence/legacy-id-map");
    assert.equal(legacyIds.snapshotCorpusDigest, snapshot.identity.corpus_digest);
    assert.deepEqual(legacyIds.cases.map((c) => c.id), snapshot.cases.map((c) => c.id));
    const slugs = new Set(legacyIds.cases.map((c) => c.legacyId));
    assert.equal(slugs.size, snapshot.cases.length);
    const corpusFixtures = new Map();
    for (const suite of catalog.suites) for (const f of parsed(suite.corpus).fixtures) corpusFixtures.set(`${suite.id}--${f.id}`, `${suite.id}/${f.path}`);
    for (const row of legacyIds.cases) assert.equal(corpusFixtures.get(row.legacyId), row.legacyPath, `${row.id}: the legacy id names a fixture the legacy corpora contain, at that path`);
  });

  test("validates against credential-eval's published JSON Schema (skipped without a checkout)", { skip: findCredentialEval() === null ? "credential-eval checkout unavailable" : false }, () => {
    const schema = JSON.parse(readFileSync(findCredentialEval(), "utf8"));
    const validate = new Ajv2020({ strict: false, allErrors: true }).compile(schema);
    assert.ok(validate(snapshot), JSON.stringify(validate.errors?.slice(0, 3)));
  });
});

// ------------------------------------------------------------ the legacy map input

describe("the legacy map is a first-class, strictly checked input (ADR 0009)", () => {
  const { legacyMaps, vocabulary } = inputs;
  const canonical = collectFixtures(ix);

  test("the loader reads the map separately from the records, and records/ holds no legacy-map", () => {
    assert.ok(legacyMaps.length > 0 && legacyMaps.every((m) => m.kind === "legacy-map"));
    assert.ok(inputs.records.every((r) => r.kind !== "legacy-map"));
  });

  test("canonical fixture rows carry no legacy name", () => {
    const names = loadLegacyNames(legacyMaps, vocabulary);
    const slugs = new Set([...names.byCanonicalId.values()].map((n) => n.slug));
    const suites = new Set(names.suites.map((s) => s.id));
    for (const f of canonical) {
      assert.ok(!slugs.has(f.id), f.id);
      assert.ok(!suites.has(f.set.id) && !suites.has(f.materializedPath.split("/")[0]), f.id);
    }
  });

  test("the five legacy navigation scenario ids occur in the map and the vocabulary only, never in records/", () => {
    const navigation = vocabulary.scenarios.map((s) => s.id);
    assert.equal(navigation.length, 5);
    const all = JSON.stringify(inputs.records);
    for (const id of navigation) assert.ok(!all.includes(`"${id}"`), `${id} leaked into canonical records`);
    const inMap = new Set(legacyMaps.flatMap((m) => m.entries.flatMap((e) => e.legacy.scenarioIds ?? [])));
    assert.deepEqual([...inMap].sort(), [...navigation].sort());
  });

  test("the join is strict in both directions", () => {
    const names = loadLegacyNames(legacyMaps, vocabulary);
    const joined = nameFixtures(canonical, names);
    assert.equal(joined.fixtures.length, canonical.length);
    // a canonical fixture without a legacy name
    assert.throws(() => nameFixtures(canonical.slice(1), names), /legacy map names canonical fixture/);
    const missing = new Map(names.byCanonicalId);
    missing.delete(canonical[0].id);
    assert.throws(() => nameFixtures(canonical, { ...names, byCanonicalId: missing }), /has no legacy-map entry/);
  });

  test("a map that contradicts itself or the vocabulary is refused", () => {
    const clone = () => structuredClone(legacyMaps);
    const firstFixture = (maps) => maps.flatMap((m) => m.entries).find((e) => e.legacy.type === "fixture");
    // unknown navigation scenario
    let maps = clone();
    firstFixture(maps).legacy.scenarioIds = ["not-a-navigation-scenario"];
    assert.throws(() => loadLegacyNames(maps, vocabulary), /not in the consumer vocabulary/);
    // a legacy fixture listed twice
    maps = clone();
    const entry = firstFixture(maps);
    maps[0].entries.push(structuredClone(entry));
    assert.throws(() => loadLegacyNames(maps, vocabulary), /listed twice/);
    // two legacy fixtures for one canonical fixture
    maps = clone();
    const dup = structuredClone(firstFixture(maps));
    dup.legacy.id = `${dup.legacy.id}-again`;
    maps[0].entries.push(dup);
    assert.throws(() => loadLegacyNames(maps, vocabulary), /target of two legacy fixtures/);
    // maps of different legacy sources
    maps = clone();
    if (maps.length > 1) {
      maps[1].source.revision = "0".repeat(40);
      assert.throws(() => loadLegacyNames(maps, vocabulary), /different legacy source/);
    }
    // no map at all
    assert.throws(() => loadLegacyNames([], vocabulary), /no legacy map/);
    // a vocabulary entry that nothing uses is drift
    assert.throws(() => loadLegacyNames(legacyMaps, { scenarios: [...vocabulary.scenarios, { id: "unused-navigation" }] }), /used by no legacy fixture/);
  });

  test("the projection fails without a map, it does not guess legacy names", () => {
    assert.throws(() => buildProjection({ ...inputs, legacyMaps: [] }), /no legacy map/);
  });

  test("only the legacy-map module of the exporter and parity harness reads the map's entries", async () => {
    const { readdirSync } = await import("node:fs");
    const dirs = ["scripts/export", "scripts/export/lib", "scripts/parity", "scripts/parity/lib"];
    for (const d of dirs) {
      for (const name of readdirSync(join(repoRoot, d)).filter((n) => n.endsWith(".mjs"))) {
        const text = readFileSync(join(repoRoot, d, name), "utf8");
        if (`${d}/${name}` === "scripts/export/lib/legacy-map.mjs") continue;
        assert.doesNotMatch(text, /\bmaps?\.entries\b|\blegacy\.(type|scenarioIds|path|id)\b/, `${d}/${name} reads legacy-map entries directly; go through legacy-map.mjs`);
      }
    }
  });
});
