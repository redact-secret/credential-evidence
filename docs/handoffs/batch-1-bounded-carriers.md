# Batch 1 handoff: five bounded credential carriers

Issue: credential-evidence#232 (parent classification #231). Downstream: benchmarks#717 (baseline and candidate replay) and core #1209 to #1213. Related: [ADR 0023](../decisions/0023-expectation-corrections-proposed-by-the-product-for-1205.md).

This repository maintains the evidence; the Redact Secret project also maintains the product, so none of this is independent validation. Every record here is `draft` and project-authored. It is **not reviewed**: a reviewer other than the author has not yet recorded a review, and the maintainer-only path is not used.

## What is established and what is policy

Each family states the provider's own facts in its `format-contract` (unchanged: the five contracts are byte-identical to the revisions pinned in the issue, `6dd2ae3`, so there is nothing to reconcile). What the carrier documentation does **not** state is any prefix, alphabet or width, and none is claimed. The Cases below record the context policy (value admission, span, placeholders, attribution) as `project-policy`; carrier existence is the provider-documented part and is cited, but no fixture expectation is marked `provider-documented`.

Each family has three Cases: a positive one (`must-flag`), a benign one (`must-not-flag`) and one that freezes the unsupported variants (`not-assertable`: no point gained or lost). Fixtures are in the family's authored set (`records/fixtures/<provider>-authored.json`).

| Family | Supported layouts (positive Case) | Excluded and tested independently | Unsupported, frozen as `not-assertable` |
| --- | --- | --- | --- |
| `figma:personal-access-token` | exact `X-Figma-Token` in raw HTTP, curl `-H`, JSON header map; any value shape. No subtype inferred (plan tokens share the header). | `X-Figma-Token-Id`/suffixed names carrying ids, placeholder, env reference, template, masked, public file key and user id | value on the next line, credential-shaped value under a longer name, bare `figd_`/`figp_` prose |
| `asana:webhook-secret` | exact `X-Hook-Secret` in raw HTTP, curl `-H`, JSON header map. Generic header attribution. | `X-Hook-Signature` (HMAC output), `X-Hook-Secret-Id`, placeholder, reference, masked | credential-shaped value under a longer name, bare string |
| `airtable:webhook-mac-secret` | exact `macSecretBase64` in JSON, YAML (plain and quoted) and shell-style assignment; the whole encoded value, padding included. | `X-Airtable-Content-MAC` (HMAC output), hook and base ids, `macSecretBase64Present`, placeholder, reference, template, masked | other `*Base64` field names, longer field name, bare Base64 |
| `elastic:elasticsearch-api-key` | `Authorization: ApiKey` and `Proxy-Authorization: ApiKey` in raw HTTP, curl `-H`, JSON header map; the encoded value is covered whole. Generic authorization attribution. | scheme-only header, prose, placeholder, reference, template, masked | value on the next line, prefixed or suffixed header name, key id alone (not assumed benign), separate `id`/`api_key` fields |
| `canva:client-secret` | `client_secret` in a form body (extent stops at `&`), JSON body and shell assignment; `Authorization: Basic` envelope, covered as the whole encoded token. | client id, placeholder, reference, template, masked, Basic placeholder, `cnvca` prefix prose | bare `cnvca...` string, Basic token split by a newline |

Case ids (all under `records/cases/`): `figma-x-figma-token-*`, `asana-x-hook-secret-*` and `asana-hook-header-lookalikes-and-non-values`, `airtable-mac-*`, `elastic-apikey-*`, `canva-client-*`. Open questions of the contracts (width, alphabet, `figp_`, id confidentiality) stay open; none was resolved from a scanner.

## For the consumers

- Core and benchmarks decide, per family, whether the exact layouts are covered today; Canva is expected to be a generic-coverage control and a no-code disposition is valid if every bounded case passes. That measurement is not made here.
- A finding of any generic header, contextual or authorization type is sufficient for the positive Cases; provider attribution is not promised.
- The snapshot and export carry these Cases and fixtures once a release is cut; this change does not cut one.
