# 0007. Identity correction: no migration coordinates, Scenarios and fixture plans

- Status: accepted
- Date: 2026-09-30
- Issue: #12 stage A (part of #1, correction)
- Partly supersedes: ADR 0001 (cases, fixture identity), ADR 0005 (case grouping, collection-slug ids and paths). Extends ADR 0002 (id rules).

## Context

#4 imported the legacy suites as canonical Cases keyed by `[suite, shape, role, outcome, tier]` (ADR 0005). The result:

- Legacy coordinates became canonical identity: `records/cases/beta8-207/`, `records/fixtures/beta8-207.json`, case ids such as `beta8-207-atlassian-api-token-control-placeholder`, and fixture ids `<suite>--<name>`. Migration provenance was used as a namespace.
- Evidence tier participated in identity: one case per shape, role and legacy tier.
- 1,811 of the 1,925 imported "cases" are template-generated prose: benchmark-matrix cells (family x control type), not units a person reasoned about.

ADR 0002 already said an id must not contain a date, a scanner or detector name, or a release name, but it did not cover suite, milestone, issue or migration-source coordinates, it did not say what a Case is, and the #4 acceptance criteria did not test either. This ADR closes those gaps. It changes no existing record; stage B of #12 reclassifies and renames the imported data.

## Decision

### 1. Canonical identity carries no coordinates

The canonical id of a `scenario`, `case`, `fixture-plan` or `fixture-set` record, the id of each fixture inside a set, and the repository path of every such record MUST NOT contain:

- a legacy suite name (`accuracy`, `negative-controls`, `reference-syntax` ... the list is in `scripts/lib/identity.mjs`);
- a beta, milestone, issue or pull-request coordinate (`beta8-207`, `milestone-6`, `issue-254`, `redact-secret-101`);
- a release coordinate (`rc2`, `release-3`);
- a detector identifier or a scanner name (`detector`, `trufflehog`, `gitleaks` ...);
- any migration-source coordinate (the legacy repository, path or revision).

Provenance lives in exactly two places and nowhere in identity:

- `externalRefs` (and, on fixture sets, the `imported` block) on the record itself;
- `migration/legacy-map.json` (new kind `legacy-map`), which maps every legacy suite, case and fixture to the canonical record that carries it, or to `null` with a reason. It is what lets the compatibility exporter regenerate legacy names and lets a consumer trace all 5,925 fixtures.

Enforced by the identity lint (`npm run lint:identity`, also run by `npm run validate` and CI). The patterns are heuristics for coordinates, not a dictionary of good names: a clean id is not thereby a good id.

### 2. Evidence tier and basis do not participate in identity

Evidence basis (`provider-documented`, `tool-corroborated`, `project-policy`, `unresolved`) and the legacy tier T0..T3 are data: `expectation.basis` on a case, `evidenceBasis.basis` on a scenario, and the review history. They are never part of an id, a path, a grouping key or a record split. ADR 0005's "one case per shape, role and evidence tier" is withdrawn: a shape whose evidence improves changes its `basis` through a review-history event; it does not get a sibling record. (Whether several imported cases that differ only in basis merge is the ADR 0005 open question; stage B answers it.)

### 3. Case, Scenario, fixture plan and fixtures

| | Case | Scenario | Fixture plan (matrix projection) | Fixture / fixture set |
| --- | --- | --- | --- | --- |
| What it is | one real reasoning unit: a specific situation someone analysed | one reusable semantic scenario with a single meaning across families | a declared family x Scenario (or Case) cross product with a generation rule | executable content |
| Reasoning lives here | yes, authored per case | yes, once, for every applicable family | no: it points at the Case or Scenario that carries it | no |
| Family specific prose | yes (`summary`, `rationale`) | no (applicability lists families or classes) | no | no |
| Outcome | `expectation.outcome` | `expectedOutcomeClass` (or `by-projection`) | per cell, must agree with its target | per fixture, must agree |
| Count scales with | judgement calls | distinct meanings (tens) | nothing canonical: derived | content |

What deserves to be a **Case**: all of the following.

1. A reader can state a failure mode or ambiguity specific to it: partial-span leakage, reference versus literal, public identifier versus secret, a chunk boundary, a retired format still in a config.
2. Its `summary` and `rationale` cannot be produced by substituting family, carrier or provider names into a template.
3. Removing it would lose a distinct expectation: no Scenario together with a family list reproduces it.
4. Its expectation has its own evidence, or an explicit project-policy decision someone made.
5. It can be named without a coordinate.

