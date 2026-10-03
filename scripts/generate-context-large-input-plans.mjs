#!/usr/bin/env node
// Generator for the context, repeated-secret and large-input fixture plans (issue #99, schema revision 1.6.0, ADR 0016).
//
//   node scripts/generate-context-large-input-plans.mjs --source-revision <40-hex>   write the five records
//   node scripts/generate-context-large-input-plans.mjs --check                      verify the records on disk equal the output
//
// Inputs: the eight synthetic base values below (two per family, four families) and the seed. Output: one authored set
// that holds the bases, two generated sets that hold projections of them, and the two fixture plans that declare the
// cells. No Case, no Scenario and no scanner is read: every cell points at an existing Scenario, whose reasoning and
// evidence basis it inherits. Deterministic: the same bases and seed give the same bytes; there is no clock, no network
// and no random source. `--source-revision` is the commit of this file, recorded in the generated sets' origin; `--check`
// reads it back from the records so it can never disagree with itself.
//
// Every value is synthetic and was never issued: it is built from a fake word run, padded with zeros, in the alphabet
// and at the length of the family's current contract (see `bases`). Nothing here was tested against any service.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { contentBytes } from "./lib/representation.mjs";
import { repoRoot } from "./lib/validator.mjs";

export const SEED = "context-large-input-seed-1";
export const GENERATOR = { name: "context-large-input-projector", version: "1.0.0", entrypoint: "scripts/generate-context-large-input-plans.mjs" };
export const RULE = "context-carrier-and-filler-placement";

export const IDS = {
  authored: "context-and-large-input-bases-authored",
  contextSet: "context-carrier-projections-generated",
  largeSet: "large-and-repeated-input-projections-generated",
  contextPlan: "context-carrier-matrix-of-bases",
  largePlan: "repeated-and-large-input-matrix-of-bases",
};

const pad = (words, length, fill = "0") => {
  if (words.length > length) throw new Error(`${words} is longer than ${length}`);
  return words + fill.repeat(length - words.length);
};

// Two bases per family. The word runs differ on purpose so that A and B are not one-character variants of each other.
const FAMILIES = [
  {
    short: "sendgrid-api-key",
    family: "sendgrid:api-key",
    contract: "sendgrid:api-key@1",
    env: "SENDGRID_API_KEY",
    a: `SG.${pad("SYNTHETICCTXBASEA", 22)}.${pad("SYNTHETIC-NEVER-ISSUED-CTX-BASE-A-", 43)}`,
    b: `SG.${pad("NOTREALCONTEXTBASEB", 22)}.${pad("NOT-REAL-NEVER-ISSUED-CONTEXT-B-", 43)}`,
    shape: /^SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/,
  },
  {
    short: "github-classic-pat",
    family: "github:classic-personal-access-token",
    contract: "github:classic-personal-access-token@1",
    env: "GITHUB_TOKEN",
    a: `ghp_${pad("SYNTHETICCTXBASEA", 36)}`,
    b: `ghp_${pad("NOTREALCONTEXTBASEB", 36)}`,
    shape: /^ghp_[A-Za-z0-9]{36}$/,
  },
  {
    short: "gitlab-legacy-pat",
    family: "gitlab:legacy-personal-access-token",
    contract: "gitlab:legacy-personal-access-token@1",
    env: "GITLAB_TOKEN",
    a: `glpat-${pad("SYNTHETICCTXBASEA", 20)}`,
    b: `glpat-${pad("NOTREALCTXBASEB", 20)}`,
    shape: /^glpat-[A-Za-z0-9_-]{20}$/,
  },
  {
    short: "npm-granular-token",
    family: "npm:granular-access-token",
    contract: "npm:granular-access-token@1",
    env: "NPM_TOKEN",
    a: `npm_${pad("SYNTHETICCTXBASEA", 36)}`,
    b: `npm_${pad("NOTREALCONTEXTBASEB", 36)}`,
    shape: /^npm_[A-Za-z0-9]{36}$/,
  },
];
for (const f of FAMILIES) for (const v of [f.a, f.b]) if (!f.shape.test(v)) throw new Error(`${f.family}: ${v} does not have the contract shape`);

