# 0004. Records layout and taxonomy import

- Status: accepted
- Date: 2026-09-30
- Issue: #3 (part of #1)

## Context

ADR 0001 left the layout under `records/` to #3 and #4. #3 imports the provider
taxonomy, dossiers and format-contract provenance from
`redact-secret/redact-secret-benchmarks` at
`ade8a10bd7922765110a68986b0690eb3861f2e5`.

## Decision

### Layout

One JSON record per file. Filenames are conveniences; the `id` inside is
authoritative (ADR 0002).

| Directory | Record | Path |
| --- | --- | --- |
| `records/providers/` | `provider` | `<provider>.json` |
| `records/families/` | `family` | `<provider>/<family>.json` |
| `records/contracts/` | `format-contract` | `<provider>/<family>@<revision>.json` |
| `records/reviews/` | `evidence-review-history` | `<provider>/<family>.json` |
| `records/sources/` | `evidence-source` | `<host>/<id>.json` |
| `records/variants/`, `records/siblings/` | `variant`, `benign-sibling` | reserved; no structured legacy source exists |

Sharding by provider (or host for sources) keeps directories small. Cases and
fixtures (#4) get their own directories.

### Source ids

An evidence-source is one URL without its fragment. Its id is
`<host>[-<owner>-<repo>]-<first 10 hex of sha256(url)>`: readable, stable, and free
of dates. The fragment is kept as the `locator` of each citing `sourceRef`, so the
exact legacy URL is rebuilt from canonical records.

A legacy GitHub file link that names a tag or branch cannot be a v1 locator (ADR
0003 forbids live GitHub file links). The locator is the repository, and the exact
URL is kept in a `legacy-url` external reference until it is resolved to a commit.

### Provenance and ownership

Every record the import writes carries an `externalRefs` entry with system
`legacy-taxonomy-import` and id `<legacy sha>:<legacy path>`; the note names the
entry within that file. The marker also defines ownership: `--check` and
regeneration only compare, write and delete files that carry it.

### What the import asserts

- Records are `draft`. Import is not review.
- Tiers become evidence classes (T1 `provider-documented`, T2 `tool-corroborated`,
  T3 `project-policy`, T0 `unresolved`), per ADR 0001, with one mechanical
  tightening from `docs/governance/evidence-classes.md`: a `tool-corroborated`
  claim needs artifacts from two distinct owners, otherwise it imports as
  `unresolved`.
- Legacy contracts are keyed by detector. Where one contract covers several
  families, its claims attach to each family, marked as shared, and its
  regular expression attaches to none.
- Free-text legacy prose is kept only as verbatim, labelled review-history events;
  it never populates a descriptive field.
- `supportStatus`, fixture profiles, scores, twin bookkeeping and per-run ledgers
  are dropped and counted in `docs/migration/taxonomy-report.md`.

### Validation universes

`npm run validate` checks `examples/valid` and `records/` separately, because an
illustrative example (the AWS worked example) may reuse the id of a real record.

## Consequences

- The report is regenerated with the records; a change to the importer changes
  both, and `npm run migrate:taxonomy:check` fails on drift.
- Around 850 evidence sources and 170 contracts are draft until reviewed.

## Open questions

- Resolving tag-pinned GitHub links to commits needs the network and belongs to a
  separate, explicitly non-deterministic step.
- Whether a `contextGated` (no bare-value grammar) contract property should become
  a modelled structure field (additive change).
- Whether a first-class `imported` block (as on `fixture-projection`) should replace
  the `externalRefs` marker on every kind (additive change).
