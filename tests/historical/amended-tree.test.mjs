// The historical checks still reproduce the baseline at the pin when the tree carries canonical changes (ADR 0015).
//
// In a throwaway copy of the repository, a reviewed edit to a migrated record (declared) and a brand-new provider
// (family, source, scenario, case, fixture) are added. The importers must still reproduce the baseline manifest,
// the projection must still equal the committed manifest and parity must still report 0 unexplained with the same
// numbers as the untouched tree, because all three regenerate the baseline from the pinned legacy revision instead
// of reading the tree. And the checks must fail when the baseline is damaged: a mutated or deleted baseline file
// without a declaration, a tampered manifest digest.
//
// Needs the legacy checkout (LEGACY_BENCHMARKS_DIR or a sibling directory); REQUIRE_LEGACY=1 makes a missing one a failure.
//
// Hermetic against the live ledger (#86). The live tree may itself carry declared amendments and additions (that is the
// point of ADR 0015), so:
//   - the "untouched" runs use a plain copy of the live tree: the historical checks must pass over it, with the same output
//     as over the pristine baseline, whatever it carries;
//   - every test that mutates the tree starts from copyBaseline(): the baseline itself (amended records restored from the
//     pin, additions dropped, empty ledger), so "undeclared", "stale" and "wrote 0 file(s)" mean what the test says.

import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test, { before, describe } from "node:test";
import { AMENDMENTS_DIR, classifyTree, loadManifest, MANIFEST_PATH, serializeManifest } from "../../scripts/lib/baseline.mjs";
import { buildSnapshot } from "../../scripts/export/lib/projection.mjs";
import { loadBaselineFiles } from "../../scripts/migrate/lib/baseline-view.mjs";
import { findLegacyDir, LEGACY_REVISION } from "../../scripts/migrate/lib/legacy-source.mjs";
import { authorNewProvider, copyRepo } from "../repo-copy.mjs";
import { copyBaseline } from "./baseline-copy.mjs";

let legacyDir = null;
let skip = false;
try {
  legacyDir = findLegacyDir();
} catch (e) {
  skip = `legacy checkout unavailable: ${e.message.split("\n")[0]}`;
  if (process.env.REQUIRE_LEGACY) throw e;
}

const env = () => ({ LEGACY_BENCHMARKS_DIR: legacyDir });
const HISTORICAL = [
  ["migrate:taxonomy:check", "migrate/import-taxonomy.mjs", ["--check"]],
  ["migrate:cases:check", "migrate/import-cases.mjs", ["--check"]],
  ["migrate:narratives:check", "migrate/import-narratives.mjs", ["--check"]],
  ["export:legacy:check", "export/legacy-projection.mjs", ["--check"]],
  ["parity:check", "parity/run.mjs", ["--check"]],
];
const out = (r) => `${r.stdout}${r.stderr}`;

