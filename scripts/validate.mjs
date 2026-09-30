#!/usr/bin/env node
// npm run validate [-- <dir> ...]
// Validates the schemas themselves, then every JSON record under the given
// directories (default: examples/valid and records/). Offline and deterministic.

import { join } from "node:path";
import { createValidator, loadSchemas, repoRoot, validateTree } from "./lib/validator.mjs";

const args = process.argv.slice(2);
const dirs = args.length ? args : [join(repoRoot, "examples", "valid"), join(repoRoot, "records")];

let validator;
try {
  validator = createValidator(loadSchemas());
} catch (e) {
  console.error(`schema error: ${e.message}`);
  process.exit(2);
}

const { total, records, errors } = validateTree(dirs, { validator });
if (errors.length) {
  for (const e of errors) console.error(e);
  console.error(`\nFAIL: ${errors.length} problem(s) in ${total} file(s)`);
  process.exit(1);
}
const counts = {};
for (const { record } of records) counts[record.kind] = (counts[record.kind] ?? 0) + 1;
const summary = Object.keys(counts).sort().map((k) => `${k}=${counts[k]}`).join(" ");
console.log(`OK: ${total} record file(s) valid${summary ? ` (${summary})` : ""}`);
