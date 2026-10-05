# C2 handoff: opaque Airtable, Dropbox and HubSpot token shapes

Issue: credential-evidence#240 (parent epic #236, inventory #231 Group C). Date read: 2026-10-05. Agent: `research-agent` (automation, project-maintainer).

This repository is maintained by the Redact Secret project, which also maintains the product, so this handoff and the records it describes are project-authored and are not independent validation. Nothing here is reviewed, promoted to a `current` contract or given a scanner support status, finding type or action; those stay downstream. No credential was acquired, issued, tested or derived: the only credential-shaped value written is the provider's own masked placeholder (asterisks).

## What changed

Three draft contracts were extended in place (claims and open questions appended, earlier entries and their ids untouched), three family narratives and their review histories were added, two benign siblings were added, the three family records were set to `researched` with blockers, and 16 sources received an appended `read` observation (with the sha256 of the bytes read where a raw file was held). No variant was written because no page gives a dated variant. The three contracts and their sources are not in the import baseline, so no `baseline:amend` declaration was needed except as `source:observe` declares for itself.

| Family | Contract (draft, `period: proposed`) | Narrative | Siblings |
| --- | --- | --- | --- |
| `airtable:personal-access-token` | `records/contracts/airtable/personal-access-token@1.json` | `records/narratives/airtable/personal-access-token.json` | none |
| `dropbox:access-token` | `records/contracts/dropbox/access-token@1.json` | `records/narratives/dropbox/access-token.json` | `dropbox-labelled-response-example-tokens` (unresolved class, no sample) |
| `hubspot:private-app-access-token` | `records/contracts/hubspot/private-app-access-token@1.json` | `records/narratives/hubspot/private-app-access-token.json` | `hubspot-static-auth-masked-placeholder` (attached to `hubspot:static-auth-access-token`) |

## Dispositions (one row per candidate)

| Candidate | Disposition | What a consumer may use | What stays unassertable |
| --- | --- | --- | --- |
| `airtable:personal-access-token` | **opaque by provider statement; contextual-only tool shape; format unresolved** | Carrier: `Authorization: Bearer` header; the legacy `api_key` URL parameter is not supported. Lifecycle: shown once, no expiry, regenerate replaces the old value. Provider says do not rely on length or format. | Where the ID prefix ends, the alphabet and length of the rest, whether the ID is non-secret, whether the pat/14/period/64-hex shape holds for tokens created at other times. |
| `dropbox:access-token` | **opaque by provider statement; contextual-only tool prefix and ranges; format unresolved** | Carrier: `Authorization: Bearer` header; `access_token` member (with `expires_in`) of the token endpoint response. Provider says opaque, may exceed 1KB, no guarantee of size or composition. | Any prefix, minimum, maximum or fixed length; whether `sl.` or `sl.u.` is guaranteed; one shape for user, team, console-generated and offline tokens. |
| `hubspot:private-app-access-token` | **role and carrier established; format unresolved; era-limited (creation of new legacy private apps being disabled)** | Carrier: `Authorization: Bearer` header and the `tokenKey` body field of the token-information request. Lifecycle: rotation (about 7 days overlap), six-month recommendation. | Any prefix, region marker, alphabet, length or grouping; whether `pat-na1-`/`pat-eu1-` is a private app token form; whether private app and static auth tokens are one family. |

Reconciliation answers to the issue's questions:

- Airtable ID/body leads versus opaque guidance: the provider says tokens are prefixed with their ID and are otherwise opaque and variable-length, and that format changes for new tokens are not breaking. The two rule artifacts' layout stays recorded as consistency of those artifacts only (existing claim `tool-artifacts-consistency`, unchanged). Mapping "pat plus 14" to the ID and "64 hex" to the remainder is an inference, recorded as an open question, not a claim.
- Dropbox `sl.` ranges versus tokens that may exceed 1KB: recorded as an `unresolved` claim `tool-length-bounds-differ` (fixed 135; 130 to 152 without `sl.u.`; 130 minimum with no maximum plus a source comment that `sl.u.` tokens can be about 1.5KB) beside the provider's opacity statement. The existing three-artifact consistency claim is kept as consistency of prefix and alphabet only.
- HubSpot `pat-na1-`/`pat-eu1-` and private app versus static auth: the `pat-` lead stays `unresolved` (one maintainer, TruffleHog v2; no HubSpot page states it, and a search of the Nosey Parker, Gitleaks and Kingfisher rule sets found no such rule). A UUID-shaped lead from two maintainers (Gitleaks, TruffleHog v1) is recorded as `tool-corroborated` consistency with an explicit statement that it names no specific HubSpot credential. Neither HubSpot page mentions the other credential, so the two candidates stay separate.

