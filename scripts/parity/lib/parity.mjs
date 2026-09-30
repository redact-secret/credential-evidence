// The parity run: generated projection versus the legacy files at the pinned revision.
//
// Pure with respect to its inputs (canonical records, the pinned legacy extraction,
// rules.json, inventory.json). No clock. Returns a result object that report.mjs renders.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020.js";
import { GENERATOR } from "../../export/lib/projection.mjs";
import { digestJson, indexRecords } from "../../export/lib/projection.mjs";
import { compareFlat, flatten, satisfies } from "./diff.mjs";
import { consumersOf, entryCount, loadLegacyDocs, runLegacyChecks, sizeOf } from "./legacy.mjs";
import { evaluatePredicate, PREDICATES } from "./predicates.mjs";

export const PARITY_VERSION = "1.0.0";
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// ------------------------------------------------------------------ rules

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Pattern syntax: `[*]` is an array key (literal in flattened patterns), `{}` one object key, trailing `.**` anything deeper. */
export function compilePattern(p) {
  let tail = "";
  let body = p;
  if (body.endsWith(".**")) {
    body = body.slice(0, -3);
    tail = "(\\.|\\[).*";
  }
  return new RegExp(`^${body.split("{}").map(esc).join("[^.\\[\\]]+")}${tail}$`);
}

export function loadRules(path) {
  const { rules } = JSON.parse(readFileSync(path, "utf8"));
  const ids = new Set();
  return rules.map((r) => {
    if (ids.has(r.id)) throw new Error(`duplicate parity rule id ${r.id}`);
    ids.add(r.id);
    for (const k of ["id", "class", "artifact", "patterns", "change", "justification"]) if (!r[k]) throw new Error(`rule ${r.id}: missing ${k}`);
    if (r.justification.length < 40) throw new Error(`rule ${r.id}: justification is too short to be a justification`);
    if (r.predicate && !PREDICATES[r.predicate]) throw new Error(`rule ${r.id}: unknown predicate ${r.predicate}`);
    if (r.class === "product-state-dropped" && !r.overlay) throw new Error(`rule ${r.id}: a product-state-dropped rule must name the overlay that carries the dropped field`);
    return { ...r, regexes: r.patterns.map(compilePattern) };
  });
}

const matches = (rule, artifact, d, ctx) => {
  if (rule.artifact !== artifact) return false;
  if (rule.change !== "any" && rule.change !== d.change) return false;
  if (!rule.regexes.some((re) => re.test(d.pattern))) return false;
  if (!satisfies(d.legacy, rule.legacy) || !satisfies(d.projected, rule.projected)) return false;
  return rule.predicate ? evaluatePredicate(rule.predicate, d, ctx) : true;
};

/**
 * A rule that says "this is product state, supplied by an overlay" is checked against the overlay interface the projection
 * itself publishes: the named overlay must exist and must name every field the rule lets through (its last path segment).
 * A field that no overlay declares cannot be excused as overlay-carried.
 */
export function checkOverlayRules(rules, overlayInterface) {
  const byId = new Map(overlayInterface.overlays.map((o) => [o.id, o]));
  for (const r of rules) {
    if (!r.overlay) continue;
    const o = byId.get(r.overlay);
    if (!o) throw new Error(`rule ${r.id}: overlay '${r.overlay}' is not in overlay-interface.json`);
    const declared = `${o.merge} ${o.shape}`;
    for (const p of r.patterns) {
      const field = p.replace(/\[\*\]$/, "").split(".").pop();
      if (!declared.includes(field)) throw new Error(`rule ${r.id}: overlay '${r.overlay}' does not declare the field '${field}' that the rule excuses`);
    }
  }
}

// --------------------------------------------------------------- context

const claimOf = (contract, id) => (contract?.claims ?? []).find((c) => c.id === id);

const firstKey = (path) => {
  const i = path.indexOf("[");
  const j = path.indexOf("]", i);
  return i < 0 || j < 0 ? undefined : path.slice(i + 1, j);
};

