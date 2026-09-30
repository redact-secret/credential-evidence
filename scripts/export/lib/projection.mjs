// Pure, deterministic projection of canonical records into the input shapes that
// `redact-secret-benchmarks` consumers read (see docs/decisions/0006).
//
// `buildProjection({ records, vocabulary })` takes parsed, schema-valid records and
// returns every artifact as text. No clock, no network, no randomness, no legacy
// checkout. Everything is sorted by stable id.
//
// Boundary: a projection is derived, lossy by design, and never an assertion. It
// carries no detector assignment, support status, release milestone or product
// pin. Consumers that need those supply them as an overlay; `overlay-interface.json`
// states exactly what, and it is regenerated with every projection.

import { createHash } from "node:crypto";

export const GENERATOR = { name: "credential-evidence/legacy-projection", version: "1.0.0" };
export const MANIFEST_FORMAT = "credential-evidence/legacy-projection-manifest";
export const MANIFEST_FORMAT_VERSION = 1;
export const OVERLAY_FORMAT = "credential-evidence/legacy-projection-overlay-interface";

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const uniqSorted = (xs) => [...new Set(xs)].sort(cmp);
const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

// ------------------------------------------------------------ legacy digest
// `digestJson` of the legacy fixture index: SHA-256 of JSON with object keys sorted
// (`localeCompare`, pinned to `en` so the result does not depend on the host locale).
function normalized(value) {
  if (Array.isArray(value)) return value.map(normalized);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b, "en"))
        .map(([k, v]) => [k, normalized(v)]),
    );
  }
  return value;
}
export const digestJson = (value) => sha256(JSON.stringify(normalized(value)));

// ------------------------------------------------------------ source rebuild
const TAXONOMY_NOTE_PREFIX = (id) => `Legacy taxonomy.json note for ${id} (verbatim legacy text; the date is the dossier researchedAt, not the authoring date): `;
const DOSSIER_SOURCE_SUPPORTS = "Cited by the legacy dossier research for this family";
const DOSSIER_EVIDENCE_SUPPORTS = "Final research evidence recorded by the legacy dossier";
const BLOCKED_BY_MARKER = " Legacy blockedBy: ";
const DETECTOR_SYSTEM = "redact-secret-detector";
const CLASS_TIER = { "provider-documented": "T1", "tool-corroborated": "T2", "project-policy": "T3", unresolved: "T0" };

/** Records grouped by kind, each sorted by id. */
export function indexRecords(records) {
  const by = {};
  for (const r of records) (by[r.kind] ??= []).push(r);
  for (const k of Object.keys(by)) by[k].sort((a, b) => cmp(a.id, b.id));
  const map = (kind) => new Map((by[kind] ?? []).map((r) => [r.id, r]));
  return { by, providers: map("provider"), families: map("family"), contracts: map("format-contract"), sources: map("evidence-source"), reviews: map("evidence-review-history"), cases: map("case"), sets: map("fixture-set") };
}

/** Rebuild a legacy URL from a sourceRef: base URL (exact legacy URL if the locator was a repository) plus the fragment locator. */
function urlOf(ref, sources) {
  const src = sources.get(ref.sourceId);
  if (!src) throw new Error(`unknown evidence source ${ref.sourceId}`);
  const legacy = (src.externalRefs ?? []).find((r) => r.system === "legacy-url");
  return (legacy ? legacy.id : src.locator.url) + (ref.locator ?? "");
}

const claimOf = (contract, id) => (contract?.claims ?? []).find((c) => c.id === id);

// ------------------------------------------------------------------ builders

function buildTaxonomy(ix, vocabulary) {
  const providers = [...ix.providers.values()].filter((p) => p.id !== vocabulary.nullProviderId).map((p) => ({ id: p.id, name: p.name }));
  const families = [...ix.families.values()].map((f) => {
    const contract = ix.contracts.get(f.currentContract ?? `${f.id}@1`);
    const sourceClaim = claimOf(contract, "taxonomy-sources");
    const review = ix.reviews.get(reviewIdFor(ix, f.id));
    const prefix = TAXONOMY_NOTE_PREFIX(f.id);
    const noteEvent = (review?.events ?? []).find((e) => e.note.startsWith(prefix));
    const out = {
      id: f.id,
      provider: f.provider === vocabulary.nullProviderId ? null : f.provider,
      name: f.name,
      description: f.description,
      detectors: (f.externalRefs ?? []).filter((r) => r.system === DETECTOR_SYSTEM).map((r) => r.id),
    };
    if (sourceClaim) out.sources = sourceClaim.sources.map((s) => urlOf(s, ix.sources));
    if (noteEvent) out.note = noteEvent.note.slice(prefix.length);
    return out;
  });
  return { schemaVersion: 1, sourceNote: vocabulary.taxonomySourceNote, providers, families };
}

