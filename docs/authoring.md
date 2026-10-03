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
| review | `record:new -- review family-narrative:acme:api-key --actor my-agent --role automation --note "..." [--unresolved "shape/length=Not documented."]` | subject check, id, path, `seq`, one `observed` / `not-assertable` event per `--unresolved`, and the printed `reviewEvent` numbers to copy into the narrative | `records/reviews/<provider>/<family>.json` (family), `records/narrative-reviews/...` (narrative), `records/reviews/<kind>/<id>.json` (other subjects, including `evidence-source`) |
| fixture | `record:new -- fixture example-key-in-readme --set acme-authored --name readme-literal --text-file ./v.txt --secret "<exact value>" [--context carrier] [--authored-base \| --projection-of <base-id>] [--extra-file x.json]` | the item's sha256, UTF-8 byte spans of each `--secret`, outcome from the case | `records/fixtures/<set>.json` (an authored set; created on first use, appended to after) |

Flags: `--name` (provider, family), `--title` (scenario, case, source), `--alias`, `--homepage`,
`--description`, `--source-type`, `--observer`, `--observed-at`, `--type` (repeat or comma-separate),
`--family <id>[@<revision>][=<role>]` (repeatable; roles `subject|lookalike|context|companion`),
`--class`, `--applies-to`, `--scenario`, `--revision` (must be the next one), `--variant-type`, `--change`,
`--contract`, `--replaces`, `--sibling-class`, `--actor`, `--role`, `--affiliation`, `--event`, `--verdict`,
`--note`, `--unresolved <section>/<statement-id>=<reason>` (repeatable), `--append`, `--set`, `--text`,
`--text-file`, `--secret <substring>` (repeatable), `--authored-base`, `--projection-of <id>` (repeatable), `--extra-file <json>`, `--context`, `--path`, `--date YYYY-MM-DD`
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
  them. The subject is a family, family-narrative, case, variant, benign-sibling, scenario, format-contract or
  evidence-source. `--unresolved` writes one `observed` / `not-assertable` event per statement and prints its
  `reviewEvent` number: `<section>/<statement-id>=<reason>` for a family-narrative, `<statement-id>=<reason>`
  (no section) for every other subject. A second history for the same subject is refused; `--append` adds events after the last `seq` and
  never touches an earlier one. Appending to an imported history (a `legacy-*`
  external reference) is allowed: the tool declares the baseline amendment itself (ADR 0015). The role and affiliation of an agent run are `automation` and `project-maintainer`, and
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

### Representing transformed credentials

Schema revision 1.6.0 ([ADR 0016](decisions/0016-representation-and-lineage-of-transformed-credentials.md)) is the one place a transformed credential is stated. Use it for Base64 and hex forms, line-broken or escaped values, Unicode
invisibles, byte and string chunking, and context, repeated or large inputs. Do not invent a Case per transformation: the reasoning is a Case or Scenario (see
[case vs scenario](../.agents/skills/_shared/case-vs-scenario.md)); the transformation is data on the fixture.

The chain, and where each link lives:

| Link | Where it is stated | Checked by the validator |
| --- | --- | --- |
| Original bytes | an **authored base**: an item with `derivation: { kind: "authored-base" }` in a hand-authored set; its one secret span is the value (a benign base: its whole content is) | at most one secret span, set not generated, no transformation |
| Transformation | `transformation.steps` on the **projection** (`derivation: { kind: "projection", bases: [...] }`), in forward order | step vocabulary; fragment readings against the outcome; mirror of the span's decode steps |
| Decoded bytes | `expected.spans[].decoded`: `via` (decode steps, source to value), `sha256`, `bytes`; the span's `base` names the authored base | re-decodes the source bytes strictly and compares bytes, digest and the base's value |
| Source spans | `expected.spans[]`: UTF-8 byte offsets of the source; `fragments` when the secret is not contiguous | sorted, disjoint, inside the span, first and last meet the span's edges |
| Generated, not authored | a generated set (`origin.type: generation-rule`) holding projections; a plan listing its authored bases as `generation.inputs` of kind `fixture` | a cell may use only the plan's declared bases |

Rules of thumb:

1. **Author the base once**, with `record:new -- fixture <case> --set <provider>-authored --name <base> --text-file ... --secret <value> --authored-base`. A base is a reviewed synthetic value ([synthetic safety](../.agents/skills/_shared/synthetic-safety.md)),
   not the corpus' output. Every projection of it points back; the independent base count is the number of bases, never the number of inputs.
