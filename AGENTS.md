# Agent instructions

@\~/.codex/RTK.md

Read `README.md` and `ARCHITECTURE.md` before changing this repository. They
define the canonical ownership and dependency direction.

## Repository boundary

`credential-evidence` owns scanner-neutral credential knowledge: providers,
credential families, format contracts, provenance, cases, benign siblings, and
fixture lineage. It does not own scanner implementation or execution,
measurement results, product support policy, release decisions, or site
presentation.

The primary architectural test is: would this record still make sense if
Redact Secret did not exist?

## Working rules

- Start from a provider, credential family, case, or source claim—not a
  detector name.
- Author expectations from evidence and case reasoning, never from a scanner
  majority or current output.
- Give every material claim traceable provenance and an observed-at date.
- Preserve authored-versus-generated lineage. Generated fixtures are derived
  artifacts, not canonical evidence.
- Use stable, URL-safe identities independent of scanner versions.
- Prefer additive schema changes and explicit migrations. Never silently
  reinterpret an existing record.
- Use only unmistakably synthetic or documented public-test values. Active,
  revoked-but-real, customer, incident, or personal data is forbidden.
- Disclose that the repository is maintained by the Redact Secret project;
  never describe project-maintained evidence as independent validation.

## Branches

`main` is the default and, today, the only long-lived branch on `origin`: open pull requests against it
(`gh pr create --base main`). CI (`verify` and `historical`) runs on every pull request and every push to `main`.
There is no `develop`; `npm run research:run` uses `develop` as its base only if `origin` has that branch, else `main`,
and `record:check` defaults to `origin/main`. If `develop` is ever introduced, this section changes first. Never merge your
own pull request.

## Before finishing

Run all validation, schema, reference, generation, and formatting checks that
exist in the repository. If implementation is not present yet, report that
fact rather than inventing commands. Verify that new fixtures trace to an
authored case, reviewed contract, or documented generation rule and that no
scanner-specific support status entered the canonical model.

## Local skills

Workflows under `.agents/skills/` are specialized for this evidence
repository. Security scans must distinguish intentional synthetic
credential-shaped fixtures from accidental real material.

Skills that add or edit records read the shared references in
[`.agents/skills/_shared/`](.agents/skills/_shared/README.md) (reference pages,
not a skill) and create records with `npm run record:new`, checking them with
`npm run record:check` ([docs/authoring.md](docs/authoring.md)), instead of
hand-writing record JSON.

Research skills (one bounded unit per run, headless or interactive, always a pull request, never a merge):
`research-provider` (a provider's candidate credential families from its official documentation),
`research-family` (format contract, variants, benign siblings, narrative, sources for one family) and
`author-case` (a Case only if it meets the ADR 0007 criteria, otherwise a Scenario or no record). They share
[`.agents/skills/_shared/research-run.md`](.agents/skills/_shared/research-run.md): the headless defaults, the
common stop conditions, how imported and new records are handled (a new record needs nothing, an edit to an imported one is declared), and the exact output (a change set
plus research notes listing established, inferred and unresolved).

Hygiene and backlog skills: `coverage-gaps` (what to work on next, from
`npm run coverage:gaps` and [docs/research](docs/research/README.md)), `tidy-records`
(mechanical clean-up, `npm run tidy:scan`) and `source-freshness` (re-observe sources,
`npm run source:observe`). A record the migration importers produced (the import baseline) may be edited
when the evidence requires it; declare the edit with `npm run baseline:amend -- <path> --reason "..."`
(`npm run check` fails otherwise; `source:observe` and `record:new -- review --append` declare their own). Each
declaration is its own file under `docs/migration/baseline-amendments/` so parallel pull requests never conflict
(ADR 0015, Addendum 1). `npm run coverage:gaps` writes the coverage report to the gitignored
`docs/research/generated/`: generate it when you need a backlog, never commit it, no CI check reads it.

A research or record PR is reviewed with `.agents/skills/review-research-pr/SKILL.md`
(read-only; posts a checklist comment ending in `VERDICT: pass|fail|needs-human`, never
approves or merges), which runs `npm run review:check -- <base>..<head>`.

Unattended runs: `npm run research:run -- [--dry-run] [--kind <gap-kind>]` is the deterministic shell around one
cron-style run (selection from the coverage backlog, dedupe against open PRs, branches and `needs-human`
issues, budget, fetch allowlist, gate, one PR or one issue, run log under the gitignored `.research-runs/`); the
`research-cron-run` skill and [docs/ops/research-cron.md](docs/ops/research-cron.md) are its contract. Always
try `--dry-run` first. A run never merges and never touches migration importers, the legacy export, parity or
the baseline manifest, and the example schedules in `docs/ops/examples/` are inactive: activating one is the
maintainer's decision.

Validation tiers (ADR 0015, [docs/migration/validation-split.md](docs/migration/validation-split.md)): the
**ordinary** gate (`npm run check`, `fixtures:materialize:check`) runs on every pull request
and needs no legacy checkout. The **historical** pinned checks (`npm run historical:check`: `baseline:check`,
`migrate:check`, `export:legacy:check`, `parity:check`, `tests/historical/`) regenerate the import baseline from
the pinned legacy commit and run in CI only when an importer, the legacy map, the projection, parity, a schema or
shared generator code changes, on `workflow_dispatch` (the periodic audit) and on a release. Do not skip them when
you change those paths, and do not run them as part of a records-only change.
