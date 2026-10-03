// Reads the canonical inputs of the legacy projection: the records tree, the
// consumer vocabulary and the schema revision. Also computes the source revision
// the projection is stamped with.
//
// The source revision is a tree digest, not a git commit: a commit id cannot be
// recorded in a file committed in that same commit, and a digest of the exact bytes
// read is stronger evidence of what the projection was built from. It covers every
// `records/**/*.json` and `migration/**/*.json` file (the legacy map names the suites and
// fixtures the projection speaks) and the vocabulary file.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { walkOrder } from "../../lib/baseline.mjs";
import { listJson, repoRoot } from "../../lib/validator.mjs";

export const VOCABULARY_PATH = "scripts/export/legacy-vocabulary.json";

/**
 * @param {string} root  repository root (the schemas and the vocabulary are always read from it)
 * @param {{ baselineFiles?: Map<string, Buffer> }} [opts]  when given, the records and legacy-map files come from this
 *   map (the import baseline, scripts/migrate/lib/baseline-view.mjs) instead of from the tree. The result has the same
 *   shape and the same source digest algorithm either way.
 */
export function loadCanonicalInputs(root = repoRoot, { baselineFiles } = {}) {
  // canonical records (records/) and the legacy map (migration/) are separate inputs: only the exporter's
  // legacy-map module ever reads the second (ADR 0009)
  const files = baselineFiles
    ? [...baselineFiles.keys()].sort(walkOrder).map((rel) => ({ rel, bytes: baselineFiles.get(rel) }))
    : [...listJson(join(root, "records")), ...listJson(join(root, "migration"))].map((file) => ({ rel: relative(root, file).split("\\").join("/"), bytes: readFileSync(file) }));
  const records = [];
  const legacyMaps = [];
  const lines = [];
  for (const { rel, bytes } of files) {
    lines.push(`${rel} ${createHash("sha256").update(bytes).digest("hex")}`);
    const doc = JSON.parse(Buffer.from(bytes).toString("utf8"));
    if (rel.startsWith("migration/")) {
      if (doc.kind !== "legacy-map") throw new Error(`${rel}: migration/ holds only legacy-map records, found '${doc.kind}'`);
      legacyMaps.push(doc);
    } else {
      if (doc.kind === "legacy-map") throw new Error(`${rel}: a legacy-map belongs under migration/, not records/`);
      records.push(doc);
    }
  }
  const vocabBytes = readFileSync(join(root, VOCABULARY_PATH));
  lines.push(`${VOCABULARY_PATH} ${createHash("sha256").update(vocabBytes).digest("hex")}`);
  const common = JSON.parse(readFileSync(join(root, "schemas", "v1", "common.schema.json"), "utf8"));
  return {
    records,
    legacyMaps,
    vocabulary: JSON.parse(vocabBytes.toString("utf8")),
    sourceDigest: createHash("sha256").update(lines.sort().join("\n")).digest("hex"),
    schemaRevision: common["x-schemaRevision"],
    recordFiles: files.length,
  };
}
