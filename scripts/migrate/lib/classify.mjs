// Deterministic reclassification of the imported legacy cases (ADR 0007, ADR 0008).
//
// Input: the legacy groups ("imported cases") of legacy-model.mjs. Output: for each
// group, exactly one of
//
//   case        a genuine reasoning unit: becomes (part of) a canonical Case
//   scenario    a hand-authored statement of a reusable, family-independent
//               situation: becomes a Scenario, its fixtures become cells of it
//   projection  a cell of a matrix (family x role scenario): the group's prose was
//               generated from a role template, so nothing of it is kept; its
//               fixtures become cells of a role Scenario
//
// The decision is a function of structure, never of the record's own id or of
// hand-picking: the suite kind (hand-authored narrative or generated), the role
// (base, one-property twin, benign control), the outcome and the evidence tier.
// The few name tables below (carrier groups, case groups) are keyed by legacy group
// and are the authored part; the report prints them so they can be reviewed.

import { CASES } from "../authored/cases.mjs";
import { SCENARIOS } from "../authored/scenarios.mjs";

/** Suites whose fixtures carry hand-written group narratives (as opposed to role-template wording). */
export const HAND_AUTHORED_SUITES = new Set([
  "accuracy",
  "context-edges",
  "milestone-6-closed",
  "negative-controls",
  "policy-qualified-credentials",
  "real-world-shapes",
  "reference-syntax",
  "sendgrid-regressions",
  "token-contexts",
]);

/** Carrier groups: the hand-written narrative is about the carrier, not the family. Keyed `<suite>|<group>`. */
export const CARRIER_GROUPS = {
  "context-edges|Boundaries": "value-at-input-edges",
  "context-edges|Quoting": "quoted-value-extent",
  "context-edges|Structured text": "structured-text-value",
  "context-edges|Source code": "source-code-string-literal",
  "context-edges|Documentation": "markdown-and-comment-value",
  "context-edges|Encoding": "multibyte-text-offsets",
  "context-edges|Line endings": "crlf-line-endings",
  "context-edges|Multiple spans": "multiple-credentials-per-input",
  "context-edges|Long input": "credential-after-long-input",
  "token-contexts|Environment": "environment-assignment",
  "token-contexts|JSON": "structured-text-value",
  "token-contexts|Unicode": "multibyte-text-offsets",
  "token-contexts|CRLF": "crlf-line-endings",
};

export const TWIN_SCENARIOS = {
  length: "wrong-length",
  prefix: "prefix-near-miss",
  alphabet: "wrong-alphabet",
  boundary: "boundary-violation",
  context: "missing-context-marker",
  checksum: "invalid-checksum",
  "public-prefix": "public-sibling-prefix",
};

export const CONTROL_SCENARIOS = {
  "public-id": "public-identifier",
  placeholder: "documentation-placeholder",
  reference: "templated-reference",
  "near-miss": "format-near-miss",
  "encoded-value": "benign-encoded-value",
  prose: "prose-mention",
};

export const RULES = [
  {
    id: "unsettled-evidence",
    class: "projection",
    title: "Unresolved evidence (legacy tier T0)",
    justification:
      "The legacy benchmark left these fixtures unscored. A case asserts an expectation, and there is none to assert: the inputs become cells of the scenario `unsettled-evidence-input`, which exists to keep the open question visible. Applied first, to every role.",
  },
  {
    id: "carrier-scenario",
    class: "scenario",
    title: "Hand-written carrier narrative",
    justification:
      "The suite's own prose is about a carrier or an input edge (quoting, line endings, multibyte text), states one sentence of reasoning that holds for every format, and differs between families only by the family's name. ADR 0007 criterion 3 fails (a scenario plus a family list reproduces it), so it is a Scenario; its fixtures are cells of a family x scenario plan.",
  },
  {
    id: "authored-case",
    class: "case",
    title: "Hand-written narrative about a specific failure mode",
    justification:
      "The suite's prose names a failure mode that is specific to it (a documented example value one character off, a placeholder vocabulary boundary, a key at the end of a line, a mask ending in a real character, a format with trailing punctuation) and cannot be produced by substituting a family name into a template. It has its own expectation and a stated reason for it. Groups that state the same reasoning, or that differ only in evidence tier, fold into one Case.",
  },
  {
    id: "twin-projection",
    class: "projection",
    title: "One-property twin of a positive",
    justification:
      "A twin's only content is which single property of a positive was changed (length, prefix, alphabet, boundary, carrier marker, checksum, public prefix) for which family. That sentence is the same for every family, so it is a cell of the matching twin scenario. The fixture keeps its `twin-of` lineage to the exact positive fixture. Applies to twins in hand-written suites too: their narrative adds nothing beyond the property.",
  },
  {
    id: "control-projection",
    class: "projection",
    title: "Benign control of a family",
    justification:
      "A control (public identifier, placeholder, reference, near miss, encoded value, prose mention) is worded from a per-type template plus the family name. The type is the scenario; the family is the cell. A control type whose outcome is must-flag (a provider-format near miss that the project still reports because it sits under a credential-named assignment) is the scenario `credential-named-literal-near-miss`.",
  },
  {
    id: "positive-projection",
    class: "projection",
    title: "Documented-format positive of a family",
    justification:
      "A positive base group of a generated suite states only that a value built to the family's documented format, in some carriers, must be flagged. That is the scenario `documented-format-literal` for one family; the carriers are the fixtures' `context`.",
  },
  {
    id: "lookalike-projection",
    class: "projection",
    title: "Benign lookalike of a family",
    justification:
      "A benign base group of a generated suite (bare prefix, mask, short body, label prose, embedding) is worded from a template plus the family name. It is the scenario `benign-lookalike` for one family.",
  },
];
const RULE_BY_ID = new Map(RULES.map((r) => [r.id, r]));

