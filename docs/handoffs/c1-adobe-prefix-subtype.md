# C1 handoff: Adobe prefix grammar and credential-subtype attribution

Issue: credential-evidence#239 (parent epic #236, inventory #231 Group C). Skill: research-family, run interactively for three families. Date: 2026-10-05. Agent: research-agent.

This repository is maintained by the Redact Secret project, so this note is project-authored and is not independent validation. It is what the pages read on 2026-10-05 state. It adds no Case, fixture, expectation, scanner support status, finding type or action; those stay downstream.

## Disposition per candidate

| Family | Contract | Carrier (documented) | p8e- prefix, 32-character body | Subtype attribution | Disposition |
| --- | --- | --- | --- | --- | --- |
| `adobe:oauth-server-to-server-client-secret` | `@2` (new, supersedes `@1`) | `client_secret` form or query parameter of the `client_credentials` token request | tool-corroborated by two maintainers (prefix, length 32); hyphen in body unresolved; applies to no named type | unresolved | carrier ready; bare grammar tool-corroborated only and not attributed to a type |
| `adobe:oauth-web-app-client-secret` | `@1` extended in place (draft) | `Authorization: Basic Base64(clientId:clientSecret)` on token, refresh and revoke requests | no grammar recorded | unresolved | carrier ready; grammar and subtype unknown |
| `adobe:enterprise-web-app-client-secret` | `@1` extended in place (draft) | `client_secret` form parameter beside `org_id` in the `client_credentials` token request | no grammar recorded | unresolved | carrier ready; grammar and subtype unknown |

No hidden open conflict remains: the one contested point (hyphen in the body) is recorded as an `unresolved` claim with both rules cited.

## Established

- S2S `s2s-client-secret-used-for-token-request`, `s2s-client-secret-lifecycle` (carried over, re-read): provider-documented | developer-adobe-com-0dbe3ed00c, -09955d5cc6, -69389b938d | sections named in the claims.
- S2S `s2s-client-secret-request-parameter`: `client_secret` in a form-encoded body or query, body recommended | -09955d5cc6 (Fetching access tokens), -69389b938d | provider-documented.
- S2S `s2s-client-secret-docs-placeholders`: only `{CLIENT_SECRET}` and a run of X characters are shown; no format stated | -09955d5cc6, -69389b938d | provider-documented.
- S2S `client-secret-p8e-prefix-consistency`: two scanner rule artifacts of different maintainers treat `p8e-` as an Adobe client secret, naming no type | github-com-gitleaks-gitleaks-0eacdd9d44 (adobe.go lines 24-31), github-com-praetorian-inc-noseyparker-39e1a1ce82 (adobe.yml lines 3-10) | tool-corroborated.
- S2S `client-secret-p8e-body-length-32`: both rules state a 32-character body | same sources, line 29 and lines 6-10 | tool-corroborated.
- Web App `web-app-client-secret-basic-authorization`: confidential-client Basic header on token, refresh and revoke requests; public clients send `client_id` | -dda8443c8d | provider-documented.
- Web App `web-app-metadata-lists-two-auth-methods`: sample metadata lists `client_secret_basic` and `client_secret_post`; only Basic is documented for Web App requests | -dda8443c8d (OpenID Configuration) | provider-documented.
- Web App `web-app-client-secret-placeholders-only` | -dda8443c8d, -c376393c79 | provider-documented.
- Enterprise `enterprise-web-app-client-secret-request-parameter`: form parameters `grant_type`, `client_id`, `client_secret`, `scope`, `org_id`; response has `access_token` and `expires_in`, no refresh token | developer-adobe-com-8b8b49e695 (new), -599b3aaf5a (new) | provider-documented.
- Enterprise `enterprise-web-app-client-secret-rotation`: UI rotation only, deleted secret not restorable, programmatic rotation unsupported | -599b3aaf5a | provider-documented.
- Enterprise `enterprise-web-app-client-secret-placeholders-only`; the consent-redirect `id_token` is a separate signed JWT, not the secret | -8b8b49e695 | provider-documented.
- Benign siblings: `adobe-developer-console-client-id` (all three families; public identifier sent as `x-api-key` and in the consent URL) and `adobe-client-secret-uuid` (S2S; the identifier the list and delete APIs use instead of the secret) | -09955d5cc6, -8b8b49e695 | provider-documented. No sample value recorded for either.