function buildContext({ ix, projectedOf, docId, artifact, legacyFlat, setIdOfCorpus, casesOfSlug, fixtureOfSlug, caseMembers, evidenceMembers }) {
  const isCorpus = artifact === "corpus";
  const setId = isCorpus ? setIdOfCorpus.get(docId.slice("corpus:".length)) : undefined;
  const slugOf = (key) => (isCorpus ? `${setId}--${key}` : key);
  const keyOfSlug = (slug) => (isCorpus ? slug.slice(setId.length + 2) : slug);
  const swapKey = (path, key) => {
    const i = path.indexOf("[");
    const j = path.indexOf("]", i);
    return `${path.slice(0, i + 1)}${key}${path.slice(j)}`;
  };
  const recordedSourceBases = new Set([...ix.sources.values()].map((s) => (s.externalRefs ?? []).find((r) => r.system === "legacy-url")?.id ?? s.locator.url));
  const caseOf = (path) => {
    const k = firstKey(path);
    return k === undefined ? undefined : casesOfSlug.get(slugOf(k));
  };
  return {
    docId,
    recordedSourceBases,
    familyDossierClass: (id) => {
      const f = ix.families.get(id);
      return f ? claimOf(ix.contracts.get(f.currentContract ?? `${f.id}@1`), "dossier-research")?.evidenceClass : undefined;
    },
    recomputeDigest: (path) => {
      const index = projectedOf.get("fixture-index");
      if (path === "identity.digest") {
        const { identity, ...payload } = index;
        void identity;
        return digestJson(payload);
      }
      const covered = { "sources.reviewedMetadata.digest": "fixture-semantics", "sources.taxonomy.digest": "taxonomy", "sources.scenarios.digest": "scenarios" }[path];
      return covered ? digestJson(projectedOf.get(covered)) : undefined;
    },
    keyOf: firstKey,
    legacy: (path) => legacyFlat.leaves.get(path)?.value,
    legacyPathsWithPrefix: (prefix) => [...legacyFlat.leaves.keys()].filter((p) => p.startsWith(prefix)),
    caseOf,
    caseOfKey: (key) => casesOfSlug.get(slugOf(key)),
    // Peers are the fixtures the canonical grouping folds with this one: for families and scenarios, the fixtures of the
    // same Case (a cell has no peers: its families are exact); for assessment fields (reason, citations), the fixtures that share the evidence entry.
    // In a corpus document only peers of the same legacy suite have a path to compare.
    peerPaths(path) {
      const k = firstKey(path);
      const slug = k === undefined ? undefined : slugOf(k);
      const f = slug === undefined ? undefined : fixtureOfSlug.get(slug);
      if (!f) return [];
      const group = path.includes(".assessment.") ? evidenceMembers.get(f.evidenceKey) : f.caseId ? caseMembers.get(f.caseId) : [];
      return (group ?? []).filter((s) => s !== slug && (!isCorpus || s.startsWith(`${setId}--`))).map((s) => swapKey(path, keyOfSlug(s)));
    },
  };
}

// ------------------------------------------------------------ schema checks

function schemaConformance(root, projectedDocs) {
  const out = [];
  const targets = [
    ["taxonomy", "schemas/taxonomy-v1.json", "benchmarks/support/taxonomy.json"],
    ["scenarios", "schemas/scenarios-v1.json", "benchmarks/scenarios.json"],
    ["semantics", "schemas/fixture-semantics-v1.json", "benchmarks/fixture-semantics.json"],
    ["index", "schemas/fixture-index-v1.json", "benchmarks/fixture-index.json"],
  ];
  for (const [artifact, schemaPath, artifactPath] of targets) {
    const schema = JSON.parse(readFileSync(join(root, schemaPath), "utf8"));
    const Ctor = String(schema.$schema).includes("draft-07") ? Ajv : Ajv2020;
    const validate = new Ctor({ strict: false, allErrors: true }).compile(schema);
    const ok = validate(projectedDocs.get(artifactPath));
    out.push({ artifact, schema: schemaPath, artifactPath, valid: ok, errors: ok ? [] : validate.errors.slice(0, 3).map((e) => `${e.instancePath || "/"} ${e.message}`) });
  }
  return out;
}

// ------------------------------------------------------------------- main

/**
 * @param {{ legacyRoot: string, inputs: object, projection: object, rulesPath: string, inventoryPath: string }} args
 */
