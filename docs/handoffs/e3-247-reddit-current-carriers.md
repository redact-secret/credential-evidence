# E3 handoff: current Reddit OAuth carriers

Issue: credential-evidence#247 (parent epic #238, inventory #231 Group E). Date read: 2026-10-05. Agent: `research-agent` (automation, project-maintainer).

This repository is maintained by the Redact Secret project, which also maintains the product, so this handoff and the records it describes are project-authored and are not independent validation. Nothing here is reviewed, promoted to a `current` contract or given a scanner support status, finding type or action; those stay downstream. No credential was acquired, issued, tested or derived. The only credential-adjacent value written is Reddit's own documented literal `DO_NOT_TRACK_THIS_DEVICE`, which is a fixed public string and not an issued credential. No Case, Scenario or fixture was written, so `.gitguardian.yaml` needs no ignored-paths entry.

## Headline finding

Reddit's current Help page "Reddit Data API Wiki" (updated May 11, 2026) says Reddit requires OAuth and links the **archived** `reddit-archive/reddit` wiki pages (OAuth2, OAuth2 App Types) as its technical guidance, while warning that some legacy API documentation may be out of date. So the archived wiki is not merely historical: it is the page Reddit currently points to. That pointer is recorded as a current claim. It does not turn each archived statement (app types, one-hour lifetime, Basic and bearer carriers, permanent refresh tokens) into a current-verified fact, and the historical claims stay `historical`. No current Reddit page restates them.

## What changed

Three draft contracts were extended in place (claims and open questions appended, earlier entries and their ids untouched, `period: proposed`, `lifecycle: draft`). Three family narratives with review histories, two benign siblings with review histories, the three family research fields and review events, and a provider note were added or updated. Five sources were created and two existing sources received an appended `read` observation (with the sha256 of the bytes held). No variant was written because no page dates a change. The family, contract and source records for Reddit were authored on 2026-10-04 and are not in the import baseline, so no `baseline:amend` declaration was needed beyond the ones `source:observe` declares for itself.

New sources:

| Source id | Page | Pin | Note |
| --- | --- | --- | --- |
| `web-archive-org-c53a558744` | Reddit Help, Reddit Data API Wiki (updated May 11, 2026) | archive snapshot 2026-09-14 | the live URL answered a bot challenge (HTTP 403) to a raw request; read through the snapshot |
| `web-archive-org-437b75323d` | Reddit Help, Responsible Builder Policy (updated June 05, 2026) | archive snapshot 2026-08-28 | live URL bot-challenged (HTTP 403); read through the snapshot |
| `reddit-com-51679eb6b9` | reddit.com/dev/api (live API reference) | live-unpinned (current facts only) | read raw |
| `redditinc-com-f6de383a98` | Developer Terms (effective 2024-09-24) | live-unpinned | read raw |
| `redditinc-com-bfe04809ef` | Data API Terms | live-unpinned | read raw |

Re-read: `github-com-reddit-archive-reddit-e2ca394517` (OAuth2) and `github-com-reddit-archive-reddit-b8d4025e45` (OAuth2 App Types), both read raw. The digests held today differ from the earlier content-digest pins because the GitHub page chrome changes, so the observations are `read` with the digest of the bytes held, not `unchanged`.

## Dispositions (one row per candidate)

