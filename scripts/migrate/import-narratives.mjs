#!/usr/bin/env node
// npm run migrate:narratives            compile the authored narratives into records/narratives,
//                                       records/narrative-reviews and docs/migration/narrative-report.md,
//                                       and its slice of docs/migration/baseline-manifest.json
// npm run migrate:narratives -- --check compile in memory and require the baseline manifest to be reproduced
//
// Options: --legacy <path>  checkout of redact-secret/redact-secret-benchmarks
//                           (default: $LEGACY_BENCHMARKS_DIR, then a sibling of this repo or an ancestor)
//          --only a,b       dry run for some providers: compile and verify citations, write nothing
//
// The narratives are authored by hand in scripts/migrate/authored/narratives (ADR 0010); this
// tool compiles and verifies them. It reads the pinned legacy revision only to account for
// every dossier in the report (git archive into a temporary directory; nothing is written
// there) and the taxonomy stage's output (in memory: records/ of the working tree is not read)
// to resolve citations. A historical check (ADR 0015): reviewed edits and new records in the tree
// do not fail it; `npm run baseline:check` classifies those.

import { buildNarrativeFiles, buildTaxonomyFiles } from "./lib/baseline-build.mjs";
import { checkImporter, writeImporter } from "./lib/importer-io.mjs";
import { findLegacyDir } from "./lib/legacy-source.mjs";
import { OWNED_DIRS } from "./lib/narrative-build.mjs";

const args = process.argv.slice(2);
const check = args.includes("--check");
const oi = args.indexOf("--only");
const only = oi >= 0 ? args[oi + 1].split(",") : null;
const li = args.indexOf("--legacy");
const legacyArg = li >= 0 ? args[li + 1] : undefined;
for (const a of args) {
  if (!["--check", "--legacy", "--only"].includes(a) && a !== legacyArg && a !== (oi >= 0 ? args[oi + 1] : undefined)) {
    console.error(`unknown argument: ${a}`);
    process.exit(2);
  }
}

const legacyDir = findLegacyDir(legacyArg);
let result;
try {
  result = await buildNarrativeFiles({ legacyDir, taxonomyFiles: buildTaxonomyFiles({ legacyDir }), only });
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
if (only) {
  console.log(`OK (dry run): ${result.built.rows.length} narrative(s) for ${only.join(", ")} compile and every citation resolves`);
} else if (check) {
  checkImporter({ owner: "migrate:narratives", command: "migrate:narratives", generated: result.generated, okLine: result.summary });
} else {
  writeImporter({ owner: "migrate:narratives", generated: result.generated, ownedDirs: OWNED_DIRS, summary: result.summary });
}
