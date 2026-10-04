# 0017. The v1 snapshot carries only what the contract can represent

- Status: accepted
- Date: 2026-10-03
- Issue: redact-secret/redact-secret-benchmarks#680, credential-evidence#142 (representation-aware export stays with credential-eval#34 and #150)
- Amended by: ADR 0018 (representation facts are exported; `invalid-utf8` stays not exported)
- Amends: ADR 0009 and ADR 0011 (what `credential-eval/corpus-snapshot.json` holds, and what the release manifest records), ADR 0016 (items without `text`)

## Context

`snapshot-2026.10.03` is immutable and cannot be read by credential-eval `v0.1.0-alpha.1`, the engine redact-secret-benchmarks pins: `invalid corpus snapshot: missing field 'content'`. Schema 1.6.0 (ADR 0016) lets an item state its bytes as `bytesHex` or `recipe` instead of `text`, and the exporter copied `item.text`, so 75 of the 6,454 cases had no `content`: 70 large must-flag inputs built from recipes (43 B to about 1 MiB) and 5 `invalid-utf8` inputs. Loading the repaired file against the engine's own `CorpusSnapshot::from_json` then shows a second rule that the first error hid: a twin must carry no secret span (`twin carries a secret span`), which 29 cases broke.

The closed v1 contract is not ours to change: `content` is one JSON `string`, `twin` is "an authored negative twin of a positive case", and there is no field for bytes, a recipe, a decoded value or an input-validity state.

## Decision

1. **Inline where the contract allows it.** A fixture is exported when its exact bytes are valid UTF-8, whichever form the record states them in (`text`, `bytesHex`, or an assembled `recipe`). `content` is those bytes as a string and every span stays a UTF-8 byte offset into it, which is what v1 says. The schema sets no size limit and the engine applies none, so the 70 large must-flag cases are carried at their real size (the snapshot grows from about 4.5 MB to about 35 MB). They are not truncated, sampled or replaced by a stand-in: a changed input would be a different case.
2. **Cases the contract cannot hold are not exported, and are counted.** A fixture whose bytes are not valid UTF-8 (the five `sendgrid-unicode-authored--*` byte-level cases) has no exact `content` string. It stays in the records, the fixture materialization and `fixtures-materialized-manifest.json`, and is left out of the v1 snapshot. It is never counted as a zero-detection or a miss: it is not in the v1 population at all.
3. **Twin lineage the contract cannot hold is not written, and is counted.** `twin` is written only for a negative (no secret span) whose positive is in the snapshot and has a secret span. Otherwise the case is exported without `twin`; the lineage stays in the records and the materialized manifest. Today this is 29 positive-to-positive mutations (`twin-carries-secret-span`). The case's own expectation is unchanged.
4. **The accounting is part of the release.** `release-manifest.json` carries `evalExport`: `target`, `materialized`, `exported`, `notExported` (`total`, `byReason`, `cases[]` with `id`, `reason`, `bytes`) and `twinLineageNotExported` (the same). `release:check` and `release:verify` require `exported + notExported.total == materialized == fixtures.count` and `exported` equal to the snapshot's case count, so a fixture cannot leave the snapshot silently. The manifest is the only place this can live: the v1 document is closed and has no room for it.
5. **The contract is not changed and nothing is re-expected.** Every case exported before keeps its content, path and expected spans. The only differences from `snapshot-2026.10.03` are the five cases not exported, the 70 cases that now have `content`, the 29 twin fields not written, and two grouping updates that are merged evidence changes on `main` after that tag (#144 and #147, evidence class and tier only, outcome unchanged).
6. **Replacement.** This is a new release that supersedes `snapshot-2026.10.03`; that tag stays as it is.

## Consequences

- The five unicode byte cases and the representation facts (decoded values, fragments, input validity) wait for a representation-aware export (credential-eval#34, credential-evidence#150). Until then a consumer that needs them reads the materialized manifest.
- A consumer reports the not-exported count next to its denominators ("not exported to eval v1") and never folds it into misses.
- The release is larger. A consumer that cannot hold a 1 MiB `content` string needs an engine change, not an evidence one.
- A future contract revision that can carry a representation removes a `reason` from `evalExport` and changes nothing else.
