#!/usr/bin/env node
// Snapshot release bundle (ADR 0011, docs/releases.md).
//
// npm run release:check [-- --tag <tag>]   dry run: build the bundle twice in memory, require identical bytes,
//                                          print the manifest summary; writes nothing
// npm run release:bundle -- --tag <tag> --out <dir>
//                                          write the release assets (flat) to <dir>; refuses a dirty worktree
//                                          and an existing non-empty <dir>
// npm run release:verify -- --dir <dir> [--tag <tag>] [--manifest-digest <hex>]
//                                          verify downloaded assets against their manifest and the pin
//
// The bundle is built only from committed inputs: records/, migration/, the exporter vocabulary, schemas/,
// the credential-eval corpus snapshot the exporter produces and the fixture materialization. Publication is
// .github/workflows/release.yml (manual dispatch); this script never talks to GitHub.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { buildSnapshot } from "../export/lib/projection.mjs";
import { loadCanonicalInputs, VOCABULARY_PATH } from "../export/lib/source.mjs";
import { buildMaterialization } from "../lib/materialize.mjs";
import { listJson, repoRoot } from "../lib/validator.mjs";
import { reviewStateAccounting } from "./lib/review-state.mjs";
import { buildRelease, MANIFEST_ASSET, tagProblem, verifyRelease } from "./lib/bundle.mjs";

const VALUE_FLAGS = ["--tag", "--out", "--dir", "--manifest-digest"];
const BOOL_FLAGS = ["--check", "--verify"];

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (BOOL_FLAGS.includes(a)) opts[a.slice(2)] = true;
    else if (VALUE_FLAGS.includes(a)) {
      if (i + 1 >= argv.length || argv[i + 1].startsWith("--")) fail(`${a} needs a value`, 2);
      opts[a.slice(2)] = argv[++i];
    } else fail(`unknown argument: ${a}`, 2);
  }
  return opts;
}

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

const git = (...args) => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();

export function collectInputs({ tag, commit }) {
  // the snapshot covers the whole working tree (records added or amended after the import included), and needs no legacy name
  const inputs = loadCanonicalInputs();
  const sourcePaths = [...listJson(join(repoRoot, "records")), ...listJson(join(repoRoot, "migration")), join(repoRoot, VOCABULARY_PATH)];
  const read = (abs) => ({ path: relative(repoRoot, abs), bytes: readFileSync(abs) });
  const sourceFiles = sourcePaths.map(read);
  const schemaFiles = listJson(join(repoRoot, "schemas")).map(read);
  const records = inputs.records;
  const snapshotBuild = buildSnapshot(inputs, { representation: true, siblingFamily: true });
  const fixtures = buildMaterialization({
    sets: records.filter((r) => r.kind === "fixture-set"),
    cases: records.filter((r) => r.kind === "case"),
    scenarios: records.filter((r) => r.kind === "scenario"),
  });
  return {
    tag,
    commit,
    schemaRevision: inputs.schemaRevision,
    sourceFiles,
    sourceDigest: inputs.sourceDigest,
    schemaFiles,
    snapshotText: snapshotBuild.text,
    evalExport: snapshotBuild.accounting,
    reviewState: reviewStateAccounting(records),
    fixtures: { manifestText: fixtures.manifestText, digest: fixtures.digest, count: fixtures.manifest.count },
  };
}

