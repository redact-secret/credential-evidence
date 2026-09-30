// Read-only access to the legacy benchmark repository at one pinned commit.
//
// The importer never reads the legacy working tree. It extracts the pinned
// revision with `git archive` into a private temporary directory, so an import
// is reproducible whatever the legacy HEAD is, and the legacy checkout is never
// written to.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(here, "..", "..", "..");

export const LEGACY_REPOSITORY = "redact-secret/redact-secret-benchmarks";
export const LEGACY_REVISION = "ade8a10bd7922765110a68986b0690eb3861f2e5";
export const LEGACY_DIRNAME = "redact-secret-benchmarks";

// Legacy paths that are read. Anything not listed here is not imported.
export const LEGACY_PATHS = {
  taxonomy: "benchmarks/support/taxonomy.json",
  dossierDir: "benchmarks/support/dossiers",
  contractRegistry: "benchmarks/evaluation/domains/credential/assessment.ts",
  beta8Dir: "benchmarks/lib/beta8",
  knownGaps: "benchmarks/known-gaps.json",
  reviewLedger: "benchmarks/review-ledger.json",
  fixtureIndex: "benchmarks/fixture-index.json",
  fixtureSemantics: "benchmarks/fixture-semantics.json",
  fixtureDetectors: "benchmarks/fixture-detectors.json",
  empiricalObservations: "benchmarks/support/empirical-observations.json",
  statusCriteria: "benchmarks/support/status-criteria.json",
  fixtureProfiles: "benchmarks/support/fixture-profiles.json",
  policyQualified: "benchmarks/support/policy-qualified-credentials.json",
  detectors: "benchmarks/detectors.json",
};

/** Resolve the legacy checkout: --legacy arg, then env, then a sibling directory of this repo or any ancestor. */
export function findLegacyDir(explicit) {
  const candidates = [];
  if (explicit) candidates.push(resolve(explicit));
  else if (process.env.LEGACY_BENCHMARKS_DIR) candidates.push(resolve(process.env.LEGACY_BENCHMARKS_DIR));
  else {
    for (let dir = repoRoot; dirname(dir) !== dir; dir = dirname(dir)) candidates.push(join(dirname(dir), LEGACY_DIRNAME));
  }
  const found = candidates.find((c) => existsSync(join(c, ".git")));
  if (!found) {
    throw new Error(
      `legacy repository not found (tried: ${candidates.join(", ")}). Pass --legacy <path> or set LEGACY_BENCHMARKS_DIR to a checkout of ${LEGACY_REPOSITORY}.`,
    );
  }
  return found;
}

/** Extract the pinned revision's read set into a temporary directory. Returns { root, cleanup }. */
export function materializeLegacy(legacyDir, revision = LEGACY_REVISION) {
  try {
    execFileSync("git", ["-C", legacyDir, "cat-file", "-e", `${revision}^{commit}`], { stdio: "ignore" });
  } catch {
    throw new Error(`revision ${revision} is not present in ${legacyDir}; fetch it before importing`);
  }
  const root = mkdtempSync(join(tmpdir(), "legacy-benchmarks-"));
  const archive = spawnSync("git", ["-C", legacyDir, "archive", "--format=tar", revision, "benchmarks", "scanners", "package.json"], {
    maxBuffer: 1 << 30,
  });
  if (archive.status !== 0) throw new Error(`git archive failed: ${archive.stderr}`);
  const untar = spawnSync("tar", ["-x", "-C", root], { input: archive.stdout });
  if (untar.status !== 0) throw new Error(`tar failed: ${untar.stderr}`);
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

export const readLegacyJson = (root, path) => JSON.parse(readFileSync(join(root, path), "utf8"));
export const readLegacyText = (root, path) => readFileSync(join(root, path), "utf8");

/**
 * Evaluate the TypeScript contract registry in a child Node process (type
 * stripping needs a flag) and return plain JSON. Functions are reduced to
 * presence flags; nothing else is interpreted.
 */
export function loadContractRegistry(root) {
  const script = join(here, "extract-contracts.mjs");
  const out = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", script, root],
    { maxBuffer: 1 << 28, encoding: "utf8" },
  );
  if (out.status !== 0) throw new Error(`contract extraction failed: ${out.stderr}`);
  return JSON.parse(out.stdout);
}
