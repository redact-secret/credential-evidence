# Cutover checklist

Issue #6 (part of #1). Decision record: `docs/decisions/0006-legacy-projection-and-parity.md`. Evidence: `docs/migration/parity-report.md` and `docs/migration/legacy-projection-manifest.json`.

## The rule

From issue #6:

> Do not delete or stop updating legacy benchmark-owned canonical files until unexplained parity differences are zero and downstream consumers have switched.

Both halves are required. Today:

| Condition | State |
| --- | --- |
| Unexplained parity differences are zero | **Met at the pinned revision** `ade8a10bd7922765110a68986b0690eb3861f2e5`: 0 unexplained, 28,448 explained, 173,505 identical leaf values (`npm run parity:check`). The legacy repository has moved on since that pin (the local checkout used for this work is 17 commits ahead of it); the count must be re-proven at the revision that is current when the cutover happens (see Re-pinning). |
| Downstream consumers have switched | **Not met.** No consumer reads the projection or the canonical records yet. |

So, today: **the legacy repository stays authoritative, nothing in it may be deleted or frozen, and it must keep being updated.** This repository proposes no deletion.

## What exists now

- `npm run export:legacy` (`--check`): deterministic projection into `dist/legacy-projection/` (gitignored) plus a committed provenance manifest. Every artifact has source revision, schema revision, generator version and sha256.
- `npm run parity` (`:check`): the projection against the legacy files at the pin, every difference classified by a rule with a stated, machine-checked cause.
- `overlay-interface.json`: what a consumer must supply that canonical data refuses to carry.
- `credential-eval/corpus-snapshot.json`: the projection in credential-eval's own input contract, accepted by credential-eval's own `CorpusSnapshot::validate` (digest included).

## What a downstream must do

### redact-secret-benchmarks (while it remains the qualification authority)

1. Generate, do not hand-author, the inputs in the table below: point a build step at the projection and apply the overlays.
2. Supply the overlays in `overlay-interface.json`: `fixture-detectors`, `taxonomy-support-status`, `fixture-provenance`, `corpus-fixture-extras`, `pin-manifest` (recomputing corpus hashes over the projected corpora) and `known-gaps`. None of them is evidence; all stay in that repository or in credential-eval configuration.
3. Re-key anything that pins the legacy fixture-index identity digest (peer observations): the projected identity and source digests differ by design.
4. Decide the per-fixture family question (next section) before `fixture-index.json` becomes generated.
5. Keep the legacy generators running until the canonical generation rule is reimplemented here (ADR 0005 open question): the projected generated corpora are the recorded output of those generators.

| Legacy file | Projection | Overlay still needed |
| --- | --- | --- |
| `benchmarks/support/taxonomy.json` | `benchmarks/support/taxonomy.json` | `supportStatus` (4 families) |
| `benchmarks/support/dossiers/*.md` frontmatter | `benchmarks/support/dossier-frontmatter.json` (frontmatter only; the prose stays legacy) | none |
| `benchmarks/scenarios.json` | `benchmarks/scenarios.json` | none |
| `benchmarks/categories.json` | `benchmarks/categories.json` | `calibrationOnly` entry is not imported |
| `benchmarks/fixture-semantics.json`, `benchmarks/fixture-index.json` | same paths | `fixture-provenance`; per-fixture family links (see below) |
| `fixtures/*/corpus.json`, `fixtures/generated/*.json` | same paths | `corpus-fixture-extras`; T0 kind and spans are not recoverable |
| `benchmarks/fixture-detectors.json` | none | `fixture-detectors` |
| `benchmarks/pin-manifest.json`, `benchmarks/known-gaps.json` | none | `pin-manifest`, `known-gaps` |
| `benchmarks/generated-corpora.json` | none (superseded by the projection manifest) | none |

### credential-eval (issue #5 of that repository, and the epic's dual-run)

1. Read `credential-eval/corpus-snapshot.json` (or `fixtures/materialized/` from ADR 0005; same fixtures) as its `CorpusSnapshot` input. The snapshot validates today; the dual run has not been done.
2. Run the same scanners over the snapshot and over the legacy corpus and compare the scanner outcomes. This repository can prove that the inputs match (this report); only credential-eval can prove the measurements match. That comparison is the epic's criterion 4 and it is not done.
3. Supply `grouping.targets` (the detector assignment) from its adapter configuration, not from this repository.

