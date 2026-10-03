#!/usr/bin/env node
// npm run export:legacy            write the legacy-compatible projection to dist/legacy-projection/
//                                  and the manifest to docs/migration/legacy-projection-manifest.json
// npm run export:legacy -- --check regenerate in memory and compare: the committed manifest, and the
//                                  output directory if it exists. Exit 1 on any difference.
//
// Options: --out <dir>  output directory (default dist/legacy-projection; dist/ is gitignored)
//
// Only the manifest is committed. The artifacts are derived, large (about 14 MB) and
// reproducible byte for byte from the import baseline; see docs/decisions/0006 and 0015. The projection
// is the historical compatibility view: it reads the baseline (the importers' output at the pin), not the
// working tree, so canonical records added or amended after the import do not enter it. The current evidence
// snapshot of the whole tree is built by the release bundle (scripts/release/build.mjs).

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { repoRoot } from "../lib/validator.mjs";
import { loadBaselineFiles } from "../migrate/lib/baseline-view.mjs";
import { buildProjection } from "./lib/projection.mjs";
import { loadCanonicalInputs } from "./lib/source.mjs";

export const MANIFEST_PATH = "docs/migration/legacy-projection-manifest.json";
export const DEFAULT_OUT = "dist/legacy-projection";

function walk(dir) {
  const found = [];
  const rec = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) rec(p);
      else found.push(relative(dir, p));
    }
  };
  if (existsSync(dir)) rec(dir);
  return found;
}

/** Project the given inputs (default: the working tree, which only works while every fixture has a legacy name). */
export function generate(inputs = loadCanonicalInputs()) {
  return { inputs, projection: buildProjection(inputs) };
}

/**
 * The inputs of the historical projection: the import baseline (ADR 0015), not the working tree.
 * Read from the tree while it still holds every baseline record unchanged, regenerated from the pinned
 * legacy revision otherwise (then `legacyDir` or LEGACY_BENCHMARKS_DIR is needed).
 */
export async function loadBaselineInputs({ legacyDir, regenerate = false } = {}) {
  const view = await loadBaselineFiles({ legacyDir, regenerate });
  return Object.assign(loadCanonicalInputs(repoRoot, { baselineFiles: view.files }), { baselineSource: view.source });
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const oi = args.indexOf("--out");
  const outArg = oi >= 0 ? args[oi + 1] : undefined;
  const li = args.indexOf("--legacy");
  const legacyArg = li >= 0 ? args[li + 1] : undefined;
  for (const a of args) if (!["--check", "--out", "--legacy"].includes(a) && a !== outArg && a !== legacyArg) {
    console.error(`unknown argument: ${a}`);
    process.exit(2);
  }
  const out = resolve(repoRoot, outArg ?? DEFAULT_OUT);
  const { projection } = generate(await loadBaselineInputs({ legacyDir: legacyArg }));
  const { artifacts, manifestText, manifest } = projection;
  const manifestFile = join(repoRoot, MANIFEST_PATH);
  const committed = existsSync(manifestFile) ? readFileSync(manifestFile, "utf8") : null;

  if (check) {
    const problems = [];
    if (committed === null) problems.push(`missing: ${MANIFEST_PATH}`);
    else if (committed !== manifestText) problems.push(`differs: ${MANIFEST_PATH} (source revision ${manifest.sourceRevision.digest.slice(0, 12)})`);
    if (existsSync(out)) {
      const present = new Set(walk(out));
      for (const [path, text] of artifacts) {
        if (!present.has(path)) problems.push(`missing in ${relative(repoRoot, out)}: ${path}`);
        else if (readFileSync(join(out, path), "utf8") !== text) problems.push(`differs in ${relative(repoRoot, out)}: ${path}`);
      }
      for (const p of present) if (!artifacts.has(p) && p !== "provenance-manifest.json") problems.push(`stale in ${relative(repoRoot, out)}: ${p}`);
      if (present.has("provenance-manifest.json") && readFileSync(join(out, "provenance-manifest.json"), "utf8") !== manifestText) problems.push(`differs in ${relative(repoRoot, out)}: provenance-manifest.json`);
    }
    if (problems.length) {
      for (const p of problems.slice(0, 25)) console.error(p);
      console.error(`\nFAIL: the projection differs from the committed manifest or output in ${problems.length} place(s); run npm run export:legacy`);
      process.exit(1);
    }
    console.log(`OK: ${artifacts.size} artifact(s) match the manifest (source ${manifest.sourceRevision.digest.slice(0, 12)}, schema ${manifest.schemaRevision}, projection ${manifest.projectionDigest.slice(0, 12)})${existsSync(out) ? ` and ${relative(repoRoot, out)}` : ""}`);
    return;
  }

  rmSync(out, { recursive: true, force: true });
  for (const [path, text] of artifacts) {
    const abs = join(out, path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, text);
  }
  writeFileSync(join(out, "provenance-manifest.json"), manifestText);
  mkdirSync(dirname(manifestFile), { recursive: true });
  writeFileSync(manifestFile, manifestText);
  console.log(`wrote ${artifacts.size} artifact(s) to ${relative(repoRoot, out)} and ${MANIFEST_PATH} (source ${manifest.sourceRevision.digest.slice(0, 12)}, projection ${manifest.projectionDigest.slice(0, 12)})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
