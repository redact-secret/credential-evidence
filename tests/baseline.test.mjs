// The import baseline against the working tree (ADR 0015): classification, amendments, immutable references.
// No legacy checkout is needed; every mutation happens in a throwaway copy of the repository.
//
// Hermetic against the live ledger (#86): the copy carries whatever amendments docs/migration/baseline-amendments/
// declares (one file per amendment, ADR 0015 addendum 1), so a test mutates a record the live tree still holds unchanged (untouchedRecord) and states its expectations
// relative to the live classification (liveCounts), never as absolute numbers. The same assertions hold for an empty ledger
// and for a ledger with any number of declared edits; tests/ledger-hermetic.test.mjs runs this file against a non-empty one.

import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  AMENDMENTS_DIR,
  amendmentFileName,
  amendmentId,
  baselineDigest,
  classifyTree,
  declareAmendment,
  loadAmendments,
  loadManifest,
  manifestProblems,
  MANIFEST_PATH,
  serializeAmendment,
  serializeManifest,
  writeAmendment,
} from "../scripts/lib/baseline.mjs";
import { repoRoot } from "../scripts/lib/validator.mjs";
import { copyRepo, liveCounts, untouchedRecord } from "./repo-copy.mjs";

const manifest = loadManifest();
const firstRecord = untouchedRecord;
const n = (x) => x.toLocaleString("en-US");
/** "<edited> edited, <removed> removed (all declared); <added> post-import file(s) added" for the live tree plus a delta. */
const counts = ({ edited = 0, removed = 0, added = 0 } = {}) => {
  const live = liveCounts();
  return new RegExp(`${n(live.edited + edited)} edited, ${n(live.removed + removed)} removed \\(all declared\\); ${n(live.added + added)} post-import file\\(s\\) added`);
};

test("the repository's tree is its baseline plus declared amendments: classification is clean", () => {
  const c = classifyTree();
  assert.deepEqual(c.problems, []);
  assert.equal(c.unchanged.length + c.edited.length + c.removed.length, manifest.files.length);
});

test("the manifest is canonical: sorted, owned by the three importers, digest self-consistent, round-trips byte for byte", () => {
  assert.deepEqual(manifestProblems(manifest), []);
  assert.equal(manifest.baselineDigest, baselineDigest(manifest.files));
  assert.deepEqual([...new Set(manifest.files.map((f) => f.owner))].sort(), ["migrate:cases", "migrate:narratives", "migrate:taxonomy"]);
  assert.equal(readFileSync(join(repoRoot, MANIFEST_PATH), "utf8"), serializeManifest(manifest));
  assert.equal(manifest.legacy.revision, "1020d2b5905e8973098235e57c4cdca3359bba57");
  // immutable references are in it: the legacy map and the four importer reports
  for (const p of ["docs/migration/taxonomy-report.md", "docs/migration/cases-report.md", "docs/migration/reclassification-report.md", "docs/migration/narrative-report.md"]) assert.ok(manifest.files.some((f) => f.path === p), p);
  assert.ok(manifest.files.some((f) => f.path.startsWith("migration/legacy-map/")));
  const tampered = structuredClone(manifest);
  tampered.files[3].sha256 = "0".repeat(64);
  assert.ok(manifestProblems(tampered).some((p) => /baselineDigest/.test(p)));
  assert.ok(manifestProblems({ ...manifest, files: [...manifest.files].reverse() }).length);
});

test("the amendments ledger is one canonical, content-named file per declaration", () => {
  const { amendments, problems, files } = loadAmendments();
  assert.deepEqual(problems, []);
  const onDisk = readdirSync(join(repoRoot, AMENDMENTS_DIR)).sort();
  assert.deepEqual(onDisk, amendments.map((a) => files.get(a)).sort(), "every file in the directory is a loaded declaration");
  for (const a of amendments) {
    assert.equal(files.get(a), amendmentFileName(a), "the file name is derived from path, change and reason");
    assert.match(files.get(a), /^[^/]+\.[0-9a-f]{12}\.json$/);
    assert.equal(readFileSync(join(repoRoot, AMENDMENTS_DIR, files.get(a)), "utf8"), serializeAmendment(a));
  }
});

test("the amendment id is a pure function of path, change and reason; ref is not part of it", () => {
  const a = { path: "records/families/x/y.json", change: "edited", reason: "a long enough reason" };
  assert.equal(amendmentId(a), amendmentId({ ...a, ref: "#1" }));
  assert.match(amendmentId(a), /^[0-9a-f]{12}$/);
  assert.notEqual(amendmentId(a), amendmentId({ ...a, change: "removed" }));
  assert.notEqual(amendmentId(a), amendmentId({ ...a, reason: "another long enough reason" }));
  assert.notEqual(amendmentId(a), amendmentId({ ...a, path: "records/families/x/z.json" }));
  assert.equal(amendmentFileName(a), `families__x__y.${amendmentId(a)}.json`);
  assert.ok(amendmentFileName({ ...a, path: `records/${"d/".repeat(200)}y.json` }).length < 130, "a long path keeps a bounded file name");
});

