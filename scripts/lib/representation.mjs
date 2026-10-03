// Representation and lineage checks for fixture-set items (schema revision 1.6.0, ADR 0016).
//
// Pure and deterministic, no network, no clock. Three jobs:
//   1. `contentBytes`: the exact bytes of an item whatever form it stores them in (text, bytesHex or recipe), with a
//      hard ceiling so a hostile recipe cannot make the validator allocate without bound.
//   2. `decodeVia`: re-derive a base value from source bytes with the declared decode steps, strictly.
//   3. `checkItemRepresentation`: the cross-field rules JSON Schema cannot express (span lineage, base identity,
//      decoded bytes, fragments, input validity, chunk boundaries, transformation consistency).

import { createHash } from "node:crypto";

export const MAX_CONTENT_BYTES = 4 * 1024 * 1024;

export const sha256Hex = (buf) => createHash("sha256").update(buf).digest("hex");

const utf8Fatal = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

export function isValidUtf8(buf) {
  try {
    utf8Fatal.decode(buf);
    return true;
  } catch {
    return false;
  }
}

/**
 * The exact bytes of an item. `baseBytes(id)` returns the bytes of an authored base fixture (or undefined).
 * Throws an Error with a message fit for a validator line.
 */
export function contentBytes(item, baseBytes = () => undefined) {
  if (item.text !== undefined) {
    if (!item.text.isWellFormed()) throw new Error("text contains an unpaired surrogate; give the exact bytes as bytesHex instead");
    return Buffer.from(item.text, "utf8");
  }
  if (item.bytesHex !== undefined) return Buffer.from(item.bytesHex, "hex");
  if (item.recipe === undefined) throw new Error("no content: one of text, bytesHex and recipe is required");
  const pieces = [];
  let total = 0;
  for (const [i, part] of item.recipe.parts.entries()) {
    let piece;
    if (part.text !== undefined) {
      if (!part.text.isWellFormed()) throw new Error(`recipe.parts[${i}].text contains an unpaired surrogate`);
      piece = Buffer.from(part.text, "utf8");
    } else if (part.repeat !== undefined) {
      if (!part.repeat.text.isWellFormed()) throw new Error(`recipe.parts[${i}].repeat.text contains an unpaired surrogate`);
      const unit = Buffer.from(part.repeat.text, "utf8");
      if (unit.length * part.repeat.times + total > MAX_CONTENT_BYTES) throw new Error(`recipe expands beyond ${MAX_CONTENT_BYTES} bytes`);
      piece = Buffer.from(part.repeat.text.repeat(part.repeat.times), "utf8");
    } else {
      piece = baseBytes(part.fixture);
      if (!piece) throw new Error(`recipe.parts[${i}].fixture '${part.fixture}' is not an authored base fixture`);
    }
    total += piece.length;
    if (total > MAX_CONTENT_BYTES) throw new Error(`recipe expands beyond ${MAX_CONTENT_BYTES} bytes`);
    pieces.push(piece);
  }
  return Buffer.concat(pieces);
}

const codePointOf = (token) => Number.parseInt(token.slice(2), 16);

function decodeBase64(buf, alphabet, padding) {
  const s = buf.toString("latin1");
  const alphabetOk = alphabet === "standard" ? /^[A-Za-z0-9+/]*={0,2}$/ : /^[A-Za-z0-9_-]*={0,2}$/;
  if (!alphabetOk.test(s) || buf.some((b) => b > 0x7f)) throw new Error(`not ${alphabet} base64`);
  if (padding === "padded" ? s.length % 4 !== 0 : s.includes("=") || s.length % 4 === 1) throw new Error(`not ${padding} base64`);
  const encoding = alphabet === "standard" ? "base64" : "base64url";
  const out = Buffer.from(s, encoding);
  let again = out.toString(encoding);
  if (alphabet === "standard" && padding === "unpadded") again = again.replace(/=+$/, "");
  if (alphabet === "url-safe" && padding === "padded") again += "=".repeat((4 - (again.length % 4)) % 4);
  if (again !== s) throw new Error("base64 is not canonical (non-zero trailing bits or stray padding)");
  return out;
}

