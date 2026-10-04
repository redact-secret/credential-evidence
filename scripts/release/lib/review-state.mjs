// Review-state accounting of a release (ADR 0020, docs/governance/solo-maintainer-period.md).
//
// The credential-eval snapshot never carries review state. A release records, next to `evalExport`, how many fixtures
// and decisions are `maintainer-only` (finalized by the sole maintainer during the solo-maintainer period, never
// reviewed, never independent validation) and how many are `reviewed`, so a consumer can tell them apart without
// reading every record. Pure and deterministic: records in, counts out. `release:check` and `release:verify` recompute
// it from the records (the bundle's own `text`), so the manifest cannot drift from them.

import { fixtureReviewState } from "../../lib/review-state.mjs";

export const REVIEW_STATE_CONTRACT = "credential-evidence/review-state/1";
export const SOLO_RULE = "solo-maintainer-period (ADR 0020)";

/**
 * @param {object[]} records parsed canonical records (any kinds)
 * @returns {object} the manifest's `reviewState`
 */
export function reviewStateAccounting(records) {
  const byId = new Map(records.map((r) => [`${r.kind}:${r.id}`, r]));
  const fixtures = { total: 0, draft: 0, maintainerOnly: 0, reviewed: 0 };
  const maintainerOnlyByOutcome = {};
  for (const set of records) {
    if (set.kind !== "fixture-set") continue;
    for (const item of set.fixtures) {
      fixtures.total += 1;
      const state = fixtureReviewState(item, set, (kind, id) => byId.get(`${kind}:${id}`));
      if (state === "maintainer-only") {
        fixtures.maintainerOnly += 1;
        maintainerOnlyByOutcome[item.expected.outcome] = (maintainerOnlyByOutcome[item.expected.outcome] ?? 0) + 1;
      } else fixtures[state] += 1;
    }
  }
  const lifecycleCount = (kind, state) => records.filter((r) => r.kind === kind && r.lifecycle === state).length;
  let decisions = 0;
  for (const r of records) if (r.kind === "evidence-review-history") decisions += r.events.filter((e) => e.type === "decided").length;
  return {
    contract: REVIEW_STATE_CONTRACT,
    rule: SOLO_RULE,
    note: "maintainer-only: finalized by the sole maintainer, never reviewed, never independent validation, queued for retro-review. The credential-eval snapshot does not carry review state.",
    fixtures,
    maintainerOnly: {
      fixtures: fixtures.maintainerOnly,
      fixturesByOutcome: Object.fromEntries(Object.entries(maintainerOnlyByOutcome).sort(([a], [b]) => (a < b ? -1 : 1))),
      records: { case: lifecycleCount("case", "maintainer-only"), scenario: lifecycleCount("scenario", "maintainer-only") },
      decisions,
    },
  };
}

/** Compare a recorded `reviewState` with the one recomputed from the bundle's records. Returns null or the reason. */
export function reviewStateProblem(recorded, records) {
  if (recorded === undefined) return null;
  if (JSON.stringify(recorded) !== JSON.stringify(reviewStateAccounting(records))) return "reviewState differs from the review state the bundled records carry";
  return null;
}
