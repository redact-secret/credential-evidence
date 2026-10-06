# Atlas programmatic API private key: plaintext slots

Issue: credential-evidence#256 (Batch 2 G6; benchmarks #745, core #1226). This repository is maintained by the Redact Secret project, which also maintains the product; this note is project-authored research and is not independent validation. It asserts no support status, finding type or action.

Family `mongodb-atlas:programmatic-api-private-key`, contract `@1` (draft). Sources read on 2026-10-06 are the ones the claims cite.

## Established (provider-documented, claim ids in the contract)

| Slot | Exact spelling | Claim | Source and location |
| --- | --- | --- | --- |
| Creation response member | `privateKey` (read-only string) of `ApiKeyUserDetails`, the 200 answer of `createOrgApiKey` (`POST /api/atlas/v2/orgs/{orgId}/apiKeys`) and `createGroupApiKey` (`POST /api/atlas/v2/groups/{groupId}/apiKeys`). Unredacted when first created, redacted afterwards | `creation-response-member`, `private-key-unredacted-once` | mongodb/openapi `openapi/v2.yaml` at `5e6f651` lines 3414-3418, 48900-48909, 71053-71061 |
| CLI profile property | `private_api_key` (next to `public_api_key`), set with `atlas config set` | `cli-profile-property` | `atlas config set` reference, observed 2026-10-06 |
| Request | none: the create request bodies (`CreateAtlasOrganizationApiKey`, `CreateAtlasProjectApiKey`) hold `desc` and `roles` only | `creation-response-member` | same file |
| Wire | HTTP Digest: the credential is hashed with a nonce; a Digest header is not the plaintext key | `digest-not-bearer` | mongodb/docs `api-authentication.txt` at `2fdb253` |

## Separate from the secret input (controls)

The public key (`publicKey`, exactly 8 characters), Digest response and nonce values, the redacted `privateKey` of later responses, PEM private keys (another credential), `mdb_sa_id_` service account client ids, masked displays. The OpenAPI example value of `privateKey` is a documentation example, not a statement of grammar, and is not reproduced here.

## Not established

- Environment variable, command-line flag, Terraform provider argument and the curl `--user` layout of a Digest request: not found in the sources read (the API authentication pages describe Digest without a request example; the Atlas CLI connect page names `MONGODB_ATLAS_CLIENT_ID` and `MONGODB_ATLAS_CLIENT_SECRET` for service accounts only; the Terraform provider index at `v2.19.0` documents `client_id` and `client_secret` only). Open question `plaintext-slots-not-established` names the next sources: the legacy Atlas CLI and MongoDB CLI configuration-file, environment-variable and flag documentation.
- Byte grammar, prefix, length, alphabet of the private key: no source states one; none is inferred from the role name.

## Disposition

`ready`, with the two named plaintext slots above. The earlier handoff wording "no wire carrier" was true for the request wire and incomplete for the plaintext slots. No Case was authored: a must-flag or must-not-flag expectation for these slots is a project-policy decision (compare the maintainer-only decisions of Batch 1 and 2) that has not been taken.
