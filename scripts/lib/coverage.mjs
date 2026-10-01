// Coverage gaps (#24): which providers, families and scenarios lack which piece of evidence,
// and what to work on next. Pure and deterministic: records in, a prioritized backlog out.
// Reads nothing but its arguments (the CLI loads the files); no clock, no network.
//
// This repository measures and records; the backlog is a worklist about missing *evidence*,
// never a verdict about any product. Priority is a property of the gap, not of a provider.

import { codesForText } from "./identity.mjs";

export const RULES_VERSION = 1;
export const STALE_AFTER_MONTHS = 12; // docs/governance/corrections-and-disputes.md#source-staleness (proposed starting point)
export const UNRESOLVED_HEAVY_SHARE = 0.5;
export const USAGE_BONUS = 10; // the family is consumed by a case, a fixture plan or a fixture set
export const BLOCKED_PENALTY = 15; // desk research cannot close a gap the family's own blockers name

/** Base score per gap kind, the skill that closes it, and why. Higher score = work on it first. */
export const GAP_KINDS = {
  "family-unresearched": { score: 95, skill: "research-family", why: "the family is recorded but nothing about its format is established" },
  "provider-no-families": { score: 85, skill: "research-provider", why: "the provider is recorded but no credential family is" },
  "evidence-unresolved-only": { score: 85, skill: "research-family", why: "the family's contract holds no claim above unresolved" },
  "contract-missing": { score: 90, skill: "research-family", why: "the family was researched but has no current format contract" },
  "no-provider-source": { score: 80, skill: "research-family", why: "no claim rests on a provider-authored source" },
  "source-unreachable": { score: 75, skill: "source-freshness", why: "the last observation of a cited source found it unreachable, changed or superseded" },
  "evidence-stale": { score: 70, skill: "source-freshness", why: "a claim about current behavior was last observed more than 12 months ago" },
  "narrative-missing": { score: 60, skill: "research-family", why: "the family has no claim-backed narrative" },
  "narrative-unresolved-heavy": { score: 50, skill: "research-family", why: "at least half of the narrative's statements are unresolved" },
  "benign-siblings-missing": { score: 40, skill: "research-family", why: "no benign sibling or lookalike case is recorded for the family" },
  "observation-unverified": { score: 35, skill: "source-freshness", why: "every cited source was last observed only by an import, never re-read" },
  "cases-missing": { score: 30, skill: "author-case", why: "no Case and no fixture plan involves the family" },
  "scenario-unused": { score: 25, skill: "author-case", why: "no Case and no fixture plan instantiates the scenario" },
};
// New-provider wishlist entries sit below every gap that is a defect in recorded data.
export const WISHLIST_SCORES = { 1: 50, 2: 40, 3: 30 };
export const WISHLIST_KIND = "new-provider";
export const SKILLS = ["research-provider", "research-family", "author-case", "source-freshness"];
export const BANDS = [
  ["P0", 90],
  ["P1", 70],
  ["P2", 45],
  ["P3", 0],
];
export const priorityOf = (score) => BANDS.find(([, min]) => score >= min)[0];

// Research-type gaps that a family's blockers (issuance-gated, ...) explain.
const BLOCKABLE = new Set(["family-unresearched", "contract-missing", "evidence-unresolved-only", "no-provider-source", "narrative-unresolved-heavy", "benign-siblings-missing"]);
const PROVIDER_AUTHORED = new Set(["provider-documentation", "provider-sdk-source"]);
const NEGATIVE_STATES = new Set(["not-found", "rejected"]);
const LEGACY_OBSERVER = /^legacy-/;
const DATE = /^\d{4}-\d{2}-\d{2}/;

const dateOf = (v) => (typeof v === "string" && DATE.test(v) ? v.slice(0, 10) : null);
const slugOf = (id) => id.replace(/[:@]/g, "-");

