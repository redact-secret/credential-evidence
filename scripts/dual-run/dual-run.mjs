#!/usr/bin/env node
// Dual run of credential-eval over the canonical snapshot and over the legacy corpus (#12 stage C).
//
//   node scripts/dual-run/dual-run.mjs --credential-eval <checkout> [--work <dir>] [--legacy <checkout>]
//        [--scanner gitleaks]... [--scanner-version trufflehog=3.97.9]... [--report <file>] [--skip-build]
//        [--bin <credential-eval binary>] [--config <run-config.json>] [--node-dir <dir>] [--jobs N]
//        [--run-class exploratory|official] [--limit N] [--reuse]
//
//   --bin       use an already built `credential-eval` binary instead of building the CLI in the scratch copy
//               (the five-line validator example is still built there);
//   --config    take each scanner's spec from this run configuration instead of `default-config`;
//   --node-dir  the credential-eval Node shim directory (with `npm ci --ignore-scripts` done) for the npm
//               scanners (redact-secret, flare-redact, openredaction);
//   --jobs      `credential-eval run --jobs` (default 2); scanners always run one at a time;
//   --run-class passed through (default exploratory: a migration measurement, never a publication);
//   --limit N   smoke mode: N canonical cases spread evenly over the sorted ids (plus the cases they are twins
//               of), and their legacy counterparts (digests recomputed); never use a limited run as the report;
//   --reuse     keep <work> and re-compare the run artifacts already there (each with its `.meta.json`) instead of
//               running the scanners again; a missing artifact is run.
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
import { generate, loadBaselineInputs } from "../export/legacy-projection.mjs";
import { canonicalJson } from "../export/lib/projection.mjs";
import { repoRoot } from "../lib/validator.mjs";
import { LEGACY_REVISION, loadLegacyDocs, openLegacy } from "../parity/lib/legacy.mjs";
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
const prebuilt = opt("--bin")[0];
const configPath = opt("--config")[0];
const nodeDir = opt("--node-dir")[0];
const jobs = opt("--jobs")[0] ?? "2";
const runClass = opt("--run-class")[0] ?? "exploratory";
const limit = opt("--limit")[0] ? Number(opt("--limit")[0]) : undefined;
const reuse = flags.has("--reuse");

const run = (cmd, argv, options = {}) => {
  const r = spawnSync(cmd, argv, { encoding: "utf8", maxBuffer: 1 << 28, ...options });
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", error: r.error };
};

// ------------------------------------------------------------ 1. canonical side
const { projection } = generate(await loadBaselineInputs());
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
  return { schema: "credential-eval/corpus-snapshot/v1", identity: { source: "legacy:redact-secret-benchmarks", revision: LEGACY_REVISION, evidence_schema: "legacy/corpus/v2", corpus_digest: `sha256:${sha256(canonicalJson(cases))}` }, cases };
}
const legacyOpen = openLegacy(opt("--legacy")[0]);
let legacy;
try {
  legacy = legacySnapshot(legacyOpen.root);
} finally {
  legacyOpen.cleanup();
}

// smoke mode: an evenly spread subset of canonical cases and their legacy counterparts, same on both sides
if (limit) {
  const step = Math.max(1, Math.floor(snapshot.cases.length / limit));
  const keepIds = new Set(snapshot.cases.filter((_, i) => i % step === 0).slice(0, limit).map((c) => c.id));
  // close the subset under twin lineage on both sides: a twin needs the case it is a twin of
  const toLegacy = new Map(idMap.cases.map((c) => [c.id, c.legacyId]));
  const toCanon = new Map(idMap.cases.map((c) => [c.legacyId, c.id]));
  const canonTwin = new Map(snapshot.cases.filter((c) => c.twin).map((c) => [c.id, c.twin.twin_of]));
  const legacyTwin = new Map(legacy.cases.filter((c) => c.twin).map((c) => [c.id, c.twin.twin_of]));
  for (let size = -1; size !== keepIds.size; ) {
    size = keepIds.size;
    for (const id of [...keepIds]) {
      if (canonTwin.has(id)) keepIds.add(canonTwin.get(id));
      const lt = legacyTwin.get(toLegacy.get(id));
      if (lt && toCanon.has(lt)) keepIds.add(toCanon.get(lt));
    }
  }
  const keep = snapshot.cases.filter((c) => keepIds.has(c.id));
  const keepLegacy = new Set([...keepIds].map((id) => toLegacy.get(id)));
  snapshot.cases = keep;
  snapshot.identity = { ...snapshot.identity, corpus_digest: `sha256:${sha256(canonicalJson(snapshot.cases))}` };
  legacy.cases = legacy.cases.filter((c) => keepLegacy.has(c.id));
  legacy.identity = { ...legacy.identity, corpus_digest: `sha256:${sha256(canonicalJson(legacy.cases))}` };
}

