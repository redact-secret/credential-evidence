# D1 handoff: Algolia and Contentful public exposure and privilege distinctions

Issue: credential-evidence#242 (parent epic #237, inventory #231 Group D). Skill: research-family, run interactively for nine families. Date: 2026-10-05. Agent: research-agent.

This repository is maintained by the Redact Secret project, so this note is project-authored and is not independent validation. It is what the pages read on 2026-10-05 state. It adds no Case, fixture, expectation, scanner support status, finding type or action; those stay downstream. No account was created, no credential issued and no value tested. No documentation example value was copied into a record (an example's shape is described, not its value).

All nine contracts are draft revisions extended in place (`proposed`, `draft`, never reviewed); no revision was promoted and no `currentContract` was set. Existing claims, open questions and IDs are untouched; new claims and open questions are appended.

## Disposition per candidate

| Family | Documented role and privilege | Frontend/public use | Carrier | Value grammar | Disposition |
| --- | --- | --- | --- | --- | --- |
| `algolia:admin-api-key` | Established: access to everything in the account; creates other keys (Create an API key requires it) | Documented as never for any app or production | `x-algolia-api-key` beside `x-algolia-application-id` (shared with every role) | Unresolved; only the unattributed 32-hex example and the two-maintainer scanner consistency | Role, privilege and handling established; role is attributable from context only |
| `algolia:search-only-api-key` | Established: searches all indices; base for restricted keys | Documented as safe in production frontend code, and also documented as scrapable and floodable when exposed | same header | Unresolved (as above) | Published-intent and risk both established; the predefined key's ACL set is unresolved |
| `algolia:secured-api-key` | Established: virtual key derived from a main key, inherits and cannot loosen its restrictions | Documented as the key to hand to frontends and mobile, generated on the backend | same header (a value, not a stored key) | Construction established (HMAC-SHA256 with the parent key as secret over URL-encoded parameters, concatenated, base64); length and alphabet not stated | Derivation, secret input (parent key) versus derived signature established; byte layout partly unresolved |
| `algolia:write-api-key` | Established only through the ACL list (addObject, deleteObject, deleteIndex, editSettings) and the team-member list; the predefined key has no page of its own | Documented as not for frontend or mobile | same header | Unresolved | Write capability established as ACL facts; equivalence to custom write keys unresolved |
| `algolia:analytics-api-key` | Established: the Analytics API accepts any key whose ACL includes `analytics`; plan-gated | Not stated | same header, regional `analytics.*.algolia.com` hosts | Unresolved | Role established as an ACL-defined role; distinct-key-kind question stays open; data sensitivity unresolved |
| `algolia:monitoring-api-key` | Established: Infrastructure endpoints only, Premium or Elevate; metrics describe Algolia's infrastructure, not the application | Not stated | same header, `status.algolia.com` | Unresolved | Scope established; no ACL entry named for it; confidentiality expectation unresolved |
| `algolia:usage-api-key` | Established: `usage` ACL, Usage API, Premium or Enterprise add-on; usage endpoints of the Monitoring API deprecated in its favour | Not stated | same header, `usage.algolia.com` | Unresolved | Role established; deprecation undated, so no era claim |
| `contentful:delivery-api-access-token` | Established: read-only, scoped to listed environments (404 elsewhere, `master` by default), created in pairs with a Preview key | Unresolved: no page read says whether it may be public or must be confidential | `Authorization: Bearer` (recommended) or `access_token` query parameter; `accessToken` property of the key resource | Unresolved (a 43-character lead from one scanner rule remains a lead; doc examples show a short placeholder) | Scope and carriers established; public/confidential unresolved |
| `contentful:preview-api-access-token` | Established: a different token from the Delivery token, for `preview.contentful.com`, existing to avoid leaking unpublished content | Unresolved beyond "never in the preview URL" | same carriers, Preview host | Unresolved | Distinctness and purpose established; confidentiality unresolved |

No hidden open conflict remains. The two contested-looking points are recorded as open questions rather than resolved: whether a predefined Algolia "X API key" is a separate kind or an ACL profile of the general key (Analytics, Usage, Write), and whether a Delivery token is meant to be public.

## Established

- Algolia `admin-api-key-create-key-endpoint-requires-admin`, `-intended-use` (plus the existing exists and handling claims): provider-documented | `algolia-com-9e381d24e8` (Create an API key), `algolia-com-ca6bd39dbc` (#keep-your-admin-api-key-confidential).
- Algolia `search-only-api-key-restricted-derivation-and-mitigation`, `-read-acls-beyond-search`, `-referrer-restriction-is-light`, `-obfuscated-in-logs`, `-index-names-are-public`: provider-documented | `algolia-com-a40cdf08ba`, `algolia-com-ca6bd39dbc`.
- Algolia `write-api-key-write-acls`, `write-api-key-header-carrier`: provider-documented | `algolia-com-a40cdf08ba` (#access-control-list-acl), `algolia-com-9e381d24e8`.
- Algolia `analytics-api-key-accepts-any-key-with-acl`, `analytics-api-key-regional-hosts`: provider-documented | `algolia-com-5cc2e19305` (Analytics API), `algolia-com-a40cdf08ba`.
- Algolia `monitoring-api-key-infrastructure-scope`, `-plan-and-host`: provider-documented | `algolia-com-0a6c6beeda`.
- Algolia `usage-api-key-acl-and-source`, `-plan-and-host`, `-monitoring-usage-endpoints-deprecated`: provider-documented | `algolia-com-eac8a40cae`, `algolia-com-a40cdf08ba`.
- Algolia `secured-api-key-construction-documented`, `-inherits-restrictions`, `-frontend-delivery`, `-compromise-response`: provider-documented | `algolia-com-b2e285350d` (Generate secured API key), `algolia-com-a40cdf08ba`, `algolia-com-0e4572af6d`, `algolia-com-ca6bd39dbc`.
- Algolia `*-rotation-and-validity-guidance` (all seven): at least yearly rotation and one-year validity advised; keys do not expire by default | `algolia-com-ca6bd39dbc`, `algolia-com-9e381d24e8`.
- Algolia `*-docs-example-key-shape` (admin, search-only, write, secured): two reference pages show an example key as 32 lowercase hexadecimal characters; example only, role-unattributed, value not copied | `algolia-com-9e381d24e8` (#response-key), `algolia-com-b2e285350d`.
- Contentful `delivery-api-key-read-only-and-environment-scoped`, `delivery-api-token-transport`, `delivery-api-key-resource-carries-access-token`, `delivery-api-key-has-associated-preview-token`, `delivery-api-token-per-environment-guidance`: provider-documented | `contentful-com-309014367e`, `-541b321603`, `-c14fcad040`, `-cc784dbdb6`, `-3386a6dbdc`.
- Contentful `preview-token-is-distinct-from-delivery-token`, `-purpose-unpublished-content`, `-host-and-read-only`, `-environment-scoped-and-paired`, `-not-in-preview-url`: provider-documented | `contentful-com-3386a6dbdc`, `-3c91248657`, `-309014367e`, `-62927e8f26`.
- Sources re-read (observation appended with the sha256 of the bytes held): `algolia-com-a40cdf08ba`, `-ca6bd39dbc`, `-0e4572af6d`, `-0a6c6beeda`, `-eac8a40cae`, `contentful-com-c14fcad040`, and the two scanner-rule sources behind the existing shape claim (`github-com-gitleaks-gitleaks-6e0b4bcf13`, `github-com-trufflesecurity-trufflehog-1e6b0e7f97`; the rule lines still read as the existing claim cites them).
- Benign sibling `algolia-index-name` (public identifier; Algolia states index names are public) for the search-only and secured families. No sample.
- Family records: `research.state` set to `researched` with documentation-gated and issuance-gated blockers; one observed review event appended to each family history. No baseline record was edited, so no `baseline:amend` was needed.

Era and temporal scope: every claim is `current` against live-unpinned pages. Nothing historical was recorded and no variant was written (see Unresolved).

## Provable, contextual-only, era-specific, unassertable

- Provable now: each Algolia role's documented privilege and handling, the shared header carrier, the secured-key construction, the Contentful scoping, transports and Delivery/Preview distinctness.
- Contextual-only: the role of any Algolia key value (the header and the 32-hex shape are shared, so role comes from variable name, description or ACL); whether a Contentful token is Delivery or Preview (by host, variable name or key resource, not by a documented value marker).
- Era-specific: Monitoring API usage endpoints deprecated in favour of the Usage API (undated on the page). No era is asserted.
- Still unassertable: any prefix, alphabet or length for either provider; the ACL set of each predefined Algolia key; whether a Delivery or Preview token may be public; whether an Algolia application ID or a Contentful space or environment ID is a public identifier.

## Inferred (not recorded as claims)

- A secured key's decoded base64 contains the query-parameter list (the page says the HMAC is concatenated with it before encoding), so embedded filters and restrictions travel in the value. Recorded only as an open question about confidentiality.
- Because HMAC with the parent key as secret is one-way in general, disclosing a secured key need not disclose the parent key; the pages say nothing on this, so it is not claimed.
- Analytics, Usage and Write look like ACL profiles of the general key kind (the API accepts any key with the ACL, and the ACL list has `analytics`, `usage` and write entries), but the pages list them as predefined "keys", so the inference is not recorded.
- The Contentful Preview token is probably the more sensitive of the two (unpublished content) but no page ranks them.
- The two Algolia example keys and the Contentful 12-character example token are examples; the Algolia 32-hex examples are consistent with the existing scanner-derived 32-character claim, and the short Contentful example is not consistent with the 43-character scanner lead. Neither supports a format claim by itself.

## Unresolved

| Question | Recorded as | What would settle it |
| --- | --- | --- |
| Value shape of each Algolia role and era | `open-question-1..3` in each contract, plus the new role-shape questions | an Algolia statement, or an issued sample under a maintainer's authority (issuance-gated) |
| ACL set of the predefined Admin, Search-only, Write, Analytics, Monitoring and Usage keys | `admin` oq-4, `search-only` oq-5, `write` oq-5, `analytics` oq-4, `monitoring` oq-3 | Algolia page naming the ACLs of predefined keys |
| Whether Analytics, Usage and Write keys are distinct kinds or ACL profiles | existing oq-3 of each, plus `analytics` oq-4 | Algolia statement |
| Algolia application ID: public identifier or not | `search-only` oq-6 | Algolia statement; the one scanner artifact (TruffleHog detector pattern for a 10-character uppercase ID) is a lead only |
| Confidentiality of Monitoring, Usage and Analytics keys and data | `monitoring` oq-4, `usage` oq-5, `analytics` oq-5 | Algolia statement |
| Dating of the Monitoring-to-Usage migration and of the frontend-safe guidance | `usage` oq-4, `search-only` oq-7 | dated archive snapshots or an Algolia changelog entry |
| HMAC encoding and the decoded layout of a secured key; whether the parent can be recovered | `secured` oq-4..6 | Algolia statement or API specification |
| Whether a Delivery token may be public; whether a Preview token must be confidential | `delivery` oq-2, `preview` oq-2 | Contentful statement |
| Value grammar and any Delivery-versus-Preview marker | `delivery` oq-1, oq-3, oq-4; `preview` oq-3 | Contentful statement or an issued sample under a maintainer's authority |
| EU Preview host and region-specific tokens | `preview` oq-4 | an overview page recorded as a source |

The Contentful Authentication HTML page returned a bot challenge (HTTP 429) throughout the run; the same page was read through its provider-served `.md` rendering, and the other Contentful pages were read the same way. The observation says so and its digest is of that rendering.

## Needs human

- Whether any Algolia role warrants a Case. None was authored: the documented facts are role/handling statements, not a carrier a scanner-neutral expectation can rest on, and the one carrier (a key in `x-algolia-api-key`) is shared by every role, so a role-specific must-flag cannot be authored. A header-carrier Case, if wanted, would be `project-policy` under the Batch 2 precedent and a maintainer decision. Blocks landing: no.
- Promotion, `currentContract` and review of any of the nine contracts: not done; a maintainer's act.
- Whether to write narratives for the nine families (not done here, see Not done).

## Source-backed synthetic case axes (for later authoring, not authored here)

Application ID versus key (two headers, `x-algolia-application-id` and `x-algolia-api-key`); index name beside a search-only key (public per Algolia); search-only versus secured key in frontend code (the latter derived, carrying restrictions); the secured key's secret input (the parent key) versus its derived HMAC-plus-parameters value (a base64 form containing the parameter list); obfuscated key as shown in logs (format unstated, so no sample); environment-variable references and placeholders for the admin or write key (never-in-frontend roles); Contentful `Authorization: Bearer` header versus `access_token` query parameter; Delivery host versus Preview host; Contentful space ID and environment ID beside the token; the preview URL that must carry no token. Any value must be synthetic and built without guessing a length or alphabet beyond the documented parts; the 32-hex and 43-character hints are not provider grammar.

## Not done

- Narratives and narrative review histories for the nine families: the format sections would be empty and the role statements are already cited claims; left for a later pass.
- Variants: none, because no dated, durably pinned change was found.
- No Case, scenario or fixture; no `.gitguardian.yaml` entry is needed because no fixture set was added.
- Algolia list and retrieve-key reference pages were read but not recorded as sources (they add no claim used here).
- Pages read beyond the 12-page cap per family were shared across the nine families; each cited page is recorded as a source.

## Commands and results

- `npm run record:check`: pass for the changed files during editing.
- `npm run check`, `npm run fixtures:materialize:check`: see the run report; the exit codes are given there.
