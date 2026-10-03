# Record authoring guide

One JSON record per file under `records/`, 2-space indent, trailing newline. The `id` inside is
authoritative; the path is a convention. Schemas: `schemas/v1/*.schema.json` (the validator
loads them; do not restate their rules in prose). Start every record with
`npm run record:new` ([docs/authoring.md](../../../docs/authoring.md)); it writes the correct id,
path and required fields as a `draft`, and every field you must write holds `TODO(record:new)`
until you replace it. `npm run validate` fails while one remains.

Hierarchy: `Provider -> Family -> Format contract / Evidence sources / Cases ...`
([CONVENTIONS.md](../../../CONVENTIONS.md)). A scanner or detector name is mapping metadata
(`externalRefs`), never identity.

## Per entity

| Entity | `kind` | Command | Id | Path | You write (the TODO fields) | Do not |
| --- | --- | --- | --- | --- | --- | --- |
| Provider | `provider` | `record:new -- provider <id> --name <n>` | slug; `generic` is reserved for provider-less families | `records/providers/<id>.json` | nothing required; optional `aliases`, `homepage`, `description` | put a product or scanner in the id; rename on rebrand (add an alias) |
| Family | `family` | `record:new -- family <provider>:<slug> --name <n>` | `<provider>:<family-slug>`, independent of any contract revision | `records/families/<provider>/<slug>.json` | `description`; `research` (`state`, `researchedAt`, `blockers`) as the facts get established | list its cases (the relation is stored on the case); point `currentContract` at a contract nobody reviewed |
| Format contract | `format-contract` | `record:new -- contract <family-id>` | `<family-id>@<n>`, n computed (next integer) | `records/contracts/<provider>/<slug>@<n>.json` | `structure` (prefixes, alphabet, length, descriptive pattern), `claims[]` each with class, temporality, observedAt, sources; `openQuestions`; `period`, `validity` | edit a `reviewed` revision: a changed understanding is a new revision that `supersedes` it; put detection code in it |
| Evidence source | `evidence-source` | `record:new -- source <https-url> --source-type <t> --observer <slug>` | `<host>[-<owner>-<repo>]-<10 hex of sha256(url)>`, computed | `records/sources/<host>/<id>.json` | `title` if not given; `publishedAt` if the page states one | store a fragment (it is the citing claim's `locator`); advance `observedAt` without re-reading; record a second source for the same URL, append an observation instead |
| Scenario | `scenario` | `record:new -- scenario <slug> --title <t>` | slug | `records/scenarios/<slug>.json` | `description`, `semantics`, `expectedOutcomeClass`, `applicability.rationale`, `evidenceBasis` | write per-family prose; see [case-vs-scenario.md](case-vs-scenario.md) |
| Case | `case` | `record:new -- case <slug> --title <t> --type <t>` | slug | `records/cases/<slug>.json` | `summary`, `rationale`, `expectation` (outcome, basis, rationale, sources), `families[]`, optional `relations`, `incidents` | name a scanner in an expectation; derive the outcome from scanner output |

`record:new` also scaffolds `variant`, `benign-sibling`, `family-narrative`, `review` (an
`evidence-review-history`) and `fixture` (an item of an authored `fixture-set`); see
[docs/authoring.md](../../../docs/authoring.md). `fixture-plan`, `fixture-projection` and `legacy-map` have no
scaffolder: copy the shape of an `examples/valid/examplecloud/` record and validate it.

## Id and slug rules

- Slug: `^[a-z0-9]+(-[a-z0-9]+)*$`, 1 to 96 chars. Family id `slug:slug`; contract id
  `slug:slug@N`. ASCII, lowercase, no dates or versions except a contract revision.
  Assigned once, never reused, never renamed. A superseded record keeps its id and points at its
  successor; a record that anything can cite is `withdrawn`, not deleted
  (ADR [0002](../../../docs/decisions/0002-ids-versioning-and-migration.md),
  [0003](../../../docs/decisions/0003-provenance-observed-at-and-mutability.md)).
- A clean pattern does not make a good id: name the thing the record is about, in words a
  reader recognises without any other record.

### ADR 0007 forbidden coordinates

Canonical ids and paths of scenarios, cases, fixture plans and fixture sets (the scaffolder
refuses them in every kind but `source`) never contain
([ADR 0007](../../../docs/decisions/0007-identity-correction-scenarios-and-fixture-plans.md),
`scripts/lib/identity.mjs`):

| Forbidden | Examples |
| --- | --- |
| legacy suite name | `accuracy`, `negative-controls`, `reference-syntax`, `credential-formats`, `milestone-6-closed` ... |
| beta, milestone, issue or PR coordinate | `beta8-207`, `milestone-6`, `issue-254`, `pr-12`, `redact-secret-101` |
| release coordinate | `rc2`, `release-3` |
| detector identifier or scanner name | `detector`, `trufflehog`, `gitleaks`, `kingfisher`, `semgrep` ... |
| migration-source coordinate | the legacy repository, path or revision |
| evidence tier or basis (scaffolder rule) | `t0`..`t3`, `tier-2`, `provider-documented`, `tool-corroborated`, `project-policy`, `unresolved` |

Tier and basis are data (`expectation.basis`, `evidenceBasis.basis`, review history), never a
grouping key, a path or a sibling record: better evidence changes `basis` through a review
event, it does not create a second record. Put coordinates in `externalRefs` (system + id +
url), a fixture set's `imported` block or `migration/legacy-map/`. A scanner's repository is
still a legitimate *source* (`scanner-rule-source`); its name is not a legitimate *id*.

## Fields every record carries

- `lifecycle`: start `draft`. `reviewed` needs a reviewer who is not the author recorded in the
  review history ([attribution](../../../docs/governance/attribution.md#review-independence));
  an agent never sets it.
- `notes`: project-authored records say so: "Project-authored by the Redact Secret project,
  which maintains this repository; not independent evidence." The scaffolder writes it.
- `observedAt`: when a person or tool actually read the evidence; never the authoring date, never
  advanced without a re-read, never set by a scanner run.
- Every `sourceRef` says what the source is cited for (`supports`) and where (`locator`).
- Starting state is `unresolved` / `not-assertable`. Move to a stronger class only with
  sources that meet [evidence-classes.md](evidence-classes.md), in a change a second person
  reviews. An `unresolved` basis requires outcome `not-assertable`.

## Cases and fixtures

An assertable case (`must-flag`, `must-not-flag`, `may-flag`) must be projected by at least one
fixture (a `fixture-set` item or `fixture-projection`), or validation fails
("assertable expectation but no fixture projects it"). A skeleton is therefore `not-assertable`;
raise the outcome in the same change that adds the fixture. Fixtures contain only
[synthetic values](synthetic-safety.md), carry a `sha256` of their text, and must agree with the
case's outcome.

## Before you commit

1. `npm run record:check -- <paths>` while editing; `npm run check` before the PR.
2. If you edited or removed a record that is in the import baseline, declare it
   (`npm run baseline:amend -- <path> --reason "<why>"`; `npm run check` fails otherwise). Run
   `fixtures:materialize:check`, then `graft build`. The historical pinned checks
   (`migrate:check`, `export:legacy:check`, `parity:check`) run in CI only when an importer, the projection,
   parity, a schema or shared generator code changes ([validation tiers](../../../docs/migration/validation-split.md)).
3. Say in the PR: ids touched, claims added or changed, source provenance, how each
   credential-shaped value was made, commands run. Never claim scanner support or independent
   validation.
