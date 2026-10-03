// Test helper: a throwaway copy of this repository's checkable content (scripts, schemas, examples, records, the
// legacy map, the migration documents and the research documents) in a temp directory, with `node_modules`
// linked. Every script derives its repository root from its own location, so running a script from the copy
// checks the copy: a test can add or amend records there and run the real gates over the result without
// touching the repository or committing demo records (ADR 0015).

import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadIndex } from "../scripts/lib/scaffold.mjs";
import { repoRoot } from "../scripts/lib/validator.mjs";

const DATE = "2026-10-03";
const write = (c, rel, record) => writeFileSync(join(c.root, rel), `${JSON.stringify(record, null, 2)}\n`);
const read = (c, rel) => JSON.parse(readFileSync(join(c.root, rel), "utf8"));

const COPIED = ["scripts", "schemas", "examples", "records", "migration", "docs/migration", "docs/research", "package.json"];

export function copyRepo() {
  const root = mkdtempSync(join(tmpdir(), "ce-copy-"));
  for (const p of COPIED) cpSync(join(repoRoot, p), join(root, p), { recursive: true });
  symlinkSync(join(repoRoot, "node_modules"), join(root, "node_modules"));
  /** Run `node scripts/<script> ...args` in the copy. */
  const run = (script, args = [], env = {}) => spawnSync(process.execPath, [join(root, "scripts", script), ...args], { cwd: root, encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 1 << 28 });
  return { root, run, cleanup: () => rmSync(root, { recursive: true, force: true }) };
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