export function runParity({ legacyRoot, inputs, projection, rulesPath, inventoryPath }) {
  const ix = indexRecords(inputs.records);
  const rules = loadRules(rulesPath);
  checkOverlayRules(rules, projection.projected.overlay);
  const inventory = JSON.parse(readFileSync(inventoryPath, "utf8")).files;
  const { docs, dossiers, categories } = loadLegacyDocs(legacyRoot);

  // projected documents, parsed from the exact artifact text a consumer would read
  const P = projection.artifacts;
  const parsed = new Map([...P].filter(([p]) => p.endsWith(".json")).map(([p, t]) => [p, JSON.parse(t)]));
  const projectedOf = new Map([
    ["taxonomy", parsed.get("benchmarks/support/taxonomy.json")],
    ["dossier-frontmatter", parsed.get("benchmarks/support/dossier-frontmatter.json")],
    ["scenarios", parsed.get("benchmarks/scenarios.json")],
    ["categories", parsed.get("benchmarks/categories.json")],
    ["fixture-semantics", parsed.get("benchmarks/fixture-semantics.json")],
    ["fixture-index", parsed.get("benchmarks/fixture-index.json")],
  ]);
  const corpusPaths = [];
  for (const [p, doc] of parsed) if (p.startsWith("fixtures/")) {
    projectedOf.set(`corpus:${p}`, doc);
    corpusPaths.push(p);
  }

  const setIdOfCorpus = new Map(projectedOf.get("categories").map((c) => [c.corpus, c.id]));
  const catalog = projection.catalog;
  const casesOfSlug = new Map(catalog.fixtures.map((f) => [f.slug, f.fixture.target]));
  const fixtureOfSlug = new Map(catalog.fixtures.map((f) => [f.slug, f.fixture]));
  const caseMembers = new Map();
  const evidenceMembers = new Map();
  for (const { slug, fixture: f } of catalog.fixtures) {
    if (f.caseId) caseMembers.set(f.caseId, [...(caseMembers.get(f.caseId) ?? []), slug]);
    evidenceMembers.set(f.evidenceKey, [...(evidenceMembers.get(f.evidenceKey) ?? []), slug]);
  }

  const ruleStats = new Map(rules.map((r) => [r.id, { rule: r, count: 0, entities: new Set(), docs: new Set(), examples: [] }]));
  const perArtifact = new Map();
  const unexplained = [];
  const docRows = [];
  let orderOnlyTotal = 0;

  const ids = [...docs.keys()].sort(cmp);
  for (const docId of ids) {
    const legacy = docs.get(docId);
    const projected = projectedOf.get(docId);
    if (!projected) throw new Error(`no projected document for legacy ${docId}`);
    const legacyFlat = flatten(legacy.doc);
    const cmpRes = compareFlat(legacyFlat, flatten(projected));
    const ctx = buildContext({ ix, projectedOf, docId, artifact: legacy.artifact, legacyFlat, setIdOfCorpus, casesOfSlug, fixtureOfSlug, caseMembers, evidenceMembers });
    let explained = 0;
    for (const d of cmpRes.diffs) {
      const rule = rules.find((r) => matches(r, legacy.artifact, d, ctx));
      if (!rule) {
        unexplained.push({ docId, artifact: legacy.artifact, ...d });
        continue;
      }
      explained += 1;
      const st = ruleStats.get(rule.id);
      st.count += 1;
      st.docs.add(docId);
      const i = d.path.indexOf("]");
      st.entities.add(`${docId}|${i < 0 ? d.path : d.path.slice(0, i + 1)}`);
      if (st.examples.length < 2) st.examples.push(`${legacy.artifact === "corpus" ? `${docId.slice(7)}: ` : ""}${d.path}`);
    }
    const a = perArtifact.get(legacy.artifact) ?? { docs: 0, legacyLeaves: 0, equal: 0, explained: 0, unexplained: 0, orderOnly: 0, projectedOnly: 0 };
    a.docs += 1;
    a.legacyLeaves += cmpRes.legacyLeaves;
    a.equal += cmpRes.equal;
    a.explained += explained;
    a.unexplained += cmpRes.diffs.length - explained;
    a.orderOnly += cmpRes.orderOnly;
    perArtifact.set(legacy.artifact, a);
    orderOnlyTotal += cmpRes.orderOnly;
    docRows.push({ docId, artifact: legacy.artifact, file: legacy.file, ...cmpRes, diffs: undefined });
  }
  const projectedOnly = [...projectedOf.keys()].filter((k) => !docs.has(k));
  const unusedRules = [...ruleStats.values()].filter((s) => s.count === 0).map((s) => s.rule.id);

  // legacy code run over the projection
  const corporaByPath = Object.fromEntries(corpusPaths.map((p) => [p, projectedOf.get(`corpus:${p}`)]));
  const consumer = runLegacyChecks(legacyRoot, projectedOf.get("fixture-index"), corporaByPath);
  const conformance = schemaConformance(legacyRoot, parsed);

  // inventory
  const inventoryRows = inventory.map((f) => {
    const probe = f.existsAt ?? f.path;
    const consumers = consumersOf(legacyRoot, f.needles);
    return { ...f, exists: sizeOf(legacyRoot, probe) !== null, bytes: f.bytes ?? sizeOf(legacyRoot, probe), entries: f.entries ?? entryCount(legacyRoot, probe), consumers };
  });

  return {
    parityVersion: PARITY_VERSION,
    generator: GENERATOR,
    sourceRevision: projection.manifest.sourceRevision,
    schemaRevision: projection.manifest.schemaRevision,
    projectionDigest: projection.manifest.projectionDigest,
    artifactCount: projection.manifest.artifactCount,
    perArtifact,
    docRows,
    rules: [...ruleStats.values()],
    unexplained,
    unusedRules,
    orderOnlyTotal,
    projectedOnly,
    consumer: { indexProblems: consumer.indexProblems, corpusFailures: Object.entries(consumer.corpusProblems).filter(([, v]) => v !== null), corpora: Object.keys(consumer.corpusProblems).length },
    conformance,
    inventory: inventoryRows,
    dossiers: { excluded: dossiers.excluded, proseBytes: dossiers.proseBytes },
    categoriesLegacy: categories.length,
    legacyNames: {
      revision: catalog.suites.length ? inputs.legacyMaps[0].source.revision : "",
      suites: catalog.suites.length,
      fixtures: catalog.fixtures.length,
      navigationScenarios: new Set(catalog.fixtures.flatMap((f) => f.scenarioIds)).size,
      navigationLinks: catalog.fixtures.reduce((s, f) => s + f.scenarioIds.length, 0),
    },
    caseCount: ix.cases.size,
    scenarioCount: ix.scenarios.size,
    planCount: ix.plans.size,
  };
}
