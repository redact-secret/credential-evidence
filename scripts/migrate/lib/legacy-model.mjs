// Reads the pinned legacy benchmark revision into an in-memory model the
// reclassifying importer works from. Pure: no clock, no network, no randomness.
//
// This module is the only place that knows the legacy grouping of fixtures into
// the "imported cases" that #4 minted (key = suite, shape, role, outcome, tier).
// Those groups are migration input: they are the units the reclassification report
// counts and the legacy map traces. They never become canonical identity.

import { createHash } from "node:crypto";
import { LEGACY_PATHS, LEGACY_REPOSITORY, LEGACY_REVISION, readLegacyJson } from "./legacy-source.mjs";
import { clip, isProjectOwned, ownerOf, sourceIdFor, splitUrl } from "./sources.mjs";

export const TEXT_MAX = 2000;
export const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export const uniqSorted = (xs) => [...new Set(xs)].sort(cmp);
export const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const SOURCE_TYPE_WORDS = {
  "provider-documentation": "provider documentation",
  "provider-sdk-source": "provider SDK source",
  "scanner-rule-source": "open-source scanner rule",
  "standard-or-rfc": "standard or RFC",
  "third-party-writeup": "third-party write-up",
  "issue-or-discussion": "issue or discussion",
  "project-research-note": "project research note",
  other: "source",
};

const BOILERPLATE_SPAN_NOTES = new Set([
  "Locally constructed synthetic value; never issued by a provider.",
  "Synthetic credential-shaped test value; never issued by a provider.",
  "Deterministically constructed synthetic token; never issued by GitHub.",
]);
export const isBoilerplateSpanNote = (n) => BOILERPLATE_SPAN_NOTES.has(n);

/** Where each suite's fixtures come from in the legacy repository (a provenance pointer; never canonical identity). */
export function suiteSourcePath(suite) {
  if (suite === "accuracy" || suite === "token-contexts" || suite === "real-world-shapes") return LEGACY_PATHS.authoredCorpora[suite];
  if (suite.startsWith("beta8-")) return `fixtures/generated/beta8/${suite.slice(6)}.mjs`;
  const file = {
    "credential-formats": "build.mjs",
    "context-edges": "build.mjs",
    "negative-controls": "build.mjs",
    "sendgrid-regressions": "regressions.mjs",
    "reference-syntax": "regressions.mjs",
    "milestone-6-closed": "closed-milestone.mjs",
    "detector-coverage": "detector-coverage.mjs",
    "common-formats": "common-formats.mjs",
    "policy-qualified-credentials": "policy-qualified-credentials.mjs",
  }[suite];
  if (!file) throw new Error(`no legacy source path known for suite '${suite}'`);
  return `fixtures/generated/${file}`;
}

/** Load the committed taxonomy records the import cites. */
export function loadTaxonomy(readTree) {
  const families = new Map();
  const sources = new Map();
  const providers = new Map();
  for (const rec of readTree("families")) families.set(rec.id, rec);
  for (const rec of readTree("sources")) sources.set(rec.id, rec);
  for (const rec of readTree("providers")) providers.set(rec.id, rec);
  return { families, sources, providers };
}

/** Counters and sets that feed the generated reports. */
export class Tally {
  constructor() {
    this.counts = new Map();
    this.lists = new Map();
  }
  inc(name, n = 1) {
    this.counts.set(name, (this.counts.get(name) ?? 0) + n);
  }
  get(name) {
    return this.counts.get(name) ?? 0;
  }
  add(list, item) {
    if (!this.lists.has(list)) this.lists.set(list, new Set());
    this.lists.get(list).add(item);
  }
  list(name) {
    return uniqSorted(this.lists.get(name) ?? []);
  }
  withPrefix(prefix) {
    return [...this.counts.keys()].filter((k) => k.startsWith(prefix)).sort(cmp).map((k) => [k.slice(prefix.length), this.counts.get(k)]);
  }
}

const EVIDENCE_ORDER = { unresolved: 0, "project-policy": 1, "tool-corroborated": 2, "provider-documented": 3 };
export const weakestBasis = (bases) => [...bases].sort((a, b) => EVIDENCE_ORDER[a] - EVIDENCE_ORDER[b])[0];

