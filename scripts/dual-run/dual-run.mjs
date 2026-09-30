#!/usr/bin/env node
// Dual run of credential-eval over the canonical snapshot and over the legacy corpus (#12 stage C).
//
//   node scripts/dual-run/dual-run.mjs --credential-eval <checkout> [--work <dir>] [--legacy <checkout>]
//        [--scanner gitleaks]... [--scanner-version trufflehog=3.97.9]... [--report <file>] [--skip-build]
//
// What it does, in order, all offline:
//   1. builds the projection in memory and takes `credential-eval/corpus-snapshot.json` (canonical ids) and
//      `credential-eval/legacy-id-map.json`;
//   2. builds a second snapshot directly from the legacy corpora at the pinned revision (legacy fixture ids and
//      `<suite>/<path>` paths, the legacy assessment kind and tier, the legacy spans), never from the projection;
//   3. copies the credential-eval checkout to <work> (the checkout is never written to), adds a five-line example
//      binary that calls `CorpusSnapshot::from_json` (credential-eval's own validator) and builds it with
//      `cargo --offline`;
//   4. validates both snapshots with that validator;
//   5. runs `credential-eval run` for every requested scanner over both snapshots with the same configuration;
//   6. re-keys the legacy run to canonical ids through the legacy id map and compares every case.
//
// Scanner binaries are whatever is on PATH. credential-eval pins each scanner's version in its default
// configuration; `--scanner-version <id>=<version>` overrides that pin for one scanner and is recorded as an
// override in the output. A scanner that is unavailable is reported as such, never as a pass.
//
// Not part of CI: it needs a Rust toolchain, a credential-eval checkout and scanner binaries. Nothing is faked: a
// step that cannot run is reported as not run.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { generate } from "../export/legacy-projection.mjs";
import { canonicalJson } from "../export/lib/projection.mjs";
import { repoRoot } from "../lib/validator.mjs";
import { loadLegacyDocs, openLegacy } from "../parity/lib/legacy.mjs";
import { createHash } from "node:crypto";

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const sha256 = (t) => createHash("sha256").update(t).digest("hex");

// ------------------------------------------------------------------ arguments
const args = process.argv.slice(2);
const opt = (name) => {
  const out = [];
  for (let i = 0; i < args.length; i += 1) if (args[i] === name) out.push(args[i + 1]);
  return out;
};
const flags = new Set(args.filter((a) => a.startsWith("--")));
const ceDir = opt("--credential-eval")[0];
if (!ceDir) {
  console.error("usage: dual-run.mjs --credential-eval <checkout> [--work <dir>] [--legacy <checkout>] [--scanner <id>]... [--scanner-version <id>=<v>]... [--report <file>] [--skip-build]");
  process.exit(2);
}
const work = resolve(opt("--work")[0] ?? join(repoRoot, "dist", "dual-run"));
const scanners = opt("--scanner").length ? opt("--scanner") : ["gitleaks", "trufflehog"];
const overrides = Object.fromEntries(opt("--scanner-version").map((s) => s.split("=")));
const reportPath = opt("--report")[0];

const run = (cmd, argv, options = {}) => {
  const r = spawnSync(cmd, argv, { encoding: "utf8", maxBuffer: 1 << 28, ...options });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", error: r.error };
};

// ------------------------------------------------------------ 1. canonical side
const { projection } = generate();
const snapshot = JSON.parse(projection.artifacts.get("credential-eval/corpus-snapshot.json"));
const idMap = JSON.parse(projection.artifacts.get("credential-eval/legacy-id-map.json"));

