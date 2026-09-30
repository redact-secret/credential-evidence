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
import { loadCanonicalInputs } from "../scripts/export/lib/source.mjs";

const inputs = loadCanonicalInputs();
const { projection } = generate();
const sha = (t) => createHash("sha256").update(t).digest("hex");
const parsed = (path) => JSON.parse(projection.artifacts.get(path));
const ix = indexRecords(inputs.records);
const view = projection.view;

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
    assert.equal(manifest.schemaRevision, "1.3.0");
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
    assert.equal(categories.length, view.suites.length);
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
    for (const suite of view.suites) {
      const corpus = parsed(categories.find((c) => c.id === suite.id).corpus);
      assert.equal(corpus.schemaVersion, 2);
      const members = view.fixtures.filter((f) => f.suite === suite.id);
      assert.equal(corpus.fixtures.length, members.length, suite.id);
      const byId = new Map(corpus.fixtures.map((f) => [f.id, f]));
      for (const m of members) {
        const f = byId.get(m.name);
        assert.ok(f, m.slug);
        assert.equal(sha(f.content), m.item.sha256, m.slug);
        assert.equal(f.path, m.legacyPath);
        assert.equal(f.group, m.item.case ?? m.item.cell.scenario, "the legacy display group is the canonical Case or Scenario id");
        assert.deepEqual(f.expected.map((s) => [s.start, s.end, s.role]), m.item.expected.spans.map((s) => [s.start, s.end, s.role]));
        if (m.item.expected.outcome === "not-assertable") assert.equal(f.assessment.tier, "T0");
        if (m.item.expected.outcome === "must-flag") assert.ok(["must-redact", "policy"].includes(f.assessment.kind), m.slug);
        if (m.item.expected.outcome === "must-not-flag") assert.equal(f.assessment.kind, "must-not-flag");
        // the tier the legacy file shows is the fixture's own evidence basis, not its Case's or Scenario's
        const basis = m.evidence.basis;
        const tier = { "provider-documented": "T1", "tool-corroborated": "T2", "project-policy": "T3", unresolved: "T0" }[basis];
        assert.equal(f.assessment.tier, tier, m.slug);
      }
    }
  });

  test("legacy names come only from the legacy map: canonical ids never appear in the legacy shapes", () => {
    for (const m of view.fixtures) assert.notEqual(m.slug, m.id);
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

  test("a twin whose positive is unresolved is projected without twin fields, and the lineage stays canonical", () => {
    const twin = view.bySlug.get("detector-coverage--databricks-personal-access-token-rotated-shape-bare-twin");
    assert.ok(twin?.item.lineage, "canonical lineage is kept");
    const corpus = parsed("fixtures/generated/detector-coverage.json");
    const f = corpus.fixtures.find((x) => x.id === "databricks-personal-access-token-rotated-shape-bare-twin");
    assert.equal(f.twinOf, undefined);
    const positive = view.byId.get(twin.item.lineage.of);
    assert.notEqual(positive.outcome, "must-flag");
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

  test("one case per fixture, unique ids and paths, sorted by id, no detector assignment", () => {
    const fixtures = [...ix.sets.values()].reduce((n, x) => n + x.fixtures.length, 0);
    assert.equal(snapshot.schema, "credential-eval/corpus-snapshot/v1");
    assert.equal(snapshot.cases.length, fixtures);
    const ids = snapshot.cases.map((c) => c.id);
    assert.deepEqual(ids, [...ids].sort());
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(new Set(snapshot.cases.map((c) => c.path)).size, ids.length);
    for (const c of snapshot.cases) {
      assert.match(c.id, /^[a-z0-9][a-z0-9-]*$/);
      assert.equal(c.grouping.targets, undefined, c.id);
      assert.ok(["must-redact", "must-not-flag", "policy"].includes(c.grouping.kind));
    }
  });

  test("the corpus digest is credential-eval's rule: sha256 of canonical JSON of the cases sorted by id", () => {
    assert.equal(snapshot.identity.corpus_digest, `sha256:${sha(canon(snapshot.cases))}`);
    assert.equal(snapshot.identity.source, "credential-evidence");
    assert.equal(snapshot.identity.revision, `records-tree-sha256:${projection.manifest.sourceRevision.digest}`);
    assert.equal(snapshot.identity.evidence_schema, "credential-evidence/schema/1.3.0");
  });

  test("validates against credential-eval's published JSON Schema (skipped without a checkout)", { skip: findCredentialEval() === null ? "credential-eval checkout unavailable" : false }, () => {
    const schema = JSON.parse(readFileSync(findCredentialEval(), "utf8"));
    const validate = new Ajv2020({ strict: false, allErrors: true }).compile(schema);
    assert.ok(validate(snapshot), JSON.stringify(validate.errors?.slice(0, 3)));
  });
});
