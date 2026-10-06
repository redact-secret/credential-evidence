# Batch 2 handoff: bounded credential slots for 58 context candidates

Issue: credential-evidence#235 (parent inventory #231, follow-up to #232 and [Batch 1](batch-1-bounded-carriers.md)). Downstream: benchmarks#739 (groups #740 to #745) and core #1223 to #1226. Related: [ADR 0023](../decisions/0023-expectation-corrections-proposed-by-the-product-for-1205.md).

This repository is maintained by the Redact Secret project, which also maintains the product, so this handoff is project-authored and is not independent validation. It is a factual disposition table. It adds no Case, fixture, expectation, scanner support status, finding type or action: product policy stays with core and execution with benchmarks.

## What this table is

Each row is read from the family's current `format-contract` claims (the revision named in the issue, frozen below by the first 12 hex characters of the contract file's sha256 at commit `c34976b`; the full digest is `sha256sum` of the file). A row is:

- **ready**: the existing provider-documented claims name the carrier or field (an `Authorization` scheme, a token response member, a form field, a config slot). Benchmarks may author fixtures and controls for the slot from this row.
- **carrier-unresolved**: the claims establish the role (or existence) only. No field, header, prefix, alphabet or width is inferred from other providers; the row names the source that would settle it. It is not a false negative, a true negative or passing coverage, and it does not block any other row or group.

Same role never implies the same byte grammar across providers. Where a claim states no prefix, alphabet or width, none is claimed here. Where only existence is recorded, the carrier was not guessed.

## Cross-row boundaries

- G1: Meta role names, Contentful OAuth and Salesforce access-token facts do not prove a shared Bearer header or a subtype. Elastic's 22-character secret component is not the full-token width.
- G2: refresh tokens belong to token request and response fields, not resource API Bearer headers. Delimiters and adjacent `client_id`/`scope` remain with the source follow-up on each unresolved row.
- G3: `client_secret` and Basic only where a claim says so. App, client and account ids are public and separate. An HMAC signature output (`x-asana-request-signature`, webhook signatures) does not contain the signing secret.
- G4: the Cloud ApiKey carrier reuses the reviewed Batch 1 generic `Authorization: ApiKey` envelope; ECE needs its own source confirmation. A JWT is not an exclusive identifying grammar. X percent-containing shapes are conflicting tool leads (class `tool-corroborated`), not a provider-proven encoding; the raw carrier versus serialized escaping question is unresolved.
- G5: the HubSpot CLI config field and the MyJFrog carrier are unconfirmed. `oauth_token_secret` is the secret half; `oauth_signature` and the public token or client identity are not.
- G6: the Atlas private key is a client-configured Digest input; a Digest wire header holds a hash, not the key. The database password is user chosen and has no format. `mdb_sa_sk_` is a truncated example and `mdb_sa_id_` is a public id.

## Rows

### G1: 23 families, 23 ready