## Differences that change meaning (decide before switching)

All are explained in the parity report; none is harmless by being explained.

1. **Per-fixture family links.** Since #12 stage B a matrix cell carries exactly the fixture's own families, so only fixtures of a Case that spans several families gain links the legacy index did not give them: 35 fixtures (87 links), down from 459 (1,066 links). Anything that counts fixtures per family or classifies support per family will read slightly different numbers for those 35. Options: an additive per-fixture `families` override on fixture-set items, or splitting those Cases by family set. Needs a decision by the maintainers.
2. **Evidence-tier downgrades.** 343 fixtures that legacy holds at tier T2 are recorded as project-policy and project as T3, `policy`. That is the import applying `docs/governance/evidence-classes.md`. Whether the cited sources should be strengthened or the legacy tier was too generous is an evidence review, not an export question.
3. **Unresolved (T0) fixtures.** 31 must-redact T0 fixtures lose their candidate spans and project as `must-not-flag`, T0. Consumers must key T0 on the tier (legacy does). 3 twins of unresolved positives project without twin links.
4. **Identity digests** of the fixture index differ; the projected index is self-consistent (legacy `fixtureIndexProblems` finds none).
5. **Legacy names are regenerated, not canonical.** Canonical fixtures are `<provider>--<name>` with semantic ids; the projection names suites, fixtures, corpus paths and navigation scenario ids from `migration/legacy-map/` (ADR 0008). The legacy `group` label shows the canonical Case or Scenario id. The credential-eval snapshot keeps legacy fixture ids and `<suite>/<path>` paths so the dual run needs no re-keying; `grouping.group` is the new id. The exporter is an adapter (`scripts/export/lib/view.mjs`), not the stage C design.

## Checklist

Do these in order; tick only what is verified, in the pull request that does it.

- [x] Canonical records import complete and validated (#3, #4).
- [x] Compatibility export deterministic, stamped and manifest-checked (#6).
- [x] Parity report pinned; unexplained differences zero at the pin (#6).
- [x] Legacy loaders accept the projection (`validateCorpus` on 67 corpora, `fixtureIndexProblems`, the four legacy schemas) (#6).
- [x] credential-eval's validator accepts the corpus snapshot (#6; checked once by hand, re-check after a projection change).
- [x] Identity correction and reclassification (#12 stages A and B): no legacy coordinates in canonical ids or paths, 1,925 imported cases reclassified into 52 Cases, 29 Scenarios and 5 plans, every fixture in `migration/legacy-map/`, parity still 0 unexplained.
- [ ] Stage C (#12): rework the compatibility exporter and parity to read the legacy map as a first-class input (no adapter view), decide what replaces the legacy navigation scenario ids, then the credential-eval dual run.
- [ ] Maintainers decide the per-fixture family question and the tier downgrades above.
- [ ] Re-pin: choose the legacy revision current at cutover, re-run `npm run migrate:taxonomy`, `npm run migrate:cases`, `npm run export:legacy`, `npm run parity`; unexplained must still be zero.
- [ ] credential-eval consumes the snapshot and its dual run shows no unexplained outcome drift (credential-eval issue #5).
- [ ] redact-secret-benchmarks builds its inputs from the projection plus overlays and its own release gates pass on the generated inputs.
- [ ] A release is qualified end to end from generated inputs while the hand-authored files still exist (the parallel run).
- [ ] Only then: mark the legacy canonical files generated/compatibility data in the legacy repository (its decision, its pull request). Deleting them is a separate, later decision.

## Re-pinning

The legacy repository continues to change while it is authoritative. The pin lives in `scripts/migrate/lib/legacy-source.mjs` (`LEGACY_REVISION`). To move it: change the constant, run the two importers (their reports change), `npm run export:legacy`, `npm run parity`, review every new difference against `scripts/parity/rules.json`, and commit records, reports, manifest and parity report together. A new difference that no rule explains is either an importer bug or legacy drift the canonical model must absorb. Do not add a rule to silence it.
