---
name: author-case
description: Decide whether a credential situation is a Case, a Scenario or only a matrix projection, and author it only if it meets the ADR 0007 Case criteria, with a scanner-neutral expectation, cited evidence and synthetic fixtures. Use when the coverage backlog names cases-missing or scenario-unused, when a situation needs an expectation recorded, or when asked whether something deserves a Case.
---

# Author a Case or Scenario

A Case is authored reasoning about one situation: what happened, why it is hard, what outcome follows and what
supports it. Most situations are not Cases. The first job of this skill is the decision, and the correct answer is
often "no new record". The second is an expectation that comes from sources, never from what a scanner does.

Run contract (headless defaults, common stop conditions, the landing check, the exact output):
[research-run](../_shared/research-run.md). Read it first. Also [case vs scenario](../_shared/case-vs-scenario.md)
(the decision), [evidence classes](../_shared/evidence-classes.md), [synthetic safety](../_shared/synthetic-safety.md),
[neutrality wording](../_shared/neutrality-wording.md), [record authoring](../_shared/record-authoring.md),
[case authorship](../../../docs/governance/case-authorship.md) and
[ADR 0007](../../../docs/decisions/0007-identity-correction-scenarios-and-fixture-plans.md). Create every record
with `npm run record:new` ([docs/authoring.md](../../../docs/authoring.md)); write only the fields it leaves as
`TODO(record:new)` plus the fields named below.

## Inputs

| Input | Required | Default when headless |
| --- | --- | --- |
| family id (and contract revision when the outcome depends on it) | yes | the `suggestedInput` of the backlog item (`npm run coverage:gaps -- --next 1 --skill author-case`) |
| the situation, one sentence | no | derive it only from the family's narrative `collisions` and open questions, its benign siblings and its contract claims; never from a scanner finding. If none is stated there, stop |

At most one Case or one Scenario per run.

## Steps

1. **Read.** The family, its contract claims, narrative, benign siblings, and every Case and Scenario that
   already names the family or the situation: `grep -rl "<family-id>" records/cases records/scenarios records/fixture-plans`
   (or `graft ask`). A duplicate or a near-duplicate ends the run (stop conditions).
