# Ordinary validation and the historical pinned checks

Issue #79 (refs #20). Decision: [ADR 0015](../decisions/0015-validation-tiers-and-import-baseline.md). This note is the analysis that came first, the resulting boundary and how to operate it.

## 1. What treated imported output as permanently generated

Measured on `main` at `0b0aff2` (357 tests), before the split.

| Check or test | What it assumed | Why a canonical change broke it |
| --- | --- | --- |
| `migrate:taxonomy:check`, `migrate:cases:check`, `migrate:narratives:check` | The regenerated files equal the tree, byte for byte, and no file in an owned directory is missing from the regeneration (`stale`). The cases and narrative importers read the taxonomy **from `records/`**. | An edit to a migrated record `differs`; any new file in `records/{scenarios,cases,fixture-plans,fixtures,narratives,narrative-reviews}` is `stale`; a new provider or family changes the family count in the reports (176, not 173, in the demonstration). |
| `export:legacy:check` | The projection of the whole tree equals the committed manifest; every canonical fixture has a legacy-map entry. | The manifest digests all of `records/`; a new fixture has no legacy name and the join throws (`canonical fixture ... has no legacy-map entry`). |
| `parity:check` | The projection of the whole tree equals the legacy files at the pin, all but explained leaves. | A new provider or family appears in the projected taxonomy and dossier frontmatter and not in the legacy files: 42 unexplained "added" differences in the demonstration. Rules cannot excuse ids, names or descriptions, by design. |
| `release:check` / `release:bundle` | The credential-eval snapshot comes out of the same projection. | A new fixture without a legacy name made the release bundle throw. Not a legacy-compatibility concern at all. |
| `fixtures:materialize:check` | The materialization digest of the whole tree equals the digest printed in `cases-report.md`. | Any added or amended fixture changes the digest. |
| Tests (all in the old `tests/*.test.mjs` run) | Counts and shape of the imported set: 93 providers, 173 families and narratives, 52 Cases, 29 Scenarios, 5,950 fixtures, narratives all `draft`, every imported record carries migration provenance, importer idempotence, the manifest equals the regenerated one, parity 0 unexplained over the tree. | 22 of 278 failed for the 21 demonstration records (`docs/research/demo-mapbox.md`). Files: `migrate-cases`, `migrate-taxonomy`, `export-legacy`, `parity`, the migrated-tree half of `narrative`. |
| `ownerOf` (`scripts/lib/ownership.mjs`), `tidy:scan`, `source:observe` | Records in importer directories or carrying a `legacy-taxonomy-import` reference are importer-owned: do not edit. | `source:observe` refused to append a freshness observation to 894 imported sources, which includes every `unverified-import` row of the source-freshness backlog. |
| Research harness | Step 5 ran the three historical checks; a failure was a draft PR labeled `blocked-by-pipeline-ownership`. | Every provider, family, case or narrative PR opened as a draft. |
| `ci.yml` | One job, the legacy repository checked out, all of the above on every pull request. | Every PR paid for, and could fail on, the importers. |

Not affected, and kept as they are: schema validation, identity and narrative lint, skill lint, `coverage:gaps:check` (regenerated and committed with the change), `record:check`, `review:check`, and the unit tests that build synthetic records.

## 2. What a reviewed canonical change broke

- **An edit to a migrated record** (for example a corrected family description, or an appended source observation): the importer check reports `differs`, the projection manifest and parity report stale, parity reports the description as an unexplained change, and the next regeneration would overwrite the edit. There was no way to land it.
- **A new provider, family, case, scenario or fixture set**: the importer checks report `stale` or changed reports, the projection throws or stales, parity reports unexplained additions, the unit tests that count the imported set fail.

## 3. The boundary now

The importers, the legacy map, the projection and parity describe **the import baseline at the pin**; they are no longer judged against the working tree. Everything the evidence process authors, in `records/`, is judged by the ordinary gate.

| Tier | Commands | Needs the legacy checkout | Runs |
| --- | --- | --- | --- |
| Ordinary | `validate`, `lint:identity`, `lint:narrative`, `lint:skills`, `baseline:check`, `coverage:gaps:check`, `fixtures:materialize:check`, `npm test` | no | every pull request and every push (`verify`) |
| Historical | `baseline:check`, `migrate:check`, `export:legacy:check`, `parity:check`, `test:historical` (= `npm run historical:check`) | yes, at `LEGACY_REVISION` | an importer, legacy-map, projection, parity, schema or shared-generator change (`historical`); `workflow_dispatch`; `release.yml` |

