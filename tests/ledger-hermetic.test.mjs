// Regression test for #86: the ordinary suite must not assume an empty amendments ledger.
//
// ADR 0015 lets a reviewed change edit a migrated record and declare it as a file in docs/migration/baseline-amendments/. The tests
// that copy the repository (tests/baseline.test.mjs, tests/canonical-change.test.mjs) used to assume the ledger was empty and
// the baseline records pristine, so the first research pull request that declared an amendment turned `verify` red for
// reasons that had nothing to do with the change (pilot PRs #83, #84, #85).
//
// The repository's own ledger is empty on main, so this test makes it non-empty: it builds a copy of the repository including
// tests/, performs three real amendments the way the tools do (an authored edit with `baseline:amend`, `source:observe`,
// `record:new -- review --append`), checks that the copy is a valid baseline plus three declared amendments, and runs those
// two test files inside it. They must pass, and without the pinned legacy repository: the variable that locates it points at a
// directory that does not exist and every other such variable is dropped, so anything that needed it would fail here.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { loadAmendments } from "../scripts/lib/baseline.mjs";
import { repoRoot } from "../scripts/lib/validator.mjs";
import { copyRepo, liveCounts, untouchedRecord, untouchedRecords } from "./repo-copy.mjs";

const DATE = "2026-10-03";
const SUPPORTED_SUBJECTS = ["family", "case", "scenario", "variant", "benign-sibling", "format-contract"];

test("baseline.test.mjs and canonical-change.test.mjs pass over a tree that declares baseline amendments, with no legacy checkout", { timeout: 600_000 }, () => {
  const c = copyRepo();
  try {
    cpSync(join(repoRoot, "tests"), join(c.root, "tests"), { recursive: true });
    const read = (rel) => JSON.parse(readFileSync(join(c.root, rel), "utf8"));
    const ok = (r, what) => assert.equal(r.status, 0, `${what}: ${r.stderr}${r.stdout}`);

    // 1. an authored edit to a migrated record, declared with baseline:amend
    const family = untouchedRecord("records/families/");
    const rec = read(family);
    rec.description = `${rec.description} Re-read against the vendor documentation.`;
    writeFileSync(join(c.root, family), `${JSON.stringify(rec, null, 2)}\n`);
    ok(c.run("baseline.mjs", ["amend", family, "--reason", "Description restated after re-reading the vendor documentation", "--ref", "#86"]), "baseline:amend");

    // 2. an appended source observation: the freshness tool declares its own amendment
    const source = read(untouchedRecord("records/sources/"));
    const observed = c.run("source-observe.mjs", [source.id, "--outcome", "unchanged", "--observer", "test-agent", "--observed-at", DATE]);
    ok(observed, "source:observe");
    assert.match(observed.stdout, /declared baseline amendment/);

    // 3. an appended review event: record:new declares its own amendment
    const history = untouchedRecords("records/reviews/").map(read).find((r) => r.kind === "evidence-review-history" && SUPPORTED_SUBJECTS.includes(r.subject.kind));
    const appended = c.run("record-new.mjs", ["review", `${history.subject.kind}:${history.subject.id}`, "--append", "--event", "observed", "--verdict", "inconclusive", "--actor", "test-agent", "--role", "automation", "--note", "Re-read the documentation; nothing changed.", "--date", DATE]);
    ok(appended, "record:new review --append");

    // the copy is now a valid baseline plus three more declared amendments than the live ledger holds: baseline:check is green
    // and the ledger is not empty (the live ledger is empty on main, but a pull request under review may already declare some)
    const check = c.run("baseline.mjs", ["check"]);
    ok(check, "baseline:check");
    assert.match(check.stdout, new RegExp(`${liveCounts().edited + 3} edited, ${liveCounts().removed} removed \\(all declared\\)`));
    assert.equal(loadAmendments(c.root).amendments.length, loadAmendments().amendments.length + 3);

    // no legacy variable of the outer environment survives, and the one that locates the checkout points nowhere
    const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.includes("LEGACY")));
    env.LEGACY_BENCHMARKS_DIR = join(c.root, "no-legacy-checkout-here");
    delete env.NODE_TEST_CONTEXT; // a `node --test` child of a test run would otherwise run silently as a subtest of this one
    const nested = spawnSync(process.execPath, ["--test", "tests/baseline.test.mjs", "tests/canonical-change.test.mjs"], { cwd: c.root, encoding: "utf8", env, maxBuffer: 1 << 28 });
    const failures = `${nested.stdout}${nested.stderr}`.split("\n").filter((l) => /^\s*not ok /.test(l));
    assert.equal(nested.status, 0, `the ordinary tests failed with a non-empty ledger:\n${failures.join("\n")}\n${nested.stderr.slice(0, 2000)}`);
    assert.match(nested.stdout, /# pass \d+/);
    assert.match(nested.stdout, /# fail 0/);
  } finally {
    c.cleanup();
  }
});
