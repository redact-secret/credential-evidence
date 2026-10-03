// What `origin.generator.sourceRevision` means for a set or plan generated inside this repository, and how it is
// chosen and checked (ADR 0005 addendum, docs/authoring.md "Pinning a generated set's sourceRevision").
//
// The value is a commit that stays reachable from `main`: the merge-base of the working branch with `origin/main`,
// that is, the main commit the generator's inputs (the authored bases, plans and records) were read from. It is never
// the branch's own HEAD or any commit made on the branch, because this repository squash-merges and a squash leaves
// every branch commit unreachable. A set whose generator reads legacy inputs keeps the pinned legacy commit
// (LEGACY_REVISION), which belongs to another repository and is not checked for reachability here.
//
// Offline and deterministic: only local git is read, never the network.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { LEGACY_REVISION } from "../migrate/lib/legacy-source.mjs";
import { listJson, repoRoot } from "./validator.mjs";

export const SOURCE_REVISION_PATTERN = /^[0-9a-f]{40}$/;
export const MAIN_REFS = ["origin/main", "main"];

function run(args, cwd) {
  return spawnSync(process.env.GIT ?? "git", args, { cwd, encoding: "utf8" });
}
function git(args, cwd) {
  const r = run(args, cwd);
  return r.status === 0 ? r.stdout.trim() : null;
}
const succeeds = (args, cwd) => run(args, cwd).status === 0;

/** The merge-base of HEAD with origin/main (falling back to a local main), or null when neither ref exists. */
export function mergeBaseWithMain(cwd = repoRoot) {
  for (const ref of MAIN_REFS) {
    const mb = git(["merge-base", "HEAD", ref], cwd);
    if (mb && SOURCE_REVISION_PATTERN.test(mb)) return mb;
  }
  return null;
}

/**
 * Decide the sourceRevision a generator records.
 *   --source-revision <40 hex>  wins (the override);
 *   `--check` with a record on disk reads the recorded value back, so a check never disagrees with itself;
 *   otherwise the merge-base with origin/main.
 * Returns { value, via } or { error } (an actionable message; callers print it and exit 2).
 */
export function resolveSourceRevision({ argv, existing, check = false, cwd = repoRoot }) {
  const i = argv.indexOf("--source-revision");
  if (i >= 0) {
    const v = argv[i + 1];
    return SOURCE_REVISION_PATTERN.test(v ?? "") ? { value: v, via: "--source-revision" } : { error: "--source-revision needs 40 lowercase hex digits" };
  }
  if (check && existing) return { value: existing, via: "recorded" };
  const mb = mergeBaseWithMain(cwd);
  if (mb) return { value: mb, via: "merge-base with main" };
  return { error: "cannot find the merge-base with origin/main (no such ref here); fetch it, or pass --source-revision <40-hex main commit>" };
}

/** Every generator.sourceRevision in the records: { file, path, value } where file is repository-relative. */
export function collectSourceRevisions(root = repoRoot) {
  const out = [];
  for (const abs of listJson(join(root, "records"))) {
    const rec = JSON.parse(readFileSync(abs, "utf8"));
    const file = relative(root, abs).split(sep).join("/");
    for (const [path, g] of [
      ["origin.generator", rec.origin?.generator],
      ["generation.generator", rec.generation?.generator],
    ]) {
      if (g && typeof g === "object" && "sourceRevision" in g) out.push({ file, path: `${path}.sourceRevision`, value: g.sourceRevision });
    }
  }
  return out;
}

/**
 * Check the recorded revisions. Always (offline, shallow-safe): 40 lowercase hex, not all zeros, not the commit
 * checked out and not `prHead` (the pull request's tip, which CI passes in). When the history is available
 * (`reachability`: "auto" checks only when the clone is complete and a main ref exists, "require" fails if it cannot,
 * "off" skips): the commit must be an ancestor of origin/main (of HEAD too when HEAD is the main branch itself).
 * Returns { errors, notes, checked }.
 */
export function checkSourceRevisions({ root = repoRoot, prHead = process.env.PR_HEAD_SHA, reachability = "auto", entries = collectSourceRevisions(root) } = {}) {
  const errors = [];
  const notes = [];
  const head = git(["rev-parse", "HEAD"], root);
  const mainRef = MAIN_REFS.find((r) => succeeds(["rev-parse", "--verify", "--quiet", r], root));
  let skipped = null;
  if (reachability !== "off") {
    if (!head) skipped = "not a git checkout";
    else if (git(["rev-parse", "--is-shallow-repository"], root) === "true") skipped = "shallow clone";
    else if (!mainRef) skipped = "no origin/main or main ref";
    if (skipped && reachability === "require") errors.push(`cannot check reachability from main: ${skipped}`);
    else if (skipped) notes.push(`reachability from main not checked (${skipped})`);
  }
  const onMainBranch = head !== null && git(["rev-parse", "--abbrev-ref", "HEAD"], root) === "main";
  let checked = 0;
  for (const { file, path, value } of entries) {
    const at = `${file}: ${path}`;
    if (typeof value !== "string" || !SOURCE_REVISION_PATTERN.test(value)) {
      errors.push(`${at} is not 40 lowercase hex digits`);
      continue;
    }
    checked++;
    if (value === LEGACY_REVISION) continue; // another repository's pin
    if (/^0+$/.test(value)) errors.push(`${at} is the all-zero placeholder; regenerate (the generator defaults to the merge-base with origin/main)`);
    else if (skipped && value === head) errors.push(`${at} is the checked-out commit; a commit cannot name itself and a squash orphans it. Pin the merge-base with origin/main`);
    else if (prHead && value === prHead.toLowerCase()) errors.push(`${at} is the pull request's own tip ${value.slice(0, 12)}; a squash merge orphans it. Pin the merge-base with origin/main`);
    else if (reachability !== "off" && !skipped) {
      const exists = succeeds(["cat-file", "-e", `${value}^{commit}`], root);
      const ok = exists && (succeeds(["merge-base", "--is-ancestor", value, mainRef], root) || (onMainBranch && succeeds(["merge-base", "--is-ancestor", value, "HEAD"], root)));
      if (!ok) errors.push(`${at} ${value.slice(0, 12)} is not reachable from ${mainRef}; it was probably made on a branch and orphaned by a squash. Regenerate with the merge-base with origin/main (--source-revision <sha> to override)`);
    }
  }
  return { errors, notes, checked };
}