2. **Decide**, in the order of [case vs scenario](../_shared/case-vs-scenario.md), and write the five answers into
   the research notes (Established: the criteria that held; Inferred: your reasoning for any you judged):
   - All five Case criteria hold: a Case. Continue.
   - The reasoning is the same sentence for every family it applies to: a **Scenario**. First check
     `records/scenarios` for one with that meaning; if it exists and covers the family, no record is needed (say
     so); if it exists and lists families explicitly or a fixture plan lists them, adding the family is an edit
     to a record of the import baseline: make the edit and declare it
     (`npm run baseline:amend`, [research-run](../_shared/research-run.md#step-0-for-every-run-imported-records-and-new-records)).
     If none exists, `npm run record:new -- scenario <slug> --title "..."`
     and write it once with no family-specific prose.
   - Only a mechanical cell (family x existing Scenario or Case): a **matrix projection**; no record. Name the
     plan it belongs in under Needs human.
   - Unsure: write the Case as `draft` and `not-assertable` and say so in `notes`; do not invent a Scenario to
     avoid the question.
3. **Derive the expectation from evidence.** Choose the outcome (`must-flag`, `must-not-flag`, `may-flag`,
   `not-assertable`) and its class by [evidence classes](../_shared/evidence-classes.md):
   - A provider statement you read that settles the situation: `provider-documented`, with the cited source and
     locator. The outcome is the semantic consequence of that statement, not of any tool.
   - Provider pages that point different ways, no statement at all, or a judgement call: outcome `not-assertable`,
     basis `unresolved`; cite the sources that conflict; state the candidate outcomes and what would settle
     it; add Needs human. You never write `project-policy`: a maintainer decides it and names a non-author
     reviewer. You may recommend one.
   - Scanner output, scanner agreement, a scanner rule read as truth, and the product's own behaviour are never
     the basis. If the only support you can find is a scanner artifact, the basis is `unresolved`.
4. **Scaffold the Case.**
   ```bash
   npm run record:new -- case <case-slug> --title "<what happens>" --type <positive|benign|twin|mutation|metamorphic|cross-family> --family <id>[@<rev>]=<subject|lookalike|context|companion> [--scenario <slug>]...
   ```
   The slug names the situation in words a reader recognises, with no legacy suite, beta, milestone, issue,
   release, scanner or detector word and no evidence tier or basis (the scaffolder refuses them). Replace
   `summary` (what happened, no real value), `rationale` (why it matters: the failure mode or ambiguity, not a
   template with the family name substituted) and the `expectation`: `outcome`, `basis`, `rationale`, `sources`
   (`sourceId`, exact `supports`, `locator`) and `observedAt` (the day you read the sources). Add `relations` or
   `incidents` only when records or sources support them.
5. **Fixture plan for an assertable Case.** An assertable Case fails validation without a fixture. Describe the
   value (grammar or structure) before you construct one; construct a value only when the contract states
   enough to build it (state which part is fake and why it cannot authenticate: obviously fake decoded content,
   wrong or absent checksum or signature, a placeholder marking), per
   [synthetic safety](../_shared/synthetic-safety.md). If the grammar is not documented far enough, the Case
   stays `not-assertable` with no fixture, and the planned fixture is described in the research notes. Add each
   fixture with the scaffolder, which computes the sha256, the UTF-8 byte spans and takes the outcome from the
   Case:
   ```bash
   npm run record:new -- fixture <case-slug> --set <provider>-authored --name <fixture-slug> --text-file <path> --secret "<the exact value>" [--context <carrier>] [--title "<set title>"]
   ```
   A `must-not-flag` fixture takes no `--secret`. Never add to a generated or imported set (it refuses). Raise
   the Case's outcome and basis and add the fixture in the same change.
6. **Provenance.**
   ```bash
   npm run record:new -- review case:<case-slug> --actor <slug> --role automation --note "Authored by an AI agent run from <source ids> read on <date>, before any scanner was consulted; not reviewed."
   ```
   Say what is conflicting or undecided in that note.
7. **Check and land.** `npm run record:check`, then the gate and the landing check in
   [research-run](../_shared/research-run.md#the-gate): a new Case, Scenario or fixture set needs nothing
   special (the importers no longer own those directories); an edit to an imported record is declared. Commit
   `feat(records): case <case-slug>`; open a pull request; stop.

## Stop conditions

Apply [research-run](../_shared/research-run.md) and also:

- **Not a Case and no Scenario applies**: no record. Report the route (existing Scenario, matrix projection) and
  stop. This is a successful run.
- **Duplicate**: an existing Case states the same failure mode for the family; add nothing, name it.
- **The only support is a scanner**: do not author an assertable expectation. Record `unresolved` or stop.
- **Evidence conflicts or is silent**: `not-assertable`, `unresolved`, the conflict recorded in the expectation
  rationale and sources, Needs human. Never choose.
- **A fixture value would need a guess** (an undocumented length, alphabet or checksum): describe it; build no
  fixture; keep the Case `not-assertable`.
- **A value looks real, is from a page, an incident or a log, or would have to be tested live to be classified**:
  stop; copy it nowhere ([synthetic safety](../_shared/synthetic-safety.md#if-something-looks-real)).
- **A record you would edit is generated** (a Scenario or fixture plan to extend): do not edit it; Needs human.
- **Another family or carrier would reuse the same prose**: that is a Scenario or a projection; return to step 2.

## Output

1. **PR-ready change set**, as in [research-run](../_shared/research-run.md#output-of-every-run): the Case (or
   Scenario) with its expectation and sources; its fixture set item(s) when assertable; the authored review
   history (the generated coverage report is not part of the change set). Commit
   `feat(records): case <case-slug>`. The description names, for each fixture value, how it was made and that it
   was not tested against any service.
2. **Research notes** with the fixed headings. For this skill, Established is the Case criteria that held and the
   expectation's source and locator; Inferred is your reasoning on any criterion and on the carrier or value you
   chose; Unresolved is an expectation left `not-assertable` and what would settle it; Needs human is every
   outcome decision, every amendment of an imported record (path and reason), and the projection or Scenario that should carry a
   situation you did not turn into a Case.

An expectation is scanner-neutral: it states a semantic outcome, names no scanner and would still mean something
if every scanner disappeared.
