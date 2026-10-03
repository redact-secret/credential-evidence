// Test helper of the historical suite (ADR 0015, #86): a throwaway copy of the repository whose tree IS the import baseline.
//
// The live tree carries the baseline plus whatever a reviewed change declared (amended records, additions, a non-empty
// docs/migration/baseline-amendments/ directory). The mutation tests here ("edit a record and declare it", "delete one and
// expect an undeclared removal", "re-import over a post-import file") need to start from the pristine baseline, whatever
// the live ledger says. Every baseline record is written back byte for byte: from the tree while it still holds them,
// otherwise regenerated from the pinned legacy revision (loadBaselineFiles, which also proves the result equals the
// manifest). Records the baseline does not list are dropped and the ledger (the amendments directory) is removed.
//
// This needs the legacy checkout when the live tree is amended, which is why it belongs to the historical tier: the
// ordinary tier (tests/*.test.mjs) cannot restore bytes it does not have and uses `untouchedRecord` from ../repo-copy.mjs.

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { AMENDMENTS_DIR } from "../../scripts/lib/baseline.mjs";
import { listJson } from "../../scripts/lib/validator.mjs";
import { loadBaselineFiles } from "../../scripts/migrate/lib/baseline-view.mjs";
import { copyRepo } from "../repo-copy.mjs";

let view;

/** @returns {Promise<{ root: string, run: Function, cleanup: Function }>} like copyRepo(), at the baseline with an empty ledger */
export async function copyBaseline({ legacyDir } = {}) {
  view ??= loadBaselineFiles({ legacyDir });
  const { files } = await view;
  const c = copyRepo();
  for (const dir of ["records", "migration"]) {
    for (const f of listJson(join(c.root, dir))) {
      if (!files.has(relative(c.root, f).split("\\").join("/"))) rmSync(f);
    }
  }
  for (const [rel, bytes] of files) {
    mkdirSync(dirname(join(c.root, rel)), { recursive: true });
    writeFileSync(join(c.root, rel), bytes);
  }
  rmSync(join(c.root, AMENDMENTS_DIR), { recursive: true, force: true });
  return c;
}
