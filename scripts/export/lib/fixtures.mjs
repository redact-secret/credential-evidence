// The canonical fixtures, flattened for the exporter (ADR 0009).
//
// One row per fixture in `records/fixtures/*.json`, resolved against its Case or plan cell and
// its evidence entry. A row carries only canonical facts: ids, paths and names are the
// canonical ones. Legacy names are joined on by `legacy-map.mjs` and nowhere else.

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const uniqSorted = (xs) => [...new Set(xs)].sort(cmp);

/**
 * @param {{ sets: Map, cases: Map, scenarios: Map }} ix  from indexRecords
 * @returns {object[]} fixture rows sorted by canonical id:
 *   { id, set, item, caseId, targetId, families, unscopedReason, evidence, evidenceKey, outcome, materializedPath, target }
 *   `targetId` is the Case id, or for a plan cell the Scenario id; `target` mimics the record that carries the fixture's
 *   reasoning (id, families, the fixture's own expectation evidence) for the parity predicates.
 */
export function collectFixtures(ix) {
  const rows = [];
  for (const set of ix.sets.values()) {
    for (const item of set.fixtures) {
      const c = item.case ? ix.cases.get(item.case) : undefined;
      const scenario = item.cell ? ix.scenarios.get(item.cell.scenario) : undefined;
      if (!c && !scenario) throw new Error(`fixture ${item.id}: unresolved target`);
      const own = c ? c.expectation : scenario.evidenceBasis;
      const evidence = item.evidence !== undefined ? set.evidence[item.evidence] : own;
      rows.push({
        id: item.id,
        set,
        item,
        caseId: item.case,
        targetId: c ? c.id : scenario.id,
        families: c ? uniqSorted(c.families.map((f) => f.family)) : uniqSorted(item.cell.families),
        unscopedReason: c?.unscopedReason,
        evidence,
        // evidence keys are content hashes, so equal evidence has one key in every set: fixtures that share it are folded together
        evidenceKey: item.evidence !== undefined ? item.evidence : `${item.case ?? item.cell.scenario}`,
        outcome: item.expected.outcome,
        materializedPath: `${set.id}/${item.path}`,
        target: {
          id: c ? c.id : scenario.id,
          families: c ? c.families : item.cell.families.map((family) => ({ family })),
          expectation: { outcome: item.expected.outcome, basis: evidence.basis, rationale: evidence.rationale, sources: evidence.sources, observedAt: evidence.observedAt },
          unscopedReason: c?.unscopedReason,
        },
      });
    }
  }
  rows.sort((a, b) => cmp(a.id, b.id));
  return rows;
}
