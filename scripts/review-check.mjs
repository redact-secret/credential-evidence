#!/usr/bin/env node
// npm run review:check -- <base>..<head> [--json] [--today YYYY-MM-DD] [--body-file <file>] [--root <dir>]
//
// Deterministic, read-only, offline. Checks the mechanical half of the research-PR review gate
// (the review-research-pr skill does the rest). The last stdout line is `VERDICT: pass|fail|needs-human`.
// Exit codes: 0 pass, 1 fail, 3 needs-human, 2 usage error.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { formatReport, reviewRange } from "./lib/review-check.mjs";
import { repoRoot } from "./lib/validator.mjs";

let parsed;
try {
  parsed = parseArgs({
    allowPositionals: true,
    options: { json: { type: "boolean" }, today: { type: "string" }, "body-file": { type: "string" }, root: { type: "string" }, help: { type: "boolean", short: "h" } },
  });
} catch (e) {
  console.error(`usage error: ${e.message}`);
  process.exit(2);
}
const { values, positionals } = parsed;
if (values.help || positionals.length !== 1 || !/^[^.\s][^\s]*\.\.\.?[^.\s][^\s]*$/.test(positionals[0])) {
  console.error("usage: npm run review:check -- <base>..<head> [--json] [--today YYYY-MM-DD] [--body-file <file>] [--root <dir>]");
  process.exit(values.help ? 0 : 2);
}
const [base, head] = positionals[0].split(/\.{2,3}/);
const root = values.root ? resolve(values.root) : repoRoot;
let body = "";
if (values["body-file"]) body = readFileSync(resolve(values["body-file"]), "utf8");

let result;
try {
  result = reviewRange({ root, base, head, today: values.today, body });
} catch (e) {
  console.error(`usage error: ${e.message}`);
  process.exit(2);
}
if (values.json) console.log(JSON.stringify({ base, head, verdict: result.verdict, findings: result.findings }, null, 2));
else console.log(formatReport(result, { base, head }));
process.exit({ pass: 0, fail: 1, "needs-human": 3 }[result.verdict]);
