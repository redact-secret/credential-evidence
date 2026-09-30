// Child process: run with `node --experimental-strip-types legacy-index-check.mjs <legacyRoot>`,
// JSON { index, corpora: { <path>: corpus } } on stdin. Runs two pieces of legacy
// code from the pinned revision over the projected artifacts and prints the result:
//   - `fixtureIndexProblems` (benchmarks/lib/fixture-index.ts): the index's own
//     consistency check (schema version, identity digest, counts, duplicate slugs);
//   - `validateCorpus` (benchmarks/lib/scoring.ts): the loader every benchmark run
//     applies to a corpus (ids, paths, UTF-8 span boundaries, roles, envelopes, twins).
// Read-only: both modules only hash and validate JSON.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.argv[2];
if (!root) throw new Error("usage: legacy-index-check.mjs <legacyRoot>");
const { fixtureIndexProblems } = await import(pathToFileURL(join(root, "benchmarks/lib/fixture-index.ts")).href);
const { validateCorpus } = await import(pathToFileURL(join(root, "benchmarks/lib/scoring.ts")).href);
const { index, corpora } = JSON.parse(readFileSync(0, "utf8"));
const corpusProblems = {};
for (const [path, corpus] of Object.entries(corpora)) {
  try {
    validateCorpus(corpus);
    corpusProblems[path] = null;
  } catch (e) {
    corpusProblems[path] = String(e.message);
  }
}
process.stdout.write(JSON.stringify({ indexProblems: fixtureIndexProblems(index), corpusProblems }));
