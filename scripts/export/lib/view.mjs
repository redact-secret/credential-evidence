// The legacy view of the canonical fixtures (stage B adapter, ADR 0008).
//
// Canonical fixtures are organised by provider and carry semantic ids; the legacy
// benchmark inputs are organised by legacy suite with legacy fixture ids. The
// compatibility exporter and the parity harness still speak the legacy shapes, so
// they read the canonical records through this view, which joins each canonical
// fixture to its legacy suite, id, corpus path and navigation scenario ids through
// the legacy map (migration/legacy-map). Nothing here is evidence: it only says
// which legacy name a canonical fixture answers to.
//
// Stage C replaces the exporter's dependency on this adapter.

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const uniqSorted = (xs) => [...new Set(xs)].sort(cmp);

/**
 * @param {{ sets: Map, cases: Map, scenarios: Map, maps: object[] }} ix  from indexRecords
 * @returns {{ suites: object[], fixtures: object[], bySlug: Map, byId: Map }}
 *   fixture: { slug, suite, name, legacyPath, scenarioIds, id, set, item, target, groupId, families,
 *              unscopedReason, evidence, outcome, evidenceKey, caseId }
 */
export function buildLegacyView(ix) {
  const suites = [];
  const legacyOf = new Map(); // canonical fixture id -> { slug, suite, path, scenarioIds }
  for (const map of ix.maps) {
    for (const e of map.entries) {
      if (e.legacy.type === "suite") {
        suites.push({ id: e.legacy.id, title: e.legacy.title, description: e.legacy.description, corpus: e.legacy.path });
      } else if (e.legacy.type === "fixture") {
        const slug = e.legacy.id;
        const i = slug.indexOf("--");
        if (i < 0) throw new Error(`legacy fixture id '${slug}' has no suite prefix`);
        legacyOf.set(e.canonical.id, { slug, suite: slug.slice(0, i), name: slug.slice(i + 2), path: e.legacy.path, scenarioIds: e.legacy.scenarioIds ?? [] });
      }
    }
  }
  suites.sort((a, b) => cmp(a.id, b.id));

  const fixtures = [];
  for (const set of ix.sets.values()) {
    for (const item of set.fixtures) {
      const legacy = legacyOf.get(item.id);
      if (!legacy) throw new Error(`canonical fixture ${item.id} has no legacy-map entry`);
      const c = item.case ? ix.cases.get(item.case) : undefined;
      const scenario = item.cell ? ix.scenarios.get(item.cell.scenario) : undefined;
      if (!c && !scenario) throw new Error(`fixture ${item.id}: unresolved target`);
      const own = c ? c.expectation : scenario.evidenceBasis;
      const evidence = item.evidence !== undefined ? set.evidence[item.evidence] : own;
      const families = c ? uniqSorted(c.families.map((f) => f.family)) : uniqSorted(item.cell.families);
      fixtures.push({
        ...legacy,
        legacyPath: legacy.path,
        id: item.id,
        set,
        item,
        caseId: item.case,
        groupId: c ? c.id : scenario.id,
        families,
        unscopedReason: c?.unscopedReason,
        evidence,
        // evidence keys are content hashes, so equal evidence has one key in every set: fixtures that share it are folded together
        evidenceKey: item.evidence !== undefined ? item.evidence : `${item.case ?? item.cell.scenario}`,
        outcome: item.expected.outcome,
        // `peer` mimics the record the parity predicates consult: the target's id and families with the fixture's own expectation evidence
        peer: { id: c ? c.id : scenario.id, families: c ? c.families : item.cell.families.map((family) => ({ family })), expectation: { outcome: item.expected.outcome, basis: evidence.basis, rationale: evidence.rationale, sources: evidence.sources, observedAt: evidence.observedAt }, unscopedReason: c?.unscopedReason },
      });
    }
  }
  fixtures.sort((a, b) => cmp(a.slug, b.slug));
  const bySlug = new Map(fixtures.map((f) => [f.slug, f]));
  const byId = new Map(fixtures.map((f) => [f.id, f]));
  if (bySlug.size !== fixtures.length) throw new Error("two canonical fixtures map to one legacy fixture");
  for (const s of suites) if (!fixtures.some((f) => f.suite === s.id)) throw new Error(`legacy suite ${s.id} maps no fixture`);
  return { suites, fixtures, bySlug, byId };
}
