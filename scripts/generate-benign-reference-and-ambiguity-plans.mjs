#!/usr/bin/env node
// Generator for the benign-reference, public-identifier and policy-ambiguous assignment plans (issue #98, schema revision 1.6.0, ADR 0016).
//
//   node scripts/generate-benign-reference-and-ambiguity-plans.mjs [--source-revision <40-hex>]   write the six records
//   (sourceRevision defaults to the merge-base with origin/main, a commit that survives a squash merge: ADR 0005, Addendum 1)
//   node scripts/generate-benign-reference-and-ambiguity-plans.mjs --check                      verify the records on disk equal the output
//
// Inputs: the synthetic authored bases below. Output: two authored sets (benign controls with near-neighbor positives;
// policy-ambiguous assignments), two generated sets of surrounding-text projections of them, and two fixture plans that
// declare the bases. The two populations are kept in separate sets and plans on purpose: a policy-ambiguous input is never
// counted as a benign control or as a positive. Every item projects an existing Scenario cell or an existing or new Case, whose
// reasoning and evidence it inherits; a positive twin of a Stripe secret key carries its own provider-documented evidence entry.
// Deterministic: no clock, no network, no random source (synthetic bodies derive from a SHA-512 of a fixed label).
//
// Every credential-shaped value is synthetic and was never issued: its body starts with the literal word `synthetic` (or is the
// marker word EXAMPLE plus filler) and continues with characters derived from a fixed label. Nothing was tested against any service.
// Personal-data-shaped values use the reserved example.invalid domain and the fictional 555-0100 telephone range.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveSourceRevision } from "./lib/source-revision.mjs";
import { repoRoot } from "./lib/validator.mjs";

export const GENERATOR = { name: "benign-reference-and-ambiguity-projector", version: "1.1.0", entrypoint: "scripts/generate-benign-reference-and-ambiguity-plans.mjs" };
export const RULE = "surrounding-text-placement-of-controls-and-ambiguous-bases";

export const IDS = {
  controlsAuthored: "benign-control-and-near-neighbor-bases-authored",
  controlsGenerated: "benign-control-and-near-neighbor-projections-generated",
  ambiguousAuthored: "policy-ambiguous-assignment-bases-authored",
  ambiguousGenerated: "policy-ambiguous-assignment-projections-generated",
  controlsPlan: "benign-control-and-near-neighbor-matrix-of-bases",
  ambiguousPlan: "policy-ambiguous-assignment-matrix-of-bases",
};

const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const synthetic = (label, length) => {
  const digest = createHash("sha512").update(label).digest();
  let out = "synthetic";
  for (let i = 0; out.length < length; i++) out += ALNUM[digest[i] % ALNUM.length];
  return out;
};
const pk = (label) => `pk_test_${synthetic(label, 32)}`;
const sk = (label) => `sk_test_${synthetic(label, 32)}`;

