#!/usr/bin/env node
// The import baseline against the working tree (ADR 0015). Needs no legacy checkout and no network.
//
//   npm run baseline:check [-- --list]
//       classify the tree against docs/migration/baseline-manifest.json: unchanged, edited, removed,
//       added. Exit 1 on an undeclared edit or removal, on an edit of an immutable reference (legacy
//       map, importer reports), on a stale or malformed amendment, or on an addition under migration/.
//       Part of `npm run check`: it is the ordinary-gate half of the migration traceability.
//
//   npm run baseline:amend -- <records/path>... --reason "<why>" [--ref "<issue or pull request>"]
//       declare that a reviewed change edited or removed a baseline record. Adding a record needs none.
//
// Whether the baseline itself is reproducible at the pinned legacy revision is the historical check:
// npm run historical:check (migrate:*:check, export:legacy:check, parity:check).

import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { AMENDMENTS_PATH, classifyTree, declareAmendment, summarize } from "./lib/baseline.mjs";
import { repoRoot } from "./lib/validator.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { list: { type: "boolean" }, reason: { type: "string" }, ref: { type: "string" }, root: { type: "string" } },
});
const root = values.root ? resolve(values.root) : repoRoot;
const [command, ...rest] = positionals;

if (command === "check") {
  const c = classifyTree(root);
  if (values.list) {
    for (const [label, paths] of [["edited", c.edited], ["removed", c.removed], ["added", c.added]]) for (const p of paths) console.log(`${label}: ${p}`);
  }
  if (c.problems.length) {
    for (const p of c.problems.slice(0, 40)) console.error(p);
    if (c.problems.length > 40) console.error(`... and ${c.problems.length - 40} more`);
    console.error(`\nFAIL: ${c.problems.length} baseline problem(s). A reviewed edit to a migrated record is allowed once it is declared in ${AMENDMENTS_PATH}.`);
    process.exit(1);
  }
  console.log(`OK: ${summarize(c)}`);
} else if (command === "amend") {
  if (!rest.length) {
    console.error('usage: npm run baseline:amend -- <records/path>... --reason "<why>" [--ref "<issue>"]');
    process.exit(2);
  }
  try {
    for (const p of rest) {
      const a = declareAmendment({ root, path: p, reason: values.reason, ref: values.ref });
      console.log(`declared ${a.change}: ${a.path}`);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
} else {
  console.error("usage: node scripts/baseline.mjs check [--list] | amend <path>... --reason <why> [--ref <ref>]");
  process.exit(2);
}
