#!/usr/bin/env node
// npm run report:bases [-- <dir> ...] [--json] [--plan <id>]
//
// Counts authored base samples against generated projections, per fixture plan and overall (ADR 0016). Read-only and
// deterministic. Default directory: records. Validates first and refuses to report on records that do not validate.
// Exit 0 with the report, 1 when the records are invalid, 2 on a usage error.

import { join, resolve } from "node:path";
import { buildBasesReport, renderBasesReport } from "./lib/bases-report.mjs";
import { createValidator, repoRoot, validateTree } from "./lib/validator.mjs";

const args = process.argv.slice(2);
const dirs = [];
let json = false;
let plan;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--json") json = true;
  else if (a === "--plan") plan = args[++i];
  else if (a.startsWith("--")) {
    console.error(`unknown argument: ${a}`);
    process.exit(2);
  } else dirs.push(resolve(a));
}
if (args.includes("--plan") && !plan) {
  console.error("--plan needs a fixture-plan id");
  process.exit(2);
}

const { errors, records } = validateTree(dirs.length ? dirs : [join(repoRoot, "records")], { validator: createValidator() });
if (errors.length) {
  for (const e of errors.slice(0, 25)) console.error(e);
  console.error(`\nFAIL: records do not validate (${errors.length} problem(s)); no report`);
  process.exit(1);
}
const all = records.map((r) => r.record);
let report = buildBasesReport({ sets: all.filter((r) => r.kind === "fixture-set"), cases: all.filter((r) => r.kind === "case"), plans: all.filter((r) => r.kind === "fixture-plan") });
if (plan) {
  const row = report.plans.find((p) => p.plan === plan);
  if (!row) {
    console.error(`no fixture-plan '${plan}'`);
    process.exit(2);
  }
  report = { ...report, plans: [row] };
}
process.stdout.write(json ? `${JSON.stringify(report, null, 2)}\n` : `${renderBasesReport(report)}\n`);