const STRIPE = "stripe:secret-key-test";
const GENERIC = "generic:unclassified-assignment-literal";
const AWS_KEY = "aws:iam-user-access-key";
const CASES = {
  pkLabel: "documented-public-key-value-under-matching-or-ordinary-labels",
  pair: "repeated-key-label-with-public-and-secret-values",
  pii: "personal-data-shaped-values-under-credential-only-scope",
  sample: "example-and-sample-words-as-whole-value-under-credential-names",
  marker: "example-marker-inside-provider-shaped-value-not-published-by-provider",
};
const EVIDENCE_KEY = "stripe-secret-key-not-safe-to-expose";
const PK_KEY = "stripe-publishable-key-safe-to-expose";
const PAIR_KEY = "stripe-publishable-and-secret-key-in-one-input";
const SAMPLE_KEY = "example-and-sample-words-policy-unresolved";
const MARKER_KEY = "example-marker-in-provider-shaped-value-policy";
const SK_SOURCE = {
  sourceId: "docs-stripe-com-3e992d348a",
  supports: "Key types table: a secret API key (sk_...) is 'Safe to expose: No' and has unrestricted permissions on all Stripe APIs; 'Only publishable keys are safe to expose outside your application's backend.'",
  locator: "#key-types",
};
const PK_SOURCE = {
  sourceId: "docs-stripe-com-3e992d348a",
  supports: "Key types table: a publishable API key (pk_...) is 'Safe to expose: Yes' and can be included in front-end code or distributed applications; it cannot perform sensitive operations such as creating charges or reading account data.",
  locator: "#key-types",
};
const AWS_SOURCE = {
  sourceId: "docs-aws-amazon-com-1e9489a68f",
  supports: "Access keys consist of an access key ID (for example, AKIAIOSFODNN7EXAMPLE) and a secret access key (for example, wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY); the page presents these two strings as examples.",
  locator: "Manage access keys for IAM users, introduction",
};
const EVIDENCE = {
  [EVIDENCE_KEY]: {
    basis: "provider-documented",
    rationale: "Stripe documents the secret key type (sk_) as not safe to expose. The value's class follows from its documented prefix; the label, the surrounding text and the carrier do not change it. That the surrounding normal text is outside the span is the exact-span statement of this fixture, not a provider rule.",
    sources: [SK_SOURCE],
    observedAt: "2026-10-03",
  },
  [PK_KEY]: {
    basis: "provider-documented",
    rationale: "Stripe documents the publishable key type (pk_) as safe to expose, and the label STRIPE_PUBLISHABLE_KEY agrees. Not flagged as a credential. The expectation covers the credential population only; it is not a statement about any product's redaction choice for public identifiers.",
    sources: [PK_SOURCE],
    observedAt: "2026-10-03",
  },
  [PAIR_KEY]: {
    basis: "provider-documented",
    rationale: "One label is repeated for a documented publishable value and a documented secret value; the two are told apart by each value's documented prefix, not by the label. One span on the secret value and none on the publishable one; silence on the publishable value follows from its documented class and is stated as inference.",
    sources: [SK_SOURCE, PK_SOURCE],
    observedAt: "2026-10-03",
  },
  [SAMPLE_KEY]: {
    basis: "unresolved",
    rationale: `No outcome is asserted: whether the bare words EXAMPLE and SAMPLE under a credential-named key are placeholders or literals is not settled by any recorded source. Open question and review history: Case ${CASES.sample}.`,
    sources: [],
    observedAt: "2026-10-03",
  },
  [MARKER_KEY]: {
    basis: "project-policy",
    rationale: `Project policy, maintainer-only (ADR 0020, ADR 0019 item 5): a provider-shaped value whose body is the marker word EXAMPLE is flagged. AWS publishes exact example literals and that statement is about those strings only; nothing recorded says a value that merely carries the word EXAMPLE in its body is a placeholder, so only a literal a provider publishes is exempt. Not reviewed, not independent validation, queued for retro-review (#154). Question, options, dissent and reversing evidence: review history of Case ${CASES.marker}.`,
    sources: [AWS_SOURCE],
    observedAt: "2026-10-04",
    reviewState: "maintainer-only",
    decidedIn: { kind: "case", id: CASES.marker },
  },
};

const SYNTH = "Synthetic value; never issued.";
const sha = (buf) => createHash("sha256").update(buf).digest("hex");

