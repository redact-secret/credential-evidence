#!/usr/bin/env node
// npm run lint:source-revision [-- --require-reachable | --no-reachability] [root]
//
// Checks every generator.sourceRevision recorded under records/ (ADR 0005 addendum). Always: a 40-hex commit that is
// not the all-zero placeholder, not the checked-out commit and not PR_HEAD_SHA (the pull request tip, set by CI).
// When the clone has full history and a main ref: the commit must be reachable from main, so a value made on a branch
// and orphaned by a squash merge fails. `--require-reachable` turns "could not check" into a failure (CI uses it on
// a full-history checkout); `--no-reachability` skips the history check. Offline.

import { resolve } from "node:path";
import { checkSourceRevisions } from "./lib/source-revision.mjs";
import { repoRoot } from "./lib/validator.mjs";

const args = process.argv.slice(2);
const reachability = args.includes("--require-reachable") ? "require" : args.includes("--no-reachability") ? "off" : "auto";
const rootArg = args.find((a) => !a.startsWith("--"));
const { errors, notes, checked } = checkSourceRevisions({ root: rootArg ? resolve(rootArg) : repoRoot, reachability });

for (const n of notes) console.log(`note: ${n}`);
if (errors.length) {
  for (const e of errors.slice(0, 50)) console.error(e);
  console.error(`\nFAIL: ${errors.length} sourceRevision problem(s)`);
  process.exit(1);
}
console.log(`OK: ${checked} generator sourceRevision value(s) checked, 0 problems`);
