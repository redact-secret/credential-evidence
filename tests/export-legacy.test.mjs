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
    assert.equal(manifest.schemaRevision, "1.1.0");
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

  test("covers every provider, family, fixture set and fixture", () => {
    assert.equal(taxonomy.families.length, ix.families.size);
    assert.equal(taxonomy.providers.length, ix.providers.size - 1, "the null-provider 'generic' is not a legacy provider");
    assert.equal(categories.length, sets.length);
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

  test("corpus fixtures carry the exact recorded text and the scanner-neutral truth fields", () => {
    for (const set of sets) {
      const corpus = parsed(categories.find((c) => c.id === set.id).corpus);
      assert.equal(corpus.schemaVersion, 2);
      assert.equal(corpus.fixtures.length, set.fixtures.length, set.id);
      const byId = new Map(corpus.fixtures.map((f) => [f.id, f]));
      for (const item of set.fixtures) {
        const f = byId.get(item.id.slice(set.id.length + 2));
        assert.ok(f, item.id);
        assert.equal(sha(f.content), item.sha256, item.id);
        assert.equal(f.path, item.path);
        assert.equal(f.group, item.case);
        assert.deepEqual(f.expected.map((s) => [s.start, s.end, s.role]), item.expected.spans.map((s) => [s.start, s.end, s.role]));
        if (item.expected.outcome === "not-assertable") assert.equal(f.assessment.tier, "T0");
        if (item.expected.outcome === "must-flag") assert.ok(["must-redact", "policy"].includes(f.assessment.kind), item.id);
        if (item.expected.outcome === "must-not-flag") assert.equal(f.assessment.kind, "must-not-flag");
      }
    }
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
    const set = ix.sets.get("detector-coverage");
    const twin = set.fixtures.find((i) => i.id === "detector-coverage--databricks-personal-access-token-rotated-shape-bare-twin");
    assert.ok(twin?.lineage, "canonical lineage is kept");
    const corpus = parsed("fixtures/generated/detector-coverage.json");
    const f = corpus.fixtures.find((x) => x.id === "databricks-personal-access-token-rotated-shape-bare-twin");
    assert.equal(f.twinOf, undefined);
    const positive = set.fixtures.find((i) => i.id === twin.lineage.of);
    assert.notEqual(positive.expected.outcome, "must-flag");
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
    assert.equal(snapshot.identity.evidence_schema, "credential-evidence/schema/1.1.0");
  });

  test("validates against credential-eval's published JSON Schema (skipped without a checkout)", { skip: findCredentialEval() === null ? "credential-eval checkout unavailable" : false }, () => {
    const schema = JSON.parse(readFileSync(findCredentialEval(), "utf8"));
    const validate = new Ajv2020({ strict: false, allErrors: true }).compile(schema);
    assert.ok(validate(snapshot), JSON.stringify(validate.errors?.slice(0, 3)));
  });
});