function reviewIdFor(ix, familyId) {
  for (const r of ix.reviews.values()) if (r.subject.kind === "family" && r.subject.id === familyId) return r.id;
  return undefined;
}

function buildDossiers(ix) {
  const providers = {};
  for (const f of ix.families.values()) {
    // Contracts are addressed `<family>@<revision>`; the dossier claim lives on the current or only revision.
    const contract = ix.contracts.get(f.currentContract ?? `${f.id}@1`);
    const claim = claimOf(contract, "dossier-research");
    const review = ix.reviews.get(reviewIdFor(ix, f.id));
    const blocker = f.research.blockers?.[0];
    let verdict;
    if (f.research.state === "researched") verdict = blocker?.kind === "issuance-gated" ? "issuance-gated" : blocker?.kind === "date-gated" ? "date-gated" : "ready";
    else verdict = f.research.state;
    const first = review?.events?.[0]?.note ?? "";
    const at = first.indexOf(BLOCKED_BY_MARKER);
    const blockedBy = at >= 0 ? first.slice(at + BLOCKED_BY_MARKER.length) : (blocker?.summary ?? null);
    const refs = claim?.sources ?? [];
    const evidenceRef = refs.find((s) => s.supports === DOSSIER_EVIDENCE_SUPPORTS);
    const tier = claim ? (claim.evidenceClass === "unresolved" && f.research.state === "unresearched" ? null : CLASS_TIER[claim.evidenceClass]) : null;
    (providers[f.provider] ??= { provider: f.provider, families: [] }).families.push({
      id: f.id,
      research: {
        verdict,
        tier,
        sources: refs.filter((s) => s.supports === DOSSIER_SOURCE_SUPPORTS).map((s) => urlOf(s, ix.sources)),
        issues: f.research.issues ?? [],
        evidence: evidenceRef ? urlOf(evidenceRef, ix.sources) : null,
        researchedAt: f.research.researchedAt ?? null,
      },
      blockedBy,
    });
  }
  return { schemaVersion: 1, providers };
}

const legacyScenarioIds = (vocabulary) => new Set(vocabulary.scenarios.map((s) => s.id));

function buildScenarios(ix, vocabulary) {
  const used = new Set([...ix.cases.values()].flatMap((c) => c.scenarios ?? []));
  return { schemaVersion: 1, scenarios: vocabulary.scenarios.filter((s) => used.has(s.id)).map((s) => ({ id: s.id, title: s.title, description: s.description })) };
}

const corpusPathOf = (set, vocabulary) =>
  set.origin.type === "authored-cases" ? vocabulary.corpusPaths.authored.replace("<id>", set.id) : vocabulary.corpusPaths.generated.replace("<id>", set.id);

function buildCategories(ix, vocabulary) {
  return [...ix.sets.values()].map((s) => ({ id: s.id, title: s.title, description: s.description, kind: vocabulary.categoryKind, corpus: corpusPathOf(s, vocabulary) }));
}

/** Inverse of the importer's tier mapping: (outcome, basis) to the legacy (kind, tier). T0 has no recoverable kind. */
function legacyAssessment(outcome, basis) {
  if (outcome === "not-assertable") return { kind: "must-not-flag", tier: "T0" };
  const tier = { "provider-documented": "T1", "tool-corroborated": "T2", "project-policy": "T3" }[basis];
  if (!tier) throw new Error(`cannot express basis ${basis} with outcome ${outcome}`);
  if (outcome === "must-not-flag") return { kind: "must-not-flag", tier };
  return { kind: tier === "T3" ? "policy" : "must-redact", tier };
}

const suiteOf = (set) => set.id;
const fixtureIdOf = (set, item) => (item.id.startsWith(`${suiteOf(set)}--`) ? item.id.slice(suiteOf(set).length + 2) : item.id);

/**
 * The legacy corpus loader (validateCorpus) requires a twin's positive to carry a secret span. A positive whose
 * outcome is not must-flag (an unresolved T0 fixture: its candidate spans are not canonical) cannot satisfy that,
 * so a twin of such a fixture is projected without twin fields. The lineage stays canonical (case relation, fixture lineage).
 */
