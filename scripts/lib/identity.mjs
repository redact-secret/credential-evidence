// Identity lint (ADR 0007): canonical ids and record file paths must not carry
// migration coordinates. Pure and deterministic; reads nothing but its input and
// the baseline file.
//
// Scope: the ids and repository-relative file paths of scenario, case,
// fixture-plan and fixture-set records (plus the fixture ids inside a set).
// Legacy names are allowed in provenance fields (externalRefs, `imported`,
// migration/legacy-map.json), which this lint never reads.
//
// Baseline: stage A of #12 lands the rule before stage B renames the imported
// records, so the records that violate today are listed in
// scripts/lint/identity-baseline.json. The baseline may only shrink: a new
// violation, a violation with more codes than baselined, or a baselined record
// that no longer violates (fixed, renamed, deleted) all fail.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const IDENTITY_KINDS = ["scenario", "case", "fixture-plan", "fixture-set"];
export const BASELINE_PATH = join(repoRoot, "scripts", "lint", "identity-baseline.json");
export const TRACKING = "https://github.com/redact-secret/credential-evidence/issues/12";

// Suite names of the legacy benchmark at its pinned revision that are not
// beta/milestone coordinates (ADR 0005 lists the 67 suites). Static on purpose:
// the rule must outlive the records that currently carry these names.
export const LEGACY_SUITE_NAMES = [
  "accuracy",
  "common-formats",
  "context-edges",
  "credential-formats",
  "detector-coverage",
  "milestone-6-closed",
  "negative-controls",
  "policy-qualified-credentials",
  "real-world-shapes",
  "reference-syntax",
  "sendgrid-regressions",
  "token-contexts",
];

const B = "(?<![a-z0-9])"; // token start: not preceded by a letter or digit
const PATTERNS = [
  ["beta-coordinate", new RegExp(`${B}beta-?\\d+`)],
  ["milestone-coordinate", new RegExp(`${B}milestone-?\\d+`)],
  ["issue-coordinate", new RegExp(`${B}(issue|pr|gh)-?\\d+(?![a-z0-9])`)],
  ["repository-issue-coordinate", new RegExp(`${B}redact-secret-\\d+`)],
  ["release-coordinate", new RegExp(`${B}(rc\\d+|release-?\\d+)(?![a-z0-9])`)],
  ["detector-identifier", new RegExp(`${B}detectors?(?![a-z0-9])`)],
  ["scanner-name", new RegExp(`${B}(trufflehog|gitleaks|kingfisher|detect-secrets|ggshield|semgrep|noseyparker|secretlint)(?![a-z0-9])`)],
];

const startsWithName = (text, name) => text === name || text.startsWith(`${name}-`);

function codesForText(text, { segments }) {
  const codes = new Set();
  for (const [code, re] of PATTERNS) if (re.test(text)) codes.add(code);
  for (const name of LEGACY_SUITE_NAMES) {
    const parts = segments ? text.split("/") : [text];
    if (parts.some((p) => startsWithName(p, name))) codes.add("legacy-suite-name");
  }
  return codes;
}

/** Path text to lint: lowercase, without the `.json` suffix or a `<kind>.` filename prefix. */
function pathText(path) {
  return path
    .toLowerCase()
    .replace(/\.json$/, "")
    .split("/")
    .map((seg) => seg.replace(/^(scenario|case|fixture-plan|fixture-set|fixture|contract|family|source)\./, ""))
    .join("/");
}

/** Sorted, de-duplicated violation codes for one record at `path`; [] when clean or out of scope. */
export function identityViolations(record, path) {
  if (!record || !IDENTITY_KINDS.includes(record.kind)) return [];
  const codes = new Set();
  const add = (set) => set.forEach((c) => codes.add(c));
  add(codesForText(String(record.id ?? "").toLowerCase(), { segments: false }));
  add(codesForText(pathText(path), { segments: true }));
  if (record.kind === "fixture-set") {
    for (const item of record.fixtures ?? []) add(codesForText(String(item.id ?? "").toLowerCase(), { segments: false }));
  }
  return [...codes].sort();
}

/** { path: [codes] } for every entry that violates, keys sorted. */
export function collectViolations(entries) {
  const out = {};
  for (const { path, record } of entries) {
    const codes = identityViolations(record, path);
    if (codes.length) out[path] = codes;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

export function loadBaseline(file = BASELINE_PATH) {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return parsed.entries ?? {};
  } catch (e) {
    if (e.code === "ENOENT") return {};
    throw e;
  }
}

/**
 * Compare current violations with a baseline. Returns sorted error strings.
 * `scopePrefixes` (repo-relative directories, optional) limits the stale check to
 * baselined paths under the directories the caller scanned.
 */
export function checkIdentity(entries, baseline = loadBaseline(), { scopePrefixes } = {}) {
  const errors = [];
  const actual = collectViolations(entries);
  for (const [path, codes] of Object.entries(actual)) {
    const allowed = baseline[path];
    if (!allowed) {
      errors.push(`${path}: identity lint: ${codes.join(", ")} in a canonical id or path (ADR 0007). Coordinates belong in externalRefs or migration/legacy-map.json; rename the record.`);
      continue;
    }
    const extra = codes.filter((c) => !allowed.includes(c));
    if (extra.length) errors.push(`${path}: identity lint: new violation ${extra.join(", ")} beyond the baseline (${allowed.join(", ")}); the baseline only shrinks`);
  }
  for (const [path, allowed] of Object.entries(baseline)) {
    if (scopePrefixes && !scopePrefixes.some((p) => path.startsWith(`${p}/`))) continue;
    const codes = actual[path] ?? [];
    const gone = allowed.filter((c) => !codes.includes(c));
    if (gone.length) {
      errors.push(`${path}: identity lint: baseline lists ${gone.join(", ")} but the record no longer violates it (or is gone); remove it from scripts/lint/identity-baseline.json (npm run lint:identity -- --shrink) (${TRACKING})`);
    }
  }
  return errors.sort();
}

/** Serialize a baseline map (one record per line, sorted) and write it. */
export function writeBaseline(map, file = BASELINE_PATH) {
  const body = Object.entries(map)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([p, codes]) => `    ${JSON.stringify(p)}: ${JSON.stringify(codes)}`)
    .join(",\n");
  const text = `{\n  "description": "Records whose canonical id or path still carries a legacy suite, beta, milestone, issue or detector coordinate. Non-growing: lint:identity fails if a violation is added or if a listed record is fixed without being removed here. Stage B of #12 renames them and empties this file.",\n  "tracking": ${JSON.stringify(TRACKING)},\n  "entries": {\n${body}\n  }\n}\n`;
  writeFileSync(file, text);
}