if (!reuse) rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
const canonicalFile = join(work, "snapshot.canonical.json");
const legacyFile = join(work, "snapshot.legacy.json");
writeFileSync(canonicalFile, `${JSON.stringify(snapshot)}\n`);
writeFileSync(legacyFile, `${JSON.stringify(legacy)}\n`);
writeFileSync(join(work, "legacy-id-map.json"), `${JSON.stringify(idMap)}\n`);

const gitRev = (dir) => {
  const r = run("git", ["-C", dir, "rev-parse", "HEAD"]);
  return r.status === 0 ? r.stdout.trim() : null;
};
const summary = { revisions: { credentialEval: gitRev(resolve(ceDir)), credentialEvidence: gitRev(repoRoot), legacy: legacy.identity.revision }, node: process.version, limit: limit ?? null, runClass, jobs: Number(jobs), snapshots: { canonical: { cases: snapshot.cases.length }, legacy: { cases: legacy.cases.length } }, validator: {}, scanners: {}, notRun: [] };

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
    ...(prebuilt ? [] : [run("cargo", ["build", "--offline", "--release", "-q", "--manifest-path", manifest, "-p", "credential-eval-cli"])]),
    run("cargo", ["build", "--offline", "--release", "-q", "--manifest-path", manifest, "-p", "credential-eval-contracts", "--example", "validate_snapshot"]),
  ];
  const build = builds.find((b) => b.status !== 0);
  if (build) {
    summary.notRun.push(`cargo build --offline failed: ${build.stderr.split("\n").slice(-6).join(" | ")}`);
    finish();
  }
}
const evalBin = prebuilt ? resolve(prebuilt) : join(ce, "target", "release", "credential-eval");
const validatorBin = join(ce, "target", "release", "examples", "validate_snapshot");

// ---------------------------------------------------------------- 4. validator
for (const [name, file] of [["canonical", canonicalFile], ["legacy", legacyFile]]) {
  const v = run(validatorBin, [file]);
  summary.validator[name] = { ok: v.status === 0, output: (v.status === 0 ? v.stdout : v.stderr).trim() };
}

