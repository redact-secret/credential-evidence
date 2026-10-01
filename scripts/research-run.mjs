#!/usr/bin/env node
// npm run research:run -- [--dry-run] [--kind <gap-kind,...>] [flags]
//
// The deterministic shell around one unattended research run: pick ONE item from the coverage backlog,
// skip work that is already open, compute the budget and the fetch allowlist, run the configured agent
// (the skills do the research), gate the result, and open one PR (draft when it cannot land yet) or file
// a needs-human issue. It never merges. Contract and schedule examples: docs/ops/research-cron.md.
//
//   --dry-run                 select, dedupe, budget, allowlist; print the plan; no branch, PR, issue or push
//   --kind a,b                only these gap kinds          --skill <name>   only this suggested skill
//   --provider <id>           only this provider            --include-blocked  allow items with research.blockers
//   --base <branch>           integration branch (default: develop when origin has it, else main)
//   --date YYYY-MM-DD         run date (default: today, UTC); also the staleness reference
//   --max-minutes N --max-pages N --max-fetches N --max-tokens N   budget (capped at headless ceilings)
//   --epic N                  issue the PR says "Part of" (default 21)
//   --agent-cmd "<cmd>"       agent command (default $RESEARCH_AGENT_CMD); the prompt arrives on stdin
//   --run-dir <dir>           artifacts (default .research-runs, gitignored)
//   --json                    print the summary as JSON instead of markdown
//   --offline                 dry-run only: skip the gh/git dedupe lookups (the plan says so)
//   --open-work-file <json>   dedupe input from a file instead of gh (tests, diagnosis)
//   --ensure-labels           create or update the labels the harness uses, then exit
//   --consume-verdict <pr> --trusted-login <login>   apply a review-research-pr verdict to a PR
//   --root <dir>              another repository root (tests)
//
// Exit codes: 0 done (PR opened, nothing to do, planned), 1 failed (issue filed where possible),
// 2 usage error, 3 stopped for a human (needs-human issue or draft PR); the same 0/1/3 as review:check.

import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { DEFAULT_EPIC, DEFAULT_RUN_DIR, computeBudget, consumeVerdict, ensureLabels, realExec, renderSummaryMarkdown, runResearch, serializeSummary, todayUtc } from "./lib/research-run.mjs";
import { listJson, repoRoot } from "./lib/validator.mjs";

const USAGE =
  "usage: npm run research:run -- [--dry-run] [--kind gap-kind[,..]] [--skill s] [--provider id] [--include-blocked] [--base b] [--date YYYY-MM-DD]\n" +
  "       [--max-minutes N] [--max-pages N] [--max-fetches N] [--max-tokens N] [--epic N] [--agent-cmd cmd] [--run-dir d] [--json] [--offline] [--open-work-file f]\n" +
  "       npm run research:run -- --ensure-labels | --consume-verdict <pr> --trusted-login <login>";

const fail = (msg) => {
  console.error(`${msg}\n${USAGE}`);
  process.exit(2);
};

let v;
try {
  v = parseArgs({
    options: {
      "dry-run": { type: "boolean" },
      kind: { type: "string" },
      skill: { type: "string" },
      provider: { type: "string" },
      "include-blocked": { type: "boolean" },
      base: { type: "string" },
      date: { type: "string" },
      "max-minutes": { type: "string" },
      "max-pages": { type: "string" },
      "max-fetches": { type: "string" },
      "max-tokens": { type: "string" },
      epic: { type: "string" },
      "agent-cmd": { type: "string" },
      "run-dir": { type: "string" },
      json: { type: "boolean" },
      offline: { type: "boolean" },
      "open-work-file": { type: "string" },
      "ensure-labels": { type: "boolean" },
      "consume-verdict": { type: "string" },
      "trusted-login": { type: "string" },
      root: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: false,
  }).values;
} catch (e) {
  fail(e.message);
}
if (v.help) {
  console.log(USAGE);
  process.exit(0);
}
if (v.offline && !v["dry-run"]) fail("--offline is only for --dry-run: a real run must check for open work");

const root = v.root ? resolve(v.root) : repoRoot;
const env = process.env;
const deps = { exec: realExec, git: env.GIT ?? "git", now: () => Date.now(), listJson };
const num = (name) => (v[name] === undefined ? undefined : Number(v[name]));

if (v["ensure-labels"]) {
  const res = ensureLabels(deps, { cwd: root, env });
  for (const r of res) console.log(`${r.ok ? "ok  " : "FAIL"} label ${r.name}`);
  process.exit(res.every((r) => r.ok) ? 0 : 1);
}

if (v["consume-verdict"] !== undefined) {
  if (!/^\d+$/.test(v["consume-verdict"]) || !v["trusted-login"]) fail("--consume-verdict needs a PR number and --trusted-login");
  const r = consumeVerdict(deps, { pr: v["consume-verdict"], trustedLogin: v["trusted-login"], cwd: root, env, dryRun: Boolean(v["dry-run"]) });
  console.log(JSON.stringify(r, null, 2));
  console.log(r.verdict ? `VERDICT: ${r.verdict}` : "VERDICT: none");
  process.exit(r.exitCode);
}

const date = v.date ?? todayUtc();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail("--date must be YYYY-MM-DD");
const epic = v.epic === undefined ? DEFAULT_EPIC : Number(v.epic);
if (!Number.isInteger(epic) || epic < 1) fail("--epic must be a positive integer");

const budgetOverrides = { maxMinutes: num("max-minutes"), maxPages: num("max-pages"), maxFetches: num("max-fetches"), maxTokens: num("max-tokens") };
try {
  computeBudget("research-family", budgetOverrides);
} catch (e) {
  fail(e.message);
}

let base = v.base;
if (!base) {
  if (v.offline) base = "develop";
  else {
    const r = deps.exec(deps.git, ["ls-remote", "--exit-code", "--heads", "origin", "develop"], { cwd: root, env });
    base = r.status === 0 ? "develop" : "main";
  }
}

const summary = runResearch(
  {
    root,
    env,
    dryRun: Boolean(v["dry-run"]),
    date,
    base,
    epic,
    kinds: v.kind ? v.kind.split(",").map((s) => s.trim()).filter(Boolean) : null,
    skill: v.skill ?? null,
    provider: v.provider ?? null,
    includeBlocked: Boolean(v["include-blocked"]),
    budgetOverrides,
    runDirRoot: resolve(root, v["run-dir"] ?? DEFAULT_RUN_DIR),
    agentCmd: v["agent-cmd"] ?? env.RESEARCH_AGENT_CMD ?? "",
    offline: Boolean(v.offline),
    openWorkFile: v["open-work-file"] ? resolve(v["open-work-file"]) : null,
  },
  deps,
);

console.log(v.json ? serializeSummary(summary).trimEnd() : renderSummaryMarkdown(summary).trimEnd());
process.exit(summary.exitCode);
