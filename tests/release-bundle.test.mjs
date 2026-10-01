// Tests for the snapshot release bundle (ADR 0011). No network, no GitHub: the bundle is built in memory.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { collectInputs } from "../scripts/release/build.mjs";
import {
  BUNDLE_PATH,
  buildRelease,
  FIXTURES_MANIFEST_PATH,
  MANIFEST_ASSET,
  MANIFEST_DIGEST_ASSET,
  sha256,
  SNAPSHOT_PATH,
  tagProblem,
  treeDigest,
  verifyRelease,
} from "../scripts/release/lib/bundle.mjs";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const TAG = "snapshot-2026.10.01";

function synthetic(overrides = {}) {
  const sourceFiles = [
    { path: "records/providers/examplecloud.json", bytes: Buffer.from('{"kind":"provider","id":"examplecloud"}\n') },
    { path: "records/families/examplecloud/api-key.json", bytes: Buffer.from('{"kind":"family","id":"examplecloud:api-key"}\n') },
    { path: "migration/legacy-map/example.json", bytes: Buffer.from('{"kind":"legacy-map","id":"example"}\n') },
  ];
  const sourceDigest = treeDigest(sourceFiles.map((f) => ({ path: f.path, sha256: sha256(f.bytes) })));
  const snapshot = { schema: "credential-eval/corpus-snapshot/v1", identity: { source: "credential-evidence", revision: `records-tree-sha256:${sourceDigest}` }, cases: [] };
  return {
    tag: TAG,
    commit: COMMIT,
    schemaRevision: "1.4.0",
    sourceFiles,
    sourceDigest,
    schemaFiles: [{ path: "schemas/v1/common.schema.json", bytes: Buffer.from('{"x-schemaRevision":"1.4.0"}\n') }],
    snapshotText: `${JSON.stringify(snapshot)}\n`,
    fixtures: { manifestText: '{"count":0}\n', digest: "a".repeat(64), count: 0 },
    ...overrides,
  };
}

const reader = (assets) => (name) => assets.get(name) ?? null;

describe("release tag grammar", () => {
  test("accepts the first and later releases of a UTC day", () => {
    for (const tag of ["snapshot-2026.10.01", "snapshot-2026.10.01.2", "snapshot-2028.02.29.17"]) assert.equal(tagProblem(tag), null, tag);
  });
  test("rejects other forms and impossible dates", () => {
    for (const tag of ["snapshot-2026.10.1", "snapshot-2026.10.01.1", "snapshot-2026.10.01.01", "v1.0.0", "snapshot-2026.02.30", "snapshot-2026.13.01", "Snapshot-2026.10.01", "snapshot-2026.10.01-rc1"]) {
      assert.notEqual(tagProblem(tag), null, tag);
    }
  });
});