// -------------------------------------------------------------- 5. and 6. runs
function configFor(id) {
  let cfg;
  if (configPath) {
    cfg = JSON.parse(readFileSync(resolve(configPath), "utf8"));
    cfg.scanners = cfg.scanners.filter((s) => s.id === id);
    if (cfg.scanners.length !== 1) throw new Error(`${configPath}: no spec for scanner ${id}`);
  } else {
    const d = run(evalBin, ["default-config", "--scanner", id]);
    if (d.status !== 0) throw new Error(`default-config ${id}: ${d.stderr}`);
    cfg = JSON.parse(d.stdout);
  }
  const spec = cfg.scanners[0];
  // gitleaks and trufflehog pin `required_version`; the npm scanners are pinned by the shim's lockfile
  const pinned = spec.configuration.required_version ?? "lockfile";
  if (overrides[id]) spec.configuration.required_version = overrides[id];
  const file = join(work, `config.${id}.json`);
  writeFileSync(file, JSON.stringify(cfg));
  return { file, pinned, used: spec.configuration.required_version ?? "lockfile", overridden: Boolean(overrides[id]) };
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
    const argv = ["run", "--corpus", side === "canonical" ? canonicalFile : legacyFile, "--out", out, "--config", cfg.file, "--jobs", jobs, "--run-class", runClass];
    if (nodeDir) argv.push("--node-dir", resolve(nodeDir));
    const metaFile = `${out}.meta.json`;
    if (reuse && existsSync(out) && existsSync(metaFile)) {
      entry[`${side}Run`] = { ...JSON.parse(readFileSync(metaFile, "utf8")), reused: true };
    } else {
      const started = Date.now();
      const r = run(evalBin, argv);
      entry[`${side}Run`] = { exit: r.status, seconds: Math.round((Date.now() - started) / 100) / 10, log: r.stdout.trim().split("\n").slice(0, 3).join(" | ") + (r.status === 0 ? "" : ` ${r.stderr.trim().split("\n").slice(-3).join(" | ")}`) };
      writeFileSync(metaFile, `${JSON.stringify(entry[`${side}Run`])}\n`);
    }
    if (entry[`${side}Run`].exit !== 0 || !existsSync(out)) break;
    const doc = JSON.parse(readFileSync(out, "utf8"));
    artifacts[side] = doc.scanners[0];
    const ident = doc.manifest.scanners.find((s) => s.id === id);
    entry[`${side}Identity`] = {
      version: ident?.version,
      configurationHash: ident?.configuration_hash,
      configHash: doc.manifest.config_hash,
      corpusDigest: doc.manifest.evidence.corpus_digest,
      engine: `${doc.manifest.engine?.name} ${doc.manifest.engine?.version}`,
      protocol: doc.manifest.protocol_version,
      runClass: doc.manifest.run_class,
      publication: doc.manifest.publication,
      // versions and digests only, never host paths
      components: (ident?.provenance?.components ?? []).map((c) => ({ kind: c.kind, name: c.name, version: c.version, sha256: c.sha256 })),
    };
  }
  if (!artifacts.canonical || !artifacts.legacy) {
    summary.notRun.push(`${id}: a run did not produce an artifact (${entry.canonicalRun?.log} / ${entry.legacyRun?.log})`);
    continue;
  }
  entry.status = { canonical: artifacts.canonical.status, legacy: artifacts.legacy.status };
  entry.replays = { canonical: artifacts.canonical.replays, legacy: artifacts.legacy.replays };
  if (artifacts.canonical.status !== "complete" || artifacts.legacy.status !== "complete") {
    summary.notRun.push(`${id}: scanner status canonical=${artifacts.canonical.status} legacy=${artifacts.legacy.status}; no comparison`);
    continue;
  }
  const a = new Map(artifacts.canonical.cases.map((c) => [c.case_id, c]));
  const counts = { cases: 0, unmatched: 0, actualIdentical: 0, actualDiffers: 0, measurementIdentical: 0, measurementDiffers: 0, inputsIdentical: 0, inputsDiffer: 0, unexplained: 0, tierDiffers: 0, findingsCanonical: artifacts.canonical.findings.length, findingsLegacy: artifacts.legacy.findings.length };
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
    // the tier does not enter the per-case measurement; it only selects the aggregate group
    if (src.grouping.tier !== old.grouping.tier) counts.tierDiffers += 1;
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
  entry.aggregates = compareAggregates(artifacts);
}

