#!/usr/bin/env node
// npm run source:observe -- --due [flags]        which sources to re-read, most urgent first (JSON)
// npm run source:observe -- <source-id> --outcome <o> --observer <slug> [flags]
//                                                  append one observation to a source record
//
//   --due                 list sources due for a re-read; writes nothing
//     --family <id>  --provider <id>  --limit <N>  --as-of <YYYY-MM-DD|today>
//   --outcome read|unchanged|changed|unreachable|superseded
//   --observer <slug>     who read the page (never an import)
//   --observed-at <date>  default today (UTC); not in the future, not before the latest entry
//   --digest <sha256>     of the bytes you read (optional)
//   --note <text>         required for changed, unreachable, superseded: what you saw
//   --dry-run             print the record, write nothing
//   --root <dir>          another repository root (tests)
//
// This tool never fetches: you read the page, then report. It appends to `observations`; it never
// edits an earlier entry, a claim, a contract or a review history. A source that belongs to the import
// baseline (scripts/lib/ownership.mjs) is appended to like any other, and the edit is declared in
// docs/migration/baseline-amendments/ (one file, with this tool's own cause; ADR 0015); `npm run baseline:check`
// fails on an undeclared edit. Exit 0 ok, 1 refused, 2 usage.

import { readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import { baselineOwners, declareAmendment, loadAmendments } from "./lib/baseline.mjs";
import { ownerOf } from "./lib/ownership.mjs";
import { dueSources, ObserveError, OUTCOMES, planObservation } from "./lib/source-observe.mjs";
import { createValidator, listJson, repoRoot } from "./lib/validator.mjs";

const fail = (code, msg) => {
  console.error(msg);
  process.exit(code);
};

let args;
try {
  args = parseArgs({
    options: {
      due: { type: "boolean" },
      family: { type: "string" },
      provider: { type: "string" },
      limit: { type: "string" },
      "as-of": { type: "string" },
      outcome: { type: "string" },
      observer: { type: "string" },
      "observed-at": { type: "string" },
      digest: { type: "string" },
      note: { type: "string" },
      "dry-run": { type: "boolean" },
      root: { type: "string" },
    },
    allowPositionals: true,
  });
} catch (e) {
  fail(2, e.message);
}
const o = args.values;
const root = o.root ? resolve(o.root) : repoRoot;
const todayUtc = new Date().toISOString().slice(0, 10);
const posix = (p) => p.split(sep).join("/");
const files = listJson(join(root, "records"));

if (o.due) {
  const asOf = !o["as-of"] || o["as-of"] === "today" ? todayUtc : o["as-of"];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) fail(2, "--as-of must be YYYY-MM-DD or today");
  const limit = o.limit === undefined ? Infinity : Number(o.limit);
  if (!(limit >= 1)) fail(2, "--limit takes a positive integer");
  const records = files.map((f) => JSON.parse(readFileSync(f, "utf8")));
  const due = dueSources(records, { asOf, family: o.family ?? null, provider: o.provider ?? null });
  process.stdout.write(`${JSON.stringify({ asOf, count: due.length, sources: due.slice(0, limit) }, null, 2)}\n`);
} else {
  appendObservation();
}

function appendObservation() {
  const [id] = args.positionals;
  if (!id || args.positionals.length !== 1) fail(2, "usage: npm run source:observe -- --due | <source-id> --outcome <o> --observer <slug> [--note ..]");
  const file = files.find((f) => f.endsWith(`${sep}${id}.json`) && JSON.parse(readFileSync(f, "utf8")).kind === "evidence-source");
  if (!file) fail(1, `no evidence-source with id '${id}'`);
  const bytes = readFileSync(file, "utf8");
  const source = JSON.parse(bytes);
  const rel = posix(relative(root, file));
  const owner = ownerOf(rel, source, baselineOwners(root));
  if (o.outcome !== undefined && !OUTCOMES.includes(o.outcome)) fail(2, `--outcome must be one of ${OUTCOMES.join(", ")}`);

  let plan;
  try {
    plan = planObservation(source, bytes, { outcome: o.outcome, observer: o.observer, observedAt: o["observed-at"], digest: o.digest, note: o.note, today: todayUtc });
  } catch (e) {
    if (e instanceof ObserveError) fail(1, e.message);
    throw e;
}
  const problems = createValidator().validateRecord(plan.record);
  if (problems.length) fail(1, `the result is not a valid evidence-source:\n${problems.join("\n")}`);

  if (o["dry-run"]) process.stdout.write(plan.text);
  else {
    writeFileSync(file, plan.text);
    console.log(`appended ${plan.entry.outcome} (${plan.entry.observedAt}) to ${rel}`);
    if (owner !== "authored" && !loadAmendments(root).amendments.some((a) => a.path === rel)) {
      try {
        const a = declareAmendment({ root, path: rel, reason: `source:observe appended a ${plan.entry.outcome} observation of ${plan.entry.observedAt} (the freshness record of an imported source)` });
        console.log(`declared baseline amendment (${a.change}) for ${rel}; imported by ${owner}`);
      } catch (e) {
        fail(1, `appended, but the baseline amendment could not be declared: ${e.message}`);
      }
    }
}
}
