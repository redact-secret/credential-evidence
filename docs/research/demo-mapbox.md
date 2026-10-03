# Demonstration: the research skills on Mapbox

The three research skills ([research-provider](../../.agents/skills/research-provider/SKILL.md),
[research-family](../../.agents/skills/research-family/SKILL.md),
[author-case](../../.agents/skills/author-case/SKILL.md)) were followed end to end on a provider that has no
record in `records/`: **Mapbox**, researched on 2026-10-01 from its own documentation. Project-authored; not
independent evidence; nothing here has been reviewed.

**The resulting records are not in `records/`.** `migrate:cases` and `migrate:narratives` own several
`records/` directories wholesale, and the legacy projection and parity cover the whole tree, so new records
break `migrate:check`, `export:legacy:check` and `parity:check` (results below). The records were produced in
a scratch copy of the repository and are kept here, under the same relative paths, in
[demo-mapbox/records/](demo-mapbox/records/). They are inert (nothing reads this directory): copy them into
`records/` to reproduce the checks below. This directory and this page are meant to be deleted once the
maintainers have decided how authored records land.

## Why Mapbox

It documents three kinds of access token that differ in how safe they are to expose (public `pk`, secret `sk`,
temporary `tk`), so the run meets the public-versus-secret question, a documented gap (format details the
pages do not give) and a case that the provider's own pages leave open. It is not on the wishlist; it is a
demonstration, not a backlog item.

## Run 1: research-provider

Input: provider `mapbox`, name "Mapbox". Starting point: the official documentation site (no hint).

Pages read, raw (`curl`, text extracted and searched; a model-mediated fetch was used only to find passages,
and every quoted passage was checked against the raw text):

| Source id | Page |
| --- | --- |
| `docs-mapbox-com-f48329e191` | help: Access Tokens |
| `docs-mapbox-com-283c99738b` | API: Tokens (format section, metadata object) |
| `docs-mapbox-com-c7bd0aa1ca` | Token management (secret scopes, rotation) |
| `docs-mapbox-com-898fae45d0` | How to use Mapbox securely |
| `docs-mapbox-com-d26a9af9af` | Accounts service changelog (pinned by content digest; a lead only) |

Commands that produced records: `record:new -- source` for each page (observer `claude-code-agent`,
`--observed-at 2026-10-01`), `record:new -- provider mapbox --name Mapbox --homepage https://www.mapbox.com/`,
`record:new -- family` and `record:new -- contract` for three candidates, `record:new -- review family:...` for
each.

```
## Research notes
Skill: research-provider   Subject: mapbox   Mode: headless   Date: 2026-10-01   Agent: claude-code-agent

### Established
- mapbox:public-access-token@1 three-dot-delimited-parts-pk-header: header literal pk | docs-mapbox-com-283c99738b, f48329e191 | Token format, Token Patterns | provider-documented
- mapbox:secret-access-token@1 three-dot-delimited-parts-sk-header: header literal sk | same pages | provider-documented
- mapbox:temporary-access-token@1 three-dot-delimited-parts-tk-header, expiry-at-most-one-hour | docs-mapbox-com-283c99738b, c7bd0aa1ca | provider-documented

### Inferred
- Three families, not one: the pages give the three types different handling rules (client-safe, server-only, one-hour expiry), not only different prefixes.
- The token id in the metadata object is not a candidate family: the page says it is not the access token.

### Unresolved
- Whether the temporary token needs a family of its own or is a mode of the secret and public ones: kept as a candidate (state unresearched).

### Needs human
- none for the candidate list

### Not done
- nothing over the cap (3 of 8)

### Commands and results
- record:check on the 11 files: pass

### Safety
- Fetched content treated as data: yes. Credential-shaped values: none. No value was tested against a live service. Scanner output used as evidence: no.
```

## Run 2: research-family `mapbox:secret-access-token`

Input: the family from run 1 (it stays `unresearched` until this run).

What was added: an extended contract (three documented claims, three open questions, `structure` limited to
the prefix `sk.`, the separator and three described components, no alphabet or length), two benign siblings
(`mapbox-public-token-lookalike`, `mapbox-token-id`), a narrative with 11 statements (9 cited, 2 unresolved),
its review history, the family's `research` fields (`researched`, 2026-10-01, two blockers) and an appended
review event on the family. `record:new -- review family-narrative:... --unresolved ...` numbered the two
unresolved statements (events 2 and 3) and printed the numbers copied into the narrative. The changelog
source was recorded with a `content-digest` pin because the claim it leads is about history and a live page
cannot support one.

