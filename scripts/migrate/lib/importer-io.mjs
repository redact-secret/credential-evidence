// Shared write and check behaviour of the three importers (ADR 0015).
//
//   check  the regenerated files must be exactly the importer's slice of docs/migration/baseline-manifest.json.
//          The working tree is not read: edits and additions made after the import are the business of
//          `npm run baseline:check`, which classifies them against the same manifest.
//   write  regenerates the baseline files in the tree and the importer's slice of the manifest. It refuses
//          when baseline amendments are declared (a re-import would overwrite reviewed edits: revert or
//          re-apply them first) and when a generated path collides with a different file that is not part of
//          the baseline (a post-import addition). It never deletes a file that is not in the baseline.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, rmdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { AMENDMENTS_DIR, compareWithManifest, loadAmendments, loadManifest, MANIFEST_PATH, updateManifestOwner } from "../../lib/baseline.mjs";
import { LEGACY_REPOSITORY, LEGACY_REVISION, repoRoot } from "./legacy-source.mjs";

function pruneEmptyDirs(dir) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) pruneEmptyDirs(p);
  }
  if (!readdirSync(dir).length) rmdirSync(dir);
}

export function checkImporter({ owner, command, generated, okLine }) {
  const manifest = loadManifest();
  if (!manifest) {
    console.error(`missing: ${MANIFEST_PATH}\n\nFAIL: no baseline manifest; run npm run ${command}`);
    process.exit(1);
  }
  const problems = compareWithManifest(generated, manifest, owner);
  if (problems.length) {
    for (const p of problems.slice(0, 25)) console.error(p);
    if (problems.length > 25) console.error(`... and ${problems.length - 25} more`);
    console.error(`\nFAIL: the import at ${LEGACY_REVISION.slice(0, 12)} does not reproduce the baseline manifest in ${problems.length} file(s); the importer, its authored input or the pin changed. Re-pin with npm run ${command} (ADR 0015), or revert.`);
    process.exit(1);
  }
  console.log(`OK: ${generated.size} generated file(s) reproduce the baseline manifest (${okLine}, legacy ${LEGACY_REVISION.slice(0, 12)})`);
}

export function writeImporter({ owner, generated, ownedDirs, summary }) {
  const { amendments } = loadAmendments();
  if (amendments.length) {
    console.error(`refusing to regenerate: ${AMENDMENTS_DIR}/ declares ${amendments.length} amendment(s) that a re-import would overwrite.\nRevert the amended records to the baseline (or re-apply them as new authored records), delete the declaration files in ${AMENDMENTS_DIR}/, then re-import (ADR 0015).`);
    process.exit(1);
  }
  const manifest = loadManifest();
  const inBaseline = new Set((manifest?.files ?? []).map((f) => f.path));
  const collisions = [];
  for (const [rel, text] of generated) {
    const abs = join(repoRoot, rel);
    if (existsSync(abs) && !inBaseline.has(rel) && readFileSync(abs, "utf8") !== text) collisions.push(rel);
  }
  if (collisions.length) {
    for (const c of collisions.slice(0, 25)) console.error(`collides with a post-import file: ${c}`);
    console.error("\nrefusing to overwrite files that are not part of the baseline");
    process.exit(1);
  }
  let wrote = 0;
  for (const [rel, text] of generated) {
    const abs = join(repoRoot, rel);
    if (existsSync(abs) && readFileSync(abs, "utf8") === text) continue;
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, text);
    wrote++;
  }
  const stale = (manifest?.files ?? []).filter((f) => f.owner === owner && !generated.has(f.path) && existsSync(join(repoRoot, f.path)));
  for (const f of stale) rmSync(join(repoRoot, f.path));
  for (const d of ownedDirs) pruneEmptyDirs(join(repoRoot, d));
  updateManifestOwner({ owner, generated, legacy: { repository: LEGACY_REPOSITORY, revision: LEGACY_REVISION } });
  console.log(`wrote ${wrote} file(s), removed ${stale.length} stale; ${generated.size} generated file(s) total (${summary}, legacy ${LEGACY_REVISION.slice(0, 12)}); baseline manifest updated`);
}
