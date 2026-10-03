#!/usr/bin/env node
// node scripts/generate-base64-hex-projections.mjs [--check] [--source-revision <40 hex>]
//
// Writes records/fixtures/base64-hex-representation-projections.json: the generated projections (schema revision 1.6.0,
// ADR 0016) of the authored bases in records/fixtures/base64-hex-representation-bases.json, under the rule declared by
// records/fixture-plans/base64-hex-representation-matrix.json. Pure and deterministic: no clock, no network, no random
// source; the same bases give the same bytes. `--check` writes nothing and fails when the file on disk differs.
//
// Every encoded value is produced here with Node's Buffer, then re-derived with the validator's own strict decoder
// (scripts/lib/representation.mjs) before it is written, including the candidate readings, which the validator does not
// re-derive. Credential-shaped bases are synthetic and never issued (see the bases set description).
//
// What this generator does not do: decide any outcome. Candidate positives are not-assertable (their scenario's
// evidence is unresolved) and carry the span as a non-asserting candidateReading; benign projections inherit the
// benign-encoded-value scenario's outcome. Decoder support, depth limits and actions are the owning product's.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { baseValue, contentBytes, decodeVia, sha256Hex } from "./lib/representation.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASES = join(root, "records/fixtures/base64-hex-representation-bases.json");
const OUT = join(root, "records/fixtures/base64-hex-representation-projections.json");
const SET_ID = "base64-hex-representation-projections";
const PLAN = "base64-hex-representation-matrix";
const GENERATOR = { name: "base64-hex-projection-generator", version: "1.0.0", entrypoint: "scripts/generate-base64-hex-projections.mjs" };

const args = process.argv.slice(2);
const check = args.includes("--check");
const ri = args.indexOf("--source-revision");
let sourceRevision = ri >= 0 ? args[ri + 1] : undefined;
if (!sourceRevision) {
  try {
    sourceRevision = JSON.parse(readFileSync(OUT, "utf8")).origin.generator.sourceRevision;
  } catch {
    sourceRevision = "0".repeat(40);
  }
}
if (!/^[0-9a-f]{40}$/.test(sourceRevision)) {
  console.error("--source-revision needs 40 lowercase hex digits");
  process.exit(2);
}

// ------------------------------------------------------------------ encodings
const b64 = (alphabet, padding) => ({ codec: "base64", alphabet, padding });
const hex = (letterCase) => ({ codec: "hex", case: letterCase });
const stepOf = (c) => (c.codec === "base64" ? { op: "encode", codec: "base64", alphabet: c.alphabet, padding: c.padding } : { op: "encode", codec: "hex", case: c.case });

function encode(buf, c) {
  if (c.codec === "base64") {
    let s = buf.toString(c.alphabet === "standard" ? "base64" : "base64url");
    if (c.alphabet === "url-safe" && c.padding === "padded") s += "=".repeat((4 - (s.length % 4)) % 4);
    if (c.alphabet === "standard" && c.padding === "unpadded") s = s.replace(/=+$/, "");
    return Buffer.from(s, "latin1");
  }
  const h = buf.toString("hex");
  if (c.case === "lower") return Buffer.from(h, "latin1");
  if (c.case === "upper") return Buffer.from(h.toUpperCase(), "latin1");
  // mixed: letters alternate lower and upper by position, so both cases occur whenever there are two or more letters
  let n = 0;
  return Buffer.from([...h].map((ch) => (/[a-f]/.test(ch) ? (n++ % 2 ? ch.toUpperCase() : ch) : ch)).join(""), "latin1");
}

const CARRIERS = {
  env: { context: "shell-assignment", mode: "whole-value", carrier: "shell-assignment", wrap: (e) => [`ENCODED_VALUE=`, e, `\n`] },
  json: { context: "json", mode: "embedded", carrier: "json", wrap: (e) => [`{"event":"config-sync","payload":"`, e, `"}\n`] },
  url: { context: "url", mode: "embedded", carrier: "url-query", wrap: (e) => [`https://example.invalid/callback?payload=`, e, `&v=1\n`] },
};