/** YYYY-MM-DD minus whole calendar months, clamped to the month end. */
export function minusMonths(date, months) {
  const [y, m, d] = date.split("-").map(Number);
  const t = y * 12 + (m - 1) - months;
  const ny = Math.floor(t / 12);
  const nm = (t % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

/** Whole months from `from` to `to` (YYYY-MM-DD), floor. */
export function monthsBetween(from, to) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  let n = (ty - fy) * 12 + (tm - fm);
  if (td < fd) n -= 1;
  return Math.max(0, n);
}

/** The newest date recorded anywhere in the records: the default reference date. */
export function latestRecordedDate(records) {
  let max = "0000-00-00";
  const see = (v) => {
    const d = dateOf(v);
    if (d && d > max) max = d;
  };
  for (const r of records) {
    if (r.kind === "evidence-source") for (const o of r.observations ?? []) see(o.observedAt);
    else if (r.kind === "format-contract") for (const c of r.claims ?? []) see(c.observedAt);
    else if (r.kind === "family") see(r.research?.researchedAt);
    else if (r.kind === "case") see(r.expectation?.observedAt);
    else if (r.kind === "family-narrative") for (const s of Object.values(r.sections ?? {})) for (const st of s) see(st.observedAt);
  }
  return max === "0000-00-00" ? null : max;
}

/** Problems with a wishlist document, one per line, sorted. Empty when valid. */
export function validateWishlist(doc) {
  const errors = [];
  const slug = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return ["wishlist must be a JSON object"];
  if (doc.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (doc.kind !== "provider-wishlist") errors.push('kind must be "provider-wishlist"');
  if (!Array.isArray(doc.entries)) return [...errors, "entries must be an array"];
  const seen = new Set();
  let prev = "";
  doc.entries.forEach((e, i) => {
    const at = `entries[${i}]${e && typeof e.id === "string" ? ` (${e.id})` : ""}`;
    if (!e || typeof e !== "object") return errors.push(`${at}: must be an object`);
    const extra = Object.keys(e).filter((k) => !["id", "name", "rationale", "priority", "docsHint"].includes(k));
    if (extra.length) errors.push(`${at}: unknown field(s) ${extra.join(", ")}`);
    if (typeof e.id !== "string" || !slug.test(e.id) || e.id.length > 96) errors.push(`${at}: id must be a lowercase slug`);
    else {
      if (e.id === "generic") errors.push(`${at}: "generic" is reserved`);
      if (seen.has(e.id)) errors.push(`${at}: duplicate id`);
      seen.add(e.id);
      if (e.id < prev) errors.push(`${at}: entries must be sorted by id`);
      prev = e.id;
      const codes = [...codesForText(e.id, { segments: false })];
      if (codes.length) errors.push(`${at}: id carries a forbidden coordinate (${codes.join(", ")}); see ADR 0007`);
    }
    if (typeof e.name !== "string" || !e.name.trim() || e.name.length > 200) errors.push(`${at}: name is required (max 200 chars)`);
    if (typeof e.rationale !== "string" || e.rationale.trim().length < 20 || e.rationale.length > 400) errors.push(`${at}: rationale must say why research is worthwhile (20-400 chars)`);
    if (!(e.priority in WISHLIST_SCORES)) errors.push(`${at}: priority must be 1, 2 or 3`);
    if (e.docsHint !== undefined) {
      let u = null;
      try {
        u = new URL(e.docsHint);
      } catch {
        // reported below
      }
      if (!u || u.protocol !== "https:" || u.username || u.password || u.search) errors.push(`${at}: docsHint must be a plain https URL without credentials or query (a starting point, not a source)`);
    }
  });
  return errors.sort();
}

function claimsOf(contract) {
  return contract?.claims ?? [];
}

/** Index every record the rules need. Deterministic: all lists sorted. */
function index(records) {
  const by = (kind) => records.filter((r) => r.kind === kind);
  const sources = new Map(by("evidence-source").map((s) => [s.id, s]));
  const contractsByFamily = new Map();
  for (const c of by("format-contract")) {
    if (!contractsByFamily.has(c.family)) contractsByFamily.set(c.family, []);
    contractsByFamily.get(c.family).push(c);
  }
  for (const list of contractsByFamily.values()) list.sort((a, b) => a.revision - b.revision);
  const narratives = new Map(by("family-narrative").map((n) => [n.family, n]));

  const casesByFamily = new Map();
  const benignByFamily = new Map();
  const scenarioUse = new Set();
  const plannedFamilies = new Set();
  const planTargets = new Set();
  let planAllApplicable = false;
  for (const c of by("case")) {
    const isBenign = c.caseTypes.includes("benign");
    for (const f of c.families) {
      if (!casesByFamily.has(f.family)) casesByFamily.set(f.family, []);
      casesByFamily.get(f.family).push(c.id);
      if (isBenign || f.role === "lookalike") {
        if (!benignByFamily.has(f.family)) benignByFamily.set(f.family, new Set());
        benignByFamily.get(f.family).add(c.id);
      }
    }
    for (const s of c.scenarios ?? []) scenarioUse.add(s);
  }
  for (const b of by("benign-sibling")) {
    for (const f of b.families) {
      if (!benignByFamily.has(f)) benignByFamily.set(f, new Set());
      benignByFamily.get(f).add(b.id);
    }
  }
  for (const p of by("fixture-plan")) {
    if (p.matrix?.families?.select === "listed") for (const id of p.matrix.families.ids) plannedFamilies.add(id);
    else planAllApplicable = true;
    for (const t of p.matrix?.targets ?? []) planTargets.add(`${t.type}:${t.id}`);
  }
  return { sources, contractsByFamily, narratives, casesByFamily, benignByFamily, scenarioUse, plannedFamilies, planTargets, planAllApplicable };
}

function currentContractOf(family, ix) {
  const list = ix.contractsByFamily.get(family.id) ?? [];
  const pinned = family.currentContract ? list.find((c) => c.id === family.currentContract) : null;
  if (pinned) return { contract: pinned, current: true };
  const current = [...list].reverse().find((c) => c.period === "current");
  if (current) return { contract: current, current: true };
  return { contract: list.at(-1) ?? null, current: false };
}

function latestObservation(source) {
  const obs = source.observations ?? [];
  let best = null;
  obs.forEach((o, i) => {
    const d = dateOf(o.observedAt) ?? "";
    if (!best || d >= best.d) best = { d, i, o };
  });
  return best?.o ?? null;
}

function item(gapKind, scope, extra) {
  const spec = GAP_KINDS[gapKind];
  return { gapKind, scope, base: spec.score, skill: spec.skill, why: spec.why, ...extra };
}

/** Raw (unscored) gaps for one family. */
function familyGaps(family, ix, asOf) {
  const out = [];
  const scope = { kind: "family", id: family.id, provider: family.provider };
  const cutoff = minusMonths(asOf, STALE_AFTER_MONTHS);
  const state = family.research?.state;
  const { contract, current: hasCurrent } = currentContractOf(family, ix);
  const claims = claimsOf(contract);
  const cited = [...new Set(claims.flatMap((c) => (c.sources ?? []).map((s) => s.sourceId)))].sort();
  const citedSources = cited.map((id) => ix.sources.get(id)).filter(Boolean);

  // Staleness applies to every researched verdict, including a negative one.
  const staleClaims = claims
    .filter((c) => c.temporality === "current" && c.evidenceClass !== "unresolved" && dateOf(c.observedAt) && dateOf(c.observedAt) < cutoff)
    .map((c) => ({ id: c.id, observedAt: dateOf(c.observedAt), ageMonths: monthsBetween(dateOf(c.observedAt), asOf) }));
  const staleSources = citedSources
    .filter((s) => s.locator?.pin?.kind === "live-unpinned")
    .map((s) => ({ id: s.id, observedAt: dateOf(latestObservation(s)?.observedAt) }))
    .filter((s) => s.observedAt && s.observedAt < cutoff)
    .map((s) => ({ ...s, ageMonths: monthsBetween(s.observedAt, asOf) }));
  const negativeStale = NEGATIVE_STATES.has(state) && dateOf(family.research.researchedAt) && dateOf(family.research.researchedAt) < cutoff;
  if (negativeStale) {
    out.push(item("evidence-stale", scope, { facts: { verdict: state, researchedAt: dateOf(family.research.researchedAt), ageMonths: monthsBetween(dateOf(family.research.researchedAt), asOf) }, ageMonths: monthsBetween(dateOf(family.research.researchedAt), asOf) }));
  } else if (staleClaims.length || staleSources.length) {
    const ageMonths = Math.max(0, ...staleClaims.map((c) => c.ageMonths), ...staleSources.map((s) => s.ageMonths));
    out.push(item("evidence-stale", scope, { facts: { staleClaims: staleClaims.slice(0, 10), staleSources: staleSources.slice(0, 10).map((s) => s.id) }, ageMonths }));
  }

  if (NEGATIVE_STATES.has(state)) return out; // a recorded negative result is a finished verdict, not a gap

  if (state === "unresearched") {
    out.push(item("family-unresearched", scope, { facts: { currentContract: family.currentContract ?? null } }));
    return out;
  }

  if (!hasCurrent) {
    out.push(item("contract-missing", scope, { facts: { contracts: (ix.contractsByFamily.get(family.id) ?? []).map((c) => `${c.id} (${c.period})`) } }));
  } else {
    const strong = claims.filter((c) => c.evidenceClass !== "unresolved").length;
    const unresolved = claims.length - strong;
    const providerAuthored = citedSources.some((s) => PROVIDER_AUTHORED.has(s.sourceType)) || claims.some((c) => c.evidenceClass === "provider-documented");
    if (strong === 0) out.push(item("evidence-unresolved-only", scope, { facts: { contract: contract.id, claims: claims.length, unresolved } }));
    else if (!providerAuthored) out.push(item("no-provider-source", scope, { facts: { contract: contract.id, claims: claims.length, citedSources: cited.length } }));

    const importOnly = citedSources.filter((s) => (s.observations ?? []).length > 0 && s.observations.every((o) => LEGACY_OBSERVER.test(o.observer)));
    if (importOnly.length) out.push(item("observation-unverified", scope, { facts: { contract: contract.id, importOnlySources: importOnly.length, citedSources: citedSources.length } }));

    const unreachable = citedSources.filter((s) => ["unreachable", "changed", "superseded"].includes(latestObservation(s)?.outcome));
    if (unreachable.length) out.push(item("source-unreachable", scope, { facts: { sources: unreachable.slice(0, 10).map((s) => `${s.id} (${latestObservation(s).outcome})`) } }));
  }

  const narrative = ix.narratives.get(family.id);
  if (!narrative) out.push(item("narrative-missing", scope, { facts: {} }));
  else {
    const statements = Object.values(narrative.sections ?? {}).flat();
    const unresolved = statements.filter((s) => s.evidenceClass === "unresolved").length;
    const share = statements.length ? unresolved / statements.length : 0;
    if (statements.length && share >= UNRESOLVED_HEAVY_SHARE) out.push(item("narrative-unresolved-heavy", scope, { facts: { statements: statements.length, unresolved, share: Math.round(share * 100) / 100 }, share }));
  }

  if (!(ix.benignByFamily.get(family.id)?.size > 0)) out.push(item("benign-siblings-missing", scope, { facts: {} }));
  if (!(ix.casesByFamily.get(family.id)?.length > 0) && !ix.plannedFamilies.has(family.id) && !ix.planAllApplicable) out.push(item("cases-missing", scope, { facts: {} }));
  return out;
}

/**
 * Build the backlog. `records` are parsed record objects (any kind); `wishlist` is a parsed
 * provider-wishlist document or null; `asOf` is YYYY-MM-DD (default: newest date in records).
 */
export function buildBacklog(records, { wishlist = null, asOf = latestRecordedDate(records) } = {}) {
  if (!asOf) throw new Error("no reference date: pass asOf or provide records that carry a date");
  const ix = index(records);
  const providers = records.filter((r) => r.kind === "provider").sort((a, b) => a.id.localeCompare(b.id));
  const families = records.filter((r) => r.kind === "family").sort((a, b) => a.id.localeCompare(b.id));
  const scenarios = records.filter((r) => r.kind === "scenario").sort((a, b) => a.id.localeCompare(b.id));
  const providerIds = new Set(providers.map((p) => p.id));
  const raw = [];

  for (const p of providers) {
    if (p.id !== "generic" && !families.some((f) => f.provider === p.id)) raw.push(item("provider-no-families", { kind: "provider", id: p.id, provider: p.id }, { facts: {} }));
  }
  for (const f of families) raw.push(...familyGaps(f, ix, asOf));
  for (const s of scenarios) {
    if (!ix.scenarioUse.has(s.id) && !ix.planTargets.has(`scenario:${s.id}`)) raw.push(item("scenario-unused", { kind: "scenario", id: s.id, provider: null }, { facts: {} }));
  }

  const familyById = new Map(families.map((f) => [f.id, f]));
  const items = raw.map((g) => {
    const family = g.scope.kind === "family" ? familyById.get(g.scope.id) : null;
    const inUse = !!family && (ix.casesByFamily.has(family.id) || ix.plannedFamilies.has(family.id));
    const blockerKinds = family ? [...new Set((family.research?.blockers ?? []).map((b) => b.kind))].sort() : [];
    const blocked = BLOCKABLE.has(g.gapKind) && blockerKinds.length > 0;
    const parts = [{ rule: "gap-kind", points: g.base, why: g.why }];
    let score = g.base;
    if (g.gapKind === "evidence-stale" && g.ageMonths > STALE_AFTER_MONTHS) {
      const extra = Math.min(15, Math.floor((g.ageMonths - STALE_AFTER_MONTHS) / 3));
      if (extra) {
        score += extra;
        parts.push({ rule: "age", points: extra, why: `${g.ageMonths} months since the last observation (+1 per 3 months past ${STALE_AFTER_MONTHS}, max 15)` });
      }
    }
    if (g.gapKind === "narrative-unresolved-heavy") {
      const extra = Math.round((g.share - UNRESOLVED_HEAVY_SHARE) * 20);
      if (extra) {
        score += extra;
        parts.push({ rule: "unresolved-share", points: extra, why: `${Math.round(g.share * 100)}% of statements unresolved (+1 per 5 points above 50%)` });
      }
    }
    if (inUse) {
      score += USAGE_BONUS;
      parts.push({ rule: "in-use", points: USAGE_BONUS, why: "a Case or fixture plan already involves this family" });
    }
    if (blocked) {
      score -= BLOCKED_PENALTY;
      parts.push({ rule: "blocked", points: -BLOCKED_PENALTY, why: `the family records blockers (${blockerKinds.join(", ")}) that desk research may not clear` });
    }
    return finish(g, score, parts, blockerKinds.length ? blockerKinds : null);
  });

  const wish = [];
  for (const e of wishlist?.entries ?? []) {
    if (providerIds.has(e.id)) continue;
    const score = WISHLIST_SCORES[e.priority];
    wish.push(
      finish(
        { gapKind: WISHLIST_KIND, scope: { kind: "provider", id: e.id, provider: e.id }, skill: "research-provider", why: "a provider on the wishlist has no record yet", facts: { name: e.name, wishlistPriority: e.priority, rationale: e.rationale, ...(e.docsHint ? { docsHint: e.docsHint } : {}) } },
        score,
        [{ rule: "wishlist-priority", points: score, why: `wishlist priority ${e.priority}: below every gap in recorded data` }],
        null,
      ),
    );
  }
  const all = [...items, ...wish].sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const byKind = {};
  const byPriority = {};
  const bySkill = {};
  for (const i of all) {
    byKind[i.gapKind] = (byKind[i.gapKind] ?? 0) + 1;
    byPriority[i.priority] = (byPriority[i.priority] ?? 0) + 1;
    bySkill[i.suggestedSkill] = (bySkill[i.suggestedSkill] ?? 0) + 1;
  }
  const sortKeys = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));
  const recordedWishlist = (wishlist?.entries ?? []).filter((e) => providerIds.has(e.id)).map((e) => e.id);
  return {
    schemaVersion: 1,
    kind: "coverage-backlog",
    rulesVersion: RULES_VERSION,
    asOf,
    staleAfterMonths: STALE_AFTER_MONTHS,
    totals: { providers: providers.length, families: families.length, scenarios: scenarios.length, items: all.length, byPriority: sortKeys(byPriority), byGapKind: sortKeys(byKind), bySuggestedSkill: sortKeys(bySkill), wishlistAlreadyRecorded: recordedWishlist.sort() },
    items: all,
  };
}

