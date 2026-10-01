# Authoring records

How to add or change canonical records without hand-writing their JSON shape. People and agent
skills use the same two commands; the research skills
([research-provider](../.agents/skills/research-provider/SKILL.md),
[research-family](../.agents/skills/research-family/SKILL.md),
[author-case](../.agents/skills/author-case/SKILL.md)) call them in the order those skills give. The rules behind them are in the
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
| variant | `record:new -- variant retired-hex-form --family acme:api-key --name "Retired hex form" --variant-type historical-form --change retired [--contract acme:api-key@1] [--replaces <slug>]` | family and contract check, path, first history entry (no sources, no dates) | `records/variants/acme/<slug>.json` (TODO: description, history note) |
| benign-sibling | `record:new -- benign-sibling acme-public-key-id --family acme:api-key --sibling-class public-identifier --name "Public key id"` | family check, path; starts `unresolved` with no sources and no samples | `records/siblings/acme/<slug>.json` (TODO: description) |
| family-narrative | `record:new -- family-narrative acme:api-key [--contract acme:api-key@1]` | contract (given, current or latest), path; one unresolved placeholder statement per section | `records/narratives/acme/api-key.json` (TODO: each statement and its reason) |
| review | `record:new -- review family-narrative:acme:api-key --actor my-agent --role automation --note "..." [--unresolved "shape/length=Not documented."]` | subject check, id, path, `seq`, one `observed` / `not-assertable` event per `--unresolved`, and the printed `reviewEvent` numbers to copy into the narrative | `records/reviews/<provider>/<family>.json` (family), `records/narrative-reviews/...` (narrative), `records/reviews/<kind>/<id>.json` (other subjects) |
| fixture | `record:new -- fixture example-key-in-readme --set acme-authored --name readme-literal --text-file ./v.txt --secret "<exact value>" [--context carrier]` | the item's sha256, UTF-8 byte spans of each `--secret`, outcome from the case | `records/fixtures/<set>.json` (an authored set; created on first use, appended to after) |

Flags: `--name` (provider, family), `--title` (scenario, case, source), `--alias`, `--homepage`,
`--description`, `--source-type`, `--observer`, `--observed-at`, `--type` (repeat or comma-separate),
`--family <id>[@<revision>][=<role>]` (repeatable; roles `subject|lookalike|context|companion`),
`--class`, `--applies-to`, `--scenario`, `--revision` (must be the next one), `--variant-type`, `--change`,
`--contract`, `--replaces`, `--sibling-class`, `--actor`, `--role`, `--affiliation`, `--event`, `--verdict`,
`--note`, `--unresolved <section>/<statement-id>=<reason>` (repeatable), `--append`, `--set`, `--text`,
`--text-file`, `--secret <substring>` (repeatable), `--context`, `--path`, `--date YYYY-MM-DD`
(default: today UTC), `--dry-run` (print the record, write nothing), `--root <dir>` (tests). A
`source` observation says someone read the page: pass `--observed-at` only with the real date.

Exit codes: 0 created or appended, 1 refused, 2 usage error.

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

The scaffolder does not support `fixture-plan`, `fixture-projection` or `legacy-map`; copy the shape of
`examples/valid/examplecloud/`.

### The kinds added for research (`variant` to `fixture`)

- **`review`** writes only `authored`, `observed`, `corrected` or `disputed` events, as `author`,
  `automation` or `contributor`. `reviewed`, `resolved` and `withdrawn` are another person's act, so the tool refuses
  them. A second history for the same subject is refused; `--append` adds events after the last `seq` and
  never touches an earlier one. It refuses to append to a history that a migration generates (a `legacy-*`
  external reference). The role and affiliation of an agent run are `automation` and `project-maintainer`, and
  a run is never the independent reviewer of its own output.
- **`family-narrative`** gives every section one unresolved placeholder: delete the sections you do not cover,
  write the rest as cited or unresolved statements ([ADR 0010](decisions/0010-family-narrative.md)). Its `notes`
  omit the project's name because the narrative lint rejects it.
- **`fixture`** adds one item to an authored `fixture-set` (origin `authored-cases`). The case must already be
  assertable (a `not-assertable` case is refused: raise its outcome, basis and sources in the same change). The
  outcome is the case's. `must-flag` needs at least one `--secret`, each of which must occur exactly once in the
  text (its start and end are UTF-8 byte offsets, as the schema defines); `must-not-flag` takes none. The set id
  must follow ADR 0007 (use `<provider>-authored`). A generated or imported set is never extended by hand.
  The tool cannot tell whether a value is synthetic: that is the author's statement, made in the pull request
  ([synthetic safety](../.agents/skills/_shared/synthetic-safety.md)).

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

## Pipeline-owned directories

`migrate:cases` writes `records/scenarios`, `records/cases`, `records/fixture-plans` and `records/fixtures` wholesale;
`migrate:narratives` does the same for `records/narratives` and `records/narrative-reviews`; the legacy projection and
the parity proof cover the whole tree. `record:new` can create records there, and `npm run validate` and `npm run check`
accept them, but `migrate:check`, `export:legacy:check` and `parity:check` may then fail on them until the
maintainers decide how authored records coexist with the importers (`scripts/lib/ownership.mjs`,
[cutover](migration/cutover.md)). The research skills say what to do about it: see
[the research run contract](../.agents/skills/_shared/research-run.md#step-0-for-every-run-who-writes-the-record).

## Typical flow

1. Read the [shared references](../.agents/skills/_shared/README.md) that apply.
2. `record:new -- source ...` for each page you read, then the family, contract, scenario or case.
3. Replace every `TODO(record:new)`; cite sources by `{ sourceId, supports, locator }`.
4. `record:check` while editing, `npm run check` before the pull request.
5. A person other than the author reviews before `lifecycle` leaves `draft`.