| Candidate | Disposition | What a consumer may use | What stays unassertable |
| --- | --- | --- | --- |
| `reddit:app-client-secret` | **role and carrier established from a historical page that Reddit's current Help page points to; current app types, registration and format unresolved; one intra-provider conflict (installed apps) recorded as unresolved** | The secret is the HTTP Basic password beside the client id as the user, for the code, refresh, client_credentials and revoke requests; it must never be shared; web and script apps hold one. Current: OAuth with a registered client is required, rate limits are counted per OAuth client id, and Reddit's terms forbid sharing "Access Info" (tokens, keys, passwords, login credentials). | Any prefix, alphabet or length; whether registration still shows a secret; whether installed apps hold a non-confidential secret; rotation, regeneration, expiry, revocation of the secret. |
| `reddit:oauth-access-token` | **role and carrier established (historical, Reddit-pointed); current lifetime and token text unresolved; one internal inconsistency in the archived page recorded as unresolved** | JSON `access_token` member (code flow), URL fragment (implicit flow), `Authorization: bearer TOKEN` to oauth.reddit.com; app-only grants return one with no refresh token; revocable at `revoke_token` (success even for a never-valid token) and by Reddit as enforcement. Current: the live API reference labels endpoints with OAuth scopes and says modhashes are not needed under OAuth. | One-hour lifetime as a current fact; unit of `expires_in`; any prefix, alphabet or length; whether a bare value is attributable without its header or host. |
| `reddit:oauth-refresh-token` | **role and carrier established (historical, Reddit-pointed); current issuance, lifetime and rotation unresolved** | Issued only for `duration=permanent` in the code flow; sent in a POST body field with the same Basic client authentication; revocation of a refresh token revokes related access tokens; not issued by the implicit flow or app-only grants. | Whether permanent refresh tokens are still issued; lifetime; rotation on use; any prefix, alphabet or length; telling it from an access token by text. |

## Research notes

Skill: research-family   Subject: reddit:app-client-secret, reddit:oauth-access-token, reddit:oauth-refresh-token   Mode: headless-equivalent defaults   Date: 2026-10-05   Agent: research-agent

### Established

All three contracts carry these three current claims (`current-help-page-points-to-archived-oauth-wiki`, `current-help-page-requires-registered-oauth-token`, `current-terms-define-access-info-and-forbid-sharing`) and `current-api-access-requires-approval-and-tokens-revocable`:
- Help page: OAuth is required, links the archived wiki, warns legacy documentation may be out of date, states no app type, grant, lifetime or format | `web-archive-org-c53a558744` | Resources; opening notice | provider-documented (current)
- Help page: clients must authenticate with a registered OAuth token, unauthenticated traffic is blocked, rate limit per OAuth client id | `web-archive-org-c53a558744` | Rules; Rate Limits | provider-documented (current)
- Terms: Access Info is tokens, keys, passwords, login credentials; no sharing; use the OAuth token Reddit provided; no client secret named | `redditinc-com-f6de383a98` 1.4, 7.4; `redditinc-com-bfe04809ef` 2.8 | provider-documented (current)
- Responsible Builder Policy: access requires explicit approval; developers should use Devvit; enforcement includes revoking access tokens | `web-archive-org-437b75323d` | Introduction; Developers; Enforcement | provider-documented (current)

`reddit:app-client-secret@1` additions:
- `archived-docs-secret-confidentiality-and-grants`: secret never shared; web and script confidential, installed non-confidential with an empty Basic password; implicit grant disallowed for apps with secrets; client_credentials versus installed_client; same Basic authentication for refresh and revoke | `github-com-reddit-archive-reddit-e2ca394517` | provider-documented (historical)
- `installed-app-secret-presence-differs-between-pages`: the OAuth2 page says installed apps receive no secret; the App Types page says installers could figure out the secret and to send it as normal | both archived sources | **unresolved** (historical)

`reddit:oauth-access-token@1` additions:
- `archived-docs-token-response-members-and-fragment`: JSON members, and the implicit flow's URL fragment members | provider-documented (historical)
- `archived-docs-app-only-and-revocation-carriers`: app-only grants return no refresh token; `revoke_token` takes `token` in the POST body and returns 204 even for a never-valid token | provider-documented (historical)
- `current-api-reference-labels-oauth-scopes`: endpoints carry OAuth scope labels; `/api/v1/scopes`; modhashes not required under OAuth | `reddit-com-51679eb6b9` | provider-documented (current)
- `expires-in-meaning-differs-within-archived-page`: "Unix Epoch Seconds" versus "Seconds until the token expires" | **unresolved** (historical)