const hasRealPositive = (set, item) => set.fixtures.find((x) => x.id === item.lineage.of)?.expected.outcome === "must-flag";

function buildCorpora(ix, vocabulary) {
  const out = new Map();
  for (const set of ix.sets.values()) {
    const fixtures = set.fixtures.map((item) => {
      const c = ix.cases.get(item.case);
      if (!c) throw new Error(`fixture ${item.id}: unknown case ${item.case}`);
      const { kind, tier } = legacyAssessment(item.expected.outcome, c.expectation.basis);
      const f = {
        id: fixtureIdOf(set, item),
        path: item.path,
        group: c.id,
        content: item.text,
        expected: item.expected.spans.map((s) => ({ start: s.start, end: s.end, role: s.role, ...(s.note ? { note: s.note } : {}), ...(s.envelope ? { envelope: { start: s.envelope.start, end: s.envelope.end, reason: s.envelope.reason } } : {}) })),
        assessment: { kind, tier, reason: c.expectation.rationale, sources: uniqSorted(c.expectation.sources.map((s) => urlOf(s, ix.sources))) },
      };
      if (item.context) f.contextAxis = item.context;
      if (item.lineage && hasRealPositive(set, item)) {
        f.twinOf = fixtureIdOf(set, { id: item.lineage.of });
        if (item.lineage.mutation) f.mutation = item.lineage.mutation;
        if (item.lineage.mutationKind) f.mutationKind = item.lineage.mutationKind;
      }
      return f;
    });
    out.set(corpusPathOf(set, vocabulary), { schemaVersion: 2, fixtures });
  }
  return out;
}

function buildSemantics(ix, vocabulary) {
  const legacy = legacyScenarioIds(vocabulary);
  const rows = [];
  let reviewedAt = "";
  for (const set of ix.sets.values()) {
    for (const item of set.fixtures) {
      const c = ix.cases.get(item.case);
      const row = {
        slug: item.id,
        familyIds: uniqSorted(c.families.map((f) => f.family)),
        scenarioIds: uniqSorted((c.scenarios ?? []).filter((s) => legacy.has(s))),
      };
      if (c.unscopedReason) row.unscopedReason = c.unscopedReason;
      rows.push(row);
    }
  }
  for (const c of ix.cases.values()) if (c.expectation.observedAt > reviewedAt) reviewedAt = c.expectation.observedAt;
  rows.sort((a, b) => cmp(a.slug, b.slug));
  return { schemaVersion: 1, reviewedAt, fixtures: rows };
}

function buildIndex({ ix, vocabulary, semantics, scenarios, taxonomy }) {
  const semBySlug = new Map(semantics.fixtures.map((r) => [r.slug, r]));
  const fixtures = [];
  for (const set of ix.sets.values()) {
    const corpus = corpusPathOf(set, vocabulary);
    for (const item of set.fixtures) {
      const sem = semBySlug.get(item.id);
      fixtures.push({
        slug: item.id,
        source: { categoryId: set.id, fixtureId: fixtureIdOf(set, item), corpus, path: item.path },
        familyIds: sem.familyIds,
        scenarioIds: sem.scenarioIds,
        ...(sem.unscopedReason ? { unscopedReason: sem.unscopedReason } : {}),
        provenance: { categoryId: set.id },
        ...(item.lineage && hasRealPositive(set, item) ? { relations: { twinOf: item.lineage.of } } : {}),
      });
    }
  }
  fixtures.sort((a, b) => a.slug.localeCompare(b.slug, "en"));
  const truth = { source: "category-corpora", fields: ["content", "expected", "assessment.kind", "assessment.tier", "assessment.sources"] };
  const sources = {
    reviewedMetadata: { algorithm: "sha256", digest: digestJson(semantics) },
    scenarios: { algorithm: "sha256", digest: digestJson(scenarios) },
    taxonomy: { algorithm: "sha256", digest: digestJson(taxonomy) },
  };
  const payload = { schemaVersion: 1, truth, sources, fixtures };
  return { ...payload, identity: { schemaVersion: 1, algorithm: "sha256", digest: digestJson(payload), fixtureCount: fixtures.length } };
}

// --------------------------------------------- credential-eval corpus snapshot

/** Compact JSON with object keys sorted by byte order at every depth (credential-eval docs/contracts/identity.md). */
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort(cmp).map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}

