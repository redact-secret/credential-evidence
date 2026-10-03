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

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { sourceIdFor, pinFor, publisherFor, splitUrl } from "../migrate/lib/sources.mjs";
import { codesForText, identityViolations } from "./identity.mjs";
import { PLACEHOLDER } from "./placeholders.mjs";
import { createValidator, listJson, repoRoot } from "./validator.mjs";

export const SCAFFOLD_KINDS = ["provider", "family", "contract", "source", "scenario", "case", "variant", "benign-sibling", "family-narrative", "review", "fixture"];

const VARIANT_TYPES = ["format-revision", "historical-form", "regional-form", "encoding-form", "deprecated-form", "other"];
const VARIANT_CHANGES = ["introduced", "revised", "deprecated", "retired", "corrected"];
const SIBLING_CLASSES = ["public-identifier", "documentation-placeholder", "test-vector", "lookalike", "non-secret-companion", "checksum-failing-near-miss", "other"];
const NARRATIVE_SECTIONS = ["shape", "issuance", "lifecycle", "collisions", "openQuestions"];
// Subjects a review history can be scaffolded for, and the event types an agent may write.
// An agent never writes `reviewed`, `resolved` or `withdrawn`: those are a second person's act.
const REVIEW_SUBJECTS = ["family", "family-narrative", "case", "variant", "benign-sibling", "scenario", "format-contract", "evidence-source"];
const AGENT_EVENTS = ["authored", "observed", "corrected", "disputed"];
const ACTOR_ROLES = ["author", "automation", "contributor"];
const AFFILIATIONS = ["project-maintainer", "external", "unknown"];
const VERDICTS = ["supports", "does-not-support", "inconclusive", "not-assertable"];

