// Child process: run the legacy fixture generators over an extracted legacy
// revision and print JSON { corpora, reproduction } to stdout.
//
// Runs under `node --experimental-strip-types` because the generators import
// TypeScript modules. The reproduction check recomputes each corpus's SHA-256
// exactly as the legacy `fixtures:generate` command does and compares it with the
// committed hash manifest, so an import can never silently use drifted output.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.argv[2];
if (!root) throw new Error("usage: extract-fixtures.mjs <legacy-root>");

const { buildCorpora } = await import(pathToFileURL(join(root, "fixtures/generated/build.mjs")).href);
const manifest = JSON.parse(readFileSync(join(root, "benchmarks/generated-corpora.json"), "utf8"));
const corpora = buildCorpora();

const reproduction = {};
for (const id of Object.keys(corpora).sort()) {
  const serialized = `${JSON.stringify(corpora[id], null, 2)}\n`;
  const sha256 = createHash("sha256").update(serialized).digest("hex");
  reproduction[id] = { sha256, matches: manifest[id]?.sha256 === sha256, fixtures: corpora[id].fixtures.length };
}
for (const id of Object.keys(manifest)) if (!(id in corpora)) reproduction[id] = { sha256: null, matches: false, fixtures: 0 };

process.stdout.write(JSON.stringify({ corpora, reproduction }));
