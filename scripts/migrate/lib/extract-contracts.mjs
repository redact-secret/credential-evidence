// Child process: run with `node --experimental-strip-types extract-contracts.mjs <legacyRoot>`.
// Loads the legacy TypeScript contract registry from an extracted revision and
// prints it as JSON, sorted by contract id, with the defining legacy file of
// every contract. Read-only; no legacy code is modified or executed beyond the
// module's own top-level evaluation.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.argv[2];
if (!root) throw new Error("usage: extract-contracts.mjs <legacyRoot>");

const assessment = await import(pathToFileURL(join(root, "benchmarks/evaluation/domains/credential/assessment.ts")));
const beta8 = await import(pathToFileURL(join(root, "benchmarks/lib/beta8/index.ts")));

// BETA8_MODULES is `[i207, i208, ...]` over `import * as i207 from './207.ts'`;
// several modules share one issue number, so the file comes from the import list.
const indexSource = readFileSync(join(root, "benchmarks/lib/beta8/index.ts"), "utf8");
const importFile = new Map([...indexSource.matchAll(/import \* as (\w+) from '\.\/([\w-]+)\.ts'/g)].map((m) => [m[1], m[2]]));
const listed = /export const BETA8_MODULES = \[([^\]]+)\]/.exec(indexSource)[1].split(",").map((s) => s.trim());
if (listed.length !== beta8.BETA8_MODULES.length) throw new Error("BETA8_MODULES parse mismatch");

const origin = new Map();
for (const [i, mod] of beta8.BETA8_MODULES.entries()) {
  const file = `benchmarks/lib/beta8/${importFile.get(listed[i])}.ts`;
  if (!existsSync(join(root, file))) throw new Error(`beta8 module file missing: ${file}`);
  for (const id of Object.keys(mod.contracts ?? {})) origin.set(id, file);
  for (const id of Object.keys(mod.registryContracts ?? {})) origin.set(id, file);
}
const registryFile = "benchmarks/evaluation/domains/credential/assessment.ts";

const plain = (contract) => {
  const out = {};
  for (const key of Object.keys(contract).sort()) {
    const value = contract[key];
    out[key] = typeof value === "function" ? true : value;
  }
  return out;
};

const contracts = {};
for (const id of Object.keys(assessment.contracts).sort()) {
  contracts[id] = { file: origin.get(id) ?? registryFile, contract: plain(assessment.contracts[id]) };
}
const arrivalFamilies = beta8.arrivalFamilies
  .map((a) => ({ id: a.id, taxonomy: a.taxonomy, issue: String(a.issue), reasonLength: a.reason.length }))
  .sort((a, b) => (a.id < b.id ? -1 : 1));

process.stdout.write(JSON.stringify({ contracts, arrivalFamilies }));
