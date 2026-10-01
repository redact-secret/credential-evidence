// Deterministic record skeletons for `npm run record:new` (issue #22).
//
// Pure planning: planRecord() computes the path and the skeleton of one new record and
// refuses what must never be created (a duplicate id, an unknown reference, an ADR 0007
// identity coordinate, a tier or basis in an id). Nothing here fetches, guesses or writes
// except writeRecord(). Schema rules are not repeated: the skeleton is checked against the
// real schemas by createValidator(), and identity by scripts/lib/identity.mjs.
//
// A skeleton is schema-valid and `draft`. Every field a person still has to write holds
// PLACEHOLDER (scripts/lib/placeholders.mjs), which fails `npm run validate` until replaced.
// The honest starting evidence state is `unresolved` / `not-assertable`: nothing is claimed.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { sourceIdFor, pinFor, publisherFor, splitUrl } from "../migrate/lib/sources.mjs";
import { codesForText, identityViolations } from "./identity.mjs";
import { PLACEHOLDER } from "./placeholders.mjs";
import { createValidator, listJson, repoRoot } from "./validator.mjs";

export const SCAFFOLD_KINDS = ["provider", "family", "contract", "source", "scenario", "case"];

export const SOURCE_TYPES = ["provider-documentation", "provider-sdk-source", "scanner-rule-source", "third-party-writeup", "issue-or-discussion", "standard-or-rfc", "project-research-note", "other"];
const ROLES = ["subject", "lookalike", "context", "companion"];
const AUTHORSHIP = "Project-authored by the Redact Secret project, which maintains this repository; not independent evidence. Draft; not yet reviewed.";

// Evidence basis and the legacy tier are data, never identity (ADR 0007, decision 2).
const TIER_OR_BASIS = new RegExp("(?<![a-z0-9])(t[0-3]|tier-?[0-3]|provider-documented|tool-corroborated|project-policy|unresolved)(?![a-z0-9])");

export class ScaffoldError extends Error {}
const fail = (msg) => {
  throw new ScaffoldError(msg);
};
const todo = (what) => `${PLACEHOLDER}: ${what}`;

/** Every canonical record under root (records/ and migration/) as [{ path, record }]. */
export function loadIndex(root = repoRoot) {
  const entries = [];
  for (const dir of ["records", "migration"]) {
    let files;
    try {
      files = listJson(join(root, dir));
    } catch (e) {
      if (e.code === "ENOENT") continue;
      throw e;
    }
    for (const file of files) {
      try {
        entries.push({ path: file.slice(root.length + 1).split("\\").join("/"), record: JSON.parse(readFileSync(file, "utf8")) });
      } catch {
        // unparsable files are reported by `npm run validate`
      }
    }
  }
  return entries;
}

function lookup(index) {
  const byKey = new Map();
  for (const e of index) byKey.set(`${e.record.kind}:${e.record.id}`, e);
  return {
    get: (kind, id) => byKey.get(`${kind}:${id}`),
    has: (kind, id) => byKey.has(`${kind}:${id}`),
    ofKind: (kind) => index.filter((e) => e.record.kind === kind),
    paths: new Set(index.map((e) => e.path)),
  };
}

const need = (opts, key, hint) => {
  const v = opts[key];
  if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) fail(`missing --${key}${hint ? ` (${hint})` : ""}`);
  return v;
};
const list = (v) => (v === undefined ? [] : [v].flat().flatMap((x) => String(x).split(",")).map((x) => x.trim()).filter(Boolean));

/** Refuse ADR 0007 coordinates (and tier or basis words) in an id. `parts` are slugs that make up the id. */
function checkIdentityText(kind, parts, path) {
  const bad = new Set();
  for (const part of parts) for (const c of codesForText(part, { segments: false })) bad.add(c);
  for (const c of codesForText(path.toLowerCase().replace(/\.json$/, ""), { segments: true })) bad.add(c);
  if (["scenario", "case"].includes(kind) && parts.some((p) => TIER_OR_BASIS.test(p))) bad.add("evidence-tier-or-basis");
  if (bad.size) {
    fail(
      `refused: ${kind} id '${parts.join(":")}' carries forbidden identity coordinate(s): ${[...bad].sort().join(", ")} (ADR 0007). ` +
        "Name what the record is about, not where it came from; legacy suite, beta/milestone/issue/release coordinates, detector or scanner names, and evidence tier or basis belong in externalRefs, the review history or migration/legacy-map.",
    );
  }
}

function parseFamilyRef(raw, lk) {
  let text = String(raw);
  let role = "subject";
  const eq = text.lastIndexOf("=");
  if (eq >= 0) {
    role = text.slice(eq + 1);
    text = text.slice(0, eq);
  }
  if (!ROLES.includes(role)) fail(`--family role '${role}' is not one of ${ROLES.join(", ")}`);
  const at = text.indexOf("@");
  const family = at >= 0 ? text.slice(0, at) : text;
  const contract = at >= 0 ? text : undefined;
  if (!lk.has("family", family)) fail(`unknown family '${family}' (create it first: npm run record:new -- family ...)`);
  if (contract && !lk.has("format-contract", contract)) fail(`unknown contract '${contract}'`);
  return { family, role, ...(contract ? { contract } : {}) };
}

