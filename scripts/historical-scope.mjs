#!/usr/bin/env node
// npm run historical:scope -- --base <rev> --head <rev> [--always]
//
// Prints `run=true` or `run=false` (and `reason=...`), the form GitHub Actions appends to $GITHUB_OUTPUT. The
// workflow decides whether the historical pinned checks run (scripts/lib/historical-scope.mjs, ADR 0015).
// Never fails open on a bad diff: an unresolvable base prints run=true.

import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { historicalScope } from "./lib/historical-scope.mjs";

const { values } = parseArgs({ options: { base: { type: "string" }, head: { type: "string" }, always: { type: "boolean" } } });

let paths = null;
if (!values.always) {
  const zero = /^0+$/;
  if (values.base && values.head && !zero.test(values.base)) {
    try {
      paths = execFileSync("git", ["diff", "--name-only", `${values.base}...${values.head}`], { encoding: "utf8" }).split("\n").filter(Boolean);
    } catch {
      paths = null;
    }
  }
}
const { run, reason } = historicalScope({ paths, always: values.always });
console.log(`run=${run}`);
console.log(`reason=${reason}`);
