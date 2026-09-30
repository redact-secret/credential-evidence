// Pure, deterministic projection of canonical records into the input shapes that
// `redact-secret-benchmarks` consumers read (see docs/decisions/0006).
//
// `buildProjection({ records, legacyMaps, vocabulary, ... })` takes parsed, schema-valid
// canonical records plus the legacy map and returns every artifact as text. No clock, no
// network, no randomness, no legacy checkout. Everything is sorted by stable id.
//
// Names: canonical fixtures (fixtures.mjs) carry canonical ids and paths only. Every legacy
// name (`beta8-*` suites, legacy fixture ids, corpus paths, navigation scenario ids) is
// regenerated from the legacy map by legacy-map.mjs, the single join point (ADR 0009).
//
// Boundary: a projection is derived, lossy by design, and never an assertion. It
// carries no detector assignment, support status, release milestone or product
// pin. Consumers that need those supply them as an overlay; `overlay-interface.json`
// states exactly what, and it is regenerated with every projection.

import { createHash } from "node:crypto";
import { collectFixtures } from "./fixtures.mjs";
import { loadLegacyNames, nameFixtures } from "./legacy-map.mjs";

export const GENERATOR = { name: "credential-evidence/legacy-projection", version: "2.0.0" };
export const MANIFEST_FORMAT = "credential-evidence/legacy-projection-manifest";
export const MANIFEST_FORMAT_VERSION = 1;
export const LEGACY_ID_MAP_FORMAT = "credential-evidence/legacy-id-map";
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
  return { by, providers: map("provider"), families: map("family"), contracts: map("format-contract"), sources: map("evidence-source"), reviews: map("evidence-review-history"), cases: map("case"), sets: map("fixture-set"), scenarios: map("scenario"), plans: map("fixture-plan") };
}

