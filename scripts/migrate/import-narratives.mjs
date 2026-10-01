#!/usr/bin/env node
// npm run migrate:narratives            compile the authored narratives into records/narratives,
//                                       records/narrative-reviews and docs/migration/narrative-report.md
// npm run migrate:narratives -- --check compile in memory and diff; exit 1 on any difference
//
// Options: --legacy <path>  checkout of redact-secret/redact-secret-benchmarks
//                           (default: $LEGACY_BENCHMARKS_DIR, then a sibling of this repo or an ancestor)
//
// The narratives are authored by hand in scripts/migrate/authored/narratives (ADR 0010); this
// tool compiles and verifies them. It reads the pinned legacy revision only to account for
// every dossier in the report (git archive into a temporary directory; nothing is written
// there) and the committed taxonomy records to resolve citations. The owned directories are
// written wholesale: a file there that the compiler does not produce is stale.

import { mkdirSync, readFileSync, readdirSync, rmSync, rmdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { findLegacyDir, LEGACY_PATHS, LEGACY_REVISION, materializeLegacy, repoRoot } from "./lib/legacy-source.mjs";
import { buildNarratives, loadAuthored, loadCanonical, OWNED_DIRS } from "./lib/narrative-build.mjs";
import { inventoryDossiers, renderNarrativeReport } from "./lib/narrative-report.mjs";

const REPORT = "docs/migration/narrative-report.md";
const DEFERRED_REASON =
  "No narrative has been written for these dossiers yet. Migration is by review, one family at a time, and the families the credential-evidence site uses as representative pages come first (the migrated and partial rows above). No dossier is dropped: each deferred dossier stays at its pinned legacy path, its families keep their one-sentence `description`, contract claims and review history, and each is listed below for the next migration pass. Deferral is not a verdict on the dossier's content.";

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

const canonical = loadCanonical(repoRoot);
if (!canonical.families.size || !canonical.sources.size) {
  console.error("taxonomy records are missing; run npm run migrate:taxonomy first (issue #3)");
  process.exit(2);
}
const authored = await loadAuthored(repoRoot);
let built;
try {
  built = buildNarratives({ authored, canonical, legacyRevision: LEGACY_REVISION });
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

const legacyDir = findLegacyDir(legacyArg);
const { root, cleanup } = materializeLegacy(legacyDir, LEGACY_REVISION, [LEGACY_PATHS.dossierDir]);
let inventory;
try {
  inventory = inventoryDossiers(root);
} finally {
  cleanup();
}
const generated = new Map(built.files);
generated.set(REPORT, renderNarrativeReport({ inventory, rows: built.rows, dropped: built.dropped, legacyRevision: LEGACY_REVISION, deferredReason: DEFERRED_REASON }));

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
const stale = [];
for (const d of OWNED_DIRS) walkJson(join(repoRoot, d), (p) => {
  const rel = relative(repoRoot, p);
  if (!generated.has(rel)) stale.push(rel);
});

if (check) {
  const problems = [...missing.map((r) => `missing: ${r}`), ...changed.map((r) => `differs: ${r}`), ...stale.map((r) => `stale: ${r}`)];
  if (problems.length) {
    for (const p of problems.slice(0, 25)) console.error(p);
    if (problems.length > 25) console.error(`... and ${problems.length - 25} more`);
    console.error(`\nFAIL: authored narratives differ from the tree in ${problems.length} file(s); run npm run migrate:narratives`);
    process.exit(1);
  }
  console.log(`OK: ${generated.size} generated file(s) match the tree (${built.rows.length} narratives over ${inventory.length} dossiers, legacy ${LEGACY_REVISION.slice(0, 12)})`);
} else {
  for (const rel of [...missing, ...changed]) {
    const abs = join(repoRoot, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, generated.get(rel));
  }
  for (const rel of stale) rmSync(join(repoRoot, rel));
  for (const d of OWNED_DIRS) pruneEmptyDirs(join(repoRoot, d));
  console.log(`wrote ${missing.length + changed.length} file(s), removed ${stale.length} stale (${built.rows.length} narratives over ${inventory.length} dossiers, legacy ${LEGACY_REVISION.slice(0, 12)})`);
}
