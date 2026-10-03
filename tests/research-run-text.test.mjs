import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { branchFor, buildIssueBody, buildPrBody, tagFor } from "../scripts/lib/research-run.mjs";
import { reviewRange } from "../scripts/lib/review-check.mjs";
import { repoRoot } from "../scripts/lib/validator.mjs";

test("the PR and issue text the runner writes passes the review gate's own text rules", () => {
  const item = { id: "contract-missing:acme:api-key", scope: { kind: "family", id: "acme:api-key", provider: "acme" }, gapKind: "contract-missing", suggestedSkill: "research-family", suggestedInput: "acme:api-key", priority: "P1", score: 75, dedupe: { prTitleTag: "[coverage:contract-missing:acme:api-key]" } };
  const plan = { prTag: tagFor(item), branch: branchFor(item) };
  const body = [
    buildPrBody({ item, plan, notes: "## Research notes\nnone", gates: [{ name: "npm run check", status: "pass" }], review: { verdict: "pass" }, blocked: [{ name: "npm run migrate:check", status: "fail" }], needsHuman: [{ decision: "d", blocksLanding: true }], epic: 21 }),
    buildIssueBody({ item, plan, reason: "r", details: ["d"], runId: "x" }),
  ].join("\n");
  // An empty range: only the body rules run.
  const r = reviewRange({ root: repoRoot, base: "HEAD", head: "HEAD", body });
  assert.notEqual(r.verdict, "fail", JSON.stringify(r.findings));
  assert.deepEqual(r.findings.filter((f) => f.severity !== "info"), []);
});

// #86: the instructions must match the flow that exists. No `develop` branch is on origin; a harness agent never publishes, a
// session that was asked to deliver its own pull request does; and an imported record or fixture set is not "generated, do not edit".
test("the instruction text names the real integration branch, the three roles and no stale ownership rule", () => {
  const read = (p) => readFileSync(join(repoRoot, p), "utf8");
  const agents = read("AGENTS.md");
  assert.match(agents, /^## Branches$/m);
  assert.match(agents, /`main` is the default and, today, the only long-lived branch/);
  const skill = read(".agents/skills/research-cron-run/SKILL.md");
  assert.match(skill, /^## Role 2: the headless agent inside a harness run/m);
  assert.match(skill, /^## Role 3: a session asked to deliver the pull request itself/m);
  assert.match(skill, /Never merge, approve, mark ready or force-push/);
  const shared = read(".agents/skills/_shared/research-run.md");
  assert.match(shared, /`records\/fixtures\/` is canonical, not generated output/);
  assert.match(shared, /npm ci --ignore-scripts/);
  for (const text of [agents, skill, shared, read("docs/ops/research-cron.md")]) assert.doesNotMatch(text, /(?:pull requests?|PRs?) (?:go|are opened|against) (?:to |against )?`?develop`?/i);
});
