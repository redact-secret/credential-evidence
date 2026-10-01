// Narrative lint (ADR 0010): the prose of a family narrative must make sense without
// Redact Secret, its benchmark or any scanner's support state. Pure and deterministic.
//
// Scope: the free text of `family-narrative` records only (statement text and the reason
// an unresolved statement is unresolved), plus the review-history notes that restate those
// reasons. Citations are links to sources and are never read. Naming a scanner as a *source*
// ("a scanner rule matches ...") is evidence and is allowed; naming the project's own
// benchmark, detector ids, support status, release coordinates or issue workflow is not.
//
// There is no baseline: every violation fails.

import { LEGACY_SUITE_NAMES } from "./identity.mjs";

export const NARRATIVE_KINDS = ["family-narrative"];

const B = "(?<![A-Za-z0-9])"; // token start
const E = "(?![A-Za-z0-9])"; // token end

// "accuracy" is an ordinary word and is the one legacy suite name left out; the other suite
// names are hyphenated and cannot occur in ordinary prose.
const SUITES = LEGACY_SUITE_NAMES.filter((n) => n !== "accuracy").map((n) => n.replace(/-/g, "[- ]"));

export const NARRATIVE_RULES = [
  ["suite-name", new RegExp(`${B}(${SUITES.join("|")})${E}`, "i")],
  ["beta-or-milestone-coordinate", new RegExp(`${B}(beta|milestone|wave)[ .-]?\\d+`, "i")],
  ["release-coordinate", new RegExp(`${B}(rc|release)-?\\d+${E}`, "i")],
  ["issue-workflow", new RegExp(`(?:^|[^A-Za-z0-9])#[0-9]+|[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+#[0-9]+|${B}(PRs?|pull requests?|research issues?|tracking issues?|discovery pass)${E}`, "i")],
  ["detector-vocabulary", new RegExp(`${B}detectors?${E}`, "i")],
  ["support-status", new RegExp(`${B}(support[ -]?status|stable|provisional|pending)${E}`, "i")],
  ["evidence-tier", new RegExp(`${B}(tier|T[0-3])${E}`, "i")],
  ["product-or-benchmark-vocabulary", new RegExp(`${B}(redact[ -]?secret|benchmarks?|core|corpus|fixtures?|taxonomy|dossiers?|ledger|qualif[a-z]*)${E}`, "i")],
];

/** Codes that match `text`, sorted. */
export function codesForNarrativeText(text) {
  const codes = [];
  for (const [code, re] of NARRATIVE_RULES) if (re.test(text)) codes.push(code);
  return codes.sort();
}

/** Every free-text field of a narrative as [{ where, text }]. */
export function narrativeTexts(record) {
  const out = [];
  for (const [section, statements] of Object.entries(record.sections ?? {})) {
    for (const s of statements) {
      out.push({ where: `sections.${section}[${s.id}].text`, text: String(s.text ?? "") });
      if (s.unresolved) out.push({ where: `sections.${section}[${s.id}].unresolved.reason`, text: String(s.unresolved.reason ?? "") });
    }
  }
  if (record.notes) out.push({ where: "notes", text: String(record.notes) });
  return out;
}

/** [{ where, code }] violations of one record; [] when clean or out of scope. */
export function narrativeViolations(record) {
  if (!record || !NARRATIVE_KINDS.includes(record.kind)) return [];
  const out = [];
  for (const { where, text } of narrativeTexts(record)) for (const code of codesForNarrativeText(text)) out.push({ where, code });
  return out;
}

/** Error strings for every narrative that uses benchmark, product or workflow vocabulary. */
export function checkNarrativeLint(entries) {
  const errors = [];
  for (const { path, record } of entries) {
    for (const { where, code } of narrativeViolations(record)) {
      errors.push(`${path}: narrative lint: ${code} in ${where} (ADR 0010). Rewrite the statement in scanner-neutral, product-neutral language; provenance belongs in citations or externalRefs.`);
    }
  }
  return errors.sort();
}
