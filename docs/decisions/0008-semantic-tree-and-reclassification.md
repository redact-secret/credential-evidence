# 0008. Semantic tree, reclassification and per-fixture evidence

- Status: accepted
- Date: 2026-09-30
- Issue: #12 stage B (part of #1, correction)
- Amends: ADR 0007 (section 5: the identity baseline is gone; section 4: schema revision 1.3.0). Answers the ADR 0005 and ADR 0007 open questions on merging by tier, `case.scenarios` and fixtures that project a plan cell. Partly supersedes ADR 0005 (fixture-set layout, per-suite sets, case grouping).

## Context

Stage A (ADR 0007) stated the criteria for a Case, a Scenario and a matrix projection and added the lint and the records. It changed no imported data: 1,925 template-worded "cases", 67 fixture sets named after legacy suites, and 1,992 records that violate the identity rule. Stage B reclassifies that data, restructures the tree, writes the legacy map and removes the baseline. The numbers and the per-rule justification are in `docs/migration/reclassification-report.md`; this ADR records the decisions.

## Decision

### 1. Reclassification is a deterministic function of structure

`npm run migrate:cases` reads only the pinned legacy revision and the committed taxonomy records, groups each suite's fixtures exactly as the first import did (suite, shape, role, outcome, tier: the "imported cases", kept only as migration input) and classifies each group with the first rule that applies:

| Rule | Class | Applies to |
| --- | --- | --- |
| `unsettled-evidence` | matrix projection | legacy tier T0 (nothing is asserted) |
| `carrier-scenario` | Scenario | hand-written narrative about a carrier or input edge |
| `authored-case` | Case | hand-written narrative about a failure mode specific to it |
| `twin-projection` | matrix projection | one-property twin, in any suite |
| `control-projection` | matrix projection | benign control of a family (per control type) |
| `positive-projection` | matrix projection | documented-format positive of a family |
| `lookalike-projection` | matrix projection | benign lookalike of a family |

Two name tables are the authored part (carrier groups in `classify.mjs`, the groups each Case carries in `authored/cases.mjs`); the run fails if a legacy group matches no rule, if a table entry matches no group, or if a scenario's outcome class contradicts the group's outcome. Result: 1,925 legacy cases become 52 Cases, 29 Scenarios (10 carrier scenarios, 17 role scenarios, 2 cross-cutting themes that Cases reference) and 5 fixture plans.

Borderline decisions, deliberately stated:

- The nine context-edges carrier groups and the four token-contexts carriers are Scenarios: their prose is about the carrier and holds for every format (ADR 0007 criterion 3 fails).
- Twins are projections even in hand-written suites. A Case has no `twin-of` relation to a projection; the twin's lineage is the fixture's.
- A positive group and its benign counterpart stay two Cases: a Case has one outcome, and the pair is the reasoning (an exemption and its boundary).
- Reasoning stated in two suites is one Case (code expressions, secret-manager pointers, template expressions, interpolation, literals under generic names).

### 2. Evidence tier is data on the fixture, never identity; tier-only differences merge

The first import split a shape into up to three cases by legacy tier. Those merge: 120 shapes differing only in tier, 246 first-import cases. The tier, re-expressed as a canonical basis by the same mechanical rules as the first import (T2 without two distinct owners is `project-policy`, and so on), is carried by the fixture's **evidence entry**: basis, reason (the legacy assessment reason, collapsed to the most common one of its group), sources and observed-at. A Case (or Scenario) states the **weakest** basis its fixtures share; a fixture whose evidence is stronger says so on its own entry. This answers the ADR 0005 open question: no merge waits for a reviewer, because the merge loses nothing.

### 3. The tree

```
records/scenarios/<scenario>.json       29: one per semantic scenario, written once
records/cases/<case>.json               52: hand-authored reasoning units; no suite directories
records/fixture-plans/<plan>.json       5: family x scenario matrix projections (sparse)
records/fixtures/<provider>.json        98: fixture sets by provider (authored-<provider>, cross-provider, provider-neutral)
migration/legacy-map/<suite>.json       67 shards: every legacy suite, imported case and fixture -> canonical
```

Sets are organised by the provider of the fixture's family, authored and generated never mixed. A set item projects a Case (`case`) or a plan cell (`cell: { plan, scenario, families }`), exactly one; it carries its evidence key, its lineage (`twin-of`, re-keyed to canonical ids) and, for a cell (which has no record to hold them), its historical incidents. Fixture ids are `<set>--<name>`, where name is the legacy fixture name with any migration coordinate removed (and a deterministic suffix on collision); the materialized path is `<name>/<original file name>` so file names and extensions that scanners may key on survive. The legacy fixture id exists only in the map.

