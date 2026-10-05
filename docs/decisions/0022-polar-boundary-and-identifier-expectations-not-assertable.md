# 0022. Polar token-boundary and identifier-confidentiality expectations move to not-assertable

- Status: accepted (decided by the repository owner as the sole maintainer, ADR 0020; the decision is a `maintainer-only` act, never `reviewed`)
- Date: 2026-10-05
- Issues: credential-evidence#64 and #65 (per-family evidence review), #142 (review debt)
- Deciding maintainer: Milo Kang (GitHub `milocosmopolitan`), the repository owner. The owner chose the recommended options of the decision brief posted on #64 and #65 on 2026-10-05. Recorded by an AI agent on the owner's instruction.
- Inputs: the decision brief on #64 and #65, the contracts `polar:api-credential@2` and `polar:organization-access-token` (PR #148, #149), [ADR 0019](0019-maintainer-decisions-for-epic-92-review-debt.md) items 1 and 3

## Context

After the evidence review of #64 and #65 (restorations in PR #102 and PR #149), 14 negative fixtures of `polar:api-credential` and `polar:organization-access-token` were still `project-policy` `must-not-flag`. Searching for more sources cannot settle them: only one non-project owner (`polarsource`) is cited, and the only scanner rule for Polar is a single ported rule, which counts once. Two kinds of open question remain.

- **Facts Polar has not published.** The token length and alphabet before 2025-01-02 (era 1), and whether a bare `polar_at_` token was ever issued (2024-03-29 to 2024-04-24). No decision can supply these. The fixtures that depend only on them (`access-token-without-subtype-twin`, `dot-in-body-twin`, `truncated-near-miss` of `polar:api-credential`) are unchanged here.
- **Policy questions.** What a "well-formed token with other characters glued on" is, and whether a `polar_ci_` OAuth client id or a `polar_cl_` checkout-link secret is confidential.

## Decisions

| # | Subject | Fixtures | Decision |
| --- | --- | --- | --- |
| 1 | Token boundary (option C of the brief) | `polar-api-credential-body-42-twin`, `-body-44-twin`, `-leading-glue-twin`; `polar-token-body-44-twin`, `-leading-glue-twin`, `-trailing-hyphen-twin`, `-trailing-underscore-twin` | **`not-assertable`**. The current `must-not-flag` has no evidence behind it. Keeping it as "a token must be delimited" conflicts in spirit with ADR 0019 item 3 (a key padded or split so that the secret bytes stay intact is a partial leak); flipping it to `must-flag` would settle that policy for one provider, when it is one choice for every provider. Polar documents no delimiter rule and the contract claim `field-boundary` is unresolved. |
| 2 | `polar_ci_` OAuth client id | `polar-api-credential-client-id-in-url-public-id`, `-setting-names-public-id`; `polar-token-oauth-client-id-public-id` | **`not-assertable`**. Polar's OAuth setup page calls the client id and client secret "super sensitive"; the contract claim `field-public-and-short-lived-siblings` says the sibling identifiers are public. RFC 6749 section 2.2 says a client identifier is not a secret, but that is the generic standard, not Polar's statement (ADR 0019 item 1 allows a located standard only for the standard's own text). Both citations are recorded; the conflict stands. |
| 3 | `polar_cl_` checkout-link secret | `polar-api-credential-checkout-link-secret-public-id` | **`not-assertable`**, as 2, until Polar says whether the link secret is confidential. |

Eleven fixtures change in total (six of `polar:api-credential`, five of `polar:organization-access-token`). Each stays in the corpus with its identity, input bytes and lineage unchanged; only its expectation moves from project-policy silence to unresolved, so no outcome is asserted. No T1 or T2 claim is made and no support status is implied.

## Dissent and reversing evidence

- Boundary: the strongest argument against `not-assertable` is that a corpus which asserts nothing about padded or truncated tokens leaves a real leak path unmeasured, and that ADR 0019 item 3 already protects embedded or fragmented key-shaped values. Reversing evidence: a recorded cross-provider boundary policy (an owner decision for all providers), after which these fixtures take the outcome it implies, or a Polar statement on how tokens are delimited.
- Identifier confidentiality: the argument against is that a client id is a public identifier by the generic standard and over-redacting it costs usability. Reversing evidence: a Polar statement that the client id, or the checkout-link secret, is public (then `must-not-flag`, `provider-documented`), or that it is confidential (then the contract claim is corrected).

## Consequences

- The next snapshot differs from `snapshot-2026.10.05` in 11 cases: each keeps its kind (`must-not-flag`) but moves from tier T3 and class `project-policy` to tier T0 and class `unresolved`, so a consumer scores none of them. Same case count (6,519 exported of 6,524), nothing added or removed, same representation facts, and the same review state (96 `maintainer-only`, 0 `reviewed`). The corpus digest changes (`sha256:df0dcfc2...` to `sha256:c114af16...` for the tree before this ADR is added) and so does the records bundle.
- Two baseline records are amended and declared: `records/fixtures/polar.json` and the plan `records/fixture-plans/unsettled-evidence-inputs.json`, which lists the two Polar families and the `polar` output set. Each family's review history gains an event citing this decision.
- A consumer that scored these 11 negatives (as passes or failures) must replay: a score is not comparable across the two snapshots without it. A finding on one of them stops counting as a failed control.
- #64 and #65 stay open. What remains is not a decision: the era-1 facts that only Polar can supply, and the three Polar-dependent fixtures named above. If Polar publishes nothing, the documented route is to close them as not restorable.