| Family | Status | Slot established by current claims | Public lookalikes and non-secret outputs | Claim IDs | Contract sha256 (first 12) | Follow-up when unresolved |
| --- | --- | --- | --- | --- | --- | --- |
| `adobe:oauth-server-to-server-access-token` | ready | `access_token` member of the token endpoint response (token_type bearer, expires_in seconds) | client_id, expires_in value | s2s-access-token-bearer-expiry | `413d96e026b1` | none |
| `airtable:oauth-access-token` | ready | bearer token after OAuth authorization (opaque, variable length) | client id, expires_in | existence, opaque-format | `1f66597af510` | none |
| `asana:oauth-access-token` | ready (researched, [carrier](batch-2-research-r1.md)) | role only (bearer-type token from the token exchange endpoint); no field or header named in the claims | task/project/user GIDs | existence, format-opaque | `695c27bd7ecc` | Asana "Authentication" / "OAuth" pages: token response member name and the Authorization form for an OAuth access token |
| `asana:personal-access-token` | ready | `Authorization: Bearer` header (documented: passed like an OAuth access token) | task/project/user/workspace GIDs (benign siblings, not tokens) | existence, presentation-bearer-header, format-opaque | `4b4e9ce02f62` | none |
| `box:oauth-access-token` | ready (researched, [carrier](batch-2-research-r1.md)) | token endpoint `AccessToken` schema with token_type bearer; no response member name or request header named in the claims | client id | existence | `e34353e73314` | Box developer docs (not readable in the first pass): authorization header form and the `access_token` member; app and developer token subtypes |
| `canva:access-token` | ready | `access_token` member of the token endpoint response, described as the bearer access token for the REST API | client id | existence | `510659fb3719` | none |
| `contentful:oauth-application-access-token` | ready (researched, [carrier](batch-2-research-r2.md)) | role only (OAuth token for public integrations); the claim records no field or header | content management personal access token (distinct family) | existence | `058ad040ef31` | Contentful "Authentication" page: header form for an OAuth token and the token-response field |
| `elastic:access-token` | ready | `Authorization: Bearer` header (token-service access token) | refresh token (distinct, G2), api key | existence | `e266196c8e82` | none |
| `elastic:service-account-token` | ready | `Authorization: Bearer` header (service token as bearer token) | 22-character secret component is not the full token width | existence, secret-string-length, no-expiry | `c8df09a254f6` | none |
| `figma:oauth-access-token` | ready | `access_token` member of the token endpoint response and `Authorization: Bearer` header | client id, file key, user id | existence | `23522bec4454` | none |
| `figma:scim-api-token` | ready | `Authorization: Bearer` header on the SCIM base URL (different from REST API auth) | REST personal access token (`X-Figma-Token`, Batch 1) | existence | `e2275e129354` | none |
| `hubspot:oauth-access-token` | ready | `Authorization: Bearer` header on every API request | client id, hubId/account id | oauth-access-token-exists | `f1775858b5c8` | none |
| `hubspot:service-key` | ready | `Authorization: Bearer` header (Service Keys, Settings > Integrations) | account id, scope names | service-key-exists | `8e56cb30d78a` | none |
| `meta:instagram-user-access-token` | ready (researched, [carrier](batch-2-research-r2.md)) | role only; the claim records no field or header and does not prove a shared Bearer header | app id, Instagram user id | existence | `6e23726b489e` | Meta developer docs: how each token kind is passed (`access_token` parameter vs Authorization header) per token kind, kept separate |
| `meta:page-access-token` | ready (researched, [carrier](batch-2-research-r2.md)) | role only; no carrier recorded | page id, app id | existence | `a1973708e2dc` | Meta docs: carrier for a Page token; do not assume it equals the user-token carrier |
| `meta:system-user-access-token` | ready (researched, [carrier](batch-2-research-r2.md)) | role only; no carrier recorded | system user id, business id | existence | `ef14a8e47cf9` | Meta docs: carrier for a system user token |
| `meta:user-access-token` | ready (researched, [carrier](batch-2-research-r2.md)) | role only; no carrier recorded | app id, user id | existence | `bafaa49d6eb0` | Meta docs: carrier for a user token and short-lived vs long-lived forms |
| `mongodb-atlas:service-account-access-token` | ready | `Authorization: Bearer` header to Atlas Administration API; issued at `POST /api/oauth/token` (1 hour) | client id (`mdb_sa_id_` + 24 hex), expires_in | issuance-and-lifetime, bearer-carrier, ip-access-list | `2c2f10461a9a` | none |
| `salesforce:oauth-access-token` | ready (researched, [carrier](batch-2-research-r2.md)) | role only (granted by the authorizing server under OAuth 2.0); no field or header recorded | consumer key | existence | `81f330b2f4c4` | Salesforce OAuth docs: `access_token` response member and Authorization form; subtype between connected and external client app tokens |
| `spotify:access-token` | ready | `Authorization: Bearer` header (`Bearer <Access Token>`, 3600 seconds) | client id | existence | `85836d1f738e` | none |
| `x:oauth2-user-access-token` | ready | `Authorization: Bearer` header (replaces the app-only bearer token) | client id, user id | issued-by-authorization-code-flow, lifetime-two-hours | `a9e23514d742` | none |
| `zendesk:oauth-access-token` | ready | `Authorization: Bearer` header (`Bearer {access_token}`); documented maximum length 184, no minimum, alphabet or prefix | client identifier, subdomain | existence, documented-maximum-length, lifetime-and-legacy-clients, global-token-context | `0cd0b9626533` | none |
| `zoom:server-to-server-access-token` | ready | Bearer access token from the `account_credentials` grant (3600 seconds, no refresh token) | account id, client id; JWT app mention is not a format statement | existence, jwt-app-mention | `8563d52a8298` | none |