function decodeHex(buf, letterCase) {
  const s = buf.toString("latin1");
  if (s.length === 0 || s.length % 2 !== 0) throw new Error("hex needs an even, non-zero number of digits");
  const ok = letterCase === "lower" ? /^[0-9a-f]+$/ : letterCase === "upper" ? /^[0-9A-F]+$/ : /^[0-9a-fA-F]+$/;
  if (!ok.test(s)) throw new Error(`not ${letterCase}-case hex`);
  if (letterCase === "mixed" && !(/[a-f]/.test(s) && /[A-F]/.test(s))) throw new Error("mixed-case hex needs both cases to occur");
  return Buffer.from(s, "hex");
}

/** Apply decode steps in order, source to value. Throws when a step does not hold. */
export function decodeVia(source, via) {
  let cur = source;
  for (const [i, step] of via.entries()) {
    try {
      if (step.codec === "base64") cur = decodeBase64(cur, step.alphabet, step.padding);
      else if (step.codec === "hex") cur = decodeHex(cur, step.case);
      else {
        if (!isValidUtf8(cur)) throw new Error("input is not valid UTF-8");
        let text = cur.toString("utf8");
        if (step.codec === "strip-codepoints") {
          const drop = new Set(step.codePoints.map(codePointOf));
          text = [...text].filter((c) => !drop.has(c.codePointAt(0))).join("");
        } else text = text.normalize(step.form.toUpperCase());
        cur = Buffer.from(text, "utf8");
      }
    } catch (e) {
      throw new Error(`decoded.via[${i}] (${step.codec}): ${e.message}`);
    }
  }
  return cur;
}

/** The value a base fixture stands for: its secret span, or its whole content when it has none (a benign base). */
export function baseValue(baseItem, baseContent) {
  const span = baseItem.expected.spans.find((s) => s.role === "secret");
  return span ? baseContent.subarray(span.start, span.end) : baseContent;
}

const encodeOpOf = (step) => {
  if (step.codec === "base64") return { op: "encode", codec: "base64", alphabet: step.alphabet, padding: step.padding };
  if (step.codec === "hex") return { op: "encode", codec: "hex", case: step.case };
  if (step.codec === "strip-codepoints") return { op: "insert-codepoints", codePoints: step.codePoints };
  return { op: "normalize", form: step.form };
};
const VALUE_OPS = new Set(["encode", "insert-codepoints", "normalize"]);
const canon = (v) => (Array.isArray(v) ? `[${v.map(canon).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}` : JSON.stringify(v));
const same = (a, b) => canon(a) === canon(b);

/** Does a UTF-16 code-unit boundary fall between the two halves of a surrogate pair? */
export function splitsSurrogatePair(text, boundary) {
  if (boundary <= 0 || boundary >= text.length) return false;
  const before = text.charCodeAt(boundary - 1);
  const after = text.charCodeAt(boundary);
  return before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff;
}

/**
 * Cross-field rules for one item. Returns problem strings (no path prefix).
 * @param item         the fixture-set item
 * @param bytes        its exact content
 * @param ctx          { set, itemById: Map(id -> { item, set }), bytesOf(item) -> Buffer, plan? }
 */
