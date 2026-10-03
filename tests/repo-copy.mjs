// Test helper: a throwaway copy of this repository's checkable content (scripts, schemas, examples, records, the
// legacy map, the migration documents and the research documents) in a temp directory, with `node_modules`
// linked. Every script derives its repository root from its own location, so running a script from the copy
// checks the copy: a test can add or amend records there and run the real gates over the result without
// touching the repository or committing demo records (ADR 0015).
//
// The copy is a faithful copy of the live tree, including whatever baseline amendments the tree declares: a test that
// needs "an unamended record" picks one with `untouchedRecord`, and a test that needs the pristine baseline itself
// (historical tier, legacy checkout available) uses `copyBaseline`. Neither assumes an empty amendments ledger (#86).

import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { classifyTree } from "../scripts/lib/baseline.mjs";
import { loadIndex } from "../scripts/lib/scaffold.mjs";
import { repoRoot } from "../scripts/lib/validator.mjs";

const DATE = "2026-10-03";
const write = (c, rel, record) => writeFileSync(join(c.root, rel), `${JSON.stringify(record, null, 2)}\n`);
const read = (c, rel) => JSON.parse(readFileSync(join(c.root, rel), "utf8"));

const COPIED = ["scripts", "schemas", "examples", "records", "migration", "docs/migration", "docs/research", "package.json"];

/**
 * The node_modules directory the repository's own code resolves its dependencies from. A worktree has none of its own
 * until `npm ci` runs in it, yet may resolve ajv from the main checkout further up the directory tree; a temp copy under
 * tmpdir() cannot, so it is linked to the directory that really holds them. With no install anywhere: a clear error
 * instead of ERR_MODULE_NOT_FOUND from deep inside a child process.
 */
export function installedModulesDir() {
  try {
    return dirname(dirname(createRequire(join(repoRoot, "package.json")).resolve("ajv/package.json")));
  } catch {
    throw new Error(`dependencies are not installed: ajv does not resolve from ${repoRoot}. Run \`npm ci --ignore-scripts\` in this checkout first (a worktree does not share node_modules with the main checkout).`);
  }
}

export function copyRepo() {
  const modules = installedModulesDir();
  const root = mkdtempSync(join(tmpdir(), "ce-copy-"));
  for (const p of COPIED) cpSync(join(repoRoot, p), join(root, p), { recursive: true });
  symlinkSync(modules, join(root, "node_modules"));
  /** Run `node scripts/<script> ...args` in the copy. */
  const run = (script, args = [], env = {}) => spawnSync(process.execPath, [join(root, "scripts", script), ...args], { cwd: root, encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 1 << 28 });
  return { root, run, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

const live = classifyTree();
const untouched = new Set(live.unchanged);

/** The live tree's baseline classification in numbers, for expectations that must hold whatever the ledger declares. */
export const liveCounts = () => ({ edited: live.edited.length, removed: live.removed.length, added: live.added.length });

/** Baseline paths under `prefix` that the live tree holds byte for byte (so declared nowhere), in manifest order. */
export const untouchedRecords = (prefix) => live.manifest.files.map((f) => f.path).filter((p) => p.startsWith(prefix) && untouched.has(p));

/** The first such path: a record a test may edit or remove in a copy and expect "undeclared" until it declares it. */
export function untouchedRecord(prefix) {
  const [path] = untouchedRecords(prefix);
  if (!path) throw new Error(`no unamended baseline record under ${prefix}: every one is declared in the live ledger`);
  return path;
}

/** Author a synthetic provider, family, source, scenario, case and fixture the way the research skills do (record:new, then write the fields). */
export function authorNewProvider(c) {
  const rn = (...a) => {
    const r = c.run("record-new.mjs", [...a, "--date", DATE]);
    assert.equal(r.status, 0, `${a.slice(0, 2).join(" ")}: ${r.stderr}${r.stdout}`);
  };
  rn("provider", "synthvendor", "--name", "Synth Vendor");
  rn("family", "synthvendor:api-key", "--name", "API key", "--description", "A key the vendor documents for server-to-server calls.");
  rn("source", "https://docs.example.org/synthvendor/api-keys", "--source-type", "provider-documentation", "--observer", "test-agent", "--title", "Synth Vendor API keys");
  const source = loadIndex(c.root).find((e) => e.record.kind === "evidence-source" && e.record.locator.url === "https://docs.example.org/synthvendor/api-keys").record;

  rn("scenario", "synth-key-in-quoted-env", "--title", "Key in a quoted environment value", "--family", "synthvendor:api-key");
  const scenarioPath = "records/scenarios/synth-key-in-quoted-env.json";
  const scenario = read(c, scenarioPath);
  scenario.description = "A credential-shaped value appears inside a quoted value of an environment-style assignment.";
  scenario.semantics = "Quoting the value does not change whether it is a credential: the value inside the quotes is judged on its own format.";
  scenario.applicability.rationale = "Every family that documents a bare assignable key can appear in a quoted assignment.";
  scenario.evidenceBasis.rationale = "No source states an outcome class for this carrier yet; the scenario records the question, not an answer.";
  write(c, scenarioPath, scenario);

  rn("case", "synth-key-in-env-line", "--title", "Key in an env line", "--type", "positive", "--family", "synthvendor:api-key=subject", "--scenario", "synth-key-in-quoted-env");
  const casePath = "records/cases/synth-key-in-env-line.json";
  const rec = read(c, casePath);
  rec.summary = "A documented key assigned in an environment-style line.";
  rec.rationale = "The value follows the documented key grammar.";
  rec.expectation = { outcome: "must-flag", basis: "provider-documented", rationale: "Matches the documented grammar.", sources: [{ sourceId: source.id, supports: "Documents the key grammar." }], observedAt: DATE };
  write(c, casePath, rec);

  const value = "svk_SYNTHETIC0000000000000000";
  rn("fixture", "synth-key-in-env-line", "--set", "synthvendor-authored", "--name", "env-line", "--text", `SYNTH_API_KEY="${value}"\n`, "--secret", value, "--context", "shell-assignment", "--title", "Synth Vendor authored fixtures");
  return { source, value };
}

