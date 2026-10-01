#!/usr/bin/env node
// npm run lint:narrative   check family-narrative prose against ADR 0010
//
// Scans examples/valid and records (or the directories given as arguments). Reads JSON
// only; schema validity is `npm run validate`'s job. There is no baseline: any benchmark,
// product, detector, support-status or issue-workflow vocabulary in a narrative fails.

import { readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { checkNarrativeLint, NARRATIVE_KINDS } from "./lib/narrative-lint.mjs";
import { listJson, repoRoot } from "./lib/validator.mjs";

const args = process.argv.slice(2);
const dirs = args.length ? args.map((d) => resolve(d)) : ["examples/valid", "records"].map((d) => join(repoRoot, d));

const entries = [];
for (const dir of dirs) {
  let files;
  try {
    files = listJson(dir);
  } catch (e) {
    if (e.code === "ENOENT") continue;
    throw e;
  }
  for (const file of files) {
    try {
      entries.push({ path: relative(repoRoot, file).split("\\").join("/"), record: JSON.parse(readFileSync(file, "utf8")) });
    } catch {
      // unparsable files are reported by `npm run validate`
    }
  }
}

const errors = checkNarrativeLint(entries);
if (errors.length) {
  for (const e of errors.slice(0, 50)) console.error(e);
  if (errors.length > 50) console.error(`... and ${errors.length - 50} more`);
  console.error(`\nFAIL: ${errors.length} narrative lint problem(s) in ${entries.length} record file(s)`);
  process.exit(1);
}
const scoped = entries.filter((e) => NARRATIVE_KINDS.includes(e.record.kind)).length;
console.log(`OK: ${entries.length} record file(s) scanned, ${scoped} narrative(s) in scope, 0 violations`);