describe("historical checks over a tree with canonical changes", { skip }, () => {
  let untouched;
  before(() => {
    const c = copyRepo();
    try {
      untouched = Object.fromEntries(HISTORICAL.map(([name, script, args]) => [name, c.run(script, args, env())]));
    } finally {
      c.cleanup();
    }
  });

  test("the live tree, whatever amendments and additions it declares, passes every historical check, with 0 unexplained parity differences", () => {
    for (const [name, r] of Object.entries(untouched)) assert.equal(r.status, 0, `${name}: ${out(r)}`);
    assert.match(untouched["parity:check"].stdout, /unexplained 0,/);
  });

  test("the live tree's declared amendments change none of the historical output: it equals the pristine baseline's, byte for byte", async () => {
    assert.deepEqual(classifyTree().problems, [], "the live tree is a valid baseline plus declared amendments");
    const c = await copyBaseline({ legacyDir });
    try {
      for (const [name, script, args] of HISTORICAL) {
        const r = c.run(script, args, env());
        assert.equal(r.status, 0, `${name}: ${out(r)}`);
        assert.equal(r.stdout, untouched[name].stdout, name);
      }
    } finally {
      c.cleanup();
    }
  });

  test("(c) with an amended record and a brand-new provider in the tree, the baseline is reproduced and the projection and parity are unchanged", async () => {
    const c = await copyBaseline({ legacyDir });
    try {
      const path = loadManifest().files.find((f) => f.path.startsWith("records/families/")).path;
      const abs = join(c.root, path);
      const rec = JSON.parse(readFileSync(abs, "utf8"));
      rec.description = `${rec.description} Amended by a reviewed change.`;
      writeFileSync(abs, `${JSON.stringify(rec, null, 2)}\n`);
      assert.equal(c.run("baseline.mjs", ["amend", path, "--reason", "Amended by a reviewed change to prove reproducibility"]).status, 0);
      authorNewProvider(c);
      assert.equal(c.run("baseline.mjs", ["check"]).status, 0);

      for (const [name, script, args] of HISTORICAL) {
        const r = c.run(script, args, env());
        assert.equal(r.status, 0, `${name}: ${out(r)}`);
        // same numbers, same digests as the untouched tree: the tree's changes cannot reach them
        assert.equal(r.stdout, untouched[name].stdout, name);
      }
    } finally {
      c.cleanup();
    }
  });

  test("(c) a baseline record removed with a declaration does not stop the baseline being reproduced; parity stays at 0 unexplained", async () => {
    const c = await copyBaseline({ legacyDir });
    try {
      const path = loadManifest().files.find((f) => f.path.startsWith("records/reviews/")).path;
      rmSync(join(c.root, path));
      assert.equal(c.run("baseline.mjs", ["amend", path, "--reason", "Withdrawn by a reviewed change to prove reproducibility"]).status, 0);
      for (const [name, script, args] of HISTORICAL.slice(3)) {
        const r = c.run(script, args, env());
        assert.equal(r.status, 0, `${name}: ${out(r)}`);
        assert.equal(r.stdout, untouched[name].stdout, name);
      }
    } finally {
      c.cleanup();
    }
  });

  test("(c) a deleted or mutated baseline record without a declaration fails the baseline check that historical:check starts with", async () => {
    const c = await copyBaseline({ legacyDir });
    try {
      const list = loadManifest().files;
      const edited = list.find((f) => f.path.startsWith("records/sources/")).path;
      const deleted = list.find((f) => f.path.startsWith("records/contracts/")).path;
      writeFileSync(join(c.root, edited), `${readFileSync(join(c.root, edited), "utf8").trimEnd()}\n\n`);
      rmSync(join(c.root, deleted));
      const r = c.run("baseline.mjs", ["check"]);
      assert.equal(r.status, 1);
      assert.match(r.stderr, new RegExp(`undeclared edited: ${edited}`));
      assert.match(r.stderr, new RegExp(`undeclared removed: ${deleted}`));
    } finally {
      c.cleanup();
    }
  });

  test("(c) a tampered manifest, or a changed importer input, is not reproduced: the importer checks fail", () => {
    const c = copyRepo();
    try {
      const m = loadManifest();
      const tampered = structuredClone(m);
      const target = tampered.files.find((f) => f.owner === "migrate:taxonomy" && f.path.startsWith("records/families/"));
      target.sha256 = "a".repeat(64);
      writeFileSync(join(c.root, MANIFEST_PATH), serializeManifest(tampered));
      const r = c.run("migrate/import-taxonomy.mjs", ["--check"], env());
      assert.equal(r.status, 1);
      assert.match(r.stderr, new RegExp(`differs from the baseline manifest: ${target.path}`));
      assert.match(r.stderr, /does not reproduce the baseline manifest/);
      // the other importers' slices are untouched and still pass
      assert.equal(c.run("migrate/import-cases.mjs", ["--check"], env()).status, 0);

      writeFileSync(join(c.root, MANIFEST_PATH), serializeManifest(m));
      const authored = join(c.root, "scripts/migrate/authored/scenarios.mjs");
      writeFileSync(authored, readFileSync(authored, "utf8").replace(/title: "([^"]+)"/, 'title: "$1 (edited)"'));
      const cases = c.run("migrate/import-cases.mjs", ["--check"], env());
      assert.equal(cases.status, 1, out(cases));
      assert.match(cases.stderr, /does not reproduce the baseline manifest/);
    } finally {
      c.cleanup();
    }
  });

  test("a re-import refuses to overwrite declared amendments and never deletes or overwrites a post-import file", async () => {
    const c = await copyBaseline({ legacyDir });
    try {
      authorNewProvider(c);
      const added = join(c.root, "records/providers/synthvendor.json");
      const before = readFileSync(added, "utf8");
      const ok = c.run("migrate/import-taxonomy.mjs", [], env());
      assert.equal(ok.status, 0, out(ok));
      assert.match(ok.stdout, /wrote 0 file\(s\), removed 0 stale/);
      assert.equal(readFileSync(added, "utf8"), before, "a post-import file is untouched by a re-import");
      assert.ok(existsSync(join(c.root, "records/cases/synth-key-in-env-line.json")));

      const path = loadManifest().files.find((f) => f.path.startsWith("records/families/")).path;
      writeFileSync(join(c.root, path), `${readFileSync(join(c.root, path), "utf8").trimEnd()}\n\n`);
      assert.equal(c.run("baseline.mjs", ["amend", path, "--reason", "Whitespace normalised by a reviewed change"]).status, 0);
      const refused = c.run("migrate/import-taxonomy.mjs", [], env());
      assert.equal(refused.status, 1);
      assert.match(refused.stderr, new RegExp(`${AMENDMENTS_DIR.replaceAll(".", "\\.")}/ declares 1 amendment`));
      assert.match(readFileSync(join(c.root, path), "utf8"), /\n\n$/, "the amended record was not overwritten");
    } finally {
      c.cleanup();
    }
  });

  test("the baseline view regenerates from the pin when a record is amended, and equals the manifest byte for byte", async () => {
    const c = await copyBaseline({ legacyDir });
    try {
      // the baseline tree is read as it is; the same tree with one amended record is regenerated from the pin
      const clean = await loadBaselineFiles({ root: c.root, legacyDir });
      assert.equal(clean.source, "tree");
      const path = loadManifest().files.find((f) => f.path.startsWith("records/families/")).path;
      writeFileSync(join(c.root, path), `${readFileSync(join(c.root, path), "utf8").trimEnd()}\n\n`);
      assert.equal(c.run("baseline.mjs", ["amend", path, "--reason", "Whitespace normalised by a reviewed change"]).status, 0);
      const view = await loadBaselineFiles({ root: c.root, legacyDir });
      assert.equal(view.source, "regenerated");
      assert.deepEqual([...view.files.keys()], [...clean.files.keys()]);
      for (const [p, bytes] of clean.files) assert.ok(bytes.equals(view.files.get(p)), p);
    } finally {
      c.cleanup();
    }
  });

  test("the release snapshot of the baseline equals the legacy projection's snapshot: one definition, two callers", async () => {
    // Moved here from tests/canonical-change.test.mjs (#86). It asserts the baseline, and the ordinary tier can only read the
    // baseline from the tree while no record is amended: with a declared amendment loadBaselineInputs regenerates it from the
    // pinned legacy revision, which `verify` does not have. Same assertion, in the tier that does.
    const { generate, loadBaselineInputs } = await import("../../scripts/export/legacy-projection.mjs");
    const inputs = await loadBaselineInputs({ legacyDir });
    const { projection } = generate(inputs);
    assert.equal(buildSnapshot(inputs).text, projection.artifacts.get("credential-eval/corpus-snapshot.json"));
  });

  test("the legacy side is read at the pinned revision, never at the benchmark checkout's HEAD", () => {
    assert.match(LEGACY_REVISION, /^[0-9a-f]{40}$/);
    // every reader of the legacy checkout goes through legacy-source.mjs, which extracts the pin with `git archive`
    const source = readFileSync(new URL("../../scripts/migrate/lib/legacy-source.mjs", import.meta.url), "utf8");
    assert.match(source, /"archive", "--format=tar", revision/);
    assert.match(source, /export const LEGACY_REVISION = "1020d2b5905e8973098235e57c4cdca3359bba57"/);
  });
});