// Run-level aggregates. Groups are keyed `<kind>/<tier>`; a group's aggregate is a function of the measurements of
// its members. A group whose membership (re-keyed to canonical ids) is the same on both sides must therefore have
// the same aggregate; a group whose membership differs is explained by the members that moved, and every moved
// member must be a case whose kind or tier differs between the snapshots (parity rules). The `T0` cases are
// counted, never scored, but their candidate kind feeds `pending/T0.candidate_kinds` and the `pending_files` and
// `measurable_share` of the `<kind>/*` groups; a difference there is explained only if it equals the difference in
// the number of `T0` cases of that candidate kind, as counted from the per-case results. Anything else is
// unexplained.
function compareAggregates(artifacts) {
  const toCanonical = (side, caseId) => (side === "legacy" ? byLegacyId.get(caseId) : caseId);
  const members = (side) => {
    const out = new Map();
    for (const c of artifacts[side].cases) {
      const key = c.kind === undefined ? undefined : c.tier === "T0" ? "pending/T0" : `${c.kind}/${c.tier}`;
      if (!out.has(key)) out.set(key, new Set());
      out.get(key).add(toCanonical(side, c.case_id));
    }
    return out;
  };
  const mem = { canonical: members("canonical"), legacy: members("legacy") };
  const pendingByKind = (side) => {
    const out = {};
    for (const c of artifacts[side].cases) if (c.tier === "T0") out[c.kind] = (out[c.kind] ?? 0) + 1;
    return out;
  };
  const pending = { canonical: pendingByKind("canonical"), legacy: pendingByKind("legacy") };
  const PENDING_FIELDS = new Set(["pending_files", "measurable_share", "candidate_kinds"]);
  const groups = { canonical: artifacts.canonical.aggregates?.groups ?? {}, legacy: artifacts.legacy.aggregates?.groups ?? {} };
  const keys = [...new Set([...Object.keys(groups.canonical), ...Object.keys(groups.legacy)])].sort(cmp);
  const rows = [];
  let unexplained = 0;
  for (const key of keys) {
    const a = groups.canonical[key];
    const b = groups.legacy[key];
    const ma = mem.canonical.get(key) ?? new Set();
    const mb = mem.legacy.get(key) ?? new Set();
    const joined = [...ma].filter((x) => !mb.has(x));
    const left = [...mb].filter((x) => !ma.has(x));
    const same = a !== undefined && b !== undefined && sameJson(a, b);
    const moved = [...joined, ...left];
    // every moved case must have a kind or tier change in the snapshots
    const unexplainedMoves = moved.filter((id) => {
      const src = canonicalById.get(id);
      const old = legacyById.get(idMap.cases.find((c) => c.id === id)?.legacyId);
      return !src || !old || (src.grouping.kind === old.grouping.kind && src.grouping.tier === old.grouping.tier);
    });
    const fields = same ? [] : differingFields(a ?? {}, b ?? {});
    // a pending-count change: the group's own T0 accounting matches the per-case T0 counts on each side and differs
    const kind = key.split("/")[0];
    const carriesPending = key === "pending/T0" || a?.pending_files !== undefined || b?.pending_files !== undefined;
    const pendingConsistent =
      !carriesPending ? true
      : key === "pending/T0"
        ? sameJson(a?.candidate_kinds ?? {}, pending.canonical) && sameJson(b?.candidate_kinds ?? {}, pending.legacy)
        : (a?.pending_files ?? 0) === (pending.canonical[kind] ?? 0) && (b?.pending_files ?? 0) === (pending.legacy[kind] ?? 0);
    const pendingChanged = !carriesPending ? false : key === "pending/T0" ? !sameJson(pending.canonical, pending.legacy) : (pending.canonical[kind] ?? 0) !== (pending.legacy[kind] ?? 0);
    const reasons = [];
    if (moved.length && !unexplainedMoves.length) reasons.push("moved cases (kind or tier differs)");
    if (pendingChanged && pendingConsistent && fields.some((f) => PENDING_FIELDS.has(f))) reasons.push("T0 candidate-kind change");
    const explained =
      same ||
      (!unexplainedMoves.length &&
        pendingConsistent &&
        reasons.length > 0 &&
        (moved.length > 0 || fields.every((f) => PENDING_FIELDS.has(f))));
    if (!explained) unexplained += 1;
    rows.push({
      group: key,
      files: { canonical: a?.files ?? 0, legacy: b?.files ?? 0 },
      identical: same,
      joined: joined.length,
      left: left.length,
      explained,
      reasons,
      ...(same ? {} : { differingFields: fields }),
    });
  }
  // conservation: moving cases between tiers must not change the additive totals of a population (controls,
  // positives) summed over its scored groups
  const totals = (side) => {
    const t = {};
    for (const [key, v] of Object.entries(groups[side])) {
      if (key === "pending/T0") continue;
      for (const f of ["files", "flagged_files", "findings", "spans", "secret_bytes", "leaked_spans", "leaked_bytes", "collateral_bytes"]) if (typeof v[f] === "number") t[`${v.population}.${f}`] = (t[`${v.population}.${f}`] ?? 0) + v[f];
      for (const [o, c] of Object.entries(v.outcomes ?? {})) t[`${v.population}.outcomes.${o}`] = (t[`${v.population}.outcomes.${o}`] ?? 0) + c;
    }
    return t;
  };
  const tc = totals("canonical");
  const tl = totals("legacy");
  const notConserved = [...new Set([...Object.keys(tc), ...Object.keys(tl)])].filter((k) => tc[k] !== tl[k]).sort(cmp);
  if (notConserved.length) unexplained += 1;
  const resolution = sameJson(artifacts.canonical.aggregates?.resolution ?? {}, artifacts.legacy.aggregates?.resolution ?? {});
  const byTarget = sameJson(artifacts.canonical.aggregates?.by_target ?? {}, artifacts.legacy.aggregates?.by_target ?? {});
  return { groups: rows, unexplained, conserved: notConserved.length === 0, notConserved, totals: tc, resolutionIdentical: resolution, byTargetIdentical: byTarget };
}

