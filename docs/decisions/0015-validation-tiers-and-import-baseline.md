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
- an **edit or removal of a record** (`records/**`) must be **declared** as a file in `docs/migration/baseline-amendments/` holding `{ path, change, reason, ref? }`, written with `npm run baseline:amend` (layout and ids: Addendum 1; it was one `baseline-amendments.json` until #88). A missing declaration, a declaration the tree no longer needs (the edit was reverted), a wrong `change`, a path the baseline does not list, a reason under 12 characters or a file whose name does not match its content fails the check. `source:observe` and `record:new -- review --append` declare their own amendment with their own cause;
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
| **Ordinary** (`verify`) | `validate`, `lint:identity`, `lint:narrative`, `lint:skills`, `baseline:check`, `fixtures:materialize:check`, `npm test` (unit tests that do not assert the imported baseline) | every pull request and push | this repository |
| **Historical** (`historical`) | `historical:check` = `baseline:check`, `migrate:check`, `export:legacy:check`, `parity:check`, `test:historical` (`tests/historical/`, the tests that assert the imported set) | a change to `scripts/migrate/`, `scripts/export/`, `scripts/parity/`, `scripts/dual-run/`, the shared generator modules they import, `schemas/`, `migration/`, `docs/migration/`, `tests/historical/`, `package*.json` or `.github/workflows/`; always on `workflow_dispatch` and in `release.yml` | the legacy repository at `LEGACY_REVISION` |

The trigger list is `scripts/lib/historical-scope.mjs`; a test computes the import closure of every historical entry point and fails if a file is missing from it. The historical job decides from the diff inside the job and reports success with the reason when it is out of scope, so it stays safe to require as a status check (a path-filtered workflow would leave a required check pending). An undeterminable diff runs the checks.

### 6. Periodic audit: documented, dispatch only

The audit is a manual `workflow_dispatch` of CI at least monthly, at every re-pin and before a release (the release workflow runs it regardless). It catches what a path filter cannot: a pinned legacy commit that became unreachable, a toolchain drift in the legacy generators, a workflow edit that weakened a check. **No `schedule:` trigger is added.** `tests/workflows.test.mjs` forbids one in any workflow; enabling a cron is the maintainer's decision.

### 7. The research harness

The ownership gate is removed: no `blocked-by-pipeline-ownership` outcome or label, no historical check in a run. A run's gate is `npm run check` (which includes `baseline:check`), `fixtures:materialize:check` and `review:check` (the coverage report is not a gate: Addendum 1). The pull request body lists the amended baseline records. A run still may not change an importer, the projection, parity or the manifest.

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

- When the oracle exit is met (redact-secret/redact-secret-benchmarks#651, #660): retire the importers and the legacy map, and what happens to the amendments ledger (fold into the records and delete `docs/migration/baseline-amendments/`).
- Whether the audit should become a scheduled workflow. Not decided here.

## Addendum 1 (2026-10-03, #88): conflict-free parallel research pull requests

The research pilot ran pull requests in parallel and found two shared files that every one of them rewrote, so the second to land
always conflicted. Both are removed as shared state. Nothing in the integrity semantics above changes.

### 1. One file per declared amendment

`docs/migration/baseline-amendments.json` (one array every edit appended to) is replaced by the directory
`docs/migration/baseline-amendments/`, one file per declaration:

```
docs/migration/baseline-amendments/<slug>.<id>.json
{ "format": "credential-evidence/baseline-amendment", "formatVersion": 1, "path": "records/...", "change": "edited|removed", "reason": "...", "ref": "#N" }
```

- `id` is the first 12 hex digits of `sha256("<path>\n<change>\n<reason>")`. It is a pure function of what is declared (`ref` is not part of it).
- `slug` is the record path without `records/` and `.json`, with `/` written `__`, cut at 100 characters. It only makes the directory readable; the id carries uniqueness.
- The file is canonical JSON (`JSON.stringify(doc, null, 2)` plus a newline). `baseline:check` fails on a file whose name is not the one derived from its content, that is not canonical, is not JSON, has an unknown field, a non-record path or a short reason, and on a stray non-`.json` file. An absent directory is an empty ledger.
- Different records give different files, so two pull requests that amend different records never touch the same file. The same declaration made on two branches is the same bytes in the same file, which merges cleanly. A record amended again with a new reason adds a second file next to the first (the history of why stays in the tree); `source:observe` and `record:new -- review --append` do not declare a record that is already declared, so a later observation adds nothing. Two open pull requests that amend the same record still collide, but in the record itself, which no ledger layout can avoid.
- Semantics unchanged: an undeclared edit or removal fails; a declaration needs a matching `change` (with several files for one record, at least one must match the tree; a record that equals the baseline again makes every one of its files stale and each is named); an amendment for a path the baseline does not list fails; only `records/` can be amended and the legacy map, the manifest and the importer reports stay immutable; the historical checks regenerate the baseline from the pin and never read the amendments; the importers' write modes still refuse while any amendment is declared.
- The 14 entries of the old file were moved mechanically: each entry became the file its `(path, change, reason)` names, byte-identical fields, `ref` kept; the old file was deleted in the same change. The generated `note` inside `baseline-manifest.json` still names the old file because the manifest is an immutable reference that only a re-pin regenerates.
- The research harness may now change the amendment files (`ALLOWED_PATHS`), which `baseline:amend` needs and the single JSON never had a path rule for.

`tests/amendment-merge.test.mjs` is the regression test: in a throwaway repository two branches from one base each declare an amendment and append a source observation, and merge into each other's base with zero conflicts.

### 2. The coverage report is generated, not committed

`docs/research/backlog.json` and `coverage.md` changed on almost every research pull request and were checked in CI, so parallel pull requests conflicted on them and a pull request failed for an unrelated, already merged change. They are no longer tracked. `npm run coverage:gaps` writes them to `docs/research/generated/` (gitignored); `coverage:gaps:check` is removed from `npm run check`, `ci.yml` (`verify`) and `release.yml`; the generator, its determinism tests and `--next` stay. `npm run research:run` already generated its backlog fresh (`coverage-gaps.mjs --next --as-of <run date>`) and still does. The authored `docs/research/README.md` and `provider-wishlist.json` stay committed.

### Alternatives rejected

- **Keep the single file and sort or merge with a custom merge driver.** A driver is local configuration, not repository state, so CI and other clones would still conflict.
- **A per-record id from the path alone.** One file per record, but two pull requests that each declare a different reason for the same record then conflict on the file, and a later reason overwrites history. Including change and reason costs nothing and keeps both.
- **Random or timestamp ids.** Not deterministic: the same declaration made on two branches would be two files, and the migration would not be reproducible.
- **Id from path, change and reason plus a sequence number.** A counter is shared state again.
- **One file per provider or per record directory.** Still shared by unrelated research on the same provider.
- **Keep committing the coverage files but regenerate them on merge.** Needs a bot commit to the default branch; the report is derived, so nothing is lost by not storing it.
- **Write the generated files to a CI artifact only.** The harness and the skills need them locally, so the generator keeps writing a gitignored directory, and CI uploads nothing.
