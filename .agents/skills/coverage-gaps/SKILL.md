---
name: coverage-gaps
description: Run and read the research coverage report, then pick the one next item of work from the prioritized backlog. Use when asked what to research or tidy next, to refresh docs/research, or when a cron run needs its single bounded unit of work. Report-only; it writes the two generated files and nothing else.
---

# Coverage gaps: read the backlog, pick one item

The report says which providers, families and scenarios lack which piece of evidence, ranked. It is
derived from `records/` and a hand-kept wishlist, offline and deterministic. It never says anything about
a scanner or a product; it is a worklist about missing evidence. Rules, fields and the priority arithmetic:
[docs/research/README.md](../../../docs/research/README.md). Shared rules:
[_shared/README.md](../_shared/README.md).

## Inputs

None required. Optional narrowing: a provider, a skill name, a minimum priority, a list of item ids to skip
(work already open).

## Steps

1. Regenerate so the choice is made on current records. This changes only `docs/research/backlog.json` and
   `docs/research/coverage.md`:
   ```bash
   npm run coverage:gaps
   ```
2. Pick. For one item, let the tool apply the order and the skips:
   ```bash
   npm run coverage:gaps -- --next 1 --skip <ids,branch-hints,pr-tags of open work> [--skill <name>] [--provider <id>] [--min-priority P1]
   ```
   Add `--as-of today` when staleness should be measured against the real clock (the committed files use
   the newest recorded date instead, so they stay byte-stable).
3. Find open work to skip. List open pull requests and branches whose title contains `[coverage:` or whose
   branch starts `coverage/`, and pass each item's `dedupe.prTitleTag` or `dedupe.branchHint`:
   ```bash
   gh pr list --state open --search '"[coverage:" in:title' --json number,title,headRefName
   ```
   An item with an open pull request is skipped, never duplicated. If `gh` is unavailable, say so and stop
   rather than guessing.
4. Read the chosen item: `rationale` shows the score arithmetic, `facts` the counts the rule saw,
   `blockedBy` any recorded blockers, `suggestedSkill` and `suggestedInput` what to run next.
5. Hand off. Run the suggested skill with the suggested input, one item per run:

   | `suggestedSkill` | What it does |
   | --- | --- |
   | `research-provider` | records a new provider and its candidate families (also all `new-provider` wishlist items) |
   | `research-family` | contract, sources, benign siblings, narrative for one family |
   | `author-case` | a Case or Scenario, only if it passes [case vs scenario](../_shared/case-vs-scenario.md) |
   | `source-freshness` | re-reads the sources behind one family, per [source-freshness](../source-freshness/SKILL.md) |

   Hygiene findings are not in the backlog; `npm run tidy:scan` and [tidy-records](../tidy-records/SKILL.md)
   cover them.
6. After the handoff's change set is done, run `npm run coverage:gaps` again and commit the two generated
   files in the same pull request. `npm run coverage:gaps:check` fails CI when they are stale, and the
   closed item should be gone from the diff. On a rebase conflict in those two files, re-run the command on
   the merged tree; never merge the JSON by hand.

## Adding to the wishlist

A provider worth researching that no gap covers goes in
[provider-wishlist.json](../../../docs/research/provider-wishlist.json): sorted by id, priority 1 to 3, a
rationale of why it is worth looking (never a format claim), and an optional `docsHint` URL that stays
untrusted until read. A wishlist change is its own pull request. `npm run coverage:gaps` rejects a malformed
entry.

## Stop conditions

- `--next` returns `count: 0`: report "backlog empty after skips" and stop. Do not invent work.
- Every candidate is blocked (`blockedBy` set) and the run is headless: say so in the run summary and stop;
  the blockers (issuance-gated, documentation-gated) are not something a desk run clears.
- `npm run coverage:gaps` fails on the wishlist or the records: report the message and stop; do not edit
  records to make the report pass.
- A regeneration changes files other than the two generated ones: stop and report it.

## Output

Headless: one JSON object in the run summary, nothing else changed unless the handoff ran.

```
chosen: <item id>   priority: <P?>   score: <n>   skill: <suggestedSkill>   input: <suggestedInput>
skipped (open work): <ids>
rationale: <the item's rationale lines>
```

Interactive: the same, plus the next three items so the person can choose differently. In both modes name
the reference date the report used.

## Never

Treat the backlog as a verdict about a provider or a product, rank providers by it, edit
`docs/research/backlog.json` or `docs/research/coverage.md` by hand, or run more than one item per run.