### G2: 13 families, 13 ready

| Family | Status | Slot established by current claims | Public lookalikes and non-secret outputs | Claim IDs | Contract sha256 (first 12) | Follow-up when unresolved |
| --- | --- | --- | --- | --- | --- | --- |
| `adobe:oauth-user-refresh-token` | ready | `refresh_token` member of the token endpoint response (authorization code flow with offline_access) | client id, scope list | refresh-token-offline-access | `3d5bac3c4b8e` | none |
| `airtable:oauth-refresh-token` | ready (researched, [carrier](batch-2-research-r1.md)) | role only (returned with an access token; opaque); the claims name no field | client id | existence, opaque-format | `ef9605bbcda6` | Airtable OAuth reference: token response and refresh request member names, delimiters and adjacent client_id/scope |
| `asana:oauth-refresh-token` | ready (researched, [carrier](batch-2-research-r1.md)) | role only (token exchange response and refresh request); no field named | client id | existence, format-opaque | `c325e301337c` | Asana OAuth docs: `refresh_token` member and request form fields |
| `box:oauth-refresh-token` | ready (researched, [carrier](batch-2-research-r1.md)) | role only (returned alongside an access token, used with client id and secret) | client id | existence | `5ef575c9576f` | Box developer docs: `refresh_token` member and refresh request form |
| `canva:refresh-token` | ready | `refresh_token` member of the token endpoint response (single use) | client id, access token (distinct, resource-API bearer) | existence | `72c0232eeba5` | none |
| `dropbox:refresh-token` | ready (researched, [carrier](batch-2-research-r1.md)) | role only (`/oauth2/token` with token_access_type=offline; refresh request uses grant_type=refresh_token); response member name not in the claim | app key | refresh-token-exists | `a85e14974f72` | Dropbox OAuth guide: response member name and the form body of the refresh request |
| `elastic:refresh-token` | ready (researched, [carrier](batch-2-research-r3.md)) | role only (token-service refresh token, 24 hours); not a resource Bearer token | access token (distinct) | existence | `f7fe7256a274` | Elasticsearch get-token API reference: `refresh_token` response member and refresh request body |
| `figma:oauth-refresh-token` | ready | `refresh_token` member of the token endpoint response; request at `POST /v1/oauth/refresh` | client id | existence | `6195ef20af3a` | none |
| `hubspot:oauth-refresh-token` | ready (researched, [carrier](batch-2-research-r3.md)) | role only (long-term credential); no field named | client id | oauth-refresh-token-exists | `7be9a36c42c2` | HubSpot OAuth docs: `refresh_token` member and the form body of the refresh request |
| `spotify:refresh-token` | ready | `refresh_token` member of the token endpoint response; request with grant_type refresh_token | client id | existence | `9201e08a692e` | none |
| `x:oauth2-refresh-token` | ready (researched, [carrier](batch-2-research-r3.md)) | role only (issued with offline.access); response member and request form not named | client id, scope | issued-with-offline-access, lifetime-and-single-use | `a7a3af0d6c0d` | X OAuth 2.0 docs: refresh_token member and refresh form. The 6 month, single-use sentence is attributed to the OAuth 1.0a exchange in the claim; its scope is itself unresolved |
| `zendesk:oauth-refresh-token` | ready (researched, [carrier](batch-2-research-r3.md)) | role only (returned with the access token, exchanged with grant_type refresh_token) | client identifier | existence | `e61a9e5ffcc7` | Zendesk OAuth docs: `refresh_token` member and refresh form fields |
| `zoom:oauth-refresh-token` | ready | `refresh_token` member of the token endpoint response (90 days; latest one is used for the next refresh) | client id | existence | `3bf1818b8773` | none |