What deserves to be a **Scenario**: a named semantic situation (documentation placeholder, prefix near miss, wrong alphabet, public identifier, templated reference) where the same sentence of reasoning holds for every family it applies to, and differs between families only by the family's own name, prefix or length. A scenario is written once; it lists the families (or free-slug family classes) it applies to and carries the evidence basis for the class.

What is a **matrix projection** (a `fixture-plan`): a cell whose only family-specific content is mechanical. A plan declares the cross product, the generation rule and generator, the records it reads as inputs, its lineage (authored, or reclassified from named cases), and optionally the fixture sets that record its output. The per-cell prose the legacy import generated from role templates is not stored; it is derivable from the target and the family.

Decision order when classifying an existing or proposed record: start at Case, fall to Scenario if criterion 2 or 3 fails and the reasoning is shared, fall to a matrix projection if the cell adds nothing beyond the target and a family.

`fixture-projection` and `fixture-set` are unchanged in meaning. A fixture still projects exactly one case today; letting a fixture project a scenario cell (through a plan) is part of stage B.

### 4. Schema revision 1.2.0 (additive)

Within major version 1; every existing record stays valid without change.

- `scenario`: `id`, `title`, `description`, `semantics`, `expectedOutcomeClass` (`must-flag`, `must-not-flag`, `may-flag`, `not-assertable` or `by-projection`), `applicability` (`any-family`, `families` or `family-classes`, with a rationale), `evidenceBasis` (basis, rationale, sources, observed-at, same rules as a case expectation), `lifecycle`, `supersededBy`, `externalRefs`, `notes`.
- `fixture-plan`: `matrix` (`families`: `listed` ids or `all-applicable`; `targets`: scenario or case, with an `expectedOutcome` when the scenario is `by-projection`; `carriers`), `generation` (rule, generator, inputs, seed), `lineage` (`authored` or `reclassified-from-cases`, `derivedFrom`), `output` (fixture sets), `lifecycle`.
- `legacy-map`: `source` (repository and pinned revision) and `entries` of `{ legacy: { type: suite|case|fixture, id, path }, canonical: { type, id } | null, relation: same|merged|reclassified-as-scenario|reclassified-as-projection|dropped, note }`.
- `evidence-review-history.subject.kind` accepts `scenario` and `fixture-plan`.
- All schema files move to revision 1.2.0 (one revision per major, ADR 0002). The legacy projection manifest and parity report are regenerated; parity stays at 0 unexplained.

Cross-record checks added to the validator: scenario families and sources resolve; plan targets, families, inputs, derivations and outputs resolve; plan outcomes agree with their target; a listed family lies inside a listed scenario applicability; every legacy-map canonical target exists and legacy entries are unique. `migration/` is validated together with `records/`.

### 5. The lint has a shrinking baseline until stage B (removed by ADR 0008)

The 1,992 imported cases and fixture sets (all of them) violate the rule today. Stage A lands the rule first, so `scripts/lint/identity-baseline.json` lists each violating record with its violation codes (tracked in #12, stage B removes every entry). The baseline is machine-checked to be non-growing: a new violating record, a baselined record that gains a violation code, and a baselined record that no longer violates (fixed, renamed or deleted) all fail `npm run lint:identity` and `npm run validate`. `npm run lint:identity -- --shrink` removes fixed entries and refuses to add any. Stage B is done when the baseline is empty, at which point the file and the `--shrink` mode are deleted.

## Consequences

- No record can be added with a legacy coordinate in its id or path, before or after stage B.
- Existing records, projections and parity are unchanged by stage A. The 1,925 cases are not renamed or reclassified yet (stage B: report first, then semantic ids, then the compatibility exporter reads the map, then parity re-run and the credential-eval dual-run).
- Legacy fixture-id preservation ("kept verbatim", ADR 0002 and 0005) is withdrawn for canonical ids: the legacy form survives only in `migration/legacy-map.json` and in the exporter's output.
- Scenario applicability by free-slug class is weaker than by family list until a family-class vocabulary exists.

## Open questions

- A controlled vocabulary for family classes (for example `fixed-length-prefixed-token`) so `family-classes` applicability and `all-applicable` plans can be checked by the validator instead of trusted.
- Whether `case.scenarios[]` (free tags) should become references to `scenario` records, and whether a fixture-set item may point at a plan cell instead of a case (stage B).
- The suite-name list in the lint is static; whether future suites of the legacy repository (it is 17 commits ahead of the pin) need additions.
- Merge policy for cases that differ only in legacy tier (ADR 0005 open question) and the threshold between Case and Scenario for borderline shapes; stage B's report should surface counts before any rename.