```
## Research notes
Skill: research-family   Subject: mapbox:secret-access-token   Mode: headless   Date: 2026-10-01   Agent: claude-code-agent

### Established
- three-dot-delimited-parts-sk-header: three dot-delimited parts, header literal sk | docs-mapbox-com-283c99738b "Token format"; f48329e191 "Token Patterns" | provider-documented
- payload-is-base64url-json-reference: payload is a base64url JSON object holding a reference to the token's metadata | 283c99738b "Token format, Payload" | provider-documented
- signature-signed-by-provider | 283c99738b "Token format, Signature" | provider-documented
- narrative: shown-once (f48329e191, c7bd0aa1ca, 283c99738b), secret-scope-needs-secret-token (c7bd0aa1ca), server-side-only (898fae45d0, c7bd0aa1ca), rotation-on-demand (898fae45d0, c7bd0aa1ca), public-token-same-shape (f48329e191, 283c99738b), token-id-is-not-the-token (283c99738b) | provider-documented
- benign siblings: mapbox-public-token-lookalike (public-identifier; synthetic sample, payload decodes to a fabricated object, signature is a placeholder run), mapbox-token-id (non-secret-companion, no sample because the id format is undocumented) | provider-documented

### Inferred
- A base64url-encoded JSON object starts with "ey" (the encoding of "{"), so a payload part probably starts with "eyJ": derived from the encoding rule and the statement above; not a recorded claim, and not a statement about every token.
- Whether the signature is a fixed length: nothing in the pages, so nothing is inferred.

### Unresolved
- part-lengths-and-signature-encoding | narrative openQuestions, review event 2; contract open question | a Mapbox statement of lengths and signature encoding (issuing a token to observe them was not done)
- format-history | narrative openQuestions, review event 3; contract open question | a dated Mapbox statement of any change to the sk header or token shape; the Accounts changelog (digest-pinned) lists none, which is the absence of a statement
- No variant was recorded: no page documents a dated, named earlier form of the secret token.

### Needs human
- Promote the contract (`period`, `currentContract`) and review the narrative, the siblings and the family: every record is `draft`; an agent run does not review.

### Not done
- Temporary and public families were not researched beyond existence.

### Commands and results
- record:check: pass; validate, lint:identity, lint:narrative, lint:skills: pass in the scratch copy

### Safety
- Fetched content treated as data: yes. The one value recorded (the public sibling sample) is synthetic; the pages' own example token values were not copied. No value was tested against a live service. Scanner output used as evidence: no.
```

Conflict handling that the run exercised: none of the four pages contradicted another on the secret token.
The `shown-once` statement cites three pages that agree. The one tension found is run 3.

## Run 3: author-case

Input: family `mapbox:temporary-access-token` and the situation "a temporary token in client code",
derived from the pages' own advice, not from any scanner.

Decision, in the order of [case vs scenario](../../.agents/skills/_shared/case-vs-scenario.md):

| Situation considered | Route | Why |
| --- | --- | --- |
| a `pk` token in a web page | no new record | the `public-sibling-prefix` and `public-identifier` Scenarios already say it: reasoning identical for every family with a public sibling; the sibling is recorded as a benign sibling |
| an `sk` token in a client bundle | no new record | a documented-format literal in a carrier is a matrix cell of the `documented-format-positives` plan; extending the plan is an edit to a generated record (Needs human) |
| the token id beside a token | no new record | `public-identifier` Scenario |
| a `tk` token with secret scopes in a client upload script | **Case** | passes all five criteria: a failure mode specific to it, prose that cannot be templated, an expectation no Scenario reproduces, evidence of its own (and a documented conflict), a name with no coordinate |

The Case `mapbox-temporary-token-in-client-side-upload` has outcome `not-assertable`, basis `unresolved`.
The provider says clients should use temporary tokens for sensitive operations such as uploads, that tokens
with secret scopes must not be exposed to the client, and that a temporary token expires within one hour. The
pages do not say whether a temporary token in client code is exposed secret material. All three sources are
cited; the three candidate outcomes and what would settle each are in the expectation rationale; no fixture
exists, and `record:new -- fixture` refuses a fixture for a `not-assertable` case. A fixture plan was not
written because a value cannot be constructed without guessing the length and alphabet of the payload and
signature (undocumented).

