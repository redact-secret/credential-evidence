# Cutover checklist

Issues #6 and #12 (part of #1). Decision records: `docs/decisions/0006-legacy-projection-and-parity.md`, `0008-semantic-tree-and-reclassification.md`, `0009-legacy-map-as-exporter-input-and-canonical-snapshot.md`. Evidence: `docs/migration/parity-report.md`, `docs/migration/legacy-projection-manifest.json`, `docs/migration/dual-run-report.md`.

## The rule

From issue #6:

> Do not delete or stop updating legacy benchmark-owned canonical files until unexplained parity differences are zero and downstream consumers have switched.

Both halves are required. Today:

| Condition | State |
| --- | --- |
| Unexplained parity differences are zero | **Met at the pinned revision** `ade8a10bd7922765110a68986b0690eb3861f2e5`: 0 unexplained, 28,448 explained, 173,505 identical leaf values, 28 rules all used (`npm run parity:check`, also a CI step). The legacy `develop` checkout used for this work is 27 commits ahead of the pin (earlier notes said 17; it keeps moving). A path diff of the files the importers and the parity harness read (`benchmarks/`, `fixtures/`, `schemas/`, `corpora/`, `baselines/`, `package.json`) shows none of the evidence inputs changed since the pin: only `benchmarks/feature-claims.json`, `benchmarks/lib/peer-rule-families.ts`, two PII runtime files and `package.json` (plus new `scanners/` files), none of which is read. That is a path diff, not a parity run at the new head; the count must be re-proven at the revision current when the cutover happens (see Re-pinning). |
| Downstream consumers have switched | **Not met.** No consumer reads the projection, the snapshot or the canonical records in production. |

So, today: **the legacy repository stays authoritative, nothing in it may be deleted or frozen, and it must keep being updated.** This repository proposes no deletion.

## What the cutover moves and what it does not

The cutover switches the **public, scanner-neutral evidence** that `redact-secret-benchmarks` holds today (taxonomy, dossier facts, Cases, fixtures and their lineage) to being generated from this repository. Nothing else moves.

