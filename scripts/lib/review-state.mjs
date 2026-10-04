// Review state of one fixture (ADR 0020, docs/governance/solo-maintainer-period.md): `maintainer-only` when its own
// evidence entry says so, else when its case or scenario is, `reviewed` when its case or scenario is, else `draft`.
// Shared by the validator, the representation rules and the release accounting so they cannot disagree.

/**
 * @param {object} item  a fixture-set item
 * @param {object} set   its fixture set
 * @param {(kind: string, id: string) => object|undefined} get  record lookup
 * @returns {"maintainer-only"|"reviewed"|"draft"}
 */
export function fixtureReviewState(item, set, get) {
  if (item.evidence !== undefined) {
    // an item that cites its own evidence entry takes that entry's state; the entry never inherits its target's
    return set.evidence?.[item.evidence]?.reviewState === "maintainer-only" ? "maintainer-only" : "draft";
  }
  const target = item.case !== undefined ? get("case", item.case) : get("scenario", item.cell?.scenario);
  if (target?.lifecycle === "maintainer-only") return "maintainer-only";
  if (target?.lifecycle === "reviewed") return "reviewed";
  return "draft";
}
