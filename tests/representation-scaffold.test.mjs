// record:new fixture, schema revision 1.6.0 (ADR 0016): --authored-base, --projection-of and --extra-file.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { sha256Hex } from "../scripts/lib/representation.mjs";
import { planRecord, ScaffoldError } from "../scripts/lib/scaffold.mjs";
import { createValidator } from "../scripts/lib/validator.mjs";
import { errorsOf, exampleEntries } from "./helpers.mjs";

const A = "examplecloud-representation-authored";

test("record:new fixture states lineage with --projection-of and --extra-file, and refuses a lineage the validator would", () => {
  const index = exampleEntries();
  const validator = createValidator();
  const V = "exc_live_SYNTHETICEXAMPLEKEY0000000000000";
  const encoded = Buffer.from(V).toString("base64url");
  const via = [{ codec: "base64", alphabet: "url-safe", padding: "unpadded" }];
  const dir = mkdtempSync(join(tmpdir(), "record-new-extra-"));
  try {
    const extraPath = join(dir, "extra.json");
    const write = (o) => writeFileSync(extraPath, JSON.stringify(o));
    const opts = (extra) => ({
      set: A,
      name: "key-base64-url-safe-new",
      text: `EXAMPLECLOUD_BLOB=${encoded}\n`,
      secret: [encoded],
      context: "config-value",
      "projection-of": [`${A}--api-key-base`],
      "extra-file": extraPath,
      ...extra,
    });
    const plan = (o) => planRecord("fixture", ["examplecloud-key-encoded-in-config-value"], o, { index, today: "2026-10-03", validator });
    const good = {
      transformation: { steps: [{ op: "encode", codec: "base64", alphabet: "url-safe", padding: "unpadded" }, { op: "embed", mode: "whole-value", carrier: "shell-assignment" }] },
      spans: [{ base: `${A}--api-key-base`, decoded: { via, sha256: sha256Hex(Buffer.from(V)), bytes: V.length } }],
    };
    write(good);
    const p = plan(opts());
    assert.equal(p.append, true);
    const item = p.record.fixtures.at(-1);
    assert.deepEqual(item.derivation, { kind: "projection", bases: [`${A}--api-key-base`] });
    assert.deepEqual(item.expected.spans[0].decoded.via, via);
    assert.deepEqual(errorsOf(p.record), []);

    write({ ...good, spans: [{ ...good.spans[0], decoded: { ...good.spans[0].decoded, sha256: "0".repeat(64) } }] });
    assert.throws(() => plan(opts()), (e) => e instanceof ScaffoldError && /decoded\.sha256/.test(e.message));
    write({ ...good, status: "x" });
    assert.throws(() => plan(opts()), /not one of/);
    write({ ...good, spans: [] });
    assert.throws(() => plan(opts()), /one entry per --secret/);
    write(good);
    assert.throws(() => plan(opts({ "authored-base": true })), /exclusive/);

    const second = "exc_live_SYNTHETICEXAMPLEKEY0000000000001";
    const base = plan({ set: A, name: "another-base", text: `EXAMPLECLOUD_API_KEY=${second}\n`, secret: [second], "authored-base": true });
    assert.deepEqual(base.record.fixtures.at(-1).derivation, { kind: "authored-base" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
