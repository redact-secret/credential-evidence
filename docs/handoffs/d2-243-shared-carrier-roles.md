# D2 handoff: shared-carrier roles and aliases across nine candidates

Issue: credential-evidence#243 (parent epic #237, inventory #231 Group D). Skill: research-family, run once per family, interactively. Date read: 2026-10-06 (UTC; pages were read on the evening of 2026-10-05 and 2026-10-06). Agent: `research-agent` (automation, project-maintainer).

This repository is maintained by the Redact Secret project, so this note and the records it describes are project-authored and are not independent validation. Nothing here is reviewed, promoted to a `current` contract, or given a scanner support status, finding type or product action. No Case or fixture was authored: none of the nine situations met the ADR 0007 criteria on provider evidence alone (no must-flag or must-not-flag expectation can rest on a documented grammar, because none of the nine families has one). Every claim states what a page read on the date above says. Pages were read raw (`curl`), the cited passages were checked against the raw text, and no search snippet or recall is used as a source.

## What changed

Nine draft contracts were extended in place (claims and open questions appended; earlier entries and ids untouched; none is in the import baseline), 11 sources were created and 14 existing sources received an appended `read` observation with the sha256 of the bytes read, four unresolved benign siblings with authored-event review histories were added, the nine family records were set to `researched` with `documentation-gated` and `issuance-gated` blockers, and one event was appended to each family's review history. No variant was written: the only dated change found (Figma plan access tokens generally available on 2026-07-23) is a family introduction, recorded as a claim pinned by content digest, not a form of a credential.

## Cross-cutting answer to the issue's question

For all nine candidates the provider sources document **a role** (who issues it, which privilege, which scope, which lifecycle) over **a carrier shared with another credential** (an `Authorization: Bearer` header, an `Authorization: ApiKey` header, `X-Figma-Token`, `client_secret` fields). None of the nine has an independently identifying grammar in any provider source read: no prefix, alphabet, length, checksum or version marker is stated for any of them, and for Asana and Dropbox the provider states the opposite (opaque, composition may change). The only lexical material in the repository for these families is the unrelated tool-corroborated material already recorded on sibling families, and it is not extended to these roles.

A negative observation of rule and detector **names only** (not contents) in two open-source scanner repositories (Gitleaks `config/gitleaks.toml` at `b58d3f102cf3a2c84cb7f923d05c25c9b1aed84b`, TruffleHog `pkg/detectors` at `0186870afd2c4a90def791d80260923ba583d076`) found no rule named for any of the nine roles. It is recorded as one open question per contract. It is not a source, not corroboration, not an expectation basis and not a statement about any product.

## Disposition per candidate

| Candidate | Role and carrier (provider-documented) | Independent lexical signal | Relation to the shared family | Final disposition |
| --- | --- | --- | --- | --- |
| `asana:service-account-token` | Org-wide, scope-limited long-lived token held by a service account; required for audit log, exports and SCIM; Authorization header documented for PATs and OAuth tokens only | none; Asana says all tokens opaque and calls the audit credential a "Service Account's personal access token" | same opaque carrier as `asana:personal-access-token`; privilege and issuer differ | role record kept; no grammar; carrier for SA tokens unconfirmed |
| `dropbox:app-auth-token` | Output of `client_credentials` at `/oauth2/token` (inputs: app key and app secret); sent as Bearer; usable only for App Authentication endpoints; the same endpoints also accept the app key and secret as basic credentials | none; no response example or member list for this grant | same Bearer carrier as `dropbox:access-token`; derived from `dropbox:app-secret` | role record kept; format and lifetime unresolved |
| `elastic:cross-cluster-api-key` | `cross_cluster` key from a dedicated endpoint; refused on the REST interface; carried in the local cluster keystore; privilege is exactly the `access` property; optional `certificate_identity` binding | none; `encoded` defined identically to a user key's | distinct carrier and role, shared encoded representation with `elastic:elasticsearch-api-key` | distinct role with distinct carrier; no distinct grammar |
| `elastic:serverless-project-api-key` | Personal key of a Serverless project; `Authorization: ApiKey` with the encoded value; Cloud API key is the documented alternative | none; one response type covers stack and Serverless | Elastic calls it the Serverless equivalent of the stack personal key | shared envelope with an issuance-context role; reuse of the envelope is not proof of a distinct shape |
| `figma:plan-access-token` | Plan-scoped, administrator-created, up to 365 days, secret shown once, id viewable, refresh keeps the old secret valid 24 hours; `X-Figma-Token`; categories REST API, npm registry, Figma CLI; generally available 2026-07-23 | none stated | `X-Figma-Token` shared with personal access tokens; not a PAT (not tied to a user, different scopes and expiry) | role record kept; era-specific; no grammar |
| `figma:cli-plan-access-token` | Fixed scope set, plan-wide, no scope or resource selection, same refresh and revoke rules; not a general-purpose REST token | none stated | a category of plan access token per Figma; carrier for CLI tokens not stated | role (scope) record kept; no independent grammar; carrier unresolved |
| `hubspot:static-auth-access-token` | Single-account token for apps configured `auth.type: static` with `distribution: private`; found in app settings; Bearer | none; masked placeholder only | Bearer shared with OAuth tokens and legacy private app tokens; no page relates it to the private app token | role record kept; relation to `hubspot:private-app-access-token` unresolved |
| `jfrog:pairing-token` | Limited-access, task-dedicated, signed, short-lived (300 s default), at-most-once access token with an extension (base URL, exchange URL, optional pairing URL); result is a master token; regenerable by API with a namespace | none; "signed" and "access token" only | JFrog calls it an access token (see `jfrog:access-token`); JWT form is an inference | role record kept; form unresolved; era unresolved |
| `meta:instagram-app-secret` | Instagram App Secret beside the Instagram App ID; `client_secret` in a POST form (code exchange) and in a GET query (long-lived exchange); server-side only | none stated | separate dashboard location and separate app ID by login type; whether the value differs from the Meta app secret is not stated | role record kept; value relation to `meta:app-secret` unresolved |

