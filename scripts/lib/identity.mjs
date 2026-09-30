// Identity lint (ADR 0007): canonical ids and record file paths must not carry
// migration coordinates. Pure and deterministic; reads nothing but its input.
//
// Scope: the ids and repository-relative file paths of scenario, case,
// fixture-plan and fixture-set records (plus the fixture ids inside a set).
// Legacy names are allowed in provenance fields (externalRefs, `imported`,
// migration/legacy-map.json), which this lint never reads.
//
// There is no baseline: every violation fails. (Stage A of #12 landed the rule with
// a shrinking baseline of the 1,992 imported records that violated it; stage B
// renamed and reclassified them and deleted the baseline.)

export const IDENTITY_KINDS = ["scenario", "case", "fixture-plan", "fixture-set"];

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

export function codesForText(text, { segments }) {
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
    for (const item of record.fixtures ?? []) {
      add(codesForText(String(item.id ?? "").toLowerCase(), { segments: false }));
      add(codesForText(String(item.path ?? "").toLowerCase(), { segments: true }));
    }
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

/** Error strings for every record whose canonical id or path carries a coordinate. */
export function checkIdentity(entries) {
  const errors = [];
  for (const [path, codes] of Object.entries(collectViolations(entries))) {
    errors.push(`${path}: identity lint: ${codes.join(", ")} in a canonical id or path (ADR 0007). Coordinates belong in externalRefs or migration/legacy-map; rename the record.`);
  }
  return errors.sort();
}
