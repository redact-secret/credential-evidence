---
name: research-family
description: Research one credential family from official documentation into a format contract (prefix, alphabet, length, separators), variants and history, benign siblings and public identifiers, a claim-backed narrative, and sources with observed-at dates and evidence classes, marking anything the sources do not settle as unresolved. Use when the coverage backlog names family-unresearched, contract-missing, narrative-missing or benign-siblings-missing, or when asked to research a family.
---

# Research a family

One family, one run. The output is what the sources establish about the credential's format, how it changed,
what it is mistaken for and how it is issued, handled and retired, each claim tied to a page you read, and
everything else recorded as an open question. Nothing here asserts that a scanner supports a family, and
nothing is guessed to make a record look complete.

Run contract (headless defaults, common stop conditions, the landing check, the exact output):
[research-run](../_shared/research-run.md). Read it first. Also [record authoring](../_shared/record-authoring.md),
[source capture](../_shared/source-capture.md), [evidence classes](../_shared/evidence-classes.md),
[neutrality wording](../_shared/neutrality-wording.md), [synthetic safety](../_shared/synthetic-safety.md). The
narrative rules are [ADR 0010](../../../docs/decisions/0010-family-narrative.md). Create every record with
`npm run record:new` ([docs/authoring.md](../../../docs/authoring.md)) and write only the fields it leaves as
`TODO(record:new)` plus the fields named below; never hand-roll a record's shape.

## Inputs

| Input | Required | Default when headless |
| --- | --- | --- |
| family id `<provider>:<family-slug>` | yes | the `suggestedInput` of the backlog item (`npm run coverage:gaps -- --next 1 --skill research-family`) |
| contract revision to extend | no | the family's latest revision |
| pages to start from | no | the sources the family already cites, then the provider's official documentation |

The family record must exist. If it does not, stop and run [research-provider](../research-provider/SKILL.md)
first. Do not create a family here.

## Steps

