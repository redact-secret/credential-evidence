# Authoring records

How to add or change canonical records without hand-writing their JSON shape. People and agent
skills use the same two commands. The rules behind them are in the
[shared references](../.agents/skills/_shared/README.md); the schemas in `schemas/v1/` are the
authority on shape.

```bash
npm run record:new -- <kind> <arg> [flags]     # a valid draft skeleton under records/
npm run record:check [-- <paths>]              # fast check of changed records
npm run check                                  # the gate (also CI)
```

## `record:new`

Writes one record, never overwrites a file, never fetches or guesses a claim. Same arguments and
`--date` give the same bytes. The skeleton is schema-valid and `lifecycle: draft`; each field you
still have to write holds `TODO(record:new): ...`, and `npm run validate` (and CI) fails until none
is left. Evidence starts at `unresolved` and outcomes at `not-assertable`: nothing is claimed
until you cite sources.

| Kind | Command | Computed for you | Writes |
| --- | --- | --- | --- |
| provider | `record:new -- provider acme --name "Acme Cloud"` | path | `records/providers/acme.json` (complete) |
| family | `record:new -- family acme:api-key --name "API key"` | provider check, path, `unresearched` state | `records/families/acme/api-key.json` (TODO: `description`) |
| contract | `record:new -- contract acme:api-key` | next revision, `supersedes`, path | `records/contracts/acme/api-key@1.json` (TODO: first claim; `period: proposed`) |
| source | `record:new -- source https://docs.acme.example/keys --source-type provider-documentation --observer my-agent` | id (host + digest), pin kind, directory, `observedAt` | `records/sources/<host>/<id>.json` (TODO: `title` unless `--title`) |
| scenario | `record:new -- scenario documentation-example-value --title "..." [--family acme:api-key]` | applicability shape | `records/scenarios/<slug>.json` (TODO: description, semantics, rationale, basis) |
| case | `record:new -- case example-key-in-readme --title "..." --type benign --family acme:api-key=lookalike --scenario documentation-example-value` | reference check, `unscopedReason` when no family | `records/cases/<slug>.json` (TODO: summary, rationale, expectation) |

Flags: `--name` (provider, family), `--title` (scenario, case, source), `--alias`, `--homepage`,
`--description`, `--source-type`, `--observer`, `--observed-at`, `--type` (repeat or comma-separate),
`--family <id>[@<revision>][=<role>]` (repeatable; roles `subject|lookalike|context|companion`),
`--class`, `--applies-to`, `--scenario`, `--revision` (must be the next one), `--date YYYY-MM-DD`
(default: today UTC), `--dry-run` (print the record, write nothing), `--root <dir>` (tests). A
`source` observation says someone read the page: pass `--observed-at` only with the real date.

Exit codes: 0 created, 1 refused, 2 usage error.

### What it refuses

- a **duplicate id** or an existing path (a source URL that is already recorded: append an
  observation to it instead);
- an unknown reference: provider of a family, family of a contract, family or scenario of a case or
  scenario, contract revision;
- **forbidden identity coordinates** ([ADR 0007](decisions/0007-identity-correction-scenarios-and-fixture-plans.md)):
  legacy suite names, beta/milestone/issue/PR/release coordinates, detector or scanner names, and, in
  scenario and case ids, evidence tier or basis (`t0`, `tier-2`, `unresolved`, ...);
- an id that is not a valid slug or a skeleton the schema rejects (the schema is the check, there is
  no second copy of the rules);
- sources: a non-https URL, a URL with credentials or a token-, key- or signature-like query
  parameter, a GitHub file link that names a branch or tag instead of a 40-hex commit.

The scaffolder does not support `variant`, `benign-sibling`, `family-narrative`,
`evidence-review-history`, `fixture-plan`, `fixture-set` or `legacy-map` yet; copy the shape of
`examples/valid/examplecloud/`.

### Assertable cases need a fixture

A case with `must-flag`, `must-not-flag` or `may-flag` fails validation unless a fixture projects it.
That is why the skeleton is `not-assertable`. Raise the outcome (and its basis, with sources) in the
same change that adds the fixture. See [case vs scenario](../.agents/skills/_shared/case-vs-scenario.md)
before creating a case at all.

## `record:check`

Fast subset of `npm run validate` for the records you touched: JSON schema, references and
uniqueness against the whole universe the file belongs to, the identity lint, the narrative lint and
the placeholder lint. Uses the validator's own code.

```bash
npm run record:check                                       # every record changed vs merge-base with origin/main, in the working tree, or untracked
npm run record:check -- records/cases/example-key-in-readme.json records/scenarios
npm run record:check -- --base origin/develop             # a different base
```

Exit 0 when clean, 1 with one problem per line. It reports problems **in the files it checks**; a
change that breaks a record it does not touch (deleting a cited source, say) is caught by
`npm run validate`, which stays the gate. After a change that the migration, exporter or parity
checks read, also run `migrate:check`, `export:legacy:check`, `parity:check` and
`fixtures:materialize:check`.

## Typical flow

1. Read the [shared references](../.agents/skills/_shared/README.md) that apply.
2. `record:new -- source ...` for each page you read, then the family, contract, scenario or case.
3. Replace every `TODO(record:new)`; cite sources by `{ sourceId, supports, locator }`.
4. `record:check` while editing, `npm run check` before the pull request.
5. A person other than the author reviews before `lifecycle` leaves `draft`.

## Reviewing a research PR

```bash
npm run review:check -- <base>..<head> [--body-file <pr-body.md>] [--json]
```

A deterministic, read-only pre-filter over the git range, used by the
[`review-research-pr`](../.agents/skills/review-research-pr/SKILL.md) skill and runnable by hand. It
reports forbidden and independence wording, scanner-consensus phrasing, provenance and
evidence-class completeness, ADR 0007 identity, the additive rule, unrecorded conflicts, a Case
that reads as a Scenario, prompt-injection indicators and secret-shaped values (shape and length
only, never the text). The last line is `VERDICT: pass|fail|needs-human`; exit codes 0, 1, 3 (2 is a
usage error). `pass` means no mechanical rule broke, not that any claim is true. Seeded good and
bad diffs for it live under `tests/fixtures/review/`.
