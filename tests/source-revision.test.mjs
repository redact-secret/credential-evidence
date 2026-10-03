import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { checkSourceRevisions, collectSourceRevisions, mergeBaseWithMain, resolveSourceRevision } from "../scripts/lib/source-revision.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const LINT = join(here, "..", "scripts", "lint-source-revision.mjs");
const GIT_ID = ["-c", "user.name=t", "-c", "user.email=t@example.invalid", "-c", "commit.gpgsign=false"];

function git(cwd, ...args) {
  const r = spawnSync("git", [...GIT_ID, ...args], { cwd, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout.trim();
}

/** A throwaway repo: `main` with one commit, then (optionally) a branch with its own commit. `origin/main` is a local alias. */
function build() {
  const root = mkdtempSync(join(tmpdir(), "source-revision-"));
  git(root, "init", "-q", "-b", "main");
  mkdirSync(join(root, "records"), { recursive: true });
  const record = (sha) => writeFileSync(join(root, "records", "set.json"), `${JSON.stringify({ origin: { type: "generation-rule", generator: { name: "g", version: "1", entrypoint: "g.mjs", sourceRevision: sha } } })}\n`);
  writeFileSync(join(root, "README"), "x\n");
  record("0".repeat(40));
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "main one");
  const mainSha = git(root, "rev-parse", "HEAD");
  git(root, "update-ref", "refs/remotes/origin/main", mainSha); // a clone's origin/main
  git(root, "checkout", "-q", "-b", "feature");
  writeFileSync(join(root, "README"), "y\n");
  git(root, "commit", "-q", "-am", "branch one");
  const branchSha = git(root, "rev-parse", "HEAD");
  return { root, mainSha, branchSha, record, done: () => rmSync(root, { recursive: true, force: true }) };
}

const lint = (root, ...args) => spawnSync(process.execPath, [LINT, ...args, root], { encoding: "utf8", env: { ...process.env, PR_HEAD_SHA: "" } });

test("the default is the merge-base with origin/main, never the branch HEAD", () => {
  const r = build();
  try {
    assert.notEqual(r.branchSha, r.mainSha);
    assert.equal(mergeBaseWithMain(r.root), r.mainSha);
    assert.deepEqual(resolveSourceRevision({ argv: [], cwd: r.root }), { value: r.mainSha, via: "merge-base with main" });
  } finally {
    r.done();
  }
});

test("--source-revision overrides; a malformed override is refused; --check reads the recorded value back", () => {
  const r = build();
  try {
    const sha = "a".repeat(40);
    assert.equal(resolveSourceRevision({ argv: ["--source-revision", sha], cwd: r.root }).value, sha);
    assert.match(resolveSourceRevision({ argv: ["--source-revision", "HEAD"], cwd: r.root }).error, /40 lowercase hex/);
    assert.match(resolveSourceRevision({ argv: ["--source-revision", "A".repeat(40)], cwd: r.root }).error, /40 lowercase hex/);
    assert.equal(resolveSourceRevision({ argv: ["--check"], check: true, existing: sha, cwd: r.root }).value, sha);
    assert.equal(resolveSourceRevision({ argv: [], existing: sha, cwd: r.root }).value, r.mainSha, "writing never keeps an old value");
  } finally {
    r.done();
  }
});

test("no main ref: the generator asks for --source-revision instead of writing a placeholder", () => {
  const root = mkdtempSync(join(tmpdir(), "source-revision-nomain-"));
  try {
    git(root, "init", "-q", "-b", "work");
    writeFileSync(join(root, "a"), "a\n");
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "a");
    assert.match(resolveSourceRevision({ argv: [], cwd: root }).error, /--source-revision <40-hex main commit>/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("lint: a main-reachable commit passes; a branch commit, the placeholder and malformed values fail", () => {
  const r = build();
  try {
    r.record(r.mainSha);
    let out = lint(r.root);
    assert.equal(out.status, 0, out.stdout + out.stderr);
    assert.match(out.stdout, /1 generator sourceRevision value/);

    r.record(r.branchSha);
    out = lint(r.root);
    assert.equal(out.status, 1);
    assert.match(out.stderr, /not reachable from origin\/main/);
    assert.equal(lint(r.root, "--no-reachability").status, 0, "the history check can be skipped; the shape check still passes");

    r.record("0".repeat(40));
    assert.match(lint(r.root, "--no-reachability").stderr, /all-zero placeholder/);

    r.record("abc123");
    assert.match(lint(r.root, "--no-reachability").stderr, /not 40 lowercase hex/);

    r.record(r.mainSha.toUpperCase());
    assert.match(lint(r.root, "--no-reachability").stderr, /not 40 lowercase hex/);
  } finally {
    r.done();
  }
});

test("lint: the pull request tip is refused even without history (shallow CI), and the legacy pin is exempt", () => {
  const r = build();
  try {
    const shape = (entries, extra = {}) => checkSourceRevisions({ root: r.root, entries, reachability: "off", ...extra });
    const entry = (value) => [{ file: "records/set.json", path: "origin.generator.sourceRevision", value }];
    assert.deepEqual(shape(entry(r.mainSha), { prHead: r.branchSha }).errors, []);
    assert.match(shape(entry(r.branchSha), { prHead: r.branchSha }).errors[0], /pull request's own tip/);
    assert.deepEqual(shape(entry("1020d2b5905e8973098235e57c4cdca3359bba57")).errors, []);
    // reachability "require" with no way to check is a failure, not a silent pass
    const noRef = mkdtempSync(join(tmpdir(), "source-revision-noref-"));
    try {
      assert.match(checkSourceRevisions({ root: noRef, entries: entry(r.mainSha), reachability: "require" }).errors[0], /cannot check reachability/);
      assert.deepEqual(checkSourceRevisions({ root: noRef, entries: entry(r.mainSha) }).errors, [], "auto mode only notes it");
    } finally {
      rmSync(noRef, { recursive: true, force: true });
    }
  } finally {
    r.done();
  }
});

test("collect finds sourceRevision on generated sets and plans; the repository's own records are clean", () => {
  const r = build();
  try {
    writeFileSync(join(r.root, "records", "plan.json"), `${JSON.stringify({ generation: { generator: { name: "g", sourceRevision: r.mainSha } } })}\n`);
    assert.deepEqual(collectSourceRevisions(r.root).map((e) => e.path).sort(), ["generation.generator.sourceRevision", "origin.generator.sourceRevision"]);
  } finally {
    r.done();
  }
  const real = spawnSync(process.execPath, [LINT, "--no-reachability"], { encoding: "utf8" });
  assert.equal(real.status, 0, real.stdout + real.stderr);
});

test("both generators use the shared default and no longer take HEAD or a zero placeholder", () => {
  for (const f of ["generate-base64-hex-projections.mjs", "generate-context-large-input-plans.mjs"]) {
    const src = readFileSync(join(here, "..", "scripts", f), "utf8");
    assert.match(src, /resolveSourceRevision/, f);
    assert.doesNotMatch(src, /"0"\.repeat|rev-parse/, f);
  }
});
