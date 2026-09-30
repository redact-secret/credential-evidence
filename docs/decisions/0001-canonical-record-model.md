# 0001. Canonical record model

- Status: accepted
- Date: 2026-09-30
- Issue: #2 (part of #1)

## Context

Credential knowledge currently lives inside `redact-secret/redact-secret-benchmarks`
(revision `ade8a10bd7922765110a68986b0690eb3861f2e5`): provider dossiers
(`benchmarks/support/dossiers/*.md`), `taxonomy.json`, category corpora,
`fixture-index.json`, `fixture-semantics.json`, `fixture-detectors.json`,
`known-gaps.json` and `review-ledger.json`. Those files mix three things this
repository must keep apart: credential facts, scanner and product interpretation
(detector ids, `stable`/`provisional`/`pending`), and measurement state.

The canonical model has to hold the facts and their provenance so that a
consumer needs no Redact Secret knowledge to read them
(`ARCHITECTURE.md`, "Architectural invariant").

## Decision

Nine record kinds, each with a JSON Schema (draft 2020-12) under
`schemas/v1/`. Every record carries `schemaVersion` (integer) and `kind`;
every schema closes its root with `additionalProperties: false`.

| Kind | Owns | Mutability |
| --- | --- | --- |
| `provider` | issuer identity, aliases, homepage | mutable descriptive |
| `family` | root semantic entity `<provider>:<family>`, research state, pointer to the current contract | mutable descriptive |
| `format-contract` | one revision of a family's format facts `<family>@<n>`, claims with evidence class and observed-at | immutable once `reviewed` |
| `evidence-source` | one external source, its pin, an append-only observation log | append-only |
| `variant` | named historical/regional/rotated forms with an append-only change history | append-only history |
| `benign-sibling` | public identifiers, placeholders, test vectors, lookalikes | mutable, evidence-dated |
| `case` | authored unit of reasoning, scanner-neutral expectation, relations | mutable text, expectation changes are logged in review history |
| `fixture-projection` | executable projection or generated variant with origin and lineage | derived, regenerable |
| `evidence-review-history` | append-only events about one subject record | append-only |

### Root entity and no scanner fields

The family is the root. There is no detector, support status, tier-as-status or
score field anywhere in a canonical schema. A test walks every schema and fails
if a property named `supportStatus`, `status`, `detector*`, `stable`,
`provisional` or `pending` is declared, required, or offered as an enum value.

Detector ids, product issue links and similar pointers may appear only in the
optional `externalRefs` array (`{system, id, url?, note?}`). It is informational,
never part of identity and never consulted to interpret a record.

### Multiple contracts per family

A family has any number of `format-contract` records, one per revision, each
with a `period` (`current`, `historical`, `proposed`), a `validity` range and a
`supersedes` link. The family's `currentContract` names the present revision or
is `null`. Older revisions stay resolvable, so a retired format keeps its
evidence. A case may pin itself to a specific revision through
`families[].contract`.

### Cases and families are many-to-many

The relation lives on the case (`families[]` with a `role`: `subject`,
`lookalike`, `context`, `companion`). Families do not list their cases, so there
is a single place to write. A case with no family must give `unscopedReason`
(this preserves the legacy `unscopedReason` rule). A `cross-family` case needs at
least two families. Twins, mutations and metamorphic pairs are explicit case
`relations`.

### Scanner-neutral expectation vocabulary

`expectation.outcome` is one of:

- `must-flag`: the value is a credential; a scanner that does not report it misses it.
- `must-not-flag`: the value is not a credential; a report is a false alarm.
- `may-flag`: the evidence supports neither; either behaviour is acceptable.
- `not-assertable`: no expectation can be stated from the evidence.

`expectation.basis` is the evidence class: `provider-documented`,
`tool-corroborated`, `project-policy` or `unresolved`. These describe how the
expectation is supported and are not aliases of any product status.
`unresolved` forces `not-assertable`, and the two supported classes require at
least one source. A scanner majority or output is never a basis.

