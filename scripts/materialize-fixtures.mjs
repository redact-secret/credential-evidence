#!/usr/bin/env node
// npm run fixtures:materialize            write fixtures/materialized/ (gitignored) from records/
// npm run fixtures:materialize -- --check verify the records; if the output exists, verify it too
//
// Options: --out <dir>   output directory (default fixtures/materialized)
//
// The output is a plain file tree (one file per fixture, <set>/<path>) and a
// manifest.json giving each fixture's outcome, byte ranges, case and lineage. It is
// derived from committed records only and is never committed. --check fails if the
// records are invalid, if any fixture's digest is wrong, if an existing output tree
// differs from what the records produce, or if the digest disagrees with the one
// recorded in docs/migration/cases-report.md.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { buildMaterialization, MANIFEST_FORMAT } from "./lib/materialize.mjs";
import { createValidator, repoRoot, validateTree } from "./lib/validator.mjs";

const args = process.argv.slice(2);
const check = args.includes("--check");
const oi = args.indexOf("--out");
const outArg = oi >= 0 ? args[oi + 1] : undefined;
for (const a of args) {
  if (!["--check", "--out"].includes(a) && a !== outArg) {
    console.error(`unknown argument: ${a}`);
    process.exit(2);
  }
}
if (oi >= 0 && !outArg) {
  console.error("--out needs a directory");
  process.exit(2);
}
const out = resolve(outArg ?? join(repoRoot, "fixtures", "materialized"));

const { errors, records } = validateTree([join(repoRoot, "records")], { validator: createValidator() });
if (errors.length) {
  for (const e of errors.slice(0, 25)) console.error(e);
  console.error(`\nFAIL: records/ does not validate (${errors.length} problem(s)); nothing materialized`);
  process.exit(1);
}
const all = records.map((r) => r.record);
const sets = all.filter((r) => r.kind === "fixture-set");
const cases = all.filter((r) => r.kind === "case");
const scenarios = all.filter((r) => r.kind === "scenario");
if (!sets.length) {
  console.error("FAIL: no fixture-set records under records/; run npm run migrate:cases");
  process.exit(1);
}
const built = buildMaterialization({ sets, cases, scenarios });

function readTree(dir) {
  const found = new Map();
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else found.set(relative(dir, p), readFileSync(p));
    }
  };
  walk(dir);
  return found;
}

if (check) {
  const problems = [];
  const reportPath = join(repoRoot, "docs", "migration", "cases-report.md");
  if (existsSync(reportPath)) {
    const m = /materialization digest: `([0-9a-f]{64})`/.exec(readFileSync(reportPath, "utf8"));
    if (m && m[1] !== built.digest) problems.push(`digest ${built.digest} differs from docs/migration/cases-report.md (${m[1]}); run npm run migrate:cases`);
  }
  if (existsSync(out)) {
    const have = readTree(out);
    const want = new Map([...built.files, ["manifest.json", Buffer.from(built.manifestText)]]);
    for (const [path, bytes] of want) {
      if (!have.has(path)) problems.push(`missing in output: ${path}`);
      else if (!have.get(path).equals(bytes)) problems.push(`differs in output: ${path}`);
    }
    for (const path of have.keys()) if (!want.has(path)) problems.push(`unexpected in output: ${path}`);
  }
  if (problems.length) {
    for (const p of problems.slice(0, 25)) console.error(p);
    if (problems.length > 25) console.error(`... and ${problems.length - 25} more`);
    console.error(`\nFAIL: materialization check found ${problems.length} problem(s)`);
    process.exit(1);
  }
  console.log(`OK: ${built.manifest.count} fixture(s) digest ${built.digest}${existsSync(out) ? ` (output at ${relative(repoRoot, out) || "."} matches)` : " (no output directory; records verified)"}`);
} else {
  if (existsSync(out)) {
    const manifestPath = join(out, "manifest.json");
    let ours = false;
    try {
      ours = JSON.parse(readFileSync(manifestPath, "utf8")).format === MANIFEST_FORMAT;
    } catch {
      ours = false;
    }
    if (!ours && readdirSync(out).length) {
      console.error(`refusing to replace ${out}: it is not a previous materialization (no manifest.json of format ${MANIFEST_FORMAT})`);
      process.exit(1);
    }
    rmSync(out, { recursive: true, force: true });
  }
  for (const [path, bytes] of built.files) {
    const abs = join(out, path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, bytes);
  }
  writeFileSync(join(out, "manifest.json"), built.manifestText);
  console.log(`wrote ${built.files.size} fixture file(s) and manifest.json to ${relative(repoRoot, out) || "."} (digest ${built.digest})`);
}
