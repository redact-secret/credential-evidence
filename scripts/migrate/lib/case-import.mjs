// Deterministic import of the legacy fixture suites into first-class Cases and
// sharded fixture sets.
//
// Pure with respect to its input: `buildCaseImport(...)` reads the extracted legacy
// revision, the already-committed taxonomy records (#3) and the output of the legacy
// fixture generators, and returns every record file as text plus a report model. No
// clock, no network, no randomness; output is sorted by stable id.
//
// Boundary: only scanner-neutral semantics are imported. Detector assignments,
// arrival targets, expected product actions, tiers-as-status and per-run scanner
// findings are dropped and counted in the migration report.

import { createHash } from "node:crypto";
import { LEGACY_PATHS, LEGACY_REPOSITORY, LEGACY_REVISION, readLegacyJson } from "./legacy-source.mjs";
import { clip, isProjectOwned, ownerOf, sourceIdFor, splitUrl } from "./sources.mjs";
import { CONTEXT_GLOSS, CONTROL_GLOSS, GROUPS, MUTATION_GLOSS, OUTCOME_WORDS, THEMES, contextPhrase, familyTopic, oxford } from "./case-narratives.mjs";

/** Marker system on every externalRef this tool writes; it also identifies files the tool owns. */
export const OWNED_SYSTEM = "legacy-cases-import";
export const OWNED_DIRS = ["cases", "fixtures"];
export const IMPORTER_VERSION = "1.0.0";
export const GENERATOR_NAME = "redact-secret-benchmarks-fixture-generators";

const TEXT_MAX = 2000;
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const uniqSorted = (xs) => [...new Set(xs)].sort(cmp);
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const BOILERPLATE_SPAN_NOTES = new Set([
  "Locally constructed synthetic value; never issued by a provider.",
  "Synthetic credential-shaped test value; never issued by a provider.",
  "Deterministically constructed synthetic token; never issued by GitHub.",
]);

/** Where each suite's fixtures come from in the legacy repository (a permalink target, not read). */
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

export class Report {
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
}

/** Load the committed taxonomy records the case import cites (families and evidence sources). */
export function loadTaxonomy(readTree) {
  const families = new Map();
  const sources = new Map();
  const providers = new Map();
  for (const rec of readTree("families")) families.set(rec.id, rec);
  for (const rec of readTree("sources")) sources.set(rec.id, rec);
  for (const rec of readTree("providers")) providers.set(rec.id, rec);
  return { families, sources, providers };
}

function serializeSet(record) {
  const shell = { ...record, fixtures: "@@FIXTURES@@" };
  const lines = record.fixtures.map((f) => `    ${JSON.stringify(f)}`);
  const body = `[\n${lines.join(",\n")}\n  ]`;
  return `${JSON.stringify(shell, null, 2).replace('"@@FIXTURES@@"', () => body)}\n`;
}
const serializeCase = (record) => `${JSON.stringify(record, null, 2)}\n`;

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

// ------------------------------------------------------------------ builder