2. **Encodings are decode steps on the span**, nested layers in decode order (outer first). `base64` states `alphabet` and `padding`, `hex` states `case`. The source span is the encoded text only, so "whole value" against "embedded" is the `embed` step plus the span's position, not a different span.
3. **A line-broken value is one span with `fragments`.** The secret bytes are the fragments; the separators (`\`, line break, quotes) are inside `[start, end)` and outside the fragments. State the `fragment` step with the right `reconstruction`:
   `reconstructs-original` only when a cited mechanism rebuilds the value, `inserts-separator` when it does not (no spans, outcome `must-not-flag` or `not-assertable`), `unresolved` when the reading depends on the consumer (outcome `not-assertable`). Never strip whitespace globally to make a value valid.
4. **Unicode**: an inserted zero-width, NBSP or BOM is the `insert-codepoints` step and a `strip-codepoints` decode step; a normalization is `normalize`. The span's offsets are UTF-8 bytes, so a three-byte code point moves every later offset by three.
5. **Chunking is a separate fact from fragmentation.** `chunking` divides valid content into stream or string chunks: a UTF-8 byte boundary inside a multibyte sequence is `valid`; a UTF-16 boundary inside a surrogate pair is `unpaired-surrogate-split`; bytes that are not UTF-8 are `invalid-utf8` and are stored as `bytesHex`.
   Anything not `valid` is an expected rejection: outcome `not-assertable`, no spans, a Case stating that rejection is neither a detection nor a miss. It must not be counted as a true or false negative.
6. **Large and repeated inputs are recipes** (`recipe.parts`: `text`, `repeat`, or the whole text of an authored base), written by the generator, never typed. Give every occurrence its own span with its `base`.
7. **A plan declares its bases**: `generation.inputs` entries `{ "kind": "fixture", "id": "<authored base id>" }`.
8. **Report the count**: `npm run report:bases [-- examples/valid] [--json] [--plan <id>]` prints authored bases, independent base values, generated and hand-authored projections and unattributed items, per plan. Quote the independent base count as the sample size; quote generated inputs as correlated.
9. **State no product behaviour.** Whether a decoder runs, to what depth, and what action follows are the product's assertions. A fact here is: this input is this base under this transformation, and these are its bytes.

Worked, validated, synthetic examples of every row: `examples/valid/representation/`.

`record:new -- fixture` flags: `--authored-base`; `--projection-of <base-id>` (repeatable); `--extra-file <json>` with `transformation`, `chunking`, `inputValidity` and `spans: [{ base, fragments, decoded }]` (one entry per `--secret`, in offset order). It runs the validator's rules first and refuses a lineage the validator would reject.
Example `--extra-file` for a URL-safe unpadded Base64 value:

```json
{
  "transformation": { "steps": [{ "op": "encode", "codec": "base64", "alphabet": "url-safe", "padding": "unpadded" }, { "op": "embed", "mode": "whole-value", "carrier": "shell-assignment" }] },
  "spans": [{ "base": "acme-authored--api-key-base", "decoded": { "via": [{ "codec": "base64", "alphabet": "url-safe", "padding": "unpadded" }], "sha256": "<sha256 of the base value>", "bytes": 41 } }]
}
```

### Assertable cases need a fixture

A case with `must-flag`, `must-not-flag` or `may-flag` fails validation unless a fixture projects it.
That is why the skeleton is `not-assertable`. Raise the outcome (and its basis, with sources) in the
same change that adds the fixture. See [case vs scenario](../.agents/skills/_shared/case-vs-scenario.md)
before creating a case at all.

## Setup in a fresh checkout or worktree

`npm ci --ignore-scripts` first. A worktree does not share `node_modules` with the main checkout (the scripts may still
resolve it from a parent directory, which is why a failure shows up only later). The tests that build a throwaway copy
of the repository link the copy to the directory that really holds `ajv` and stop with a message naming `npm ci` when
there is none, instead of an `ERR_MODULE_NOT_FOUND` from inside a child process.

## `record:check`

Fast subset of `npm run validate` for the records you touched: JSON schema, references and
uniqueness against the whole universe the file belongs to, the identity lint, the narrative lint and
the placeholder lint. Uses the validator's own code.

```bash
npm run record:check                                       # every record changed vs merge-base with origin/main, in the working tree, or untracked
npm run record:check -- records/cases/example-key-in-readme.json records/scenarios
npm run record:check -- --base origin/<branch>            # a different base (origin/develop only if origin has one)
```

Exit 0 when clean, 1 with one problem per line. It reports problems **in the files it checks**; a
change that breaks a record it does not touch (deleting a cited source, say) is caught by
`npm run validate`, which stays the gate. After a change that the migration, exporter or parity
checks read, also run `baseline:check` (part of `npm run check`) and `fixtures:materialize:check`. The historical
pinned checks (`migrate:check`, `export:legacy:check`, `parity:check`) regenerate the import baseline from the
legacy revision and run in CI only when an importer, the projection, parity, a schema or shared generator code changes
([validation tiers](migration/validation-split.md)).

## Imported records and new records

The migration importers (`migrate:taxonomy`, `migrate:cases`, `migrate:narratives`) produced the **import baseline**
at the pinned legacy revision (`docs/migration/baseline-manifest.json`). They no longer own any directory of `records/`:

- A **new** record (provider, family, source, case, scenario, fixture set, narrative, ...) is added with `record:new`
  like any other and needs nothing more than `npm run check`.
- An **edit to or removal of a baseline record** is allowed and must be declared with its cause:
  `npm run baseline:amend -- <records/path>.json --reason "<why>" [--ref "#<issue>"]`. `npm run check` fails on an
  undeclared one (`baseline:check`), and on a declaration the tree no longer needs. `source:observe` and
  `record:new -- review --append` declare their own.
- The legacy map and the importer reports are immutable references: no amendment can excuse an edit.

See [the validation split](migration/validation-split.md) and
[ADR 0015](decisions/0015-validation-tiers-and-import-baseline.md); the research skills' rule is
[research-run Step 0](../.agents/skills/_shared/research-run.md#step-0-for-every-run-imported-records-and-new-records).

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

Findings follow the change, not the file. In a **modified** record the provenance and evidence-class rules judge only
the claims and citations the range adds or alters: a claim object that is byte-identical in `base` is skipped, and in a
claim that did change, a citation identical to one already in `base` is not re-judged (so editing one evidence entry of
a legacy fixture set, whose other entries cite sources without a locator, does not return `needs-human` for all of
them). A **new** file is checked in full, and the structural rules (an `unresolved` basis needs outcome
`not-assertable`, id and kind never change, histories are append-only) stay whole-file.