/** Rebuild a legacy URL from a sourceRef: base URL (exact legacy URL if the locator was a repository) plus the fragment locator. */
function urlOf(ref, sources) {
  const src = sources.get(ref.sourceId);
  if (!src) throw new Error(`unknown evidence source ${ref.sourceId}`);
  const legacyUrl = (src.externalRefs ?? []).find((r) => r.system === "legacy-url");
  return (legacyUrl ? legacyUrl.id : src.locator.url) + (ref.locator ?? "");
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

function buildScenarios(catalog, vocabulary) {
  const legacy = legacyScenarioIds(vocabulary);
  const used = new Set(catalog.fixtures.flatMap((f) => f.scenarioIds.filter((id) => legacy.has(id))));
  return { schemaVersion: 1, scenarios: vocabulary.scenarios.filter((s) => used.has(s.id)).map((s) => ({ id: s.id, title: s.title, description: s.description })) };
}

function buildCategories(catalog, vocabulary) {
  return catalog.suites.map((s) => ({ id: s.id, title: s.title, description: s.description, kind: vocabulary.categoryKind, corpus: s.corpus }));
}

/** Inverse of the importer's tier mapping: (outcome, basis) to the legacy (kind, tier). T0 has no recoverable kind. */
function legacyAssessment(outcome, basis) {
  if (outcome === "not-assertable") return { kind: "must-not-flag", tier: "T0" };
  const tier = { "provider-documented": "T1", "tool-corroborated": "T2", "project-policy": "T3" }[basis];
  if (!tier) throw new Error(`cannot express basis ${basis} with outcome ${outcome}`);
  if (outcome === "must-not-flag") return { kind: "must-not-flag", tier };
  return { kind: tier === "T3" ? "policy" : "must-redact", tier };
}

/**
 * The legacy corpus loader (validateCorpus) requires a twin's positive to carry a secret span. A positive whose
 * outcome is not must-flag (an unresolved T0 fixture: its candidate spans are not canonical) cannot satisfy that,
 * so a twin of such a fixture is projected without twin fields. The lineage stays canonical (fixture lineage).
 */
const positiveOf = (catalog, f) => catalog.byCanonicalId.get(f.fixture.item.lineage.of);
const hasRealPositive = (catalog, f) => positiveOf(catalog, f)?.fixture.outcome === "must-flag";
const twinName = (catalog, f) => {
  const positive = positiveOf(catalog, f);
  if (!positive) throw new Error(`fixture ${f.fixture.id}: lineage.of ${f.fixture.item.lineage.of} is not a fixture`);
  if (positive.suite !== f.suite) throw new Error(`fixture ${f.fixture.id}: twin and positive belong to different legacy suites`);
  return positive;
};

function buildCorpora(ix, catalog, vocabulary) {
  void vocabulary;
  const out = new Map();
  for (const suite of catalog.suites) {
    const fixtures = catalog.fixtures
      .filter((f) => f.suite === suite.id)
      .map((f) => {
        const { fixture } = f;
        const { kind, tier } = legacyAssessment(fixture.outcome, fixture.evidence.basis);
        const item = fixture.item;
        const o = {
          id: f.name,
          path: f.legacyPath,
          group: fixture.targetId,
          content: item.text,
          expected: item.expected.spans.map((sp) => ({ start: sp.start, end: sp.end, role: sp.role, ...(sp.note ? { note: sp.note } : {}), ...(sp.envelope ? { envelope: { start: sp.envelope.start, end: sp.envelope.end, reason: sp.envelope.reason } } : {}) })),
          assessment: { kind, tier, reason: fixture.evidence.rationale, sources: uniqSorted(fixture.evidence.sources.map((r) => urlOf(r, ix.sources))) },
        };
        if (item.context) o.contextAxis = item.context;
        if (item.lineage && hasRealPositive(catalog, f)) {
          o.twinOf = twinName(catalog, f).name;
          if (item.lineage.mutation) o.mutation = item.lineage.mutation;
          if (item.lineage.mutationKind) o.mutationKind = item.lineage.mutationKind;
        }
        return o;
      });
    out.set(suite.corpus, { schemaVersion: 2, fixtures });
  }
  return out;
}

function buildSemantics(catalog, vocabulary) {
  const legacy = legacyScenarioIds(vocabulary);
  const rows = [];
  let reviewedAt = "";
  for (const f of catalog.fixtures) {
    const row = { slug: f.slug, familyIds: f.fixture.families, scenarioIds: uniqSorted(f.scenarioIds.filter((id) => legacy.has(id))) };
    if (f.fixture.unscopedReason) row.unscopedReason = f.fixture.unscopedReason;
    rows.push(row);
    if (f.fixture.evidence.observedAt > reviewedAt) reviewedAt = f.fixture.evidence.observedAt;
  }
  rows.sort((a, b) => cmp(a.slug, b.slug));
  return { schemaVersion: 1, reviewedAt, fixtures: rows };
}

function buildIndex({ catalog, semantics, scenarios, taxonomy }) {
  const semBySlug = new Map(semantics.fixtures.map((r) => [r.slug, r]));
  const corpusOf = new Map(catalog.suites.map((s) => [s.id, s.corpus]));
  const fixtures = [];
  for (const f of catalog.fixtures) {
    const sem = semBySlug.get(f.slug);
    fixtures.push({
      slug: f.slug,
      source: { categoryId: f.suite, fixtureId: f.name, corpus: corpusOf.get(f.suite), path: f.legacyPath },
      familyIds: sem.familyIds,
      scenarioIds: sem.scenarioIds,
      ...(sem.unscopedReason ? { unscopedReason: sem.unscopedReason } : {}),
      provenance: { categoryId: f.suite },
      ...(f.fixture.item.lineage && hasRealPositive(catalog, f) ? { relations: { twinOf: twinName(catalog, f).slug } } : {}),
    });
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
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort(cmp).map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}

/**
 * The input document credential-eval reads (`credential-eval/corpus-snapshot/v1`), in canonical names: case id = the
 * canonical fixture id, path = its materialized path (`<set>/<name>/<file>`), `grouping.group` = the canonical Case or
 * Scenario id, twin lineage by canonical id. One case per fixture, same truth as the legacy corpora. `grouping` carries
 * the legacy kind and tier (which credential-eval keeps for partitioning), the canonical evidence class and, when the
 * fixture has exactly one family, that family. `targets` (the detector assignment) is an overlay and is absent.
 *
 * No legacy name appears in it (credential-eval's case ids are a closed grammar with no room for provenance). A consumer
 * that has to compare against a run over the legacy corpus re-keys through `credential-eval/legacy-id-map.json`.
 */
function buildCorpusSnapshot(fixtures, { sourceDigest, schemaRevision }) {
  const byId = new Map(fixtures.map((f) => [f.id, f]));
  const cases = [];
  for (const f of fixtures) {
    const { kind, tier } = legacyAssessment(f.outcome, f.evidence.basis);
    const grouping = { kind, tier, group: f.targetId, evidence_class: f.evidence.basis };
    if (f.families.length === 1) grouping.family = f.families[0];
    const item = f.item;
    const out = {
      id: f.id,
      path: f.materializedPath,
      content: item.text,
      expected: item.expected.spans.map((sp) => ({ start: sp.start, end: sp.end, role: sp.role, ...(sp.envelope ? { envelope: { start: sp.envelope.start, end: sp.envelope.end, reason: sp.envelope.reason } } : {}) })),
      grouping,
    };
    if (item.lineage?.mutation && byId.get(item.lineage.of)?.outcome === "must-flag") out.twin = { twin_of: item.lineage.of, mutation: item.lineage.mutation, mutation_kind: item.lineage.mutationKind };
    cases.push(out);
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

/**
 * The re-keying table between the snapshot (canonical ids and paths) and a run over the legacy corpus (legacy fixture
 * ids and `<suite>/<path>` paths), generated from the legacy map. It is a compatibility artifact for the dual run; it
 * is never read by credential-eval's validator and never part of the snapshot.
 */
function buildLegacyIdMap(catalog, snapshot) {
  const cases = catalog.fixtures.map((f) => ({ id: f.fixture.id, path: f.fixture.materializedPath, legacyId: f.slug, legacyPath: `${f.suite}/${f.legacyPath}` }));
  cases.sort((a, b) => cmp(a.id, b.id));
  return {
    format: LEGACY_ID_MAP_FORMAT,
    formatVersion: 1,
    note: "Generated from migration/legacy-map. Re-keys credential-eval/corpus-snapshot.json (canonical ids) to the legacy fixture ids and corpus paths. Not canonical data and not an input of credential-eval.",
    snapshotCorpusDigest: snapshot.identity.corpus_digest,
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
 * @param {{ records: object[], legacyMaps: object[], vocabulary: object, sourceDigest: string, schemaRevision: string }} input
 * @returns {{ artifacts: Map<string, string>, manifest: object, manifestText: string, stats: object }}
 */
export function buildProjection({ records, legacyMaps, vocabulary, sourceDigest, schemaRevision }) {
  const ix = indexRecords(records);
  if (!ix.sets.size || !ix.families.size) throw new Error("records/ has no fixture sets or families; run the importers first");
  // canonical fixtures, then the legacy names joined from the legacy map: the only place a legacy name enters
  const fixtures = collectFixtures(ix);
  const catalog = nameFixtures(fixtures, loadLegacyNames(legacyMaps, vocabulary));
  const taxonomy = buildTaxonomy(ix, vocabulary);
  const dossiers = buildDossiers(ix);
  const scenarios = buildScenarios(catalog, vocabulary);
  const categories = buildCategories(catalog, vocabulary);
  const semantics = buildSemantics(catalog, vocabulary);
  const index = buildIndex({ catalog, semantics, scenarios, taxonomy });
  const corpora = buildCorpora(ix, catalog, vocabulary);
  const overlay = buildOverlayInterface({ taxonomy, index });
  const snapshot = buildCorpusSnapshot(fixtures, { sourceDigest, schemaRevision });
  const legacyIds = buildLegacyIdMap(catalog, snapshot);

  const artifacts = new Map();
  artifacts.set("benchmarks/support/taxonomy.json", json(taxonomy));
  artifacts.set("benchmarks/support/dossier-frontmatter.json", json(dossiers));
  artifacts.set("benchmarks/scenarios.json", json(scenarios));
  artifacts.set("benchmarks/categories.json", json(categories));
  artifacts.set("benchmarks/fixture-semantics.json", json(semantics));
  artifacts.set("benchmarks/fixture-index.json", json(index));
  for (const [path, corpus] of corpora) artifacts.set(path, json(corpus));
  artifacts.set("credential-eval/corpus-snapshot.json", json(snapshot));
  artifacts.set("credential-eval/legacy-id-map.json", json(legacyIds));
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
    projected: { taxonomy, dossiers, scenarios, categories, semantics, index, corpora, overlay, snapshot, legacyIds },
    catalog,
    fixtures,
    stats: { families: taxonomy.families.length, providers: taxonomy.providers.length, fixtures: index.fixtures.length, corpora: corpora.size },
  };
}