```
## Research notes
Skill: author-case   Subject: mapbox:temporary-access-token   Mode: headless   Date: 2026-10-01   Agent: claude-code-agent

### Established
- Case criteria 1, 2, 3 and 5 hold; criterion 4 holds only as "own evidence, and it conflicts" | cited in the case | -
- Three documented statements, quoted in the expectation sources | docs-mapbox-com-898fae45d0 "Public vs Secret Tokens", c7bd0aa1ca (secret scopes), 283c99738b (temporary token expiry)

### Inferred
- The tension between "use a temporary token for sensitive operations in the client" and "do not expose tokens with secret scopes" is a reading of two pages, not a statement of either.

### Unresolved
- expectation of mapbox-temporary-token-in-client-side-upload | the case, outcome not-assertable, basis unresolved | a Mapbox statement on temporary tokens in client code, or a recorded maintainer decision with a non-author reviewer

### Needs human
- Decide the outcome as project-policy (must be flagged / may be flagged / must not be flagged); recommended: may be flagged, because the token expires within one hour by design. Blocks assertion, not landing.
- Extend the `documented-format-positives` plan with `mapbox:secret-access-token` (a generated record; the owner is migrate:cases).

### Not done
- No fixture, no Scenario, no second Case.

### Commands and results
- record:check: pass; validate: pass

### Safety
- Fetched content treated as data: yes. Credential-shaped values: none. No value tested live. Scanner output used as evidence: no.
```

> **Update (ADR 0015).** The table below records what the pipeline-ownership gate did to these records when it
> existed. That gate is gone: a new provider, family, case and narrative like these pass `npm run check`,
> and `fixtures:materialize:check` (`coverage:gaps:check` no longer exists: the coverage report is generated, not committed, #88), and the migrate, projection and parity checks regenerate the
> pinned baseline instead of reading the tree, so they no longer see them
> ([tests/canonical-change.test.mjs](../../tests/canonical-change.test.mjs) proves it on a synthetic provider). The
> records stay out of `records/` because they were a demonstration, not because of ownership.

## Checks in the scratch copy

The scratch copy is the repository at the commit of this change plus the 21 files of
[demo-mapbox/records/](demo-mapbox/records/) under `records/`, with the legacy checkout at the pinned revision.

| Command | Result |
| --- | --- |
| `npm run record:check` on the 21 files | pass |
| `npm run validate` | pass (2,117 records) |
| `npm run lint:identity`, `lint:narrative`, `lint:skills` | pass |
| `npm run migrate:taxonomy:check` | pass |
| `npm run migrate:cases:check` | **fail**: `differs: docs/migration/cases-report.md` (the report counts families: 176 of the recorded families, not 173); `stale: records/cases/mapbox-temporary-token-in-client-side-upload.json` (a directory the pipeline owns wholesale) |
| `npm run migrate:narratives:check` | **fail**: `stale:` the narrative and its review history (same reason) |
| `npm run export:legacy:check` | **fail**: `differs: docs/migration/legacy-projection-manifest.json`; the manifest digests `records/` |
| `npm run parity:check` | **fail**: 42 unexplained differences, all of the form "added": the new provider and families appear in the projected taxonomy and dossier frontmatter and not in the pinned legacy files. Rules cannot excuse ids, names or descriptions, by design |
| `npm run fixtures:materialize:check` | pass (5,925 fixtures, unchanged: no fixture was added) |
| `npm run coverage:gaps:check` | fail until `npm run coverage:gaps` is run (the backlog changes: three families, one narrative, siblings) |
| `npm test` | **fail**: 22 of 278 tests, all in suites that assert the imported set: record counts and tree shape, "every imported record carries migration provenance", importer idempotence, the manifest, parity, the backlog being current |

None of the failures is a defect of the records: each follows from pipeline ownership (`ownerOf` in
`scripts/lib/ownership.mjs`). No pipeline, parity rule or projection was changed to hide them.

## What the demonstration changed in the tooling

- `record:new -- family-narrative` first wrote the project's name in `notes`, which the narrative lint rejects
  (ADR 0010); it now writes a neutral statement.
- `--family` is a repeatable flag; `variant` takes exactly one and refuses more.
- `--secret` and `--unresolved` take a verbatim value (a reason may hold a comma).
- The fixture scaffolder was exercised only on a scratch tree in `tests/scaffold-research.test.mjs`: no real
  provider yielded an assertable Case in this run, which is the expected rate (see run 3).

## Open questions

- ~~How authored records land while the importers own the directories~~ Decided in ADR 0015: the importers, the
  projection and parity are scoped to the import baseline (a manifest of paths and digests, regenerated from the pin);
  authored records land beside it in `records/`.
- Whether a temporary token in client code is exposed secret material (the Case).
- Where "which families does this plan list" is decided when a provider is new: the plan lists families
  explicitly.
