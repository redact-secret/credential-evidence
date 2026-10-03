// The baseline records as the historical checks read them (ADR 0015).
//
// `loadBaselineFiles` returns the records and legacy-map files of the import baseline: the exact bytes
// the importers produced at the pinned legacy revision, whatever canonical research changes the working
// tree carries.
//
//   fast path   the tree still holds every baseline record unchanged: read the manifest's records from
//               the tree, verified by digest (no legacy checkout needed)
//   regenerate  a baseline record was amended or removed, or `regenerate` is set: rebuild the baseline
//               from the pinned legacy revision with the importers and require it to equal the manifest
//               byte for byte (needs the legacy checkout; reads it by git archive at the pin only)
//
// Either way the result equals the manifest, so a projection or parity run over it answers "does the
// baseline still project to the pinned legacy files", not "does today's tree".

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { classifyTree, compareWithManifest, isAmendable, loadManifest, OWNERS, sha256, walkOrder } from "../../lib/baseline.mjs";
import { buildBaseline } from "./baseline-build.mjs";
import { findLegacyDir, repoRoot } from "./legacy-source.mjs";

const isRecordFile = (p) => p.startsWith("records/") || p.startsWith("migration/");

const sortedByPath = (files) => new Map([...files].sort(([a], [b]) => walkOrder(a, b)));

/** Every difference between a regenerated baseline and the manifest, across the three importers. */
export function reproductionProblems(files, owners, manifest) {
  const problems = [];
  for (const owner of OWNERS) {
    const slice = new Map([...files].filter(([p]) => owners.get(p) === owner));
    problems.push(...compareWithManifest(slice, manifest, owner));
  }
  return problems;
}

/**
 * @param {{ root?: string, legacyDir?: string, regenerate?: boolean }} opts
 * @returns {Promise<{ files: Map<string, Buffer>, source: "tree" | "regenerated", digest: string }>}
 *   `files` holds records/** and migration/legacy-map/** only (importer reports are not inputs of the projection)
 */
export async function loadBaselineFiles({ root = repoRoot, legacyDir, regenerate = false } = {}) {
  const manifest = loadManifest(root);
  if (!manifest) throw new Error("docs/migration/baseline-manifest.json is missing; run the importers");
  if (!regenerate) {
    const c = classifyTree(root);
    const touched = [...c.edited, ...c.removed].some(isAmendable);
    if (!touched) {
      const files = new Map();
      for (const f of manifest.files) {
        if (!isRecordFile(f.path)) continue;
        const bytes = readFileSync(join(root, f.path));
        if (sha256(bytes) !== f.sha256) throw new Error(`${f.path} differs from the baseline manifest`);
        files.set(f.path, bytes);
      }
      return { files: sortedByPath(files), source: "tree", digest: manifest.baselineDigest };
    }
  }
  const { files: generated, owners } = await buildBaseline({ legacyDir: findLegacyDir(legacyDir) });
  const problems = reproductionProblems(generated, owners, manifest);
  if (problems.length) throw new Error(`the baseline is not reproducible at the pin (${problems.length} difference(s)), e.g.\n${problems.slice(0, 5).join("\n")}`);
  const files = new Map();
  for (const [p, text] of generated) if (isRecordFile(p)) files.set(p, Buffer.from(text));
  return { files: sortedByPath(files), source: "regenerated", digest: manifest.baselineDigest };
}
