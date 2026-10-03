// Regenerates the import baseline in memory from the pinned legacy revision (ADR 0015).
//
// The three importers feed each other (taxonomy -> cases -> narratives). They used to read the
// previous importer's output from `records/`, so any record added to the tree changed what they
// produced. Here each stage takes the previous stage's output as an in-memory file map and never
// reads `records/`: the result depends only on the pinned legacy revision and the importer code
// (including scripts/migrate/authored). That is what makes "the baseline is reproducible at the
// pin" provable while the tree carries canonical research changes.

import { walkOrder } from "../../lib/baseline.mjs";
import { buildMaterialization } from "../../lib/materialize.mjs";
import { buildRecords } from "./build-records.mjs";
import { renderCasesReport } from "./case-report.mjs";
import { loadLegacyModel, loadTaxonomy } from "./legacy-model.mjs";
import { LEGACY_PATHS, LEGACY_REVISION, loadGeneratedCorpora, materializeLegacy, repoRoot } from "./legacy-source.mjs";
import { buildNarratives, loadAuthored } from "./narrative-build.mjs";
import { inventoryDossiers, renderNarrativeReport } from "./narrative-report.mjs";
import { renderReclassificationReport } from "./reclass-report.mjs";
import { buildTaxonomyImport } from "./taxonomy-import.mjs";
import { renderTaxonomyReport } from "./taxonomy-report.mjs";

export const TAXONOMY_REPORT = "docs/migration/taxonomy-report.md";
export const CASES_REPORT = "docs/migration/cases-report.md";
export const RECLASS_REPORT = "docs/migration/reclassification-report.md";
export const NARRATIVE_REPORT = "docs/migration/narrative-report.md";

// The state the first import (issue #4) left and stage A measured; facts about the past, not derivable now.
const BEFORE = { cases: 1925, sets: 67, violations: 1992 };
const DEFERRED_REASON =
  "No narrative has been written for a deferred dossier yet. Migration is by review, one family at a time. A deferred dossier stays at its pinned legacy path, its families keep their one-sentence `description`, contract claims and review history, and each is listed below for the next migration pass. Deferral is not a verdict on the dossier's content.";

/** Parsed JSON records of `records/<sub>/**` from a generated file map, in tree-walk order. */
export function recordsIn(files, sub) {
  return [...files.keys()]
    .filter((p) => p.startsWith(`records/${sub}/`) && p.endsWith(".json"))
    .sort(walkOrder)
    .map((p) => JSON.parse(files.get(p)));
}

/** Stage 1: taxonomy records and report. Returns the generated file map. */
export function buildTaxonomyFiles({ legacyDir }) {
  const { root, cleanup } = materializeLegacy(legacyDir);
  let built;
  try {
    built = buildTaxonomyImport({ root });
  } finally {
    cleanup();
  }
  const generated = new Map(built.files);
  generated.set(TAXONOMY_REPORT, renderTaxonomyReport({ report: built.report, files: built.files }));
  return generated;
}

/** Stage 2: scenarios, cases, plans, fixture sets, the legacy map and the two reports. */
export function buildCasesFiles({ legacyDir, taxonomyFiles }) {
  const taxonomy = loadTaxonomy((sub) => recordsIn(taxonomyFiles, sub));
  if (!taxonomy.families.size || !taxonomy.sources.size) throw new Error("the taxonomy stage produced no families or sources");
  const { root, cleanup } = materializeLegacy(legacyDir, LEGACY_REVISION, ["benchmarks", "scanners", "fixtures", "package.json"]);
  let model;
  try {
    model = loadLegacyModel({ root, generated: loadGeneratedCorpora(root), taxonomy });
  } finally {
    cleanup();
  }
  const built = buildRecords({ model, taxonomy });
  model.taxonomyFamilies = taxonomy.families;
  model.classificationCounts = {
    projection: model.aggs.filter((a) => built.classification.get(a.key).cls === "projection").length,
    twinCases: model.aggs.filter((a) => a.roleKind === "twin").length,
  };
  const { digest } = buildMaterialization({ sets: built.records.sets, cases: built.records.cases, scenarios: built.records.scenarios });
  const generated = new Map(built.files);
  generated.set(RECLASS_REPORT, renderReclassificationReport({ model, built, before: BEFORE }));
  generated.set(CASES_REPORT, renderCasesReport({ model, built, digest }));
  const summary = `${built.records.cases.length} cases, ${built.records.scenarios.length} scenarios, ${built.records.plans.length} plans, ${built.records.sets.length} sets, materialization digest ${digest.slice(0, 12)}`;
  return { generated, digest, summary, cases: built.records.cases.length, scenarios: built.records.scenarios.length };
}

/** Stage 3: the family narratives compiled from scripts/migrate/authored/narratives, with their review history and report. */
export async function buildNarrativeFiles({ legacyDir, taxonomyFiles, only = null }) {
  const canonical = {
    families: new Map(recordsIn(taxonomyFiles, "families").map((r) => [r.id, r])),
    contracts: new Map(recordsIn(taxonomyFiles, "contracts").map((r) => [r.id, r])),
    sources: new Map(recordsIn(taxonomyFiles, "sources").map((r) => [r.id, r])),
  };
  if (!canonical.families.size || !canonical.sources.size) throw new Error("the taxonomy stage produced no families or sources");
  const authored = (await loadAuthored(repoRoot)).filter((a) => !only || only.includes(a.data.provider));
  const built = buildNarratives({ authored, canonical, legacyRevision: LEGACY_REVISION });
  if (only) return { built, generated: null, inventory: null };
  const { root, cleanup } = materializeLegacy(legacyDir, LEGACY_REVISION, [LEGACY_PATHS.dossierDir]);
  let inventory;
  try {
    inventory = inventoryDossiers(root);
  } finally {
    cleanup();
  }
  const generated = new Map(built.files);
  generated.set(NARRATIVE_REPORT, renderNarrativeReport({ inventory, rows: built.rows, dropped: built.dropped, legacyRevision: LEGACY_REVISION, deferredReason: DEFERRED_REASON }));
  return { built, generated, inventory, summary: `${built.rows.length} narratives over ${inventory.length} dossiers` };
}

/**
 * The whole baseline: { files: Map<path, string>, owners: Map<path, owner> } for records/**, migration/legacy-map/**
 * and the four importer reports. Nothing under `records/` of the working tree is read.
 */
export async function buildBaseline({ legacyDir }) {
  const taxonomyFiles = buildTaxonomyFiles({ legacyDir });
  const cases = buildCasesFiles({ legacyDir, taxonomyFiles });
  const narratives = await buildNarrativeFiles({ legacyDir, taxonomyFiles });
  const files = new Map();
  const owners = new Map();
  for (const [owner, map] of [["migrate:taxonomy", taxonomyFiles], ["migrate:cases", cases.generated], ["migrate:narratives", narratives.generated]]) {
    for (const [path, text] of map) {
      if (files.has(path)) throw new Error(`${path} is produced by two importers`);
      files.set(path, text);
      owners.set(path, owner);
    }
  }
  return { files, owners };
}