// ---- authored bases. `secret` is the substring that is the credential (positives); benign bases have none.
// target: { case } or { scenario, families }. `family` picks the plan cell family when a scenario is used.
const CONTROLS = [
  { name: "publishable-key-under-matching-label-base", kind: "benign", target: { scenario: "public-identifier", families: [STRIPE] }, evidence: PK_KEY, text: `STRIPE_PUBLISHABLE_KEY=${pk("controls/publishable-key")}\n`, context: "env-assignment" },
  { name: "environment-interpolation-reference-base", kind: "benign", target: { scenario: "templated-reference", families: [STRIPE] }, text: "STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}\n", context: "env-assignment" },
  { name: "kubernetes-secret-key-reference-base", kind: "benign", target: { scenario: "templated-reference", families: [STRIPE] }, text: "- name: STRIPE_SECRET_KEY\n  valueFrom:\n    secretKeyRef:\n      name: payments-secrets\n      key: stripe-secret-key\n", context: "structured-file" },
  { name: "regular-expression-source-base", kind: "benign", target: { scenario: "benign-lookalike", families: [STRIPE] }, text: "const stripeSecretKeyPattern = /sk_(test|live)_[A-Za-z0-9]{24,99}/;\n", context: "source-code" },
  { name: "prefix-prose-base", kind: "benign", target: { scenario: "prose-mention", families: [STRIPE] }, text: "Stripe secret keys begin with sk_test_ in a sandbox and sk_live_ in live mode; publishable keys begin with pk_.\n", context: "prose" },
  { name: "personal-data-contact-line-base", kind: "benign", target: { case: CASES.pii, unscoped: true }, text: "Contact Jane Example at jane.example@example.invalid or +1 555 0100 before Friday.\n", context: "prose" },
  // near-neighbor positives: one property away from a benign base above, with the secret span exact.
  { name: "secret-beside-publishable-under-one-label-base", kind: "positive", twinOf: "publishable-key-under-matching-label-base", target: { scenario: "multiple-credentials-per-input", families: [STRIPE] }, secret: sk("controls/pair-secret"), build: (s) => `STRIPE_KEY=${pk("controls/pair-publishable")}\nSTRIPE_KEY=${s}\n`, evidence: PAIR_KEY, context: "env-assignment" },
  { name: "secret-literal-in-reference-position-base", kind: "positive", twinOf: "environment-interpolation-reference-base", target: { scenario: "environment-assignment", families: [STRIPE] }, secret: sk("controls/reference-position"), build: (s) => `STRIPE_SECRET_KEY=${s}\n`, evidence: EVIDENCE_KEY, context: "env-assignment" },
  { name: "secret-literal-beside-kubernetes-reference-shape-base", kind: "positive", twinOf: "kubernetes-secret-key-reference-base", target: { scenario: "structured-text-value", families: [STRIPE] }, secret: sk("controls/kubernetes-literal"), build: (s) => `- name: STRIPE_SECRET_KEY\n  value: ${s}\n`, evidence: EVIDENCE_KEY, context: "structured-file" },
  { name: "secret-literal-where-the-pattern-was-base", kind: "positive", twinOf: "regular-expression-source-base", target: { scenario: "source-code-string-literal", families: [STRIPE] }, secret: sk("controls/source-literal"), build: (s) => `const stripeSecretKey = "${s}";\n`, evidence: EVIDENCE_KEY, context: "source-code" },
  { name: "secret-after-prefix-prose-base", kind: "positive", twinOf: "prefix-prose-base", target: { scenario: "markdown-and-comment-value", families: [STRIPE] }, secret: sk("controls/prose-secret"), build: (s) => `Stripe secret keys begin with sk_test_ in a sandbox. The sandbox key for this build is ${s} and must not be pasted into tickets.\n`, evidence: EVIDENCE_KEY, context: "prose" },
  { name: "secret-after-personal-data-contact-line-base", kind: "positive", twinOf: "personal-data-contact-line-base", target: { scenario: "partial-span-leakage", families: [STRIPE] }, secret: sk("controls/contact-secret"), build: (s) => `Contact Jane Example at jane.example@example.invalid or +1 555 0100 before Friday. Sandbox key: ${s}\n`, evidence: EVIDENCE_KEY, context: "prose" },
];

const AMBIGUOUS = [
  { name: "password-equals-example-base", target: { scenario: "unsettled-evidence-input", families: [GENERIC] }, evidence: SAMPLE_KEY, text: "password=EXAMPLE\n", context: "env-assignment" },
  { name: "access-token-equals-sample-base", target: { scenario: "unsettled-evidence-input", families: [GENERIC] }, evidence: SAMPLE_KEY, text: "access_token=SAMPLE\n", context: "env-assignment" },
  { name: "api-key-equals-example-word-run-base", target: { scenario: "unsettled-evidence-input", families: [GENERIC] }, evidence: SAMPLE_KEY, text: "API_KEY=EXAMPLE_API_KEY\n", context: "env-assignment" },
  { name: "yaml-secret-colon-sample-base", target: { scenario: "unsettled-evidence-input", families: [GENERIC] }, evidence: SAMPLE_KEY, text: "secret: SAMPLE\n", context: "structured-file" },
  { name: "stripe-shaped-body-of-example-marker-base", kind: "positive", target: { case: CASES.marker, families: [STRIPE] }, evidence: MARKER_KEY, secret: `sk_test_${"EXAMPLE".repeat(5).slice(0, 32)}`, build: (s) => `STRIPE_SECRET_KEY=${s}\n`, context: "env-assignment" },
  { name: "aws-key-id-shaped-body-of-example-marker-base", kind: "positive", target: { case: CASES.marker, families: [AWS_KEY] }, evidence: MARKER_KEY, secret: "AKIAEXAMPLEFILLER000", build: (s) => `AWS_ACCESS_KEY_ID=${s}\n`, context: "env-assignment" },
];