export const SOURCE_TYPES = ["provider-documentation", "provider-sdk-source", "scanner-rule-source", "third-party-writeup", "issue-or-discussion", "standard-or-rfc", "project-research-note", "other"];
const ROLES = ["subject", "lookalike", "context", "companion"];
const AUTHORSHIP = "Project-authored by the Redact Secret project, which maintains this repository; not independent evidence. Draft; not yet reviewed.";
// The narrative lint rejects the project's own name in narrative text (ADR 0010), `notes` included.
const NARRATIVE_AUTHORSHIP = "Project-authored by the maintainers of this repository; not independent evidence. Draft; not yet reviewed.";

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
// Verbatim repeated values (no comma splitting): a secret substring or a reason may hold commas.
const many = (v) => (v === undefined ? [] : [v].flat().map(String).filter((x) => x.length));
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

  variant(args, opts, ctx) {
    const [id] = args;
    need(opts, "family", "the family this form belongs to");
    if (list(opts.family).length !== 1) fail("--family takes exactly one family for a variant");
    const familyId = list(opts.family)[0];
    if (!ctx.lk.has("family", familyId)) fail(`unknown family '${familyId}' (create it first: npm run record:new -- family ...)`);
    const variantType = need(opts, "variant-type", VARIANT_TYPES.join(" | "));
    const change = need(opts, "change", `${VARIANT_CHANGES.join(" | ")}: what the first history entry records`);
    if (!VARIANT_TYPES.includes(variantType)) fail(`--variant-type must be one of ${VARIANT_TYPES.join(", ")}`);
    if (!VARIANT_CHANGES.includes(change)) fail(`--change must be one of ${VARIANT_CHANGES.join(", ")}`);
    if (opts.contract) {
      const c = ctx.lk.get("format-contract", opts.contract);
      if (!c) fail(`unknown contract '${opts.contract}'`);
      if (c.record.family !== familyId) fail(`contract '${opts.contract}' belongs to family '${c.record.family}', not '${familyId}'`);
    }
    if (opts.replaces && !ctx.lk.has("variant", opts.replaces)) fail(`--replaces: unknown variant '${opts.replaces}'`);
    const record = {
      schemaVersion: 1,
      kind: "variant",
      id,
      family: familyId,
      ...(opts.contract ? { contract: opts.contract } : {}),
      name: need(opts, "name"),
      variantType,
      description: opts.description ?? todo("what this form is and how it differs from the family's other forms, stated from evidence"),
      effective: { from: null, until: null },
      ...(opts.replaces ? { replaces: opts.replaces } : {}),
      history: [{ observedAt: ctx.today, change, note: todo("what the cited source says changed, and when it happened at the provider if it states so"), sources: [] }],
      lifecycle: "draft",
      notes: AUTHORSHIP,
    };
    const [provider] = familyId.split(":");
    return { path: `records/variants/${provider}/${id}.json`, record, parts: [id] };
  },

  "benign-sibling"(args, opts, ctx) {
    const [id] = args;
    const families = list(opts.family);
    if (!families.length) fail("missing --family (the family or families this can be confused with)");
    for (const f of families) if (!ctx.lk.has("family", f)) fail(`unknown family '${f}'`);
    const siblingClass = need(opts, "sibling-class", SIBLING_CLASSES.join(" | "));
    if (!SIBLING_CLASSES.includes(siblingClass)) fail(`--sibling-class must be one of ${SIBLING_CLASSES.join(", ")}`);
    const record = {
      schemaVersion: 1,
      kind: "benign-sibling",
      id,
      families,
      siblingClass,
      name: need(opts, "name"),
      description: opts.description ?? todo("what the value is, why it resembles the family, and why it is not a secret, stated from evidence"),
      evidenceClass: "unresolved",
      sources: [],
      observedAt: ctx.today,
      lifecycle: "draft",
      notes: AUTHORSHIP,
    };
    return { path: `records/siblings/${families[0].split(":")[0]}/${id}.json`, record, parts: [id] };
  },

  "family-narrative"(args, opts, ctx) {
    const [familyId] = args;
    const family = ctx.lk.get("family", familyId);
    if (!family) fail(`unknown family '${familyId}' (create it first: npm run record:new -- family ...)`);
    const [provider, slug] = familyId.split(":");
    let contract = opts.contract ?? family.record.currentContract ?? undefined;
    if (!contract) {
      const revs = ctx.lk.ofKind("format-contract").filter((e) => e.record.family === familyId).map((e) => e.record.revision);
      if (revs.length) contract = `${familyId}@${Math.max(...revs)}`;
    }
    if (contract) {
      const c = ctx.lk.get("format-contract", contract);
      if (!c) fail(`unknown contract '${contract}'`);
      if (c.record.family !== familyId) fail(`contract '${contract}' belongs to family '${c.record.family}'`);
    }
    // One unresolved placeholder per section: delete the sections you do not cover, write the rest.
    const sections = Object.fromEntries(
      NARRATIVE_SECTIONS.map((s) => [
        s,
        [
          {
            id: `${s.toLowerCase()}-todo`,
            text: todo(`one falsifiable statement for the ${s} section, in product-neutral words`),
            evidenceClass: "unresolved",
            temporality: "current",
            observedAt: ctx.today,
            unresolved: { reviewEvent: 2, reason: todo("why the sources do not settle it") },
          },
        ],
      ]),
    );
    const record = { schemaVersion: 1, kind: "family-narrative", id: familyId, family: familyId, lifecycle: "draft", ...(contract ? { contract } : {}), sections, notes: NARRATIVE_AUTHORSHIP };
    return { path: `records/narratives/${provider}/${slug}.json`, record, parts: [provider, slug] };
  },

  review(args, opts, ctx) {
    const raw = args[0];
    const colon = raw.indexOf(":");
    const subjectKind = colon > 0 ? raw.slice(0, colon) : "";
    const subjectId = colon > 0 ? raw.slice(colon + 1) : "";
    if (!REVIEW_SUBJECTS.includes(subjectKind) || !subjectId) fail(`review subject must be <kind>:<id> with kind one of ${REVIEW_SUBJECTS.join(", ")}, got '${raw}'`);
    if (!ctx.lk.has(subjectKind, subjectId)) fail(`unknown ${subjectKind} '${subjectId}'`);
    const flat = subjectId.replace(/[:@]/g, "-");
    let id;
    let path;
    if (subjectKind === "family") {
      const [p, s] = subjectId.split(":");
      id = `review-${p}-${s}`;
      path = `records/reviews/${p}/${s}.json`;
    } else if (subjectKind === "family-narrative") {
      const [p, s] = subjectId.split(":");
      id = `review-narrative-${p}-${s}`;
      path = `records/narrative-reviews/${p}/${s}.json`;
    } else {
      id = `review-${subjectKind}-${flat}`;
      path = `records/reviews/${subjectKind}/${flat}.json`;
    }
    const actorId = need(opts, "actor", "slug of the person or agent run that did the work");
    const role = opts.role ?? "author";
    const affiliation = opts.affiliation ?? "project-maintainer";
    if (!ACTOR_ROLES.includes(role)) fail(`--role must be one of ${ACTOR_ROLES.join(", ")}; a reviewer's events are written by the reviewer, never by this tool`);
    if (!AFFILIATIONS.includes(affiliation)) fail(`--affiliation must be one of ${AFFILIATIONS.join(", ")}`);
    const type = opts.event ?? "authored";
    if (!AGENT_EVENTS.includes(type)) fail(`--event must be one of ${AGENT_EVENTS.join(", ")}; reviewed, resolved and withdrawn are a second person's act`);
    if (opts.verdict && !VERDICTS.includes(opts.verdict)) fail(`--verdict must be one of ${VERDICTS.join(", ")}`);
    const actor = { id: actorId, role, affiliation };
    const existing = ctx.lk.ofKind("evidence-review-history").find((e) => e.record.subject.kind === subjectKind && e.record.subject.id === subjectId);
    if (existing && !opts.append) fail(`refused: ${existing.path} already holds the review history of ${subjectKind} '${subjectId}'; add events with --append`);
    if (!existing && opts.append) fail(`--append: no review history exists for ${subjectKind} '${subjectId}'`);
    // An imported history (a legacy-* externalRef) takes an appended event like any other: the edit is an amendment of the
    // import baseline, which record-new declares itself after writing (ADR 0015).
    let seq = existing ? existing.record.events.length : 0;
    const events = [
      {
        seq: ++seq,
        type,
        at: ctx.today,
        actor,
        ...(opts.verdict ? { verdict: opts.verdict } : {}),
        note: opts.note ?? todo("what you did and from what: sources read, AI assistance disclosed (an agent run is never an independent review)"),
      },
    ];
    const mapping = [];
    // `--unresolved` records "this statement is not settled" as one `observed` / `not-assertable` event and prints its
    // `reviewEvent` number for the subject to cite. A narrative's statements live in sections (`<section>/<statement-id>=<reason>`);
    // every other subject (a source, a contract, a case...) names the claim or field directly (`<statement-id>=<reason>`).
    const narrative = subjectKind === "family-narrative";
    for (const u of many(opts.unresolved)) {
      const m = /^(?:([A-Za-z]+)\/)?([a-z0-9]+(?:-[a-z0-9]+)*)=(.+)$/.exec(u);
      const shape = narrative ? `<section>/<statement-id>=<reason> with section one of ${NARRATIVE_SECTIONS.join(", ")}` : "<statement-id>=<reason> (no section: only a family-narrative has sections)";
      if (!m || (narrative ? !NARRATIVE_SECTIONS.includes(m[1] ?? "") : m[1] !== undefined)) fail(`--unresolved for a ${subjectKind} must be ${shape}, got '${u}'`);
      events.push({ seq: ++seq, type: "observed", at: ctx.today, actor, verdict: "not-assertable", note: `Statement '${m[2]}'${m[1] ? ` (${m[1]})` : ""} is recorded as unresolved: ${m[3].trim()}` });
      mapping.push(`${m[2]} -> unresolved.reviewEvent ${seq}`);
    }
    const note = mapping.length ? `set these on the ${subjectKind}: ${mapping.join("; ")}` : undefined;
    if (existing) return { path: existing.path, record: { ...existing.record, events: [...existing.record.events, ...events] }, parts: [], note, append: true };
    const record = { schemaVersion: 1, kind: "evidence-review-history", id, subject: { kind: subjectKind, id: subjectId }, events, notes: AUTHORSHIP };
    return { path, record, parts: [], note };
  },

  fixture(args, opts, ctx) {
    const [caseId] = args;
    const c = ctx.lk.get("case", caseId);
    if (!c) fail(`unknown case '${caseId}'`);
    const outcome = c.record.expectation.outcome;
    if (outcome === "not-assertable") fail(`case '${caseId}' is not-assertable: a fixture would assert nothing. Raise the case's outcome, basis and sources first (docs/authoring.md), in the same change`);
    const set = need(opts, "set", "fixture-set slug, for example <provider>-authored");
    const name = need(opts, "name", "fixture name slug");
    if ((opts.text === undefined) === (opts["text-file"] === undefined)) fail("give exactly one of --text <value> and --text-file <path>");
    const text = opts.text !== undefined ? String(opts.text) : readFileSync(opts["text-file"], "utf8");
    if (!text.length) fail("the fixture text is empty");
    const bytes = Buffer.from(text, "utf8");
    const spans = [];
    for (const s of many(opts.secret)) {
      const needle = Buffer.from(s, "utf8");
      const first = bytes.indexOf(needle);
      if (first < 0) fail("--secret value does not occur in the fixture text");
      if (bytes.indexOf(needle, first + 1) >= 0) fail("--secret value occurs more than once in the fixture text; use a longer, unique substring");
      spans.push({ start: first, end: first + needle.length, role: "secret", note: "Synthetic value; never issued." });
    }
    if (outcome === "must-flag" && !spans.length) fail("a must-flag fixture needs at least one --secret <substring> so its span is computed");
    if (outcome === "must-not-flag" && spans.length) fail("a must-not-flag fixture has no spans; drop --secret");
    spans.sort((a, b) => a.start - b.start);
    const item = {
      id: `${set}--${name}`,
      case: caseId,
      path: opts.path ?? `${name}/fixture.txt`,
      ...(opts.context ? { context: opts.context } : {}),
      sha256: createHash("sha256").update(bytes).digest("hex"),
      text,
      expected: { outcome, spans },
    };
    for (const e of ctx.lk.ofKind("fixture-set")) if (e.record.fixtures.some((f) => f.id === item.id)) fail(`refused: fixture id '${item.id}' already exists in ${e.path}`);
    const parts = [set, name];
    const summary = `${item.id}: ${bytes.length} bytes, sha256 ${item.sha256.slice(0, 12)}, ${spans.length} span(s)`;
    const existing = ctx.lk.get("fixture-set", set);
    if (existing) {
      const r = existing.record;
      if (r.generated || r.origin.type !== "authored-cases" || r.imported) fail(`refused: set '${set}' is generated or imported (${existing.path}); never add to it by hand. Use a different --set`);
      return { path: existing.path, record: { ...r, fixtures: [...r.fixtures, item] }, parts, append: true, note: summary };
    }
    const record = {
      schemaVersion: 1,
      kind: "fixture-set",
      id: set,
      title: opts.title ?? todo("title of this set of authored fixtures"),
      origin: { type: "authored-cases" },
      generated: false,
      fixtures: [item],
      lifecycle: "draft",
      notes: AUTHORSHIP,
    };
    return { path: `records/fixtures/${set}.json`, record, parts, note: summary };
  },
};

