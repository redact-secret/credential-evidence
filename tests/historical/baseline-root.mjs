// Test helper of the historical suite (ADR 0015): the import baseline as a directory.
//
// The tests in this directory assert the imported set (record counts, tree shape, provenance, projection,
// parity, importer idempotence). They must keep asserting it after canonical research changes have been
// added to or amended in the working tree, so they read the baseline, not the tree: the baseline records
// are written to a temporary root (`<root>/records`, `<root>/migration`) and the tests point at that.
// While the tree is unamended the files come straight from the tree (verified by digest against
// docs/migration/baseline-manifest.json); otherwise they are regenerated from the pinned legacy revision.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { loadBaselineFiles } from "../../scripts/migrate/lib/baseline-view.mjs";

let cached;

/** @returns {Promise<{ root: string, source: "tree" | "regenerated", files: Map<string, Buffer> }>} */
export function baseline() {
  cached ??= (async () => {
    const view = await loadBaselineFiles();
    const root = mkdtempSync(join(tmpdir(), "baseline-root-"));
    for (const [rel, bytes] of view.files) {
      const abs = join(root, rel);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, bytes);
    }
    process.on("exit", () => rmSync(root, { recursive: true, force: true }));
    return { root, source: view.source, files: view.files };
  })();
  return cached;
}
