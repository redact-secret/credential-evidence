// Named predicates a parity rule may require on top of its path pattern and value
// constraints. A predicate checks the *reason* a difference is explained against the
// data itself (the canonical records and the legacy document), so a rule cannot
// excuse a difference that does not have the stated cause.
//
// Every predicate is `(diff, ctx) => boolean`. `ctx` (built in run.mjs) offers:
//   ctx.docId                      id of the document being compared
//   ctx.legacy(path)               legacy leaf value at a path of the same document, or undefined
//   ctx.keyOf(path)                the first array key of a path (the fixture slug/id, category id, family id)
//   ctx.peerPaths(path)            the same path for every other fixture the canonical grouping folds with this one
//                                  (same Case for families and scenarios; same evidence entry for citations)
//   ctx.caseOf(path)               the canonical target of the fixture the path belongs to, as a case-like record
//                                  { id, families, expectation: { outcome, basis, rationale } } (the fixture's own evidence), or undefined
//   ctx.recordedSourceBases        Set of URLs that exist as canonical evidence sources
//   ctx.familyDossierClass(id)     evidence class of the family's dossier-research claim, or undefined
//   ctx.recomputeDigest(path)      the legacy digestJson of the projected document a fixture-index digest field covers

const DOWNGRADE_NOTE = /^Legacy tier T[12] \((tool-corroborated|provider-documented)\), but /;

const normalize = (t) => t.replace(/\s+/g, " ").trim();
const BASIS_NOTE = /^(Legacy tier T1 \(provider-documented\), but no cited source is provider-owned; recorded as [a-z-]+( pending review)?\. |Legacy tier T2 \(tool-corroborated\), but the cited sources .*? pending review\. |Legacy tier T0: the evidence is unresolved and the fixtures were unscored, so no outcome is asserted\. )/;
const stripBasisNote = (t) => t.replace(BASIS_NOTE, "");

const baseOf = (url) => {
  const i = String(url).indexOf("#");
  return i < 0 ? String(url) : String(url).slice(0, i);
};

export const PREDICATES = {
  /** The added element is one the legacy document lists for another fixture the canonical grouping folds with this one: the projection carries the union of its Case (families, scenarios) or of its evidence entry (citations). */
  "added-from-peer-in-case": (d, ctx) => d.change === "added" && ctx.peerPaths(d.path).some((p) => ctx.legacy(p) !== undefined),

  /** The projected value is the canonical target id of the fixture: its Case, or for a matrix cell its Scenario (the legacy display group is replaced by it). */
  "value-is-target-id": (d, ctx) => ctx.caseOf(d.path)?.id === d.projected,

  /** The legacy per-fixture reason was collapsed to the fixture's evidence reason: the most common legacy reason of its group (whitespace-normalized, possibly clipped), optionally after the importer recorded basis note. */
  "reason-collapsed-to-case": (d, ctx) => {
    const c = ctx.caseOf(d.path);
    if (!c || typeof d.projected !== "string" || d.projected !== c.expectation.rationale) return false;
    const core = stripBasisNote(d.projected);
    const clipped = core.endsWith("…") ? core.slice(0, -1) : null;
    return [d.path, ...ctx.peerPaths(d.path)].map((p) => ctx.legacy(p)).filter((r) => typeof r === "string").some((r) => {
      const n = normalize(r);
      return n === core || (clipped !== null && n.startsWith(clipped));
    });
  },

  /** The legacy evidence tier was re-expressed after an importer downgrade that the case rationale records (fewer than two distinct owners, or no provider-owned source). */
  "basis-downgrade-recorded": (d, ctx) => {
    const c = ctx.caseOf(d.path);
    return !!c && c.expectation.basis === "project-policy" && DOWNGRADE_NOTE.test(c.expectation.rationale);
  },

  /** The legacy fixture is tier T0 (unresolved, unscored): the canonical case is not-assertable and carries no spans and no recoverable kind. */
  "legacy-tier-t0": (d, ctx) => {
    const tierPath = d.path.replace(/\.(assessment\.kind|expected.*)$/, ".assessment.tier");
    return ctx.legacy(tierPath) === "T0" && ctx.caseOf(d.path)?.expectation.outcome === "not-assertable";
  },

  /** The legacy fixture asserts silence (kind must-not-flag) or is unresolved (T0): companion and candidate spans are not carried. */
  "spans-dropped-on-silent-or-unresolved": (d, ctx) => {
    const base = d.path.replace(/\.expected(\[.*)?$/, "");
    const kind = ctx.legacy(`${base}.assessment.kind`);
    const tier = ctx.legacy(`${base}.assessment.tier`);
    const outcome = ctx.caseOf(d.path)?.expectation.outcome;
    return (kind === "must-not-flag" || tier === "T0") && (outcome === "must-not-flag" || outcome === "not-assertable");
  },

  /** A legacy citation that is not a URL, or whose base URL is not a canonical evidence source (the taxonomy import never minted it). */
  "source-not-recorded": (d, ctx) => typeof d.legacy === "string" && (!/^https:\/\/\S+$/.test(d.legacy) || !ctx.recordedSourceBases.has(baseOf(d.legacy))),

  /** The fixture's projected source list is empty because every legacy citation of it was unrecorded. */
  "all-legacy-sources-unrecorded": (d, ctx) => {
    const prefix = `${d.path}[=`;
    const cited = ctx.legacyPathsWithPrefix(prefix).map((p) => ctx.legacy(p));
    return cited.length > 0 && cited.every((u) => !/^https:\/\/\S+$/.test(u) || !ctx.recordedSourceBases.has(baseOf(u)));
  },

  /** The legacy category is the calibration-only tuning input, which is not imported. */
  "calibration-only-category": (d, ctx) => ctx.legacy(`[${ctx.keyOf(d.path)}].calibrationOnly`) === true,

  /** The twin's positive is an unresolved fixture (canonical outcome not-assertable, candidate spans dropped), so the legacy twin invariant (a positive with a secret span) cannot hold and the twin fields are not projected. */
  "twin-target-not-assertable": (d, ctx) => {
    const target = d.path.endsWith(".relations.twinOf") ? d.legacy : ctx.legacy(d.path.replace(/\.(twinOf|mutation|mutationKind)$/, ".twinOf"));
    return typeof target === "string" && ctx.caseOfKey(target)?.expectation.outcome === "not-assertable";
  },

  /** The dossier tier projects as T0 because the family's dossier-research claim is recorded as unresolved evidence (the importer downgrade), not because of a value the projection chose. */
  "dossier-claim-unresolved": (d, ctx) => ctx.familyDossierClass(ctx.keyOf(d.path)) === "unresolved",

  /** The projected digest is the legacy digestJson of the projected document it covers, recomputed here: the digest differs from legacy because the content it covers differs, and it is self-consistent. */
  "digest-self-consistent": (d, ctx) => typeof d.projected === "string" && ctx.recomputeDigest(d.path) === d.projected,

  /** The fixture's canonical case has at least one family, which replaces the legacy unscoped marker (case-level union). */
  "case-has-families": (d, ctx) => (ctx.caseOf(d.path)?.families ?? []).length > 0,
};

export function evaluatePredicate(name, diff, ctx) {
  const p = PREDICATES[name];
  if (!p) throw new Error(`unknown parity predicate '${name}'`);
  return p(diff, ctx);
}