`reddit:oauth-refresh-token@1` additions:
- `archived-docs-refresh-request-carrier-and-response`: POST body, not URL; same Basic authentication; the sample response lists no refresh_token member | provider-documented (historical)
- `archived-docs-refresh-token-only-in-permanent-code-flow`: only with `duration=permanent` in the code flow; implicit grant allows no permanent tokens; refresh tokens are accepted by `revoke_token` | provider-documented (historical)

Narratives (`records/narratives/reddit/*`) restate each cited claim as one product-neutral sentence and carry the unresolved statements below with numbered review events.

### Inferred

- The archived pages remain Reddit's operative OAuth guidance as of May 2026, because the current Help page links them. Not recorded as a claim that they are current: the same page warns legacy documentation may be out of date.
- A refresh token may not rotate on use, because the archived sample refresh response lists no new refresh token. The page does not say so; recorded only as an open question.
- A web-hosted client id is not secret, because it travels in the authorization URL sent to the user's browser and Reddit counts rate limits per client id. Reddit does not say so; the sibling is class `unresolved`.
- Absence of a current statement of the one-hour lifetime, the app types or permanent refresh tokens proves neither retirement nor continued use.

### Unresolved

- Format (prefix, alphabet, length) of all three | contracts `secret-format-not-researched`, `opaque-token-attribution`; narratives `shape/text-format`; family blockers `issuance-gated`, `documentation-gated` | a Reddit statement, or an issued credential examined under a maintainer's authority.
- Current app types, grants, and which archived statements still hold | contracts `current-app-types-and-grants` (earlier), `archived-wiki-currentness-unconfirmed`; narratives `openQuestions/*` | a current Reddit page restating them, or a dated changelog of OAuth changes (none found).
- Registration page content and the effect of the approval policy on registration | contracts `registration-page-not-readable`; narrative `issuance/current-registration-flow` | `https://www.reddit.com/prefs/apps` returned a bare placeholder to an unauthenticated raw request; a Reddit statement, or a maintainer-authorized signed-in read.
- Installed-app secret presence | claim `installed-app-secret-presence-differs-between-pages`, contract `installed-app-secret-presence`, narrative `issuance/installed-app-secret-presence` | a dated Reddit statement or a current registration page. Both quotes are kept; neither page is chosen.
- Secret rotation, regeneration, expiry, revocation | contract `secret-rotation-and-revocation-unstated`; narrative `lifecycle/rotation-expiry-and-revocation` | a Reddit statement.
- `expires_in` unit and current lifetime | claim `expires-in-meaning-differs-within-archived-page`, contract `expires-in-unit-and-current-lifetime`, narrative `lifecycle/expires-in-unit-and-current-lifetime` | a current statement or changelog.
- Refresh token lifetime, rotation, and whether permanent tokens are still issued | contract `refresh-lifetime-and-rotation-unstated`, `current-refresh-semantics`; narrative `lifecycle/lifetime-and-rotation`, `openQuestions/current-refresh-semantics` | a Reddit statement.
- Access versus refresh token distinguishability by text | narrative `collisions/bare-token-attribution` (both token families) | a Reddit statement of a marker.
- Per-era timeline (introduced, changed format, deprecated, no new issuance, no longer authenticates): every date is unknown. The archived pages are undated, the current pages date only themselves (Help page 2026-05-11, policy 2026-06-05, terms 2024-09-24 and 2026-07-20), and no changelog was found. No variant was written.

### Needs human

- Promotion of any contract to `current`, `currentContract` on the families, and any `reviewed` event | leave draft / independent review | leave draft; no run may decide | blocks landing? no.
- Whether an installed-app client secret exists is a question only Reddit can settle; whether to ask Reddit (for example through r/redditdev, which the Help page names for updates) is a maintainer decision | blocks landing? no.
- Whether a maintainer wants a signed-in read of the registration page, which would need an account and acceptance of terms this run did not use | options: do it under the maintainer's authority / leave unresolved | leave unresolved | blocks landing? no.

### Not done

