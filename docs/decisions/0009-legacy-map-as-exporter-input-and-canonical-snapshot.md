# 0009. The legacy map as the exporter's input, legacy navigation ids, and the canonical credential-eval snapshot

- Status: accepted
- Date: 2026-09-30
- Issue: #12 stage C (part of #1, correction)
- Amends: ADR 0006 (exporter inputs, credential-eval snapshot ids), ADR 0008 section 7 (the stage B adapter is replaced). Answers the ADR 0008 open question on legacy navigation scenario ids and the ADR 0006 open question on whether credential-eval wants the projection or the materialized tree.

## Context

Stage B (ADR 0008) removed every legacy coordinate from canonical ids and paths and kept the compatibility exporter running through `scripts/export/lib/view.mjs`, a "minimum adapter" that mixed canonical fixture facts and legacy names in one object and let the parity harness read both. Stage C makes the dependency explicit and closes the remaining questions: where do legacy names come from, what replaces the legacy navigation scenario ids, and in which names does credential-eval read the snapshot.

## Decision

### 1. `migration/legacy-map` is a documented input of the exporter; legacy names are regenerated only from it

```
records/**            canonical records (no legacy name anywhere)
migration/legacy-map  legacy suites, fixture ids, corpus paths, navigation scenario ids  ->  canonical fixtures
scripts/export/legacy-vocabulary.json   definitions of the five navigation scenarios and the few fixed facts of the legacy file shapes
```

The exporter has three explicit steps, each in one module:

| Step | Module | Knows |
| --- | --- | --- |
| Flatten canonical fixtures | `scripts/export/lib/fixtures.mjs` | canonical ids, paths, Case or Scenario, the fixture's own evidence; no legacy name |
| Join the legacy names | `scripts/export/lib/legacy-map.mjs` | the map; nothing else reads a map entry |
| Build the legacy shapes and the snapshot | `scripts/export/lib/projection.mjs` | the joined catalog (`{ slug, suite, name, legacyPath, scenarioIds, fixture }`) |

`view.mjs` is deleted. `loadCanonicalInputs` returns `records` and `legacyMaps` as separate inputs (`migration/` may hold only `legacy-map` records and `records/` none; the loader refuses otherwise) and the source digest still covers both, so a change to either changes the projection stamp. The join is strict in both directions and fails loudly instead of omitting: a canonical fixture with no legacy name, a legacy name for a fixture no set contains, a legacy name claimed twice, two legacy fixtures for one canonical one, a suite that names no fixture, shards naming different legacy sources, a navigation scenario that is not in the vocabulary, and a vocabulary entry that no fixture uses are each an error. A test forbids any other exporter or parity module from reading `legacy-map` entries. The parity harness gets the catalog from the projection; it no longer builds a peer object from the view.

### 2. What replaces the legacy navigation scenario ids

The five legacy navigation ids (`credential-shape-grammar`, `context-and-encoding`, `benign-controls-and-twins`, `cross-family-interactions`, `regression-behavior`) are **not canonical and have no canonical counterpart**. Canonically, what a fixture exercises is stated by:

- the **Scenario** record its Case lists in `case.scenarios[]`, or the Scenario its plan cell projects (`cell.scenario`): 29 semantic scenarios, each one meaning, written once (ADR 0007, 0008);
- the **family** links of the Case or cell;
- the **fixture lineage** (`twin-of`) and its outcome.

