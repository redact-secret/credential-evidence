# 0012. Cutover decisions 1 to 4

- Status: accepted
- Date: 2026-10-01
- Issue: #20 (follow-up to epic #1)
- Amends: ADR 0002 (schema revision 1.5.0, additive), ADR 0005 and ADR 0008 (fixture-set items gain a per-fixture family override and a non-asserting candidate reading), ADR 0006 and ADR 0009 (what the legacy projection and the credential-eval snapshot carry for these fields)
- Evidence: `docs/migration/cutover-decision-brief.md` (options, measured impact, recommendations), `docs/migration/dual-run-report.md`, `docs/migration/parity-report.md`

## Context

`docs/migration/cutover.md` listed six open maintainer decisions before downstream consumers switch to generated inputs. The decision brief laid out the options and a recommendation for each. The maintainer accepted the recommendations for decisions 1 to 4. Decision 5 (re-pin) is deferred. Decision 6 was already settled in ADR 0009.

All four decisions are about **evidence**: which evidence class a fixture's expectation has, and which spans, family links and identities the canonical data carries. None of them is about **product support status** (stable, provisional, pending) of Redact Secret or any other scanner. Support status is qualification policy, owned by `redact-secret-benchmarks` (the `taxonomy-support-status` overlay). A change recorded here does not by itself promote or demote any family for any product ([evidence classes](../governance/evidence-classes.md#evidence-class-and-product-support-status)).

## Decision

### 1. Evidence-tier downgrades: accept the canonical T3

343 fixtures that legacy holds at tier T2 are recorded as `project-policy` and project as T3 (253 `must-not-flag` controls, 90 positives that project as `policy`). The importer applied `docs/governance/evidence-classes.md`: their cited sources do not include artifacts from two distinct owners, or have no provider-owned source.

- **Accepted (option B):** the canonical tier stands. Nothing in the records, the projection or the parity rules changes.
- **Restoration only through evidence review (option A, backlog):** a fixture returns to T2 only when a reviewed change to the evidence it cites meets the `tool-corroborated` bar. One evidence-review issue per affected family: 32 families, issues #41 to #72, each listing its fixtures, the current sources and what would meet the bar, and pointing to the `research-family` skill. A fixture of several families appears in each of its families' issues. 7 of the 343 fixtures have no family (provider-neutral controls of the Cases `early-benign-inputs`, `base64-of-public-text` and `hashes-commit-ids-and-uuids`); they have no family issue, and a review of them goes through those Cases.
- **Rejected (option C):** declaring the legacy tier authoritative with a recorded exception per family. It contradicts the evidence-class rule for exactly these fixtures.

### 2. Unresolved (T0) candidate spans: keep them as non-asserting data

The 31 legacy `must-redact` fixtures at T0 had candidate spans that the import dropped. They are now kept on the fixture-set item as `candidateReading`:

```json
"expected": { "outcome": "not-assertable", "spans": [] },
"candidateReading": { "asserting": false, "outcome": "must-flag", "spans": [ { "start": 13, "end": 53, "role": "secret" } ] }
```

- The fixture stays `not-assertable` with no expected spans. T0 stays not assertable: a candidate reading is never pass or fail, never scored, and never becomes an expected span anywhere. `asserting` is the constant `false` so that no consumer can read it otherwise.
- The schema allows `candidateReading` only on a `not-assertable` fixture. The validator checks that its spans lie inside the content, are sorted and disjoint, and that a `must-flag` reading has a secret span.
- **Legacy projection:** a fixture with a candidate reading projects as legacy kind `must-redact`, tier T0, with the candidate spans as its legacy spans, which is what legacy recorded. Its twins keep their twin fields, because their positive has a secret span again.
- **credential-eval snapshot:** its frozen v1 input contract (`schemas/corpus-snapshot-v1.schema.json` in credential-eval) has no field for non-asserting spans: `expected` is the authored truth and every object is closed. So the candidate spans are **left out of the snapshot**. The case stays T0 with no expected span. Its `grouping.kind` is the kind the candidate proposes (`must-redact`), which credential-eval reads only as the pending kind of a T0 case (`pending/T0.candidate_kinds`) and never scores. The snapshot still validates against that schema. Twins of these cases still carry no `twin` field in the snapshot, because the contract requires the paired case to have an expected secret span.
- **Materialized manifest:** entries carry `candidateReading` next to their empty expected spans (same manifest format version 2; materializer 2.1.0).
- Out of scope: the one non-T0 `must-not-flag` fixture whose companion spans were dropped (`beta8-209--confluent-cloud-api-secret-secrets-manager-json-alphabet-twin`). A silent control asserts no secret, so it stays as before and remains an explained parity difference.

