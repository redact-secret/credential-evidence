// Snapshot release bundle (ADR 0011): pure, deterministic construction and verification.
//
// `buildRelease` maps already-loaded inputs (source files, the credential-eval corpus snapshot,
// the fixture materialization) to a set of release assets and a release manifest. It reads no
// clock, no network and no environment: the same inputs give byte-identical output. The caller
// supplies the tag and the git commit; both are recorded, neither is invented.
//
// `verifyRelease` checks a directory of downloaded assets against a manifest (and, optionally,
// a pinned manifest digest). It is what a consumer runs after `gh release download`.

import { createHash } from "node:crypto";

export const RELEASE_MANIFEST_FORMAT = "credential-evidence/release-manifest";
export const RELEASE_MANIFEST_FORMAT_VERSION = 1;
export const BUNDLE_FORMAT = "credential-evidence/records-bundle";
export const BUNDLE_FORMAT_VERSION = 1;
export const GENERATOR = { name: "credential-evidence/release-bundle", version: "1.0.0" };

/** Asset name of the release manifest itself (not listed in its own `files`). */
export const MANIFEST_ASSET = "release-manifest.json";
/** Asset holding the manifest digest as `<hex>  release-manifest.json\n` (sha256sum format). */
export const MANIFEST_DIGEST_ASSET = "release-manifest.json.sha256";

/** Logical paths inside a release. credential-eval reads SNAPSHOT_PATH by this exact name. */
export const BUNDLE_PATH = "records/bundle.json";
export const SNAPSHOT_PATH = "credential-eval/corpus-snapshot.json";
export const FIXTURES_MANIFEST_PATH = "fixtures/materialized-manifest.json";

/** `snapshot-YYYY.MM.DD` for the first release of a UTC day, `.2`, `.3`, ... for later ones. */
export const TAG_PATTERN = /^snapshot-(\d{4})\.(\d{2})\.(\d{2})(?:\.([2-9]|[1-9][0-9]+))?$/;

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const HEX64 = /^[0-9a-f]{64}$/;

/** Returns null for a valid release tag, otherwise the reason it is not one. */
export function tagProblem(tag) {
  if (typeof tag !== "string") return "the tag must be a string";
  const m = TAG_PATTERN.exec(tag);
  if (!m) return `'${tag}' is not snapshot-YYYY.MM.DD or snapshot-YYYY.MM.DD.<n> with n >= 2`;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return `'${tag}' does not name a calendar date`;
  return null;
}

/** The UTC date part of a tag as `YYYY.MM.DD`. */
export const tagDate = (tag) => TAG_PATTERN.exec(tag)?.slice(1, 4).join(".") ?? null;

/** Release asset name of a logical path: `/` becomes `-`. Asset names are flat on GitHub releases. */
export const assetName = (path) => path.replaceAll("/", "-");

/** Digest of a records tree: sha256 over the sorted `<path> <sha256-hex>` lines (scripts/export/lib/source.mjs). */
export function treeDigest(entries) {
  return sha256(entries.map((e) => `${e.path} ${e.sha256}`).sort().join("\n"));
}

/**
 * @param {object} input
 * @param {string} input.tag               release tag (ADR 0011 grammar)
 * @param {string} input.commit            40-hex git commit the release is built from
 * @param {string} input.schemaRevision    `x-schemaRevision` of schemas/v1
 * @param {{path: string, bytes: Buffer}[]} input.sourceFiles  every file the records-tree digest covers; files under
 *                                         records/ are shipped in full, the rest (the legacy map and the exporter
 *                                         vocabulary, compatibility inputs) by path and digest only
 * @param {string} input.sourceDigest      the records-tree digest the exporter computed (must match sourceFiles)
 * @param {{path: string, bytes: Buffer}[]} input.schemaFiles  schemas/**, shipped in the bundle for offline validation
 * @param {string} input.snapshotText      credential-eval/corpus-snapshot.json, byte for byte as the exporter writes it
 * @param {{manifestText: string, digest: string, count: number}} input.fixtures  the fixture materialization
 * @returns {{assets: Map<string, Buffer>, manifest: object, manifestText: string, manifestDigest: string}}
 */