// Credential-free filler: four 64-byte lines; the seed picks one, so a changed seed is a visibly different input.
const FILLER_LINES = [
  "The quick brown fox jumps over the lazy dog; nothing secret",
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit; ok",
  "Plain build output continues: step done, nothing to report",
  "This paragraph is ordinary prose with no credential in it",
].map((l) => `${l.padEnd(63, " ")}\n`);
for (const l of FILLER_LINES) if (Buffer.byteLength(l) !== 64) throw new Error(`filler line is ${Buffer.byteLength(l)} bytes, not 64: ${l}`);
export const fillerFor = (seed) => FILLER_LINES[createHash("sha256").update(seed).digest()[0] % FILLER_LINES.length];

const SIZES = [
  { name: "64kib", bytes: 64 * 1024 },
  { name: "256kib", bytes: 256 * 1024 },
  { name: "1mib", bytes: 1024 * 1024 },
];

const SYNTH = "Synthetic value; never issued.";
const baseId = (f, which) => `${IDS.authored}--${f.short}-base-${which}`;
const lower = (s) => s.toLowerCase();

// Context carriers: one authored base inside a different surrounding text. Each maps to an existing Scenario.
const CONTEXTS = [
  { name: "bare-value", scenario: "value-at-input-edges", carrier: "bare-value", mode: "whole-value", build: (f, v) => v },
  { name: "json-field", scenario: "structured-text-value", carrier: "json", mode: "embedded", build: (f, v) => `{"${lower(f.env)}":"${v}"}\n` },
  { name: "yaml-scalar", scenario: "structured-text-value", carrier: "yaml", mode: "embedded", build: (f, v) => `${lower(f.env)}: ${v}\n` },
  { name: "xml-element", scenario: "structured-text-value", carrier: "xml", mode: "embedded", build: (f, v) => `<credentials><token>${v}</token></credentials>\n` },
  { name: "bearer-header", scenario: "partial-span-leakage", carrier: "http-bearer-header", mode: "embedded", build: (f, v) => `Authorization: Bearer ${v}\n` },
  { name: "url-query", scenario: "partial-span-leakage", carrier: "url-query", mode: "embedded", build: (f, v) => `https://api.example.invalid/v1/ping?token=${v}\n` },
  { name: "markdown-code-span", scenario: "markdown-and-comment-value", carrier: "markdown-code-span", mode: "embedded", build: (f, v) => `Set the key to \`${v}\` before you run the script.\n` },
  { name: "shell-export-quoted", scenario: "quoted-value-extent", carrier: "shell-export-quoted", mode: "embedded", build: (f, v) => `export ${f.env}='${v}'\n` },
  { name: "log-line", scenario: "environment-assignment", carrier: "log-line", mode: "embedded", build: (f, v) => `2026-10-03T09:15:42Z level=info msg="request signed" api_key=${v}\n` },
  { name: "korean-text-prefix", scenario: "multibyte-text-offsets", carrier: "korean-prefixed-assignment", mode: "embedded", build: (f, v) => `환경 변수 설정: ${f.env}=${v}\n` },
  { name: "emoji-prefix", scenario: "multibyte-text-offsets", carrier: "emoji-prefixed-assignment", mode: "embedded", build: (f, v) => `🔑 ${f.env}=${v}\n` },
  { name: "crlf-lines", scenario: "crlf-line-endings", carrier: "crlf-assignment", mode: "embedded", build: (f, v) => `# line endings\r\n${f.env}=${v}\r\n` },
  { name: "bom-prefix", scenario: "multibyte-text-offsets", carrier: "bom-prefixed-assignment", mode: "embedded", build: (f, v) => `﻿${f.env}=${v}\n` },
  { name: "nbsp-before-value", scenario: "multibyte-text-offsets", carrier: "nbsp-before-value", mode: "embedded", build: (f, v) => `${f.env}= ${v}\n` },
];