test("an edited baseline record fails until it is declared with a cause; then it passes and is counted", () => {
  const c = copyRepo();
  try {
    const path = firstRecord("records/families/");
    const abs = join(c.root, path);
    const rec = JSON.parse(readFileSync(abs, "utf8"));
    rec.description = `${rec.description} Reviewed against the vendor's current documentation.`;
    writeFileSync(abs, `${JSON.stringify(rec, null, 2)}\n`);

    const undeclared = c.run("baseline.mjs", ["check"]);
    assert.equal(undeclared.status, 1);
    assert.match(undeclared.stderr, new RegExp(`undeclared edited: ${path}`));
    assert.match(undeclared.stderr, /baseline:amend/);

    const noReason = c.run("baseline.mjs", ["amend", path]);
    assert.equal(noReason.status, 1);
    assert.match(noReason.stderr, /--reason needs at least/);
    const shortReason = c.run("baseline.mjs", ["amend", path, "--reason", "fix"]);
    assert.equal(shortReason.status, 1);

    const declared = c.run("baseline.mjs", ["amend", path, "--reason", "Description widened after reading the vendor documentation", "--ref", "#79"]);
    assert.equal(declared.status, 0, declared.stderr);
    const ok = c.run("baseline.mjs", ["check"]);
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, counts({ edited: 1 }));
    const ledger = loadAmendments(c.root).amendments;
    assert.equal(ledger.length, loadAmendments().amendments.length + 1, "the live declarations are kept and one file is added");
    assert.deepEqual(ledger.find((a) => a.path === path), { path, change: "edited", reason: "Description widened after reading the vendor documentation", ref: "#79" });

    // reverting the edit makes the declaration stale: the ledger cannot outlive its cause
    writeFileSync(abs, readFileSync(join(repoRoot, path)));
    const stale = c.run("baseline.mjs", ["check"]);
    assert.equal(stale.status, 1);
    assert.match(stale.stderr, /stale amendment/);
  } finally {
    c.cleanup();
  }
});

test("a removed baseline record fails until it is declared as removed", () => {
  const c = copyRepo();
  try {
    const path = firstRecord("records/reviews/");
    rmSync(join(c.root, path));
    const r = c.run("baseline.mjs", ["check", "--list"]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, new RegExp(`undeclared removed: ${path}`));
    assert.match(r.stdout, new RegExp(`removed: ${path}`));
    assert.equal(c.run("baseline.mjs", ["amend", path, "--reason", "Withdrawn: the page it describes no longer exists"]).status, 0);
    const ok = c.run("baseline.mjs", ["check"]);
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, counts({ removed: 1 }));
    // declaring it as edited while it is gone is a contradiction
    const ledger = loadAmendments(c.root);
    const declared = ledger.amendments.find((a) => a.path === path);
    rmSync(join(c.root, AMENDMENTS_DIR, ledger.files.get(declared)));
    writeAmendment({ ...declared, change: "edited" }, c.root);
    assert.match(c.run("baseline.mjs", ["check"]).stderr, /is removed but .* says edited/);
  } finally {
    c.cleanup();
  }
});

test("the importer reports and the legacy map are immutable references: no amendment can excuse an edit", () => {
  const c = copyRepo();
  try {
    for (const path of ["docs/migration/cases-report.md", firstRecord("migration/legacy-map/")]) {
      const abs = join(c.root, path);
      const before = readFileSync(abs);
      writeFileSync(abs, `${before.toString("utf8")}\n`);
      const r = c.run("baseline.mjs", ["check"]);
      assert.equal(r.status, 1, path);
      assert.match(r.stderr, new RegExp(`edited immutable reference: ${path.replaceAll(".", "\\.")}`));
      const amend = c.run("baseline.mjs", ["amend", path, "--reason", "an attempt to excuse an immutable reference"]);
      assert.equal(amend.status, 1);
      assert.match(amend.stderr, /immutable reference/);
      writeFileSync(abs, before);
    }
    // a hand-written amendment for an immutable path is refused as well
    const path = "docs/migration/cases-report.md";
    writeAmendment({ path, change: "edited", reason: "an attempt to excuse an immutable reference" }, c.root);
    const forged = c.run("baseline.mjs", ["check"]);
    assert.equal(forged.status, 1);
    assert.match(forged.stderr, /only records under records\/ can be amended/);
  } finally {
    c.cleanup();
  }
});

test("a file the baseline does not list is an addition: allowed, counted, never an amendment; the legacy map is closed", () => {
  const c = copyRepo();
  try {
    const family = JSON.parse(readFileSync(join(c.root, firstRecord("records/families/")), "utf8"));
    writeFileSync(join(c.root, "records/families/aaa-new-provider-key.json"), `${JSON.stringify({ ...family, id: "aaa-new:key" }, null, 2)}\n`);
    const r = c.run("baseline.mjs", ["check", "--list"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /added: records\/families\/aaa-new-provider-key\.json/);
    assert.match(r.stdout, counts({ added: 1 }));
    const refused = c.run("baseline.mjs", ["amend", "records/families/aaa-new-provider-key.json", "--reason", "a new record needs no amendment"]);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /not in the baseline/);
    writeFileSync(join(c.root, "migration/legacy-map/zzz-new.json"), "{}\n");
    const closed = c.run("baseline.mjs", ["check"]);
    assert.equal(closed.status, 1);
    assert.match(closed.stderr, /added under migration\/.*closed/);
  } finally {
    c.cleanup();
  }
});

