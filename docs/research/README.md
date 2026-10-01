# Research backlog

What evidence is missing, in what order to fill it, and which providers to research next. Everything here is
derived from `records/` plus one hand-kept file, so it is deterministic and offline. It describes gaps in
evidence; it says nothing about any scanner or product.

| File | Written by | Read by |
| --- | --- | --- |
| [backlog.json](backlog.json) | `npm run coverage:gaps` | the [coverage-gaps](../../.agents/skills/coverage-gaps/SKILL.md) skill, the cron harness |
| [coverage.md](coverage.md) | `npm run coverage:gaps` | people |
| [provider-wishlist.json](provider-wishlist.json) | people and agents, by pull request | `npm run coverage:gaps` |

```bash
npm run coverage:gaps                       # rewrite backlog.json and coverage.md from the records
npm run coverage:gaps:check                 # exit 1 when either committed file is out of date (CI runs this)
npm run coverage:gaps -- --next 3           # top 3 items as JSON; writes nothing
npm run coverage:gaps -- --next 1 --skip <id>,<branch-hint>,<pr-tag> --skill research-family --min-priority P1
npm run coverage:gaps -- --next 5 --as-of today      # measure staleness against the real clock
```

Filters for `--next`: `--gap-kind`, `--provider`, `--skill`, `--min-priority P0|P1|P2|P3`, `--skip` (comma list of
item ids, `dedupe.branchHint` values or `dedupe.prTitleTag` values). `--check` cannot be combined with `--as-of`
or `--next`.

## Keeping the committed files current

The records change; the report follows. A pull request that adds, fixes or re-observes a record runs
`npm run coverage:gaps` as its last step and commits the result, which also shows the gap it closed. The two
generated files are the only place two research pull requests can conflict: resolve by re-running the command on
the merged tree, never by merging the JSON by hand.

## Reference date

Staleness needs a date. The default is the newest date recorded anywhere in `records/` (an observation, a claim,
a research verdict, a case expectation), so the committed output changes only when the records or the wishlist
do. It is not the clock. A run that wants the real clock passes `--as-of today` together with `--next`.

## Priority rules (rules version 1)

An item's score is its gap kind's base score plus adjustments. The band is the score: **P0** 90 and up, **P1**
70 to 89, **P2** 45 to 69, **P3** below 45. Order is score descending, then id ascending. The rules live in
`scripts/lib/coverage.mjs` and are pinned by `tests/coverage-gaps.test.mjs`; every item carries the arithmetic in
its `rationale`.

| Gap kind | Base | Fires when | Suggested skill |
| --- | --- | --- | --- |
| `family-unresearched` | 95 | `research.state` is `unresearched` (no other family gap is raised) | `research-family` |
| `contract-missing` | 90 | researched family with no contract of period `current` (a `proposed` one does not count) | `research-family` |
| `evidence-unresolved-only` | 85 | the current contract has no claim above `unresolved` | `research-family` |
| `provider-no-families` | 85 | provider (not `generic`) with no family | `research-provider` |
| `no-provider-source` | 80 | the contract has a claim above `unresolved` but none rests on a provider-authored source | `research-family` |
| `source-unreachable` | 75 | the latest observation of a cited source is `unreachable`, `changed` or `superseded` | `source-freshness` |
| `evidence-stale` | 70 | a current-temporality claim above `unresolved`, or a cited live-unpinned source, was last observed over 12 months before the reference date; also a `not-found` or `rejected` verdict that old | `source-freshness` |
| `narrative-missing` | 60 | the family has no narrative | `research-family` |
| `narrative-unresolved-heavy` | 50 | half or more of the narrative's statements are `unresolved` | `research-family` |
| `benign-siblings-missing` | 40 | no `benign-sibling` record and no benign or lookalike Case involves the family | `research-family` |
| `observation-unverified` | 35 | every cited source was observed only by a `legacy-` import observer | `source-freshness` |
| `cases-missing` | 30 | no Case, and no fixture plan lists the family | `author-case` |
| `scenario-unused` | 25 | no Case instantiates the scenario and no fixture plan targets it | `author-case` |
| `new-provider` | 50 / 40 / 30 | a wishlist entry of priority 1 / 2 / 3 whose provider is not recorded | `research-provider` |

Adjustments:

- **in-use, +10**: a Case or fixture plan already involves the family, so the gap affects existing expectations.
- **blocked, -15**: the family records `research.blockers` and the gap is one desk research cannot clear
  (the research-type kinds; freshness work is not penalised). The item lists `blockedBy`.
- **age, up to +15** (`evidence-stale`): one point per full three months past the 12-month period.
- **unresolved share, up to +10** (`narrative-unresolved-heavy`): one point per five points of share above 50%.

Not gaps: a family whose research verdict is `not-found` or `rejected` (a finished negative result, apart from
staleness), a `draft` lifecycle (review is a human step), and a missing Case for a family that a fixture plan
already covers (a matrix projection is the right shape, see
[case vs scenario](../../.agents/skills/_shared/case-vs-scenario.md)).

Where a kind subsumes another, only one is raised: `evidence-unresolved-only` replaces `no-provider-source`; a
recorded negative verdict suppresses all but staleness.

## Item fields

```json
{
  "id": "contract-missing:acme:api-key",        // <gapKind>:<subject id>, stable across runs
  "gapKind": "contract-missing",
  "scope": { "kind": "family", "id": "acme:api-key", "provider": "acme" },   // kind: family | provider | scenario
  "priority": "P1",
  "score": 75,
  "suggestedSkill": "research-family",          // research-provider | research-family | author-case | source-freshness
  "suggestedInput": "acme:api-key",             // the one argument the skill takes
  "rationale": ["+90 gap-kind: ...", "-15 blocked: ..."],
  "facts": { },                                 // the counts and ids the rule saw
  "blockedBy": null,                            // research.blockers kinds, or null
  "dedupe": {                                   // for the cron harness: skip the item while any of these exists
    "key": "contract-missing:acme:api-key",
    "branchHint": "coverage/contract-missing/acme-api-key",
    "prTitleTag": "[coverage:contract-missing:acme:api-key]"
  }
}
```

The harness (#25) owns branch naming and the open-PR search; `dedupe` is the stable material it keys on. An item
is one bounded unit of work: one gap kind for one subject.

## New providers: the wishlist

[provider-wishlist.json](provider-wishlist.json) is the queue beyond gap-filling. An entry is a candidate to
research, not a fact about the provider.

```json
{ "id": "acme", "name": "Acme Cloud", "rationale": "why research is worthwhile (20-400 chars)", "priority": 1, "docsHint": "https://docs.acme.example/api-keys" }
```

- `id`: the provider slug the record will get (`record:new -- provider <id>`); sorted, unique, not `generic`, no
  ADR 0007 coordinates.
- `priority`: 1 first, 3 last. Based on how often the provider's credentials turn up and on how much the family
  teaches (a public-versus-secret pair, a connection-URI collision, a documented test value).
- `docsHint`: an optional https URL where to start. It is untrusted until read, and it is not a source: record a
  source only after reading the page (`record:new -- source`).
- The rationale is a reason to look, never a claim about the credential's format. Do not put formats in it.

`coverage:gaps` validates the file, fails on a malformed entry, and turns each entry whose provider has no record
into a `new-provider` item. When the provider is recorded the entry drops out of the backlog and is listed in
`coverage.md` under "prune"; the pull request that adds the provider removes its entry. Add entries by pull
request, in sorted order.
