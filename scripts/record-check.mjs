#!/usr/bin/env node
// npm run record:check [-- <file-or-dir> ...] [--base <ref>]
// Fast subset of `npm run validate` for changed records: schema, references, identity,
// narrative lint and scaffold placeholders. With no paths it checks every record file that
// differs from the merge-base with --base (default origin/main), is modified in the working
// tree, or is untracked. `npm run validate` / `npm run check` remain the gate.

import { parseArgs } from "node:util";
import { changedRecordFiles, checkRecordFiles, expandTargets } from "./lib/record-check.mjs";
import { repoRoot } from "./lib/validator.mjs";

let parsed;
try {
  parsed = parseArgs({ allowPositionals: true, options: { base: { type: "string" }, root: { type: "string" }, help: { type: "boolean", short: "h" } } });
} catch (e) {
  console.error(`usage error: ${e.message}`);
  process.exit(2);
}
const { values, positionals } = parsed;
if (values.help) {
  console.log("usage: npm run record:check [-- <file-or-dir> ...] [--base <ref>]\nChecks schema, references, identity, narrative lint and scaffold placeholders of the given (or changed) record files.");
  process.exit(0);
}

const root = values.root ?? repoRoot;
const files = positionals.length ? expandTargets(positionals, root) : changedRecordFiles({ root, base: values.base });
if (!files.length) {
  console.log("OK: no record files to check");
  process.exit(0);
}
const { errors, checked } = checkRecordFiles(files, { root });
if (errors.length) {
  for (const e of errors) console.error(e);
  console.error(`\nFAIL: ${errors.length} problem(s) in ${checked} record file(s)`);
  process.exit(1);
}
console.log(`OK: ${checked} record file(s) pass schema, references, identity, narrative lint and placeholders`);
