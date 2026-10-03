// Regression test for #88: parallel research branches that each declare a baseline amendment merge without conflict.
//
// Before, every amendment was one entry in the single docs/migration/baseline-amendments.json, so two branches that each
// declared one (and appended a source observation, which declares its own) conflicted on that file when the second landed.
// Now every declaration is its own file (ADR 0015, addendum 1). This test builds a throwaway repository from a copy of this
// one, makes two branches from the same base, each of which
//   - edits a different migrated record and declares it with `baseline:amend`, and
//   - appends an observation to a different imported source with `source:observe` (which declares its own amendment),
// then merges them one after the other and requires zero conflicts, a green `baseline:check` on the result, and every
// declaration present. A third pair of branches makes the same declaration (identical bytes) and merges cleanly as well.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { AMENDMENTS_DIR, loadAmendments } from "../scripts/lib/baseline.mjs";
import { copyRepo, untouchedRecords } from "./repo-copy.mjs";

const DATE = "2026-10-03";

test("two parallel branches that each declare an amendment and observe a source merge into each other's base with zero conflicts", { timeout: 120_000 }, () => {
  const c = copyRepo();
  const read = (rel) => JSON.parse(readFileSync(join(c.root, rel), "utf8"));
  const git = (...args) => {
    const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", "-c", "commit.gpgsign=false", ...args], { cwd: c.root, encoding: "utf8" });
    return { status: r.status, out: `${r.stdout}${r.stderr}`.trim() };
  };
  const ok = (...args) => {
    const r = git(...args);
    assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.out}`);
    return r.out;
  };
  const okRun = (script, args, what) => {
    const r = c.run(script, args);
    assert.equal(r.status, 0, `${what}: ${r.stderr}${r.stdout}`);
    return r;
  };
  /** One research change: edit a migrated record (declared), observe an imported source (declares itself). */
  const research = (family, source, note) => {
    const rec = read(family);
    rec.description = `${rec.description} ${note}`;
    writeFileSync(join(c.root, family), `${JSON.stringify(rec, null, 2)}\n`);
    okRun("baseline.mjs", ["amend", family, "--reason", `Description restated after re-reading the vendor documentation (${note})`, "--ref", "#88"], "baseline:amend");
    const observed = okRun("source-observe.mjs", [read(source).id, "--outcome", "unchanged", "--observer", "test-agent", "--observed-at", DATE], "source:observe");
    assert.match(observed.stdout, /declared baseline amendment/);
    ok("add", "-A");
    ok("commit", "-q", "-m", `research: ${note}`);
  };
  const files = () => readdirSync(join(c.root, AMENDMENTS_DIR)).sort();

  try {
    const [familyA, familyB] = untouchedRecords("records/families/");
    const [sourceA, sourceB] = untouchedRecords("records/sources/");
    assert.ok(familyA && familyB && sourceA && sourceB, "the live tree holds two unamended families and two unamended sources");

    ok("init", "-q", "-b", "main");
    writeFileSync(join(c.root, ".gitignore"), "node_modules\n");
    ok("add", "-A");
    ok("commit", "-q", "-m", "base");
    const before = files().length;

    // two research branches from the same base
    ok("checkout", "-q", "-b", "research/a", "main");
    research(familyA, sourceA, "branch a");
    ok("checkout", "-q", "-b", "research/b", "main");
    research(familyB, sourceB, "branch b");

    // merge them into each other's base, sequentially
    ok("checkout", "-q", "main");
    ok("merge", "--no-edit", "research/a");
    const second = git("merge", "--no-edit", "research/b");
    assert.equal(second.status, 0, `merging the second branch conflicted:\n${second.out}`);
    assert.doesNotMatch(second.out, /CONFLICT/);
    assert.equal(git("diff", "--name-only", "--diff-filter=U").out, "", "no unmerged paths");

    // 2 branches x (1 baseline:amend + 1 source:observe) = 4 new declaration files, all present, and the tree is valid
    assert.equal(files().length, before + 4);
    assert.equal(loadAmendments(c.root).amendments.length, before + 4);
    const check = c.run("baseline.mjs", ["check"]);
    assert.equal(check.status, 0, check.stderr);

    // a declaration made identically on two branches is the same file with the same bytes: that merges cleanly too
    const [familyC] = untouchedRecords("records/families/").slice(2);
    ok("checkout", "-q", "-b", "research/c", "main");
    ok("checkout", "-q", "-b", "research/d", "main");
    for (const branch of ["research/c", "research/d"]) {
      ok("checkout", "-q", branch);
      const rec = read(familyC);
      rec.description = `${rec.description} Same edit, same cause.`;
      writeFileSync(join(c.root, familyC), `${JSON.stringify(rec, null, 2)}\n`);
      okRun("baseline.mjs", ["amend", familyC, "--reason", "Description restated after re-reading the vendor documentation (same cause)"], "baseline:amend");
      ok("add", "-A");
      ok("commit", "-q", "-m", `research: same edit on ${branch}`);
    }
    ok("checkout", "-q", "main");
    ok("merge", "--no-edit", "research/c");
    const dup = git("merge", "--no-edit", "research/d");
    assert.equal(dup.status, 0, `an identical declaration conflicted:\n${dup.out}`);
    assert.equal(files().length, before + 5);
    assert.equal(c.run("baseline.mjs", ["check"]).status, 0);

    // a record amended again later extends the ledger deterministically: the observation tool does not re-declare
    ok("checkout", "-q", "-b", "research/e", "main");
    const again = okRun("source-observe.mjs", [read(sourceA).id, "--outcome", "read", "--observer", "test-agent", "--observed-at", DATE], "source:observe");
    assert.doesNotMatch(again.stdout, /declared baseline amendment/, "an already declared record is not declared again");
    assert.equal(files().length, before + 5);
  } finally {
    c.cleanup();
  }
});