- No Case, Scenario or fixture: no ADR 0007 criterion is met by an expectation that does not depend on an undocumented format, and the carriers are contract claims, a sibling and narrative statements. The axes below are for a later `author-case` run.
- No scanner or community corroboration sought: the issue's questions are about carriers and lifecycle, which scanner artifacts cannot establish, and a format cannot be claimed without two independent maintainers' artifacts at pinned commits. Not run, so no format claim exists.
- No variants (no page dates a change).
- Did not read `OAuth2-Quick-Start-Example` or other example pages; examples would add no carrier beyond the OAuth2 page. Developer Platform (Devvit) pages were not researched: it is a separate platform with its own secrets and not a candidate in this group.

### Commands and results

- `npm run source:observe` x2 and `npm run record:new` (sources, siblings, narratives, reviews, family review appends): pass.
- `npm run record:check`: pass (26 records).
- `npm run check`: pass (exit 0; 350 tests). `npm run fixtures:materialize:check`: pass (exit 0; 6999 fixtures verified).
- Historical pinned checks: not run (no importer, projection, parity, schema or generator change).

### Safety

- Fetched content treated as data: yes. Credential-shaped values: none written; the one sample is Reddit's documented literal `DO_NOT_TRACK_THIS_DEVICE`. No example token value from any page was copied. No value was tested against a live service. Scanner output used as evidence: no.

## Provable, contextual-only, era-specific, unassertable

| Family | Provable (provider-documented) | Contextual-only | Era-specific | Still unassertable |
| --- | --- | --- | --- | --- |
| Client secret | Current: OAuth with a registered client required; per-client-id rate limit; terms forbid sharing Access Info. Archived (Reddit-pointed): Basic password paired with the client id; never share; web and script apps confidential | none | archived wiki, undated, current Help page 2026-05-11 points to it | format; current registration; installed-app secret; rotation |
| Access token | Archived (Reddit-pointed): JSON member, fragment, bearer header to oauth.reddit.com, app-only grants, revocation. Current: scope labels in the live API reference, provider can revoke tokens | none | one-hour lifetime is archived only | text shape; `expires_in` unit; current lifetime |
| Refresh token | Archived (Reddit-pointed): permanent code flow only, POST body carrier, revocation cascade | none | permanent-duration issuance is archived only | text shape; lifetime; rotation; current issuance |

## Source-backed synthetic case axes (candidates, no Case written)

Each axis names the source that supports it. None can be exemplified with a credential-shaped value, because no format is documented; a later `author-case` run may describe them only.

- Public identifier beside the secret: the client id (sibling `reddit-oauth-client-id`, class `unresolved`; `web-archive-org-c53a558744`, wiki OAuth2 "Getting Started"). Its non-secret status is not documented.
- Secret input versus derived encoding: the HTTP Basic `Authorization` header is a base64 encoding of `client_id:client_secret` (the page states the user and password halves; the base64 step is standard HTTP Basic and is inferred here, not stated by Reddit). A representation boundary: the secret appears inside an encoded header, not as bare text.
- Empty-secret representation: an installed app's Basic password is an empty string (OAuth2 page), so `client_id:` with nothing after it is a documented non-credential shape, subject to the unresolved installed-app conflict.
- Placeholder or reference: `DO_NOT_TRACK_THIS_DEVICE` as the documented anonymous `device_id` (sibling `reddit-installed-client-device-id-placeholder`); the documentation's `CLIENT_ID`, `CODE`, `TOKEN`, `URI` template words are placeholders and carry no value.
- Transient companions that are not candidates here: the one-time authorization `code`, the `state` string, and the `device_id`. They are request parameters beside the candidates, not covered by these three contracts.
- Carrier boundaries: bearer header, JSON `access_token` member, URL fragment (implicit flow), form POST body fields `refresh_token` and `token` (revocation). Each is a different representation of the same token roles.
- Revocation endpoint: success (204) is returned even for a never-valid token, so a successful revocation response says nothing about the token's validity.
