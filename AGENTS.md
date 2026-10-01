# Agent instructions

@/Users/minhokang/.codex/RTK.md

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
common stop conditions, the landing check against pipeline-owned directories, and the exact output (a change set
plus research notes listing established, inferred and unresolved).

Hygiene and backlog skills: `coverage-gaps` (what to work on next, from
`npm run coverage:gaps` and [docs/research](docs/research/README.md)), `tidy-records`
(mechanical clean-up, `npm run tidy:scan`) and `source-freshness` (re-observe sources,
`npm run source:observe`). A record that a `migrate:*` pipeline generates cannot be edited in
place until the cutover; the scan and the tools say which records those are. Commit the output of
`npm run coverage:gaps` with any change that adds, fixes or re-observes a record
(`npm run coverage:gaps:check` runs in CI).

A research or record PR is reviewed with `.agents/skills/review-research-pr/SKILL.md`
(read-only; posts a checklist comment ending in `VERDICT: pass|fail|needs-human`, never
approves or merges), which runs `npm run review:check -- <base>..<head>`.
