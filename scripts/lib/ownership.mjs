// Where a record came from: a migration importer's baseline (ADR 0015) or a hand or agent ("authored").
//
// A path in docs/migration/baseline-manifest.json is a baseline record: the importer named in the
// manifest (`migrate:taxonomy`, `migrate:cases`, `migrate:narratives`) produced its pinned version.
// Every other path is "authored": a record added after the import, or an example. This is provenance,
// not a lock. A baseline record may be edited by a reviewed change; the edit is declared in
// docs/migration/baseline-amendments.json (`npm run baseline:amend`) and `npm run baseline:check` fails
// without it. Historical checks regenerate the pinned baseline, so an amendment never breaks them.
// (Before ADR 0015 the importers owned these directories wholesale, an edit failed `migrate:*:check`,
// and the research harness opened such changes as drafts labeled blocked-by-pipeline-ownership.)

import { baselineOwners } from "./baseline.mjs";

/**
 * `authored`, or the name of the importer whose pinned baseline contains `path` (repository-relative, `/`-separated).
 * `owners` defaults to the manifest of this repository; tests pass their own map.
 */
export function ownerOf(path, _record, owners = baselineOwners()) {
  return owners.get(path) ?? "authored";
}

/** The importer input behind a baseline record: what to change if the pinned baseline itself must change (a re-pin). */
export const GENERATOR_INPUT = {
  "migrate:taxonomy": "the pinned legacy taxonomy and dossiers (scripts/migrate/lib/taxonomy-import.mjs, scripts/migrate/authored/source-types.mjs)",
  "migrate:cases": "scripts/migrate/lib/build-records.mjs and the pinned legacy fixtures",
  "migrate:narratives": "scripts/migrate/authored/narratives/<provider>.mjs, then npm run migrate:narratives",
};