const CARRIERS = [
  { name: "english-prose", carrier: "english-prose-before-and-after", head: "Please review the following note before the release.\n", tail: "Thanks for checking; nothing else changed this week.\n" },
  { name: "korean-prose", carrier: "korean-prose-before-and-after", head: "릴리스 전에 아래 내용을 확인해 주세요.\n", tail: "확인해 주셔서 감사합니다.\n" },
  { name: "markdown-fence", carrier: "markdown-code-fence", head: "```text\n", tail: "```\n" },
];

// A case target may narrow the families it is an instance of (schema 1.5.0 families override).
const targetFields = (plan, t) => (t.case ? { case: t.case, ...(t.families ? { families: t.families } : {}) } : { cell: { plan, scenario: t.scenario, families: t.families } });

function locate(bytes, value, where) {
  const needle = Buffer.from(value, "utf8");
  const first = bytes.indexOf(needle);
  if (first < 0) throw new Error(`${where}: value not found`);
  if (bytes.indexOf(needle, first + 1) >= 0) throw new Error(`${where}: value occurs more than once`);
  return first;
}

/** Build every record. Pure. */
export function buildRecords({ sourceRevision }) {
  const baseOf = (set, name) => `${set}--${name}`;
  const resolve = (c) => ({ ...c, text: c.build ? c.build(c.secret) : c.text });
  const controls = CONTROLS.map(resolve);
  const ambiguous = AMBIGUOUS.map(resolve);

  const authoredItem = (set, plan, b) => {
    const bytes = Buffer.from(b.text, "utf8");
    const positive = b.kind === "positive";
    const start = positive ? locate(bytes, b.secret, b.name) : 0;
    const ambiguousItem = set === IDS.ambiguousAuthored && !positive;
    return {
      id: baseOf(set, b.name),
      ...targetFields(plan, b.target),
      path: `${b.name}/input.txt`,
      context: b.context,
      derivation: { kind: "authored-base" },
      ...(b.evidence ? { evidence: b.evidence } : {}),
      ...(b.twinOf ? { lineage: { relation: "twin-of", of: baseOf(set, b.twinOf), mutationKind: "benign-control-to-literal", mutation: "The reference, pattern or prose position now holds a literal secret; everything else is the nearest neighbouring text." } } : {}),
      sha256: sha(bytes),
      text: b.text,
      expected: ambiguousItem ? { outcome: "not-assertable", spans: [] } : positive ? { outcome: "must-flag", spans: [{ start, end: start + Buffer.byteLength(b.secret), role: "secret", note: SYNTH }] } : { outcome: "must-not-flag", spans: [] },
    };
  };

  const projections = (set, authoredSet, plan, list) => {
    const items = [];
    for (const b of list) {
      const baseBytes = Buffer.from(b.text, "utf8");
      const positive = b.kind === "positive";
      for (const c of CARRIERS) {
        const head = Buffer.from(c.head, "utf8");
        const bytes = Buffer.concat([head, baseBytes, Buffer.from(c.tail, "utf8")]);
        const id = baseOf(authoredSet, b.name);
        const secretStart = positive ? head.length + locate(baseBytes, b.secret, b.name) : 0;
        const ambiguousItem = authoredSet === IDS.ambiguousAuthored && !positive;
        items.push({
          id: `${set}--${b.name.replace(/-base$/, "")}-in-${c.name}`,
          ...targetFields(plan, b.target),
          path: `${b.name.replace(/-base$/, "")}-in-${c.name}/input.txt`,
          context: c.carrier,
          derivation: { kind: "projection", bases: [id] },
          transformation: { steps: [{ op: "embed", mode: "embedded", carrier: c.carrier }] },
          ...(b.evidence ? { evidence: b.evidence } : {}),
          sha256: sha(bytes),
          text: bytes.toString("utf8"),
          expected: ambiguousItem ? { outcome: "not-assertable", spans: [] } : positive ? { outcome: "must-flag", spans: [{ start: secretStart, end: secretStart + Buffer.byteLength(b.secret), role: "secret", note: SYNTH, base: id }] } : { outcome: "must-not-flag", spans: [] },
        });
      }
    }
    return items;
  };

  const authorship = "Project-authored by the Redact Secret project, which maintains this repository; not independent evidence. Draft; not yet reviewed.";
  const synthNote = "Synthetic: every credential-shaped value has a body that starts with the word synthetic (or is the marker word EXAMPLE plus filler) and continues with characters derived from a fixed label, so it was never issued; personal-data-shaped values use the reserved example.invalid domain and the fictional 555-0100 telephone range. None was tested against any service.";
  const evidenceFor = (items) => {
    const keys = [...new Set(items.map((i) => i.evidence).filter(Boolean))];
    return keys.length ? { evidence: Object.fromEntries(keys.map((k) => [k, EVIDENCE[k]])) } : {};
  };
  const origin = { type: "generation-rule", rule: RULE, generator: { ...GENERATOR, sourceRevision }, seed: "benign-reference-and-ambiguity-1" };

  const controlsAuthoredItems = controls.map((b) => authoredItem(IDS.controlsAuthored, IDS.controlsPlan, b));
  const ambiguousAuthoredItems = ambiguous.map((b) => authoredItem(IDS.ambiguousAuthored, IDS.ambiguousPlan, b));
  const controlsProjected = projections(IDS.controlsGenerated, IDS.controlsAuthored, IDS.controlsPlan, controls);
  const ambiguousProjected = projections(IDS.ambiguousGenerated, IDS.ambiguousAuthored, IDS.ambiguousPlan, ambiguous);
  const nBenign = controls.filter((b) => b.kind === "benign").length;
  const nPositive = controls.length - nBenign;
  const ambiguousUndecided = ambiguous.filter((b) => b.kind !== "positive");

  const controlsAuthoredSet = {
    schemaVersion: 1, kind: "fixture-set", id: IDS.controlsAuthored,
    title: "Benign controls and near-neighbor positives, base samples (authored)",
    description: `${controls.length} authored base samples: ${nBenign} benign controls (a publishable key under its matching label, an environment-interpolation reference, a Kubernetes secretKeyRef reference, a regular expression that names a key prefix, prose that names the prefixes, and a personal-data contact line under a credential-only scope) and ${nPositive} near-neighbor positives, each one property away from a benign base, with the secret span exact so that masking the surrounding normal text is visible. ${synthNote}`,
    origin: { type: "authored-cases" }, generated: false,
    ...evidenceFor(controlsAuthoredItems),
    fixtures: controlsAuthoredItems,
    lifecycle: "draft",
    notes: `${authorship} A base asserts only its own expectation (a benign base: its whole content is the value; a positive: its one secret span). Benign and near-neighbor inputs are here; policy-ambiguous inputs are in ${IDS.ambiguousAuthored} and never mixed with them. Personal-data expectations belong to a separate population or profile and are not stated.`,
  };
  const ambiguousAuthoredSet = {
    schemaVersion: 1, kind: "fixture-set", id: IDS.ambiguousAuthored,
    title: "Policy-ambiguous assignment base samples (authored)",
    description: `${ambiguous.length} authored base samples: the bare words EXAMPLE and SAMPLE as the whole value under credential-named keys (${ambiguousUndecided.length} bases, expectation not settled: not-assertable, no span, no must-not-flag or must-flag label fabricated) and provider-shaped values whose body is the marker word EXAMPLE (${ambiguous.length - ambiguousUndecided.length} bases, must-flag under a maintainer-only project policy, ADR 0020 and ADR 0019 item 5). ${synthNote}`,
    origin: { type: "authored-cases" }, generated: false,
    ...evidenceFor(ambiguousAuthoredItems),
    fixtures: ambiguousAuthoredItems,
    lifecycle: "draft",
    notes: `${authorship} Kept apart from the benign controls so that neither a benign count nor a positive count absorbs them. The open questions and their review history are in the two Cases these items project.`,
  };
  const controlsGeneratedSet = {
    schemaVersion: 1, kind: "fixture-set", id: IDS.controlsGenerated,
    title: "Surrounding-text projections of benign controls and near-neighbor positives (generated)",
    description: `${controlsProjected.length} projections: each of the ${controls.length} controls and positives placed between ordinary English prose, ordinary Korean prose, or a Markdown code fence. The expected spans are the secret bytes only, so any normal surrounding text a consumer masks is outside the span. ${controls.length} bases, ${controlsProjected.length} correlated inputs. ${synthNote}`,
    origin, generated: true,
    ...evidenceFor(controlsProjected),
    fixtures: controlsProjected,
    lifecycle: "draft",
    notes: `${authorship} Generated; never edited by hand: rerun the generator. Each projection keeps its base's Case or Scenario, expectation and evidence entry.`,
  };
  const ambiguousGeneratedSet = {
    schemaVersion: 1, kind: "fixture-set", id: IDS.ambiguousGenerated,
    title: "Surrounding-text projections of policy-ambiguous assignments (generated)",
    description: `${ambiguousProjected.length} projections of the ${ambiguous.length} policy-ambiguous bases in the same three surrounding texts. The ${ambiguousUndecided.length * 3} bare-word projections are not-assertable; the ${(ambiguous.length - ambiguousUndecided.length) * 3} marker-body projections are must-flag under the maintainer-only policy of Case ${CASES.marker}. ${ambiguous.length} bases, ${ambiguousProjected.length} correlated inputs. ${synthNote}`,
    origin, generated: true,
    ...evidenceFor(ambiguousProjected),
    fixtures: ambiguousProjected,
    lifecycle: "draft",
    notes: `${authorship} Generated; never edited by hand: rerun the generator. Nothing may be scored against the bare-word inputs until a recorded decision or provider statement resolves their Case; the marker-body inputs are maintainer-only (ADR 0020), not reviewed.`,
  };

  const inputs = (setItems, contracts, cases = []) => [...setItems.filter((i) => i.cell).map((i) => ({ kind: "fixture", id: i.id })), ...cases.map((id) => ({ kind: "case", id })), ...contracts.map((id) => ({ kind: "format-contract", id }))];
  const scenarioIds = (items) => [...new Set(items.filter((i) => i.cell).map((i) => i.cell.scenario))].sort();
  const caseIds = (items) => [...new Set(items.filter((i) => i.case).map((i) => i.case))].sort();
  const targets = (items) => [...scenarioIds(items).map((id) => ({ type: "scenario", id })), ...caseIds(items).map((id) => ({ type: "case", id }))];
  const derived = (items, cases = []) => {
    const all = [...targets(items).map((t) => ({ kind: t.type, id: t.id })), ...cases.map((id) => ({ kind: "case", id }))];
    return all.filter((d, i) => all.findIndex((e) => e.kind === d.kind && e.id === d.id) === i);
  };

  const controlsPlan = {
    schemaVersion: 1, kind: "fixture-plan", id: IDS.controlsPlan,
    title: "Benign controls and near-neighbor positives of authored bases",
    description: `Public identifier versus secret, reference versus literal, key-prefix text versus a key, and personal-data-shaped text under a credential-only scope, as ${nBenign} benign bases and ${nPositive} near-neighbor positives, each placed in three surrounding texts. Reuses existing Scenarios and Cases (${[...scenarioIds(controlsAuthoredItems), ...caseIds(controlsAuthoredItems)].join(", ")}) and adds one Case for the credential-only personal-data scope. Declares its ${controls.length} bases, so the independent base count is ${controls.length} whatever the number of generated inputs.`,
    matrix: { families: { select: "listed", ids: [STRIPE] }, targets: targets(controlsAuthoredItems), carriers: [...new Set(controlsAuthoredItems.concat(controlsProjected).map((i) => i.context))].sort(), coverage: "sparse" },
    generation: { rule: RULE, generator: { ...GENERATOR, sourceRevision }, inputs: inputs(controlsAuthoredItems, ["stripe:secret-key-test@1"], [CASES.pii]), seed: origin.seed },
    lineage: { origin: "authored", derivedFrom: derived(controlsAuthoredItems, [CASES.pii]) },
    output: [IDS.controlsAuthored, IDS.controlsGenerated],
    lifecycle: "draft",
    notes: `${authorship} The matrix is sparse and single-family because the reasoning is not family-specific; Stripe is the family with a provider statement for both sides of the public-versus-secret question. A personal-data base has no credential family. Expected spans are the secret bytes only, with no envelope: bytes a consumer reports outside the secret are a separate observation. Downstream comparison must record, for every configuration it measures, whether generic credential-assignment detection and personal-data detection were enabled; those settings change the result on these inputs and are not stated here.`,
  };
  const ambiguousPlan = {
    schemaVersion: 1, kind: "fixture-plan", id: IDS.ambiguousPlan,
    title: "Policy-ambiguous assignments of authored bases",
    description: `Bare EXAMPLE and SAMPLE words under credential-named keys and provider-shaped values with an EXAMPLE marker body, as ${ambiguous.length} authored bases each placed in three surrounding texts. The ${ambiguousUndecided.length * 3} bare-word inputs are not-assertable; the ${(ambiguous.length - ambiguousUndecided.length) * 3} marker-body inputs are must-flag under a maintainer-only policy (ADR 0020). Projects two Cases that hold the questions, the decision and their review history. Declares its ${ambiguousUndecided.length} bare-word bases; the ${ambiguous.length - ambiguousUndecided.length} marker-body bases project the Case they decide directly and are not declared, as the personal-data base of the controls plan is not.`,
    matrix: { families: { select: "listed", ids: [AWS_KEY, GENERIC, STRIPE].sort() }, targets: targets(ambiguousAuthoredItems), carriers: [...new Set(ambiguousAuthoredItems.concat(ambiguousProjected).map((i) => i.context))].sort(), coverage: "sparse" },
    generation: { rule: RULE, generator: { ...GENERATOR, sourceRevision }, inputs: inputs(ambiguousAuthoredItems, [], [CASES.sample, CASES.marker]), seed: origin.seed },
    lineage: { origin: "authored", derivedFrom: derived(ambiguousAuthoredItems, [CASES.sample, CASES.marker]) },
    output: [IDS.ambiguousAuthored, IDS.ambiguousGenerated],
    lifecycle: "draft",
    notes: `${authorship} These inputs are a policy-observation population, not a benign control population and not a positive population: no outcome is asserted for the bare-word inputs, so they are never scored as true or false positives; the marker-body inputs carry a maintainer-only must-flag, not reviewed. A consumer that reports what it did with them records its generic-assignment setting next to the observation.`,
  };

  return {
    [`records/fixtures/${IDS.controlsAuthored}.json`]: controlsAuthoredSet,
    [`records/fixtures/${IDS.controlsGenerated}.json`]: controlsGeneratedSet,
    [`records/fixtures/${IDS.ambiguousAuthored}.json`]: ambiguousAuthoredSet,
    [`records/fixtures/${IDS.ambiguousGenerated}.json`]: ambiguousGeneratedSet,
    [`records/fixture-plans/${IDS.controlsPlan}.json`]: controlsPlan,
    [`records/fixture-plans/${IDS.ambiguousPlan}.json`]: ambiguousPlan,
  };
}