const ARITY = {
  provider: "<provider-id>",
  family: "<provider>:<family-slug>",
  contract: "<provider>:<family-slug>",
  source: "<https-url>",
  scenario: "<scenario-slug>",
  case: "<case-slug>",
  variant: "<variant-slug>",
  "benign-sibling": "<sibling-slug>",
  "family-narrative": "<provider>:<family-slug>",
  review: "<kind>:<subject-id>",
  fixture: "<case-slug>",
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
  const { path, record, parts, note, append } = PLANNERS[kind](args, opts, { lk, today });

  // Source ids derive from a host and a digest and are outside ADR 0007's scope (a scanner's repository is a legitimate source).
  if (kind !== "source") checkIdentityText(kind, parts, path);
  // Schema rules (slug shape, lengths, enums) come from the real schemas, not from here.
  const problems = validator.validateRecord(record);
  if (problems.length) fail(`refused: the skeleton is not schema-valid (${problems.join("; ")}); check the id and flags`);
  if (kind !== "source" && identityViolations(record, path).length) fail(`refused: identity lint would reject ${path}`);
  if (append) return { path, record, note, append: true };
  if (lk.has(record.kind, record.id)) {
    fail(`refused: ${record.kind} '${record.id}' already exists at ${lk.get(record.kind, record.id).path}${kind === "source" ? "; append an observation there instead of a second record" : ""}`);
  }
  if (lk.paths.has(path)) fail(`refused: ${path} already exists`);
  return { path, record, note };
}

export const serialize = (record) => `${JSON.stringify(record, null, 2)}\n`;

/**
 * Write a planned record. A new record never overwrites a file. An `append` plan (review
 * `--append`, an added fixture) rewrites the file it extends: only new events or items are
 * added, nothing is removed or edited.
 */
export function writeRecord(plan, root = repoRoot) {
  const file = join(root, plan.path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, serialize(plan.record), { flag: plan.append ? "w" : "wx" });
  return file;
}