- `credential-evidence` becomes one input population to Redact Secret qualification: the canonical public snapshot. It does not become the qualification policy or the only corpus (README, "One qualification input, not the qualification"; ARCHITECTURE, "Consumer boundary").
- Redact Secret's product-owned populations (regression corpus, policy/behavior corpus, candidate-specific regression cases, protected or holdout evidence) stay in `redact-secret-benchmarks` or another product-owned location. The cutover does not require them to move here, and no checklist item below depends on them moving.
- Product policy stays downstream: support status, thresholds, detector assignments, known gaps, release pins and candidate acceptance (the overlays in `overlay-interface.json`, and credential-eval's `docs/qualification-boundary.md` for the measurement side).
- When credential-eval measures several populations for one qualification, each keeps its own identity (for this repository: the snapshot identity and digest; see `docs/releases.md` for release identity, contents and pinning). The populations are not silently merged into one denominator.
- The split itself changes no support status. Evidence class and support status are separate axes ([evidence classes](../governance/evidence-classes.md#evidence-class-and-product-support-status)); open decision 1 below is the concrete case.

## What exists now

- `npm run export:legacy` (`--check`): deterministic projection into `dist/legacy-projection/` (gitignored) plus a committed provenance manifest. Every artifact has source revision, schema revision, generator version (2.0.0) and sha256. Legacy names (67 `beta8-*`/authored suites, 5,925 fixture ids and corpus paths, 11,941 navigation-scenario links) are regenerated only from `migration/legacy-map/` (ADR 0009); a map that disagrees with the records fails the export.
- `npm run parity` (`:check`): the projection against the legacy files at the pin, every difference classified by a rule whose stated cause is machine-checked (27 of 28 rules check a predicate, an overlay declaration or a value constraint; one drops named suite-level labels by path).
- `overlay-interface.json`: what a consumer must supply that canonical data refuses to carry.
- `credential-eval/corpus-snapshot.json`: the canonical corpus in credential-eval's own input contract, in **canonical ids and paths**, accepted by credential-eval's own `CorpusSnapshot::from_json` (digest included); `credential-eval/legacy-id-map.json` re-keys it to legacy fixture ids and paths.
- `npm run dual-run -- --credential-eval <checkout>`: credential-eval over the canonical snapshot and over the legacy corpus, per scanner (not in CI). Last result: `docs/migration/dual-run-report.md`.
- CI (`.github/workflows/ci.yml`): validate, identity lint, tests with the pinned legacy checkout, `migrate:check`, `export:legacy:check`, `parity:check`, `fixtures:materialize:check`.

## What a downstream must do

### redact-secret-benchmarks (while it remains the qualification authority)

1. Generate, do not hand-author, the inputs in the table below: a build step checks out this repository at a pinned commit, runs `npm ci && npm run export:legacy`, and copies `dist/legacy-projection/` over the legacy paths.
2. Supply the overlays in `overlay-interface.json`: `fixture-detectors`, `taxonomy-support-status`, `fixture-provenance`, `corpus-fixture-extras`, `pin-manifest` (recomputing corpus hashes over the projected corpora) and `known-gaps`. None of them is evidence; all stay in that repository or in credential-eval configuration.
3. Re-key anything that pins the legacy fixture-index identity digest (peer observations): the projected identity and source digests differ by design.
4. Decide the open maintainer questions below before `fixture-index.json` or the tiers become generated.
5. Keep the legacy generators running until the canonical generation rule is reimplemented here (ADR 0005 open question): the projected generated corpora are the recorded output of those generators.

| Legacy file | Projection | Overlay still needed |
| --- | --- | --- |
| `benchmarks/support/taxonomy.json` | `benchmarks/support/taxonomy.json` | `supportStatus` (4 families) |
| `benchmarks/support/dossiers/*.md` frontmatter | `benchmarks/support/dossier-frontmatter.json` (frontmatter only; the prose stays legacy and is not exported: canonical family narratives, ADR 0010, cover all 173 families and are not a legacy-compatible shape) | none |
| `benchmarks/scenarios.json` | `benchmarks/scenarios.json` | none |
| `benchmarks/categories.json` | `benchmarks/categories.json` | `calibrationOnly` entry is not imported |
| `benchmarks/fixture-semantics.json`, `benchmarks/fixture-index.json` | same paths | `fixture-provenance`; per-fixture family links (see decisions) |
| `fixtures/*/corpus.json`, `fixtures/generated/*.json` | same paths | `corpus-fixture-extras`; T0 kind and spans are not recoverable |
| `benchmarks/fixture-detectors.json` | none | `fixture-detectors` |
| `benchmarks/pin-manifest.json`, `benchmarks/known-gaps.json` | none | `pin-manifest`, `known-gaps` |
| `benchmarks/generated-corpora.json` | none (superseded by the projection manifest) | none |

### credential-eval (its issue #5 and the epic's dual run)

1. Read `credential-eval/corpus-snapshot.json` (canonical ids; or `fixtures/materialized/` from ADR 0005, same fixtures) as its `CorpusSnapshot` input. It validates (5,925 cases).
2. Keep a stable key for stored results: where baselines, ledgers or peer observations are keyed by legacy fixture id, translate through `credential-eval/legacy-id-map.json` once, then key by canonical id.
3. Re-run the dual run with the **pinned** TruffleHog 3.97.4 (not installed here; the installed 3.97.6 was used for both sides, so the comparison holds but no number is a pinned-version number), and with the adapters that were not run here (`redact-secret`, `flare-redact`, `openredaction` need the Node shim and packages). Compare run-level aggregates in credential-eval's parity (its issue #5); this repository compared per-case findings and measurements only.
4. Supply `grouping.targets` (the detector assignment) from its adapter configuration, not from this repository.

## Open maintainer decisions (decide before switching)

All are explained in the parity report; none is harmless by being explained. Each needs a maintainer, not an export change.

1. **Evidence-tier downgrades (T2 to T3).** 343 fixtures that legacy holds at tier T2 are recorded as project-policy and project as T3, `policy`. That is the importer applying `docs/governance/evidence-classes.md` (fewer than two distinct owners, or no provider-owned source). Decide: strengthen the cited sources (an evidence review), accept T3, or declare the legacy tier authoritative and record the exception. Per-case measurement is unchanged by it (dual run: kind changes in 90 cases and 31 more with T0, zero measurement differences); aggregates grouped by tier shift. This is an **evidence-class** decision only. Whichever way it goes, it does not by itself change any Redact Secret support status: the product may keep a family empirically supported on product-owned evidence while the public record is `project-policy`, or, where a downgrade exposes a real evidence or coverage gap, change the status after an explicit policy review in `redact-secret-benchmarks`. The migration encodes neither outcome; the `taxonomy-support-status` overlay is the product's to set.
2. **Unresolved (T0) span loss.** 31 must-redact T0 fixtures lose their candidate spans and project as `must-not-flag`, T0; one more silent fixture loses companion spans; 3 twins of unresolved positives project without twin links (the lineage stays canonical). Decide: keep the candidate spans as non-asserting data on the fixture, or accept the loss. Consumers must key T0 on the tier (legacy does).
3. **Identity digests.** `identity.digest` and the three source digests of the fixture index differ from legacy by design (different content; each is self-consistent, `digest-self-consistent`). Decide how peer observations and any stored pin of the legacy digest are re-keyed (a one-time re-pin, or a translation table).
4. **Per-fixture family links.** Since stage B only fixtures of a Case that spans several families gain links the legacy index did not give them: 35 fixtures (87 links), 34 of which change a single-family reading (dual run: no measurement difference). Options: an additive per-fixture `families` override on fixture-set items, or splitting those Cases by family set.
5. **Legacy checkout ahead of the pin.** The legacy `develop` is 27 commits ahead; none touches an evidence input (path diff above). Decide the revision to re-pin to and when (Re-pinning below), and whether the pin moves before or after the downstream switch.
6. **Legacy navigation scenario ids.** Decided in ADR 0009: they stay map-only legacy data; canonical navigation is the 29 Scenario records. Listed so a maintainer can overrule it.

## Epic #1 acceptance

Acceptance criteria of epic #1, as stated in its body (migration rule 1 to 4 and the closing statement), with the evidence for each. PASS means met in this repository, stated with its caveats; it does not mean the cutover has happened.

| # | Criterion | Result | Evidence and caveats |
| --- | --- | --- | --- |
| 1 | Migrated data has schema parity | PASS | Schema 1.4.0; `npm run validate` covers `records/` and `migration/`; 93 providers, 173 families with dossier frontmatter, 52 Cases, 29 Scenarios, 5 fixture plans, 98 fixture sets, all 5,925 fixtures traceable through the legacy map (`docs/migration/taxonomy-report.md`, `cases-report.md`, `reclassification-report.md`). Lossy items are the open decisions 1 and 2. |
| 2 | Exported legacy projections reproduce current benchmark inputs | PASS at the pin, with caveats | 0 unexplained, 28,448 explained, 173,505 identical; legacy loaders (`fixtureIndexProblems`, `validateCorpus` on 67 corpora, four legacy schemas) accept the projection. Caveats: product state is an overlay, not reproduced; explained differences include the meaning-changing ones in decisions 1 to 4; "current" is the pin, not the legacy head (path diff clean, parity not re-run at the head). |
| 3 | credential-eval consumes the new canonical data successfully | PASS for the input contract and a scanner run; adoption not done | The canonical-id snapshot is accepted by credential-eval's own validator and runs to `complete` under gitleaks 8.30.1 and TruffleHog (5,925 cases). credential-eval's own parity work (its issue #5) and a switch of its baselines are not done. |
| 4 | Dual-run comparison shows no unexplained semantic drift | PASS for what was run, not complete | Gitleaks 8.30.1 (pinned) and TruffleHog 3.97.6 (pin overridden): per-case findings identical in 5,925 of 5,925 cases, per-case measurement identical in 5,925 of 5,925, 0 unexplained drift, for both. Not run: TruffleHog 3.97.4, the three npm adapters, run-level aggregates, redact-secret qualification on generated inputs. |
| 5 | Credential facts and scanner-neutral expectations are canonical here | PASS | Records, Cases, Scenarios, provenance and lineage; no legacy coordinate in any canonical id or path (`npm run lint:identity`, zero violations, no baseline). Decisions 1 to 3 are evidence-review questions inside the canonical model. |
| 6 | Legacy benchmark inputs can be generated from them | PASS | `npm run export:legacy`, deterministic and checked in CI; overlays named in `overlay-interface.json`. |
| 7 | No Redact Secret-specific qualification semantics are required to interpret the data | PASS | No support status, milestone, pin, detector assignment or expected action in canonical records or the snapshot (test: "no product state is invented"); the only detector names are optional mapping metadata (`redact-secret-detector` externalRefs) that an overlay replaces. |
| 8 | Children #2 to #6 and #12 done | PASS | #2 to #6 merged; #12 stages A and B merged, stage C in the pull request that updates this file. |

Whether epic #1 closes with #12 or stays open until the downstream switch (the unchecked items below) is a maintainer decision; the migration rule itself only governs when the legacy files may be frozen.

## Checklist

Do these in order; tick only what is verified, in the pull request that does it.

- [x] Canonical records import complete and validated (#3, #4).
- [x] Compatibility export deterministic, stamped and manifest-checked (#6).
- [x] Parity report pinned; unexplained differences zero at the pin (#6).
- [x] Legacy loaders accept the projection (`validateCorpus` on 67 corpora, `fixtureIndexProblems`, the four legacy schemas) (#6).
- [x] Identity correction and reclassification (#12 stages A and B): no legacy coordinates in canonical ids or paths, 1,925 imported cases reclassified into 52 Cases, 29 Scenarios and 5 plans, every fixture in `migration/legacy-map/`.
- [x] Stage C (#12): the legacy map is a first-class, strictly checked exporter input (no adapter view), legacy navigation scenario ids decided (ADR 0009), parity re-run with stronger checks (0 unexplained), credential-eval snapshot in canonical names accepted by credential-eval's validator, dual run of credential-eval over the canonical and the legacy corpus (gitleaks pinned, TruffleHog unpinned), CI runs the export, parity and materialize checks.
- [ ] Maintainers decide the open questions above (tier downgrades, T0 span loss, identity digests, per-fixture families, re-pin).
- [ ] Re-pin: choose the legacy revision current at cutover, re-run `npm run migrate:taxonomy`, `npm run migrate:cases`, `npm run migrate:narratives`, `npm run export:legacy`, `npm run parity`; unexplained must still be zero.
- [ ] credential-eval dual run with the pinned TruffleHog 3.97.4 and all adapters, and its own parity on run-level aggregates (credential-eval issue #5).
- [ ] redact-secret-benchmarks builds its inputs from the projection plus overlays and its own release gates pass on the generated inputs. Its product-owned populations stay where they are and are measured as separate populations.
- [ ] A release is qualified end to end from generated inputs while the hand-authored files still exist (the parallel run).
- [ ] Only then: mark the legacy canonical files generated/compatibility data in the legacy repository (its decision, its pull request). Deleting them is a separate, later decision.

## Re-pinning

The legacy repository continues to change while it is authoritative. The pin lives in `scripts/migrate/lib/legacy-source.mjs` (`LEGACY_REVISION`, mirrored in `.github/workflows/ci.yml`). To move it: change the constant and the workflow variable, run the two importers (their reports and the legacy map change), `npm run export:legacy`, `npm run parity`, review every new difference against `scripts/parity/rules.json`, and commit records, map, reports, manifest and parity report together. A new difference that no rule explains is either an importer bug or legacy drift the canonical model must absorb. Do not add a rule to silence it.
