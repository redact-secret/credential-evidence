# 0018. The credential-eval snapshot carries the agreed representation facts

- Status: accepted
- Date: 2026-10-04
- Issue: redact-secret/credential-evidence#150 (contract: redact-secret/credential-eval#34; policy and reviews stay with #142)
- Amends: ADR 0009 and ADR 0011 (what `credential-eval/corpus-snapshot.json` holds and what the release manifest records), ADR 0016 (the "snapshot builders are unchanged" consequence), ADR 0017 (the `invalid-utf8` reason stays; the other facts it deferred are now exported)
- Builds on: credential-eval ADR 0005 and `docs/contracts/representation.md` at `v0.1.0-alpha.4` (commit `57858c9d`, contract revision 1.3, representation contract `credential-eval/representation/1`)

## Context

ADR 0016 added `derivation`, `transformation`, `chunking`, `inputValidity` and the span facts `base`, `fragments`, `decoded` to the evidence records and the materialized manifest. ADR 0017 left them out of the closed v1 snapshot because it had no field for them. credential-eval agreed a contract that adds them as optional fields of the same `credential-eval/corpus-snapshot/v1` tag (credential-eval#34) and released it in `v0.1.0-alpha.4`. The mapping table, the rules and the `facts_digest` algorithm are in that contract; this ADR records only the decisions this repository had to make to implement it.

## Decision

1. **The mapping is the contract's table, applied by one pure module** (`scripts/export/lib/representation-facts.mjs`). Key names change only where the contract says so (`lineBreak` to `line_break`, `codePoints` to `code_points`, `fillerBytes` to `filler_bytes`); a decoded digest gains the `sha256:` prefix. Defaults are never written: `inputValidity: valid`, an empty `bases`, a span without a fact. Facts are written only for what the item states, and never change `kind`, `tier`, `expected` or `grouping`.
2. **`identity.representation` is declared whenever the release exporter runs**, with or without facts in the tree, as the contract allows. The declaration is what makes an engine older than `v0.1.0-alpha.4` refuse the snapshot instead of misreading it.
3. **Two export paths, one function.** `buildSnapshot(inputs, { representation: true })` is the release path. The default (and the legacy projection, `export:legacy`, the parity and dual-run checks, which are tied to the import baseline) writes the closed v1 document exactly as before: no declaration, no fact. The v1 output for the tree behind `snapshot-2026.10.04` is byte-identical (SHA-256 `778dbf4c…`, the snapshot asset's digest), and a test pins that the representation export only adds facts to the v1 cases.
4. **`invalid-utf8` is still not exported.** Its bytes are not a JSON string. It stays counted in `evalExport.notExported` (reason `invalid-utf8`, five fixtures today). A fixture whose bytes are valid UTF-8 with `inputValidity: unpaired-surrogate-split` is exported with its `content`, `representation.input_validity`, `representation.chunking`, `expected: []` and tier `T0`. The exporter refuses to write an expected rejection that has a span or a tier other than `T0`, though schema 1.6.0 already forbids it.
5. **Unresolved and `not-assertable` expectations stay T0 with no spans** (ADR 0012 decision 2). Their lineage (`derivation`, `transformation`, `chunking`) is written; their candidate reading is not. Review state and support status are never inferred and never exported: the snapshot contract has no field for them, and "merged" or "released" is not "reviewed".
6. **Fields the contract does not carry stay in the records.** The free-text `transformation.note` and the span `note` are not exported (the contract's objects are closed, and a refused snapshot would be the cost). They remain in `fixtures-materialized-manifest.json` and the records bundle.
7. **Accidental field loss fails the export, twice.** (a) While building, the facts the exported items state are counted from the records, apart from the mapping, and compared with the counts of what was written (`derivation`, `base` and every count the engine reports); a difference throws. (b) The release manifest records `evalExport.representation`: `{contract, facts_digest, cases, transformed_cases, chunked_cases, expected_rejections, fragmented_spans, fragments, decoded_spans, decoded_verified, decoded_unverified}`, computed from the written cases. `release:check` and `release:verify` recompute it from the snapshot asset's bytes and refuse a release whose manifest and snapshot disagree, or disagree about whether the contract is used. `facts_digest` is the engine's definition (canonical JSON of the per-case facts, sorted by case id, `sha256:` prefix), so a consumer compares it with `manifest.representation.facts_digest` of a run artifact.
8. **The release generator is `credential-evidence/release-bundle` 1.2.0.** Releases up to `snapshot-2026.10.04` have no `evalExport.representation` and are not changed.
9. **A new immutable snapshot, never a replacement.** `corpus_digest` is over the cases including the facts, so the new release has a new digest. `snapshot-2026.10.03` and `snapshot-2026.10.04` keep their assets.

## Compatibility

- Minimum engine: credential-eval `v0.1.0-alpha.4`. Older tags refuse the new fields (`additionalProperties: false`) and keep reading `snapshot-2026.10.04` and earlier.
- Proven by loading the release snapshot with the engine built at `v0.1.0-alpha.4` (`credential-eval capabilities`: contract revision 1.3, representation contract `credential-eval/representation/1`) and comparing `manifest.representation` of a real run with the manifest's `evalExport.representation`: same digest, same counts. The engine's own `CorpusSnapshot::validate` re-derives every decoded fact from the original bytes.
- Same tree as `snapshot-2026.10.04`: after removing the facts, every case is identical to that release's case (content, spans, tier, kind, grouping, twin), so no previously exported case changes expectation.

## Known unsupported semantics (to repeat in the release notes)

- `invalid-utf8` inputs are not exported (bytes are not a JSON string).
- Percent-encoded, escaped-Unicode and UTF-16 decoded findings are unmeasured by the engine; the facts are carried.
- Fragment-aware scoring: fragments are carried and validated, a span is still scored on its enclosing range.
- `normalize` decode steps are carried but not re-derivable by the engine (counted `decoded_unverified`).
- Twin lineage that v1 cannot hold is still not written (ADR 0017).
- No review state, support status, scanner assignment or product policy is carried.

## Consequences

- redact-secret-benchmarks adopts the new release by repinning credential-eval to `v0.1.0-alpha.4` or later and the evidence release to the new tag and manifest digest. Nothing here changes its pins or its authority.
- A new fact that evidence adds later is a contract change in credential-eval first, then a mapping line here. The loss check in decision 7 fails when an item states a fact the exporter does not write.