export const serialize = (record) => `${JSON.stringify(record, null, 2)}\n`;

function main(argv) {
  const check = argv.includes("--check");
  const target = join(repoRoot, "records/fixtures", `${IDS.controlsGenerated}.json`);
  if (check && !existsSync(target)) {
    console.error(`FAIL: ${target} does not exist`);
    return 1;
  }
  const existing = existsSync(target) ? JSON.parse(readFileSync(target, "utf8")).origin.generator.sourceRevision : undefined;
  const resolved = resolveSourceRevision({ argv, existing, check });
  if (resolved.error) {
    console.error(resolved.error);
    return 2;
  }
  const sourceRevision = resolved.value;
  const records = buildRecords({ sourceRevision });
  let bad = 0;
  for (const [path, record] of Object.entries(records)) {
    const text = serialize(record);
    const file = join(repoRoot, path);
    if (check) {
      if (!existsSync(file) || readFileSync(file, "utf8") !== text) {
        console.error(`DIFFERS: ${path}`);
        bad++;
      }
    } else {
      writeFileSync(file, text);
      console.log(`wrote ${path}`);
    }
  }
  if (check) console.log(bad ? `FAIL: ${bad} record(s) differ from the generator output` : `OK: ${Object.keys(records).length} records equal the generator output`);
  return bad ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)));
