import assert from "node:assert/strict";
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