// ------------------------------------------------- 2. the legacy corpus as a snapshot
function legacySnapshot(legacyRoot) {
  const { docs, categories } = loadLegacyDocs(legacyRoot);
  const familyBySlug = new Map(docs.get("fixture-index").doc.fixtures.map((f) => [f.slug, f.familyIds]));
  const suiteOf = new Map(categories.map((c) => [c.corpus, c.id]));
  const cases = [];
  for (const [docId, { doc }] of docs) {
    if (!docId.startsWith("corpus:")) continue;
    const suite = suiteOf.get(docId.slice("corpus:".length));
    for (const f of doc.fixtures) {
      const c = {
        id: `${suite}--${f.id}`,
        path: `${suite}/${f.path}`,
        content: f.content,
        expected: f.expected.map((s) => ({ start: s.start, end: s.end, role: s.role, ...(s.envelope ? { envelope: { start: s.envelope.start, end: s.envelope.end, reason: s.envelope.reason } } : {}) })),
        grouping: { kind: f.assessment.kind, tier: f.assessment.tier, group: f.group ?? suite },
      };
      const fam = familyBySlug.get(c.id);
      if (fam?.length === 1) c.grouping.family = fam[0];
      if (f.twinOf) c.twin = { twin_of: `${suite}--${f.twinOf}`, mutation: f.mutation, mutation_kind: f.mutationKind };
      cases.push(c);
    }
  }
  cases.sort((a, b) => cmp(a.id, b.id));
  return { schema: "credential-eval/corpus-snapshot/v1", identity: { source: "legacy:redact-secret-benchmarks", revision: "ade8a10bd7922765110a68986b0690eb3861f2e5", evidence_schema: "legacy/corpus/v2", corpus_digest: `sha256:${sha256(canonicalJson(cases))}` }, cases };
}
const legacyOpen = openLegacy(opt("--legacy")[0]);
let legacy;
try {
  legacy = legacySnapshot(legacyOpen.root);
} finally {
  legacyOpen.cleanup();
}

rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
const canonicalFile = join(work, "snapshot.canonical.json");
const legacyFile = join(work, "snapshot.legacy.json");
writeFileSync(canonicalFile, `${JSON.stringify(snapshot)}\n`);
writeFileSync(legacyFile, `${JSON.stringify(legacy)}\n`);
writeFileSync(join(work, "legacy-id-map.json"), `${JSON.stringify(idMap)}\n`);

const summary = { snapshots: { canonical: { cases: snapshot.cases.length }, legacy: { cases: legacy.cases.length } }, validator: {}, scanners: {}, notRun: [] };

// ------------------------------------------------ 3. scratch copy of credential-eval
const ce = join(work, "credential-eval");
const skip = new Set([".git", "target", "node_modules", ".claude", "graft"]);
cpSync(resolve(ceDir), ce, { recursive: true, filter: (src) => !skip.has(src.split("/").pop()) });
mkdirSync(join(ce, "crates", "credential-eval-contracts", "examples"), { recursive: true });
writeFileSync(
  join(ce, "crates", "credential-eval-contracts", "examples", "validate_snapshot.rs"),
  `use credential_eval_contracts::corpus::CorpusSnapshot;

fn main() {
    let path = std::env::args().nth(1).expect("usage: validate_snapshot <snapshot.json>");
    let bytes = std::fs::read(&path).expect("read");
    match CorpusSnapshot::from_json(&bytes) {
        Ok(s) => println!("OK: {} cases, digest {}", s.cases.len(), s.identity.corpus_digest),
        Err(e) => {
            eprintln!("INVALID: {e}");
            std::process::exit(1);
        }
    }
}
`,
);
const manifest = join(ce, "Cargo.toml");
if (!flags.has("--skip-build")) {
  const builds = [
    run("cargo", ["build", "--offline", "--release", "-q", "--manifest-path", manifest, "-p", "credential-eval-cli"]),
    run("cargo", ["build", "--offline", "--release", "-q", "--manifest-path", manifest, "-p", "credential-eval-contracts", "--example", "validate_snapshot"]),
  ];
  const build = builds.find((b) => b.status !== 0);
  if (build) {
    summary.notRun.push(`cargo build --offline failed: ${build.stderr.split("\n").slice(-6).join(" | ")}`);
    finish();
  }
}
const evalBin = join(ce, "target", "release", "credential-eval");
const validatorBin = join(ce, "target", "release", "examples", "validate_snapshot");

// ---------------------------------------------------------------- 4. validator
for (const [name, file] of [["canonical", canonicalFile], ["legacy", legacyFile]]) {
  const v = run(validatorBin, [file]);
  summary.validator[name] = { ok: v.status === 0, output: (v.status === 0 ? v.stdout : v.stderr).trim() };
}

// -------------------------------------------------------------- 5. and 6. runs
function configFor(id) {
  const d = run(evalBin, ["default-config", "--scanner", id]);
  if (d.status !== 0) throw new Error(`default-config ${id}: ${d.stderr}`);
  const cfg = JSON.parse(d.stdout);
  const spec = cfg.scanners[0];
  const pinned = spec.configuration.required_version;
  if (overrides[id]) spec.configuration.required_version = overrides[id];
  const file = join(work, `config.${id}.json`);
  writeFileSync(file, JSON.stringify(cfg));
  return { file, pinned, used: spec.configuration.required_version, overridden: Boolean(overrides[id]) };
}