const scenarioById = new Map(SCENARIOS.map((s) => [s.id, s]));
const caseKeyToId = new Map();
for (const c of CASES) for (const k of c.from) {
  if (caseKeyToId.has(k)) throw new Error(`authored case group ${k} is listed by both ${caseKeyToId.get(k)} and ${c.id}`);
  caseKeyToId.set(k, c.id);
}

const requireScenario = (id, why) => {
  if (!scenarioById.has(id)) throw new Error(`${why}: no authored scenario '${id}'`);
  return id;
};

/** Classify one legacy group. Throws when no rule applies: there is no silent default. */
export function classifyAgg(agg) {
  const out = (ruleId, target, extra = {}) => ({ rule: ruleId, cls: RULE_BY_ID.get(ruleId).class, target, ...extra });
  const scenarioTarget = (id, why) => ({ type: "scenario", id: requireScenario(id, why) });

  if (agg.tier === "T0") return out("unsettled-evidence", scenarioTarget("unsettled-evidence-input", agg.legacyCaseId));
  const hand = HAND_AUTHORED_SUITES.has(agg.suite);
  const groupKey = `${agg.suite}|${agg.group}`;
  if (hand && agg.roleKind === "base") {
    if (CARRIER_GROUPS[groupKey]) return out("carrier-scenario", scenarioTarget(CARRIER_GROUPS[groupKey], groupKey));
    const caseId = caseKeyToId.get(`${groupKey}|${agg.outcome}`);
    if (!caseId) throw new Error(`hand-authored group '${groupKey}' (${agg.outcome}) is neither a carrier group nor listed by an authored case`);
    return out("authored-case", { type: "case", id: caseId });
  }
  if (agg.roleKind === "twin") {
    const kind = agg.role.slice(5);
    const id = TWIN_SCENARIOS[kind];
    if (!id) throw new Error(`${agg.legacyCaseId}: no scenario for twin mutation kind '${kind}'`);
    return out("twin-projection", scenarioTarget(id, agg.legacyCaseId));
  }
  if (agg.roleKind === "control") {
    const type = agg.role.slice(8);
    const id = CONTROL_SCENARIOS[type];
    if (!id) throw new Error(`${agg.legacyCaseId}: no scenario for control type '${type}'`);
    return out("control-projection", scenarioTarget(agg.outcome === "must-flag" ? "credential-named-literal-near-miss" : id, agg.legacyCaseId));
  }
  if (agg.roleKind === "base" && !hand) {
    if (agg.outcome === "must-flag") return out("positive-projection", scenarioTarget("documented-format-literal", agg.legacyCaseId));
    if (agg.outcome === "must-not-flag") return out("lookalike-projection", scenarioTarget("benign-lookalike", agg.legacyCaseId));
  }
  throw new Error(`no classification rule for legacy group ${agg.legacyCaseId} (${agg.roleKind}/${agg.role}/${agg.outcome})`);
}

/**
 * Classify every group and verify the tables are complete and consistent.
 * @returns {Map<string, object>} agg.key -> classification
 */
export function classifyAll(aggs) {
  const byKey = new Map();
  const used = new Set();
  for (const agg of aggs) {
    const c = classifyAgg(agg);
    byKey.set(agg.key, c);
    if (c.target.type === "case") used.add(`${agg.suite}|${agg.group}|${agg.outcome}`);
    // the scenario's outcome class must be the group's outcome
    if (c.target.type === "scenario") {
      const s = scenarioById.get(c.target.id);
      if (s.outcome !== agg.outcome) throw new Error(`${agg.legacyCaseId}: outcome ${agg.outcome} contradicts scenario ${s.id} (${s.outcome})`);
    }
  }
  for (const k of caseKeyToId.keys()) if (!used.has(k)) throw new Error(`authored case group ${k} matches no legacy group (renamed at the pinned revision?)`);
  return byKey;
}

export const scenarioRecordsById = scenarioById;
