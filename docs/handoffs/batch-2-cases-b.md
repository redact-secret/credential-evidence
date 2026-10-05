# Batch 2 cases (elastic, figma, hubspot): ready rows to Cases and fixtures

Issue: credential-evidence#235 (follow-up to [Batch 2 table](batch-2-bounded-carriers.md) and [Batch 1](batch-1-bounded-carriers.md)).

This repository is maintained by the Redact Secret project, which also maintains the product, so none of this is independent validation. Each Case below is `maintainer-only` (decided 2026-10-05 by the sole maintainer under [ADR 0020](../decisions/0020-solo-maintainer-period.md), queued for retro-review in #154): never `reviewed`. Each expectation is `project-policy`; the provider-documented part is only that the carrier exists. No prefix, alphabet or width is claimed for any family, and every value is synthetic, built for these records and not tested against any service. Existing Batch 1 Cases and fixtures were not edited; the new fixtures are appended to the authored sets `elastic-authored` and `figma-authored`, and `hubspot-authored` is new.

Where several ready families document the identical carrier, one Case pair covers the shared slot. Not done: the carrier-unresolved rows (for these providers `elastic:refresh-token`, `elastic:ece-api-key`, `hubspot:oauth-refresh-token`, `hubspot:app-client-secret`, `hubspot:personal-access-key`) and `not-assertable` unsupported-variant Cases.

| Family (ready) | Slot | Positive Case (`must-flag`) | Benign Case (`must-not-flag`) |
| --- | --- | --- | --- |
| `elastic:access-token`, `elastic:service-account-token` | `Authorization: Bearer` | `elastic-bearer-authorization-header-value` | `elastic-bearer-placeholders-and-non-values` |
| `elastic:cloud-api-key` | `Authorization: ApiKey` | `elastic-cloud-apikey-authorization-header-value` | `elastic-cloud-apikey-placeholders-and-non-values` |
| `figma:oauth-access-token`, `figma:scim-api-token` | `Authorization: Bearer` | `figma-bearer-authorization-header-value` | `figma-bearer-placeholders-and-public-identifiers` |
| `figma:oauth-access-token`, `figma:oauth-refresh-token` | `access_token` / `refresh_token` token response members | `figma-oauth-token-response-members` | `figma-oauth-token-response-placeholders-and-non-secret-members` |
| `figma:oauth-client-secret` | `Authorization: Basic` (whole encoded token) | `figma-oauth-client-secret-basic-envelope` | `figma-oauth-client-secret-placeholders-and-client-id` |
| `hubspot:oauth-access-token`, `hubspot:service-key` | `Authorization: Bearer` | `hubspot-bearer-authorization-header-value` | `hubspot-bearer-placeholders-and-public-identifiers` |

## Fixtures (set `<provider>-authored`, ids `<set>--<name>`)

- `elastic-bearer-authorization-header-value`: bearer-raw-http, bearer-curl-header, bearer-json-header-map
- `elastic-bearer-placeholders-and-non-values`: bearer-token-scheme-only, -prose-mention, -angle-placeholder, -curl-environment-reference, -template-reference, -masked-display, -type-and-lifetime-only
- `elastic-cloud-apikey-authorization-header-value`: cloud-apikey-raw-http, -curl-header, -json-header-map
- `elastic-cloud-apikey-placeholders-and-non-values`: cloud-apikey-scheme-only, -prose-mention, -angle-placeholder, -curl-environment-reference, -template-reference, -masked-display
- `figma-bearer-authorization-header-value`: bearer-raw-http, bearer-curl-header, bearer-json-header-map
- `figma-bearer-placeholders-and-public-identifiers`: bearer-scheme-only, -prose-mention, -angle-placeholder, -curl-environment-reference, -template-reference, -masked-display, -public-identifiers
- `figma-oauth-token-response-members`: oauth-response-pretty-json, oauth-response-compact-json, oauth-refresh-response-access-token-only
- `figma-oauth-token-response-placeholders-and-non-secret-members`: oauth-response-angle-placeholders, -template-references, -masked-display, -empty-values, -non-secret-members, oauth-token-members-prose-mention
- `figma-oauth-client-secret-basic-envelope`: client-secret-basic-raw-http, -curl-header, -json-header-map
- `figma-oauth-client-secret-placeholders-and-client-id`: client-secret-basic-angle-placeholder, -curl-environment-reference, -template-reference, -masked-display, -scheme-only, client-secret-client-id-only, client-secret-masked-field
- `hubspot-bearer-authorization-header-value`: bearer-raw-http, bearer-curl-header, bearer-json-header-map
- `hubspot-bearer-placeholders-and-public-identifiers`: bearer-scheme-only, -prose-mention, -angle-placeholder, -curl-environment-reference, -template-reference, -masked-display, -public-identifiers

## Boundaries kept

- The Elastic 22-character secret component is not taken as the full service token width; the Cloud API key reuses the generic `ApiKey` envelope in a new Case, not by editing the Batch 1 Elasticsearch API key Case. Refresh tokens are not decided by the Elastic Case (carrier unresolved).
- In the Basic envelope the secret exists only inside the encoded credential, so the extent is the whole encoded token (as in the Canva precedent); the client id is public.
- The Bearer carrier of Figma OAuth and SCIM tokens is separate from the `X-Figma-Token` header of the personal access token.