Era facts, contextual only: the OAuth Server-to-Server credential replaced Service Account (JWT) credentials (end of life 2025-06-30, per the migration page already recorded as developer-adobe-com-e0b4921a8f). Nothing read ties the `p8e-` form to an era, so no historical claim and no variant was written.

## Inferred (not recorded as claims)

- A Web App secret travels inside a Base64 encoding in the Basic header, so a Base64 form of `clientId:clientSecret` contains the secret. Recorded only as the open question `basic-header-is-derived-form`; the page states the header construction, not any detection implication.
- Because the token request shape (client_credentials with `client_id` and `client_secret`) is the same for S2S and Enterprise Web App apart from `org_id`, a shared byte grammar is possible, but no page says so; it is not claimed.
- The Gitleaks expression puts `(?i)` after the literal prefix, so only its body is case-insensitive, while Nosey Parker applies the flag globally. Both prefix letters are lowercase, so the prefix is the same string either way; the difference matters only for an upper-case `P8E-`.
- The Nosey Parker example in the rule file has a body of 32 characters including a hyphen. It is a tool example of unknown origin and was not copied or used.

## Unresolved

- Subtype attribution of `p8e-` to S2S, Web App or Enterprise Web App | `p8e-subtype-attribution` in all three contracts | an Adobe statement tying the prefix to a type, or an Adobe-published example of a named type.
- Hyphen in the body | claim `client-secret-p8e-body-alphabet-hyphen` (class unresolved) in S2S `@2` | Adobe statement of the alphabet, or an issued sample under a maintainer's authority (issuance-gated).
- Independence of the two rules | `p8e-rule-origin-independence` in S2S `@2`: neither rule states its basis; the Nosey Parker references were read and none states the prefix (the OAuthIntegration reference returned HTTP 404 on 2026-10-05) | the rule authors' stated basis or an Adobe page stating the prefix. Until then the two-maintainer tool-corroboration is the minimum the class allows, not demonstrated independence.
- Whether every issued secret, including later-added and earlier-era secrets, begins with `p8e-` | `p8e-prefix-all-secrets` | Adobe statement or issuance-gated observation.
- Web App secret count, display-once and rotation | `web-app-secret-lifecycle`; Enterprise secret count and display-once | `enterprise-secret-count-and-display` | Adobe credential-management pages.
- Merge-or-split of the three families (existing `distinct-from-web-app-secret`, `shared-shape-with-s2s-secret`) stays open; the IDs are preserved and the roles are kept separate.
- An Adobe search of the `adobe` GitHub organization for `p8e-` returned no code on 2026-10-05; this is a lead only and is not a source.

## Needs human

- Removing `structure.prefixes: ["p8e-"]` from the S2S contract in `@2` (revision `@1` is untouched): options are keep it removed (recommended, since no source attributes the prefix to a type) or restore it as a prefix of unattributed type. Blocks landing: no.
- Whether to promote any of the three contracts, set `currentContract`, or review them: not done; a maintainer's act.
- Whether two rule artifacts with no stated basis suffice for the prefix claim, given the independence question above: recommendation is to keep the class and the open question. Blocks landing: no.

## Source-backed synthetic case axes (for later authoring, not authored here)

Public client ID (hex, `x-api-key`) versus secret; secret uuid versus secret; `{CLIENT_SECRET}` and `<YOUR_CLIENT_SECRET>` placeholders and the `XXXXXXXXXXXXX` sample; form-body versus query-parameter carrier; Basic header Base64 form (a representation containing the secret; the encoded header is derived, not an Adobe-stated format); `id_token` JWT beside the secret in the Enterprise flow; `org_id` as a customer identifier. Any value must be synthetic and built without guessing a length or alphabet beyond the two tool-corroborated statements, which are not provider grammar.

## Not done

- Family narratives: not written; the claims above are the cited basis and a narrative would repeat them.
- Variants: none, because no page gives a dated change for these secrets.
- Case, scenario and fixture authoring: out of scope for this issue.
- Linking the parent epic: left to the maintainer; no issue or PR comment was made.

## Commands and results

See the pull-request description when one is opened; results of `npm run check` and `npm run fixtures:materialize:check` are in the run report that accompanies this branch.

## Safety

Fetched content treated as data: yes. Credential-shaped values: none copied or built; the Nosey Parker example was not copied. No value was tested against a live service. Scanner output used as evidence for an expectation: no; scanner rule artifacts are cited only for the limited `tool-corroborated` format claims.