/**
 * The input document credential-eval reads (`credential-eval/corpus-snapshot/v1`). Same truth as the legacy
 * corpora, in the evaluator's own contract: one case per fixture, grouping carries the legacy kind and tier
 * (which credential-eval keeps for partitioning), the canonical evidence class and, when the case has exactly one
 * family, that family. `targets` (the detector assignment) is an overlay and is absent.
 */
function buildCorpusSnapshot(ix, { sourceDigest, schemaRevision }) {
  const cases = [];
  for (const set of ix.sets.values()) {
    for (const item of set.fixtures) {
      const c = ix.cases.get(item.case);
      const { kind, tier } = legacyAssessment(item.expected.outcome, c.expectation.basis);
      const grouping = { kind, tier, group: c.id, evidence_class: c.expectation.basis };
      if (c.families.length === 1) grouping.family = c.families[0].family;
      const out = {
        id: item.id,
        path: `${set.id}/${item.path}`,
        content: item.text,
        expected: item.expected.spans.map((sp) => ({ start: sp.start, end: sp.end, role: sp.role, ...(sp.envelope ? { envelope: { start: sp.envelope.start, end: sp.envelope.end, reason: sp.envelope.reason } } : {}) })),
        grouping,
      };
      if (item.lineage?.mutation && hasRealPositive(set, item)) out.twin = { twin_of: item.lineage.of, mutation: item.lineage.mutation, mutation_kind: item.lineage.mutationKind };
      cases.push(out);
    }
  }
  cases.sort((a, b) => cmp(a.id, b.id));
  return {
    schema: "credential-eval/corpus-snapshot/v1",
    identity: {
      source: "credential-evidence",
      revision: `records-tree-sha256:${sourceDigest}`,
      evidence_schema: `credential-evidence/schema/${schemaRevision}`,
      corpus_digest: `sha256:${sha256(canonicalJson(cases))}`,
    },
    cases,
  };
}

// ------------------------------------------------------------ overlay contract

function keyInfo(keys) {
  const sorted = uniqSorted(keys);
  return { count: sorted.length, sha256: sha256(sorted.join("\n")) };
}

function buildOverlayInterface({ taxonomy, index }) {
  const slugs = index.fixtures.map((f) => f.slug);
  const families = taxonomy.families.map((f) => f.id);
  const overlays = [
    {
      id: "fixture-detectors",
      legacyPath: "benchmarks/fixture-detectors.json",
      merge: "supply the file itself",
      shape: "object: fixture slug -> string[] of product detector ids (may be empty)",
      keys: { of: "benchmarks/fixture-index.json#fixtures[].slug", ...keyInfo(slugs) },
      owner: "credential-eval adapter configuration, or redact-secret-benchmarks while it stays authoritative",
      reason: "Which product detector is expected to fire on a fixture is a scanner/product assignment. Canonical data is scanner-neutral and never records it (ADR 0005).",
    },
    {
      id: "taxonomy-support-status",
      legacyPath: "benchmarks/support/taxonomy.json",
      merge: "set families[].supportStatus for the listed family ids",
      shape: "object: family id -> 'pending' (legacy explicit reviewed disposition); every other status is derived downstream by the support classifier",
      keys: { of: "benchmarks/support/taxonomy.json#families[].id", ...keyInfo(families) },
      owner: "redact-secret-benchmarks (Redact Secret qualification policy)",
      reason: "stable/provisional/pending is product qualification, not evidence (ARCHITECTURE: evidence model).",
    },
    {
      id: "fixture-provenance",
      legacyPath: "benchmarks/fixture-index.json",
      merge: "set fixtures[].provenance.issue, .milestone, .release for the listed slugs, then recompute identity.digest with the same digestJson",
      shape: "object: fixture slug -> { issue?: number, milestone?: string, release?: string }",
      keys: { of: "benchmarks/fixture-index.json#fixtures[].slug", ...keyInfo(slugs) },
      owner: "redact-secret-benchmarks (release bookkeeping)",
      reason: "Release milestones and the product issue a fixture was written for are product history. Canonical cases keep the product issue only as an externalRefs pointer at case level.",
    },
    {
      id: "corpus-fixture-extras",
      legacyPath: "fixtures/**/corpus.json, fixtures/generated/*.json",
      merge: "set the listed fields on each corpus fixture",
      shape: "object: fixture slug -> { detectors?, arrivalTargets?, expectedAction?, policyFamily?, policyConformance?, formatReason?, issue?, assessment.contract? }",
      keys: { of: "benchmarks/fixture-index.json#fixtures[].slug", ...keyInfo(slugs) },
      owner: "redact-secret-benchmarks",
      reason: "Detector assignments, arrival targets, expected product actions and policy bookkeeping are scanner and product state (ADR 0005, what is dropped).",
    },
    {
      id: "pin-manifest",
      legacyPath: "benchmarks/pin-manifest.json",
      merge: "supply the file itself; corpusHashes must be recomputed over the projected corpora (their bytes differ from the legacy generator output)",
      shape: "legacy pin-manifest v1: product revision pins plus corpus hashes",
      keys: null,
      owner: "redact-secret-benchmarks (which Redact Secret revision was measured)",
      reason: "A pin names the product build under measurement. This repository does not know or assert that.",
    },
    {
      id: "known-gaps",
      legacyPath: "benchmarks/known-gaps.json",
      merge: "supply the file itself",
      shape: "legacy known-gaps v1: per-issue workflow status, fix, promotion and scanner findings",
      keys: null,
      owner: "redact-secret-benchmarks / Redact Secret product issues",
      reason: "Canonical cases keep scanner-neutral incidents (failure mode, summary, observed date); workflow state and scanner findings are product state.",
    },
  ];
  return { format: OVERLAY_FORMAT, formatVersion: 1, status: "interface-only: none of these overlays is supplied or asserted by credential-evidence", consumers: "The legacy files that read each overlaid file are listed per file in docs/migration/parity-report.md.", overlays };
}

