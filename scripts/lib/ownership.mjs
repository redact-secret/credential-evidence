// Who writes a record: a hand or agent ("authored"), or one of the migration pipelines that
// regenerate it from the pinned legacy revision (docs/decisions/0004, 0008, 0010).
//
// `npm run migrate:*:check` compares a generated record byte for byte and the next
// regeneration overwrites it, so an in-place edit to one cannot survive until the cutover
// (docs/migration/cutover.md). The rules mirror the pipelines' own OWNED_DIRS:
//
//   migrate:taxonomy   records/{providers,families,contracts,sources,variants,siblings,reviews}/**
//                      that carry an externalRefs entry with system legacy-taxonomy-import
//   migrate:cases      records/{scenarios,cases,fixture-plans,fixtures}/** and migration/legacy-map/**,
//                      written wholesale (every file there is generated)
//   migrate:narratives records/{narratives,narrative-reviews}/**, written wholesale from
//                      scripts/migrate/authored/narratives (the authored input)

export const TAXONOMY_SYSTEM = "legacy-taxonomy-import";
const TAXONOMY_DIRS = ["providers", "families", "contracts", "sources", "variants", "siblings", "reviews"];
const CASES_DIRS = ["scenarios", "cases", "fixture-plans", "fixtures"];
const NARRATIVE_DIRS = ["narratives", "narrative-reviews"];

/** `authored` or the name of the npm script that generates it. `path` is repository-relative, `/`-separated. */
export function ownerOf(path, record) {
  if (path.startsWith("migration/legacy-map")) return "migrate:cases";
  const m = /^records\/([^/]+)\//.exec(path);
  if (!m) return "authored";
  const dir = m[1];
  if (CASES_DIRS.includes(dir)) return "migrate:cases";
  if (NARRATIVE_DIRS.includes(dir)) return "migrate:narratives";
  if (TAXONOMY_DIRS.includes(dir) && (record?.externalRefs ?? []).some((r) => r.system === TAXONOMY_SYSTEM)) return "migrate:taxonomy";
  return "authored";
}

/** Where to change a generated record's content instead of the JSON. */
export const GENERATOR_INPUT = {
  "migrate:taxonomy": "the pinned legacy taxonomy and dossiers (scripts/migrate/lib/taxonomy-import.mjs, scripts/migrate/authored/source-types.mjs)",
  "migrate:cases": "scripts/migrate/lib/build-records.mjs and the pinned legacy fixtures",
  "migrate:narratives": "scripts/migrate/authored/narratives/<provider>.mjs, then npm run migrate:narratives",
};
