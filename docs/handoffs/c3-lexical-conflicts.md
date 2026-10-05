# C3 handoff: lexical length, alphabet and source-independence conflicts for 5 candidates

Issue: credential-evidence#241 (parent epic #236, source inventory #231 Group C). Related: [Batch 2](batch-2-bounded-carriers.md).

This repository is maintained by the Redact Secret project, which also maintains the product, so this note is project-authored and is not independent validation. It is a factual disposition table and research note. It adds no Case, fixture, expectation, scanner support status, finding type or action; product policy stays with core and execution with benchmarks. Every record named here is a `draft` written by an AI agent run and has not been reviewed. Nothing here is promoted: `period` stays `proposed`, no family `currentContract` is set, and no review event of type `reviewed` was written.

## How the rows were produced

Each family's existing contract revision 1 (claims and open questions) and review history were read first. Every cited source was re-read on 2026-10-05 and an observation appended (`source:observe`); new pages were recorded with `record:new`. Official pages were read as raw text; two pages that serve a bot challenge to a plain HTTP client (Contentful) or render through script (Salesforce Help) were read in a browser and their visible text checked. Scanner rule artifacts were read as raw files at their pinned commits. A scanner artifact is cited only as `tool-corroborated`, only for what its code says, and copies or generated catalogs of the same expression count once.

Revision 1 of each contract is untouched. Each family got a revision 2 that `supersedes` it and says in `notes` what changed. None of the five contracts carries a structure length, alphabet or prefix any more, because the schema reserves the structure for the format as defined by the provider and no provider page settles any of them. Observed scopes live in claims, not in a compromise union.

