// Base-sample count report (schema revision 1.6.0, ADR 0016).
//
// Counts authored base samples separately from generated projections, per fixture plan and overall, so a corpus
// of thousands of correlated inputs is never mistaken for thousands of independent samples. Pure and deterministic:
// the same records give the same report, sorted, with no clock and no network.
//
// Terms (docs/authoring.md, "Representing transformed credentials"):
//   authored base   an item with derivation.kind authored-base: a reviewed, hand-written value.
//   projection      an item with derivation.kind projection, built from one or more bases. Generated when its set is.
//   unattributed    an item with no derivation (every item that existed before schema 1.6.0): counted, never guessed.
//   independent base count: distinct base values (SHA-256 of the base's secret bytes, or of its whole content for a
//   benign base) among the bases projections actually use. Two base ids holding the same value count once.

import { baseValue, contentBytes, sha256Hex } from "./representation.mjs";

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const sorted = (xs) => [...xs].sort(cmp);

/**
 * @param {{ sets: object[], cases: object[], plans: object[] }} input schema-valid records
 */
export function buildBasesReport({ sets, cases, plans }) {
  const caseById = new Map(cases.map((c) => [c.id, c]));
  const itemById = new Map();
  for (const set of sets) for (const item of set.fixtures) itemById.set(item.id, { item, set });
  const baseBytes = (id) => {
    const found = itemById.get(id);
    return found?.item.derivation?.kind === "authored-base" ? contentBytes(found.item) : undefined;
  };
  const bytesOf = (item) => contentBytes(item, baseBytes);
  const familiesOf = (item) => item.families ?? (item.case ? (caseById.get(item.case)?.families ?? []).map((f) => f.family) : (item.cell?.families ?? []));
  const valueShaOf = (id) => {
    const { item } = itemById.get(id);
    return sha256Hex(baseValue(item, bytesOf(item)));
  };

  const all = [...itemById.values()];
  const bases = all.filter((x) => x.item.derivation?.kind === "authored-base");
  const projections = all.filter((x) => x.item.derivation?.kind === "projection");
  const unattributed = all.filter((x) => !x.item.derivation);
  const used = new Set(projections.flatMap((x) => x.item.derivation.bases));

  const summarize = (members) => {
    const projs = members.filter((x) => x.item.derivation?.kind === "projection");
    const usedIds = sorted(new Set(projs.flatMap((x) => x.item.derivation.bases)));
    const values = new Set(usedIds.filter((id) => itemById.has(id)).map(valueShaOf));
    return {
      generatedProjections: projs.filter((x) => x.set.generated).length,
      authoredProjections: projs.filter((x) => !x.set.generated).length,
      unattributed: members.filter((x) => !x.item.derivation).length,
      authoredBasesInMembers: members.filter((x) => x.item.derivation?.kind === "authored-base").length,
      basesUsed: usedIds,
      independentBaseValues: values.size,
    };
  };

  const duplicateValues = new Map();
  for (const x of bases) {
    const v = valueShaOf(x.item.id);
    duplicateValues.set(v, [...(duplicateValues.get(v) ?? []), x.item.id]);
  }

  const planRows = [];
  for (const plan of [...plans].sort((a, b) => cmp(a.id, b.id))) {
    const members = all.filter((x) => x.item.cell?.plan === plan.id);
    const declared = sorted((plan.generation.inputs ?? []).filter((i) => i.kind === "fixture").map((i) => i.id));
    const s = summarize(members);
    planRows.push({
      plan: plan.id,
      items: members.length,
      declaredBases: declared,
      ...s,
      usedButNotDeclared: declared.length ? s.basesUsed.filter((id) => !declared.includes(id)) : [],
      declaredButUnused: declared.filter((id) => !s.basesUsed.includes(id)),
    });
  }

  const families = new Map();
  for (const x of all) {
    for (const f of familiesOf(x.item)) {
      const row = families.get(f) ?? { family: f, authoredBases: new Set(), projections: 0 };
      if (x.item.derivation?.kind === "authored-base") row.authoredBases.add(x.item.id);
      if (x.item.derivation?.kind === "projection") row.projections += 1;
      families.set(f, row);
    }
  }

  return {
    totals: {
      fixtures: all.length,
      authoredBases: bases.length,
      distinctAuthoredBaseValues: duplicateValues.size,
      authoredBasesUsedByProjections: bases.filter((x) => used.has(x.item.id)).length,
      authoredBasesUnused: sorted(bases.filter((x) => !used.has(x.item.id)).map((x) => x.item.id)),
      projections: projections.length,
      generatedProjections: projections.filter((x) => x.set.generated).length,
      authoredProjections: projections.filter((x) => !x.set.generated).length,
      unattributed: unattributed.length,
      independentBaseValues: summarize(all).independentBaseValues,
    },
    duplicateBaseValues: [...duplicateValues.values()].filter((ids) => ids.length > 1).map(sorted).sort((a, b) => cmp(a[0], b[0])),
    plans: planRows,
    families: [...families.values()]
      .map((r) => ({ family: r.family, authoredBases: r.authoredBases.size, projections: r.projections }))
      .filter((r) => r.authoredBases || r.projections)
      .sort((a, b) => cmp(a.family, b.family)),
  };
}

export function renderBasesReport(report) {
  const t = report.totals;
  const out = [];
  out.push("# Base-sample report", "");
  out.push("| measure | count |", "| --- | ---: |");
  out.push(`| fixtures | ${t.fixtures} |`);
  out.push(`| authored base samples | ${t.authoredBases} |`);
  out.push(`| distinct authored base values | ${t.distinctAuthoredBaseValues} |`);
  out.push(`| independent base values used by projections | ${t.independentBaseValues} |`);
  out.push(`| projections | ${t.projections} (${t.generatedProjections} generated, ${t.authoredProjections} hand-authored) |`);
  out.push(`| unattributed fixtures (no derivation) | ${t.unattributed} |`);
  if (t.authoredBasesUnused.length) out.push(`| authored bases no projection uses | ${t.authoredBasesUnused.length} |`);
  out.push("");
  out.push("Independent bases are not generated inputs: the second figure is what a scorer may report as the sample size, the projection count is how many correlated inputs were derived from it.", "");
  if (report.duplicateBaseValues.length) {
    out.push("## Duplicate base values", "");
    for (const ids of report.duplicateBaseValues) out.push(`- ${ids.join(", ")}`);
    out.push("");
  }
  if (report.plans.length) {
    out.push("## Plans", "");
    out.push("| plan | items | generated projections | hand-authored | unattributed | independent bases | declared bases | problems |", "| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |");
    for (const p of report.plans) {
      const problems = [...p.usedButNotDeclared.map((id) => `uses undeclared ${id}`), ...p.declaredButUnused.map((id) => `declares unused ${id}`)];
      out.push(`| ${p.plan} | ${p.items} | ${p.generatedProjections} | ${p.authoredProjections} | ${p.unattributed} | ${p.independentBaseValues} | ${p.declaredBases.length} | ${problems.join("; ") || "none"} |`);
    }
    out.push("");
  }
  if (report.families.length) {
    out.push("## Families", "");
    out.push("| family | authored bases | projections |", "| --- | ---: | ---: |");
    for (const f of report.families) out.push(`| ${f.family} | ${f.authoredBases} | ${f.projections} |`);
    out.push("");
  }
  return `${out.join("\n")}`;
}
