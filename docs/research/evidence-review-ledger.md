# Evidence-review ledger

Where each open "Evidence review" issue (ADR 0012, decision 1, option A) stands after its evidence-review pull
request merged. This page records evidence classes of fixture claims. It is not a support-status decision and says
nothing about any scanner or product.

Observed 2026-10-03 on `main` at the commit that adds this page. Authored; the counts are derived from the records
(see [How the counts were derived](#how-the-counts-were-derived)), the reasons are read from the merged pull request notes.

## Ledger

Classes: T1 `provider-documented`, T2 `tool-corroborated`, T3 `project-policy`. Every issue's fixtures were T3 in the
canonical records at `snapshot-2026.10.01.2`. "Kept T3" is what is still `project-policy` today.

| Issue | Family | Fixtures | T1 | T2 | Kept T3 | Why the rest stays T3 | State | What would settle it |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| [#46](https://github.com/redact-secret/credential-evidence/issues/46) (PR #117) | `browserbase:api-key` | 13 | 0 | 6 | 7 | The pinned patterns disagree on the body floor (19-char and 8-char bodies), on a trailing `-` or `_`, and on `bb_live_session_`; no source for a project id or a `bb_<epoch>` cookie; the docs give no key format. Searched and recorded. | closed | A Browserbase statement of key length, alphabet and boundary, or of which ids are public; or a third pinned artifact that agrees with each expectation. |
| [#47](https://github.com/redact-secret/credential-evidence/issues/47) (PR #91) | `crates-io:api-token` | 13 | 8 | 0 | 5 | Boundary, public-identifier and encoded-value fixtures: no provider statement and no two independent artifacts found. | closed | crates.io statement on token boundaries or on which values are public; or two maintainers' pinned artifacts. |
| [#48](https://github.com/redact-secret/credential-evidence/issues/48) (PR #91) | `crates-io:trusted-publishing-token` | 11 | 7 | 0 | 4 | Boundary and public-identifier fixtures: same as #47. | closed | Same as #47. |
| [#49](https://github.com/redact-secret/credential-evidence/issues/49) (PR #120) | `discord:bot-token` | 32 | 1 | 24 | 7 | Five fixtures where pinned rules disagree on segment width (a 37-character third segment, a 25-character first segment); two snowflake-id fixtures, since Discord does not state they are non-secret. | closed | Discord documentation of the segment widths and of the non-secrecy of application and user ids. |
| [#51](https://github.com/redact-secret/credential-evidence/issues/51) (PR #104, second pass: this change) | `generic:bearer-token` | 12 | 7 | 0 | 5 | The `client_id` fixture was restored on RFC 6749 s2.2 once the maintainer decided (2026-10-04, ADR 0019, `standard-or-rfc` may back `provider-documented` for a generic family, standard text only; awaiting second review); the token_type-only object was restored on RFC 6750 s2.1 and s4; four header-value fixtures (ETag, Content-MD5, request id, trace id) have field-role statements but none says the value is not a credential; one (a 10-character value that is a valid b64token) needs a minimum token length no source gives as a fact about all tokens. | open | A statement that those header values are not credentials; a source for a minimum bearer length. |
| [#52](https://github.com/redact-secret/credential-evidence/issues/52) (PR #104) | `generic:connection-string-password` | 6 | 5 | 0 | 1 | `%s` placeholder: RFC 3986 excludes it as a percent-encoding but nothing read says a format placeholder is not a credential. | closed | A language or library page stating the placeholder is substituted at runtime, plus a reviewer who accepts it as non-credential evidence. |
| [#55](https://github.com/redact-secret/credential-evidence/issues/55) (PR #90) | `github:app-server-to-server-token` | 1 | 0 | 0 | 1 | Only the shared `cross-provider--prefix-only` (eight families, four providers). | open | A combined review of that fixture, see below. |
| [#56](https://github.com/redact-secret/credential-evidence/issues/56) (PR #90) | `github:app-user-to-server-token` | 1 | 0 | 0 | 1 | Same shared fixture. | open | Same. |
| [#57](https://github.com/redact-secret/credential-evidence/issues/57) (PR #90) | `github:classic-personal-access-token` | 2 | 0 | 1 | 1 | `short-github` restored; the shared fixture stays. | open | Same. |
| [#58](https://github.com/redact-secret/credential-evidence/issues/58) (PR #90) | `github:oauth-access-token` | 1 | 0 | 0 | 1 | Same shared fixture. | open | Same. |
| [#59](https://github.com/redact-secret/credential-evidence/issues/59) (PR #90) | `github:oauth-refresh-token` | 1 | 0 | 0 | 1 | Same shared fixture. | open | Same. |
| [#60](https://github.com/redact-secret/credential-evidence/issues/60) (PR #105) | `gitlab:legacy-personal-access-token` | 2 | 0 | 1 | 1 | `short-gitlab` restored; the shared fixture stays. | open | Same. |
| [#64](https://github.com/redact-secret/credential-evidence/issues/64) (PR #102) | `polar:api-credential` | 11 | 2 | 0 | 9 | Pre-2025-01-02 ("era 1") token length and alphabet are not stated by Polar (five fixtures); one early `polar_at_` shape may never have been issued; two fixtures depend on an undecided token-boundary policy; `polar_ci_` and `polar_cl_` confidentiality is unsettled and Polar's setup page says client ids are "super sensitive". | open | A maintainer decision on boundary policy; a Polar statement on era-1 length, `polar_ci_`/`polar_cl_` confidentiality and the early `polar_at_` prefix; the two proposed contract corrections. |
| [#65](https://github.com/redact-secret/credential-evidence/issues/65) (PR #102) | `polar:organization-access-token` | 13 | 8 | 0 | 5 | Four fixtures depend on the undecided token-boundary policy; one on the `polar_ci_` conflict. | open | Same decision and statement as #64. |
| [#68](https://github.com/redact-secret/credential-evidence/issues/68) (PR #106) | `slack:bot-token` | 2 | 0 | 1 | 1 | `short-slack` restored; the shared fixture stays. | open | Same as #55. |

Rows total 121 listed fixtures: 37 T1, 33 T2, 51 kept T3. `cross-provider--prefix-only` is listed by seven issues
(#55-#60, #68), so the 115 distinct fixtures are 37 T1, 33 T2 and 45 kept T3.

### The shared fixture

`cross-provider--prefix-only` (`records/fixtures/cross-provider.json`, text `ghp_ gho_ ghu_ ghs_ ghr_ glpat- npm_ SG. xoxb-`)
is one `project-policy` claim across eight families. Each component needed its own artifacts, and the family
reviews that were then pending have since merged: GitHub (#90), npm (#84), SendGrid (#83), GitLab (#105) and Slack
(#106). A follow-up review that reads those records and edits only that one fixture's evidence entry would decide
it. It is not done here, because the entry lives in a shared set; splitting the fixture per prefix would change
fixture identity and needs an ADR 0007 decision.

## How the counts were derived

For each issue, the fixture ids come from the `Fixtures` table in the issue body. Each id is looked up in
`records/fixtures/*.json`: the fixture's `evidence` key selects an entry in the set's `evidence` object, and that
entry's `basis` is the class. A fixture is shared when it names more than one family (`cell.families` or
`families`). The released numbers use the same lookup on `git archive snapshot-2026.10.01.2`.

```js
// per set: basis of every fixture
for (const fx of set.fixtures) basis.set(fx.id, set.evidence[fx.evidence].basis);
```

## Change against `snapshot-2026.10.01.2`

Compared by the same lookup over all 5,950 fixtures, released tree against current `main`:

| Measure | Result |
| --- | --- |
| Fixtures added or removed | 0 / 0 |
| Fixtures whose evidence basis changed | 229 (99 `project-policy` to `provider-documented`, 130 to `tool-corroborated`) |
| Fixtures demoted | 0 |
| Evidence entries | 1,238 released, 1,273 now: 59 re-based in place, 44 new keys, 9 keys gone (split by reason, ADR 0014) |
| Entries by basis, released then now | `project-policy` 346 then 284; `tool-corroborated` 779 then 820; `provider-documented` 102 then 158; `unresolved` 11 then 11 |

These 229 cover more than the 15 issues above: other families' reviews landed since the release (Anthropic, Atlassian,
Azure DevOps, npm, SendGrid, Twilio, Pinecone and others).

The credential-eval corpus snapshot digest (`credential-eval/corpus-snapshot.json`, built from the whole records
tree) changed:

| Build | `corpus_digest` |
| --- | --- |
| `snapshot-2026.10.01.2` (released; rebuilt from the tag and reproduced) | `sha256:1bc5a07b49dab7b8182f51bf11a65a9bb8a220adbd5216b364bc15b2d8e6a5af` |
| `npm run export:legacy` (import baseline; unchanged, as documented in [releases](../releases.md)) | `sha256:66dcb94babd08c661d57c81505c32249cd098c3867914140261511606093b78c` |
| current `main` working tree (what the release bundle would ship) | `sha256:ac0cdd88daf4cc3d2451d422379f4dd3c3bee19299bd90d64c0996f58b80ce3e` |

Comparing the two snapshots case by case: the case ids are identical (5,950); 233 cases differ, all in `grouping`: 229
`tier` and `evidence_class` (the 229 above), 82 `kind` (`policy` to `must-redact`, a consequence of the class change on
positives) and 6 `family` (ADR 0013, already counted in the `66dcb94b…` baseline digest). Nothing was released or repinned.
Cutting a new tag and a consumer repin is a maintainer decision.