### G3: 12 families, 12 ready

| Family | Status | Slot established by current claims | Public lookalikes and non-secret outputs | Claim IDs | Contract sha256 (first 12) | Follow-up when unresolved |
| --- | --- | --- | --- | --- | --- | --- |
| `airtable:oauth-client-secret` | ready (researched, [carrier](batch-2-research-r1.md)) | role only (authenticates the integration when requesting a token); field or header not named | client id | existence | `bd8f7e40b26a` | Airtable OAuth reference: token request authentication form |
| `asana:oauth-client-secret` | ready (researched, [carrier](batch-2-research-r1.md)) | role only (sent to the token endpoint from the app server); field not named. HMAC output `x-asana-request-signature` is not the secret | client id; `x-asana-request-signature` | existence, also-signs-app-component-requests | `d4501587d50d` | Asana docs: token exchange form field name |
| `box:oauth-client-secret` | ready (researched, [carrier](batch-2-research-r1.md)) | role only (sent with the client ID); no field named | client id | existence | `a0b5fc774e8f` | Box docs: request body field and any Basic form |
| `dropbox:app-secret` | ready | `client_secret` (with `client_id`) at `/oauth2/token`; also the webhook signing key (HMAC output is not the secret) | app key (client_id), webhook signature | app-secret-exists | `8578d71bed8e` | none |
| `figma:oauth-client-secret` | ready | client id and client secret sent in an HTTP Basic `Authorization` header (token exchange and refresh) | client id | existence | `18648d33f173` | none |
| `hubspot:app-client-secret` | ready (researched, [carrier](batch-2-research-r3.md)) | role only (manages tokens, validates requests, client credentials token); field not named. Request signatures are derived outputs | client id, app id | client-secret-exists | `5cc8d4a4eeb3` | HubSpot OAuth docs: `client_secret` form field |
| `salesforce:external-client-app-consumer-secret` | ready (researched, [carrier](batch-2-research-r2.md)) | role only (optional Consumer Secret in app settings); wire field not recorded | consumer key | existence | `1022600d2fa1` | Salesforce docs: `client_secret` parameter and web server flow |
| `spotify:client-secret` | ready (researched, [carrier](batch-2-research-r2.md)) | role only (dashboard value); wire field and Basic form not recorded | client id | existence | `ea16107141d3` | Spotify authorization guide: token request header and body |
| `x:oauth2-client-secret` | ready | client id and client secret sent as a base64 Basic `Authorization` header to the token endpoints (confidential clients only) | client id; OAuth 1.0a consumer key and secret are distinct | confidential-clients-receive-secret, used-for-token-endpoint-auth | `0e3b7108abce` | none |
| `zendesk:oauth-client-secret` | ready | `client_secret` in token requests | identifier (`client_id`) | existence | `ea73bf3b3cad` | none |
| `zoom:oauth-app-client-secret` | ready (researched, [carrier](batch-2-research-r3.md)) | role only (confidential key assigned to an app); wire field not recorded | client id, account id | existence | `e514a82ea303` | Zoom OAuth docs: Basic header and form form |
| `zoom:server-to-server-client-secret` | ready (researched, [carrier](batch-2-research-r3.md)) | role only (shown with account id and client id); wire form not recorded | account id, client id | existence | `4c6937182e54` | Zoom S2S docs: token request authentication form |

### G4: 4 families, 4 ready