describe("release bundle: synthetic inputs", () => {
  test("two builds are byte-identical and the manifest records every identity", () => {
    const a = buildRelease(synthetic());
    const b = buildRelease(synthetic());
    assert.equal(a.manifestText, b.manifestText);
    for (const [name, bytes] of a.assets) assert.ok(b.assets.get(name).equals(bytes), name);
    const m = a.manifest;
    assert.equal(m.tag, TAG);
    assert.equal(m.sourceRevision.commit, COMMIT);
    assert.match(m.sourceRevision.recordsTree.digest, /^[0-9a-f]{64}$/);
    assert.equal(m.schemaRevision, "1.4.0");
    assert.deepEqual(m.generator, { name: "credential-evidence/release-bundle", version: "1.0.0" });
    assert.deepEqual(m.files.map((f) => f.path), [SNAPSHOT_PATH, FIXTURES_MANIFEST_PATH, BUNDLE_PATH].sort());
    assert.equal(a.manifestDigest, sha256(a.manifestText));
    assert.equal(a.assets.get(MANIFEST_DIGEST_ASSET).toString(), `${a.manifestDigest}  ${MANIFEST_ASSET}\n`);
  });

  test("the manifest has the shape credential-eval's release verifier reads", () => {
    // credential-eval official.rs verify_release: `tag` string; `files[] {path, sha256}`; the snapshot path exactly once.
    const { manifest, assets } = buildRelease(synthetic());
    assert.equal(typeof manifest.tag, "string");
    const entries = manifest.files.filter((f) => f.path === "credential-eval/corpus-snapshot.json");
    assert.equal(entries.length, 1);
    assert.match(entries[0].sha256, /^[0-9a-f]{64}$/);
    assert.equal(entries[0].sha256, sha256(assets.get(entries[0].asset)));
    assert.ok(Buffer.byteLength(JSON.stringify(manifest)) < 1024 * 1024, "credential-eval reads at most 1 MiB of manifest");
  });

  test("the records-tree digest is recomputable from the bundle alone", () => {
    const { assets, manifest } = buildRelease(synthetic());
    const bundle = JSON.parse(assets.get("records-bundle.json"));
    for (const f of bundle.records) assert.equal(sha256(Buffer.from(f.text)), f.sha256, f.path);
    assert.equal(treeDigest([...bundle.records, ...bundle.compatibilityInputs]), manifest.sourceRevision.recordsTree.digest);
    // compatibility inputs are named by digest only; their content is not distributed
    assert.deepEqual(bundle.compatibilityInputs.map((f) => f.path), ["migration/legacy-map/example.json"]);
    assert.ok(bundle.compatibilityInputs.every((f) => !("text" in f)));
    assert.ok(bundle.records.every((f) => f.path.startsWith("records/")));
  });

  test("refuses inconsistent inputs", () => {
    assert.throws(() => buildRelease(synthetic({ tag: "latest" })), /not snapshot-/);
    assert.throws(() => buildRelease(synthetic({ commit: "HEAD" })), /40-hex/);
    assert.throws(() => buildRelease(synthetic({ sourceDigest: "b".repeat(64) })), /records-tree digest/);
    const s = synthetic();
    const snap = JSON.parse(s.snapshotText);
    snap.identity.release = { tag: TAG };
    assert.throws(() => buildRelease({ ...s, snapshotText: JSON.stringify(snap) }), /identity\.release/);
    snap.identity = { revision: "records-tree-sha256:other" };
    assert.throws(() => buildRelease({ ...s, snapshotText: JSON.stringify(snap) }), /not built from these records/);
  });

  test("verification accepts the release and refuses every tampering", () => {
    const { assets, manifestDigest } = buildRelease(synthetic());
    assert.deepEqual(verifyRelease({ read: reader(assets), tag: TAG, manifestDigest }).problems, []);
    assert.deepEqual(verifyRelease({ read: reader(assets), tag: TAG, manifestDigest: `sha256:${manifestDigest}` }).problems, []);
    const expectProblem = (opts, pattern) => {
      const { problems } = verifyRelease({ read: reader(assets), tag: TAG, manifestDigest, ...opts });
      assert.ok(problems.some((p) => pattern.test(p)), `${pattern} not in ${JSON.stringify(problems)}`);
    };
    expectProblem({ manifestDigest: "c".repeat(64) }, /differs from the pinned/);
    expectProblem({ tag: "snapshot-2026.10.02" }, /not "snapshot-2026\.10\.02"/);
    const swapped = new Map(assets);
    swapped.set("credential-eval-corpus-snapshot.json", Buffer.from("{}\n"));
    expectProblem({ read: reader(swapped) }, /corpus-snapshot\.json\) does not match its sha256/);
    const missing = new Map(assets);
    missing.delete("records-bundle.json");
    expectProblem({ read: reader(missing) }, /missing asset records-bundle\.json/);
  });
});

describe("release bundle: the repository's records", () => {
  test("builds deterministically and verifies", () => {
    const a = buildRelease(collectInputs({ tag: TAG, commit: COMMIT }));
    const b = buildRelease(collectInputs({ tag: TAG, commit: COMMIT }));
    assert.equal(a.manifestText, b.manifestText);
    assert.deepEqual(verifyRelease({ read: reader(a.assets), tag: TAG, manifestDigest: a.manifestDigest }).problems, []);
    const snapshot = JSON.parse(a.assets.get("credential-eval-corpus-snapshot.json"));
    assert.equal(snapshot.identity.revision, `records-tree-sha256:${a.manifest.sourceRevision.recordsTree.digest}`);
    assert.equal(a.manifest.fixtures.count, snapshot.cases.length);
  });
});
