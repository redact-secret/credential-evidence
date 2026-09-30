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
import { listJson, repoRoot } from "../../lib/validator.mjs";

export const VOCABULARY_PATH = "scripts/export/legacy-vocabulary.json";

export function loadCanonicalInputs(root = repoRoot) {
  // canonical records (records/) and the legacy map (migration/) are separate inputs: only the exporter's
  // legacy-map module ever reads the second (ADR 0009)
  const recordPaths = listJson(join(root, "records"));
  const mapPaths = listJson(join(root, "migration"));
  const files = [...recordPaths, ...mapPaths];
  const records = [];
  const legacyMaps = [];
  const lines = [];
  for (const file of files) {
    const bytes = readFileSync(file);
    lines.push(`${relative(root, file)} ${createHash("sha256").update(bytes).digest("hex")}`);
    const doc = JSON.parse(bytes.toString("utf8"));
    if (mapPaths.includes(file)) {
      if (doc.kind !== "legacy-map") throw new Error(`${relative(root, file)}: migration/ holds only legacy-map records, found '${doc.kind}'`);
      legacyMaps.push(doc);
    } else {
      if (doc.kind === "legacy-map") throw new Error(`${relative(root, file)}: a legacy-map belongs under migration/, not records/`);
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