/**
 * @returns {{ revision, suites, fx, aggs, byAgg, catById, corpora, knownGaps, semantics, tally, permalink }}
 *   fx:   every legacy fixture { suite, slug, name, f, generated, idx, agg }
 *   aggs: every imported-case group (sorted by key) with its derived legacy id and evidence
 */
export function loadLegacyModel({ root, generated, taxonomy, revision = LEGACY_REVISION }) {
  const R = new Tally();
  const categories = readLegacyJson(root, LEGACY_PATHS.categories);
  const index = readLegacyJson(root, LEGACY_PATHS.fixtureIndexFile);
  const knownGaps = readLegacyJson(root, LEGACY_PATHS.knownGapsFile);
  const semantics = readLegacyJson(root, LEGACY_PATHS.fixtureSemantics);
  const detectorAssignments = readLegacyJson(root, LEGACY_PATHS.fixtureDetectors);
  const permalink = (path) => `https://github.com/${LEGACY_REPOSITORY}/blob/${revision}/${path}`;

  const corpora = new Map();
  for (const [id, sha] of Object.entries(generated.reproduction)) {
    if (!sha.matches) throw new Error(`generated corpus '${id}' does not reproduce the committed hash manifest; refusing to import drifted output`);
  }
  for (const id of Object.keys(generated.corpora)) corpora.set(id, { corpus: generated.corpora[id], generated: true });
  for (const [id, path] of Object.entries(LEGACY_PATHS.authoredCorpora)) corpora.set(id, { corpus: readLegacyJson(root, path), generated: false });
  const suites = [...corpora.keys()].sort(cmp);
  const catById = new Map(categories.map((c) => [c.id, c]));
  for (const s of suites) if (!catById.has(s)) throw new Error(`suite ${s} has no entry in categories.json`);

  // ---- flatten fixtures, cross-check the legacy semantic index
  const fx = [];
  const bySlug = new Map();
  for (const suite of suites) {
    for (const f of corpora.get(suite).corpus.fixtures) {
      const slug = `${suite}--${f.id}`;
      if (bySlug.has(slug)) throw new Error(`duplicate legacy fixture slug ${slug}`);
      const entry = { suite, slug, name: f.id, f, generated: corpora.get(suite).generated };
      fx.push(entry);
      bySlug.set(slug, entry);
    }
  }
  const idxBySlug = new Map(index.fixtures.map((e) => [e.slug, e]));
  for (const e of fx) {
    const idx = idxBySlug.get(e.slug);
    if (!idx) throw new Error(`fixture ${e.slug} is missing from fixture-index.json`);
    e.idx = idx;
  }
  for (const slug of idxBySlug.keys()) if (!bySlug.has(slug)) throw new Error(`fixture-index.json lists ${slug}, which no corpus produces`);
  R.inc("legacy:fixtures", fx.length);

  // ---- sources
  const sourceRecord = (base) => taxonomy.sources.get(sourceIdFor(base).id);
  const resolveSources = (urls) => {
    const refs = [];
    for (const raw of urls ?? []) {
      const { base, fragment } = splitUrl(raw);
      const rec = sourceRecord(base);
      if (!rec) {
        R.inc("dropped:assessment-source-not-in-taxonomy-import");
        R.add("dropped:assessment-source-not-in-taxonomy-import", base);
        continue;
      }
      refs.push({ record: rec, base, locator: fragment ? clip(fragment, 300) : undefined });
    }
    return refs;
  };

  // ---- legacy outcome, role and imported-case key per fixture
  const outcomeOf = (f) => {
    const a = f.assessment;
    if (a.tier === "T0") return "not-assertable";
    if (a.kind === "must-redact") {
      if (!f.expected.length) throw new Error(`${f.id}: must-redact without spans`);
      return "must-flag";
    }
    if (a.kind === "must-not-flag") {
      if (f.expected.some((s) => (s.role ?? "secret") === "secret")) throw new Error(`${f.id}: must-not-flag with a secret span`);
      return "must-not-flag";
    }
    if (a.kind === "policy") return f.expected.length ? "must-flag" : "must-not-flag";
    throw new Error(`${f.id}: unknown assessment kind ${a.kind}`);
  };

  const aggMap = new Map();
  for (const e of fx) {
    const { suite, f } = e;
    let shape;
    let role;
    let roleKind;
    let label = f.group;
    if (suite.startsWith("beta8-")) {
      const seg = f.group.split(" · ");
      shape = seg[1];
      const rest = seg.slice(2);
      if (rest[0] === "twin") ({ role, roleKind } = { role: `twin-${rest[1]}`, roleKind: "twin" });
      else if (rest[0] === "control") ({ role, roleKind } = { role: `control-${rest[1]}`, roleKind: "control" });
      else ({ role, roleKind } = { role: "base", roleKind: "base" });
      label = seg.slice(0, 2).join(" · ");
    } else {
      shape = f.group;
      if (f.twinOf) ({ role, roleKind } = { role: `twin-${f.mutationKind}`, roleKind: "twin" });
      else ({ role, roleKind } = { role: "base", roleKind: "base" });
    }
    if (roleKind === "twin" && !f.twinOf) throw new Error(`${e.slug}: twin group without twinOf`);
    const outcome = outcomeOf(f);
    const key = [suite, shape, role, outcome, f.assessment.tier].join("\u0000");
    let agg = aggMap.get(key);
    if (!agg) {
      agg = { key, suite, shape, label, group: f.group, role, roleKind, outcome, tier: f.assessment.tier, kind: f.assessment.kind, entries: [] };
      aggMap.set(key, agg);
    }
    agg.entries.push(e);
    e.agg = agg;
    e.outcome = outcome;
  }
  const aggs = [...aggMap.values()].sort((a, b) => cmp(a.key, b.key));

  // ---- the ids #4 minted for these groups (collision-resolved). Kept only to trace them in the legacy map.
  const used = new Set();
  const shortenId = (id) => (id.length <= 96 ? id : `${id.slice(0, 84).replace(/-+$/, "")}-${createHash("sha256").update(id).digest("hex").slice(0, 8)}`);
  for (const agg of aggs) {
    const suffix = agg.role === "base" ? "" : `-${agg.role}`;
    const outcomeWord = { "must-flag": "flag", "must-not-flag": "benign", "not-assertable": "unresolved" }[agg.outcome];
    const candidates = [
      `${agg.suite}-${slugify(agg.shape)}${suffix}`,
      `${agg.suite}-${slugify(agg.shape)}${suffix}-${outcomeWord}`,
      `${agg.suite}-${slugify(agg.shape)}${suffix}-${outcomeWord}-${agg.tier.toLowerCase()}`,
    ].map(shortenId);
    const id = candidates.find((c) => !used.has(c));
    if (!id) throw new Error(`cannot derive a unique imported-case id for ${agg.key}`);
    used.add(id);
    agg.legacyCaseId = id;
  }

  // ---- evidence per group: the legacy tier re-expressed as a canonical basis, same rules as #4
  const reviewedAt = semantics.reviewedAt;
  for (const agg of aggs) {
    const fixturesOf = agg.entries.map((e) => e.f);
    const refs = [];
    const seen = new Set();
    for (const e of agg.entries) {
      for (const r of resolveSources(e.f.assessment.sources)) {
        const supports = `Cited by the legacy assessment (${SOURCE_TYPE_WORDS[r.record.sourceType] ?? "source"}); claim not itemised.`;
        const k = `${r.record.id}|${r.locator ?? ""}`;
        if (seen.has(k)) continue;
        seen.add(k);
        refs.push({ record: r.record, ref: { sourceId: r.record.id, supports, ...(r.locator ? { locator: r.locator } : {}) } });
      }
    }
    refs.sort((a, b) => cmp(JSON.stringify(a.ref), JSON.stringify(b.ref)));
    const nonProject = refs.filter((x) => !isProjectOwned(x.record.locator.url));
    const owners = uniqSorted(nonProject.map((x) => ownerOf(x.record.locator.url)));
    const hasProviderSource = nonProject.some((x) => ["provider-documentation", "provider-sdk-source"].includes(x.record.sourceType));
    let basis;
    let basisNote = "";
    if (agg.tier === "T1") {
      if (hasProviderSource) basis = "provider-documented";
      else if (owners.length >= 2) {
        basis = "tool-corroborated";
        basisNote = "Legacy tier T1 (provider-documented), but no cited source is provider-owned; recorded as tool-corroborated. ";
        R.inc("basis:downgrade:T1-without-provider-source", agg.entries.length);
      } else {
        basis = "project-policy";
        basisNote = "Legacy tier T1 (provider-documented), but no cited source is provider-owned; recorded as project-policy pending review. ";
        R.inc("basis:downgrade:T1-without-provider-source", agg.entries.length);
      }
    } else if (agg.tier === "T2") {
      if (owners.length >= 2) basis = "tool-corroborated";
      else {
        basis = "project-policy";
        basisNote = "Legacy tier T2 (tool-corroborated), but the cited sources do not include artifacts from two distinct owners, so the corroboration rule of docs/governance/evidence-classes.md is not met; the legacy expectation is recorded as project-policy pending review. ";
        R.inc("basis:downgrade:T2-fewer-than-two-owners", agg.entries.length);
      }
    } else if (agg.tier === "T3") basis = "project-policy";
    else if (agg.tier === "T0") {
      basis = "unresolved";
      basisNote = "Legacy tier T0: the evidence is unresolved and the fixtures were unscored, so no outcome is asserted. ";
    } else throw new Error(`${agg.legacyCaseId}: unknown tier ${agg.tier}`);

    const reasonCounts = new Map();
    for (const f of fixturesOf) reasonCounts.set(f.assessment.reason, (reasonCounts.get(f.assessment.reason) ?? 0) + 1);
    const reasons = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0]));
    if (reasons.length > 1) R.inc("collapsed:assessment-reason-variants", reasons.length - 1);
    const rationale = clip(`${basisNote}${String(reasons[0][0]).replace(/\s+/g, " ").trim()}`, TEXT_MAX, () => R.inc("truncated:evidence-rationale"));
    const dates = refs.flatMap((x) => x.record.observations.map((o) => o.observedAt));
    const observedAt = dates.length ? dates.sort(cmp).at(-1) : reviewedAt;
    agg.evidence = { basis, rationale, sources: refs.map((x) => x.ref), observedAt };
  }

  // ---- known gaps: historical incidents, keyed by legacy fixture slug
  const incidentsBySlug = new Map();
  for (const gap of knownGaps.issues) {
    const failureMode = { "false-positive": "false-alarm", "false-negative": "missed-credential" }[gap.kind];
    if (!failureMode) throw new Error(`known gap ${gap.id}: unmapped kind ${gap.kind}`);
    const number = String(gap.number);
    const incident = {
      id: slugify(gap.id.replace(/^product-/, "incident-")),
      failureMode,
      summary: clip(String(gap.title).replace(/\s+/g, " ").trim(), TEXT_MAX, () => R.inc("truncated:incident-summary")),
      observedAt: gap.history.observed.at,
      externalRefs: [{ system: "redact-secret-issue", id: `redact-secret#${number}`, url: gap.url, note: "Product issue where the failure mode was reported; product workflow status is not imported." }],
    };
    let attached = 0;
    for (const slug of gap.fixtures) {
      if (!bySlug.has(slug)) {
        R.inc("dropped:known-gap-fixture-outside-imported-suites");
        R.add("dropped:known-gap-fixture-outside-imported-suites", slug.split("--")[0]);
        continue;
      }
      if (!incidentsBySlug.has(slug)) incidentsBySlug.set(slug, []);
      incidentsBySlug.get(slug).push(incident);
      attached += 1;
    }
    R.inc("known-gaps:issues");
    if (!attached) R.inc("known-gaps:issues-without-imported-fixture");
    R.inc(`known-gaps:kind:${gap.kind}`);
    R.inc(`dropped:known-gap-status:${gap.status}`);
    if (gap.fix) R.inc("dropped:known-gap-fix");
    if (gap.promotion) R.inc("dropped:known-gap-promotion");
    if (gap.candidate) R.inc("dropped:known-gap-candidate-build");
    R.inc("dropped:known-gap-scanner-evidence-rows", gap.evidence?.length ?? 0);
    if (gap.verification) R.inc("dropped:known-gap-verification");
    if (gap.disposition) R.inc("dropped:known-gap-disposition");
  }

  R.inc("dropped:fixture-detectors-json-entries", Object.keys(detectorAssignments).length);
  return { revision, suites, fx, bySlug, aggs, catById, corpora, knownGaps, semantics, incidentsBySlug, tally: R, permalink, reproduction: generated.reproduction };
}
