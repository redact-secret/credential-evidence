// Canonical research changes pass the ordinary gate (ADR 0015, issue #79).
//
// Both changes are made in a throwaway copy of the repository, never in records/:
//   (a) an authored edit to a record the importers produced (a migrated record), and
//   (b) a brand-new provider, family, source, scenario, case and fixture (synthetic).
// The ordinary gate is what a pull request and every push run: schema validation, identity and narrative
// lint, the baseline check, fixture materialization and the release snapshot (the coverage report generates on demand). None of
// them needs the legacy checkout. Before the split, either change failed migrate:*:check, export:legacy:check,
// parity:check and the tests that assert the imported set.
//
// Hermetic against the live ledger (#86): the copy carries the live amendments, so each test edits a record the live tree
// still holds unchanged (untouchedRecord) and derives its counts from the live tree, not from the imported set's size at
// the pin. The release-snapshot-equals-projection test needs the baseline itself and moved to tests/historical/amended-tree.

import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { buildSnapshot } from "../scripts/export/lib/projection.mjs";
import { loadCanonicalInputs } from "../scripts/export/lib/source.mjs";
import { authorNewProvider, copyRepo, liveCounts, untouchedRecord, untouchedRecords } from "./repo-copy.mjs";

const DATE = "2026-10-03";

/** The ordinary gate, as CI runs it, over a copy. Returns the failing steps (empty: green). */
function ordinaryGate(c) {
  const steps = [
    ["validate", "validate.mjs", []],
    ["lint:identity", "lint-identity.mjs", []],
    ["lint:narrative", "lint-narrative.mjs", []],
    ["baseline:check", "baseline.mjs", ["check"]],
    ["fixtures:materialize:check", "materialize-fixtures.mjs", ["--check"]],
  ];
  const failures = [];
  for (const [name, script, args] of steps) {
    const r = c.run(script, args);
    if (r.status !== 0) failures.push(`${name}: ${(r.stderr + r.stdout).split("\n").slice(0, 6).join(" | ")}`);
  }
  // the coverage report is generated on demand, never committed or checked (#88): it must still generate over the change
  const regen = c.run("coverage-gaps.mjs", []);
  if (regen.status !== 0) failures.push(`coverage:gaps: ${regen.stderr}`);
  return failures;
}

const write = (c, rel, record) => writeFileSync(join(c.root, rel), `${JSON.stringify(record, null, 2)}\n`);
const read = (c, rel) => JSON.parse(readFileSync(join(c.root, rel), "utf8"));
/** How many fixtures the live tree materializes: the baseline's 5,950 plus whatever reviewed changes added. */
const liveFixtureCount = () => buildSnapshot(loadCanonicalInputs()).fixtures;

test("(a) an authored edit to a migrated record passes the ordinary gate once it is declared", () => {
  const c = copyRepo();
  try {
    const path = untouchedRecord("records/families/");
    const before = liveFixtureCount();
    const rec = read(c, path);
    rec.description = `${rec.description} Re-read against the vendor documentation.`;
    write(c, path, rec);

    // everything the edit is judged on except the baseline declaration is already green: the record is simply valid
    const undeclared = ordinaryGate(c);
    assert.equal(undeclared.length, 1, undeclared.join("\n"));
    assert.match(undeclared[0], /^baseline:check: .*undeclared edited/);

    const amend = c.run("baseline.mjs", ["amend", path, "--reason", "Description restated after re-reading the vendor documentation", "--ref", "#79"]);
    assert.equal(amend.status, 0, amend.stderr);
    assert.deepEqual(ordinaryGate(c), []);

    // the release snapshot is built from the amended tree, with every fixture and no legacy name
    const { snapshot, fixtures } = buildSnapshot(loadCanonicalInputs(c.root));
    assert.equal(fixtures, before);
    assert.equal(snapshot.cases.length, before);
  } finally {
    c.cleanup();
  }
});

test("(a) the freshness tool appends an observation to an imported source and declares its own amendment", () => {
  const c = copyRepo();
  try {
    const src = untouchedRecord("records/sources/");
    const id = read(c, src).id;
    const r = c.run("source-observe.mjs", [id, "--outcome", "unchanged", "--observer", "test-agent", "--observed-at", DATE]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /declared baseline amendment \(edited\)/);
    assert.deepEqual(ordinaryGate(c), []);
  } finally {
    c.cleanup();
  }
});

test("(b) a brand-new provider, family, source, scenario, case and fixture pass the ordinary gate with no amendment", () => {
  const c = copyRepo();
  try {
    const before = liveFixtureCount();
    const live = liveCounts();
    const { value } = authorNewProvider(c);
    assert.deepEqual(ordinaryGate(c), []);

    const base = c.run("baseline.mjs", ["check", "--list"]);
    assert.equal(base.status, 0, base.stderr);
    assert.match(base.stdout, new RegExp(`${live.edited} edited, ${live.removed} removed \\(all declared\\); \\d+ post-import file\\(s\\) added`));
    for (const p of ["records/providers/synthvendor.json", "records/families/synthvendor/api-key.json", "records/scenarios/synth-key-in-quoted-env.json", "records/cases/synth-key-in-env-line.json", "records/fixtures/synthvendor-authored.json"]) assert.match(base.stdout, new RegExp(`added: ${p.replaceAll(".", "\\.")}`));

    // the fixture is materialized and in the release snapshot; the snapshot is deterministic
    const mat = c.run("materialize-fixtures.mjs", ["--check"]);
    assert.match(mat.stdout, new RegExp(`${before + 1} fixture\\(s\\)`));
    const inputs = loadCanonicalInputs(c.root);
    const first = buildSnapshot(inputs);
    assert.equal(first.fixtures, before + 1);
    assert.ok(first.snapshot.cases.some((x) => x.id === "synthvendor-authored--env-line" && x.content.includes(value)));
    assert.equal(buildSnapshot(loadCanonicalInputs(c.root)).text, first.text);
    assert.equal(first.snapshot.cases.find((x) => x.id === "synthvendor-authored--env-line").grouping.family, "synthvendor:api-key");

    // an amended and an added record together
    const path = untouchedRecord("records/families/");
    const rec = read(c, path);
    rec.description = `${rec.description} Edited together with the new provider.`;
    write(c, path, rec);
    assert.equal(c.run("baseline.mjs", ["amend", path, "--reason", "Edited in the same reviewed change as a new provider"]).status, 0);
    assert.deepEqual(ordinaryGate(c), []);
  } finally {
    c.cleanup();
  }
});

test("(a) appending an event to an imported review history declares its own amendment and passes the ordinary gate", () => {
  const c = copyRepo();
  try {
    // an imported review history the live ledger does not already declare, whatever its subject
    const history = untouchedRecords("records/reviews/").map((p) => read(c, p)).find((r) => r.kind === "evidence-review-history" && ["family", "case", "scenario", "variant", "benign-sibling", "format-contract"].includes(r.subject.kind));
    const r = c.run("record-new.mjs", ["review", `${history.subject.kind}:${history.subject.id}`, "--append", "--event", "observed", "--verdict", "inconclusive", "--actor", "test-agent", "--role", "automation", "--note", "Re-read the documentation; nothing changed.", "--date", DATE]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /declared baseline amendment \(edited\)/);
    assert.deepEqual(ordinaryGate(c), []);
  } finally {
    c.cleanup();
  }
});
