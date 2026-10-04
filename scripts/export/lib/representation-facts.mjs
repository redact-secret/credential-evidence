// Representation facts of the credential-eval snapshot (credential-eval/representation/1, ADR 0018).
//
// Pure functions: the mapping from a materialized item (schema 1.6.0, camelCase, bare-hex digests) to the snapshot's
// case-level `representation` and span-level `base`/`fragments`/`decoded` (snake_case, `sha256:`-prefixed), the digest that
// proves which facts were written (`facts_digest`, credential-eval docs/contracts/representation.md), and the counts the
// engine reports next to it. No clock, no I/O. The facts are descriptive: they never change an expectation, and no review
// state or support status passes through here.

import { createHash } from "node:crypto";

export const REPRESENTATION_CONTRACT = "credential-eval/representation/1";

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Compact JSON with object keys sorted by byte order at every depth (credential-eval docs/contracts/identity.md). */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort(cmp).map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}

// camelCase evidence keys to the snapshot's snake_case ones. Every other key is spelled the same in both.
const KEY = { lineBreak: "line_break", codePoints: "code_points", fillerBytes: "filler_bytes" };

const renameKeys = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [KEY[k] ?? k, v]));

/** One decode step or transformation step; the closed vocabularies are identical, only some key names differ. */
const step = (s) => renameKeys(s);

/** The span-level facts of one expected span, or `{}`. Facts exist only on secret spans (the schema and the engine agree). */
export function spanFacts(span) {
  const out = {};
  if (span.base !== undefined) out.base = span.base;
  if (span.fragments !== undefined) out.fragments = span.fragments.map((r) => ({ start: r.start, end: r.end }));
  if (span.decoded !== undefined) out.decoded = { via: span.decoded.via.map(step), sha256: `sha256:${span.decoded.sha256}`, bytes: span.decoded.bytes };
  return out;
}

/**
 * The case-level `representation` object of an item, or undefined when it carries no case-level fact. Defaults are omitted:
 * `inputValidity: valid` is never written and an authored base names no bases. The transformation's free-text `note` is
 * not part of the contract (its object is closed) and stays in the records and the materialized manifest.
 */
export function caseRepresentation(item) {
  const out = {};
  if (item.inputValidity !== undefined && item.inputValidity !== "valid") out.input_validity = item.inputValidity;
  if (item.derivation !== undefined) {
    out.derivation = { kind: item.derivation.kind };
    if (item.derivation.bases?.length) out.derivation.bases = [...item.derivation.bases];
  }
  if (item.transformation !== undefined) out.transformation = { steps: item.transformation.steps.map(step) };
  if (item.chunking !== undefined) out.chunking = { unit: item.chunking.unit, boundaries: [...item.chunking.boundaries] };
  return Object.keys(out).length ? out : undefined;
}

/** What `facts_digest` and the counts read from a written snapshot case. */
function caseFacts(c) {
  const spans = [];
  (c.expected ?? []).forEach((sp, index) => {
    const f = {};
    for (const k of ["base", "fragments", "decoded"]) if (sp[k] !== undefined) f[k] = sp[k];
    if (Object.keys(f).length) spans.push({ index, ...f });
  });
  if (c.representation === undefined && spans.length === 0) return undefined;
  return { case_id: c.id, ...(c.representation !== undefined ? { representation: c.representation } : {}), spans };
}

/** The facts of every case that carries any, sorted by case id. */
export function factsOf(cases) {
  return cases.map(caseFacts).filter((f) => f !== undefined).sort((a, b) => cmp(a.case_id, b.case_id));
}

/** `sha256:` + SHA-256 of the canonical JSON of {@link factsOf}: what the engine reports as `manifest.representation.facts_digest`. */
export function factsDigest(cases) {
  return `sha256:${createHash("sha256").update(canonicalJson(factsOf(cases))).digest("hex")}`;
}

/** The counts of `manifest.representation` in a run artifact, computed from the written cases. */
export function factsCounts(cases) {
  const facts = factsOf(cases);
  const n = { cases: facts.length, transformed_cases: 0, chunked_cases: 0, expected_rejections: 0, fragmented_spans: 0, fragments: 0, decoded_spans: 0, decoded_verified: 0, decoded_unverified: 0 };
  for (const f of facts) {
    const r = f.representation;
    if (r?.transformation) n.transformed_cases++;
    if (r?.chunking) n.chunked_cases++;
    if (r?.input_validity !== undefined && r.input_validity !== "valid") n.expected_rejections++;
    for (const sp of f.spans) {
      if (sp.fragments) { n.fragmented_spans++; n.fragments += sp.fragments.length; }
      if (sp.decoded) {
        n.decoded_spans++;
        // normalize is carried but not re-derivable by the engine
        if (sp.decoded.via.some((s) => s.codec === "normalize")) n.decoded_unverified++;
        else n.decoded_verified++;
      }
    }
  }
  return n;
}

/** The `evalExport.representation` block of a release manifest (what the exporter wrote, in the engine's own terms). */
export function representationAccounting(cases) {
  return { contract: REPRESENTATION_CONTRACT, facts_digest: factsDigest(cases), ...factsCounts(cases) };
}