No import-baseline record was edited in place (the contracts, families' review histories and sources are not in the baseline manifest; `source:observe` and `review --append` declare their own amendments if any applied). Family records gained only `research` fields.

## Row dispositions

| Candidate | Disposition | Contract (revision 2, sha256 first 12) | What the row settles | What stays open |
| --- | --- | --- | --- | --- |
| `contentful:cma-personal-access-token` | single-artifact question narrowed; format unresolved (era-specific shapes in conflict) | `c8b7c7e603cf` | existence, creation endpoint, Bearer form, shown once; `CFPAT-` begins provider-maintained placeholders; two rule artifacts agree on the prefix and alphabet | body length (43 vs at least 40 vs a 64-character hexadecimal API example), whether eras exist |
| `jfrog:reference-token` | conflict recorded, not resolved | `ddaf3f64f46f` | two current provider statements (64 and 128 characters) kept apart with page dates; carriers; two-maintainer 64-character consistency | which form the 128 describes; 7.38.4 vs 7.38.10; what follows `cmVmd` |
| `meta:app-secret` | existence, carriers and derived outputs established; format unresolved | `8b95baa9db7f` | secret role, reset rules, `client_secret` and `{app-id}|{app-secret}` carriers, `appsecret_proof` as derived output; 32 recorded only as artifact scope | alphabet, length, hash-width collisions are context-only |
| `salesforce:oauth-refresh-token` | carrier established; format and source independence unresolved | `494cdf866f6f` | response member, request parameter, secrecy; prefix as artifact scope | length, alphabet, token-kind scope, artifact independence |
| `x:oauth1-consumer-secret` | conflict split three ways; length unresolved | `e344cac2f15a` | secret input vs signature output; shown once; 50 characters in two maintainers' artifacts; 35 to 44 as a single-artifact lead | which figure applies to an issued secret and when |

All five are unresolved on the lexical question the issue names. None is a pass, a fail, a false negative or a true negative, and none blocks another row or group.

## Per candidate

### contentful:cma-personal-access-token

**Established** (claim | source | class)
- `existence`: personal access tokens are one of two content management token types, created in the web app under CMA tokens, same rights as the account owner, shown for copying only at creation | contentful-com-c14fcad040 | provider-documented
- `creation-api-bearer-carrier-shown-once`: POST /users/me/access_tokens, scopes `content_management_read` or `content_management_manage`, value returned only once, `Authorization: Bearer <token>` | contentful-com-c9e351aca5 | provider-documented
- `provider-placeholders-begin-cfpat`: two Contentful-maintained repositories write the CMA token placeholder beginning `CFPAT-` (states a leading string only) | github-com-contentful-contentful-cli-40c048ff5b, github-com-contentful-contentful-migration-e0e0f23262 | provider-documented
- `cfpat-prefix-and-alphabet-consistency`: TruffleHog and Vulnetix both treat `CFPAT-` plus letters, digits, underscore and hyphen as the token; 43 exactly vs at least 40 | github-com-trufflesecurity-trufflehog-1695724060, github-com-vulnetix-cli-005e308d07 | tool-corroborated (derivation of the Vulnetix catalog from TruffleHog is not stated; reviewer to confirm)

**Inferred** (not recorded as claims)
- The single-artifact finding in revision 1 is partly answered: a second artifact exists for the prefix and alphabet, but only TruffleHog fixes 43, so the 43 figure remains one artifact's.
- Rule artifacts in search results that match Praetorian's Titus and some browser tools reproduce an expression with the `kingfisher.contentful.2` id; those are copies and were not counted.

**Unresolved** (record | what would settle it)
- `reference-example-token-shape-differs` (unresolved claim): the current API reference example shows a 64-character hexadecimal token with no prefix. Settled by a Contentful statement on whether the example is schematic.
- `format-and-prefix-era` (open question): a 2018-04-16 Contentful-maintained SDK test recording has `CFPAT-` plus 64 characters (lead only, origin unknown, value not copied). Settled by a Contentful format and history statement or a dated archive snapshot; an issued sample is issuance-gated and was not sought.
- `redacted-value-member`, `expiry-and-revocation`, `cli-token-kind`: not asserted.

### jfrog:reference-token

**Established**
- `identity-page-pattern-64`: pattern `cmVmd` plus 59 alphanumeric characters, "short (64 characters)", Identity Tokens page (published metadata: updated 2026-08-13) | docs-jfrog-com-9efead811f | provider-documented
- `access-page-128-character-key`: admin-scoped reference token "shortened, 128-character key" from Artifactory 7.38.4, Access Tokens page (updated 2026-07-06) | docs-jfrog-com-a4d14ae414 | provider-documented
- `carriers-and-handling`: `X-JFrog-Art-Api` header or basic-auth password; not retrievable (stored hashed) | docs-jfrog-com-9efead811f, docs-jfrog-com-a4d14ae414 | provider-documented
- `total-length-64-consistency`: Gitleaks (generic, keyword-gated, no prefix) and TruffleHog (`cmVmdGtu` plus 56) both give 64 total; no artifact read gives 128 | two scanner-rule sources | tool-corroborated

**Inferred**
- The documented prefix `cmVmd` and TruffleHog's `cmVmdGtu` are consistent with base64 of `reftkn`; the page states no encoding, so it is not a claim.
- Because both artifacts agree on 64 and none on 128, the 128 figure is the less supported one among the evidence read; it is still a current provider statement and is not discarded.

**Unresolved**
- `length-64-versus-128-conflict` (unresolved claim) and open question `length-64-versus-128`: different form, earlier form or stale figure. Settled by a JFrog length history per release or a dated archive snapshot.
- `introduction-version-conflict`: 7.38.4 (Access Tokens) vs 7.38.10 (Create Token `include_reference_token`).
- `eight-character-prefix-single-artifact`; `identity-versus-admin-scoped-family`; `characters-after-prefix`; `api-key-and-other-token-boundary`.

### meta:app-secret

**Established**
- `existence`, `reset-and-forced-reset` (dashboard reset only, no programmatic rotation, Meta may reset on leak) | developers-facebook-com-ad9938bb1e | provider-documented
- `carriers-client-secret-and-composite`: `client_secret` parameter of the app access token call; `{app-id}|{app-secret}` as `access_token` | developers-facebook-com-35c7caf5a9 | provider-documented
- `appsecret-proof-is-a-derived-output`: sha256 hash keyed by the app secret, added as a parameter; the page gives no encoding, length or disclosure guidance | developers-facebook-com-ceaa61b591 | provider-documented
- `body-length-32-consistency`: Gitleaks, TruffleHog, Nosey Parker each gate on a facebook-related word and capture exactly 32 characters; alphabets differ | three scanner-rule sources | tool-corroborated
- Sibling `meta-client-token`: the client token is embedded in apps and is "not secret" | developers-facebook-com-35c7caf5a9 | provider-documented

**Inferred**
- A 32-character value with a hexadecimal alphabet has the same width and alphabet as common digests and identifiers, so a bare value is not attributable to Meta by shape. The hash-collision risk is context-only: nothing read says the App Secret is hexadecimal.
- `appsecret_proof` is a keyed hash output and does not contain the secret; its width depends on an encoding the page does not state.

**Unresolved**
- `alphabet-not-settled` (unresolved claim), `format-undocumented`, `app-id-public-status` (the page does not call the App ID non-secret), `appsecret-proof-encoding`, `instagram-app-secret-boundary`. Settled by a Meta statement of the format, or an archived page that gives one.

### salesforce:oauth-refresh-token

**Established**
- `existence` | developer-salesforce-com-073e7d3542 | provider-documented
- `token-response-member-and-secret`: optional `refresh_token` response member, returned only with the `refresh_token` scope, "This value is a secret" | help-salesforce-com-490d26490b | provider-documented
- `refresh-request-carrier`: `refresh_token` parameter of POST /services/oauth2/token with `grant_type=refresh_token`; OAuth tokens and client secrets not in a GET query | help-salesforce-com-4202099562 | provider-documented
- `tool-prefix`: TruffleHog and Vulnetix both start at `5Aep861`; minimum remainder 80 vs 40; `=` vs `-` | two scanner-rule sources | tool-corroborated, independence unconfirmed

**Inferred**
- The prefix is an artifact scope, not a Salesforce statement. Third-party connector documentation shows `5Aep861` in an access-token position too (not recorded, not copied), so a prefix-only attribution to refresh tokens may be ambiguous.

**Unresolved**
- `format-not-documented` (unresolved claim), `refresh-token-length-alphabet`, `source-independence` (the TruffleHog expression is copied verbatim by other repositories and counts once; the Vulnetix rule is generated from a catalog of unstated origin; other artifacts use minimums of 60 and 20), `prefix-token-kind`, `connected-versus-external-client-app`.

### x:oauth1-consumer-secret

**Established**
- `exists-as-api-key-secret` (including shown once) | docs-x-com-ed9ff4d454 | provider-documented
- `handling-and-use` | docs-x-com-58d088945a, docs-x-com-acae1aa0ac | provider-documented
- `signing-key-input-signature-output`: the consumer secret forms the signing key (alone plus `&` when no token secret); `oauth_signature` is the base64 HMAC-SHA1 output and is not the secret | docs-x-com-eb6b1f60b4 | provider-documented
- `worked-example-lengths`: the page's worked example (2011-dated request) uses 22, 43 and 41 characters for key, consumer secret and token secret; example only | docs-x-com-eb6b1f60b4 | provider-documented (about the example)
- `length-50-consistency`: Gitleaks and TruffleHog both capture 50 | two scanner-rule sources | tool-corroborated

**Inferred**
- The provider's 43-character example sits inside Nosey Parker's 35 to 44 and outside 50, which fits an older and a newer issuance, but it also fits a generic rule matching both the consumer secret and the token secret. No page says which, so it is not a claim.

**Unresolved**
- `length-35-to-44-single-artifact` (lead), `artifacts-disagree-on-secret-length` (unresolved claim; no union recorded), `format-of-issued-secret`, `consumer-key-public-status`, `token-secret-boundary`, `percent-containing-forms`.

## Provable, contextual-only, era-specific, unassertable

| Class | Meaning here | Rows |
| --- | --- | --- |
| Provable (provider-documented) | a provider page or provider-maintained repository states it | roles, carriers and handling in all five; JFrog pattern and 64 / 128 statements as statements; Salesforce, Meta and X secrecy statements; X signing-key role; Meta client token not secret |
| Contextual-only | holds only with a nearby word or position, not by shape | Meta 32-character value; Contentful `CFPAT-` placeholders; X consumer-secret lengths in artifacts; Salesforce `5Aep861` |
| Era-specific, not yet assertable as such | evidence points to different shapes at different times, no provider statement of the dates | Contentful (64-hexadecimal example, 2018 SDK recording lead vs 43-character rule); JFrog 64 vs 128 and 7.38.x versions; X 43-character 2011 example vs 50 |
| Unassertable | no source settles it; recorded as unresolved with what would settle it | any structure length, alphabet or prefix for all five; Meta alphabet; Salesforce length and token-kind scope; artifact independence for Contentful and Salesforce |

## Case axes for later authoring (no Case is created here)

Sourced axes a Case or Scenario author can use; each needs its own Case-criteria check (ADR 0007) and synthetic values only.

- Public identifier beside the secret: Meta client token (provider says not secret); Meta App ID, Salesforce consumer key, X consumer key and JFrog token ID are not stated as non-secret by the pages read, so they are context, not benign siblings.
- Secret input versus derived output: Meta `appsecret_proof` (keyed hash of a token); X `oauth_signature` (base64 HMAC-SHA1 output) and signing key (contains the secret); a derived output is not the secret.
- Composite carriers: Meta `{app-id}|{app-secret}`; JFrog basic-auth password and `X-JFrog-Art-Api`; Salesforce `refresh_token` in a POST body (not a GET query); Contentful `Authorization: Bearer`.
- Placeholders and references: `CFPAT-` placeholders in provider repositories; placeholders in provider examples (Salesforce request example shows a placeholder).
- Representation boundaries: X percent-encoded consumer secret in the signing key; JFrog reference token (alias) versus the JWT it refers to; Meta composite splits at the pipe.
- Do not author a shape-only expectation for any of the five. The accepted boundary is context and carrier, not length or alphabet.

## What would settle the open items

- Contentful: a provider statement of the token format and its history; or a dated archive snapshot of the Authentication or Create an access token page.
- JFrog: a statement or release note giving reference-token length by release; a dated archive snapshot of the Access Tokens page.
- Meta: a page, SDK source or changelog that states the App Secret format.
- Salesforce: a page that states a refresh token grammar, or maintainer provenance for the rule artifacts.
- X: a statement of key and secret lengths and when they changed, or a dated archive snapshot of an X page that states one.
- For any: an issued sample is issuance-gated and was deliberately not sought. Nothing was issued, tested against a live service or derived from a real credential.

## Commands

`npm run check` passed (350 tests, 0 failures) and `npm run fixtures:materialize:check` passed (6601 fixtures, records verified) on 2026-10-05. The historical pinned checks were not run: no importer, projection, schema or shared generator code changed.