const sha = (buf) => createHash("sha256").update(buf).digest("hex");

function uniqueOffset(buf, value, where) {
  const needle = Buffer.from(value, "utf8");
  const first = buf.indexOf(needle);
  if (first < 0) throw new Error(`${where}: value not found`);
  if (buf.indexOf(needle, first + 1) >= 0) throw new Error(`${where}: value occurs more than once`);
  return first;
}

/** Build every record from the bases and the seed. Pure. */
export function buildRecords({ sourceRevision, seed = SEED }) {
  const filler = fillerFor(seed);
  const authoredItems = [];
  const baseText = new Map(); // base id -> { text, value, start }
  for (const f of FAMILIES) {
    for (const which of ["a", "b"]) {
      const value = f[which];
      const text = `${f.env}=${value}\n`;
      const bytes = Buffer.from(text, "utf8");
      const start = uniqueOffset(bytes, value, baseId(f, which));
      const id = baseId(f, which);
      baseText.set(id, { text, value, start, bytes, family: f });
      authoredItems.push({
        id,
        cell: { plan: IDS.contextPlan, scenario: "environment-assignment", families: [f.family] },
        path: `${f.short}-base-${which}/input.txt`,
        context: "env-assignment",
        derivation: { kind: "authored-base" },
        sha256: sha(bytes),
        text,
        expected: { outcome: "must-flag", spans: [{ start, end: start + Buffer.byteLength(value), role: "secret", note: SYNTH }] },
      });
    }
  }

  // Context carriers: base A of each family in each carrier.
  const contextItems = [];
  for (const f of FAMILIES) {
    for (const c of CONTEXTS) {
      const bytes = Buffer.from(c.build(f, f.a), "utf8");
      const start = uniqueOffset(bytes, f.a, `${f.short} ${c.name}`);
      contextItems.push({
        id: `${IDS.contextSet}--${f.short}-${c.name}`,
        cell: { plan: IDS.contextPlan, scenario: c.scenario, families: [f.family] },
        path: `${f.short}-${c.name}/input.txt`,
        context: c.carrier,
        derivation: { kind: "projection", bases: [baseId(f, "a")] },
        transformation: { steps: [{ op: "embed", mode: c.mode, carrier: c.carrier }] },
        sha256: sha(bytes),
        text: bytes.toString("utf8"),
        expected: { outcome: "must-flag", spans: [{ start, end: start + Buffer.byteLength(f.a), role: "secret", note: SYNTH, base: baseId(f, "a") }] },
      });
    }
  }

  // Large inputs: recipes. `occurrences` is the ordered list of { base, atFiller } where atFiller is the number of
  // filler bytes before the occurrence (the filler between occurrences is the difference).
  const lines = (bytes) => bytes / filler.length;
  const recipeFor = (size, occurrences) => {
    const parts = [];
    let cursor = 0;
    for (const o of occurrences) {
      if (o.atFiller > cursor) parts.push({ repeat: { text: filler, times: lines(o.atFiller - cursor) } });
      parts.push({ fixture: o.base });
      cursor = o.atFiller;
    }
    if (size > cursor) parts.push({ repeat: { text: filler, times: lines(size - cursor) } });
    return { parts };
  };
  const bytesOfBase = (id) => baseText.get(id).bytes;
  const largeItem = ({ name, scenario, carrier, size, occurrences, steps, note }) => {
    const recipe = recipeFor(size, occurrences);
    const bytes = contentBytes({ recipe }, bytesOfBase);
    const spans = [];
    let offset = 0;
    let cursor = 0;
    for (const o of occurrences) {
      offset += o.atFiller - cursor;
      cursor = o.atFiller;
      const b = baseText.get(o.base);
      spans.push({ start: offset + b.start, end: offset + b.start + Buffer.byteLength(b.value), role: "secret", note: SYNTH, base: o.base });
      offset += b.bytes.length;
    }
    for (const s of spans) if (!bytes.subarray(s.start, s.end).equals(Buffer.from(baseText.get(s.base).value))) throw new Error(`${name}: span does not hold its base value`);
    const bases = [...new Set(occurrences.map((o) => o.base))];
    return {
      id: `${IDS.largeSet}--${name}`,
      cell: { plan: IDS.largePlan, scenario, families: [...new Set(occurrences.map((o) => baseText.get(o.base).family.family))] },
      path: `${name}/input.txt`,
      context: carrier,
      derivation: { kind: "projection", bases },
      transformation: { steps, ...(note ? { note } : {}) },
      sha256: sha(bytes),
      recipe,
      expected: { outcome: "must-flag", spans },
    };
  };

  const largeItems = [];
  for (const s of SIZES) {
    const half = s.bytes / 2;
    for (const f of FAMILIES) {
      const a = baseId(f, "a");
      const b = baseId(f, "b");
      for (const [placement, at] of [["head", 0], ["middle", half], ["tail", s.bytes]]) {
        largeItems.push(largeItem({
          name: `${f.short}-${placement}-of-${s.name}`,
          scenario: "credential-after-long-input",
          carrier: "filler-text",
          size: s.bytes,
          occurrences: [{ base: a, atFiller: at }],
          steps: [{ op: "place", placement, fillerBytes: s.bytes }],
        }));
      }
      largeItems.push(largeItem({
        name: `${f.short}-three-occurrences-in-${s.name}`,
        scenario: "multiple-credentials-per-input",
        carrier: "filler-text",
        size: s.bytes,
        occurrences: [{ base: a, atFiller: 0 }, { base: a, atFiller: half }, { base: a, atFiller: s.bytes }],
        steps: [{ op: "place", placement: "head", fillerBytes: s.bytes }, { op: "repeat", count: 3 }],
        note: "One base repeated at the head, the middle and the tail of the same filler; each occurrence is its own expected span.",
      }));
      largeItems.push(largeItem({
        name: `${f.short}-two-distinct-keys-in-${s.name}`,
        scenario: "multiple-credentials-per-input",
        carrier: "filler-text",
        size: s.bytes,
        occurrences: [{ base: a, atFiller: 0 }, { base: b, atFiller: s.bytes }],
        steps: [{ op: "place", placement: "head", fillerBytes: s.bytes }, { op: "place", placement: "tail", fillerBytes: s.bytes }],
        note: "Two distinct bases of one family: the first at the head and the second at the tail of the same filler.",
      }));
    }
    for (const [x, y] of [[0, 1], [2, 3]]) {
      const fx = FAMILIES[x];
      const fy = FAMILIES[y];
      largeItems.push(largeItem({
        name: `${fx.short}-and-${fy.short}-in-${s.name}`,
        scenario: "multiple-credentials-per-input",
        carrier: "filler-text",
        size: s.bytes,
        occurrences: [{ base: baseId(fx, "a"), atFiller: 0 }, { base: baseId(fy, "a"), atFiller: s.bytes }],
        steps: [{ op: "place", placement: "head", fillerBytes: s.bytes }, { op: "place", placement: "tail", fillerBytes: s.bytes }],
        note: "Two bases of two different families: the first at the head and the second at the tail of the same filler.",
      }));
    }
  }

  const scenarios = (items) => [...new Set(items.map((i) => i.cell.scenario))].sort();
  const familyIds = FAMILIES.map((f) => f.family);
  const authorship = "Project-authored by the Redact Secret project, which maintains this repository; not independent evidence. Draft; not yet reviewed.";
  const synthetic = "Synthetic: every value is a fake word run padded with zeros, in the alphabet and at the length of the family's current contract, and was never issued. None was tested against any service.";

  const authored = {
    schemaVersion: 1,
    kind: "fixture-set",
    id: IDS.authored,
    title: "Context and large-input base samples (authored)",
    description: `Eight authored base samples, two for each of four families (SendGrid API key, GitHub classic personal access token, GitLab legacy personal access token, npm granular access token), each one assignment line. They are the only bases the projections of the two plans read: the base count is eight whatever the number of generated inputs. ${synthetic}`,
    origin: { type: "authored-cases" },
    generated: false,
    fixtures: authoredItems,
    lifecycle: "draft",
    notes: `${authorship} A base asserts only that its secret span is the value; the format claims for each family live in its contract and family review, not here.`,
  };

  const generatedOrigin = {
    type: "generation-rule",
    rule: RULE,
    generator: { ...GENERATOR, sourceRevision },
    seed,
  };
  const contextSet = {
    schemaVersion: 1,
    kind: "fixture-set",
    id: IDS.contextSet,
    title: "Context carrier projections of authored bases (generated)",
    description: `${contextItems.length} projections: the first base of each of four families inside 14 surrounding texts (bare value, JSON, YAML, XML, Bearer header, URL query, Markdown code span, quoted shell export, log line, Korean text, emoji, CRLF lines, byte order mark, no-break space). Four bases, ${contextItems.length} correlated inputs. ${synthetic}`,
    origin: generatedOrigin,
    generated: true,
    fixtures: contextItems,
    lifecycle: "draft",
    notes: `${authorship} Generated; never edited by hand: rerun the generator.`,
  };
  const largeSet = {
    schemaVersion: 1,
    kind: "fixture-set",
    id: IDS.largeSet,
    title: "Large, repeated and mixed input projections of authored bases (generated)",
    description: `${largeItems.length} projections stored as recipes (the bytes are assembled, never embedded): one base at the head, middle or tail of 64 KiB, 256 KiB or 1 MiB of credential-free filler; one base repeated at three positions; two distinct bases of one family; two bases of two families. Eight bases, ${largeItems.length} correlated inputs. ${synthetic}`,
    origin: generatedOrigin,
    generated: true,
    fixtures: largeItems,
    lifecycle: "draft",
    notes: `${authorship} Generated; never edited by hand: rerun the generator. Each occurrence of a secret has its own expected span; covering one occurrence is not covering the input.`,
  };

  const baseInputs = (ids) => ids.map((id) => ({ kind: "fixture", id }));
  const contextPlan = {
    schemaVersion: 1,
    kind: "fixture-plan",
    id: IDS.contextPlan,
    title: "Context carriers of authored bases",
    description: "Four families against the existing Scenarios for bare, structured, header, URL, Markdown, quoted shell, log, multibyte, CRLF, byte-order-mark and no-break-space contexts. Reuses ten Scenarios and creates no Case and no Scenario: the reasoning stays where it was written. Declares the four first-of-pair authored bases it reads, so the base count is four whatever the number of generated inputs.",
    matrix: {
      families: { select: "listed", ids: familyIds.slice().sort() },
      targets: scenarios(contextItems.concat(authoredItems)).map((id) => ({ type: "scenario", id })),
      carriers: [...new Set(contextItems.map((i) => i.context).concat("env-assignment"))].sort(),
      coverage: "sparse",
    },
    generation: {
      rule: RULE,
      generator: { ...GENERATOR, sourceRevision },
      inputs: [...baseInputs(FAMILIES.map((f) => baseId(f, "a"))), ...FAMILIES.map((f) => ({ kind: "format-contract", id: f.contract }))],
      seed,
    },
    lineage: { origin: "authored", derivedFrom: scenarios(contextItems.concat(authoredItems)).map((id) => ({ kind: "scenario", id })) },
    output: [IDS.authored, IDS.contextSet],
    lifecycle: "draft",
    notes: `${authorship} The matrix is sparse: the first base of each family is placed in each carrier. Expected spans are the secret bytes only, with no envelope: this plan records no allowed wider range, so bytes a consumer reports outside the secret are a separate observation against an envelope of none, and a wider masking policy is that consumer's choice, not a format fact stated here.`,
  };
  const largePlan = {
    schemaVersion: 1,
    kind: "fixture-plan",
    id: IDS.largePlan,
    title: "Repeated, mixed and large inputs of authored bases",
    description: "Four families against the Scenarios for a credential deep in a long input and for several credentials in one input, at 64 KiB, 256 KiB and 1 MiB of filler, at the head, middle and tail, repeated and mixed. Reuses two Scenarios and creates no Case and no Scenario. Declares all eight authored bases, so the base count is eight whatever the number of generated inputs.",
    matrix: {
      families: { select: "listed", ids: familyIds.slice().sort() },
      targets: scenarios(largeItems).map((id) => ({ type: "scenario", id })),
      carriers: ["filler-text"],
      coverage: "sparse",
    },
    generation: {
      rule: RULE,
      generator: { ...GENERATOR, sourceRevision },
      inputs: [...baseInputs(FAMILIES.flatMap((f) => [baseId(f, "a"), baseId(f, "b")])), ...FAMILIES.map((f) => ({ kind: "format-contract", id: f.contract }))],
      seed,
    },
    lineage: { origin: "authored", derivedFrom: scenarios(largeItems).map((id) => ({ kind: "scenario", id })) },
    output: [IDS.largeSet],
    lifecycle: "draft",
    notes: `${authorship} The matrix is sparse: every size and placement is instantiated for every family, repeated and mixed inputs are instantiated at every size. Filler is credential-free, ${filler.length} bytes per line, chosen by the seed. Each occurrence has its own expected span and no envelope; a partly covered secret is an uncovered-secret-bytes observation, not a success for the input. Whether a product processes a large input in windows, how it limits input size, and what it reports are the product's assertions, not stated here.`,
  };

  return {
    [`records/fixtures/${IDS.authored}.json`]: authored,
    [`records/fixtures/${IDS.contextSet}.json`]: contextSet,
    [`records/fixtures/${IDS.largeSet}.json`]: largeSet,
    [`records/fixture-plans/${IDS.contextPlan}.json`]: contextPlan,
    [`records/fixture-plans/${IDS.largePlan}.json`]: largePlan,
  };
}

