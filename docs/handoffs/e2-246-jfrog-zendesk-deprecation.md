# E2 handoff: JFrog and Zendesk deprecation with continuing legacy use (2 candidates)

Issue: credential-evidence#246 (parent epic #238, source inventory #231 Group E). Related: [C3 handoff](c3-lexical-conflicts.md), [Batch 2 Cases](batch-2-cases-a.md).

This repository is maintained by the Redact Secret project, which also maintains the product, so this note is project-authored and is not independent validation. It is a factual disposition table and research note written by an AI agent run. Nothing is promoted: every contract stays `draft` with `period: proposed`, no family `currentContract` is set, no `reviewed` event was written. The four Cases added are `maintainer-only` (decided 2026-10-06 by the sole maintainer, repository owner, on the owner's instruction of 2026-10-05, recorded by an AI agent, queued for retro-review in #154), with basis `project-policy`; they are never `reviewed`. No scanner support status, finding type or product action entered a record.

## How the rows were produced

Each family's draft contract, family record and review history were read first. Provider pages were read as raw text (JFrog through the Markdown rendering of each docs page, Zendesk through the page HTML). Neither site served a bot challenge. Archived captures were fetched with the `id_` raw modifier and the digest of the bytes held is on the observation. Scanner rule artifacts were read at their pinned commits and cited only as `tool-corroborated` consistency, never as a basis for an expectation. Two JFrog-maintained client repositories were read as `provider-sdk-source` and count as one origin. Public repositories also hold other strings that begin with the JFrog key prefix; their origin is unknown, they were not used, copied or tested.

Both contracts are revision 1 drafts and were extended in place; no reviewed revision was touched. The stale `existence-only` (JFrog) and `not-researched-beyond-existence` (Zendesk) open questions were removed because the families are now researched, and four earlier open questions were rewritten to the current state of the evidence; each is named in the contract `notes`. No import-baseline record was edited in place (`baseline:check` passes with no new amendment).

## Row dispositions

| Candidate | Disposition | What the row settles | What stays open |
| --- | --- | --- | --- |
| `jfrog:api-key` | era and lifecycle facts separated and dated by release; format conflict recorded, not resolved; no final shutdown stated | carriers; deprecation, End of Life notice, new-key creation blocked and opt-in usage block as four separate facts; AKCp plus 69 pattern history | which form (73-character AKCp or the 44-character unprefixed example) applies to which release; final authentication shutdown; release dates |
| `zendesk:api-token` | lifecycle established as three separate dated phases plus a deprecation label; composition established; grammar unresolved | Basic composition (documented unchanged since 2022-12-03); phase 1, phase 2, phase 3 and existing-token continuation as separate claims; the 2026-04-21 recommendation versus the current deprecation | token prefix, alphabet, length; whether phase 1 was applied; announcement date |

Neither row is a pass, a fail, a false negative or a true negative, and neither blocks another row or group.

## `jfrog:api-key`

**Established** (claim | source | class)
- `carriers-header-and-basic-password`: the `X-JFrog-Art-API` header or the basic-authentication password | docs-jfrog-com-fd72df859f | provider-documented
- `existence-prefix-deprecated` (existing): pattern AKCp plus 69 alphanumerics, introduced 4.4.3, deprecated from 7.47.x | docs-jfrog-com-9efead811f, docs-jfrog-com-cb04684087 | provider-documented
- `introduced-4-4-3-regenerate-earlier-keys`, `retrievable-no-expiry-single-key` | docs-jfrog-com-fd72df859f, docs-jfrog-com-9efead811f | provider-documented
- `end-of-life-notice-q4-2024` (current) and `end-of-life-notice-in-2025-05-capture` (historical, archive pin of 2025-05-20): End of Life at the end of Q4 2024, as notified in 7.47.10 | docs-jfrog-com-fd72df859f, web-archive-org-ee79143a94 | provider-documented
- `new-key-creation-blocked-from-7-98`: creation disabled from 7.98, flags from 7.84.x, a blocking property and an Access YAML setting from 7.77 | docs-jfrog-com-fd72df859f | provider-documented
- `usage-block-is-administrator-opt-in`: blocking use of an existing key is an administrator setting that is off by default (cloud checkbox from 7.107.1, self-hosted flag) | docs-jfrog-com-fd72df859f | provider-documented
- `client-code-prefix-akcp8-minimum-73`: two JFrog client repositories (one origin) recognise a key by the leading `AKCp8` and a length of at least 73 | github-com-jfrog-jfrog-client-go-1d3c44e0c1, github-com-jfrog-build-info-dba3874b8a | provider-documented (provider-sdk-source)
- `create-api-key-sample-output-44-characters-no-prefix` (current) and `create-api-key-sample-output-unchanged-since-2025-09` (historical, archive pin of 2025-09-06): the reference page's example is 44 characters with base64 punctuation and no AKCp prefix; the example says only what it says | docs-jfrog-com-cb04684087, web-archive-org-05e5877a41 | provider-documented
- `pattern-statement-in-2025-10-capture` (historical): the AKCp plus 69 statement is already on the comparison page in the 2025-10-08 capture | web-archive-org-a6f7be4af4 | provider-documented
- `total-length-73-consistency` (existing): two scanner rule artifacts consistent with 73 characters | two scanner-rule sources | tool-corroborated
- `two-provider-statements-of-form-unreconciled`: the conflict itself, recorded as an unresolved claim | both pages | unresolved

**Inferred** (not recorded as claims)
- The 73-character figure is supported by the documentation pattern, JFrog client code and two rule artifacts (the client code and the documentation share one maintainer), and the 44-character example has one (its own page, unchanged since 2025-09-06). That weighs toward the AKCp form for recently issued keys but does not settle the example; the example may predate the AKCp form, may be schematic, or both forms may exist. The pages state none of these.
- "If generated prior to 4.4.3 you must regenerate" implies a change at 4.4.3 in how keys authenticate; no page says the key format changed then.
- Because usage blocking is opt-in and default off while the page says End of Life has been reached, a key may still authenticate on a current release; the pages do not say End of Life means authentication ends.

**Unresolved** (record | what would settle it)
- `api-key-format-conflict` (open question, unresolved claim): a JFrog per-release format statement or a statement that the example is schematic; an issued sample is issuance-gated and was not sought.
- `api-key-prefix-fifth-character`: a JFrog statement of the fifth character.
- `final-authentication-shutdown-not-stated` and `end-of-life-meaning`: a release note or lifecycle statement naming a shutdown release or date and defining End of Life.
- `release-dates-for-artifactory-versions`, `cloud-versus-self-hosted-timing`: JFrog release notes.

**Era table** (what the sources support; every row is a statement made on a page, not an observed behaviour)

| Event | Provider statement | Dating |
| --- | --- | --- |
| introduced | Artifactory 4.4.3 | release only |
| deprecated | Artifactory 7.47.x (reference pages); 7.47.10 notified | release only |
| End of Life notice | end of Q4 2024, on the page by 2025-05-20 (archive pin) | quarter, plus capture date |
| new-key creation blocked | Artifactory 7.98 (UI and API); self-hosted default true from 7.98 | release only |
| usage block available | cloud 7.107.1; self-hosted flag from 7.84.x; off by default | release only |
| final authentication shutdown | not stated | unknown |
| documentation archival | not observed; the older help-center page was captured through 2025-12-13 | not asserted |

## `zendesk:api-token`

**Established**
- `existence` (existing) and `basic-credential-composition-and-encoding`: Basic, username `{email_address}/token`, password the token; base64 into the header; `curl -u`; `%2F` over HTTP | developer-zendesk-com-73874c42bb | provider-documented
- `basic-credential-composition-in-2022-capture` (historical, archive pin of 2022-12-03): the same composition | web-archive-org-b03c7ae811 | provider-documented
- `retirement-timeline` (existing, combined) split into `phase-1-inactivity-deactivation-and-new-accounts` (2026-07-28), `phase-2-new-token-creation-blocked` (2026-10-27), `phase-3-final-deactivation` (2027-04-30) and `existing-tokens-work-until-final-date-and-parallel-oauth` | developer-zendesk-com-a681e17a67 | provider-documented
- `schedule-unchanged-in-2026-09-24-capture` (historical, archive pin): the same three dates a week earlier | web-archive-org-c384cbbea6 | provider-documented
- `api-token-recommended-in-2026-04-capture` (historical, archive pin of 2026-04-21) and `api-token-labelled-deprecated-current`: the page recommended tokens and did not label them deprecated on 2026-04-21, and heads the section API token (deprecated) now | web-archive-org-0955bfdfb5, developer-zendesk-com-73874c42bb | provider-documented
- `reasons-given-for-retirement`, `token-is-not-bound-to-a-user-but-needs-an-email`, `token-limits-and-deletion`, `documentation-example-token-40-characters` (the example is 40 characters of letters and digits and unchanged since 2022-12-03, not declared representative; not copied) | developer-zendesk-com-e25743b4de, developer-zendesk-com-73874c42bb | provider-documented
- `token-length-consistency` (existing): two scanner rule artifacts consistent with 40 characters | tool-corroborated

**Inferred**
- Deprecation labelling and the retirement schedule appeared on these pages between the 2026-04-21 capture of the security page and the 2026-09-24 capture of the migration page (the only capture found). The announcement date is therefore bounded, not known.
- The email address and the `/token` literal are the identifier part of the credential string and the token is the secret part. Zendesk calls the token a password and says a holder of the token and its associated email address can use it; it does not say whether the email address is confidential.
- Phase 1 (2026-07-28) has passed relative to the read date; the page still words it as taking effect and does not say it was applied.

**Unresolved**
- `opaque-grammar`, `variants-over-time`: token prefix, alphabet, length; a Zendesk format statement or an issued sample under a maintainer's authority (not sought).
- `phase-1-took-effect`, `deprecation-announcement-date`: a Zendesk status statement or changelog entry.
- `existing-basic-password-authentication`, `webhook-self-callback-tokens`: not researched beyond what the page states.

**Era table**

| Event | Provider statement | Dating |
| --- | --- | --- |
| recommended over basic auth | security page capture of 2026-04-21 | capture date |
| deprecated label and migrate notice | pages read 2026-10-06; migration page capture of 2026-09-24 | bounded between 2026-04-21 and 2026-09-24 |
| inactivity deactivation, new accounts blocked | 2026-07-28 | provider date, not observed applied |
| no new tokens for existing accounts | 2026-10-27 | provider date, still ahead of the read date |
| final deactivation, no reactivation | 2027-04-30 | provider date, ahead |

## Records and Cases

New or extended: the two contracts above (in place), the two family records (`research` fields), appended family review events, two `deprecated-form` variants (`api-key-deprecated-lifecycle`, `api-token-basic-credential-retiring`; lifecycle states, not format differences), two family narratives with their review histories, nine new sources (six archive captures, two provider client files, one docs page) and eight appended observations.

Cases (all `maintainer-only`, project-policy; review histories carry the decided event with dissent and reversing evidence):

| Case | Outcome | Fixtures |
| --- | --- | --- |
| `jfrog-api-key-header-and-basic-password-value` | must-flag, value only | `jfrog-authored--api-key-raw-http-art-api-header`, `...-curl-art-api-header`, `...-curl-basic-password` |
| `jfrog-api-key-lookalikes-and-non-values` | must-not-flag | `jfrog-authored--api-key-lookalike-header-name-only`, `-angle-placeholder`, `-environment-reference`, `-masked-display`, `-username-without-password`, `-documented-pattern-prose` |
| `zendesk-api-token-basic-credential-token-part` | must-flag, token part only | `zendesk-authored--api-token-curl-basic-credential`, `...-json-credentials-string`, `...-env-assignment` |
| `zendesk-api-token-lookalikes-and-non-values` | must-not-flag | `zendesk-authored--api-token-lookalike-email-and-subdomain-only`, `-documented-template`, `-environment-reference`, `-masked-display`, `-separator-without-token` |

Every value is synthetic, begins with `SYNTHETIC` and ends in a number, was built for these records and was never tested against any service. No value from a provider page, a repository search or a scanner artifact was copied. The two fixture sets were already in `.gitguardian.yaml` ignored paths, so no entry is needed.

Case axes recorded as not authored, with the reason:
- Basic header with the credential string base64-encoded (a representation boundary; the decode policy is a separate decision, not a source fact).
- URL userinfo form with `%2F`: Zendesk documents the encoding for HTTP authentication only, and an invented URL form would be a guess.
- Reference token in the same JFrog header and password positions: it is a different credential family; the Case does not infer the key type from position.
- A 44-character unprefixed key value or a 73-character AKCp value as a standalone bare token: the two forms are unreconciled, so no shape-based expectation is authored (`not-assertable`).
- Benign siblings: no source states that any part of either credential string is non-secret (the Zendesk email address, the JFrog username, the documentation examples), so no sibling record or sample was written.

## What the sources cannot settle

- Which JFrog key form belongs to which release, and whether the 44-character example is schematic.
- When, or whether, JFrog authentication with an existing key stops unconditionally, and what End of Life means for the feature.
- The calendar dates of the cited Artifactory releases.
- The Zendesk token grammar, whether the first phase was applied, and the announcement date.

## Commands and results

See the final report of this run for the exit codes of `npm run check` and `npm run fixtures:materialize:check`. The historical pinned checks were not run: no importer, legacy map, projection, parity, schema or shared generator code changed.
