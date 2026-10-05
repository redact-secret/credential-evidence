# Batch 2 cases (part c): MongoDB Atlas, Spotify, X

Issue: credential-evidence#235 (follow-up to the [Batch 2 table](batch-2-bounded-carriers.md) and [Batch 1](batch-1-bounded-carriers.md)).

This repository is maintained by the Redact Secret project, which also maintains the product, so none of this is independent validation. The positive and benign Cases below are `maintainer-only` (decided 2026-10-05 by the sole maintainer under [ADR 0020](../decisions/0020-solo-maintainer-period.md), recorded by an AI agent on the owner's instruction, queued for retro-review in #154): never `reviewed`. Expectations are `project-policy`; carrier existence is the provider-documented part and is cited. No prefix, alphabet or width is claimed for any slot, and every value is synthetic, was built for this record and was not tested against any service. Fixtures are in `records/fixtures/mongodb-atlas-authored.json`, `spotify-authored.json` and `x-authored.json`.

## Family to Cases to fixtures

| Family | Case (`records/cases/`) | Outcome | Fixtures (`<provider>-authored--...`) |
| --- | --- | --- | --- |
| `mongodb-atlas:service-account-access-token` | `mongodb-atlas-service-account-access-token-bearer-header` | must-flag | bearer-raw-http, bearer-curl-header, bearer-json-header-map |
| | `mongodb-atlas-service-account-public-values-and-masked-outputs` (shared with the secret) | must-not-flag | client-id-and-name, token-response-lifetime-members, masked-secret-truncated-example, bearer-environment-reference, basic-angle-placeholder, basic-masked-display, example-prefix-prose-mention |
| `mongodb-atlas:service-account-secret` | `mongodb-atlas-service-account-secret-basic-envelope` | must-flag | basic-raw-http, basic-curl-header, basic-json-header-map (whole encoded token) |
| | `mongodb-atlas-service-account-public-values-and-masked-outputs` | must-not-flag | as above |
| `mongodb-atlas:database-user-password` | `mongodb-atlas-database-user-password-request-field` | must-flag | password-raw-http-json-body, password-curl-data, password-json-file (letters and digits only) |
| | `mongodb-atlas-database-user-identity-and-password-placeholders` | must-not-flag | user-response-without-password, password-angle-placeholder, password-environment-reference, password-masked-display |
| `mongodb-atlas:programmatic-api-private-key` | none positive (see below) | | |
| | `mongodb-atlas-digest-header-and-public-key-non-values` | must-not-flag | digest-authorization-header, public-key-field, private-key-redacted-display, digest-client-environment-reference |
| `spotify:access-token` | `spotify-access-token-bearer-header` | must-flag | bearer-raw-http, bearer-curl-header, bearer-json-header-map |
| | `spotify-client-id-and-token-placeholders-non-values` (shared with the refresh token) | must-not-flag | client-id-authorization-query, token-response-lifetime-and-scope, bearer-documented-form-placeholder, bearer-environment-reference, refresh-token-angle-placeholder, refresh-token-template-reference, refresh-token-masked-display |
| `spotify:refresh-token` | `spotify-refresh-token-response-member` | must-flag | refresh-token-raw-http-response, refresh-token-json-file, refresh-token-compact-json |
| | `spotify-client-id-and-token-placeholders-non-values` | must-not-flag | as above |
| `x:oauth2-user-access-token` and `x:app-only-bearer-token` (shared Bearer slot) | `x-bearer-token-authorization-header-value` | must-flag | bearer-raw-http, bearer-curl-header, bearer-json-header-map |
| | `x-oauth2-ids-and-bearer-placeholders-non-values` (shared with the client secret) | must-not-flag | client-id-authorization-query, user-id-response, bearer-angle-placeholder, bearer-environment-reference, bearer-masked-display, basic-angle-placeholder, basic-template-reference, bearer-scheme-only |
| `x:oauth2-client-secret` | `x-oauth2-client-secret-basic-envelope` | must-flag | basic-raw-http, basic-curl-header, basic-json-header-map (whole encoded token) |
| | `x-oauth2-ids-and-bearer-placeholders-non-values` | must-not-flag | as above |
| `x:oauth1-access-token-secret` | `x-oauth1-access-token-secret-field` | must-flag | token-secret-form-body, token-secret-json-field, token-secret-shell-assignment |
| | `x-oauth1-token-identity-and-signature-non-values` | must-not-flag | oauth-authorization-header-identity-and-signature, token-secret-angle-placeholder, token-secret-environment-reference, token-secret-masked-display, token-secret-field-prose-mention |

## What was not authored, and why

- **`mongodb-atlas:programmatic-api-private-key`, positive**: the contract documents a client-configured Digest input and states no wire carrier, no prefix, alphabet or width of the private key. A Digest header holds a hash. No positive slot can be asserted from the claims, so none was invented (for example a `curl --user` pair is a client tool convention, not a documented carrier). Only the benign Case (Digest header, 8 character public key, redacted private key display, key references) is authored. A positive needs a source that documents where a private key is written or sent.
- **`mongodb-atlas:database-user-password`, percent encoding**: the password is user-chosen text with no format; its percent-encoded form in a connection string is unresolved, so the fixtures hold letters and digits only and no connection-string layout.
- **`x:app-only-bearer-token`, percent-containing shapes**: the byte format is unspecified and the percent-containing shapes are conflicting `tool-corroborated` leads. No fixture contains a percent character in a token value and no Case asserts those shapes either way. The Bearer positive Case is shared with the OAuth 2.0 user access token because the header does not tell them apart.
- **`mongodb-atlas:service-account-secret`**: `mdb_sa_sk_` is a truncated example, not a grammar, so the positive fixtures carry no such prefix and the benign Case holds only the truncated example and masked form. `mdb_sa_id_` plus 24 hex is the public client id and appears only as a client id or inside the encoded Basic credential.
- **Carrier-unresolved rows** of these providers (`spotify:client-secret`, `x:oauth2-refresh-token`) have no Case, as the table says.
- No unsupported-variant (`not-assertable`) Cases were authored for these rows.
