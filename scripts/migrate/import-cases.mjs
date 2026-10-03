#!/usr/bin/env node
// npm run migrate:cases            regenerate the semantic tree from the pinned legacy revision:
//                                  records/scenarios, records/cases, records/fixture-plans,
//                                  records/fixtures, migration/legacy-map and the two reports,
//                                  and its slice of docs/migration/baseline-manifest.json
// npm run migrate:cases -- --check regenerate in memory and require the baseline manifest to be reproduced
//
// Options: --legacy <path>  checkout of redact-secret/redact-secret-benchmarks
//                           (default: $LEGACY_BENCHMARKS_DIR, then a sibling of this repo or an ancestor)
//
// A reclassifying pipeline (ADR 0008): it reads only the pinned legacy revision (through
// `git archive`, running the legacy fixture generators over that extraction) and the taxonomy
// stage's output (in memory: records/ of the working tree is not read), classifies every legacy
// imported case as a genuine Case, a reusable Scenario or a matrix projection, and writes the
// canonical tree. A historical check (ADR 0015): reviewed edits and new records in the tree do not
// fail it; `npm run baseline:check` classifies those. Nothing in the legacy checkout is written.

import { buildCasesFiles, buildTaxonomyFiles } from "./lib/baseline-build.mjs";
import { OWNED_DIRS } from "./lib/build-records.mjs";
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

const legacyDir = findLegacyDir(legacyArg);
const { generated, summary } = buildCasesFiles({ legacyDir, taxonomyFiles: buildTaxonomyFiles({ legacyDir }) });
if (check) checkImporter({ owner: "migrate:cases", command: "migrate:cases", generated, okLine: summary });
else writeImporter({ owner: "migrate:cases", generated, ownedDirs: OWNED_DIRS, summary });
