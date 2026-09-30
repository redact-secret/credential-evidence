#!/usr/bin/env node
// npm run lint:identity             check ids and paths against ADR 0007 and the shrinking baseline
// npm run lint:identity -- --shrink rewrite the baseline dropping entries that no longer violate;
//                                   refuses to add an entry or a code (the baseline only shrinks)
//
// Scans examples/valid, records and migration (or the directories given after
// `--`). Reads JSON only; schema validity is `npm run validate`'s job.

import { readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { TRACKING, checkIdentity, collectViolations, loadBaseline, writeBaseline } from "./lib/identity.mjs";
import { listJson, repoRoot } from "./lib/validator.mjs";

const args = process.argv.slice(2);
const shrink = args.includes("--shrink");
const dirArgs = args.filter((a) => a !== "--shrink");
const dirs = dirArgs.length ? dirArgs.map((d) => resolve(d)) : ["examples/valid", "records", "migration"].map((d) => join(repoRoot, d));

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
const scopePrefixes = dirs.map((d) => relative(repoRoot, d).split("\\").join("/"));
const baseline = loadBaseline();

if (shrink) {
  const actual = collectViolations(entries);
  const next = {};
  const problems = [];
  for (const [path, allowed] of Object.entries(baseline)) {
    const inScope = scopePrefixes.some((p) => path.startsWith(`${p}/`));
    const kept = inScope ? allowed.filter((c) => (actual[path] ?? []).includes(c)) : allowed;
    if (kept.length) next[path] = kept;
  }
  for (const [path, codes] of Object.entries(actual)) {
    if (!baseline[path] || codes.some((c) => !baseline[path].includes(c))) problems.push(path);
  }
  if (problems.length) {
    for (const p of problems) console.error(`${p}: new identity violation; fix the id or path, the baseline cannot grow`);
    process.exit(1);
  }
  writeBaseline(next);
  console.log(`baseline now lists ${Object.keys(next).length} record(s) (was ${Object.keys(baseline).length})`);
  process.exit(0);
}

const errors = checkIdentity(entries, baseline, { scopePrefixes });
const violating = Object.keys(collectViolations(entries)).length;
if (errors.length) {
  for (const e of errors.slice(0, 50)) console.error(e);
  if (errors.length > 50) console.error(`... and ${errors.length - 50} more`);
  console.error(`\nFAIL: ${errors.length} identity problem(s) in ${entries.length} record file(s)`);
  process.exit(1);
}
console.log(`OK: ${entries.length} record file(s) scanned, ${violating} baselined violation(s) remaining (removal tracked in ${TRACKING}, stage B)`);