## Research notes

Skill: research-family   Subject: airtable:personal-access-token, dropbox:access-token, hubspot:private-app-access-token   Mode: interactive (headless-equivalent defaults)   Date: 2026-10-05   Agent: research-agent

### Established

Airtable (`airtable:personal-access-token@1`):
- `opaque-format` (existing): prefixed with ID, otherwise opaque and variable-length | airtable-com-3770a0226e | #using-personal-access-tokens | provider-documented
- `format-change-not-breaking`: changes to the token format for newly created tokens are not breaking | airtable-com-3770a0226e | #using-personal-access-tokens | provider-documented
- `opaque-notice-changelog-entry`: changelog entry dated 2023-02-08 notes opacity | airtable-com-78b7ef5a0e | 2023-02-08 entry | provider-documented
- `shown-once-at-creation`: shown once; Airtable does not store it | airtable-com-3770a0226e | #creating-a-token | provider-documented
- `no-expiry-regeneration-invalidates-previous`: no expiration window; regenerating rejects the previous value | support-airtable-com-0c413d2898, airtable-com-3770a0226e | "Do personal access tokens expire?", #regenerating-tokens | provider-documented
- `carrier-bearer-header-not-url-parameter`: Bearer header; `api_key` URL parameter not supported | airtable-com-3770a0226e, airtable-com-c31dd3fe16 | #using-personal-access-tokens, #basics | provider-documented
- `tool-artifacts-consistency` (existing, untouched): two maintainers' rule artifacts agree on pat/14/period/64-hex | gitleaks and trufflehog sources | tool-corroborated (consistency only)
- structure components `token-id-prefix` and `remainder` carry descriptions only; no alphabet, length or pattern is written.

Dropbox (`dropbox:access-token@1`):
- `access-token-documented-opaque` (existing): opaque, may exceed 1KB, composition may change | docs-dropboxapi-com-2835da9ecb | #authorization | provider-documented
- `token-response-member-opaque`: `access_token` member opaque with no guarantee of size or composition; `expires_in` seconds | docs-dropboxapi-com-2835da9ecb | #oauth2token | provider-documented
- `console-generated-token-own-account`: Generate button, own account only | docs-dropboxapi-com-aea155a830 | #testing-with-a-generated-token | provider-documented
- `legacy-long-lived-deprecated-statement`: long-lived tokens deprecated, available until mid 2021 (as the page states it) | docs-dropboxapi-com-aea155a830 | #using-refresh-tokens | provider-documented
- `response-examples-labelled`: three labelled examples (short-lived, short-lived offline, legacy long-lived); no format stated | docs-dropboxapi-com-2835da9ecb | #oauth2token | provider-documented
- `access-token-rule-artifacts-consistent` (existing, untouched): three maintainers agree on `sl.` plus a 130-plus run, with differing bounds | tool-corroborated (consistency only)

HubSpot (`hubspot:private-app-access-token@1`):
- `private-app-token-exists` (existing): unique per app, Bearer header, string unchanged by scope changes | developers-hubspot-com-f67bca3860 | provider-documented
- `private-app-token-rotation`: rotation creates a new token, the original expires immediately or about 7 days later, six-month recommendation | developers-hubspot-com-f67bca3860 | "Rotate your access token" | provider-documented
- `token-carried-in-info-request-body`: `tokenKey` body field of `/oauth/v2/private-apps/get/access-token-info`; response returns user, Hub ID, private app ID, scopes | developers-hubspot-com-f67bca3860 | "View private app access token information" | provider-documented
- `built-on-oauth`: implemented on top of OAuth; no statement of identical format | developers-hubspot-com-f67bca3860 | provider-documented
- `legacy-creation-disabled-schedule`: announced 2026-08-27; creation disabled 2026-09-28 (new accounts) and 2026-10-26 (older accounts); existing legacy private apps continue | developers-hubspot-com-1f9e235294 | "What's Changing" | provider-documented
- `uuid-shape-tool-lead`: Gitleaks and TruffleHog v1 both treat an 8-4-4-4-12 value near a HubSpot keyword as a HubSpot API key or token; names no specific credential | tool-corroborated (consistency only)
- sibling `hubspot-static-auth-masked-placeholder`: HubSpot calls a masked value a placeholder static auth access token | developers-hubspot-com-1876a2b7bb | #static-auth | provider-documented