### 3. Fixture-index identity digests: one-time re-key at the switch

`identity.digest` and the three source digests of the projected `benchmarks/fixture-index.json` differ from legacy by design and are self-consistent. `redact-secret-benchmarks` re-keys once, in the same pull request that switches it to generated inputs: it recomputes and stores the projected digests, and re-keys stored per-fixture results by canonical id through `credential-eval/legacy-id-map.json`. This repository publishes no digest translation table and changes nothing for this decision. The work belongs to `redact-secret-benchmarks`.

### 4. Per-fixture family links: an additive override on fixture-set items

Since stage B, a fixture of a Case that spans several families carried the union of the Case's families. That gave 35 fixtures 87 family links the legacy index did not give them. A fixture-set item that projects a Case may now carry `families`: the families of its Case that this fixture is an instance of.

- Additive and local to the 35 fixtures. The Cases are unchanged and keep the families they were authored with (ADR 0007 criteria). Nothing is split.
- Every id must be a family of the Case, and the list must differ from the Case's set. The validator checks both. An empty list means the fixture is an instance of none of them and requires `unscopedReason`. 4 of the 35 are global controls that legacy left unscoped.
- The importer emits the override from the legacy per-fixture family reading. The exporter, the parity predicates, the credential-eval snapshot (`grouping.family`) and the materializer read the override when it is present and the Case's families otherwise.

### 5. Re-pin: deferred

No change to `LEGACY_REVISION` (`ade8a10bd7922765110a68986b0690eb3861f2e5`). The brief's recommendation (joint pin at `c403475` now, re-pin at the switch with a legacy evidence freeze) stays open.

## Schema revision 1.5.0

Additive per ADR 0002. Fixture-set items gain three optional properties: `families`, `unscopedReason` (only with an empty `families`) and `candidateReading` (only on a `not-assertable` fixture). Every v1 schema now carries revision 1.5.0. Existing records stay valid unchanged. A record without these properties means what it meant before.

## Consequences

- Parity at the pin `ade8a10`: 0 unexplained before and after. Explained differences go from 28,448 to 28,091, identical leaf values from 173,505 to 173,657. The seven rules that only excused the dropped T0 kind and spans, the twins of unresolved positives and the Case-level family union no longer match anything, so they were removed, with the two predicates only they used (28 rules to 21). The span rule's predicate now excuses a T0 fixture only when it has no candidate reading. No rule was added.
- The credential-eval snapshot changes content: 31 T0 cases are `must-redact` (pending) instead of `must-not-flag`, and 34 cases change `grouping.family`. Its corpus digest changes accordingly. The dual-run report predates this ADR and was not re-run. Its decision 2 and decision 4 differences are expected to shrink (the T0 candidate kinds and `measurable_share` match legacy again; the family readings of the 35 fixtures match legacy). Per-case measurement was already identical.
- Gap 3 of the brief ("T0 candidate kind and spans not recoverable from the projection") is closed for the legacy projection. For the credential-eval snapshot, the candidate kind is carried and the candidate spans are not.
- Decisions 1 and 3 need no code here. Decision 1's restorations arrive through issues #41 to #72. Decision 3 is done in `redact-secret-benchmarks`' switch pull request.

## Open questions

- Whether credential-eval should ever gain a non-asserting span field in a later snapshot contract version. That is credential-eval's decision. Until then the spans stay in the records, the projection and the materialized manifest.