Traceability is kept by four immutable references, none of which a canonical change can alter: `migration/legacy-map/`, `docs/migration/baseline-manifest.json` (2,107 paths and digests: records, legacy map, four reports), the importer reports, and the projection manifest and parity report. Divergence from the baseline is explicit in `docs/migration/baseline-amendments.json`: one entry per edited or removed baseline record, with its cause.

What the baseline classification reports for a tree (`npm run baseline:check`):

```
OK: baseline c7d8ce33f3d0 (legacy 1020d2b5): 2,107 files, 2,107 unchanged, 0 edited, 0 removed (all declared); 0 post-import file(s) added
```

## 4. Declaring an edit to a migrated record

```bash
# edit the record, then
npm run baseline:amend -- records/families/aws/iam-user-access-key.json --reason "Description restated after re-reading the documentation" --ref "#123"
npm run check
```

An addition needs nothing. `source:observe` and `record:new -- review --append` declare their own amendments. Reverting an edit makes its declaration stale (`baseline:check` fails until the entry is removed). The legacy map and the reports cannot be amended.

## 5. The periodic audit

The historical tier is skipped on a change that cannot affect it, so something else has to prove that the baseline is still reproducible. The audit is **a manual dispatch of the `CI` workflow** (Actions, CI, Run workflow, branch `main`; both jobs run, the historical one unconditionally). Run it:

- at least monthly (the first working day), because the pin must stay fetchable from the legacy repository and the legacy generators run in the pinned toolchain;
- at every re-pin;
- before and after a change to the CI workflows themselves;
- before a release (`release.yml` also runs the whole historical tier at the released commit, so this is a belt-and-braces step).

There is no `schedule:` trigger. Adding one is a maintainer's decision (ADR 0015), and `tests/workflows.test.mjs` fails if a workflow gains one without that test being changed on purpose.

## 6. Re-pinning with the baseline

See `docs/migration/cutover.md`, "Re-pinning". With the manifest the steps are: change `LEGACY_REVISION` and the three workflow variables; make sure no amendments are declared (revert them, or re-apply them afterwards as new edits: the write modes refuse while the ledger is non-empty); run `migrate:taxonomy`, `migrate:cases`, `migrate:narratives` (each rewrites its slice of the manifest), `export:legacy`, `parity`; run `historical:check`. A post-import file that collides with a regenerated path stops the write.

## 7. Verified and not verified

Verified here: the ordinary gate passes for an edit to a migrated record and for a synthetic new provider, family, source, scenario, case and fixture in a copy (`tests/canonical-change.test.mjs`); the historical checks reproduce the baseline and parity at the pin with the same numbers over a tree that carries both (`tests/historical/amended-tree.test.mjs`) and fail on an undeclared mutation or deletion, a tampered manifest or a changed importer input; the credential-eval snapshot digest of the current tree is unchanged (`sha256:66dcb94b...`).

Not verified: that the branch protection of `main` requires `verify` (the repository reports no protection on `main`; whether `historical` should be required too is the maintainer's choice, and it is safe to require because it reports success when out of scope).

## 8. Tests must not assume an empty ledger (#86)

The first research pull requests that declared an amendment (#83, #84, #85) turned both jobs red although each change
was valid: the tests that copy the repository assumed `baseline-amendments.json` was empty and the baseline records
pristine, and one ordinary test regenerated the baseline from the legacy checkout that `verify` does not have. The rules
since:

- **Ordinary tests** (`tests/*.test.mjs`, the `verify` job) copy the live tree, ledger included, and mutate a record the
  live tree still holds unchanged (`untouchedRecord` in `tests/repo-copy.mjs`). Counts come from the live classification
  (`liveCounts`) or from the live tree (fixture totals), never from the size of the import at the pin. They never need the
  legacy checkout (`tests/workflows.test.mjs` forbids it). A test that asserts the baseline itself belongs to the
  historical tier.
- **Historical tests** (`tests/historical/`) that mutate the tree start from `copyBaseline()`
  (`tests/historical/baseline-copy.mjs`): every baseline record restored byte for byte (amended ones regenerated from the
  pin and proven equal to the manifest), additions dropped, empty ledger. The plain copy of the live tree is used
  to prove the other direction: the historical checks pass over whatever amendments the live tree declares and print the
  same numbers as over the pristine baseline.
- `tests/ledger-hermetic.test.mjs` is the regression test: it declares three real amendments in a copy (the three tools that
  declare them) and runs `baseline.test.mjs` and `canonical-change.test.mjs` inside it with no legacy checkout.