test("a declaration for a path the baseline does not list, a forged or stray ledger file and a malformed manifest are refused", () => {
  const c = copyRepo();
  try {
    const path = firstRecord("records/families/");
    const dir = join(c.root, AMENDMENTS_DIR);
    // Reset to the live ledger, not an empty one: emptying it would turn every declared edit of the live tree into an
    // "undeclared edited" problem, and `baseline.mjs check` prints only the first 40 problems, so once the live tree has
    // more than 40 declared edits the problem under test is cut off the output (#102).
    const liveLedger = join(repoRoot, AMENDMENTS_DIR);
    const fresh = () => {
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
      if (existsSync(liveLedger)) cpSync(liveLedger, dir, { recursive: true });
    };
    fresh();
    writeAmendment({ path: "records/families/nope/none.json", change: "edited", reason: "a path the baseline never had" }, c.root);
    assert.match(c.run("baseline.mjs", ["check"]).stderr, /path the baseline does not list/);

    // a file whose name does not match its content (an edited reason, a renamed file) is refused
    fresh();
    const a = { path, change: "edited", reason: "a long enough reason" };
    writeFileSync(join(dir, amendmentFileName({ ...a, reason: "a different reason entirely" })), serializeAmendment(a));
    assert.match(c.run("baseline.mjs", ["check"]).stderr, /the file name must be/);
    // not canonical bytes, not JSON, an unknown field, a stray non-JSON file
    fresh();
    writeFileSync(join(dir, amendmentFileName(a)), JSON.stringify({ format: "credential-evidence/baseline-amendment", formatVersion: 1, ...a }));
    assert.match(c.run("baseline.mjs", ["check"]).stderr, /not in canonical form/);
    writeFileSync(join(dir, "broken.json"), "{");
    assert.match(c.run("baseline.mjs", ["check"]).stderr, /not valid JSON/);
    writeFileSync(join(dir, "notes.txt"), "x");
    assert.match(c.run("baseline.mjs", ["check"]).stderr, /only amendment \.json files/);
    fresh();
    writeFileSync(join(dir, amendmentFileName(a)), serializeAmendment({ ...a, ref: "#1" }).replace('"change"', '"surprise": 1,\n  "change"'));
    assert.match(c.run("baseline.mjs", ["check"]).stderr, /unknown field/);
    // an absent directory is a valid, empty ledger
    rmSync(dir, { recursive: true, force: true });
    assert.equal(loadAmendments(c.root).problems.length, 0);

    const m = JSON.parse(readFileSync(join(c.root, MANIFEST_PATH), "utf8"));
    m.files.find((f) => f.path === path).sha256 = "1".repeat(64);
    writeFileSync(join(c.root, MANIFEST_PATH), JSON.stringify(m));
    const bad = c.run("baseline.mjs", ["check"]);
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /baselineDigest|malformed/);
  } finally {
    c.cleanup();
  }
});

test("declareAmendment is idempotent per declaration, extends with a new reason, and a record that equals the baseline needs none", () => {
  const c = copyRepo();
  try {
    const path = firstRecord("records/families/");
    assert.throws(() => declareAmendment({ root: c.root, path, reason: "nothing changed in this record" }), /equals the baseline/);
    const abs = join(c.root, path);
    writeFileSync(abs, `${readFileSync(abs, "utf8").trimEnd()}\n\n`);
    const live = loadAmendments().amendments.length;
    declareAmendment({ root: c.root, path, reason: "whitespace normalised by a reviewed change" });
    declareAmendment({ root: c.root, path, reason: "whitespace normalised by a reviewed change" });
    assert.equal(loadAmendments(c.root).amendments.length, live + 1, "the same declaration twice is one file");
    declareAmendment({ root: c.root, path, reason: "whitespace normalised by a reviewed change, restated" });
    const { amendments } = loadAmendments(c.root);
    assert.equal(amendments.length, live + 2, "a new reason extends the record's declarations with a second file");
    assert.deepEqual(amendments.filter((a) => a.path === path).map((a) => a.reason), ["whitespace normalised by a reviewed change", "whitespace normalised by a reviewed change, restated"]);
    assert.equal(c.run("baseline.mjs", ["check"]).status, 0, "both declarations are valid while the edit stands");
    writeFileSync(abs, readFileSync(join(repoRoot, path)));
    assert.equal((c.run("baseline.mjs", ["check"]).stderr.match(/stale amendment/g) ?? []).length, 2, "reverting the edit makes every declaration of it stale");
  } finally {
    c.cleanup();
  }
});
