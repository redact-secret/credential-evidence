#!/usr/bin/env node
// npm run tidy:scan [-- flags]   read-only hygiene findings over records/ (the tidy-records detector)
//
//   --kind <k>[,<k>]   only these finding kinds
//   --owner <o>        only records written by `authored` or by one migrate:* script
//   --json             machine-readable output
//   --root <dir>       another repository root (tests)
//   [paths...]         limit to these record files or directories
//
// Never writes and never fetches. Exit 0 when clean, 1 when there are findings, 2 on usage errors.
// What each kind means and how to fix it: .agents/skills/tidy-records/SKILL.md.

import { readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import { GENERATOR_INPUT } from "./lib/ownership.mjs";
import { digest, FINDING_KINDS, scanRecords } from "./lib/tidy-scan.mjs";
import { listJson, repoRoot } from "./lib/validator.mjs";

let args;
try {
  args = parseArgs({ options: { kind: { type: "string" }, owner: { type: "string" }, json: { type: "boolean" }, root: { type: "string" }, help: { type: "boolean", short: "h" } }, allowPositionals: true });
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
const o = args.values;
if (o.help) {
  console.log(`usage: npm run tidy:scan [-- [--kind k,k] [--owner authored|migrate:taxonomy|migrate:cases|migrate:narratives] [--json] [paths...]]\nkinds:\n${Object.entries(FINDING_KINDS).map(([k, v]) => `  ${k}: ${v}`).join("\n")}`);
  process.exit(0);
}
const kinds = o.kind ? o.kind.split(",").map((k) => k.trim()).filter(Boolean) : null;
for (const k of kinds ?? []) {
  if (!(k in FINDING_KINDS)) {
    console.error(`unknown finding kind '${k}' (${Object.keys(FINDING_KINDS).join(", ")})`);
    process.exit(2);
  }
}

const root = o.root ? resolve(o.root) : repoRoot;
const posix = (p) => p.split(sep).join("/");
const entries = listJson(join(root, "records")).map((file) => {
  const text = readFileSync(file, "utf8");
  return { path: posix(relative(root, file)), text, record: JSON.parse(text) };
});

// Scope the report, not the scan: cross-record rules need the whole universe.
const scope = args.positionals.map((p) => posix(relative(root, resolve(p))).replace(/\/$/, ""));
const inScope = (path) => !scope.length || scope.some((s) => path === s || path.startsWith(`${s}/`));
const findings = scanRecords(entries, { kinds, owner: o.owner }).filter((f) => inScope(f.path));

if (o.json) process.stdout.write(`${JSON.stringify({ count: findings.length, digest: digest(findings), findings }, null, 2)}\n`);
else if (!findings.length) console.log(`OK: ${entries.length} record(s) scanned, 0 findings`);
else {
  for (const f of findings) console.log(`${f.path}: ${f.kind}: ${f.detail} [${f.owner}]`);
  const by = {};
  const owners = {};
  for (const f of findings) {
    by[f.kind] = (by[f.kind] ?? 0) + 1;
    owners[f.owner] = (owners[f.owner] ?? 0) + 1;
  }
  const fmt = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(", ");
  console.error(`\n${findings.length} finding(s) in ${entries.length} record(s): ${fmt(by)}\nby owner: ${fmt(owners)}`);
  for (const owner of Object.keys(owners).sort()) if (owner !== "authored") console.error(`${owner}: do not edit the JSON; change ${GENERATOR_INPUT[owner]}`);
}
process.exitCode = findings.length ? 1 : 0; // not process.exit: piped stdout must drain first
