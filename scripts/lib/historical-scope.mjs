// Which changes must run the historical pinned checks (ADR 0015): the importers, the legacy projection and
// parity, and the tests that assert the imported baseline. They need the legacy checkout at the pin and
// reproduce the import; an ordinary research or record change cannot affect them, so on a pull request or
// push they run only when one of these paths changes. Always, on workflow_dispatch and on a release; and
// on the periodic audit (docs/migration/validation-split.md).
//
// A test keeps this list honest: every file the historical entry points import, transitively, must match.

/** A path ending in `/` matches everything under it; any other entry is an exact file. */
export const HISTORICAL_PATHS = [
  "scripts/migrate/", // the importers, the authored import input, the pin (legacy-source.mjs)
  "scripts/export/", // the legacy projection and the consumer vocabulary
  "scripts/parity/", // the parity harness and its rules
  "scripts/dual-run/",
  "scripts/baseline.mjs",
  "scripts/historical-scope.mjs",
  // shared generator code the importers, the projection and parity import
  "scripts/lib/baseline.mjs",
  "scripts/lib/historical-scope.mjs",
  "scripts/lib/identity.mjs",
  "scripts/lib/materialize.mjs",
  "scripts/lib/narrative-lint.mjs",
  "scripts/lib/placeholders.mjs",
  "scripts/lib/representation.mjs",
  "scripts/lib/review-state.mjs",
  "scripts/lib/validator.mjs",
  "schemas/", // a schema change can change what the importers and the projection accept and emit
  "migration/", // the legacy map
  "docs/migration/", // the baseline manifest, its amendments, the reports and the projection manifest
  "tests/historical/",
  "package.json",
  "package-lock.json",
  ".github/workflows/", // the pipeline that runs them
];

export const isHistoricalPath = (path) => HISTORICAL_PATHS.some((p) => (p.endsWith("/") ? path.startsWith(p) : path === p));

/**
 * Decide from the changed paths. `paths` is the output of `git diff --name-only`; null means the diff could not be
 * computed (a new branch, a force push, a shallow clone): fail closed and run.
 * @returns {{ run: boolean, reason: string }}
 */
export function historicalScope({ paths, always = false }) {
  if (always) return { run: true, reason: "always (workflow_dispatch, release or audit)" };
  if (paths === null) return { run: true, reason: "the changed paths could not be determined" };
  const hit = paths.find(isHistoricalPath);
  return hit ? { run: true, reason: `${hit} changed` } : { run: false, reason: `none of ${paths.length} changed path(s) is an importer, projection, parity, schema, legacy-map or shared-generator path` };
}