// Single layer variants, in priority order: when two variants give identical text for a base and carrier, the first
// is kept and the others are named in the transformation note (the alphabets and padding coincide for that base).
const SINGLE = [
  ["base64-standard-padded", "env", [b64("standard", "padded")]],
  ["base64-url-safe-unpadded", "env", [b64("url-safe", "unpadded")]],
  ["base64-standard-unpadded", "env", [b64("standard", "unpadded")]],
  ["base64-url-safe-padded", "env", [b64("url-safe", "padded")]],
  ["hex-lower", "env", [hex("lower")]],
  ["hex-upper", "env", [hex("upper")]],
  ["hex-mixed", "env", [hex("mixed")]],
  ["base64-standard-padded", "json", [b64("standard", "padded")]],
  ["base64-url-safe-unpadded", "json", [b64("url-safe", "unpadded")]],
  ["hex-upper", "json", [hex("upper")]],
  ["base64-standard-padded", "url", [b64("standard", "padded")]],
  ["base64-url-safe-unpadded", "url", [b64("url-safe", "unpadded")]],
  ["hex-lower", "url", [hex("lower")]],
];
// Nested variants: layers listed in forward (encoding) order.
const NESTED = [
  ["hex-lower-of-base64-standard-padded", "env", [b64("standard", "padded"), hex("lower")]],
  ["base64-url-safe-unpadded-of-base64-standard-padded", "env", [b64("standard", "padded"), b64("url-safe", "unpadded")]],
  ["base64-standard-padded-three-layers", "env", [b64("standard", "padded"), b64("standard", "padded"), b64("standard", "padded")]],
  ["hex-lower-of-hex-lower", "env", [hex("lower"), hex("lower")]],
  ["base64-url-safe-unpadded-of-hex-upper-of-base64-standard-padded", "json", [b64("standard", "padded"), hex("upper"), b64("url-safe", "unpadded")]],
];
const BENIGN = [
  ["base64-standard-padded", "env", [b64("standard", "padded")]],
  ["hex-lower", "env", [hex("lower")]],
  ["base64-url-safe-unpadded", "json", [b64("url-safe", "unpadded")]],
];

const MATRIX = {
  "sendgrid-key-base": { family: "sendgrid:api-key", kind: "credential" },
  "generic-literal-alphabet-edge-base": { family: "generic:unclassified-assignment-literal", kind: "credential" },
  "generic-literal-padding-edge-base": { family: "generic:unclassified-assignment-literal", kind: "credential" },
  "public-sentence-base": { family: "generic:unclassified-assignment-literal", kind: "benign" },
  "public-json-document-base": { family: "generic:unclassified-assignment-literal", kind: "benign" },
  "empty-input-sha256-digest-base": { family: "generic:unclassified-assignment-literal", kind: "benign" },
  "sendgrid-redacted-mask-base": { family: "sendgrid:api-key", kind: "benign" },
};

// ------------------------------------------------------------------ build
const baseSet = JSON.parse(readFileSync(BASES, "utf8"));
const items = [];
const dropped = [];