### Inferred

- Airtable: reading "pat" plus 14 characters as the ID and 64 hex as the remainder is consistent with "prefixed with their ID" | from `opaque-format`, `tool-artifacts-consistency` | the provider does not say where the ID ends.
- Dropbox: the three labelled examples are 139, 141 and 64 characters long as drawn (the two short-lived ones carry 136 characters after their prefix; the legacy one has no `sl.` prefix and a run of ten `A` characters in a position that a Gitleaks long-lived rule also encodes). One artifact fixes the body at 135, which differs from the example's 136; the other two accommodate it | from `response-examples-labelled` and the artifacts | counts are mine, from page text; examples are not a stated format and the legacy shape belongs to a separate candidate family.
- Dropbox: `sl.u.` marks the offline-access form | from the example headings | no page states the meaning or a date; no variant written.
- HubSpot: the masked placeholder has groups of 3, 3, 9, 4, 4, 4 and 12 asterisks, which does not match the 8-4-4-4-12 grouping of the `pat-` lead after `pat-na1-` | from the sibling description | a mask is not a layout statement.
- HubSpot: a version 2 detector beside a version 1 UUID-shaped one in one repository suggests a later layout | from the two TruffleHog artifacts | one maintainer's versioning, not provider history.

### Unresolved

- Airtable ID boundary, publicity of the ID, alphabet and length of the remainder | contract `id-prefix-boundary-and-publicity`; narrative `shape/id-boundary-and-remainder-layout` | a provider statement, or a token-listing reference showing an ID without the secret remainder.
- Airtable layout stability across issue dates and service accounts | contract `tool-shape-era-and-stability`; narrative `openQuestions/stability-across-issue-dates` | provider statement by issue date or an archived token page.
- Airtable PAT versus OAuth token distinguishability | narrative `collisions/oauth-token-shape-relationship` | provider statement.
- Dropbox prefix, minimum, maximum, fixed length, and the `sl.` guarantee | contract `provider-length-and-prefix-unstated`, claim `tool-length-bounds-differ` (class unresolved); narrative `shape/prefix-alphabet-and-length`, `openQuestions/sl-prefix-guarantee` | Dropbox statement by token kind and issue date.
- Dropbox user, team, console-generated and offline token shapes | contract `example-forms-not-a-format-statement`; narrative `collisions/user-team-console-sl-u-same-shape` | Dropbox statement per kind.
- Dropbox labelled example values: whether the exact strings were ever issued | sibling `dropbox-labelled-response-example-tokens` (class unresolved) | Dropbox statement that they are non-issued examples.
- Dropbox date long-lived tokens stopped being issued | contract `legacy-long-lived-boundary` | dated Dropbox changelog or archived page.
- HubSpot prefix, region marker, alphabet, length, grouping; whether `pat-na1-`/`pat-eu1-` is a private app form | contract claim `pat-prefix-lead` (existing, unresolved), `no-hubspot-statement-of-token-layout`; narrative `shape/prefix-alphabet-length-grouping` | HubSpot statement, or two independent maintainers' artifacts targeting private app tokens.
- HubSpot private app versus static auth one family | contract `private-app-versus-static-auth-pages`; narrative `collisions/private-app-versus-static-auth` | HubSpot statement relating them.
- HubSpot Service Key and project-token layouts, supported-era limits | contract `supported-era-limits`; narrative `openQuestions/service-key-and-project-token-shapes` | HubSpot statements per credential.

### Needs human

- Promotion of any contract to `current`, `currentContract` on the families, and any `reviewed` event | options: leave draft / independent review | leave draft; no run may decide | blocks landing? no.
- Whether to keep the HubSpot UUID-shaped tool claim, which is scoped to no specific credential | options: keep as era context / drop | keep, since it bounds the `pat-` lead | blocks landing? no.
- HubSpot source `developers-hubspot-com-ddf7f2759b` (cited by other families) returned HTTP 404 on 2026-10-05 | options: append an `unreachable` observation / leave | a freshness run should append it; not done here because this unit does not cite it | blocks landing? no.