function finish(g, score, parts, blockers) {
  const subject = g.scope.id;
  const id = `${g.gapKind}:${subject}`;
  const slug = `${g.gapKind}/${slugOf(subject)}`;
  return {
    id,
    gapKind: g.gapKind,
    scope: g.scope,
    priority: priorityOf(score),
    score,
    suggestedSkill: g.skill,
    suggestedInput: g.scope.id,
    rationale: parts.map((p) => `${p.points >= 0 ? "+" : ""}${p.points} ${p.rule}: ${p.why}`),
    facts: g.facts,
    blockedBy: blockers,
    // For the cron harness (#25): skip an item whose branch or PR title tag already exists.
    dedupe: { key: id, branchHint: `coverage/${slug}`, prTitleTag: `[coverage:${id}]` },
  };
}

/** Select the next items: filters, skip list, and a limit. Order is the backlog's order. */
export function selectNext(backlog, { limit = 1, skip = [], gapKind = null, provider = null, skill = null, minPriority = null } = {}) {
  const skipSet = new Set(skip);
  const order = BANDS.map(([b]) => b);
  return backlog.items
    .filter((i) => !skipSet.has(i.id) && !skipSet.has(i.dedupe.branchHint) && !skipSet.has(i.dedupe.prTitleTag))
    .filter((i) => !gapKind || i.gapKind === gapKind)
    .filter((i) => !provider || i.scope.provider === provider)
    .filter((i) => !skill || i.suggestedSkill === skill)
    .filter((i) => !minPriority || order.indexOf(i.priority) <= order.indexOf(minPriority))
    .slice(0, limit);
}