const byLegacyId = new Map(idMap.cases.map((c) => [c.legacyId, c.id]));
const canonicalById = new Map(snapshot.cases.map((c) => [c.id, c]));
const legacyById = new Map(legacy.cases.map((c) => [c.id, c]));
const sameJson = (a, b) => canonicalJson(a) === canonicalJson(b);

for (const id of scanners) {
  const cfg = configFor(id);
  const entry = { pinnedVersion: cfg.pinned, versionUsed: cfg.used, pinOverridden: cfg.overridden };
  summary.scanners[id] = entry;
  const artifacts = {};
  for (const side of ["canonical", "legacy"]) {
    const out = join(work, `run.${id}.${side}.json`);
    const r = run(evalBin, ["run", "--corpus", side === "canonical" ? canonicalFile : legacyFile, "--out", out, "--config", cfg.file, "--jobs", "2"]);
    entry[`${side}Run`] = { exit: r.status, log: r.stdout.trim().split("\n").slice(0, 3).join(" | ") + (r.status === 0 ? "" : ` ${r.stderr.trim().split("\n").slice(-3).join(" | ")}`) };
    if (r.status !== 0 || !existsSync(out)) break;
    artifacts[side] = JSON.parse(readFileSync(out, "utf8")).scanners[0];
  }
  if (!artifacts.canonical || !artifacts.legacy) {
    summary.notRun.push(`${id}: a run did not produce an artifact (${entry.canonicalRun?.log} / ${entry.legacyRun?.log})`);
    continue;
  }
  entry.status = { canonical: artifacts.canonical.status, legacy: artifacts.legacy.status };
  if (artifacts.canonical.status !== "complete" || artifacts.legacy.status !== "complete") {
    summary.notRun.push(`${id}: scanner status canonical=${artifacts.canonical.status} legacy=${artifacts.legacy.status}; no comparison`);
    continue;
  }
  const a = new Map(artifacts.canonical.cases.map((c) => [c.case_id, c]));
  const counts = { cases: 0, unmatched: 0, actualIdentical: 0, actualDiffers: 0, measurementIdentical: 0, measurementDiffers: 0, inputsIdentical: 0, inputsDiffer: 0, unexplained: 0, findingsCanonical: artifacts.canonical.findings.length, findingsLegacy: artifacts.legacy.findings.length };
  const examples = { actualDiffers: [], unexplained: [] };
  const inputDiffKinds = {};
  for (const lc of artifacts.legacy.cases) {
    const canonicalId = byLegacyId.get(lc.case_id);
    const cc = canonicalId ? a.get(canonicalId) : undefined;
    if (!cc) {
      counts.unmatched += 1;
      continue;
    }
    counts.cases += 1;
    const src = canonicalById.get(canonicalId);
    const old = legacyById.get(lc.case_id);
    const actualSame = sameJson(cc.actual, lc.actual);
    const measSame = sameJson(cc.measurement, lc.measurement);
    // what the measurement depends on, compared between the two snapshots: population (kind), expected spans with
    // roles and envelopes, the family a twin reading is scoped to, and twin lineage (re-keyed to canonical ids)
    const dims = [];
    if (src.grouping.kind !== old.grouping.kind) dims.push("kind");
    if (!sameJson(src.expected, old.expected)) dims.push("expected spans");
    if ((src.grouping.family ?? null) !== (old.grouping.family ?? null)) dims.push("family");
    if ((src.twin?.twin_of ?? null) !== (old.twin ? (byLegacyId.get(old.twin.twin_of) ?? null) : null)) dims.push("twin lineage");
    const inputSame = dims.length === 0;
    counts[actualSame ? "actualIdentical" : "actualDiffers"] += 1;
    counts[measSame ? "measurementIdentical" : "measurementDiffers"] += 1;
    counts[inputSame ? "inputsIdentical" : "inputsDiffer"] += 1;
    if (!inputSame) {
      const k = dims.join(" + ");
      inputDiffKinds[k] ??= { cases: 0, measurementDiffers: 0 };
      inputDiffKinds[k].cases += 1;
      if (!measSame) inputDiffKinds[k].measurementDiffers += 1;
    }
    if (!actualSame && examples.actualDiffers.length < 5) examples.actualDiffers.push(canonicalId);
    // a difference is explained only if an input differs (a parity rule covers it); the same inputs must give the same findings and measurement
    if ((!actualSame || !measSame) && inputSame) {
      counts.unexplained += 1;
      if (examples.unexplained.length < 10) examples.unexplained.push({ id: canonicalId, canonical: cc.measurement, legacy: lc.measurement });
    }
  }
  entry.comparison = { ...counts, inputDiffKinds, examples };
}