function differingFields(a, b) {
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => !sameJson(a[k] ?? null, b[k] ?? null)).sort(cmp);
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
    const reported = s.canonicalIdentity?.version;
    out.push(`Version reported by the scanner \`${reported ?? "n/a"}\`; ${s.pinnedVersion === "lockfile" ? "pinned by the credential-eval Node shim lockfile \`adapters/node/package-lock.json\`" : `credential-eval pins \`${s.pinnedVersion}\``}${s.pinOverridden ? " (**pin overridden**: both runs used the same binary, so the comparison is unaffected, but no absolute number from this run is a pinned-version number)" : " (pin respected)"}.`, "");
    if (s.canonicalIdentity) out.push(`Scanner provenance (artifact manifest): ${s.canonicalIdentity.components.map((c) => `${c.kind} \`${c.name}\`${c.version ? ` ${c.version}` : ""}${c.sha256 ? ` \`${c.sha256}\`` : " (no digest recorded)"}`).join("; ")}. Run class \`${s.canonicalIdentity.runClass}\`, publication \`${s.canonicalIdentity.publication}\`, status ${s.status?.canonical ?? "n/a"} / ${s.status?.legacy ?? "n/a"} (canonical / legacy), replays ${s.replays ? `${s.replays.canonical?.count} and ${s.replays.legacy?.count}, ${s.replays.canonical?.agreed && s.replays.legacy?.agreed ? "agreed" : "**disagreed**"}` : "n/a"}.`, "");
    if (s.canonicalIdentity) out.push(`Configuration hash \`${s.canonicalIdentity.configurationHash}\` (both runs: ${s.canonicalIdentity.configurationHash === s.legacyIdentity?.configurationHash ? "identical" : "**differs**"}).`, "");
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
    out.push(`| cases whose evidence tier differs (aggregate grouping only; not a per-case input) | ${n(c.tierDiffers)} |`);
    out.push(`| **unexplained drift** (findings or measurement differ while kind, spans, family and twin lineage are equal) | **${n(c.unexplained)}** |`, "");
    out.push("Cases whose inputs differ, by the input that differs:", "", "| Differing input | Cases | Of which measurement differs |", "| --- | --- | --- |");
    for (const [k, v] of Object.entries(c.inputDiffKinds).sort()) out.push(`| ${k} | ${n(v.cases)} | ${n(v.measurementDiffers)} |`);
    out.push("");
    const g = s.aggregates;
    if (g) {
      const t = g.totals;
      out.push(`Run-level aggregates (\`<kind>/<tier>\` groups): ${g.groups.filter((r) => r.identical).length} of ${g.groups.length} identical, **${g.unexplained} unexplained**; population totals over the scored groups ${g.conserved ? `conserved (controls: ${n(t["control.files"] ?? 0)} files, ${n(t["control.flagged_files"] ?? 0)} flagged, ${n(t["control.findings"] ?? 0)} findings; positives: ${n(t["positive.files"] ?? 0)} files, ${n(t["positive.leaked_bytes"] ?? 0)} of ${n(t["positive.secret_bytes"] ?? 0)} secret bytes leaked)` : `**not conserved**: ${g.notConserved.join(", ")}`}; assertion resolution ${g.resolutionIdentical ? "identical" : "differs"}, per-target aggregates ${g.byTargetIdentical ? "identical" : "differ"} (no methods and no \`grouping.targets\` in either snapshot, so both are empty).`, "");
      out.push("| Group | Files canonical / legacy | Cases in / out (canonical vs legacy) | Aggregate | Differing fields |", "| --- | --- | --- | --- | --- |");
      for (const r of g.groups) out.push(`| \`${r.group}\` | ${n(r.files.canonical)} / ${n(r.files.legacy)} | +${n(r.joined)} / -${n(r.left)} | ${r.identical ? "identical" : r.explained ? `differs, explained: ${r.reasons.join("; ")}` : "**differs, unexplained**"} | ${(r.differingFields ?? []).join(", ")} |`);
      out.push("");
    }
  }
  out.push("## How the explained differences map to the open cutover decisions", "");
  out.push("Every difference above has a cause recorded by a parity rule; none is harmless by being explained (`docs/migration/cutover-decision-brief.md`).", "");
  out.push("- **tier** and the moved cases of `must-not-flag/T2`/`T3`, `must-redact/T2` and `policy/T3`: the T2 to T3 downgrades (decision 1). The per-case measurement does not change; the per-tier aggregates do.");
  out.push("- **kind + expected spans** (`T0`), `pending/T0.candidate_kinds` and the `pending_files`/`measurable_share` of the `must-redact` groups: the unresolved (T0) span loss (decision 2).");
  out.push("- **family**: the per-fixture family links of multi-family Cases (decision 4).");
  out.push("- **twin lineage**: twins of unresolved positives projected without twin links (decision 2); **expected spans** alone: the one silent fixture that loses companion spans (decision 2).");
  out.push("- **kind** without span changes: must-redact T2 fixtures that project as `policy` T3 (decision 1).", "");
  const r = summary.revisions;
  const first = Object.values(summary.scanners).find((s) => s.canonicalIdentity)?.canonicalIdentity;
  out.push("## Reproduction", "");
  out.push(`- credential-eval \`${r.credentialEval}\` (${first?.engine ?? "n/a"}, ${first?.protocol ?? "n/a"}), built with \`CARGO_BUILD_JOBS=2 cargo build --release\`; Node shim installed with \`(cd adapters/node && npm ci --ignore-scripts)\`; Node ${summary.node}.`);
  out.push(`- credential-evidence \`${r.credentialEvidence}\` (the commit the run was made from; the snapshot digests above identify the content); legacy \`redact-secret-benchmarks\` at \`${r.legacy}\` (the importer pin).`);
  out.push("- gitleaks 8.30.1 and TruffleHog 3.97.4 provisioned into a read-only directory by the legacy `scripts/provision-peers.mjs` (archives checked against `scanners/peer-checksums.json`) and put first on `PATH`; the executable digests are in the provenance lines above.");
  out.push(`- Run configuration: credential-eval \`tools/parity/run-config.json\` (the configuration of its own parity run), one scanner at a time, \`--jobs ${summary.jobs}\`, \`--run-class ${summary.runClass}\`.`, "");
  out.push("```sh", "export PATH=\"<peer-bin>:$PATH\"", "node scripts/dual-run/dual-run.mjs --credential-eval <credential-eval> \\", "  --bin <credential-eval>/target/release/credential-eval --config <credential-eval>/tools/parity/run-config.json \\", "  --node-dir <credential-eval>/adapters/node --legacy <redact-secret-benchmarks> --work <scratch> \\", `  --jobs ${summary.jobs} --scanner gitleaks --scanner trufflehog --scanner redact-secret --scanner flare-redact --scanner openredaction \\`, "  --report docs/migration/dual-run-report.md", "```", "");
  out.push("Validate cheaply first: the same command with `--limit 20` runs about 26 cases per side (20 spread over the sorted ids plus the cases they are twins of) through every scanner. `--reuse` re-compares the artifacts already in `<scratch>` without running the scanners again.", "");
  if (summary.notRun.length) out.push("## Not run", "", ...summary.notRun.map((x) => `- ${x}`), "");
  out.push("## Not compared", "", "- Scanners other than those listed above were not run.", "- Evaluation methods (twin, benign, mutation, metamorphic, differential) and per-target aggregates: no run used `--methods`, and neither snapshot carries `grouping.targets` (a credential-eval configuration input).", "");
  return `${out.join("\n")}\n`;
}

function finish() {
  const text = JSON.stringify(summary, null, 2);
  writeFileSync(join(work, "dual-run-summary.json"), `${text}\n`);
  if (reportPath) writeFileSync(resolve(reportPath), render());
  console.log(text);
  process.exit(summary.notRun.length ? 3 : 0);
}
