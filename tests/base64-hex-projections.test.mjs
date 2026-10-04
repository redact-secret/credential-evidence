import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { baseValue, contentBytes, decodeVia, sha256Hex } from "../scripts/lib/representation.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

test("the committed Base64 and hex projections equal the generator output", () => {
  const r = spawnSync(process.execPath, ["scripts/generate-base64-hex-projections.mjs", "--check"], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("every credential projection states its encoded source range and re-derives its authored base", () => {
  const bases = read("records/fixtures/base64-hex-representation-bases.json");
  const set = read("records/fixtures/base64-hex-representation-projections.json");
  const byId = new Map(bases.fixtures.map((f) => [f.id, f]));
  let checked = 0;
  for (const item of set.fixtures) {
    // ADR 0020 (ADR 0019 item 2): the candidate readings were promoted to expected spans, so none remains
    assert.equal(item.candidateReading, undefined, item.id);
    assert.equal(item.expected.outcome === "must-flag", item.expected.spans.length > 0, item.id);
    for (const span of item.expected.spans) {
      const base = byId.get(span.base);
      assert.ok(base, `${item.id}: unknown base`);
      const value = baseValue(base, contentBytes(base));
      const source = Buffer.from(item.text, "utf8").subarray(span.start, span.end);
      const decoded = decodeVia(source, span.decoded.via);
      assert.ok(decoded.equals(value), `${item.id}: decoded value is not the base`);
      assert.equal(sha256Hex(decoded), span.decoded.sha256);
      assert.equal(decoded.length, span.decoded.bytes);
      checked++;
    }
  }
  assert.equal(checked, 47);
  // the twins: a decoded base that is not a credential stays unflagged and cites the maintainer-only evidence entry
  const twins = set.fixtures.filter((i) => i.expected.outcome === "must-not-flag");
  assert.equal(twins.length, 12);
  for (const t of twins) assert.equal(set.evidence[t.evidence].reviewState, "maintainer-only", t.id);
});