export function buildRelease({ tag, commit, schemaRevision, sourceFiles, sourceDigest, schemaFiles, snapshotText, fixtures }) {
  const problem = tagProblem(tag);
  if (problem) throw new Error(problem);
  if (!/^[0-9a-f]{40}$/.test(commit ?? "")) throw new Error(`commit must be a 40-hex git commit id, got '${commit}'`);
  if (!/^\d+\.\d+\.\d+$/.test(schemaRevision ?? "")) throw new Error(`schema revision must be major.minor.patch, got '${schemaRevision}'`);
  if (!HEX64.test(fixtures?.digest ?? "")) throw new Error("fixture materialization digest must be 64 hex");

  const describe = (list) =>
    list
      .map(({ path, bytes }) => ({ path, sha256: sha256(bytes), bytes: bytes.length, text: bytes.toString("utf8") }))
      .sort((a, b) => cmp(a.path, b.path));
  const source = describe(sourceFiles);
  const recomputed = treeDigest(source);
  if (recomputed !== sourceDigest) throw new Error(`records-tree digest of the bundled files (${recomputed}) differs from the exporter's (${sourceDigest})`);
  const recordsTree = { kind: "records-tree-sha256", digest: sourceDigest };

  const snapshot = JSON.parse(snapshotText);
  if (snapshot?.identity?.revision !== `records-tree-sha256:${sourceDigest}`) throw new Error("the corpus snapshot was not built from these records (identity.revision differs)");
  if (snapshot.identity.release !== undefined) throw new Error("the corpus snapshot must not declare identity.release; only credential-eval writes it");

  const isRecord = (e) => e.path.startsWith("records/");
  const bundle = {
    format: BUNDLE_FORMAT,
    formatVersion: BUNDLE_FORMAT_VERSION,
    note: "Canonical records and schemas at the source commit, byte for byte (`text`). Compatibility inputs (legacy map, exporter vocabulary) are listed by digest only; records-tree-sha256 is recomputable from `records` plus `compatibilityInputs`.",
    sourceRevision: { commit, recordsTree },
    schemaRevision,
    records: source.filter(isRecord),
    compatibilityInputs: source.filter((e) => !isRecord(e)).map(({ path, sha256: digest, bytes }) => ({ path, sha256: digest, bytes })),
    schemas: describe(schemaFiles),
  };

  const contents = new Map([
    [BUNDLE_PATH, Buffer.from(`${JSON.stringify(bundle)}\n`)],
    [SNAPSHOT_PATH, Buffer.from(snapshotText)],
    [FIXTURES_MANIFEST_PATH, Buffer.from(fixtures.manifestText)],
  ]);
  const files = [...contents]
    .sort((a, b) => cmp(a[0], b[0]))
    .map(([path, bytes]) => ({ path, asset: assetName(path), bytes: bytes.length, sha256: sha256(bytes) }));
  const names = new Set(files.map((f) => f.asset));
  if (names.size !== files.length || names.has(MANIFEST_ASSET) || names.has(MANIFEST_DIGEST_ASSET)) throw new Error("release asset names collide");

  const manifest = {
    format: RELEASE_MANIFEST_FORMAT,
    formatVersion: RELEASE_MANIFEST_FORMAT_VERSION,
    tag,
    sourceRevision: { commit, recordsTree },
    schemaRevision,
    generator: GENERATOR,
    fixtures: {
      count: fixtures.count,
      digest: fixtures.digest,
      rule: `npm ci && npm run fixtures:materialize at commit ${commit}; the tree's manifest.json equals ${FIXTURES_MANIFEST_PATH} and its digest equals fixtures.digest`,
    },
    filesDigest: sha256(files.map((f) => `${f.path} ${f.sha256}`).join("\n")),
    files,
  };
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  const manifestDigest = sha256(manifestText);
  const assets = new Map(files.map((f) => [f.asset, contents.get(f.path)]));
  assets.set(MANIFEST_ASSET, Buffer.from(manifestText));
  assets.set(MANIFEST_DIGEST_ASSET, Buffer.from(`${manifestDigest}  ${MANIFEST_ASSET}\n`));
  return { assets, manifest, manifestText, manifestDigest };
}

/**
 * Verify downloaded assets. `read(name)` returns the asset's bytes or null when absent.
 * @param {{read: (name: string) => Buffer|null, tag?: string, manifestDigest?: string}} options
 * @returns {{problems: string[], manifest: object|null, manifestDigest: string|null}}
 */
export function verifyRelease({ read, tag, manifestDigest }) {
  const problems = [];
  const manifestBytes = read(MANIFEST_ASSET);
  if (!manifestBytes) return { problems: [`missing ${MANIFEST_ASSET}`], manifest: null, manifestDigest: null };
  const actual = sha256(manifestBytes);
  if (manifestDigest !== undefined) {
    const pinned = manifestDigest.replace(/^sha256:/, "");
    if (!HEX64.test(pinned)) problems.push("the pinned manifest digest is not 64 hex");
    else if (pinned !== actual) problems.push(`manifest digest ${actual} differs from the pinned ${pinned}`);
  }
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString("utf8"));
  } catch {
    return { problems: [...problems, `${MANIFEST_ASSET} is not JSON`], manifest: null, manifestDigest: actual };
  }
  if (manifest.format !== RELEASE_MANIFEST_FORMAT) problems.push(`unexpected manifest format ${JSON.stringify(manifest.format)}`);
  if (tag !== undefined && manifest.tag !== tag) problems.push(`manifest is for tag ${JSON.stringify(manifest.tag)}, not ${JSON.stringify(tag)}`);
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  if (!files.length) problems.push("manifest lists no files");
  if (files.filter((f) => f.path === SNAPSHOT_PATH).length !== 1) problems.push(`manifest must list ${SNAPSHOT_PATH} exactly once`);
  if (sha256(files.map((f) => `${f.path} ${f.sha256}`).join("\n")) !== manifest.filesDigest) problems.push("filesDigest does not match the files list");
  for (const f of files) {
    const bytes = read(f.asset);
    if (!bytes) problems.push(`missing asset ${f.asset} (${f.path})`);
    else if (sha256(bytes) !== f.sha256 || bytes.length !== f.bytes) problems.push(`asset ${f.asset} (${f.path}) does not match its sha256`);
  }
  const digestFile = read(MANIFEST_DIGEST_ASSET);
  if (digestFile && digestFile.toString("utf8").split(/\s+/)[0] !== actual) problems.push(`${MANIFEST_DIGEST_ASSET} does not match ${MANIFEST_ASSET}`);
  return { problems, manifest, manifestDigest: actual };
}