| Family | Status | Slot established by current claims | Public lookalikes and non-secret outputs | Claim IDs | Contract sha256 (first 12) | Follow-up when unresolved |
| --- | --- | --- | --- | --- | --- | --- |
| `elastic:cloud-api-key` | ready | `Authorization: ApiKey <key>` (reuses the reviewed Batch 1 generic envelope; no prefix or width claimed) | not a hosted Elasticsearch API key | existence, authorization-carrier, lifecycle, not-for-hosted-elasticsearch | `18f415350aa1` | none |
| `elastic:ece-api-key` | ready (researched, [carrier](batch-2-research-r3.md)) | role only (UI-created key for the ECE REST API); carrier needs its own source confirmation | Cloud API key (distinct) | existence, lifecycle | `cd6eee3f4a9f` | Elastic Cloud Enterprise API reference: authentication header for the API key |
| `jfrog:access-token` | ready (researched, [carrier](batch-2-research-r2.md)) | role only (a JSON Web Token used as the bearer credential); request header or form not named. A JWT is not an exclusive identifying grammar | JWTs of other providers; references or reference tokens | existence | `febe2a861061` | JFrog access token docs: header and `access_token` form; representation of a reference token |
| `x:app-only-bearer-token` | ready | Bearer Token (bearer role documented); byte format unspecified. Percent-containing shapes are tool leads, not provider-proven, and stay unresolved | consumer key and secret that generate it | generated-from-consumer-credentials, format-unspecified, sensitivity-and-rotation, artifacts-bearer-leading-run-and-percent | `752810e7ec5d` | none |

### G5: 3 families, 3 ready

| Family | Status | Slot established by current claims | Public lookalikes and non-secret outputs | Claim IDs | Contract sha256 (first 12) | Follow-up when unresolved |
| --- | --- | --- | --- | --- | --- | --- |
| `hubspot:personal-access-key` | ready (researched, [carrier](batch-2-research-r3.md)) | role only (stored in a local global config file); the field name is not recorded | portal/account id | personal-access-key-exists | `c32123658964` | HubSpot CLI docs and `hs` config reference: exact config field and file layout |
| `jfrog:myjfrog-api-token` | ready (researched, [carrier](batch-2-research-r2.md)) | role only (MyJFrog API token, one year); carrier not recorded | JFrog platform access token (distinct) | existence | `964062ba1e9f` | JFrog MyJFrog API docs: header form |
| `x:oauth1-access-token-secret` | ready | `oauth_token_secret`, the secret half issued with `oauth_token` (3-legged flow) | `oauth_token`, `oauth_signature`, OAuth 2.0 client id and secret (distinct) | paired-secret-of-access-token, distinct-from-oauth2-client-credentials | `380dfecdf407` | none |

### G6: 3 families, 3 ready