// JSON with the invisible characters this corpus is about written as escapes, so a reviewer can see them.
export const serialize = (record) => `${JSON.stringify(record, null, 2).replace(/[ ﻿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`)}\n`;

function main(argv) {
  const check = argv.includes("--check");
  const ri = argv.indexOf("--source-revision");
  let sourceRevision = ri >= 0 ? argv[ri + 1] : undefined;
  const target = join(repoRoot, "records/fixtures", `${IDS.largeSet}.json`);
  if (check && !sourceRevision) {
    if (!existsSync(target)) {
      console.error(`FAIL: ${target} does not exist`);
      return 1;
    }
    sourceRevision = JSON.parse(readFileSync(target, "utf8")).origin.generator.sourceRevision;
  }
  if (!/^[0-9a-f]{40}$/.test(sourceRevision ?? "")) {
    console.error("usage: generate-context-large-input-plans.mjs --source-revision <40-hex commit of this file> | --check");
    return 2;
  }
  const records = buildRecords({ sourceRevision });
  let bad = 0;
  for (const [path, record] of Object.entries(records)) {
    const text = serialize(record);
    const file = join(repoRoot, path);
    if (check) {
      if (!existsSync(file) || readFileSync(file, "utf8") !== text) {
        console.error(`DIFFERS: ${path}`);
        bad++;
      }
    } else {
      writeFileSync(file, text);
      console.log(`wrote ${path}`);
    }
  }
  if (check) console.log(bad ? `FAIL: ${bad} record(s) differ from the generator output` : `OK: ${Object.keys(records).length} records equal the generator output`);
  return bad ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)));