### 4. Schema revision 1.3.0 (additive; one revision per major)

- `fixture-set`: optional `evidence` map (key to basis, reason, sources, observed-at); items gain optional `cell`, `evidence`, `incidents`; `case` becomes optional (exactly one of `case` and `cell`). `imported` stays allowed and is unused.
- `fixture-plan`: `matrix.coverage` (`complete` or `sparse`).
- `legacy-map`: `canonical` may list several records (a suite, or a case that became a scenario and a plan cell); `legacy` gains `title`, `description` (a suite's legacy text) and `scenarioIds` (the legacy navigation labels of a fixture); the map may be sharded, a legacy entity is unique across shards.
- `case.scenarios[]` are references to scenario records. The JSON shape is unchanged (slugs); the **validator** now requires each to resolve. Migration note: a case that carried free navigation tags must either gain scenario records for them or drop them; the examples did the latter.
- Validator additions: cell plan, scenario, families, outcome and output sets agree; evidence keys resolve, are used, and `unresolved` evidence requires `not-assertable`; every legacy-map canonical target exists.
- Existing 1.1 and 1.2 records stay valid, except a `scenarios` tag that resolves to no scenario record.

### 5. Family classes are not introduced

ADR 0007 asked for a controlled family-class vocabulary so `family-classes` applicability and `all-applicable` plans can be checked. After reclassification no scenario needs one: all 29 are `any-family` (their reasoning is independent of the family) and every plan lists its families, because the instantiated matrix is sparse and the list is the record of it. A vocabulary that nothing consumes would be unvalidated guesswork; the open question stays open for when a scenario that applies to a class, not to any family, appears (`all-applicable` remains valid for such a plan and is checked against listed applicability only).

### 6. The identity lint has no baseline

`scripts/lint/identity-baseline.json`, `--shrink` and the non-growing check are deleted. Every violation fails, in `npm run lint:identity`, `npm run validate` and CI. The lint now also covers a set item's materialization path. 1,992 violating records became 0.

### 7. The compatibility exporter and the parity harness read through a legacy view (minimum adapter)

> Replaced by ADR 0009 (stage C): `view.mjs` is deleted; the legacy map is a first-class exporter input joined in one module, and the credential-eval snapshot is in canonical names. The bullets below describe stage B only.

Stage C reworks the exporter. Stage B only keeps it running: `scripts/export/lib/view.mjs` joins each canonical fixture to its legacy suite, id, corpus path and navigation scenario ids through the map, and the exporter and parity read records through it. What changed, honestly:

- Projected categories are the 67 legacy suites (from the map); canonical sets are by provider.
- A legacy `group` is the canonical Case id, or for a cell the Scenario id (parity rule predicate renamed `value-is-target-id`).
- A legacy `assessment` (kind, tier, reason, sources) comes from the fixture's own evidence entry, so tiers and reasons are as before.
- A cell's families are exact, so fixtures that gained family links fell from 459 (1,066 links) to 35 (87), all in Cases. Citation unions are now per evidence entry (same 824 leaf values).
- Legacy scenario navigation ids come from the map, not from canonical records (they are legacy data; stage C decides what replaces them).
- The credential-eval snapshot keeps legacy fixture ids and legacy materialized paths (`<suite>/<path>`) as ids and paths so the dual run needs no re-keying before stage C; its `grouping.group` is the new Case or Scenario id. The exporter generator is 1.1.0.
- Parity: 0 unexplained, 28 rules all matched (was 30,402 explained leaf values, now 28,448).
- Materialization manifest format version 2: `target` (`case` or `scenario` with its plan), `basis`, and `case` only for Case fixtures.

## Consequences

- No canonical id, path or fixture id carries a coordinate; the lint proves it on every change.
- A reader meets 52 Cases they can read, not 1,925 they cannot: the prose of a Case is hand-authored, the prose of a Scenario is written once, and the matrix is a plan, not a file per cell.
- The first-import case ids survive only as `legacy.id` in map entries of type `case` (their path is the file the first import wrote, now deleted).
- Per-fixture evidence costs one map per set; 1,178 distinct evidence entries serve 5,925 fixtures.

## Open questions

- Family classes (section 5).
- Whether a Case may carry fixtures stronger than its basis, or should state the set of bases (today: the weakest, with each fixture's own entry).
- The evidence reason of a fixture is the legacy assessment reason, collapsed; a reviewer may want a per-Case, authored expectation reason to replace it once evidence is reviewed.
- Legacy navigation scenario ids live in the map; whether the exporter should derive them from canonical records (answered by ADR 0009: no, they stay map-only legacy data; Scenarios are the canonical navigation).
- Generators still live in the legacy repository (ADR 0005); the plans record their entrypoint and revision, not code.