function summary(release) {
  const m = release.manifest;
  const lines = [
    `tag ${m.tag}`,
    `commit ${m.sourceRevision.commit}`,
    `records tree ${m.sourceRevision.recordsTree.digest}`,
    `schema ${m.schemaRevision}, generator ${m.generator.name} ${m.generator.version}`,
    `fixtures ${m.fixtures.count} (digest ${m.fixtures.digest})`,
    `eval v1 export: ${m.evalExport.exported} exported, ${m.evalExport.notExported.total} not exported to eval v1 ${JSON.stringify(m.evalExport.notExported.byReason)}`,
    ...(m.reviewState ? [`review state ${JSON.stringify(m.reviewState.fixtures)}, maintainer-only ${JSON.stringify(m.reviewState.maintainerOnly)} (${m.reviewState.rule})`] : []),
    ...(m.evalExport.representation ? [`representation ${JSON.stringify(m.evalExport.representation)}`] : []),
    ...(m.evalExport.twinSiblingFamily ? [`twin sibling_family ${JSON.stringify(m.evalExport.twinSiblingFamily)} (credential-eval alpha.15 or later)`] : []),
    ...m.files.map((f) => `  ${f.asset}  ${f.bytes} bytes  sha256 ${f.sha256}`),
    `manifest digest ${release.manifestDigest}`,
  ];
  return lines.join("\n");
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.verify) {
    if (!opts.dir) fail("--verify needs --dir <directory of downloaded assets>", 2);
    const dir = resolve(opts.dir);
    const read = (name) => {
      if (name.includes("/") || name.includes("\\") || name.startsWith(".")) return null;
      const p = join(dir, name);
      return existsSync(p) ? readFileSync(p) : null;
    };
    const { problems, manifestDigest } = verifyRelease({ read, tag: opts.tag, manifestDigest: opts["manifest-digest"] });
    if (problems.length) {
      for (const p of problems) console.error(p);
      fail(`\nFAIL: ${problems.length} problem(s) in ${dir}`);
    }
    console.log(`OK: ${dir} matches ${MANIFEST_ASSET} (manifest digest ${manifestDigest}${opts["manifest-digest"] ? ", pinned" : ", NOT pinned: pass --manifest-digest"})`);
    return;
  }

  const commit = git("rev-parse", "HEAD");
  const dirty = git("status", "--porcelain", "--untracked-files=no", "--", "records", "migration", "schemas", "scripts");

  if (opts.check) {
    const tag = opts.tag ?? `snapshot-${new Date().toISOString().slice(0, 10).replaceAll("-", ".")}`;
    const problem = tagProblem(tag);
    if (problem) fail(problem, 2);
    const first = buildRelease(collectInputs({ tag, commit }));
    const second = buildRelease(collectInputs({ tag, commit }));
    const problems = [];
    if (first.manifestText !== second.manifestText) problems.push("two builds produced different manifests");
    for (const [name, bytes] of first.assets) if (!second.assets.get(name)?.equals(bytes)) problems.push(`two builds differ in ${name}`);
    const { problems: verify } = verifyRelease({ read: (n) => first.assets.get(n) ?? null, tag, manifestDigest: first.manifestDigest });
    problems.push(...verify);
    if (problems.length) {
      for (const p of problems) console.error(p);
      fail(`\nFAIL: release dry run found ${problems.length} problem(s)`);
    }
    console.log(summary(first));
    console.log(`\nOK: dry run, deterministic over two builds, nothing written${dirty ? " (worktree has uncommitted changes: a real build would refuse)" : ""}`);
    return;
  }

  if (!opts.tag) fail("--tag <snapshot-YYYY.MM.DD[.n]> is required (or use --check)", 2);
  if (!opts.out) fail("--out <dir> is required (or use --check)", 2);
  const problem = tagProblem(opts.tag);
  if (problem) fail(problem, 2);
  if (dirty) fail(`refusing to build from a worktree with uncommitted changes:\n${dirty}`);
  const out = resolve(opts.out);
  if (existsSync(out) && readdirSync(out).length) fail(`refusing to write into non-empty ${out}`);
  const release = buildRelease(collectInputs({ tag: opts.tag, commit }));
  mkdirSync(out, { recursive: true });
  for (const [name, bytes] of release.assets) writeFileSync(join(out, name), bytes);
  console.log(summary(release));
  console.log(`\nwrote ${release.assets.size} asset(s) to ${out}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
