#!/usr/bin/env node
// npm run migrate:taxonomy            regenerate the taxonomy baseline (records and docs/migration/taxonomy-report.md)
//                                     and its slice of docs/migration/baseline-manifest.json
// npm run migrate:taxonomy -- --check regenerate in memory and require the baseline manifest to be reproduced
//
// Options: --legacy <path>  checkout of redact-secret/redact-secret-benchmarks
//                           (default: $LEGACY_BENCHMARKS_DIR, then a sibling of this repo or an ancestor)
//
// The legacy revision is pinned in scripts/migrate/lib/legacy-source.mjs and read
// with `git archive`, so the legacy checkout's HEAD and working tree do not matter.
// A historical check (ADR 0015): the working tree is not compared, so reviewed edits and new
// records do not fail it; `npm run baseline:check` classifies those.

import { buildTaxonomyFiles } from "./lib/baseline-build.mjs";
import { checkImporter, writeImporter } from "./lib/importer-io.mjs";
import { findLegacyDir } from "./lib/legacy-source.mjs";

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

const generated = buildTaxonomyFiles({ legacyDir: findLegacyDir(legacyArg) });
if (check) checkImporter({ owner: "migrate:taxonomy", command: "migrate:taxonomy", generated, okLine: "taxonomy" });
else writeImporter({ owner: "migrate:taxonomy", generated, ownedDirs: [], summary: "taxonomy" });