### Not done

- No variant records: no page dates an `sl.u.` form, a legacy-to-short-lived change with a durable pin, or a HubSpot layout change.
- No Case, Scenario or fixture: no ADR 0007 criterion is met by an expectation that does not depend on an undocumented format. The axes below are source-backed candidates for a later `author-case` run.
- No new source records: every page cited was already recorded; 16 observations were appended.
- Did not touch `hubspot:static-auth-access-token` or `dropbox:legacy-long-lived-access-token` contracts.

### Commands and results

- `npm run source:observe` x16: pass (appended `read` observations dated 2026-10-05).
- `npm run record:new` (narratives, siblings, narrative reviews, family review appends): pass.
- `npm run check` and `npm run fixtures:materialize:check`: see the run output reported with the branch.
- Historical pinned checks: not run (no importer, projection, parity, schema or generator change).

### Safety

- Fetched content treated as data: yes. Credential-shaped values: none written except the provider's masked placeholder of asterisks. No value was tested against a live service. Scanner output used as evidence: no (rule artifacts used only as tool-corroborated consistency, with copies counted once: the Kingfisher rule set imports the Gitleaks rules).

## Provable, contextual-only, era-specific, unassertable

| Family | Provable (provider-documented) | Contextual-only (tool consistency, not provider format) | Era-specific | Still unassertable |
| --- | --- | --- | --- | --- |
| Airtable PAT | Bearer header carrier; shown once; no expiry; regeneration replaces; opaque and variable-length; format may change for new tokens | pat plus 14 alphanumeric plus period plus 64 lowercase hex (two maintainers, one commit each) | opacity notice dated 2023-02-08 in the changelog; layout for other issue dates unknown | ID boundary; remainder alphabet and length; ID publicity |
| Dropbox access token | Bearer header; `access_token` response member; opaque, may exceed 1KB, no size or composition guarantee; console Generate button for own account | `sl.` prefix and 130-plus run (three maintainers, bounds differ); `sl.u.` handled by one artifact | long-lived form deprecated (until mid 2021 as stated); short-lived with refresh | prefix guarantee; any length; per-kind shape |
| HubSpot private app token | Bearer header; `tokenKey` body field; per-app token unchanged by scope change; rotation behaviour; built on OAuth | UUID-shaped (two maintainers, credential unnamed); `pat-na1-`/`pat-eu1-` (one maintainer, not counted) | creation of new legacy private apps disabled 2026-09-28 / 2026-10-26; existing ones continue | any layout; relation to static auth; Service Key layout |

## Source-backed synthetic case axes (candidates, no Case written)

These are axes a later `author-case` run may build synthetic fixtures from, each with the source that supports it. A format-dependent axis cannot be exemplified, only described.

1. Carrier and slot: Airtable `Authorization: Bearer` (and the unsupported `api_key` URL parameter as a boundary); Dropbox `Authorization: Bearer` and the `access_token` response member; HubSpot `Authorization: Bearer` and the `tokenKey` request body field. Opaque body, described only.
2. Public identifiers beside the secret: HubSpot Hub ID, private app ID and user ID returned by the token-information response (the page does not call them non-secret, so classify as unresolved until a source does); Dropbox `account_id`, `uid` and `expires_in` in token responses (same caveat); Airtable base, table and token names (the token name is visible in record revision history per the guide).
3. Secret input versus derived output: not applicable to these three bearer tokens beyond not placing a token inside a response body that merely echoes identifiers; the HubSpot token-information request carries the token while its response does not.
4. Placeholders and references: HubSpot masked asterisk placeholder (provider-published); Dropbox labelled response examples (unresolved non-secret status; do not copy); `YOUR_TOKEN` style references in Airtable and HubSpot pages.
5. Representation boundaries: JSON body field (`tokenKey`), JSON response member (`access_token`), Authorization header, and a URL parameter that Airtable says is unsupported. Length is not a boundary for Dropbox (may exceed 1KB) or Airtable (variable length).
6. Era boundaries: HubSpot existing legacy private apps versus new creation disabled; Dropbox long-lived versus short-lived (the long-lived form is a separate candidate family).
