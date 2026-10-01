# Cutover checklist

Issues #6 and #12 (part of #1). Decision records: `docs/decisions/0006-legacy-projection-and-parity.md`, `0008-semantic-tree-and-reclassification.md`, `0009-legacy-map-as-exporter-input-and-canonical-snapshot.md`, `0012-cutover-decisions-1-to-4.md`. Evidence: `docs/migration/parity-report.md`, `docs/migration/legacy-projection-manifest.json`, `docs/migration/dual-run-report.md`.

## The rule

From issue #6:

> Do not delete or stop updating legacy benchmark-owned canonical files until unexplained parity differences are zero and downstream consumers have switched.

Both halves are required. Today:

| Condition | State |
| --- | --- |
| Unexplained parity differences are zero | **Met at the pinned revision** `1020d2b5905e8973098235e57c4cdca3359bba57` (re-pinned from `ade8a10` in #74; the revision `redact-secret-benchmarks` went to production at, `@redact-secret/core` 0.1.0-beta.12, and the same pin as credential-eval): 0 unexplained, 28,181 explained, 174,293 identical leaf values, 21 rules all used, none added or removed (`npm run parity:check`, also a CI step; at `ade8a10`: 28,091 explained, 173,657 identical; before ADR 0012: 28,448 explained, 173,505 identical, 28 rules). The count must be re-proven if legacy evidence inputs change again before the switch (see Re-pinning). |
| Downstream consumers have switched | **Not met.** No consumer reads the projection, the snapshot or the canonical records in production. |

So, today: **the legacy repository stays authoritative, nothing in it may be deleted or frozen, and it must keep being updated.** This repository proposes no deletion.

## What the cutover moves and what it does not

The cutover switches the **public, scanner-neutral evidence** that `redact-secret-benchmarks` holds today (taxonomy, dossier facts, Cases, fixtures and their lineage) to being generated from this repository. Nothing else moves.

- `credential-evidence` becomes one input population to Redact Secret qualification: the canonical public snapshot. It does not become the qualification policy or the only corpus (README, "One qualification input, not the qualification"; ARCHITECTURE, "Consumer boundary").
- Redact Secret's product-owned populations (regression corpus, policy/behavior corpus, candidate-specific regression cases, protected or holdout evidence) stay in `redact-secret-benchmarks` or another product-owned location. The cutover does not require them to move here, and no checklist item below depends on them moving.
- Product policy stays downstream: support status, thresholds, detector assignments, known gaps, release pins and candidate acceptance (the overlays in `overlay-interface.json`, and credential-eval's `docs/qualification-boundary.md` for the measurement side).
- When credential-eval measures several populations for one qualification, each keeps its own identity (for this repository: the snapshot identity and digest; see `docs/releases.md` for release identity, contents and pinning). The populations are not silently merged into one denominator.
- The split itself changes no support status. Evidence class and support status are separate axes ([evidence classes](../governance/evidence-classes.md#evidence-class-and-product-support-status)); decision 1 below is the concrete case.

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
3. Re-key anything that pins the legacy fixture-index identity digest (peer observations): the projected identity and source digests differ by design. Decided (ADR 0012, decision 3): a one-time re-key in the switch pull request, recomputing the projected digests and re-keying stored per-fixture results by canonical id through `credential-eval/legacy-id-map.json`; no translation table.
4. Decisions 1 to 4 below are made (ADR 0012); the re-pin (decision 5) is still open and must be settled before `fixture-index.json` or the tiers become generated.
5. Keep the legacy generators running until the canonical generation rule is reimplemented here (ADR 0005 open question): the projected generated corpora are the recorded output of those generators.

| Legacy file | Projection | Overlay still needed |
| --- | --- | --- |
| `benchmarks/support/taxonomy.json` | `benchmarks/support/taxonomy.json` | `supportStatus` (4 families) |
| `benchmarks/support/dossiers/*.md` frontmatter | `benchmarks/support/dossier-frontmatter.json` (frontmatter only; the prose stays legacy and is not exported: canonical family narratives, ADR 0010, cover all 173 families and are not a legacy-compatible shape) | none |
| `benchmarks/scenarios.json` | `benchmarks/scenarios.json` | none |
| `benchmarks/categories.json` | `benchmarks/categories.json` | `calibrationOnly` entry is not imported |
| `benchmarks/fixture-semantics.json`, `benchmarks/fixture-index.json` | same paths (per-fixture family links follow the legacy reading since ADR 0012) | `fixture-provenance` |
| `fixtures/*/corpus.json`, `fixtures/generated/*.json` | same paths (T0 candidate kind and spans projected from the non-asserting `candidateReading`, ADR 0012) | `corpus-fixture-extras` |
| `benchmarks/fixture-detectors.json` | none | `fixture-detectors` |
| `benchmarks/pin-manifest.json`, `benchmarks/known-gaps.json` | none | `pin-manifest`, `known-gaps` |
| `benchmarks/generated-corpora.json` | none (superseded by the projection manifest) | none |

### credential-eval (its issue #5 and the epic's dual run)

1. Read `credential-eval/corpus-snapshot.json` (canonical ids; or `fixtures/materialized/` from ADR 0005, same fixtures) as its `CorpusSnapshot` input. It validates (5,950 cases at the `1020d2b5` pin).
2. Keep a stable key for stored results: where baselines, ledgers or peer observations are keyed by legacy fixture id, translate through `credential-eval/legacy-id-map.json` once, then key by canonical id.
3. Re-run the dual run with the **pinned** TruffleHog 3.97.4 (not installed here; the installed 3.97.6 was used for both sides, so the comparison holds but no number is a pinned-version number), and with the adapters that were not run here (`redact-secret`, `flare-redact`, `openredaction` need the Node shim and packages). Compare run-level aggregates in credential-eval's parity (its issue #5); this repository compared per-case findings and measurements only.
4. Supply `grouping.targets` (the detector assignment) from its adapter configuration, not from this repository.

## Maintainer decisions

Options, measured impact and a recommendation for each: `docs/migration/cutover-decision-brief.md`. Decisions 1 to 4 were accepted as recommended and are recorded in [ADR 0012](../decisions/0012-cutover-decisions-1-to-4.md). They are **evidence-class** decisions. None of them is a support-status decision, and none by itself changes any Redact Secret support status: the `taxonomy-support-status` overlay stays the product's to set, in `redact-secret-benchmarks`.

1. **Evidence-tier downgrades (T2 to T3): decided, accept the canonical T3.** 343 fixtures that legacy holds at T2 stay `project-policy` and project as T3. A fixture returns to T2 only through a per-family evidence review: one issue per affected family, #41 to #72 (32 families; 7 provider-neutral fixtures have no family). Declaring the legacy tier authoritative (option C) was rejected. Qualification that keys on tier decides its own reading in `redact-secret-benchmarks`.
2. **Unresolved (T0) span loss: decided, keep the candidate spans as non-asserting data.** The 31 fixtures (28 since the `1020d2b5` re-pin: legacy rescored the three Stripe `sk_org_` shape-5 fixtures from T0 to policy/T3) carry `candidateReading` (`asserting: false`, schema 1.5.0) and stay `not-assertable`. The legacy projection restores their kind (`must-redact`, T0), their spans and the 3 twin links. The credential-eval snapshot carries the candidate kind as a pending T0 kind but not the spans, which its v1 contract cannot express as non-asserting. T0 is never pass or fail.
3. **Identity digests: decided, one-time re-key** in `redact-secret-benchmarks`' switch pull request, via `credential-eval/legacy-id-map.json`. Nothing to do here.
4. **Per-fixture family links: decided, an additive per-fixture `families` override** on fixture-set items (schema 1.5.0). The 35 fixtures carry the legacy reading again; the Cases are unchanged.
5. **Re-pin: re-pinned to `1020d2b5905e8973098235e57c4cdca3359bba57` (#74).** That is the revision `redact-secret-benchmarks` went to production at (`0.1.0-beta.12`), and credential-eval cites the same revision. The import absorbed 25 new Stripe `sk_org_` fixtures, three rescored ones, the `stripe-token` contract rows and the dossier frontmatter of 25 dossiers (decision brief §5). Still open: whether legacy evidence authoring freezes from this revision (option C of the brief); if it does not, the pin moves again before the switch (Re-pinning below).
6. **Legacy navigation scenario ids.** Decided in ADR 0009: they stay map-only legacy data; canonical navigation is the 29 Scenario records. Listed so a maintainer can overrule it.

The dual-run report predates ADR 0012 and the `1020d2b5` re-pin. It is re-run once at the new pin with credential-eval at the matching revision (#74). Until then its numbers are for `ade8a10` (5,925 cases).

## Epic #1 acceptance

Acceptance criteria of epic #1, as stated in its body (migration rule 1 to 4 and the closing statement), with the evidence for each. PASS means met in this repository, stated with its caveats; it does not mean the cutover has happened.

| # | Criterion | Result | Evidence and caveats |
| --- | --- | --- | --- |
| 1 | Migrated data has schema parity | PASS | Schema 1.5.0; `npm run validate` covers `records/` and `migration/`; 93 providers, 173 families with dossier frontmatter, 52 Cases, 29 Scenarios, 5 fixture plans, 98 fixture sets, all 5,950 fixtures traceable through the legacy map (`docs/migration/taxonomy-report.md`, `cases-report.md`, `reclassification-report.md`). Lossy items were decisions 1 and 2; decision 2 now keeps the T0 candidate spans as non-asserting data (ADR 0012). |
| 2 | Exported legacy projections reproduce current benchmark inputs | PASS at the pin, with caveats | 0 unexplained, 28,181 explained, 174,293 identical at `1020d2b5`; legacy loaders (`fixtureIndexProblems`, `validateCorpus` on 67 corpora, four legacy schemas) accept the projection. Caveats: product state is an overlay, not reproduced; explained differences include the meaning-changing ones of decisions 1 and 3 (decisions 2 and 4 are now carried, ADR 0012); "current" is the pin, which is the legacy revision in production since #74. |
| 3 | credential-eval consumes the new canonical data successfully | PASS for the input contract and a scanner run; adoption not done | The canonical-id snapshot is accepted by credential-eval's own validator and runs to `complete` under all five pinned scanners (gitleaks 8.30.1, TruffleHog 3.97.4, redact-secret, flare-redact, OpenRedaction; 5,925 cases). credential-eval's own parity work (its issue #5) and a switch of its baselines are not done. |
| 4 | Dual-run comparison shows no unexplained semantic drift | PASS | All five scanners pinned (gitleaks 8.30.1, TruffleHog 3.97.4, redact-secret 0.1.0-beta.11, flare-redact 1.6.1, OpenRedaction 1.1.5): per-case findings and measurement identical in 5,925 of 5,925 cases for each; run-level aggregates 0 unexplained (group differences explained by decisions 1 and 2; totals unchanged). Report: `docs/migration/dual-run-report.md`. Redact Secret qualification on generated inputs is a downstream step, not part of this comparison. |
| 5 | Credential facts and scanner-neutral expectations are canonical here | PASS | Records, Cases, Scenarios, provenance and lineage; no legacy coordinate in any canonical id or path (`npm run lint:identity`, zero violations, no baseline). Decisions 1 to 4 (ADR 0012) are evidence decisions inside the canonical model. |
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
- [x] Maintainers decide decisions 1 to 4 (tier downgrades, T0 span loss, identity digests, per-fixture families): ADR 0012, schema 1.5.0, evidence-review issues #41 to #72.
- [x] Maintainers decide the re-pin (decision 5): `1020d2b5`, joint with credential-eval (#74). The legacy evidence freeze (option C) is still open.
- [ ] Re-pin at cutover: done at `1020d2b5` in #74 (0 unexplained); repeat only if legacy evidence inputs change before the switch. Choose the legacy revision current at cutover, re-run `npm run migrate:taxonomy`, `npm run migrate:cases`, `npm run migrate:narratives`, `npm run export:legacy`, `npm run parity`; unexplained must still be zero.
- [x] credential-eval dual run with the pinned TruffleHog 3.97.4 and all adapters, including run-level aggregates (`docs/migration/dual-run-report.md`). credential-eval's own legacy parity (its issue #5) is a separate document in that repository.
- [ ] redact-secret-benchmarks builds its inputs from the projection plus overlays and its own release gates pass on the generated inputs. Its product-owned populations stay where they are and are measured as separate populations.
- [ ] A release is qualified end to end from generated inputs while the hand-authored files still exist (the parallel run).
- [ ] Only then: mark the legacy canonical files generated/compatibility data in the legacy repository (its decision, its pull request). Deleting them is a separate, later decision.

## Re-pinning

The legacy repository continues to change while it is authoritative. The pin lives in `scripts/migrate/lib/legacy-source.mjs` (`LEGACY_REVISION`, mirrored in `.github/workflows/ci.yml`, `.github/workflows/release.yml` and the inactive `docs/ops/examples/research-cron.github-workflow.yml`). To move it: change the constant and the workflow variables, run the three importers (their reports and the legacy map change; an authored narrative that cites a source the new dossier no longer records fails the narrative import and is fixed by hand), `npm run export:legacy`, `npm run parity`, review every new difference against `scripts/parity/rules.json`, and commit records, map, reports, manifest and parity report together. A new difference that no rule explains is either an importer bug or legacy drift the canonical model must absorb. Do not add a rule to silence it. Then `npm run fixtures:materialize`, `npm run coverage:gaps`, the fixture counts in the tests and `scripts/parity/inventory.json`, and the dual run.

Current state: pinned at `1020d2b5905e8973098235e57c4cdca3359bba57` since #74 (previously `ade8a10`). What that re-pin changed:

- Fixtures: 5,925 to 5,950. The 25 new `detector-coverage` Stripe `sk_org_` rows are a product support-policy floor, which legacy itself scores as policy/T3. The importer's existing rules put them in `stripe:organization-api-key` with evidence class `project-policy`: 15 positives (`documented-format-literal` cells of `documented-format-positives`, projected as `policy`/T3) and 10 policy-floor controls (`benign-lookalike` cells of `benign-and-near-miss-controls`, `must-not-flag`/T3). No support status was recorded, ADR 0012 applies unchanged, and every fixture has a `migration/legacy-map/` entry (7,917 to 7,943 entries). Legacy also rescored the three `stripe-token-shape-5-*` fixtures from T0 to policy/T3, so they moved from `unsettled-evidence-inputs` to `documented-format-positives` and lost their non-asserting candidate reading (31 to 28 T0 candidate readings).
- One side effect of the existing reason collapse (rule `fixture-reason-collapsed-to-case`, one reason per evidence entry, the most frequent): the 10 new controls share an evidence entry with the `stripe-token-mask`, `-reference` and `-label-prose` controls, so those three now carry the `sk_org_` floor wording. Their class (`project-policy`) and outcome are unchanged. The rule's predicate checks it (the reason is a legacy reason of a fixture in the same imported case), so the difference stays explained.
- Contracts and dossiers: the `stripe-token` field claims for `sk_org_` (mode segment and body floor as `unresolved`, project policy by legacy's own label). Frontmatter of 25 dossiers: 6 families lose their current contract (`atlassian:access-token`, `netlify:other-prefixed-tokens`, `notion:integration-token`, `npm:legacy-token`, `slack:workflow-webhook-token`, `stripe:organization-api-key`; verdicts now `issuance-gated` or rejected), 3 move from not-found to researched (`google:oauth2-credential`, `linear:oauth-access-token`, `openrouter:management-api-key`), and `aws:sts-service-bearer-token` is now rejected. The authored narrative of `atlassian:access-token` was adjusted: its research note and its `dossier-research` claim (now `unresolved`) can no longer back a statement.
- Parity: 0 unexplained before and after. The 90 new explained leaf values are the 25 new fixtures under existing rules: `fixture-group-replaced-by-case` +25, `fixture-detector-assignment` +50, `span-note-boilerplate` +15. No rule was added or removed.