const PLANNERS = {
  provider(args, opts, ctx) {
    const [id] = args;
    const path = `records/providers/${id}.json`;
    const record = {
      schemaVersion: 1,
      kind: "provider",
      id,
      name: need(opts, "name", "the issuer's own name for itself"),
      ...(list(opts.alias).length ? { aliases: list(opts.alias) } : {}),
      ...(opts.homepage ? { homepage: opts.homepage } : {}),
      lifecycle: "draft",
    };
    return { path, record, parts: [id] };
  },

  family(args, opts, ctx) {
    const [id] = args;
    const [provider, slug] = String(id).split(":");
    if (!provider || !slug || String(id).split(":").length !== 2) fail(`family id must be <provider>:<family-slug>, got '${id}'`);
    if (!ctx.lk.has("provider", provider)) fail(`unknown provider '${provider}' (create it first: npm run record:new -- provider ...)`);
    const record = {
      schemaVersion: 1,
      kind: "family",
      id,
      provider,
      name: need(opts, "name"),
      description: opts.description ?? todo("one sentence: what the credential is and how it is recognised, stated from evidence"),
      lifecycle: "draft",
      currentContract: null,
      research: { state: "unresearched", researchedAt: null },
      notes: AUTHORSHIP,
    };
    return { path: `records/families/${provider}/${slug}.json`, record, parts: [provider, slug] };
  },

  contract(args, opts, ctx) {
    const [familyId] = args;
    if (!ctx.lk.has("family", familyId)) fail(`unknown family '${familyId}' (create it first: npm run record:new -- family ...)`);
    const [provider, slug] = familyId.split(":");
    const revisions = ctx.lk.ofKind("format-contract").filter((e) => e.record.family === familyId).map((e) => e.record.revision);
    const next = Math.max(0, ...revisions) + 1;
    if (opts.revision !== undefined && Number(opts.revision) !== next) {
      fail(`contract revisions are append-only: the next revision of '${familyId}' is ${next}, not ${opts.revision}`);
    }
    const id = `${familyId}@${next}`;
    const record = {
      schemaVersion: 1,
      kind: "format-contract",
      id,
      family: familyId,
      revision: next,
      period: "proposed",
      validity: { from: null, until: null },
      supersedes: next === 1 ? null : `${familyId}@${next - 1}`,
      structure: {},
      claims: [
        {
          id: "todo-first-claim",
          statement: todo("one falsifiable statement of what the sources show about the format"),
          evidenceClass: "unresolved",
          temporality: "current",
          observedAt: ctx.today,
          sources: [],
        },
      ],
      lifecycle: "draft",
      notes: AUTHORSHIP,
    };
    return { path: `records/contracts/${provider}/${slug}@${next}.json`, record, parts: [provider, slug] };
  },

  source(args, opts, ctx) {
    const raw = args[0];
    let base;
    let fragment;
    try {
      ({ base, fragment } = splitUrl(raw));
    } catch {
      fail(`a source needs an https URL, got ${JSON.stringify(raw)}`);
    }
    const url = new URL(base);
    if (url.username || url.password) fail("refused: the URL carries credentials (userinfo); record the public URL only");
    for (const key of url.searchParams.keys()) {
      if (/token|key|secret|sig|signature|password|passwd|auth|credential/i.test(key)) fail(`refused: the URL query parameter '${key}' looks like a credential or signature; record the public URL without it`);
    }
    const sourceType = need(opts, "source-type", SOURCE_TYPES.join(" | "));
    const observer = need(opts, "observer", "slug of the person or agent that read the page");
    const { id, dir } = sourceIdFor(base);
    const pin = pinFor(base);
    let locatorPin;
    let locatorUrl = base;
    if (pin.kind === "moving-ref") {
      fail(`refused: ${base} names a branch or tag, which can change. Use the 40-hex commit permalink for that file (schemas/v1/common: pinnedLink).`);
    } else if (pin.kind === "commit-permalink") {
      locatorPin = { kind: "commit-permalink", commit: pin.commit };
    } else if (pin.kind === "archive-snapshot") {
      locatorUrl = pin.url;
      locatorPin = { kind: "archive-snapshot", archiveUrl: pin.archiveUrl, capturedAt: pin.capturedAt };
    } else {
      locatorPin = { kind: "live-unpinned" };
    }
    const record = {
      schemaVersion: 1,
      kind: "evidence-source",
      id,
      sourceType,
      title: opts.title ?? todo("title of the page or file as its publisher gives it"),
      publisher: publisherFor(base),
      publishedAt: null,
      locator: { url: locatorUrl, pin: locatorPin },
      observations: [{ observedAt: opts["observed-at"] ?? ctx.today, outcome: "read", observer }],
      lifecycle: "draft",
    };
    // The fragment is a locator of the citing claim, never part of the source (ADR 0004).
    return { path: `records/sources/${dir}/${id}.json`, record, parts: [], note: fragment ? `the fragment '${fragment}' is not stored on the source; put it in the citing sourceRef 'locator'` : undefined };
  },

  scenario(args, opts, ctx) {
    const [id] = args;
    const families = list(opts.family);
    const classes = list(opts.class);
    const appliesTo = opts["applies-to"] ?? (families.length ? "families" : classes.length ? "family-classes" : "any-family");
    if (!["any-family", "families", "family-classes"].includes(appliesTo)) fail(`--applies-to must be any-family, families or family-classes, got '${appliesTo}'`);
    for (const f of families) if (!ctx.lk.has("family", f)) fail(`unknown family '${f}'`);
    const applicability = {
      appliesTo,
      ...(appliesTo === "families" ? { families } : {}),
      ...(appliesTo === "family-classes" ? { classes } : {}),
      rationale: todo("why these families (or all of them), and not others"),
    };
    const record = {
      schemaVersion: 1,
      kind: "scenario",
      id,
      title: need(opts, "title"),
      description: todo("what the scenario is, in words a reader needs no other record to follow"),
      semantics: todo("the rule that makes the outcome hold for every instance"),
      expectedOutcomeClass: "not-assertable",
      applicability,
      evidenceBasis: { basis: "unresolved", rationale: todo("what supports the outcome class, or what is missing"), sources: [], observedAt: ctx.today },
      lifecycle: "draft",
      notes: AUTHORSHIP,
    };
    return { path: `records/scenarios/${id}.json`, record, parts: [id] };
  },

  case(args, opts, ctx) {
    const [id] = args;
    const families = list(opts.family).map((f) => parseFamilyRef(f, ctx.lk));
    const caseTypes = list(opts.type);
    if (!caseTypes.length) fail("missing --type (positive | benign | twin | mutation | metamorphic | cross-family; repeat or comma-separate)");
    const scenarios = list(opts.scenario);
    for (const s of scenarios) if (!ctx.lk.has("scenario", s)) fail(`unknown scenario '${s}' (create it first: npm run record:new -- scenario ...)`);
    const record = {
      schemaVersion: 1,
      kind: "case",
      id,
      title: need(opts, "title"),
      summary: todo("what happened: the specific situation, with no real credential value"),
      rationale: todo("why it matters: the failure mode or ambiguity specific to this case"),
      caseTypes,
      families,
      ...(families.length ? {} : { unscopedReason: todo("why no family is involved") }),
      ...(scenarios.length ? { scenarios } : {}),
      expectation: {
        outcome: "not-assertable",
        basis: "unresolved",
        rationale: todo("the expected semantic outcome and what supports it, or what is missing"),
        sources: [],
        observedAt: ctx.today,
      },
      lifecycle: "draft",
      notes: AUTHORSHIP,
    };
    return { path: `records/cases/${id}.json`, record, parts: [id] };
  },
};

