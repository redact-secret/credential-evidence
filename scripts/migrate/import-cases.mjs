#!/usr/bin/env node
// npm run migrate:cases            regenerate records/cases, records/fixtures and docs/migration/cases-report.md
// npm run migrate:cases -- --check regenerate in memory and diff; exit 1 on any difference
//
// Options: --legacy <path>  checkout of redact-secret/redact-secret-benchmarks
//                           (default: $LEGACY_BENCHMARKS_DIR, then a sibling of this repo or an ancestor)
//
// The legacy revision is pinned in scripts/migrate/lib/legacy-source.mjs and read
// with `git archive`, so the legacy checkout's HEAD and working tree do not matter.
// The legacy fixture generators are run over that extraction; nothing in the legacy
// checkout is written. Requires the taxonomy records of #3 (npm run migrate:taxonomy).

import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { buildMaterialization } from "../lib/materialize.mjs";
import { buildCaseImport, loadTaxonomy, OWNED_DIRS, OWNED_SYSTEM } from "./lib/case-import.mjs";
import { renderCasesReport } from "./lib/case-report.mjs";
import { findLegacyDir, LEGACY_REVISION, loadGeneratedCorpora, materializeLegacy, repoRoot } from "./lib/legacy-source.mjs";

const REPORT_PATH = "docs/migration/cases-report.md";

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

function readJsonTree(sub) {
  const found = [];
  const walk = (dir) => {
    let names;
    try {
      names = readdirSync(dir);
    } catch (e) {
      if (e.code === "ENOENT") return;
      throw e;
    }
    for (const name of names.sort()) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".json")) found.push(JSON.parse(readFileSync(p, "utf8")));
    }
  };
  walk(join(repoRoot, "records", sub));
  return found;
}

function ownedFiles() {
  const found = [];
  const walk = (dir) => {
    let names;
    try {
      names = readdirSync(dir);
    } catch (e) {
      if (e.code === "ENOENT") return;
      throw e;
    }
    for (const name of names.sort()) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".json")) {
        let rec;
        try {
          rec = JSON.parse(readFileSync(p, "utf8"));
        } catch {
          continue;
        }
        if ((rec.externalRefs ?? []).some((r) => r.system === OWNED_SYSTEM)) found.push(relative(repoRoot, p));
      }
    }
  };
  for (const d of OWNED_DIRS) walk(join(repoRoot, "records", d));
  return found;
}

const taxonomy = loadTaxonomy(readJsonTree);
if (!taxonomy.families.size || !taxonomy.sources.size) {
  console.error("taxonomy records are missing; run npm run migrate:taxonomy first (issue #3)");
  process.exit(2);
}

const legacyDir = findLegacyDir(legacyArg);
const { root, cleanup } = materializeLegacy(legacyDir, LEGACY_REVISION, ["benchmarks", "scanners", "fixtures", "package.json"]);
let built;
try {
  built = buildCaseImport({ root, generated: loadGeneratedCorpora(root), taxonomy });
} finally {
  cleanup();
}
const { digest } = buildMaterialization({ sets: built.model.setRecords, cases: built.model.caseRecords });
const generated = new Map(built.files);
generated.set(REPORT_PATH, renderCasesReport({ model: built.model, files: built.files, digest }));

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
  console.log(`OK: ${generated.size} generated file(s) match the tree (legacy ${LEGACY_REVISION.slice(0, 12)}, materialization digest ${digest.slice(0, 12)})`);
} else {
  for (const rel of [...missing, ...changed]) {
    const abs = join(repoRoot, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, generated.get(rel));
  }
  for (const rel of stale) rmSync(join(repoRoot, rel));
  console.log(`wrote ${missing.length} new, ${changed.length} changed, removed ${stale.length} stale; ${generated.size} generated file(s) total (legacy ${LEGACY_REVISION.slice(0, 12)})`);
}
