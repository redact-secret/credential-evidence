#!/usr/bin/env node
// npm run coverage:gaps [-- flags]   per provider/family gaps -> a prioritized research backlog
//
//   (no flags)          write docs/research/backlog.json and docs/research/coverage.md
//   --check             exit 1 when either committed file differs from what the records produce
//   --next <N>          print the N highest-priority items as JSON; writes nothing
//     --skip <a,b,..>   item ids, branch hints or PR title tags to leave out (open work)
//     --gap-kind <k>  --provider <id>  --skill <name>  --min-priority P0|P1|P2|P3
//   --as-of <YYYY-MM-DD|today>   reference date for staleness (not with --check)
//   --root <dir>        another repository root (tests)
//
// Deterministic and offline: the default reference date is the newest date recorded in records/,
// so the committed files change only when the records or the wishlist do. Cron runs that want
// staleness measured against the real clock pass `--next --as-of today`. Rules: docs/research/README.md.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { BANDS, buildBacklog, renderMarkdown, selectNext, serialize, validateWishlist } from "./lib/coverage.mjs";
import { listJson, repoRoot } from "./lib/validator.mjs";

const USAGE = "usage: npm run coverage:gaps [-- [--check] [--next N] [--skip ids] [--gap-kind k] [--provider id] [--skill s] [--min-priority P1] [--as-of date|today] [--root dir]]";

let args;
try {
  args = parseArgs({
    options: {
      check: { type: "boolean" },
      next: { type: "string" },
      skip: { type: "string" },
      "gap-kind": { type: "string" },
      provider: { type: "string" },
      skill: { type: "string" },
      "min-priority": { type: "string" },
      "as-of": { type: "string" },
      root: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: false,
  });
} catch (e) {
  console.error(`${e.message}\n${USAGE}`);
  process.exit(2);
}
const o = args.values;
if (o.help) {
  console.log(USAGE);
  process.exit(0);
}
if (o.check && (o["as-of"] || o.next !== undefined)) {
  console.error(`--check compares the committed files and cannot be combined with --as-of or --next\n${USAGE}`);
  process.exit(2);
}
if (o["min-priority"] && !BANDS.some(([b]) => b === o["min-priority"])) {
  console.error(`--min-priority must be one of ${BANDS.map(([b]) => b).join(", ")}`);
  process.exit(2);
}
let asOf;
if (o["as-of"]) {
  asOf = o["as-of"] === "today" ? new Date().toISOString().slice(0, 10) : o["as-of"];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    console.error("--as-of must be YYYY-MM-DD or today");
    process.exit(2);
  }
}
let limit = 1;
if (o.next !== undefined) {
  limit = Number(o.next);
  if (!Number.isInteger(limit) || limit < 1) {
    console.error("--next takes a positive integer");
    process.exit(2);
  }
}

const root = o.root ? resolve(o.root) : repoRoot;
const outDir = join(root, "docs", "research");
const wishlistPath = join(outDir, "provider-wishlist.json");

let wishlist = null;
if (existsSync(wishlistPath)) {
  try {
    wishlist = JSON.parse(readFileSync(wishlistPath, "utf8"));
  } catch (e) {
    console.error(`docs/research/provider-wishlist.json: not valid JSON (${e.message})`);
    process.exit(1);
  }
  const problems = validateWishlist(wishlist);
  if (problems.length) {
    for (const p of problems) console.error(`docs/research/provider-wishlist.json: ${p}`);
    console.error(`\nFAIL: ${problems.length} wishlist problem(s)`);
    process.exit(1);
  }
}

const records = listJson(join(root, "records")).map((f) => JSON.parse(readFileSync(f, "utf8")));
let backlog;
try {
  backlog = buildBacklog(records, { wishlist, asOf });
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

if (o.next !== undefined) {
  const skip = (o.skip ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const items = selectNext(backlog, { limit, skip, gapKind: o["gap-kind"], provider: o.provider, skill: o.skill, minPriority: o["min-priority"] });
  process.stdout.write(serialize({ asOf: backlog.asOf, count: items.length, items }));
} else {
  writeOrCheck();
}

function writeOrCheck() {
  const files = [
    ["docs/research/backlog.json", serialize(backlog)],
    ["docs/research/coverage.md", renderMarkdown(backlog)],
  ];

  if (o.check) {
    const stale = files.filter(([rel, text]) => !existsSync(join(root, rel)) || readFileSync(join(root, rel), "utf8") !== text).map(([rel]) => rel);
    if (stale.length) {
      for (const rel of stale) console.error(`${rel}: out of date; run \`npm run coverage:gaps\` and commit the result`);
      process.exit(1);
    }
    console.log(`OK: coverage report current (${backlog.totals.items} items, as of ${backlog.asOf})`);
    return;
  }

  mkdirSync(outDir, { recursive: true });
  for (const [rel, text] of files) writeFileSync(join(root, rel), text);
  const t = backlog.totals;
  console.log(`wrote docs/research/backlog.json and coverage.md: ${t.items} items as of ${backlog.asOf} (${BANDS.map(([b]) => `${b} ${t.byPriority[b] ?? 0}`).join(", ")})`);
}
