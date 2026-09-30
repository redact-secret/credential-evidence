#!/usr/bin/env node
// npm run parity            compare the generated projection with the legacy files at the pinned
//                           revision and write docs/migration/parity-report.md
// npm run parity -- --check regenerate in memory and diff against the committed report
//
// Options: --legacy <path>  checkout of redact-secret/redact-secret-benchmarks
//                           (default: $LEGACY_BENCHMARKS_DIR, then a sibling of this repo or an ancestor)
//
// Exit 1 when any difference is unexplained, a rule matches nothing, a legacy consumer check
// fails, or (with --check) the committed report differs. The report is written even on failure
// so the differences can be read. Nothing in the legacy checkout is written.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "../export/legacy-projection.mjs";
import { repoRoot } from "../lib/validator.mjs";
import { openLegacy } from "./lib/legacy.mjs";
import { runParity } from "./lib/parity.mjs";
import { renderParityReport, verdictOf } from "./lib/report.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = "docs/migration/parity-report.md";

const args = process.argv.slice(2);
const check = args.includes("--check");
const li = args.indexOf("--legacy");
const legacyArg = li >= 0 ? args[li + 1] : undefined;
for (const a of args) if (!["--check", "--legacy"].includes(a) && a !== legacyArg) {
  console.error(`unknown argument: ${a}`);
  process.exit(2);
}

const { inputs, projection } = generate();
const { root, cleanup } = openLegacy(legacyArg);
let result;
try {
  result = runParity({ legacyRoot: root, inputs, projection, rulesPath: join(here, "rules.json"), inventoryPath: join(here, "inventory.json") });
} finally {
  cleanup();
}
const report = renderParityReport(result);
const ok = verdictOf(result);
const file = join(repoRoot, REPORT_PATH);
const summary = `unexplained ${result.unexplained.length}, explained ${[...result.perArtifact.values()].reduce((s, a) => s + a.explained, 0)}, identical ${[...result.perArtifact.values()].reduce((s, a) => s + a.equal, 0)}`;

if (check) {
  const current = existsSync(file) ? readFileSync(file, "utf8") : null;
  if (!ok) {
    console.error(`FAIL: parity is not clean (${summary}); run npm run parity and read ${REPORT_PATH}`);
    process.exit(1);
  }
  if (current !== report) {
    console.error(`FAIL: ${REPORT_PATH} is ${current === null ? "missing" : "stale"}; run npm run parity`);
    process.exit(1);
  }
  console.log(`OK: parity report matches (${summary}; projection ${result.projectionDigest.slice(0, 12)})`);
} else {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, report);
  console.log(`wrote ${REPORT_PATH} (${summary})`);
  if (!ok) {
    console.error("FAIL: parity is not clean; see the report");
    process.exit(1);
  }
}