No hidden open conflict remains. The only point where two pages of one provider read differently (Asana's "Service Account token" versus "a Service Account's personal access token") is recorded as two claims with their sources and an open question, not resolved by choosing.

## Established

All are `provider-documented` unless stated, observed 2026-10-06; source ids are the record ids (locators are on the claims).

- Asana `@1`: `sa-org-wide-access-and-endpoints`, `sa-scope-list` | `developers-asana-com-526e7d0a68`, `-99143697df`. `audit-log-and-scim-require-service-account`, `audit-log-page-calls-it-a-personal-access-token`, `sa-token-expiry-is-a-workspace-setting` | `-1cbc565f43`, `-dc4f235255` (new). `pat-page-carrier-is-authorization-header` | `-0bccb998c0`. Existing `existence`, `scopes-distinct-from-oauth`, `format-opaque` re-read and unchanged.
- Dropbox `@1`: `app-auth-token-bearer-carrier`, `app-authentication-accepts-secret-or-token` | `docs-dropboxapi-com-ee9def1cd1`. `app-auth-token-request-inputs`, `app-key-is-sent-in-authorize-url` | `-2835da9ecb`. `app-auth-token-response-undocumented` (class unresolved; it holds the absence of a documented response).
- Elastic cross-cluster `@1`: `cross-cluster-key-dedicated-create-endpoint`, `cross-cluster-key-refused-on-rest-interface`, `cross-cluster-key-effective-access`, `cross-cluster-key-optional-certificate-identity` | `github-com-elastic-elasticsearch-specification-87b77d7fcb` (new, pinned commit `b57a7e50`). `cross-cluster-response-members-match-user-key` | `-ef157a8018` (new), `-46ec10b715`. `cross-cluster-key-carrier-is-local-cluster-keystore`, `remote-cluster-certificate-model-deprecated` | `github-com-elastic-docs-content-e6a937afb1`, `-caee4876de`, `-76f43a5374` (new, pinned commit `0d71d1be`). `cross-cluster-key-kibana-privilege-and-license` | `-ab9b9eb129`.
- Elastic Serverless `@1`: `serverless-key-types-listed`, `serverless-cloud-api-key-alternative` | `github-com-elastic-docs-content-2b309553de`. `stack-page-calls-serverless-keys-equivalent` | `-ab9b9eb129`. `serverless-create-response-type-is-shared` | `github-com-elastic-elasticsearch-specification-46ec10b715`.
- Figma plan `@1`: `plan-token-categories-and-endpoint-support`, `rest-plan-token-scopes-and-resources`, `plan-token-secret-shown-once-id-viewable`, `plan-token-refresh-previous-secret-valid-24h`, `x-figma-token-header-shared-with-personal-token` | `developers-figma-com-e9240bb71e`, `-0de277db62`. `plan-token-generally-available-2026-07-23` (temporality historical) | `developers-figma-com-09fcdae5f1` (new, pinned by content digest of the bytes held).
- Figma CLI `@1`: `cli-token-creation-fixed-scope-plan-wide`, `cli-token-lifecycle-shared-with-plan-tokens` | `-e9240bb71e`. `code-connect-cli-carrier-documented-for-personal-token` | `developers-figma-com-d1ec7f70da` (new).
- HubSpot static auth `@1`: `static-auth-selected-by-app-configuration`, `bearer-carrier-shared-by-oauth-static-and-private-app-tokens`, `static-auth-placeholder-is-not-a-format-statement` | `developers-hubspot-com-1876a2b7bb`, `-f67bca3860`. `pages-do-not-relate-static-auth-and-private-app-tokens` (class unresolved).
- JFrog `@1`: `pairing-token-purpose-and-signed-extension`, `pairing-token-generation-display`, `pairing-result-is-a-master-token`, `pairing-token-replaces-join-key`, `binding-token-is-a-related-role` | `docs-jfrog-com-a4d14ae414`. `pairing-token-regenerable-by-api-with-namespace` | `docs-jfrog-com-e08377920b` (new).
- Meta Instagram `@1`: `instagram-app-secret-shown-with-instagram-app-id`, `instagram-app-secret-carrier-in-code-exchange`, `instagram-app-secret-carrier-in-long-lived-exchange`, `instagram-docs-use-short-placeholder-secret` | `developers-facebook-com-c121bb0b0b`. `instagram-app-id-differs-by-login-type` | `developers-facebook-com-a66a788872` (new).
- Benign siblings (class unresolved, no sample value): `dropbox-app-key`, `figma-plan-access-token-id`, `jfrog-pairing-token-id`, `instagram-app-id`. Each records what the page says (an identifier shown beside or apart from the secret) and that no page calls it non-secret.

## Inferred (not recorded as claims)

- Asana: the Authorization header for a service account token follows from the audit log page's "personal access token" wording and the PAT page, but no service-account request example exists (open question `sa-carrier-example-absent`).
- Dropbox: the app auth token is a short-lived substitute for the app secret on App Authentication endpoints, because both are accepted there and the token is issued from the secret; Dropbox does not state "substitute" or any lifetime.
- Elastic: because `encoded` is defined identically for user, cross-cluster and Serverless keys, the three cannot be told apart by that representation alone; no page states whether `id` or `api_key` carries the type.
- Figma: the three plan token categories probably share a grammar (same page, same refresh and revoke rules), but the page does not say so.
- HubSpot: the masked placeholder's seven groups (3, 3, 9, 4, 4, 4, 12) are a documentation device; they do not match the 8-4-4-4-12 grouping of the `pat-` lead on the private app contract, but masking may not preserve lengths, so neither is read as format.
- JFrog: a pairing token is probably a JWT with an extension claim, from "signed", "extension" and JFrog's statement that the access token is a JWT; not stated for pairing tokens.
- Meta: the Instagram App Secret and the Meta app secret may be one value shown in two places or two values; the pages separate the app IDs by login type but not the secrets.

## Unresolved, and what would settle it

- Any prefix, alphabet, length or checksum for all nine roles | open questions named `*-lexical-*`, `*-shape-*` and `*-no-independent-lexical-signal` on each contract; family `research.blockers` | a provider statement, or an issued sample under a maintainer's authority (`issuance-gated`; never issued here).
- Asana service account token: request example, display-once, rotation, default expiry | `sa-carrier-example-absent`, `sa-display-and-rotation` | an Asana page with a service account request example; the Help Center service accounts page returned no text to a raw fetch (client-rendered). A browser reading was not attempted.
- Dropbox app auth token: response example, lifetime | `app-auth-token-lexical-shape-unstated`, `app-auth-token-lifetime-undocumented`, claim `app-auth-token-response-undocumented` | a Dropbox response description or example for `client_credentials`.
- Elastic: whether the type is encoded in the key; keystore setting name; base64 alphabet and padding | `cross-cluster-no-independent-lexical-signal`, `cross-cluster-keystore-setting-name-not-recorded`, `cross-cluster-encoded-alphabet-padding`, `serverless-no-independent-lexical-signal`, `serverless-key-id-confidentiality` | an Elastic statement; the remote cluster setup page for the keystore setting name.
- Figma: carrier of the CLI token and the npm registry token; whether categories share one grammar; when the CLI category was added | `cli-token-carrier-unstated`, `npm-registry-category-carrier-unstated`, `plan-token-categories-share-one-grammar`, `cli-token-era`, `cli-token-codebase-uploads-undocumented` | Figma pages for CLI and npm registry tokens; the changelog gives only the plan token general availability.
- HubSpot: relation of static auth tokens to private app tokens and to Service Keys; rotation and expiry | `pages-do-not-relate-static-auth-and-private-app-tokens` (claim, unresolved), `static-auth-vs-service-key`, `static-auth-rotation-and-expiry` | a HubSpot statement relating the credentials.
- JFrog: string form of a pairing token; whether it is a Bearer value at the exchange URL; era of pairing tokens | `pairing-token-form-is-inferred-not-stated`, `pairing-token-shared-carrier-with-access-token`, `pairing-token-era`, `pairing-token-id-confidentiality` | a JFrog page for the exchange API; a version or date for pairing tokens.
- Meta Instagram: whether the secret value equals the Meta app secret; derived outputs (an `appsecret_proof` analogue); public status of the Instagram App ID | `instagram-secret-same-value-as-meta-app-secret`, `instagram-secret-derived-outputs-unstated`, `instagram-app-id-public-status` | a Meta statement.
- Independence: tool-corroborated material was not added for any of the nine roles. Where an earlier family cites scanner artifacts for a prefix (Figma `figd_`, HubSpot `pat-`, Dropbox `sl.`), those remain claims about the other family and are not extended.

## Needs human

- Whether a maintainer wants any of the nine contracts promoted, `currentContract` set, or reviewed: not done; maintainer acts. Blocks landing: no.
- Elastic Serverless and the stack personal key share an envelope and Elastic calls the Serverless key an equivalent: whether the family is merged or kept as an issuance-context role is a downstream product judgement. Recommendation: keep the ID (preserved) and the role. Blocks landing: no.
- Asana service account token versus personal access token: Asana's audit log page treats the credential as a personal access token of a service account. Recommendation: keep both records, since issuer, holder and privilege differ and the PAT contract is already separate. Blocks landing: no.
- Meta Instagram: no decision on merging with `meta:app-secret` is possible from the sources.
- `.gitguardian.yaml`: not edited. No fixture set was added, so no ignored-paths entry is needed.

## Source-backed synthetic case axes (for later authoring, not authored here)

Public identifiers beside the secret: Dropbox app key (in the authorize URL) versus the app secret; Instagram App ID versus Instagram App Secret and Meta app ID versus Instagram App ID; Figma plan access token id versus the secret; JFrog token ID shown beside the pairing token; Elastic `id` beside `api_key` and the Base64 `encoded` form (a representation containing the secret, defined as Base64 of `id:api_key`); the Dropbox Base64 `Basic` header over app key and secret (a representation containing the secret). Secret inputs versus derived outputs: Dropbox app secret (input) and app auth token (output); JFrog pairing token (input) and master token (output); Elastic cross-cluster key bound by `certificate_identity` (binding attribute, not part of the key). Placeholders and references: HubSpot masked static auth placeholder and its differently grouped OAuth placeholder; `<OAUTH2_APP_AUTH_TOKEN>`; the Instagram sample `client_secret`. Carrier and representation boundaries: cross-cluster key in a keystore (not an Authorization header); Instagram secret in a POST form versus a GET query; `X-Figma-Token` shared by personal and plan tokens; two valid Figma secret values during the 24-hour refresh window. Any value must be synthetic and built without guessing a length or alphabet; none is documented, so values would be described, not exemplified.

## Era-specific, contextual-only and unassertable

- Era-specific: Figma plan access tokens (general availability 2026-07-23 per the changelog read, pinned by content digest); Elastic stack versus Serverless and the deprecation of the TLS certificate model for remote clusters (current statement); JFrog binding token (Artifactory 7.33.8) and join.key replacement (undated).
- Contextual-only (carrier, not grammar): Bearer, ApiKey, `X-Figma-Token`, `client_secret` placements.
- Unassertable: any string shape for the nine roles; whether any role can be told apart from its carrier-sharing sibling by string alone.

## Not done

- Family narratives: not written (as in the C1 handoff); the claims above are the cited basis and a narrative would repeat them.
- Variants and Cases: none, for the reasons above.
- Linking the parent epic and commenting on issues: left to the maintainer; no issue or pull request comment was made, and no pull request was opened.
- Two Figma pages for the CLI and npm registry categories, the JFrog exchange API, the Asana Help Center page and the Elastic remote cluster setup page were not found or not readable raw in the time spent; each is listed above.

## Commands and results

- `npm run record:check` on the changed records: pass.
- `npm run check`: exit 0 on the final run (350 tests, 0 failures). An earlier full run failed two baseline tests (`a removed baseline record fails until it is declared as removed` and its wrapper) while the machine was under heavy load from other runs; the same two test files passed when run alone in this tree (14 of 14) and on a clean `origin/main` tree, the baseline tree classification is unchanged (155 edited, all declared, 0 removed), and the final full run passed. The cause was not investigated further.
- `npm run fixtures:materialize:check`: exit 0.
- `npm run historical:check`: not run (no importer, schema or shared generator code changed).

## Safety

Fetched content treated as data: yes. Credential-shaped values: none copied or built; documentation examples with values (the Dropbox Base64 example, the Instagram sample secret, sample numeric app ID and truncated tokens, the Dropbox and JFrog example strings) were not copied. No value was tested against a live service. Scanner output used as evidence for an expectation: no; scanner repositories were consulted for rule and detector names only.