1. **Read what exists.** The family, every contract revision, the narrative and its review history, the sources
   they cite, and the benign siblings and cases that name the family. Note which records are generated
   (a `legacy-taxonomy-import` reference, or a path under `records/narratives`, `records/cases`): those are not
   edited in place ([Step 0](../_shared/research-run.md#step-0-for-every-run-who-writes-the-record)).
2. **Re-read before reusing.** Open each source the family cites. If the passage still says what the claim cites
   it for, append a `read` or `unchanged` observation with
   `npm run source:observe -- <source-id> --outcome <o> --observer <slug>`; if not, that is a conflict
   (stop conditions). Never advance an `observedAt` without this re-read.
3. **Read the official pages, raw**, for each of the five questions, and take only what a page states:
   - *Format:* prefix, alphabet, length (fixed, minimum, maximum), separators and components, checksum, a version
     marker, whether the grammar is for the whole credential or only a part, what the page says it does not
     promise (for example "the format may change").
   - *Variants and history:* older or newer forms, environments the provider names, regional forms, a
     deprecation or migration notice, a changelog entry, with the date the provider gives. History needs a
     durable pin: an archived snapshot, or the digest of the bytes you hold. A live page cannot support a
     historical claim.
   - *Benign siblings:* public identifiers and publishable keys beside the secret, documentation placeholders,
     test or sandbox values the provider publishes, identifiers of the credential (an id that is not the
     credential), non-secret companions.
   - *Issuance and lifecycle:* where it is created, whether it is shown once, scopes, expiry, rotation, revocation.
   - *Collisions:* other credentials of the same provider or others with the same shape that the pages mention.
4. **Record every page you read as a source** (not pages you did not read):
   ```bash
   npm run record:new -- source <https-url> --source-type provider-documentation --observer <slug> --observed-at <YYYY-MM-DD> --title "<as the page gives it>"
   ```
   Types and pins: [source capture](../_shared/source-capture.md). If you hold the raw bytes and want a pin that
   survives the page changing, edit the new record's pin to `content-digest` with the sha256 of exactly those
   bytes and put the same digest on the observation. Do not use a third-party page for a
   `provider-documented` claim; a scanner's repository is a source only for a `tool-corroborated` format claim
   backed by two artifacts of different maintainers, never for an expectation.
5. **Contract.** No contract, or the latest is `reviewed`: `npm run record:new -- contract <family-id>` (the next
   revision and `supersedes` are computed). A draft you or this skill authored: add to it. A generated or
   `reviewed` revision is never edited: write the next revision and say what changed and why in `notes`.
   - `structure`: only what a source states. Leave an alphabet, length or checksum out when no page gives it;
     describe a part whose encoding is unknown in its component `description` and add an open question. A
     `descriptivePattern` only when every part of it is documented.
   - `claims`: one falsifiable statement per claim, a class from [evidence classes](../_shared/evidence-classes.md),
     `temporality`, `observedAt` = the day you read the page, `sources` each with an exact `supports` and a
     `locator` (a section or anchor). Claims you cannot source are not claims: they are `openQuestions` (or an
     `unresolved` claim when you are recording a contested statement).
   - Keep `period: proposed` and `lifecycle: draft`. A maintainer promotes a contract to `current` after review.
6. **Variants.** For a form the pages document with a date, and only with a durable pin:
   `npm run record:new -- variant <slug> --family <id> --name "..." --variant-type <t> --change <introduced|revised|deprecated|retired|corrected> [--contract <id>] [--replaces <slug>]`.
   Fill `description`, `effective` and the history entry (`occurredAt` is when the provider says the change
   happened, `observedAt` is the day you read; `sources` cites the page). Append further changes as new
   history entries; never edit an earlier one. No documented variant: write none and keep the question open
   in the contract and narrative.
7. **Benign siblings.** `npm run record:new -- benign-sibling <slug> --family <id>... --sibling-class <c> --name "..."`
   then `description`, `evidenceClass` with `sources` that say it is not a secret (the provider's own statement),
   and, only when a value helps, `samples` with `origin` `synthetic` (state how it is built: decodable to an
   obvious fake, wrong signature or checksum, placeholder marking), `provider-documented-placeholder` or
   `public-test-vector` (with its link). If the shape of the sibling is undocumented, record no sample.
8. **Narrative.**
   ```bash
   npm run record:new -- family-narrative <family-id>        # one unresolved placeholder per section
   ```
   Delete the sections you do not cover; do not leave a placeholder. Each statement is one falsifiable sentence
   in product-neutral words (no project name, scanner, tier, support status, issue number; `npm run
   lint:narrative` enforces it), either **cited** (class above `unresolved`, with claim or source citations
   that meet the class) or **unresolved** (a reason and, optionally, `leads`). Sections: `shape`, `issuance`,
   `lifecycle`, `collisions`, `openQuestions`. Then write the review history that numbers the unresolved
   statements, and copy the printed numbers into each statement's `unresolved.reviewEvent`:
   ```bash
   npm run record:new -- review family-narrative:<family-id> --actor <slug> --role automation --note "Drafted by an AI agent run from <source ids> read on <date>; not reviewed." --unresolved "<section>/<statement-id>=<reason>"...
   ```
9. **Family record.** Replace the placeholder `description` if present; set `research.state` to `researched` and
   `researchedAt` to today when the contract holds at least the documented format claims, `not-found` when the
   official pages say nothing usable about it, `rejected` when they show it is not a credential family. Set
   `research.blockers` when something cannot be established by desk research (`issuance-gated`: only an issued
   credential would show it; `documentation-gated`: the documentation states no value). Do not set
   `currentContract` to a revision nobody reviewed. Append what you did to the family's review history:
   `npm run record:new -- review family:<family-id> --append --event observed --verdict inconclusive --actor <slug> --role automation --note "..."`
   (or without `--append` when none exists).
10. **Check and land.** `npm run record:check` while editing, then the gate and the landing check in
    [research-run](../_shared/research-run.md#the-gate). Commit `feat(records): research <family-id>`; open a
    pull request; stop.

## Stop conditions

Apply [research-run](../_shared/research-run.md) and also:

- **Two pages disagree** (two lengths, two prefixes, one says shown once and one says retrievable): do not pick.
  Record each statement as its own claim with its own source if both are provider pages, class `unresolved` on
  the contested point, an open question that quotes both, an `unresolved` narrative statement whose reason
  states the conflict, and a Needs human entry. If a page is plainly older than the other, say which is older
  and still do not resolve it.
- **A cited source moved, changed or is gone**: record the `changed` or `unreachable` observation, leave the old
  claim and its class alone, and write a proposal under Needs human (the correction rules:
  [corrections](../../../docs/governance/corrections-and-disputes.md)). No silent edit, no demotion by the run.
- **A format fact would need an issued credential** (an actual length, a checksum, whether a segment varies):
  desk research ends here. Record it unresolved with an `issuance-gated` blocker. Never create an account,
  issue a credential or test a value to find out.
- **A sample value is wanted but its shape is undocumented**: describe, do not exemplify.
- **A value in a page looks real**: apply [synthetic safety](../_shared/synthetic-safety.md#if-something-looks-real):
  copy it nowhere.
- **The family is generated and the change needs an edit in place**: add new records beside it and list the edit
  under Needs human with the generator input that owns it (`scripts/lib/ownership.mjs`).
- **More than 12 pages needed**: stop at 12 and list the rest.

## Output

1. **PR-ready change set**, as in [research-run](../_shared/research-run.md#output-of-every-run): new or extended
   contract; variants (or none); benign siblings; the narrative and its review history; the family's `research`
   fields and appended review event; sources created or re-observed; regenerated `docs/research/backlog.json` and
   `docs/research/coverage.md`. Commit `feat(records): research <family-id>`.
2. **Research notes** with the fixed headings. For this skill, Established is each contract claim and each cited
   narrative statement with source, locator and class; Inferred is reasoning the pages imply but do not state
   (for example what a base64url payload must start with), never written as a claim; Unresolved is every open
   question, unresolved statement and conflict with where it is recorded and what would settle it (a provider
   statement, an archived page, an issued sample under a maintainer's authority); Needs human is every
   promotion (`period`, `currentContract`, `reviewed`), correction proposal and conflict.

Do not call the result validated, verified or complete. It is what the pages read on `<date>` state.
