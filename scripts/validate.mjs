#!/usr/bin/env node
// npm run validate [-- <dir> ...]
// Validates the schemas themselves, then every JSON record under the given
// directories (default: examples/valid and records/). Offline and deterministic.
//
// Each default directory is its own universe: references and id uniqueness are
// checked inside it, never across. examples/valid is a set of illustrative
// records that may reuse ids of real records (the legacy-import example shows
// the AWS access key path with the same ids the imported records use). Explicit
// directories given on the command line are validated together as one universe.

import { join } from "node:path";
import { createValidator, loadSchemas, repoRoot, validateTree } from "./lib/validator.mjs";

const args = process.argv.slice(2);
const universes = args.length ? [args] : [[join(repoRoot, "examples", "valid")], [join(repoRoot, "records")]];

let validator;
try {
  validator = createValidator(loadSchemas());
} catch (e) {
  console.error(`schema error: ${e.message}`);
  process.exit(2);
}

let total = 0;
const errors = [];
const counts = {};
for (const dirs of universes) {
  const result = validateTree(dirs, { validator });
  total += result.total;
  errors.push(...result.errors);
  for (const { record } of result.records) counts[record.kind] = (counts[record.kind] ?? 0) + 1;
}
if (errors.length) {
  for (const e of errors) console.error(e);
  console.error(`\nFAIL: ${errors.length} problem(s) in ${total} file(s)`);
  process.exit(1);
}
const summary = Object.keys(counts).sort().map((k) => `${k}=${counts[k]}`).join(" ");
console.log(`OK: ${total} record file(s) valid${summary ? ` (${summary})` : ""}`);