export function checkItemRepresentation(item, bytes, ctx) {
  const out = [];
  const spans = item.expected.spans;
  const kind = item.derivation?.kind;
  const validUtf8 = isValidUtf8(bytes);
  const declared = item.inputValidity ?? "valid";

  // Input validity and chunk boundaries.
  let text;
  if (validUtf8) text = bytes.toString("utf8");
  let splitsPair = false;
  if (item.chunking) {
    const { unit, boundaries } = item.chunking;
    for (const [i, b] of boundaries.entries()) if (i > 0 && b <= boundaries[i - 1]) out.push("chunking.boundaries must be strictly increasing");
    if (unit === "utf8-byte") {
      if (boundaries.some((b) => b >= bytes.length)) out.push(`chunking.boundaries must be inside the content (${bytes.length} bytes)`);
    } else if (!validUtf8) out.push("a utf16-code-unit chunking needs valid UTF-8 content");
    else {
      if (boundaries.some((b) => b >= text.length)) out.push(`chunking.boundaries must be inside the content (${text.length} UTF-16 code units)`);
      splitsPair = boundaries.some((b) => splitsSurrogatePair(text, b));
    }
    if (kind !== "projection") out.push("chunking requires derivation.kind projection");
  }
  if (declared === "invalid-utf8" && validUtf8) out.push("inputValidity invalid-utf8 but the content is valid UTF-8");
  if (declared === "unpaired-surrogate-split" && !splitsPair) out.push("inputValidity unpaired-surrogate-split but no utf16-code-unit chunk boundary separates a surrogate pair");
  if (declared === "valid" && !validUtf8) out.push("the content is not valid UTF-8: inputValidity must be invalid-utf8");
  if (declared === "valid" && splitsPair) out.push("a utf16-code-unit chunk boundary separates a surrogate pair: inputValidity must be unpaired-surrogate-split");
  if (declared === "invalid-utf8" && item.bytesHex === undefined) out.push("inputValidity invalid-utf8 needs the content as bytesHex");
  if (declared !== "valid" && spans.length) out.push("an item that is not valid input has no spans");

  if (item.transformation && kind !== "projection") out.push("transformation requires derivation.kind projection");

  // Derivation.
  const baseItems = new Map();
  if (kind === "authored-base") {
    if (ctx.set.generated) out.push("derivation authored-base is only for a hand-authored set (generated is false)");
    const secrets = spans.filter((s) => s.role === "secret");
    if (secrets.length > 1) out.push("an authored base carries at most one secret span");
    if (item.expected.outcome === "must-flag" && secrets.length !== 1) out.push("an authored must-flag base carries exactly one secret span");
    if (spans.some((s) => s.base !== undefined || s.decoded !== undefined || s.fragments !== undefined)) out.push("a span of an authored base states no base, decoded or fragments");
  } else if (kind === "projection") {
    for (const id of item.derivation.bases) {
      const found = ctx.itemById.get(id);
      if (id === item.id) out.push("derivation.bases names the item itself");
      else if (!found) out.push(`derivation.bases unknown fixture '${id}'`);
      else if (found.item.derivation?.kind !== "authored-base") out.push(`derivation.bases '${id}' is not an authored base (derivation.kind authored-base)`);
      else baseItems.set(id, found.item);
    }
    for (const part of item.recipe?.parts ?? []) if (part.fixture !== undefined && !item.derivation.bases.includes(part.fixture)) out.push(`recipe inserts '${part.fixture}', which derivation.bases does not list`);
    if (ctx.plan && item.cell) {
      const declaredBases = (ctx.plan.generation.inputs ?? []).filter((i) => i.kind === "fixture").map((i) => i.id);
      if (declaredBases.length) for (const id of item.derivation.bases) if (!declaredBases.includes(id)) out.push(`base '${id}' is not a fixture input of plan '${item.cell.plan}'`);
    }
  } else {
    if (item.recipe?.parts.some((p) => p.fixture !== undefined)) out.push("a recipe that inserts a base fixture needs derivation.kind projection");
    if (spans.some((s) => s.base !== undefined || s.decoded !== undefined || s.fragments !== undefined)) out.push("span base, decoded and fragments need derivation.kind projection");
  }

  // Spans.
  const decodedSpans = [];
  for (const [i, s] of spans.entries()) {
    const at = `expected.spans[${i}]`;
    const lineage = s.base !== undefined || s.decoded !== undefined || s.fragments !== undefined;
    if (lineage && s.role !== "secret") out.push(`${at}: base, decoded and fragments are only for a secret span`);
    if (kind === "projection" && s.role === "secret" && s.base === undefined) out.push(`${at}: a secret span of a projection names its base`);
    if (s.decoded !== undefined && s.base === undefined) out.push(`${at}: decoded needs base`);
    if (s.end > bytes.length || s.end <= s.start) continue; // reported by the caller
    let source = bytes.subarray(s.start, s.end);
    if (s.fragments) {
      let ok = true;
      let prev = -1;
      for (const [j, f] of s.fragments.entries()) {
        if (f.end <= f.start || f.start < s.start || f.end > s.end) { out.push(`${at}.fragments[${j}] must be inside the span`); ok = false; }
        if (f.start <= prev) { out.push(`${at}.fragments must be sorted, disjoint and separated by at least one byte`); ok = false; }
        prev = f.end;
      }
      if (s.fragments[0].start !== s.start || s.fragments.at(-1).end !== s.end) { out.push(`${at}.fragments must start where the span starts and end where it ends`); ok = false; }
      if (!ok) continue;
      source = Buffer.concat(s.fragments.map((f) => bytes.subarray(f.start, f.end)));
    }
    if (s.base === undefined) continue;
    const baseItem = baseItems.get(s.base);
    if (!baseItem) {
      if (kind === "projection") out.push(`${at}.base '${s.base}' is not in derivation.bases`);
      continue;
    }
    const value = baseValue(baseItem, ctx.bytesOf(baseItem));
    if (s.decoded) {
      decodedSpans.push(s);
      let decoded;
      try {
        decoded = decodeVia(source, s.decoded.via);
      } catch (e) {
        out.push(`${at}: ${e.message}`);
        continue;
      }
      if (decoded.length !== s.decoded.bytes) out.push(`${at}.decoded.bytes is ${s.decoded.bytes} but the decoded value has ${decoded.length}`);
      if (sha256Hex(decoded) !== s.decoded.sha256) out.push(`${at}.decoded.sha256 does not match the decoded value`);
      if (!decoded.equals(value)) out.push(`${at}: the decoded value is not the value of base '${s.base}'`);
    } else if (!source.equals(value)) out.push(`${at}: the span is not the value of base '${s.base}' and states no decoded.via`);
  }

  // Transformation consistency.
  const steps = item.transformation?.steps ?? [];
  const fragmented = spans.some((s) => s.fragments);
  const fragmentSteps = steps.filter((s) => s.op === "fragment");
  if (fragmented && !fragmentSteps.length) out.push("a span with fragments needs a fragment step in transformation");
  for (const f of fragmentSteps) {
    if (f.reconstruction !== "reconstructs-original" && item.expected.outcome === "must-flag") out.push(`a fragment step whose reconstruction is ${f.reconstruction} cannot back a must-flag expectation`);
    if (f.reconstruction === "unresolved" && item.expected.outcome !== "not-assertable") out.push("an unresolved reconstruction is not assertable: the outcome must be not-assertable");
  }
  if (fragmented && fragmentSteps.some((f) => f.reconstruction !== "reconstructs-original")) out.push("a span with fragments needs reconstruction reconstructs-original");
  if (decodedSpans.length && !item.transformation) out.push("decoded needs a transformation on the item");
  const secrets = spans.filter((s) => s.role === "secret");
  if (secrets.length === 1 && secrets[0].decoded && item.transformation) {
    const forward = secrets[0].decoded.via.slice().reverse().map(encodeOpOf);
    const stated = steps.filter((s) => VALUE_OPS.has(s.op)).map(({ positions, ...rest }) => rest);
    if (!same(forward, stated)) out.push("transformation encode, insert-codepoints and normalize steps are not the reverse of the span's decoded.via");
  }
  return out;
}
