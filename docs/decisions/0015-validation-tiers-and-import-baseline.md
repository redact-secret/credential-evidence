# 0015. Validation tiers and the import baseline

- Status: accepted
- Date: 2026-10-03
- Issue: #79 (refs #20; benchmark-side coordination redact-secret/redact-secret-benchmarks#651)
- Amends: ADR 0004, 0008 and 0010 (the importers no longer own directories of `records/` wholesale), ADR 0006 and 0009 (the projection and parity read the import baseline, not the working tree; the credential-eval snapshot needs no legacy name), ADR 0011 (the release snapshot is built from the whole tree)
- Answers: the records-ownership question left open in ADR 0006, `docs/ops/research-cron.md` and the research skills

## Context

Until now one CI job checked out the legacy repository and ran `migrate:check`, `export:legacy:check`, `parity:check` and every test on every pull request. Those checks compare the **whole** `records/` tree with what the importers regenerate from the pinned legacy revision, byte for byte, and with the pinned legacy files. That treats imported output as permanently generated. Any canonical research change failed them: an edit to a migrated record (the importers rewrite it), a new provider or family (parity lists its fields as unexplained), a new case or fixture (the projection's strict legacy-name join throws, and the release bundle, which built its credential-eval snapshot through the projection, with it). The research harness could only open such a change as a draft labeled `blocked-by-pipeline-ownership`, and `docs/research/demo-mapbox.md` measured it: `migrate:cases:check`, `migrate:narratives:check`, `export:legacy:check`, `parity:check` (42 unexplained differences) and 22 of 278 tests failed for 21 valid records.

The importers, the legacy map, the projection and parity must stay while downstream consumers still read them (#6, #20: the legacy repository is the oracle until the recorded exit). What has to change is what they are checked against, and when.

## Decision

### 1. The import baseline is a manifest, not a directory

`docs/migration/baseline-manifest.json` (generated) lists every file the importers produced at the pinned legacy revision: path, sha256 and the importer (`migrate:taxonomy`, `migrate:cases`, `migrate:narratives`). It covers the records, `migration/legacy-map/` and the four importer reports (2,107 files at `1020d2b5`), and carries a digest over all entries. The baseline is **the set of those bytes**. The working tree is the baseline plus declared amendments plus additions.

### 2. The tree is classified against it, never silently

`npm run baseline:check` (no legacy checkout, part of `npm run check`) classifies every baseline path as `unchanged`, `edited` or `removed`, and every other file under `records/` as `added`:

- an **addition** is always allowed and counted. A new provider, family, source, case, scenario or fixture set needs nothing;
- an **edit or removal of a record** (`records/**`) must be **declared** in `docs/migration/baseline-amendments.json` as `{ path, change, reason, ref? }`, written with `npm run baseline:amend`. A missing declaration, a declaration the tree no longer needs (the edit was reverted), a wrong `change`, a path the baseline does not list, a reason under 12 characters or an unsorted ledger fails the check. `source:observe` and `record:new -- review --append` declare their own amendment with their own cause;
- the **legacy map and the importer reports are immutable references**. No amendment can excuse an edit of them; only a re-pin, which regenerates the manifest, changes them. A new file under `migration/` fails (the legacy map is closed: a new record gets no legacy name).

The ledger carries a cause, not a digest, so two research branches that amend different records do not conflict and an amendment never goes stale because the record was edited again.

### 3. Historical checks regenerate the baseline; they do not read the tree

The importers form one in-memory chain (taxonomy, then cases, then narratives; `scripts/migrate/lib/baseline-build.mjs`): each stage takes the previous stage's output as a file map and never reads `records/`. Their results depend only on the pinned legacy revision (read with `git archive`, never the benchmark checkout's HEAD or working tree) and importer code, including `scripts/migrate/authored/`.

- `migrate:*:check` regenerates and requires exactly the importer's slice of the manifest. The tree is not compared.
- `export:legacy:check` and `parity:check` project the **baseline view** (`scripts/migrate/lib/baseline-view.mjs`): the manifest's records read from the tree while it still holds them unchanged (verified by digest), regenerated from the pin and required to equal the manifest when a baseline record was amended or removed. Parity therefore runs on the same bytes at any time, and its result (0 unexplained, 27,965 explained, 174,336 identical at `1020d2b5`) cannot move because of a canonical change.
- `migrate:*` write modes refuse while amendments are declared (a re-import would overwrite reviewed edits) and refuse to overwrite a different file that is not in the baseline; they never delete a file the manifest does not list; they update their slice of the manifest.
- `fixtures:materialize:check` stays ordinary and no longer compares its digest with `docs/migration/cases-report.md`, which describes the baseline; `migrate:cases:check` already proves that report.

Parity gets no new rule and no allowlist: a canonical change is not a difference between the projection and the legacy files, because the projection is of the baseline.

### 4. The snapshot builder needs no legacy name

`credential-eval/corpus-snapshot.json` is built by `buildSnapshot` from the canonical fixtures of whatever records it is given (`scripts/export/lib/projection.mjs`), with canonical ids and paths (ADR 0009). The release bundle calls it on the whole tree; the legacy projection calls the same code on the baseline, and a test pins that the two agree there. Before this, a new fixture without a legacy-map entry made the release bundle throw.

### 5. Two tiers

| Tier | What | When | Needs |
| --- | --- | --- | --- |
| **Ordinary** (`verify`) | `validate`, `lint:identity`, `lint:narrative`, `lint:skills`, `baseline:check`, `coverage:gaps:check`, `fixtures:materialize:check`, `npm test` (unit tests that do not assert the imported baseline) | every pull request and push | this repository |
| **Historical** (`historical`) | `historical:check` = `baseline:check`, `migrate:check`, `export:legacy:check`, `parity:check`, `test:historical` (`tests/historical/`, the tests that assert the imported set) | a change to `scripts/migrate/`, `scripts/export/`, `scripts/parity/`, `scripts/dual-run/`, the shared generator modules they import, `schemas/`, `migration/`, `docs/migration/`, `tests/historical/`, `package*.json` or `.github/workflows/`; always on `workflow_dispatch` and in `release.yml` | the legacy repository at `LEGACY_REVISION` |

The trigger list is `scripts/lib/historical-scope.mjs`; a test computes the import closure of every historical entry point and fails if a file is missing from it. The historical job decides from the diff inside the job and reports success with the reason when it is out of scope, so it stays safe to require as a status check (a path-filtered workflow would leave a required check pending). An undeterminable diff runs the checks.

### 6. Periodic audit: documented, dispatch only

The audit is a manual `workflow_dispatch` of CI at least monthly, at every re-pin and before a release (the release workflow runs it regardless). It catches what a path filter cannot: a pinned legacy commit that became unreachable, a toolchain drift in the legacy generators, a workflow edit that weakened a check. **No `schedule:` trigger is added.** `tests/workflows.test.mjs` forbids one in any workflow; enabling a cron is the maintainer's decision.

### 7. The research harness

The ownership gate is removed: no `blocked-by-pipeline-ownership` outcome or label, no historical check in a run. A run's gate is `npm run check` (which includes `baseline:check`), `coverage:gaps:check`, `fixtures:materialize:check` and `review:check`. The pull request body lists the amended baseline records. A run still may not change an importer, the projection, parity or the manifest.

## Alternatives rejected

- **Keep the whole-tree checks and let authored records be drafts.** The status quo. It blocks every canonical research change on a maintainer decision about checks that cannot be affected by evidence quality.
- **Freeze or retire the importers, the legacy map and the projection now.** Violates the cutover rule (#6, #20: nothing legacy is deleted or frozen while consumers read it) and the recorded oracle exit in the benchmark repository.
- **Move authored records to a second tree.** Doubles loaders, validators, identity rules and the release bundle, and does nothing for an edit to a migrated record, which is the other half of the question.
- **Exclude non-generated paths from the whole-tree checks (a glob or allowlist).** Silently permits every edit to a migrated record and hides additions. The classification must be explicit and machine-checked.
- **Allowlist post-import differences in parity.** ADR 0006 and 0009 forbid blanket rules; here there is nothing to excuse, because the projection is built from the baseline.
- **Reconstruct the baseline from git history at a recorded commit.** Needs full history in every job and ties reproducibility to repository history instead of to the pinned legacy revision and the importer code.
- **A ledger of digests (record the amended version's sha256).** Changes with every edit, conflicts between branches and proves nothing the manifest does not already prove; the baseline digest plus a stated cause is enough.
- **Make `migrate:*:check` compare the tree except for declared paths.** The generated reports and the chained importers read the tree (cases-report counts 176 families instead of 173 with a new provider), so a tree comparison cannot be made independent of canonical changes; the in-memory chain can.
- **A `schedule:` cron for the audit.** A new unattended workflow is a decision this change does not take.

## Consequences

- A reviewed canonical change (an edit to a migrated record, or a new provider, family, case, scenario) passes the ordinary gate with nothing but the declaration for an edit; `tests/canonical-change.test.mjs` proves both on a synthetic copy. The historical checks still reproduce the baseline and parity at the pin with 0 unexplained over a tree carrying both (`tests/historical/amended-tree.test.mjs`), and fail when a baseline file is deleted or mutated without a declaration, or the manifest or an importer input is tampered with.
- Migration traceability is kept: `migration/legacy-map/`, the manifest, the reports and the projection manifest are immutable references; the amendments ledger names every divergence from the baseline with its cause.
- The ordinary job no longer checks out the legacy repository. The historical job costs the same as before when it runs.
- A re-pin regenerates the manifest through the importers' write modes (cutover.md, "Re-pinning"). With amendments declared it must first revert them or carry them over as new records; this is intentionally a maintainer step.
- The importers, the projection and parity can be retired later by deleting the historical tier and the manifest as one change; nothing else depends on them.

## Open questions

- When the oracle exit is met (redact-secret/redact-secret-benchmarks#651, #660): retire the importers and the legacy map, and what happens to the amendments ledger (fold into the records and drop the ledger).
- Whether the audit should become a scheduled workflow. Not decided here.