### Fixtures are projections

A `fixture-projection` has an `origin` of exactly one type: `authored-case`,
`reviewed-contract`, or `generation-rule` (generator name, version, inputs, seed).
`generated` must be `true` exactly for `generation-rule`. `lineage` records
twin/mutation relations at fixture level. Content is referenced by path and
`sha256`, never embedded. The validator checks that a fixture's expected outcome
equals its authored case's outcome. Expected spans are UTF-8 byte offsets, start
inclusive, end exclusive, empty for `must-not-flag`.
An `imported` block records legacy provenance pinned to a commit.

## Legacy representability

| Legacy artifact | Canonical representation |
| --- | --- |
| `taxonomy.json` providers[] | `provider` |
| `taxonomy.json` families[] (`id`, `name`, `description`, `sources`, `note`) | `family`, `format-contract` claims, `evidence-source` |
| `taxonomy.json` `detectors[]`, `supportStatus` | `externalRefs` on the family; `supportStatus` dropped (product-owned) |
| dossier `research.verdict` (`unresearched`/`ready`/`issuance-gated`/`date-gated`/`not-found`/`rejected`) | `family.research.state` (`unresearched`/`researched`/`not-found`/`rejected`) plus `blockers[]` for the gated verdicts |
| dossier `research.tier` T0..T3 | evidence class: T1 `provider-documented`, T2 `tool-corroborated`, T3 `project-policy`, T0 `unresolved` |
| dossier `sources`, `evidence`, `researchedAt`, `issues` | `evidence-source` records, pinned links, `research.researchedAt`, `research.issues` |
| corpus `assessment.kind` `must-redact` / `must-not-flag` / `policy` | outcome `must-flag` / `must-not-flag` / outcome from the spans with basis `project-policy` |
| corpus `expected[]` spans (`role`, `envelope`, `note`) | `fixture-projection.expected.spans` (envelope to be added additively when #4 needs it) |
| corpus `twinOf`, `mutation`, `mutationKind` | case `relations` and fixture `lineage` |
| `fixture-index.json` slug, `familyIds`, `scenarioIds`, `unscopedReason`, `provenance` | fixture `id`, case `families`, case `scenarios`, `unscopedReason`, `imported` |
| `fixture-detectors.json` | `externalRefs` only |
| `known-gaps.json` history (`observed`, `reviewed`, `promoted`, `fixed`) | `evidence-review-history` events `observed`/`reviewed`; `promoted` and `fixed` are product workflow and survive only as `externalRefs` on an event |
| `review-ledger.json` entries (`open`, `resolved`, `not-assertable`, `note`) | events `disputed`, `resolved`, `not-assertable` verdict, `note`; run ids as `externalRefs` |
| measured counts, stage, `stable`/`provisional`/`pending` | not represented; derived downstream |

`examples/valid/legacy-import/` shows the AWS access key path end to end,
including the optional detector mapping.

Lossy points, decided on purpose: the T0 to `unresolved` mapping merges
"pending" tier with unresolved evidence; `envelope` spans and `contextAxis` are
not modelled yet and will arrive as additive optional fields when the
case/fixture import (#4) needs them; product-only fields (`candidate`,
`promotion`, `fix`, scores) are outside the boundary and remain in the
benchmark repository.

## Consequences

- A consumer can read a record without knowing any scanner.
- Legacy projections (#6) become generated views over these records.
- The model is larger than a flat corpus; the validator, not convention, carries
  the cross-record rules.

## Open questions

- A controlled vocabulary for `scenarios` (legacy has five ids); v1 leaves it free-form.
- Whether to model `may-flag` policy tolerance separately from an evidence-based
  `not-assertable`.
- Canonical directory layout under `records/` is decided in #3 and #4; the
  validator scans `records/` and `examples/valid/` and does not depend on filenames.