for (const [short, spec] of Object.entries(MATRIX)) {
  const baseId = `${baseSet.id}--${short}`;
  const base = baseSet.fixtures.find((f) => f.id === baseId);
  if (!base) throw new Error(`base ${baseId} is not in ${BASES}`);
  const baseBytes = contentBytes(base);
  const value = baseValue(base, baseBytes);
  const shortName = short.replace(/-base$/, "");
  const variants = spec.kind === "benign" ? BENIGN.map((v) => ["benign-encoded-value", v]) : [...SINGLE.map((v) => ["credential-in-base64-or-hex-form", v]), ...NESTED.map((v) => ["credential-in-nested-encoding-layers", v])];
  const seen = new Map(); // carrier + text -> item
  for (const [scenario, [name, carrierKey, layers]] of variants) {
    let enc = value;
    for (const l of layers) enc = encode(enc, l);
    const carrier = CARRIERS[carrierKey];
    const [head, , tail] = carrier.wrap("");
    const text = Buffer.concat([Buffer.from(head), enc, Buffer.from(tail)]);
    const start = Buffer.byteLength(head);
    const end = start + enc.length;
    const key = `${carrierKey}\0${text.toString("latin1")}`;
    const id = `${SET_ID}--${shortName}-${name}-in-${carrierKey}`;
    if (seen.has(key)) {
      const first = seen.get(key);
      const via = layers.map((l) => (l.codec === "base64" ? `${l.alphabet} ${l.padding} base64` : `${l.case}-case hex`)).join(" over ");
      first.transformation.note = `${first.transformation.note ? first.transformation.note + " " : ""}The same text is also ${via} for this base: the alphabets and padding coincide, so it is one input, not two.`;
      dropped.push(id);
      continue;
    }
    const via = layers.slice().reverse().map((l) => (l.codec === "base64" ? { codec: "base64", alphabet: l.alphabet, padding: l.padding } : { codec: "hex", case: l.case }));
    const item = {
      id,
      cell: { plan: PLAN, scenario, families: [spec.family] },
      path: `${shortName}-${name}-in-${carrierKey}/input.txt`,
      context: carrier.context,
      derivation: { kind: "projection", bases: [baseId] },
      transformation: { steps: [...layers.map(stepOf), { op: "embed", mode: carrier.mode, carrier: carrier.carrier }] },
      sha256: sha256Hex(text),
      text: text.toString("utf8"),
      expected: { outcome: spec.kind === "benign" ? "must-not-flag" : "not-assertable", spans: [] },
    };
    if (spec.kind === "credential") {
      const decoded = decodeVia(text.subarray(start, end), via);
      if (!decoded.equals(value)) throw new Error(`${id}: decoded value differs from the base`);
      item.candidateReading = {
        asserting: false,
        outcome: "must-flag",
        spans: [{ start, end, role: "secret", note: "Candidate source range: the encoded text. Synthetic value; never issued.", base: baseId, decoded: { via, sha256: sha256Hex(value), bytes: value.length } }],
      };
    }
    seen.set(key, item);
    items.push(item);
  }
}

const set = {
  schemaVersion: 1,
  kind: "fixture-set",
  id: SET_ID,
  title: "Base64 and hex projections of authored bases (generated)",
  description: `Generated, correlated projections of the seven authored bases of ${baseSet.id}: single and stacked Base64 (standard and URL-safe, padded and unpadded) and hex (lower, upper, mixed) encodings of a base value, whole in an assignment or embedded in a JSON document or a URL query. Seven independent bases, ${items.length} generated inputs: the inputs are not independent samples. Positive-side inputs are not-assertable with a non-asserting candidate source range (the evidence is unresolved); benign inputs are must-not-flag under the benign-encoded-value scenario. Where two variants of one base give identical text (the Base64 alphabets and padding coincide for a 69-byte ASCII value without '>', '~' or '?'), one input is kept and the transformation note names the other reading.`,
  origin: { type: "generation-rule", rule: "base64-hex-projection", generator: { ...GENERATOR, version: GENERATOR.version, sourceRevision }, seed: "base64-hex-projection-1" },
  generated: true,
  fixtures: items,
  lifecycle: "draft",
  notes: "Generated by scripts/generate-base64-hex-projections.mjs from the authored bases of base64-hex-representation-bases; do not edit by hand: change the generator or the bases and regenerate. Every credential-shaped value is a synthetic base that was never issued and never tested against any service.",
};

const out = JSON.stringify(set, null, 2) + "\n";
if (check) {
  let current = "";
  try {
    current = readFileSync(OUT, "utf8");
  } catch {}
  if (current !== out) {
    console.error(`FAIL: ${OUT} differs from the generator output; run node scripts/generate-base64-hex-projections.mjs`);
    process.exit(1);
  }
  console.log(`OK: ${items.length} generated inputs from ${Object.keys(MATRIX).length} authored bases are current`);
} else {
  writeFileSync(OUT, out);
  console.log(`wrote ${items.length} inputs (${dropped.length} coinciding variants merged)`);
}
