#!/usr/bin/env node
// npm run migrate:taxonomy            regenerate records/ and docs/migration/taxonomy-report.md
// npm run migrate:taxonomy -- --check regenerate in memory and diff; exit 1 on any difference
//
// Options: --legacy <path>  checkout of redact-secret/redact-secret-benchmarks
//                           (default: $LEGACY_BENCHMARKS_DIR, then a sibling of this repo or an ancestor)
//
// The legacy revision is pinned in scripts/migrate/lib/legacy-source.mjs and read
// with `git archive`, so the legacy checkout's HEAD and working tree do not matter.

import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { findLegacyDir, LEGACY_REVISION, materializeLegacy, repoRoot } from "./lib/legacy-source.mjs";
import { buildTaxonomyImport, OWNED_DIRS, OWNED_SYSTEM } from "./lib/taxonomy-import.mjs";
import { renderTaxonomyReport } from "./lib/taxonomy-report.mjs";

const REPORT_PATH = "docs/migration/taxonomy-report.md";

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

const legacyDir = findLegacyDir(legacyArg);
const { root, cleanup } = materializeLegacy(legacyDir);
let built;
try {
  built = buildTaxonomyImport({ root });
} finally {
  cleanup();
}
const reportText = renderTaxonomyReport({ report: built.report, files: built.files });
const generated = new Map(built.files);
generated.set(REPORT_PATH, reportText);

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
    console.error(`\nFAIL: import at ${LEGACY_REVISION.slice(0, 12)} differs from the tree in ${problems.length} file(s); run npm run migrate:taxonomy`);
    process.exit(1);
  }
  console.log(`OK: ${generated.size} generated file(s) match the tree (legacy ${LEGACY_REVISION.slice(0, 12)})`);
} else {
  for (const rel of [...missing, ...changed]) {
    const abs = join(repoRoot, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, generated.get(rel));
  }
  for (const rel of stale) rmSync(join(repoRoot, rel));
  console.log(`wrote ${missing.length} new, ${changed.length} changed, removed ${stale.length} stale; ${generated.size} generated file(s) total (legacy ${LEGACY_REVISION.slice(0, 12)})`);
}