| Family | Status | Slot established by current claims | Public lookalikes and non-secret outputs | Claim IDs | Contract sha256 (first 12) | Follow-up when unresolved |
| --- | --- | --- | --- | --- | --- | --- |
| `mongodb-atlas:database-user-password` | ready | `password` request property of the Atlas database user (write-only, caller chosen, min 8, not in responses) | username, database name; user-chosen text has no format, percent encoding when placed in a connection string is unresolved | api-field, chosen-by-caller | `8f67a633cfc5` | none |
| `mongodb-atlas:programmatic-api-private-key` | ready | plaintext slots established 2026-10-06 (#256): the response member `privateKey` of the ApiKeyUserDetails answer to create-organization-API-key and create-project-API-key (unredacted when first created, redacted afterwards) and the Atlas CLI profile property `private_api_key`. No request member carries it and no Digest wire header holds it (a Digest header holds a hash). Not established: environment variable, command-line flag, Terraform argument, curl `--user` layout, byte grammar, prefix, length, alphabet | public key (`publicKey`, exactly 8 characters), Digest response and nonce values, redacted `privateKey` in later responses, PEM private keys (another credential), `mdb_sa_id_` client ids, masked displays | two-part-key, legacy-method, private-key-unredacted-once, public-key-length, digest-not-bearer, no-ui-or-data-access, creation-response-member, cli-profile-property, terraform-provider-documents-service-account-arguments | `d7ba7f305131` (at freeze; claims added after) | open question `plaintext-slots-not-established` |
| `mongodb-atlas:service-account-secret` | ready | HTTP Basic `Authorization` header carrying base64 of `CLIENT_ID:CLIENT_SECRET` at `/api/oauth/token` with grant_type=client_credentials | client id (`mdb_sa_id_` + 24 hex, public), masked form; `mdb_sa_sk_` plus ellipsis is a truncated example, not a grammar | pair-and-role, shown-once, example-prefix, client-id-pattern, expiry-and-rotation, basic-carrier, recommended-method | `5248f65035fd` | none |
## Group completeness (after the carrier research below) (for benchmarks#740 to #745)

| Group | Rows | Ready | Carrier-unresolved |
| --- | ---: | ---: | ---: |
| G1 | 23 | 23 | 0 |
| G2 | 13 | 13 | 0 |
| G3 | 12 | 12 | 0 |
| G4 | 4 | 4 | 0 |
| G5 | 3 | 3 | 0 |
| G6 | 3 | 3 | 0 |
| Total | 58 | 58 | 0 |

All 58 inventory rows are present once (58 unique families, none omitted). Every group's dispositions are complete in this document: each row is either ready or carrier-unresolved with a named follow-up, so each measurement issue can start on its ready rows.

## Carrier research for the 28 rows that were carrier-unresolved at freeze

The 28 rows were researched from official provider pages read raw (reports: [R1](batch-2-research-r1.md) asana, box, airtable, dropbox; [R2](batch-2-research-r2.md) meta, contentful, salesforce, jfrog, spotify; [R3](batch-2-research-r3.md) elastic, hubspot, x, zendesk, zoom). Each now has a documented carrier claim in its draft contract and positive and benign Cases. The `Slot established by current claims` column below records the state at the freeze (contract digests are of the files at that commit); the new claims and their sources are in the contracts and the reports. "Ready" means the carrier is documented; it does not mean a prefix, alphabet or width. Unresolved details stay as open questions in the reports and contracts (for example the HubSpot config layout `accounts` versus legacy `portals`, the X refresh token lifetime scope, the ECE page inconsistencies, the Meta Authorization header not being documented).

## Cases and fixtures

All 58 rows now have Cases: a positive (`must-flag`) and a benign (`must-not-flag`) Case per slot, with synthetic fixtures in the layouts each contract supports. Family, case and fixture lists: [A](batch-2-cases-a.md) (adobe, airtable, asana, canva, dropbox, zendesk, zoom), [B](batch-2-cases-b.md) (elastic, figma, hubspot), [C](batch-2-cases-c.md) (mongodb-atlas, spotify, x); the 28 researched rows are in the research reports above. They are `maintainer-only` project-policy decisions recorded on the owner's instruction (2026-10-05, [ADR 0020](../decisions/0020-solo-maintainer-period.md)), never `reviewed`, not independent validation, queued for retro-review (#154). The provider-documented part is the carrier; value admission, span and attribution are project policy. Exceptions: `mongodb-atlas:programmatic-api-private-key` has only a benign Case (a Digest header and the public key are not the private key); its plaintext slots were sourced afterwards (#256, [note](atlas-private-key-slots.md)) and no positive Case was authored, because a must-flag expectation is a project-policy decision the owner has not taken for this slot, and `database-user-password` leaves percent encoding unresolved.

## Not done here

- No source was newly read for this table. The slots come from claims already recorded under `records/contracts/`.
- No unsupported-variant (`not-assertable`) Cases were authored for Batch 2.
- Open questions of each contract (width, alphabet, subtype, id confidentiality) stay open; none was resolved from a scanner.