// ------------------------------------------------------------------ entry point

/**
 * @param {{ records: object[], vocabulary: object, sourceDigest: string, schemaRevision: string }} input
 * @returns {{ artifacts: Map<string, string>, manifest: object, manifestText: string, stats: object }}
 */
export function buildProjection({ records, vocabulary, sourceDigest, schemaRevision }) {
  const ix = indexRecords(records);
  if (!ix.sets.size || !ix.families.size) throw new Error("records/ has no fixture sets or families; run the importers first");
  const taxonomy = buildTaxonomy(ix, vocabulary);
  const dossiers = buildDossiers(ix);
  const scenarios = buildScenarios(ix, vocabulary);
  const categories = buildCategories(ix, vocabulary);
  const semantics = buildSemantics(ix, vocabulary);
  const index = buildIndex({ ix, vocabulary, semantics, scenarios, taxonomy });
  const corpora = buildCorpora(ix, vocabulary);
  const overlay = buildOverlayInterface({ taxonomy, index });
  const snapshot = buildCorpusSnapshot(ix, { sourceDigest, schemaRevision });

  const artifacts = new Map();
  artifacts.set("benchmarks/support/taxonomy.json", json(taxonomy));
  artifacts.set("benchmarks/support/dossier-frontmatter.json", json(dossiers));
  artifacts.set("benchmarks/scenarios.json", json(scenarios));
  artifacts.set("benchmarks/categories.json", json(categories));
  artifacts.set("benchmarks/fixture-semantics.json", json(semantics));
  artifacts.set("benchmarks/fixture-index.json", json(index));
  for (const [path, corpus] of corpora) artifacts.set(path, json(corpus));
  artifacts.set("credential-eval/corpus-snapshot.json", json(snapshot));
  artifacts.set("overlay-interface.json", json(overlay));

  const source = { kind: "records-tree-sha256", digest: sourceDigest };
  const entries = [...artifacts].sort((a, b) => cmp(a[0], b[0])).map(([path, text]) => ({
    path,
    bytes: Buffer.byteLength(text),
    sha256: sha256(text),
    sourceRevision: source,
    schemaRevision,
    generator: GENERATOR,
  }));
  const manifest = {
    format: MANIFEST_FORMAT,
    formatVersion: MANIFEST_FORMAT_VERSION,
    note: "Derived compatibility data. Not canonical, not an assertion. Regenerate with `npm run export:legacy`; legacy files stay authoritative until docs/migration/cutover.md is satisfied.",
    sourceRevision: source,
    schemaRevision,
    generator: GENERATOR,
    projectionDigest: sha256(entries.map((e) => `${e.path} ${e.sha256}`).join("\n")),
    artifactCount: entries.length,
    artifacts: entries,
  };
  return {
    artifacts,
    manifest,
    manifestText: json(manifest),
    projected: { taxonomy, dossiers, scenarios, categories, semantics, index, corpora, overlay, snapshot },
    stats: { families: taxonomy.families.length, providers: taxonomy.providers.length, fixtures: index.fixtures.length, corpora: corpora.size },
  };
}
