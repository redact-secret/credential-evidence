# D3: transient codes, composite credentials, OAuth 1.0a halves and Zoom signing semantics (5 candidates)

Issue: credential-evidence#244 (Group D3 of #237; inventory #231). Earlier work: [Batch 2 research round 3](batch-2-research-r3.md), [Batch 2 Cases A](batch-2-cases-a.md).

This repository is maintained by the Redact Secret project, which also maintains the product, so none of this is independent validation. Every page named below was read raw on 2026-10-05 (`curl -sL`, no search snippets, no recall; no page was bot-challenged) and re-observed with `npm run source:observe` with the sha256 of the bytes read. New claims were appended to each family's existing draft contract (claims and open questions only, no earlier claim edited). No format (prefix, alphabet, length) was inferred for any of the five, no scanner artifact was used, and no example value from a documentation page was copied. Documentation examples are placeholders or illustrative and are not format statements.

The five Cases are `maintainer-only` (decided 2026-10-05 by the sole maintainer under [ADR 0020](../decisions/0020-solo-maintainer-period.md), recorded by an AI agent on the owner's instruction, queued for retro-review in #154), never `reviewed`; the provider-documented part is the carrier or the derivation, and value admission, span and attribution are project policy. No product action, support status or scanner result entered any record. `.gitguardian.yaml` was not edited (see Needs human).

## Per-row disposition

| Family | Disposition | Provable now | Still unassertable | Cases |
| --- | --- | --- | --- | --- |
| `canva:authorization-code` | contextual-only, unresolved | the `code` redirect query parameter, what the exchange needs (code, code_verifier, client authentication), code_verifier confidentiality and derivation of code_challenge | the code's lifetime and single use; whether the code alone is documented as confidential; any format | none (policy-gated: a must-flag would rest on a confidentiality statement Canva does not make) |
| `meta:app-access-token` | split. Generated token: existence only. App-ID-and-secret pair: ready as a carrier | generation call, pair form, exposure statements, client-token pair is not secret, `appsecret_proof` derivation | which family owns the pair; generated token's response member, format and privilege relative to the secret | `meta-app-secret-in-app-id-pipe-access-token` (must-flag), `meta-app-secret-pipe-placeholders-derived-proof-and-non-values` (must-not-flag) |
| `x:oauth1-access-token` | role collision established; token-half sensitivity unresolved | request token and access token share `oauth_token` (provider's own table); token appears in every signed request's Authorization header; secret half documented as sensitive; exchange carrier `subject_token` | whether the access-token half alone is documented as confidential; request token lifetime and confidentiality; format | none new (the secret half already has Cases from #235; a must-flag for the token half would invent a policy the sources do not support) |
| `zoom:build-platform-api-key` | split. `x-api-key` carrier: ready. Bearer carrier: unresolved | `x-api-key` is API-key-only; Bearer carries key or JWT; JWT expiry choices; key controls; key ID is a different value; SDK key and secret are separate | one string or key and secret pair in the current flow; Build API JWT structure; whether a client-held JWT is confidential | `zoom-build-api-key-x-api-key-header-value` (must-flag), `zoom-build-api-key-placeholders-and-non-values` (must-not-flag) |
| `zoom:webhook-secret-token` | derived outputs: ready (negative only). Secret carrier: unresolved conflict | secret token is the HMAC key; `x-zm-signature`, signed message, `plainToken` and `encryptedToken` algorithm; developer-chosen header credentials are separate; Verification Token deprecation wording | whether the secret token itself is sent (Access and app-settings pages) or only a hash (webhooks page); era of the Verification Token | `zoom-webhook-signature-and-challenge-derived-values-non-values` (must-not-flag, for the secret token's span only) |

No row stays hidden: every open conflict is a contract open question or an `unresolved` claim (`carrier-wording-conflict`). Rows do not block each other.

## Per candidate

### `canva:authorization-code`

Sources: `canva-dev-7dc1064fcc` (authentication guide), `canva-dev-e6b9def37d` (token endpoint reference).

Established (contract claims, provider-documented, current):
- `code-redirect-query-parameter`: the code reaches the redirect URL as a required `code` query parameter beside an optional `state`.
- `code-exchange-inputs`: exchange needs `grant_type=authorization_code`, the `code_verifier`, the `code` and client authentication (Basic recommended, or `client_id` and `client_secret` body parameters); not callable from a browser client.
- `code-verifier-role-and-confidentiality`: the code_verifier is app-generated, 43 to 128 characters of `A-Za-z0-9-._~`, must not be accessible by the user or browser; `code_challenge` is its SHA-256, URL-safe base64, sent in the authorization URL.
- `invalid-grant-wording`, `single-use-stated-for-refresh-token-only`: the only single-use rule on the pages is for refresh tokens.

Inferred (not written as a claim): the code is useless without the code_verifier and the client secret, so a leaked code alone cannot be exchanged by a third party who lacks both; this follows from the required inputs and is not a Canva statement.

Unresolved (open questions `code-lifetime-and-single-use-unstated`, `code-confidentiality-unstated`, `code-format-and-example-unstated`): the earlier open question 1 said the code is "single-use and short-lived"; no Canva page read says so, and this run records that correction additively. What would settle it: a Canva statement of lifetime and single use, or of the code's confidentiality. Issuing a code to observe it is not permitted.

### `meta:app-access-token`

Sources: `developers-facebook-com-35c7caf5a9` (access tokens), `-ad9938bb1e` (basic settings), `-f820e9aa22` (login security), `-ceaa61b591` (secure requests).

Established: `generation-call` (server-side `client_credentials` call using app ID and app secret), `app-id-secret-pair-alternative` (the pipe-joined pair as `access_token`, presented as an alternative to a generated token), `exposure-statements`, `native-desktop-app-type`, `client-token-pair-not-secret` (the same `id|value` layout whose second part Meta calls not secret), `appsecret-proof-derivation` (sha256 HMAC of a token keyed with the secret), `token-length-variable`, `app-id-assigned`.

Inferred: the pipe-joined pair is a carrier form of the app secret rather than a token Meta issues: the page names its second part the app secret and says it avoids a generated token. Meta does not call it an access token or an app secret form, so the contract keeps the attribution open and the Case roles it `meta:app-secret` subject with `meta:app-access-token` companion only to state the span.

Unresolved: `composite-attribution-unsettled`, `generated-token-response-shape-unstated`, `generated-token-vs-secret-privilege`. What would settle it: a Meta page that names the response member of the generation call and states the pair's classification.

### `x:oauth1-access-token`

Sources: `docs-x-com-4cf664b380`, `-76c2170a87` (authorizing a request, new), `-eb6b1f60b4` (signature), `-8050cde60b` (authentication API reference, new), `-3eb3b20029` (exchange), `-223dbe29e2` (best practices), `-58d088945a`.

Established: `temporary-and-token-credentials-share-names` (X's own table), `oauth-token-parameter-role-varies` (X says the parameter is sometimes a different form of token), `request-token-flow-carriers`, `access-token-response-members`, `access-token-in-authorization-header`, `signature-derived-from-two-secrets` ("incredibly sensitive" is said of the consumer secret and the token secret), `token-exchange-carrier` (`subject_token` plus `oauth_token_secret`), `revocation-endpoint`, `best-practices-token-handling`.

Inferred: a bare `oauth_token` field cannot identify whether it is a request token or an access token without the surrounding flow; the access-token half is sent in the clear in each signed request by design, which suggests it is not treated like the secret half, but X does not say so.

Unresolved: `token-half-sensitivity-still-unsettled` (replaces open question 2), `request-token-collision-confirmed` (answers open question 3: collision confirmed, request token lifetime and confidentiality unstated), `examples-not-format` (examples for request and access tokens differ in shape; examples are not format statements and the Gitleaks lead is unchanged with no second maintainer), `token-exchange-name-mapping`. What would settle it: an X statement about the `oauth_token` value alone, and the request token's lifetime.

### `zoom:build-platform-api-key`

Sources: `developers-zoom-us-8a12072e73` (get credentials), `-f5c358d624` (make API requests, new), `-95abb9cecf` (Build platform app settings, new), `-0cb0a9f863` (Video SDK authorize, new).

Established: `usage-guidance-key-versus-jwt`, `key-controls-and-key-id`, `jwt-expiry-choices`, `api-request-carriers` (`x-api-key` is API-key-only; `Authorization: Bearer` takes a key or a JWT; `x-api-key` wins when both are sent), `legacy-settings-key-and-secret`, `sdk-key-and-secret-are-separate` (Video SDK JWT is HS256, signed with the Video SDK secret).

Inferred: the current Platform Studio key is one displayed string and the "secret" the JWT page mentions may be the legacy API Secret; the pages do not say either.

Unresolved: `key-secret-pair-or-single-string`, `build-jwt-structure-unstated`, `bearer-slot-is-shared`, `value-grammar-unstated`. What would settle it: a Zoom page that shows the secret's issuance in the current flow and the Build API JWT's construction.

### `zoom:webhook-secret-token`

Sources: `developers-zoom-us-c86052acff` (webhooks), `-931aee7e81` (Access), `-95abb9cecf` (app settings), `-a633d5ea31` (app credentials).

Established: `signature-input-and-output` (`v0=` plus hex HMAC SHA-256 of `v0:{timestamp}:{body}` keyed with the secret token), `endpoint-validation-challenge`, `secret-token-sent-wording`, `secret-token-hash-wording`, `developer-chosen-header-credentials` (Basic, OAuth and custom header values are credentials the developer sets, not this secret), `regeneration-and-verification-token`, `development-environment-credentials`.

Inferred: HMAC SHA-256 in hex is 64 hexadecimal characters; the page states the algorithm and the hex output, not the length.

Unresolved: claim `carrier-wording-conflict` (class `unresolved`), questions `secret-input-versus-derived-output`, `secret-token-carrier-unresolved`, `verification-token-era`, `value-grammar-unstated`. The webhooks page says Zoom sends a hash in `x-zm-signature` and shows `v0={HASHED_WEBHOOK_SECRET_TOKEN}` in every header example; the Access and app-settings pages say Zoom sends the secret token in each event notification and name no header. Neither is preferred. The Verification Token era is not pinned: the Access page says both "deprecated" and "will be deprecated in February of 2025", and no archive snapshot or older digest is held, so it is not recorded as a variant.

## Role matrix (facts the sources state, by role)

| Role | Canva code | Meta | X | Zoom Build key | Zoom webhook |
| --- | --- | --- | --- | --- | --- |
| Issuance owner | Canva, to the redirect URL | Meta (app ID and secret assigned; token generated on request) | X (3-legged flow, or the app owner's console) | Platform Studio, shown once | app page, regenerable |
| Credential input | code, code_verifier, client credentials | app ID and secret | consumer secret and token secret (signing key) | key (and secret, relation unresolved) | secret token (HMAC key) |
| Exposed wire form | `code` query parameter, `code` form field | `access_token` parameter (`id|secret` or generated) | `oauth_token` in header; `subject_token` in exchange | `x-api-key` header; Bearer | none documented for the token itself |
| Public half or sibling | `state`, `code_challenge` (confidentiality unstated) | client token pair documented not secret | consumer key (not stated either way) | key ID "for internal support" | none stated |
| Derived output | `code_challenge` | `appsecret_proof` | `oauth_signature` | JWT | `x-zm-signature`, `encryptedToken` |
| Shared carrier | Basic header (client credentials) | `access_token` parameter | `oauth_token` (request and access) | Bearer (key or JWT) | `Authorization` (developer-chosen) |

## What was recorded

- Sources: five new `provider-documentation` sources (`docs-x-com-76c2170a87`, `docs-x-com-8050cde60b`, `developers-zoom-us-f5c358d624`, `developers-zoom-us-95abb9cecf`, `developers-zoom-us-0cb0a9f863`); `read` or `unchanged` observations dated 2026-10-05 with content digests on sixteen existing ones.
- Contracts: five `@1` drafts extended (period `proposed`, lifecycle `draft`); 36 claims and 18 open questions appended in all, no earlier text changed.
- Cases: five, each with a review history holding the `authored` event and the `decided` event; 25 fixtures appended to `records/fixtures/meta-authored.json` and `records/fixtures/zoom-authored.json` (3 positive and 6 benign for Meta; 3 positive and 6 benign for the Zoom key; 7 benign for the webhook). Every credential-shaped value is a fixed marker `SYNTHETIC-<provider>-<role>-never-issued-000N`; the `appsecret_proof`, `x-zm-signature` and `encryptedToken` values are a patterned hexadecimal string built for these records, derived from nothing. None came from a documentation page, tool or incident and none was tested against any service.
- Family review histories: one `observed` / `inconclusive` event appended to each of the five families. Family `research.state` was left `unresearched` as in round 3: no format is established.

## Not done

- No narrative or variant records (no dated, durably pinned historical form was found; the Zoom Verification Token is not pinned).
- No Case for Canva, X or the Zoom Bearer carrier: the sources do not settle confidentiality of the code, the token half or the shared slot, and a Case would only restate a project policy.
- OAuth 1.0a request-token expiry and PIN-based flows beyond the carriers named were not researched.

## Needs human

- Retro-review of the five maintainer-only Cases (#154).
- `.gitguardian.yaml`: the new fixtures sit in the existing authored sets `meta-authored` and `zoom-authored`; the 64-character hexadecimal values in three fixtures could need an ignored-paths entry if the existing sets are not already covered.
- Decide whether a `meta:app-secret` Case for the pair should also list `meta:app-access-token` as subject once Meta states the pair's classification (core and attribution decision, not evidence).