The legacy ids are reproduced for a legacy consumer only, as data of the map: `legacy.scenarioIds` on each fixture entry (11,941 links for 5,925 fixtures), with their titles and descriptions in `legacy-vocabulary.json`. They stay out of `records/` (a test checks that none of the five strings occurs in any canonical record, that the map uses exactly the vocabulary's five, and that every map id is defined there).

Alternatives considered and rejected:

- Promote them to Scenario records. They mix axes (a shape, a carrier, a benign population, a cross-family property, and `regression-behavior`, which is a release or issue coordinate), so each would be a grab bag that fails ADR 0007 criterion 2, and one of them is exactly the kind of coordinate the lint rejects.
- Derive them from canonical data by rule. The legacy assignment is hand-reviewed per fixture (two scenarios on most fixtures); any derivation would be a heuristic that parity would then have to excuse, which is the blanket allowlisting this repository refuses.
- Drop them from the projection. The legacy `fixture-semantics.json` and `fixture-index.json` require `scenarioIds`; dropping them breaks the legacy consumers the projection exists for.

A consumer that wants navigation in the canonical model uses Scenarios; nothing in canonical data needs the legacy five.

### 3. The credential-eval snapshot is in canonical names; legacy ids ride in a sidecar generated from the map

`credential-eval/corpus-snapshot.json` (`credential-eval/corpus-snapshot/v1`) now uses:

| Field | Value |
| --- | --- |
| `cases[].id` | the canonical fixture id (`<set>--<name>`) |
| `cases[].path` | the materialized path (`<set>/<name>/<file>`), byte for byte the ADR 0005 materialized tree |
| `grouping.group` | the canonical Case or Scenario id |
| `twin.twin_of` | the canonical id of the positive |
| `grouping.kind`, `tier`, `evidence_class`, `family` | as before (legacy kind and tier, which credential-eval keeps for partitioning; canonical basis) |

credential-eval's case id is a closed slug grammar with `deny_unknown_fields`, so there is no slot for a legacy id. The legacy ids are carried by a second artifact, `credential-eval/legacy-id-map.json` (`credential-evidence/legacy-id-map`), generated from the map: `{ id, path, legacyId, legacyPath }` per case plus the snapshot's corpus digest. credential-eval never reads it; a dual run or a consumer that stores results under legacy ids re-keys through it. This answers the ADR 0006 open question: credential-eval reads the canonical snapshot (equivalent to the materialized tree, but with expectations), and the legacy names are a view generated on demand.

The snapshot is accepted by credential-eval's own validator (`CorpusSnapshot::from_json`, run from a scratch copy; credential-eval is not modified), and by its published JSON Schema in `tests/export-legacy.test.mjs` when a checkout is reachable. `scripts/dual-run/dual-run.mjs` automates the scratch-copy validation and the dual run (section 5). Exporter generator 2.0.0.

### 4. Parity: same differences, stronger checks

The legacy side did not change, so the counts do not: 0 unexplained, 28,448 explained, 173,505 identical, 28 rules all used. What changed is how an explained difference is justified, so that no rule is a blanket allowlist:

- A `product-state-dropped` rule must name the overlay that carries the dropped field (`overlay` in `rules.json`), and the parity run fails unless that overlay in the projection's own `overlay-interface.json` declares every field the rule lets through (`checkOverlayRules`). A field no overlay declares cannot be excused as product state.
- `index-digests-derived` is checked by `digest-self-consistent`: the projected digest must equal the legacy `digestJson` of the projected document it covers, recomputed in the run.
- `dossier-tier-unresolved-on-import` is checked by `dossier-claim-unresolved`: the family's canonical `dossier-research` claim must actually be recorded as unresolved evidence.
- The report states, per rule, how it is checked (predicate, overlay, value constraint) and lists the rules that are path-only: one, `corpus-suite-level-legacy-labels`, which drops the named legacy suite-level review labels. Tests tamper with a digest and a dossier tier and require the run to report them.

### 5. Dual run

`scripts/dual-run/dual-run.mjs` runs credential-eval twice per scanner with one configuration, over the canonical snapshot and over a snapshot built directly from the pinned legacy corpora (legacy ids, legacy paths), re-keys the second to canonical ids through the id map, and compares per-case findings and measurements. A difference counts as explained only when an input of the two snapshots (kind, expected spans, family, twin lineage) differs; identical inputs must give identical findings and measurement. Results, versions and what was not run are in `docs/migration/dual-run-report.md`. It is not in CI (Rust toolchain, a credential-eval checkout and scanner binaries).

## Consequences

- No legacy name is reachable from canonical data or from the canonical snapshot; the legacy names exist in the map and in projection output, and the one module that joins them is the place to delete when the map is retired.
- The exporter cannot silently omit or invent a legacy name: a map that disagrees with the records fails the export, the parity run and the tests.
- A consumer that still keys results by legacy ids (peer observations, baselines) needs one lookup through `legacy-id-map.json`.
- The vocabulary file still defines the five navigation scenarios. It is exporter-owned consumer vocabulary, digested into the projection source stamp, not canonical.

## Open questions

- Whether the legacy map may be retired (and the legacy view with it) once the downstream consumers have switched; until then it is a required input.
- Whether credential-eval should accept an optional `legacy_id` on cases so the sidecar can be folded into the snapshot. That is a credential-eval contract change and is not proposed here.
- The pinned TruffleHog (3.97.4) was not installed; the dual run used the installed version for both runs (see the report). Re-running with the pinned binary is a cutover step.