export function buildCaseImport({ root, generated, taxonomy, revision = LEGACY_REVISION }) {
  const R = new Report();
  const files = new Map();

  const categories = readLegacyJson(root, LEGACY_PATHS.categories);
  const index = readLegacyJson(root, LEGACY_PATHS.fixtureIndexFile);
  const knownGaps = readLegacyJson(root, LEGACY_PATHS.knownGapsFile);
  const semantics = readLegacyJson(root, LEGACY_PATHS.fixtureSemantics);
  const detectorAssignments = readLegacyJson(root, LEGACY_PATHS.fixtureDetectors);
  const permalink = (path) => `https://github.com/${LEGACY_REPOSITORY}/blob/${revision}/${path}`;

  // ---- corpora: generated suites (reproduced from pinned generators) + authored corpora
  const corpora = new Map();
  for (const [id, sha] of Object.entries(generated.reproduction)) {
    if (!sha.matches) throw new Error(`generated corpus '${id}' does not reproduce the committed hash manifest; refusing to import drifted output`);
  }
  for (const id of Object.keys(generated.corpora)) corpora.set(id, { corpus: generated.corpora[id], generated: true });
  for (const [id, path] of Object.entries(LEGACY_PATHS.authoredCorpora)) corpora.set(id, { corpus: readLegacyJson(root, path), generated: false });
  const suites = [...corpora.keys()].sort(cmp);
  const catById = new Map(categories.map((c) => [c.id, c]));

  // ---- flatten fixtures, cross-check the legacy semantic index
  const fx = [];
  const bySlug = new Map();
  for (const suite of suites) {
    for (const f of corpora.get(suite).corpus.fixtures) {
      const slug = `${suite}--${f.id}`;
      if (bySlug.has(slug)) throw new Error(`duplicate legacy fixture slug ${slug}`);
      const entry = { suite, slug, f, generated: corpora.get(suite).generated };
      fx.push(entry);
      bySlug.set(slug, entry);
    }
  }
  const idxBySlug = new Map(index.fixtures.map((e) => [e.slug, e]));
  const semBySlug = new Map(semantics.fixtures.map((e) => [e.slug, e]));
  for (const slug of bySlug.keys()) if (!idxBySlug.has(slug)) throw new Error(`fixture ${slug} is missing from fixture-index.json`);
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

  // ---- legacy outcome, role and case key per fixture
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

  const cases = new Map(); // key -> agg
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
    let agg = cases.get(key);
    if (!agg) {
      agg = { key, suite, shape, label, group: f.group, role, roleKind, outcome, tier: f.assessment.tier, kind: f.assessment.kind, entries: [] };
      cases.set(key, agg);
    }
    agg.entries.push(e);
    e.agg = agg;
  }

  // ---- case ids (deterministic, collision-resolved)
  const sortedAggs = [...cases.values()].sort((a, b) => cmp(a.key, b.key));
  const usedIds = new Set();
  const shortenId = (id) => (id.length <= 96 ? id : `${id.slice(0, 84).replace(/-+$/, "")}-${createHash("sha256").update(id).digest("hex").slice(0, 8)}`);
  for (const agg of sortedAggs) {
    const suffix = agg.role === "base" ? "" : `-${agg.role}`;
    const outcomeWord = { "must-flag": "flag", "must-not-flag": "benign", "not-assertable": "unresolved" }[agg.outcome];
    const candidates = [
      `${agg.suite}-${slugify(agg.shape)}${suffix}`,
      `${agg.suite}-${slugify(agg.shape)}${suffix}-${outcomeWord}`,
      `${agg.suite}-${slugify(agg.shape)}${suffix}-${outcomeWord}-${agg.tier.toLowerCase()}`,
    ].map(shortenId);
    const id = candidates.find((c) => !usedIds.has(c));
    if (!id) throw new Error(`cannot derive a unique case id for ${agg.key}`);
    usedIds.add(id);
    agg.id = id;
    if (id !== candidates[0]) R.inc("case-id:collision-suffixed");
  }
  const caseOfSlug = (slug) => bySlug.get(slug)?.agg;

  // ---- known gaps: incidents per case
  const incidentsByCase = new Map();
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
      const agg = caseOfSlug(slug);
      if (!agg) {
        R.inc("dropped:known-gap-fixture-outside-imported-suites");
        R.add("dropped:known-gap-fixture-outside-imported-suites", slug.split("--")[0]);
        continue;
      }
      if (!incidentsByCase.has(agg.id)) incidentsByCase.set(agg.id, new Map());
      if (!incidentsByCase.get(agg.id).has(incident.id)) {
        incidentsByCase.get(agg.id).set(incident.id, incident);
        attached += 1;
      }
    }
    R.inc("known-gaps:issues");
    if (!attached) R.inc("known-gaps:issues-without-imported-fixture");
    R.inc(`known-gaps:kind:${gap.kind}`);
    R.inc("known-gaps:case-attachments", attached);
    R.inc(`dropped:known-gap-status:${gap.status}`);
    if (gap.fix) R.inc("dropped:known-gap-fix");
    if (gap.promotion) R.inc("dropped:known-gap-promotion");
    if (gap.candidate) R.inc("dropped:known-gap-candidate-build");
    R.inc("dropped:known-gap-scanner-evidence-rows", gap.evidence?.length ?? 0);
    if (gap.verification) R.inc("dropped:known-gap-verification");
    if (gap.disposition) R.inc("dropped:known-gap-disposition");
  }

  // ---- build case records (positives and controls first; twins reference them)
  const caseRecords = new Map();
  const reviewedAt = semantics.reviewedAt;
  const familyName = (id) => {
    const fam = taxonomy.families.get(id);
    if (!fam) return id;
    const prov = taxonomy.providers.get(fam.provider);
    if (!prov || prov.id === "generic" || fam.name.toLowerCase().includes(prov.name.toLowerCase())) return fam.name;
    return `${prov.name} ${fam.name}`;
  };

  const buildCase = (agg) => {
    const es = agg.entries;
    const fixturesOf = es.map((e) => e.f);
    const famIds = uniqSorted(es.flatMap((e) => idxBySlug.get(e.slug).familyIds));
    for (const id of famIds) if (!taxonomy.families.has(id)) throw new Error(`${agg.id}: family ${id} is not in the taxonomy records`);
    const providers = uniqSorted(famIds.map((id) => taxonomy.families.get(id).provider));
    const names = famIds.map(familyName);
    const entry = GROUPS[`${agg.suite}|${agg.group}`];
    if (entry) R.inc("wording:hand-written-group");
    else R.inc("wording:templated");
    const prettyShape = agg.shape.replace(/-/g, " ");
    const topic = entry?.topic ?? familyTopic(names, prettyShape);
    const contexts = uniqSorted(fixturesOf.map((f) => f.contextAxis).filter(Boolean));
    const n = es.length;
    const inputs = `${n} input${n === 1 ? "" : "s"}`;

    // ---- expectation
    const refs = [];
    const seen = new Set();
    for (const e of es) {
      for (const r of resolveSources(e.f.assessment.sources)) {
        const supports = `Cited by the legacy assessment (${SOURCE_TYPE_WORDS[r.record.sourceType] ?? "source"}); claim not itemised.`;
        const k = `${r.record.id}|${r.locator ?? ""}`;
        if (seen.has(k)) continue;
        seen.add(k);
        refs.push({ record: r.record, ref: { sourceId: r.record.id, supports, ...(r.locator ? { locator: r.locator } : {}) } });
      }
    }
    refs.sort((a, b) => cmp(JSON.stringify(a.ref), JSON.stringify(b.ref)));
    const sourceRefs = refs.map((x) => x.ref);
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
        R.inc("basis:downgrade:T1-without-provider-source");
      } else {
        basis = "project-policy";
        basisNote = "Legacy tier T1 (provider-documented), but no cited source is provider-owned; recorded as project-policy pending review. ";
        R.inc("basis:downgrade:T1-without-provider-source");
      }
    } else if (agg.tier === "T2") {
      if (owners.length >= 2) basis = "tool-corroborated";
      else {
        basis = "project-policy";
        basisNote = "Legacy tier T2 (tool-corroborated), but the cited sources do not include artifacts from two distinct owners, so the corroboration rule of docs/governance/evidence-classes.md is not met; the legacy expectation is recorded as project-policy pending review. ";
        R.inc("basis:downgrade:T2-fewer-than-two-owners");
      }
    } else if (agg.tier === "T3") basis = "project-policy";
    else if (agg.tier === "T0") {
      basis = "unresolved";
      basisNote = "Legacy tier T0: the evidence is unresolved and the fixtures were unscored, so no outcome is asserted. ";
    } else throw new Error(`${agg.id}: unknown tier ${agg.tier}`);
    R.inc(`basis:${basis}`);

    const reasonCounts = new Map();
    for (const f of fixturesOf) reasonCounts.set(f.assessment.reason, (reasonCounts.get(f.assessment.reason) ?? 0) + 1);
    const reasons = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0]));
    if (reasons.length > 1) R.inc("collapsed:assessment-reason-variants", reasons.length - 1);
    const rationale = clip(`${basisNote}${String(reasons[0][0]).replace(/\s+/g, " ").trim()}`, TEXT_MAX, () => R.inc("truncated:expectation-rationale"));
    const dates = refs.flatMap((x) => x.record.observations.map((o) => o.observedAt));
    const observedAt = dates.length ? dates.sort(cmp).at(-1) : reviewedAt;

    // ---- types, families, scenarios, themes
    const positive = agg.kind === "must-redact" || (agg.kind === "policy" && fixturesOf.some((f) => f.expected.length));
    const caseTypes = [];
    if (agg.roleKind === "twin") caseTypes.push("twin", "mutation");
    caseTypes.push(positive ? "positive" : "benign");
    if (famIds.length >= 2) caseTypes.push("cross-family");
    const roleOfFamily = agg.roleKind === "base" && positive ? "subject" : "lookalike";

    const themes = new Set(entry?.themes ?? []);
    if (agg.roleKind === "control") for (const t of CONTROL_GLOSS[agg.role.slice(8)]?.themes ?? []) themes.add(t);
    if (agg.suite === "beta8-948") themes.add("high-signal-assignment-false-positive");
    const enveloped = fixturesOf.some((f) => f.expected.some((s) => s.envelope));
    if (enveloped) themes.add("partial-span-leakage");
    if (providers.length >= 2) themes.add("cross-provider");
    const scenarios = uniqSorted([...es.flatMap((e) => idxBySlug.get(e.slug).scenarioIds), ...themes]);
    for (const t of themes) R.inc(`theme:${t}`);

    // ---- wording
    const outcomeWord = OUTCOME_WORDS[agg.outcome];
    const ctx = contextPhrase(contexts);
    let title;
    let summary;
    let why;
    if (agg.roleKind === "base") {
      title = `${topic}: ${outcomeWord}`;
      if (agg.outcome === "must-flag") {
        summary = entry?.flag ?? entry?.what;
        summary = summary ? `${summary} Covers ${inputs}.` : `Synthetic ${topic} values built to the documented format appear in ${inputs}${ctx}. Each input records the exact byte range of the secret.`;
        why = entry?.why ?? "A credential that a scanner misses in an ordinary carrier is leaked. Carriers differ in quoting, delimiters and surrounding text, so a hit on one carrier does not show coverage of another.";
      } else {
        summary = entry?.benign ?? entry?.what;
        summary = summary ? `${summary} Covers ${inputs}.` : `${inputs} related to ${topic} that resemble the format but are not issued credentials (a bare prefix, a short body, a mask or a reference).`;
        why = entry?.why ?? "A value that only resembles a credential is not one. Reporting it is a false alarm, and it shows whether structure and context, not appearance, decide the outcome.";
      }
      if (agg.outcome === "not-assertable") summary = `${summary} The legacy evidence for this expectation is unresolved.`;
    } else if (agg.roleKind === "twin") {
      const mk = agg.role.slice(5);
      const mutations = uniqSorted(fixturesOf.map((f) => f.mutation).filter(Boolean));
      const gloss = MUTATION_GLOSS[mk] ?? `the property "${mk}" is changed`;
      title = `${topic}: one-property twin (${mk})`;
      summary = `${inputs} ${n === 1 ? "is" : "are"} identical to a positive input except for one change: ${gloss}. ${mutations.length ? `Legacy mutation notes: ${oxford(mutations.slice(0, 3))}${mutations.length > 3 ? `, and ${mutations.length - 3} more` : ""}.` : ""}`.trim();
      why = `A twin changes exactly one property, so the expected outcome differs from the positive for that one reason. ${agg.outcome === "must-not-flag" ? "Reporting the twin is a false alarm, and it shows that the changed property is part of what identifies the credential." : "The outcome shows how the changed property is treated."}`;
    } else {
      const type = agg.role.slice(8);
      const g = CONTROL_GLOSS[type];
      if (!g) throw new Error(`${agg.id}: unknown control type ${type}`);
      title = `${topic}: benign ${type.replace(/-/g, " ")} controls`;
      summary = `${inputs} holding ${g.what}.`;
      why = g.why;
    }
    if (title.length > 200) title = clip(title, 200);

    const record = {
      schemaVersion: 1,
      kind: "case",
      id: agg.id,
      title,
      summary: clip(summary, TEXT_MAX),
      rationale: clip(why, TEXT_MAX),
      caseTypes,
      families: famIds.map((family) => ({ family, role: roleOfFamily })),
    };
    if (!famIds.length) {
      const reasons = uniqSorted(es.map((e) => idxBySlug.get(e.slug).unscopedReason).filter(Boolean));
      record.unscopedReason = clip(reasons[0] ?? "The legacy suite assigns no credential family; the case is a generic control.", TEXT_MAX);
      R.inc("cases:unscoped");
    }
    record.scenarios = scenarios;
    record.expectation = { outcome: agg.outcome, basis, rationale, sources: sourceRefs, observedAt };
    const incidents = [...(incidentsByCase.get(agg.id)?.values() ?? [])].sort((a, b) => cmp(a.id, b.id));
    if (incidents.length) {
      record.incidents = incidents;
      R.inc("cases:with-incidents");
    }
    record.lifecycle = "draft";
    const refsOut = [{ system: OWNED_SYSTEM, id: `${revision}:${suiteSourcePath(agg.suite)}`, url: permalink(suiteSourcePath(agg.suite)), note: clip(`suite ${agg.suite}; group ${agg.label}; ${n} fixture${n === 1 ? "" : "s"}`, 200) }];
    const issues = uniqSorted(fixturesOf.map((f) => f.issue).filter((x) => x != null).map(String));
    for (const i of issues) refsOut.push({ system: "redact-secret-issue", id: `redact-secret#${i}`, url: `https://github.com/redact-secret/redact-secret/issues/${i}`, note: "Product issue the legacy fixture was written for." });
    if (agg.suite.startsWith("beta8-")) {
      const num = /^#(\d+)/.exec(agg.group)?.[1];
      if (num) refsOut.push({ system: "redact-secret-benchmarks-issue", id: `redact-secret-benchmarks#${num}`, url: `https://github.com/${LEGACY_REPOSITORY}/issues/${num}`, note: "Legacy benchmark issue the suite slice was written for." });
    }
    record.externalRefs = refsOut.sort((a, b) => cmp(JSON.stringify(a), JSON.stringify(b)));
    const suiteTitle = catById.get(agg.suite)?.title ?? agg.suite;
    record.notes = clip(`Project-authored by the Redact Secret project, which maintains this repository; not independent evidence. Imported as a draft from the legacy suite "${suiteTitle}" (${agg.suite}); not yet reviewed.`, TEXT_MAX);
    return record;
  };

  // Several cases of one legacy group can share a topic and outcome (they differ in
  // evidence tier). Titles must distinguish them, so a repeated title gets the
  // evidence basis, and if that still repeats, the legacy tier.
  const aggById = new Map(sortedAggs.map((a) => [a.id, a]));
  const dedupeTitles = (recs) => {
    for (const pass of ["basis", "tier"]) {
      const byTitle = new Map();
      for (const r of recs) byTitle.set(r.title, [...(byTitle.get(r.title) ?? []), r]);
      for (const group of byTitle.values()) {
        if (group.length < 2) continue;
        for (const r of group) {
          r.title = clip(pass === "basis" ? `${r.title} (${r.expectation.basis})` : `${r.title} [legacy tier ${aggById.get(r.id).tier}]`, 200);
          R.inc(`title:disambiguated-by-${pass}`);
        }
      }
    }
  };

  // first pass: everything except twins
  for (const agg of sortedAggs) if (agg.roleKind !== "twin") caseRecords.set(agg.id, buildCase(agg));
  dedupeTitles([...caseRecords.values()]);
  // second pass: twins, with lineage to positive cases
  for (const agg of sortedAggs) {
    if (agg.roleKind !== "twin") continue;
    const rec = buildCase(agg);
    const rels = new Map();
    for (const e of agg.entries) {
      const target = caseOfSlug(`${e.suite}--${e.f.twinOf}`);
      if (!target) throw new Error(`${e.slug}: twinOf '${e.f.twinOf}' is not a fixture of suite ${e.suite}`);
      if (target.id === agg.id) throw new Error(`${e.slug}: twin shares a case with its positive`);
      const k = `${target.id}|${e.f.mutationKind}`;
      if (!rels.has(k)) rels.set(k, { type: "twin-of", target: target.id, mutationKind: e.f.mutationKind, note: clip(String(e.f.mutation ?? "").replace(/\s+/g, " ").trim(), TEXT_MAX) });
      R.inc("lineage:twin-fixtures");
      R.inc(`lineage:mutation-kind:${e.f.mutationKind}`);
    }
    rec.relations = [...rels.values()].map((r) => (r.note ? r : { type: r.type, target: r.target, mutationKind: r.mutationKind })).sort((a, b) => cmp(a.target + a.mutationKind, b.target + b.mutationKind));
    const targets = uniqSorted(rec.relations.map((r) => r.target)).map((t) => `"${caseRecords.get(t).title}"`);
    rec.summary = clip(`${rec.summary} Twin of ${oxford(targets.slice(0, 2))}${targets.length > 2 ? `, and ${targets.length - 2} more` : ""}.`, TEXT_MAX);
    // keep key order: relations sit after expectation
    const ordered = {};
    for (const [k, v] of Object.entries(rec)) {
      if (k === "relations") continue;
      ordered[k] = v;
      if (k === "expectation") ordered.relations = rec.relations;
    }
    caseRecords.set(agg.id, ordered);
  }
  dedupeTitles([...caseRecords.values()].filter((r) => aggById.get(r.id).roleKind === "twin"));

  for (const rec of [...caseRecords.values()].sort((a, b) => cmp(a.id, b.id))) {
    const suite = sortedAggs.find((a) => a.id === rec.id).suite;
    files.set(`records/cases/${suite}/${rec.id}.json`, serializeCase(rec));
    R.inc("records:case");
    for (const t of rec.caseTypes) R.inc(`case-type:${t}`);
    R.inc(`case-outcome:${rec.expectation.outcome}`);
  }

  // ---- fixture sets, one per suite
  const setRecords = [];
  for (const suite of suites) {
    const { corpus, generated: isGenerated } = corpora.get(suite);
    const cat = catById.get(suite);
    if (!cat) throw new Error(`suite ${suite} has no entry in categories.json`);
    const items = [];
    const usedPaths = new Set();
    for (const f of corpus.fixtures) {
      const slug = `${suite}--${f.id}`;
      const e = bySlug.get(slug);
      const agg = e.agg;
      const outcome = agg.outcome;
      const bytes = Buffer.from(f.content, "utf8");
      if (usedPaths.has(f.path)) throw new Error(`${slug}: duplicate materialization path ${f.path}`);
      usedPaths.add(f.path);
      if (!/^[A-Za-z0-9._/-]+$/.test(f.path)) throw new Error(`${slug}: path ${f.path} is not portable`);
      let spans = f.expected.map((s) => {
        const out = { start: s.start, end: s.end, role: s.role ?? "secret" };
        if (s.note && !BOILERPLATE_SPAN_NOTES.has(s.note)) {
          out.note = clip(s.note, TEXT_MAX);
          R.inc("spans:custom-note-kept");
        } else if (s.note) R.inc("dropped:span-boilerplate-note");
        if (s.envelope) {
          out.envelope = { start: s.envelope.start, end: s.envelope.end, reason: clip(s.envelope.reason, TEXT_MAX) };
          R.inc("spans:envelope");
        }
        if (s.end > bytes.length) throw new Error(`${slug}: span ends after content`);
        R.inc(`spans:role:${out.role}`);
        return out;
      });
      if (outcome === "must-not-flag" && spans.length) {
        R.inc("dropped:companion-span-on-must-not-flag", spans.length);
        spans = [];
      }
      if (outcome === "not-assertable" && spans.length) {
        R.inc("dropped:t0-candidate-spans", spans.length);
        R.inc("dropped:t0-fixtures-with-spans");
        spans = [];
      }
      const item = { id: slug, case: agg.id, path: f.path };
      if (f.contextAxis) item.context = slugify(f.contextAxis);
      if (f.twinOf) {
        item.lineage = { relation: "twin-of", of: `${suite}--${f.twinOf}`, mutationKind: f.mutationKind };
        if (f.mutation) item.lineage.mutation = clip(String(f.mutation).replace(/\s+/g, " ").trim(), TEXT_MAX);
      }
      item.sha256 = createHash("sha256").update(bytes).digest("hex");
      item.text = f.content;
      item.expected = { outcome, spans };
      items.push(item);
      R.inc(`fixtures:${isGenerated ? "generated" : "authored"}`);
      R.inc(`fixture-outcome:${outcome}`);
      R.inc(`map:${f.assessment.kind}/${f.assessment.tier} -> ${outcome}`);
      R.inc("fixtures:content-bytes", bytes.length);
      // dropped legacy fields, counted
      if (f.detectors) R.inc("dropped:fixture-detector-assignment");
      if (f.arrivalTargets) R.inc("dropped:fixture-arrival-targets");
      if (f.expectedAction) R.inc("dropped:fixture-expected-action");
      if (f.policyFamily) R.inc("dropped:fixture-policy-family");
      if (f.policyConformance) R.inc("dropped:fixture-policy-conformance");
      if (f.formatReason) R.inc("dropped:fixture-format-reason-duplicate");
      if (f.assessment.contract) R.inc("dropped:assessment-contract-detector-key");
      const prov = idxBySlug.get(slug).provenance;
      if (prov.milestone) R.inc("dropped:fixture-provenance-milestone");
      if (prov.release) R.inc("dropped:fixture-provenance-release");
    }
    const setRec = {
      schemaVersion: 1,
      kind: "fixture-set",
      id: suite,
      title: clip(cat.title, 200),
      description: clip(String(cat.description).replace(/\s+/g, " ").trim(), TEXT_MAX, () => R.inc("truncated:suite-description")),
      origin: isGenerated
        ? {
            type: "generation-rule",
            rule: `legacy-suite-${suite}`,
            generator: { name: GENERATOR_NAME, version: `legacy-${revision.slice(0, 12)}`, sourceRevision: revision, entrypoint: suiteSourcePath(suite) },
          }
        : { type: "authored-cases" },
      generated: isGenerated,
      fixtures: items,
      imported: { repository: LEGACY_REPOSITORY, revision, path: suiteSourcePath(suite), legacyId: suite },
      lifecycle: "draft",
      externalRefs: [{ system: OWNED_SYSTEM, id: `${revision}:${suiteSourcePath(suite)}`, url: permalink(suiteSourcePath(suite)), note: `suite ${suite}; ${items.length} fixtures` }],
    };
    // How the values were built (safety rule: synthetic, described), then the legacy review label and scope.
    const construction = corpus.provenance ?? "Hand-written by the legacy benchmark authors; every credential-shaped value is synthetic and was never issued by a provider (legacy fixtures README).";
    if (!corpus.provenance) R.inc("notes:construction-statement-supplied-for-authored-suite");
    const notes = [construction, corpus.reviewStatus ? `Legacy review status: ${corpus.reviewStatus}.` : "", corpus.scope ?? ""].filter(Boolean).join(" ");
    setRec.notes = clip(notes.replace(/\s+/g, " ").trim(), TEXT_MAX, () => R.inc("truncated:suite-notes"));
    for (const k of ["references", "milestoneReview"]) if (corpus[k]) R.inc(`dropped:suite-${k}`);
    setRecords.push(setRec);
    files.set(`records/fixtures/${suite}.json`, serializeSet(setRec));
    R.inc("records:fixture-set");
    R.inc(`sets:${isGenerated ? "generated" : "authored"}`);
  }

  R.inc("dropped:fixture-detectors-json-entries", Object.keys(detectorAssignments).length);

  const model = {
    revision,
    suites,
    suiteInfo: suites.map((s) => ({ suite: s, title: catById.get(s).title, generated: corpora.get(s).generated, fixtures: corpora.get(s).corpus.fixtures.length, cases: sortedAggs.filter((a) => a.suite === s).length })),
    caseRecords: [...caseRecords.values()].sort((a, b) => cmp(a.id, b.id)),
    setRecords,
    reproduction: generated.reproduction,
    families: taxonomy.families,
    themes: THEMES,
    contextGloss: CONTEXT_GLOSS,
    counts: R,
  };
  return { files, report: R, model };
}
