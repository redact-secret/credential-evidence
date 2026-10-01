// Fast subset of `npm run validate` for a handful of changed records (`npm run record:check`).
//
// Every rule is the validator's own: schema (createValidator), references and uniqueness
// (checkIntegrity), identity (checkIdentity), narrative prose (checkNarrativeLint) and
// scaffold placeholders (checkPlaceholders). Per-record rules run on the target files only.
// References are resolved against the whole universe the file belongs to (records/ with
// migration/, or examples/valid), but only problems reported against a target are shown.
// A change that breaks a record it does not touch (deleting a cited source) is caught by the
// full `npm run validate`, which stays the gate.

import { readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { checkIdentity } from "./identity.mjs";
import { checkNarrativeLint } from "./narrative-lint.mjs";
import { checkPlaceholders } from "./placeholders.mjs";
import { checkIntegrity, createValidator, listJson, repoRoot } from "./validator.mjs";

const UNIVERSES = [
  { name: "records", dirs: ["records", "migration"] },
  { name: "examples", dirs: ["examples/valid"] },
];

const posix = (p) => p.split(sep).join("/");

function universeOf(rel) {
  return UNIVERSES.find((u) => u.dirs.some((d) => rel === d || rel.startsWith(`${d}/`)));
}

/** Expand files and directories to repository-relative .json record paths, sorted, de-duplicated. */
export function expandTargets(paths, root = repoRoot) {
  const out = new Set();
  for (const p of paths) {
    const abs = resolve(root, p);
    let st;
    try {
      st = statSync(abs);
    } catch (e) {
      if (e.code === "ENOENT") continue; // a deleted record: nothing to check here
      throw e;
    }
    for (const file of st.isDirectory() ? listJson(abs) : [abs]) {
      const rel = posix(relative(root, file));
      if (rel.endsWith(".json") && universeOf(rel)) out.add(rel);
    }
  }
  return [...out].sort();
}

/** Record files changed against `base` (merge-base with it), in the working tree, or untracked. */
export function changedRecordFiles({ root = repoRoot, base = "origin/main" } = {}) {
  const git = (args) => {
    const r = spawnSync(process.env.GIT ?? "git", args, { cwd: root, encoding: "utf8" });
    return r.status === 0 ? r.stdout.split("\n").filter(Boolean) : null;
  };
  const mb = git(["merge-base", "HEAD", base])?.[0] ?? "HEAD";
  const files = [
    ...(git(["diff", "--name-only", "--diff-filter=ACMR", mb]) ?? []),
    ...(git(["ls-files", "--others", "--exclude-standard"]) ?? []),
  ];
  return expandTargets(files, root);
}

/**
 * Check the given record files (repository-relative). Returns { errors, checked }.
 */
export function checkRecordFiles(files, { root = repoRoot, validator = createValidator() } = {}) {
  const errors = [];
  let checked = 0;
  for (const u of UNIVERSES) {
    const targets = files.filter((f) => universeOf(f) === u);
    if (!targets.length) continue;
    const targetSet = new Set(targets);
    const all = [];
    for (const d of u.dirs) {
      let list;
      try {
        list = listJson(join(root, d));
      } catch (e) {
        if (e.code === "ENOENT") continue;
        throw e;
      }
      for (const file of list) {
        const rel = posix(relative(root, file));
        try {
          all.push({ path: rel, record: JSON.parse(readFileSync(file, "utf8")) });
        } catch (e) {
          if (targetSet.has(rel)) errors.push(`${rel}: invalid JSON (${e.message})`);
        }
      }
    }
    const valid = [];
    for (const entry of all) {
      if (!targetSet.has(entry.path)) {
        valid.push(entry); // unchanged records are validated by `npm run validate`
        continue;
      }
      checked += 1;
      const problems = validator.validateRecord(entry.record);
      if (problems.length) for (const p of problems) errors.push(`${entry.path}: ${p}`);
      else valid.push(entry);
    }
    const mine = (e) => targetSet.has(e.slice(0, e.indexOf(": ")));
    const targetEntries = valid.filter((e) => targetSet.has(e.path));
    errors.push(...checkIntegrity(valid).filter(mine));
    errors.push(...checkIdentity(targetEntries), ...checkNarrativeLint(targetEntries), ...checkPlaceholders(targetEntries));
  }
  return { errors: errors.sort(), checked };
}
