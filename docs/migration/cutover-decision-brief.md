# Cutover decision brief

Issue #20 (follow-up to epic #1). This brief prepares the maintainer decisions in `docs/migration/cutover.md` ("Maintainer decisions") and the re-pin. It decides nothing.

**Status (2026-10-01):** decisions 1 to 4 accepted as recommended, recorded in [ADR 0012](../decisions/0012-cutover-decisions-1-to-4.md): 1 = accept the canonical T3, restoration only through per-family evidence review (issues #41 to #72), option C rejected; 2 = option A, T0 candidate spans kept as non-asserting `candidateReading` (schema 1.5.0); 3 = option A, one-time re-key in `redact-secret-benchmarks`' switch pull request; 4 = option A, per-fixture `families` override (schema 1.5.0). Decision 5 (re-pin) is **deferred**. The measurements below are those the decisions were made on; they predate ADR 0012 and were not re-run. Each section gives the options, the evidence, the impact measured by the dual run (`docs/migration/dual-run-report.md`), a recommendation, and what a benchmark consumer sees.

Measured at: legacy pin `ade8a10bd7922765110a68986b0690eb3861f2e5`, credential-eval `2410e3c370736d64388effb2210291d8fdac0aa2`, all five scanners at their pins (gitleaks 8.30.1, TruffleHog 3.97.4, `@redact-secret/core` 0.1.0-beta.11, `flare-redact` 1.6.1, `@openredaction/core` 1.1.5), 5,925 cases per side.

## Two axes, kept apart

Every decision below is about **evidence**: which evidence class or tier a fixture's expectation has, and which spans, links and identities the canonical data carries. None of them is a decision about **product support status** (stable, provisional, pending) of Redact Secret or of any other scanner.

- Evidence class and tier are owned here and follow `docs/governance/evidence-classes.md`.
- Support status is Redact Secret qualification policy, owned by `redact-secret-benchmarks` (the `taxonomy-support-status` overlay and its own classifier). credential-evidence #35 documents that boundary.
- Consequence for these decisions: a downgrade from T2 to T3 says "the cited sources do not meet the bar for tool-corroborated". It must not, by itself, demote a Redact Secret family. Whether qualification keeps reading a fixture at its old tier, reads it as project policy, or uses a product-owned population for it, is the benchmarks repository's call, made in that repository.

## Summary of measured impact

Per-case: in every scanner, 5,925 of 5,925 cases have identical findings and identical per-case measurement on both sides; 0 unexplained drift. 159 cases have a differing per-case input (kind, spans, family or twin lineage) and 343 a differing tier; none changes a measurement.

Run-level: 1 of 7 `<kind>/<tier>` groups is identical (`must-not-flag/T1`); the other six differ, all explained (0 unexplained per scanner), and the population totals summed over the scored groups are conserved for every scanner. So the decisions move results between groups. They do not change what any scanner found.

Point estimates, legacy to canonical (from the run artifacts; the Wilson bounds move with them):

| Scanner | `must-redact/T2` leaked-byte rate | `policy/T3` leaked-byte rate | `must-not-flag/T2` false-alarm rate | `must-not-flag/T3` false-alarm rate |
| --- | --- | --- | --- | --- |
| gitleaks | 29.3% to 23.3% | 30.2% to 35.1% | 5.0% to 5.1% | 2.4% to 2.7% |
| trufflehog | 55.8% to 49.5% | 84.1% to 81.8% | 1.8% to 1.8% | 1.6% to 1.7% |
| redact-secret | 0.6% to 0.7% | 2.3% to 1.7% | 0.5% to 0.4% | 0.8% to 0.8% |
| flare-redact | 68.6% to 65.6% | 56.4% to 62.2% | 1.7% to 1.2% | 2.2% to 2.7% |
| openredaction | 82.3% to 79.0% | 57.7% to 67.1% | 27.5% to 26.8% | 34.8% to 34.4% |

`measurable_share` of `must-redact/T1` goes from 97.7% to 100% and of `must-redact/T2` from 94.7% to 100% for every scanner (decision 2).

## 1. Evidence-tier downgrades (343 fixtures, T2 to T3)

**Decided: B, with A as backlog (ADR 0012).**

**What.** 343 fixtures that legacy holds at T2 project as T3: 253 `must-not-flag` controls stay controls at T3, and 90 `must-redact` positives become `policy`/T3. The importer applied `docs/governance/evidence-classes.md`: fewer than two distinct owners, or no provider-owned source, is project policy.

**Measured impact.** No per-case change. `must-not-flag/T2` shrinks from 2,069 to 1,816 files and `must-not-flag/T3` grows from 1,397 to 1,650; `must-redact/T2` shrinks from 551 to 461 and `policy/T3` grows from 550 to 640. The per-tier rates in the table above move by up to 9.4 points (openredaction, `policy/T3`), in either direction depending on the scanner, because the moved fixtures do not perform like the rest of their old or new group.

**Options.**

- A. Evidence review: strengthen the cited sources fixture by fixture (a second owner or a provider-owned source). Every fixture that meets the bar returns to T2 through a reviewed record change. Cost: research per family; some will not meet the bar.
- B. Accept T3. The canonical tier stands; consumers that group by tier see the shifts above.
- C. Declare the legacy tier authoritative and record each exception. This contradicts the evidence-class rule for these fixtures and needs a governance exception per family. It is not recommended.

**Recommendation.** B now, with A as ordinary backlog work. The rule is applied consistently and the measurement does not change. Open an evidence-review issue per affected family (the `research-family` skill covers it) rather than one bulk exception. Do not choose C.

**For a benchmark consumer.** Tier-grouped aggregates shift as measured above; per-case results do not. Qualification that keys on tier needs its own decision (see "Two axes"): keep reading those fixtures at T2 through a product-owned population, or accept the canonical T3. The projection carries the canonical tier; there is no overlay that restores T2.

## 2. Unresolved (T0) span loss (31 fixtures, plus 1 silent fixture and 3 twins)

**Decided: A (ADR 0012). The silent fixture's companion spans stay dropped; the 3 twin links are projected again in the legacy projection.**

**What.** 31 `must-redact` T0 fixtures lose their candidate spans and project as `must-not-flag`/T0; one more silent fixture loses companion spans; 3 twins of unresolved positives project without twin links (the lineage stays canonical).

**Measured impact.** T0 is never scored, so no case result changes. Two aggregates change: `pending/T0.candidate_kinds` goes from 19 `must-not-flag` + 31 `must-redact` to 50 `must-not-flag`, and the 31 pending cases no longer count against `must-redact`, so `measurable_share` rises to 100% in `must-redact/T1` (from 97.7%) and `must-redact/T2` (from 94.7%) for every scanner. Both values stay above the default floor of 70%; nothing in the run flips measurable to not measurable.

**Options.**

- A. Keep the candidate spans as non-asserting data on the fixture (an additive schema field, for example `candidateSpans` with `asserting: false`), and project them as the legacy spans. Restores parity for the 31 fixtures and the legacy `measurable_share`.
- B. Accept the loss. Consumers key T0 on the tier (legacy already does) and do not count T0 cases as pending positives.

**Recommendation.** A. The spans are useful evidence about where a candidate value sits. A non-asserting field keeps them without asserting a body that no source decides, and it is an additive schema change (ADR 0002). It also keeps `measurable_share` comparable across the switch. If A is not done before the switch, B with an explicit note in the consumer's release notes.

**For a benchmark consumer.** With B, `measurable_share` of the `must-redact` groups is higher than under legacy for every scanner, and `pending/T0` no longer says which T0 cases are candidate positives. Re-keyed per-case results are unaffected.

## 3. Fixture-index identity digests

**Decided: A, in `redact-secret-benchmarks` (ADR 0012).**

**What.** `identity.digest` and the three source digests of the projected `benchmarks/fixture-index.json` differ from legacy by design (different content: dropped product fields, canonical lineage). Each is self-consistent (parity rule `digest-self-consistent`).

**Measured impact.** None on measurement; the dual run does not read them. Anything that stores a legacy digest (peer observations in `benchmarks/lib/peer-observations.ts`, any pinned `fixture-index` digest) fails to match after the switch.

**Options.**

- A. One-time re-pin: at the switch, recompute and store the projected digests in the consumer. Simple; the history before the switch keeps the legacy digest.
- B. A translation table (legacy digest to projected digest) published with the projection. Keeps old observations addressable; one more artifact to maintain.

**Recommendation.** A, done in the same pull request as the switch in `redact-secret-benchmarks`. Stored per-fixture results should be re-keyed by canonical id through `credential-eval/legacy-id-map.json` at the same time (cutover.md, credential-eval step 2). After that, no digest needs translating.

**For a benchmark consumer.** One re-key at the switch. If the `fixture-provenance` overlay is applied, `identity.digest` must be recomputed after the overlay with legacy `digestJson` (overlay-interface.json).

## 4. Per-fixture family links (35 fixtures, 87 links)

**Decided: A (ADR 0012).**

**What.** Since stage B, fixtures of a Case that spans several families gain links the legacy index did not give them: 35 fixtures, 87 links, 34 of which change a single-family reading (the snapshot's `grouping.family` is set only when a fixture has exactly one family).

**Measured impact.** 34 cases differ in `family`; 0 measurement differences in all five scanners. `grouping.family` scopes the twin reading, and no twin result changed.

**Options.**

- A. An additive per-fixture `families` override on fixture-set items, so a fixture can narrow its Case's family set.
- B. Split those Cases by family set, so each Case covers one family set.

**Recommendation.** A. It is additive, local to the 35 fixtures, and keeps the Cases intact as authored (ADR 0007 criteria). B rewrites Case identity for a modelling convenience. Neither is urgent for the switch since no measurement moves.

**For a benchmark consumer.** Per-family views (taxonomy pages, per-family counts, any future `by_target` grouping) count these 35 fixtures under more families than legacy did until A lands.

## 5. Re-pin

**Decided: re-pinned to `1020d2b5905e8973098235e57c4cdca3359bba57` (#74),** the revision `redact-secret-benchmarks` went to production at (`0.1.0-beta.12`, redact-secret-benchmarks#600 and #601), jointly with credential-eval. In effect option B at the production revision. Option C (a legacy evidence freeze from the cutover pin on) is still open. The analysis below was written at `ade8a10` and is kept as the basis of the decision; the result is at the end of this section.

**What.** The importers, the exporter and the parity harness read the legacy repository at `ade8a10bd7922765110a68986b0690eb3861f2e5`. credential-eval's parity is pinned to `c403475476647bc98cc5864bccd7265eddebeb91`, and its parity report records a path-diff equivalence with `ade8a10` (only `benchmarks/feature-claims.json` differs, which nothing reads). Both repositories must re-prove together at any new pin.

**Path diff, `ade8a10` to `origin/develop` = `1020d2b5905e8973098235e57c4cdca3359bba57` (78 commits).** Over every path the importers, the exporter and the parity harness extract (`benchmarks`, `scanners`, `fixtures`, `schemas`, `scripts`, `tests`, `src`, `corpora`, `baselines`, `package.json`): 77 files. The ones that are read:

| Legacy file | Change | Read by | Consequence |
| --- | --- | --- | --- |
| `fixtures/generated/detector-coverage.mjs` | +27 lines: 25 new fixtures (Stripe `sk_org_` policy floor, redact-secret#1030), 1,309 to 1,334 in that corpus | `migrate:cases` (generator), parity | 25 fixtures with no canonical home: each needs a Case or Scenario and a fixture-set item in `migration/legacy-map/` (5,925 to 5,950) |
| `benchmarks/fixture-index.json`, `fixture-semantics.json` | +25 fixtures (no existing index entry changed; the generator rescored the three `stripe-token-shape-5-*` fixtures from T0 to policy/T3, found at the re-pin) | `migrate:cases`, parity | as above |
| `benchmarks/evaluation/domains/credential/assessment.ts` | +31 lines: `sk_org_` field claims, the `stripe-token` policy-floor rows | `migrate:taxonomy` (contract extraction), parity rules | format contract and variants for `stripe:organization-api-key`; the new rows are labelled project policy by legacy itself |
| `benchmarks/support/dossiers/*.md` | 28 files, frontmatter changed in 25 (verdicts, sources, `blockedBy`, `researchedAt`; e.g. `stripe:organization-api-key` from `ready` to `issuance-gated`) | `migrate:narratives`, dossier projection, parity | family research records and narratives change; review per family |
| `benchmarks/support/taxonomy.json` | 1 note (Stripe organization key) | `migrate:taxonomy`, parity | one family note |
| `benchmarks/fixture-detectors.json` | +75 lines | parity (overlay keys) | overlay key set grows by the 25 slugs |
| `benchmarks/generated-corpora.json`, `pin-manifest.json` | hashes, product pins | parity (replaced / overlay) | none canonical |
| `benchmarks/detectors.json`, `review-ledger.json` | product source revision, triage rows | taxonomy report, parity inventory (product-owned) | report counts only |
| `package.json` | `@redact-secret/core` 0.1.0-beta.11 to 0.1.0-beta.12 | inventory | credential-eval's Node shim mirrors these pins: its lockfile and the `redact-secret` scanner identity change |

Not read: `benchmarks/feature-claims.json`, `benchmarks/lib/peer-rule-families.ts`, `scanners/peer-registry.json`, `scanners/peer-rule-families.json`, `scanners/README.md`, the release-record, runtime-comparison and PII files, `baselines/0.1.0-beta.12.json`, `src/pages/performance.ts`, and the tests and scripts that only legacy runs. `scanners/peer-checksums.json` did not change: gitleaks 8.30.1 and TruffleHog 3.97.4 stay the peer pins.

**Options.**

- A. Joint pin at `c403475` now. Evidence inputs are path-identical to `ade8a10`, so the import should be a no-op apart from the recorded revision; credential-eval keeps its pin. This removes the skew between the two repositories at minimal cost.
- B. Re-pin both to the current `develop` head (`1020d2b` today). This absorbs 25 new fixtures, a new contract and 25 dossier changes, and the beta.12 product pin on the credential-eval side. It is a full re-proof in both repositories, and the head keeps moving (78 commits since `ade8a10`, 71 of them since `c403475`).
- C. Re-pin once, at the revision current when `redact-secret-benchmarks` switches, and freeze evidence authoring in legacy (new fixtures, contract rows, dossier verdicts) from that revision on. After the freeze, new evidence is authored here.

**Recommendation.** A now and C at the switch. A is cheap and makes the two repositories cite one legacy revision. B now only buys a re-proof that is stale again within days. C ends the moving target: the cutover pin is whatever legacy is when its evidence authoring stops, and then this repository becomes the place where the `sk_org_` style changes are made.

**Re-runs required.**

- For A (`c403475`): change `LEGACY_REVISION` in `scripts/migrate/lib/legacy-source.mjs` and the CI variable; `npm run migrate:taxonomy`, `npm run migrate:cases`, `npm run migrate:narratives` (expected: revision stamps only); `npm run export:legacy` (manifest source revision); `npm run parity` (expect 0 unexplained, same counts); `npm run check`. Dual run: not required, since the snapshots' content is unchanged. Confirm by the corpus digests (`sha256:32b453ce…` canonical, `sha256:4e14349a…` legacy). credential-eval: nothing (its pin is already `c403475`), apart from replacing the path-diff note in `docs/parity/parity-report.md` with "same pin".
- For B or C (`1020d2b` or later): everything in A, plus reclassify the new fixtures into Cases and Scenarios and extend `migration/legacy-map/` (by review, ADR 0007/0008); review every new parity difference against `scripts/parity/rules.json`, with no new rule written just to silence it; regenerate the cases, taxonomy, narrative and reclassification reports, `coverage:gaps` and the projection manifest; `npm run fixtures:materialize`; re-run `npm run dual-run` with all five scanners. In credential-eval: update `adapters/node` to the legacy package pins (`@redact-secret/core` 0.1.0-beta.12, lockfile and integrity), then run `tools/parity/run.sh all` at the new legacy pin: legacy export, legacy bench and eval, the credential-eval bench and eval pipelines twice, compare, and the semantic digests. Then rewrite its parity report, which now records a beta.12 `redact-secret` scanner identity.

**For a benchmark consumer.** Until the cutover pin, the projection lags legacy. Anything authored in legacy after the pin (today the 25 `sk_org_` fixtures) is absent from the projection, and an overlay keyed by those slugs has nothing to attach to (overlay keys are checked by count and sha256 in `overlay-interface.json`).

**Result at `1020d2b5` (#74).**

- Importers re-run (`migrate:taxonomy`, `migrate:cases`, `migrate:narratives`), projection and parity regenerated, fixtures re-materialized (digest `d4ac653b…`), coverage backlog regenerated.
- Fixtures 5,925 to 5,950, legacy-map entries 7,917 to 7,943. The 25 new rows were classified by the existing rules as evidence, not support status: family `stripe:organization-api-key`, evidence class `project-policy`; 15 positives in `documented-format-positives` (project as `policy`/T3) and 10 policy-floor controls in `benign-and-near-miss-controls` (`must-not-flag`/T3). The three `stripe-token-shape-5-*` fixtures follow legacy from T0 to policy/T3, so T0 candidate readings go from 31 to 28 (ADR 0012 decision 2 unchanged).
- Dossier frontmatter: 6 families lose their current contract (`issuance-gated` or rejected verdicts), 3 gain a researched state, 1 is now rejected; `stripe-token` field claims for `sk_org_` enter the contracts of the four families that share that legacy contract, the mode segment and body floor as `unresolved`. One authored narrative (`atlassian:access-token`) was adjusted because its research note and its `dossier-research` claim no longer back a statement.
- Parity: 0 unexplained; explained 28,091 to 28,181, identical 173,657 to 174,293; 21 rules, all used, none added or removed. The 90 new explained values are the new fixtures under `fixture-group-replaced-by-case` (+25), `fixture-detector-assignment` (+50) and `span-note-boilerplate` (+15). The reason collapse (`fixture-reason-collapsed-to-case`) now gives `stripe-token-mask`, `-reference` and `-label-prose` the `sk_org_` floor wording of the 10 new controls they share an evidence entry with; the rule's predicate checks it and its count is unchanged (the three shape-5 fixtures left it).
- Dual run, re-run once at the new pin with credential-eval `d5f2fb2` (beta.12 shim), all five scanners at their pins, `--jobs 4`, exploratory: for each scanner, 5,950 of 5,950 cases have identical findings and per-case measurement, with 0 unexplained drift and run-level aggregates 0 unexplained. Snapshot digests: canonical `sha256:1bc5a07b…`, legacy `sha256:e2b22ed5…`. See `docs/migration/dual-run-report.md`.

## 6. Legacy navigation scenario ids

Decided in ADR 0009: they stay map-only legacy data, and canonical navigation is the 29 Scenario records. Nothing new was measured. Listed so a maintainer can overrule it.

## What `redact-secret-benchmarks` needs from the projection and overlays

From `overlay-interface.json` (format `credential-evidence/legacy-projection-overlay-interface` v1) and the parity report's file dispositions. The projection covers the evidence inputs; the overlays carry product state the canonical data refuses to hold.

| It needs | Comes from | Owner |
| --- | --- | --- |
| taxonomy, dossier frontmatter, scenarios, categories, fixture semantics, fixture index, 67 corpora | `npm run export:legacy` at a pinned commit | credential-evidence |
| expected product detector per fixture | overlay `fixture-detectors` (5,925 slugs) | benchmarks or credential-eval adapter config |
| `supportStatus` (4 families) | overlay `taxonomy-support-status` | benchmarks (qualification policy) |
| fixture `provenance.issue/milestone/release` | overlay `fixture-provenance`, then recompute `identity.digest` | benchmarks |
| detectors, arrival targets, expected action, policy bookkeeping, `assessment.contract` | overlay `corpus-fixture-extras` | benchmarks |
| product pins and corpus hashes | overlay `pin-manifest` (hashes recomputed over the projected corpora) | benchmarks |
| per-issue workflow and scanner findings | overlay `known-gaps` | benchmarks |
| `generated-corpora.json` hashes | replaced by the projection's `provenance-manifest.json` | credential-evidence |

Gaps a maintainer should know about before the switch:

1. **Contract registry not projected.** `benchmarks/evaluation/domains/credential/assessment.ts` (57 legacy consumers) stays legacy-authored. Canonical format contracts carry the evidence claims, but there is no JSON projection of the registry. Every contract change in legacy, such as the `sk_org_` rows after the pin, is a canonical change only at the next re-pin. This is the largest remaining input not generated from here.
2. **Fixture authoring still happens in legacy.** 25 fixtures were added after the pin. The switch needs the freeze in option C above, or a re-pin cadence. Otherwise the projection and the overlays drift apart.
3. **T0 candidate kind and spans** are not recoverable from the projection (decision 2). A consumer that counts T0 cases as pending positives cannot do so.
4. **Category order.** The projection sorts by stable id. Legacy run order follows `categories.json` order. There is no overlay for order, so the consumer must sort or supply it.
5. **Not imported.** The `calibrationOnly` categories entry and `corpora/development/shadow-scoring-authored.json` (calibration input). Holdout and qualification data are never exported. These stay product-owned in legacy.
6. **Identity digests** need the one-time re-key (decision 3).
7. **Product-owned files** (`detectors.json`, `detector-inventory.json`, `review-ledger.json`, status criteria, fixture profiles, empirical observations, policy-qualified credentials, baselines) stay in legacy. This is by design, not a gap, but the build step must not expect them from the projection.
8. **No overlay tooling exists yet.** Applying overlays, recomputing the corpus hashes and `identity.digest`, and checking overlay keys against `keys.sha256` is work in `redact-secret-benchmarks`.

## Not decided here

The decisions themselves, the timing of the switch, whether epic #1's closure waits for the switch, and whether the legacy files become generated/compatibility data. Those belong to maintainers and, for the last, to the legacy repository.