finish();

// ------------------------------------------------------------------- output
function render() {
  const n = (x) => x.toLocaleString("en-US");
  const out = ["# credential-eval dual run", "", "<!-- Generated by scripts/dual-run/dual-run.mjs. Not regenerated by CI: it needs a Rust toolchain, a credential-eval checkout and scanner binaries. -->", ""];
  out.push("Same scanner, same configuration, same corpus content, run twice through credential-eval: once over the canonical snapshot (`credential-eval/corpus-snapshot.json`: canonical fixture ids and materialized paths), once over a snapshot built directly from the legacy corpora at the pinned legacy revision (legacy fixture ids and `<suite>/<path>` paths, legacy kind, tier and spans). The legacy run is re-keyed to canonical ids through `credential-eval/legacy-id-map.json` and every case is compared.", "");
  out.push("| Snapshot | Cases | credential-eval validator (`CorpusSnapshot::from_json`) |", "| --- | --- | --- |");
  for (const k of ["canonical", "legacy"]) out.push(`| ${k} | ${n(summary.snapshots[k].cases)} | ${summary.validator[k]?.ok ? "accepted" : `REJECTED: ${summary.validator[k]?.output}`}; ${summary.validator[k]?.output ?? ""} |`);
  out.push("");
  for (const [id, s] of Object.entries(summary.scanners)) {
    out.push(`## ${id}`, "");
    out.push(`Version used \`${s.versionUsed}\`; credential-eval pins \`${s.pinnedVersion}\`${s.pinOverridden ? " (**pin overridden**: the pinned binary is not installed; both runs used the same installed binary, so the comparison is unaffected, but no absolute number from this run is a pinned-version number)" : " (pin respected)"}.`, "");
    const c = s.comparison;
    if (!c) {
      out.push("Not compared (see below).", "");
      continue;
    }
    out.push("| Measure | Value |", "| --- | --- |");
    out.push(`| cases compared (re-keyed) | ${n(c.cases)} (unmatched ${c.unmatched}) |`);
    out.push(`| findings, canonical run / legacy run | ${n(c.findingsCanonical)} / ${n(c.findingsLegacy)} |`);
    out.push(`| cases with identical findings | ${n(c.actualIdentical)} of ${n(c.cases)} |`);
    out.push(`| cases with identical per-case measurement (outcome, span outcomes, leaked and collateral bytes) | ${n(c.measurementIdentical)} of ${n(c.cases)} |`);
    out.push(`| cases whose snapshot inputs differ (explained by the parity rules) | ${n(c.inputsDiffer)} |`);
    out.push(`| **unexplained drift** (findings or measurement differ while kind, spans, family and twin lineage are equal) | **${n(c.unexplained)}** |`, "");
    out.push("Cases whose inputs differ, by the input that differs:", "", "| Differing input | Cases | Of which measurement differs |", "| --- | --- | --- |");
    for (const [k, v] of Object.entries(c.inputDiffKinds).sort()) out.push(`| ${k} | ${n(v.cases)} | ${n(v.measurementDiffers)} |`);
    out.push("");
  }
  if (summary.notRun.length) out.push("## Not run", "", ...summary.notRun.map((x) => `- ${x}`), "");
  out.push("## Not compared", "", "- Run-level aggregates (per group, per tier): the two snapshots group differently by design (canonical `group` is the Case or Scenario id; tiers of downgraded fixtures differ), so only per-case findings and measurements are compared.", "- Scanners other than those listed above were not run.", "");
  return `${out.join("\n")}\n`;
}

function finish() {
  const text = JSON.stringify(summary, null, 2);
  writeFileSync(join(work, "dual-run-summary.json"), `${text}\n`);
  if (reportPath) writeFileSync(resolve(reportPath), render());
  console.log(text);
  process.exit(summary.notRun.length ? 3 : 0);
}