const ARITY = {
  provider: "<provider-id>",
  family: "<provider>:<family-slug>",
  contract: "<provider>:<family-slug>",
  source: "<https-url>",
  scenario: "<scenario-slug>",
  case: "<case-slug>",
};

/**
 * Plan one new record. Returns { path, record, placeholders, note } without touching the
 * disk. Throws ScaffoldError when the request must be refused.
 */
export function planRecord(kind, args, opts = {}, { root = repoRoot, today = new Date().toISOString().slice(0, 10), index, validator = createValidator() } = {}) {
  if (!SCAFFOLD_KINDS.includes(kind)) fail(`unknown kind '${kind}'; one of ${SCAFFOLD_KINDS.join(", ")}`);
  if (args.length !== 1 || !args[0]) fail(`${kind} takes exactly one argument: ${ARITY[kind]}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) fail(`date must be YYYY-MM-DD, got '${today}'`);
  const lk = lookup(index ?? loadIndex(root));
  const { path, record, parts, note } = PLANNERS[kind](args, opts, { lk, today });

  // Source ids derive from a host and a digest and are outside ADR 0007's scope (a scanner's repository is a legitimate source).
  if (kind !== "source") checkIdentityText(kind, parts, path);
  // Schema rules (slug shape, lengths, enums) come from the real schemas, not from here.
  const problems = validator.validateRecord(record);
  if (problems.length) fail(`refused: the skeleton is not schema-valid (${problems.join("; ")}); check the id and flags`);
  if (kind !== "source" && identityViolations(record, path).length) fail(`refused: identity lint would reject ${path}`);
  if (lk.has(record.kind, record.id)) {
    fail(`refused: ${record.kind} '${record.id}' already exists at ${lk.get(record.kind, record.id).path}${kind === "source" ? "; append an observation there instead of a second record" : ""}`);
  }
  if (lk.paths.has(path)) fail(`refused: ${path} already exists`);
  return { path, record, note };
}

export const serialize = (record) => `${JSON.stringify(record, null, 2)}\n`;

/** Write a planned record; never overwrites. */
export function writeRecord(plan, root = repoRoot) {
  const file = join(root, plan.path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, serialize(plan.record), { flag: "wx" });
  return file;
}
