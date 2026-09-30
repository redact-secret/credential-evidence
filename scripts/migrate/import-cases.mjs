#!/usr/bin/env node
// npm run migrate:cases            regenerate the semantic tree from the pinned legacy revision:
//                                  records/scenarios, records/cases, records/fixture-plans,
//                                  records/fixtures, migration/legacy-map and the two reports
// npm run migrate:cases -- --check regenerate in memory and diff; exit 1 on any difference
//
// Options: --legacy <path>  checkout of redact-secret/redact-secret-benchmarks
//                           (default: $LEGACY_BENCHMARKS_DIR, then a sibling of this repo or an ancestor)
//
// A reclassifying pipeline (ADR 0008): it reads only the pinned legacy revision (through
// `git archive`, running the legacy fixture generators over that extraction) and the
// committed taxonomy records of #3, classifies every legacy imported case as a genuine
// Case, a reusable Scenario or a matrix projection, and writes the canonical tree. The
// owned directories are written wholesale: a file there that the pipeline does not
// produce is stale. Nothing in the legacy checkout is written.

import { mkdirSync, readFileSync, readdirSync, rmSync, rmdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { buildMaterialization } from "../lib/materialize.mjs";
import { buildRecords, OWNED_DIRS } from "./lib/build-records.mjs";
import { renderCasesReport } from "./lib/case-report.mjs";
import { loadLegacyModel, loadTaxonomy } from "./lib/legacy-model.mjs";
import { findLegacyDir, LEGACY_REVISION, loadGeneratedCorpora, materializeLegacy, repoRoot } from "./lib/legacy-source.mjs";
import { renderReclassificationReport } from "./lib/reclass-report.mjs";

const CASES_REPORT = "docs/migration/cases-report.md";
const RECLASS_REPORT = "docs/migration/reclassification-report.md";
// The state the first import (issue #4) left and stage A measured; facts about the past, not derivable now.
const BEFORE = { cases: 1925, sets: 67, violations: 1992 };

const args = process.argv.slice(2);
const check = args.includes("--check");
const li = args.indexOf("--legacy");
const legacyArg = li >= 0 ? args[li + 1] : undefined;
for (const a of args) {
  if (!["--check", "--legacy"].includes(a) && a !== legacyArg) {
    console.error(`unknown argument: ${a}`);
    process.exit(2);
  }
}

function walkJson(dir, visit) {
  let names;
  try {
    names = readdirSync(dir);
  } catch (e) {
    if (e.code === "ENOENT") return;
    throw e;
  }
  for (const name of names.sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkJson(p, visit);
    else if (name.endsWith(".json")) visit(p);
  }
}

function readJsonTree(sub) {
  const found = [];
  walkJson(join(repoRoot, "records", sub), (p) => found.push(JSON.parse(readFileSync(p, "utf8"))));
  return found;
}

function ownedFiles() {
  const found = [];
  for (const d of OWNED_DIRS) walkJson(join(repoRoot, d), (p) => found.push(relative(repoRoot, p)));
  return found;
}

function pruneEmptyDirs(dir) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) pruneEmptyDirs(p);
  }
  if (!readdirSync(dir).length) rmdirSync(dir);
}

const taxonomy = loadTaxonomy(readJsonTree);
if (!taxonomy.families.size || !taxonomy.sources.size) {
  console.error("taxonomy records are missing; run npm run migrate:taxonomy first (issue #3)");
  process.exit(2);
}

const legacyDir = findLegacyDir(legacyArg);
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

const read = (rel) => {
  try {
    return readFileSync(join(repoRoot, rel), "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
};

const missing = [];
const changed = [];
for (const [rel, text] of generated) {
  const cur = read(rel);
  if (cur === null) missing.push(rel);
  else if (cur !== text) changed.push(rel);
}
const stale = ownedFiles().filter((rel) => !generated.has(rel));

if (check) {
  const problems = [...missing.map((r) => `missing: ${r}`), ...changed.map((r) => `differs: ${r}`), ...stale.map((r) => `stale: ${r}`)];
  if (problems.length) {
    for (const p of problems.slice(0, 25)) console.error(p);
    if (problems.length > 25) console.error(`... and ${problems.length - 25} more`);
    console.error(`\nFAIL: import at ${LEGACY_REVISION.slice(0, 12)} differs from the tree in ${problems.length} file(s); run npm run migrate:cases`);
    process.exit(1);
  }
  console.log(`OK: ${generated.size} generated file(s) match the tree (legacy ${LEGACY_REVISION.slice(0, 12)}, ${built.records.cases.length} cases, ${built.records.scenarios.length} scenarios, materialization digest ${digest.slice(0, 12)})`);
} else {
  for (const rel of [...missing, ...changed]) {
    const abs = join(repoRoot, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, generated.get(rel));
  }
  for (const rel of stale) rmSync(join(repoRoot, rel));
  for (const d of OWNED_DIRS) pruneEmptyDirs(join(repoRoot, d));
  console.log(`wrote ${missing.length} new, ${changed.length} changed, removed ${stale.length} stale; ${generated.size} generated file(s) total (legacy ${LEGACY_REVISION.slice(0, 12)}; ${built.records.cases.length} cases, ${built.records.scenarios.length} scenarios, ${built.records.plans.length} plans, ${built.records.sets.length} sets)`);
}
