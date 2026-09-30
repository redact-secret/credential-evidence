// Loads the legacy benchmark inputs at the pinned revision as plain parsed JSON,
// in the same document shapes the exporter produces.
//
// Read-only: the legacy revision is extracted with `git archive` into a temporary
// directory (scripts/migrate/lib/legacy-source.mjs) and the legacy fixture
// generators are run over that extraction, exactly as the importers do.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { LEGACY_PATHS, LEGACY_REVISION, findLegacyDir, loadGeneratedCorpora, materializeLegacy, readLegacyJson } from "../../migrate/lib/legacy-source.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export const EXTRACT_PATHS = ["benchmarks", "scanners", "fixtures", "schemas", "scripts", "tests", "src", "corpora", "baselines", "package.json"];

export { LEGACY_REVISION, findLegacyDir };

export function openLegacy(legacyArg) {
  const dir = findLegacyDir(legacyArg);
  return materializeLegacy(dir, LEGACY_REVISION, EXTRACT_PATHS);
}

export function parseDossierFrontmatter(root) {
  const dir = join(root, LEGACY_PATHS.dossierDir);
  const providers = {};
  const excluded = [];
  let proseBytes = 0;
  for (const name of readdirSync(dir).sort(cmp)) {
    if (!name.endsWith(".md")) continue;
    const text = readFileSync(join(dir, name), "utf8");
    if (name === "README.md" || name.startsWith("_")) {
      excluded.push(name);
      continue;
    }
    const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
    if (!m) throw new Error(`${name}: no YAML frontmatter`);
    const front = YAML.parse(m[1]);
    proseBytes += Buffer.byteLength(m[2]);
    providers[front.provider] = { provider: front.provider, families: front.families };
  }
  return { doc: { schemaVersion: 1, providers }, excluded, proseBytes };
}

/** All legacy documents the exporter has a counterpart for, keyed by an id. */
export function loadLegacyDocs(root) {
  const docs = new Map();
  const add = (id, artifact, file, doc) => docs.set(id, { id, artifact, file, doc });
  add("taxonomy", "taxonomy", LEGACY_PATHS.taxonomy, readLegacyJson(root, LEGACY_PATHS.taxonomy));
  const dossiers = parseDossierFrontmatter(root);
  add("dossier-frontmatter", "dossiers", `${LEGACY_PATHS.dossierDir}/*.md (frontmatter)`, dossiers.doc);
  add("scenarios", "scenarios", LEGACY_PATHS.scenarios, readLegacyJson(root, LEGACY_PATHS.scenarios));
  const categories = readLegacyJson(root, LEGACY_PATHS.categories);
  add("categories", "categories", LEGACY_PATHS.categories, categories);
  add("fixture-semantics", "semantics", LEGACY_PATHS.fixtureSemantics, readLegacyJson(root, LEGACY_PATHS.fixtureSemantics));
  add("fixture-index", "index", LEGACY_PATHS.fixtureIndex, readLegacyJson(root, LEGACY_PATHS.fixtureIndex));

  const generated = loadGeneratedCorpora(root);
  for (const [id, r] of Object.entries(generated.reproduction)) if (!r.matches) throw new Error(`generated corpus '${id}' does not reproduce the legacy hash manifest`);
  for (const cat of categories) {
    if (cat.calibrationOnly) continue;
    const doc = generated.corpora[cat.id] ?? readLegacyJson(root, cat.corpus);
    add(`corpus:${cat.corpus}`, "corpus", cat.corpus, doc);
  }
  return { docs, dossiers, generated, categories };
}

// ---------------------------------------------------------------- consumers

const CODE = /\.(ts|tsx|mjs|js|cjs)$/;
function* walk(dir) {
  for (const name of readdirSync(dir).sort(cmp)) {
    if (name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (CODE.test(name)) yield p;
  }
}

/** Source files of the extracted legacy tree that name `needle` literally. Sorted, relative to the tree. */
export function consumersOf(root, needles) {
  const files = [];
  for (const top of ["benchmarks", "scripts", "tests", "src", "scanners"]) {
    const dir = join(root, top);
    if (existsSync(dir)) for (const f of walk(dir)) files.push(f);
  }
  // A needle matches only at a name boundary, so "detectors.json" does not match "fixture-detectors.json".
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, (c) => `\\${c}`);
  const res = needles.map((n) => new RegExp(`(?<![\\w-])${escape(n)}`));
  const hits = new Set();
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    if (res.some((re) => re.test(text))) hits.add(relative(root, f));
  }
  return [...hits].sort(cmp);
}

export function entryCount(root, path) {
  const abs = join(root, path);
  if (!existsSync(abs) || statSync(abs).isDirectory()) return null;
  if (!path.endsWith(".json")) return null;
  const v = JSON.parse(readFileSync(abs, "utf8"));
  if (Array.isArray(v)) return v.length;
  for (const k of ["fixtures", "issues", "entries", "families", "detectors", "scenarios"]) if (v && typeof v === "object" && k in v) return Array.isArray(v[k]) ? v[k].length : Object.keys(v[k]).length;
  return v && typeof v === "object" ? Object.keys(v).length : null;
}

export function sizeOf(root, path) {
  const abs = join(root, path);
  if (!existsSync(abs)) return null;
  const st = statSync(abs);
  return st.isDirectory() ? null : st.size;
}

/** Run the legacy fixtureIndexProblems and validateCorpus over projected artifacts (child process; needs type stripping). */
export function runLegacyChecks(root, index, corpora) {
  const script = join(here, "legacy-index-check.mjs");
  const out = spawnSync(process.execPath, ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", script, root], { input: JSON.stringify({ index, corpora }), encoding: "utf8", maxBuffer: 1 << 28 });
  if (out.status !== 0) throw new Error(`legacy consumer check failed: ${out.stderr}`);
  return JSON.parse(out.stdout);
}