const cell = (s) => String(s).replace(/\|/g, "\\|");

/** The human summary (docs/research/coverage.md). */
export function renderMarkdown(backlog) {
  const t = backlog.totals;
  const L = [];
  L.push("# Research coverage");
  L.push("");
  L.push("Generated by `npm run coverage:gaps`; do not edit. The machine-readable backlog is [backlog.json](backlog.json), the");
  L.push("rules and fields are in [README.md](README.md), and the skill that uses it is");
  L.push("[coverage-gaps](../../.agents/skills/coverage-gaps/SKILL.md). This is a worklist of missing evidence, not a");
  L.push("statement about any product.");
  L.push("");
  L.push(`Reference date: ${backlog.asOf} (the newest date recorded in \`records/\`). Staleness period: ${backlog.staleAfterMonths} months.`);
  L.push("");
  L.push(`${t.providers} providers, ${t.families} families, ${t.scenarios} scenarios: **${t.items} open items**.`);
  L.push("");
  L.push("## By priority");
  L.push("");
  L.push("| Priority | Score | Items |");
  L.push("| --- | --- | --- |");
  BANDS.forEach(([b, min], i) => L.push(`| ${b} | ${i === 0 ? "90+" : `${min}-${BANDS[i - 1][1] - 1}`} | ${t.byPriority[b] ?? 0} |`));
  L.push("");
  L.push("## By gap kind");
  L.push("");
  L.push("| Gap kind | Base score | Items | Closed by | Meaning |");
  L.push("| --- | --- | --- | --- | --- |");
  const kinds = [...Object.entries(GAP_KINDS), [WISHLIST_KIND, { score: "30-50", skill: "research-provider", why: "a provider on the wishlist has no record yet" }]];
  for (const [k, s] of kinds.sort((a, b) => (typeof b[1].score === "number" ? b[1].score : 50) - (typeof a[1].score === "number" ? a[1].score : 50) || (a[0] < b[0] ? -1 : 1))) {
    L.push(`| \`${k}\` | ${s.score} | ${t.byGapKind[k] ?? 0} | \`${s.skill}\` | ${cell(s.why)} |`);
  }
  L.push("");
  L.push("## Top of the backlog");
  L.push("");
  L.push("| # | Item | Priority | Score | Skill |");
  L.push("| --- | --- | --- | --- | --- |");
  backlog.items.slice(0, 25).forEach((i, n) => L.push(`| ${n + 1} | \`${cell(i.id)}\` | ${i.priority} | ${i.score} | \`${i.suggestedSkill}\` |`));
  L.push("");
  L.push("## By provider");
  L.push("");
  L.push("Items per provider (family and provider-scope items; scenarios and wishlist entries are listed separately).");
  L.push("");
  L.push("| Provider | Items | Best score | Gap kinds |");
  L.push("| --- | --- | --- | --- |");
  const perProvider = new Map();
  for (const i of backlog.items) {
    if (i.gapKind === WISHLIST_KIND || i.scope.kind === "scenario") continue;
    const p = i.scope.provider;
    if (!perProvider.has(p)) perProvider.set(p, { n: 0, best: 0, kinds: new Set() });
    const e = perProvider.get(p);
    e.n += 1;
    e.best = Math.max(e.best, i.score);
    e.kinds.add(i.gapKind);
  }
  for (const [p, e] of [...perProvider].sort((a, b) => b[1].best - a[1].best || (a[0] < b[0] ? -1 : 1))) L.push(`| ${p} | ${e.n} | ${e.best} | ${[...e.kinds].sort().join(", ")} |`);
  L.push("");
  const scen = backlog.items.filter((i) => i.scope.kind === "scenario");
  if (scen.length) {
    L.push("## Scenarios nothing instantiates");
    L.push("");
    for (const i of scen) L.push(`- \`${i.scope.id}\` (${i.priority}, ${i.score})`);
    L.push("");
  }
  L.push("## New-provider wishlist");
  L.push("");
  const wl = backlog.items.filter((i) => i.gapKind === WISHLIST_KIND);
  if (!wl.length) L.push("No queued entries.");
  else {
    L.push("| Provider | Priority | Why |");
    L.push("| --- | --- | --- |");
    for (const i of wl) L.push(`| \`${i.scope.id}\` (${cell(i.facts.name)}) | ${i.facts.wishlistPriority} | ${cell(i.facts.rationale)} |`);
  }
  if (t.wishlistAlreadyRecorded.length) {
    L.push("");
    L.push(`Already recorded, prune from the wishlist: ${t.wishlistAlreadyRecorded.map((x) => `\`${x}\``).join(", ")}.`);
  }
  L.push("");
  return L.join("\n");
}

export const serialize = (obj) => `${JSON.stringify(obj, null, 2)}\n`;
