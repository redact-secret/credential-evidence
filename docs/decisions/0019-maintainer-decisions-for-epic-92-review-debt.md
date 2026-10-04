# 0019. Maintainer decisions on the epic #92 review debt

- Status: decided, awaiting second review (an item is final only when its row below names a second reviewer)
- Date: 2026-10-04
- Issue: redact-secret/credential-evidence#142
- Deciding maintainer: Milo Kang (GitHub `milocosmopolitan`), the repository owner
- Amends: `docs/governance/evidence-classes.md` (a located standard may back `provider-documented` for a family with no issuer, item 1)
- Inputs: the maintainer decision brief of 2026-10-04 (options and recommendations per item), ADRs 0013 to 0018, `docs/research/remaining-work-decisions.md`, `docs/research/evidence-review-ledger.md`

## Context

Epic #92 left 167 `not-assertable` fixtures (120 of them added by the epic) and records that are all `lifecycle: draft`. #142 tracks the decisions that move expectations out of `not-assertable`. The deciding maintainer read the brief and approved every recommendation in it, item by item. Where the recommendation was to keep a case unresolved, the decision is to keep it unresolved and record why.

## What governance allows, and what it blocks

[Project-policy](../governance/evidence-classes.md#project-policy) requires the record to name the deciding maintainer **and at least one reviewer who is not the author**, with dissent and reversing evidence. [Review independence](../governance/attribution.md#review-independence) requires a non-author reviewer for any change to a claim's class or a case's expectation. No agent sets `reviewed`.

This ADR names a deciding maintainer for every item. It names **no second reviewer**, because none has been identified (the brief lists this as not verified). Therefore:

- A decision that turns a `not-assertable` expectation into a project-policy `must-flag` or `must-not-flag` is recorded here and **not applied**. Those fixtures stay `not-assertable/unresolved`, with the exact follow-up edit written below. This is the one place the brief and governance differ: the brief recommends adopting the outcome, governance does not let the outcome be asserted until a second reviewer is named. Governance wins.
- A change that rests on a source statement (not on a choice) is applied, and still needs the non-author review its class change requires (item 1, item 8).
- Dissent: none was raised by the deciding maintainer. Nobody else has been asked yet, so "none recorded" is not "none exists". A second reviewer or external reviewer may add dissent, which reopens the item.

The decisions are labeled project policy wherever they appear. They are never provider rules, and they do not change any product support status.

## Decisions

Status column: **applied** = records changed in this PR; **blocked** = decision recorded, expectation unchanged until a second reviewer is named; **kept** = the decision is to leave it unresolved.

| # | Item | Decision (deciding maintainer: Milo Kang) | Status | Reversing evidence |
| --- | --- | --- | --- | --- |
| 1 | #144 `standard-or-rfc` | Option A: for the `generic` provider group a located, quoted standard text may back `provider-documented`, for the standard's own text only; never for what a provider issues; never a role description read as non-secrecy; never a treatment instruction. | **applied** (rule text, `review:check`, one fixture restored) | A reviewer shows the restored claim is not what the standard says, or a standard revision changes it. |
| 2 | #94 encoded credentials | Option A. If the decoded base is a credential, the encoded text as a whole is the range to cover and is `must-flag`, in all layers (32 single, 15 nested, inside corpus depth 3 and 1 KB). Policy, not a provider fact. The benign twins stay `must-not-flag` under the same policy. Decode depth, expansion and size limits stay with the product. | **blocked** | A reliable false-positive report on decoded text, or a standard that says encoding gives confidentiality. |
| 3 | #95 fragments | Option C. The three language-reconstruction cases stay as asserted (a fact question). The other five cases (8 fixtures) follow one policy: a key-shaped value split by a separator is a partial leak and is protected, secret bytes are the fragments. The release notes say the engine scores the enclosing range, so separator bytes count as secret until it scores fragments. | **blocked** | A source stating that a separator-split value is not a key, or an engine that scores fragments and shows the policy is unworkable. |
| 4 | #96 Unicode | NBSP inside the key follows #95 (one value with an inserted gap). Combining acute after the last character and fullwidth forms stay unresolved (UAX #15 gives normalization facts, not confidentiality; the engine cannot re-derive `normalize`). The 8 input rejections are input validity, outside TP/FN, as the case already says. | NBSP **blocked**; two **kept**; rejections **confirmed**, no change | A source on key boundaries under normalization; a scoped decision on `normalize`. |
| 5 | #98 EXAMPLE and SAMPLE | Narrow closed-vocabulary rule: a bare `EXAMPLE` or `SAMPLE` word is not exempted unless it is added to the placeholder vocabulary by a recorded decision; until then the 16 whole-word fixtures stay unresolved. A provider-shaped value whose body is `EXAMPLE` has no provider statement, so it is treated as `must-flag` (8 fixtures), consistent with `aws-example-keys-one-character-off`. Downstream comparisons record whether generic-assignment detection and any personal-data detection were on. | whole-word **kept**; marker body **blocked** | A provider statement that it issues body-`EXAMPLE` values; a recorded vocabulary addition. |
| 6 | #112 lifecycle | Must-flag: offline text cannot establish revocation or expiry, and providers document grace periods and lifetimes. This is policy, not a validity claim. 3 fixtures (the Slack case has none). | **blocked** | A provider statement that a rotated-out or expired value is safe to publish. |
| 7 | #114 HTTP carriers | Per case: the RFC 7617 published example (exact literal) `must-not-flag`, other values flagged; user-id vs password: the password is the secret span, the user-id is `companion`; empty password `must-not-flag` (weak evidence, RFC 7617 has no explicit wording); the three nonstandard Base64 forms follow #94; repeated `Authorization` lines and ordinary cookies stay unresolved (RFC 9110 5.3 does not choose a line; RFC 6265 8.4 says non-nonce content can be sensitive). RFC 6265 successor status: only the RFC Editor page was read (Proposed Standard, no obsoleting RFC); a maintainer check of the page and of 6265bis is still owed. | 3 variants follow item 2 **blocked**; literal, user-id, empty password **blocked**; headers and cookies **kept** | A standard that says which line is valid or that cookie content is not secret. |
| 8 | #115 digests | (a) HMAC and key-hash digests stay unresolved. (b) "content-verification digest, therefore not a credential" is an inference: lower the class of the 11 fixtures from `provider-documented` to `project-policy` (outcome unchanged). (c) Yes, the legacy `lockfiles-and-integrity-hashes` and `hashes-commit-ids-and-uuids` cases cite the new role sources, additive, with `baseline:amend`. | (a) **kept**; (b) **blocked**; (c) **applied** | A source that says these digests are not secrets. |
| 9 | #127 Twilio | Option A: an identifier-only SID input is expected unflagged. Not PII is not evidence of non-secrecy, and the API key SID fixture is a weaker variant twin. | decision recorded in the case and its review history; outcome unchanged, still draft, no second reviewer | Twilio states the SID is confidential, or a maintainer treats account identifiers as sensitive. |
| 10 | #113 structured files | The five sensitivity cases stay unresolved (no new provider statement found; no fixtures exist, so no denominator moves). Docker client config stays under provider `docker`. The unresolved AWS identifier and Kubernetes serialization contract claims keep their review owed. | **kept**, no change | A provider statement for any of the five, or a recorded policy plus new fixtures. |
| 11 | Schema proposals | Closed v1 snapshot representation facts: done (ADR 0018, PR #152, `snapshot-2026.10.04.2`). Decoded sub-range: proceed only after item 2 has a second reviewer, byte coordinates and strict decoded bounds first, additive 1.7.0, credential-eval contract agreed first. Compound `group` field: agree the meaning first, not urgent (existing per-component spans are enough). | v1 snapshot **done**; two **kept** (no schema change here) | |
| 12 | Review debt | Plan B plus C: review the asserted project-policy and the newly `provider-documented` structured-file and HTTP records first, then the rest; split reviews by scope (source reading versus expectation follows) and record each as `confirmed`, `disputed` or `out of scope`. No reviewer is named here. | **kept** | |

## Follow-ups a second reviewer must do

Name a non-author reviewer (a project member's review is labeled project review, not external), record one of confirmed, disputed or out of scope with its scope, then:

1. **Item 1.** Confirm the rule text, the `review:check` exception (it only downgrades a `generic`-group `standard-or-rfc` source to `needs-human`) and the restored fixture `generic--bearer-token-client-id-public-id` (new entry `ev-e266aac6cf`, RFC 6749 section 2.2). Retype the RFC sources consistently (RFC 4648, 7468, 6750, 7519, 3986, 7617, 6265 and 9110 are typed `provider-documentation`; 6749, 3548, 2045, 8259, 3629 and 9562 are typed `standard-or-rfc`) in a separate reviewed change. The four header fixtures (ETag, Content-MD5, request id, trace id) and the 10-character twin stay `project-policy`.
2. **Item 2.** Edit the case or scenario expectation to project-policy `must-flag`, promote each `candidateReading.spans` to `expected.spans` (span is the encoded run, `decoded` kept), add the review event, and keep the 12 benign twins symmetrical. The validator re-derives decoded values (PR #145).
3. **Items 3 and 4.** Edit the five fragment cases and the NBSP fixture the same way; the nine fragmented spans already carry `fragments`.
4. **Item 5.** Edit the marker-body case to `must-flag` with spans. Check that the 24 fixtures do not collide with the 277 `documentation-placeholder` `must-not-flag` fixtures (not yet checked). Regenerate the generated projections and run the generator `--check`.
5. **Items 6 and 7.** Give the 3 lifecycle fixtures a span and `must-flag`; set the `http-basic-*` expectations as in the table, using password-only `secret` spans and a `companion` span for the user-id.
6. **Item 8(b).** Re-base the 11 evidence entries to `project-policy` with a `baseline:amend` only where an entry is imported.
7. **Item 9.** Record the second reviewer in the case's expectation rationale, then a review `confirmed` event.
8. **Item 7.** Read RFC 6265 and 6265bis status once and record it.
9. After any of the above: a new immutable snapshot, then the consumer's adoption workflow. This repository claims no score change; a larger denominator is not evidence of improved performance.

## Counts

| Measure | Before | After this PR |
| --- | ---: | ---: |
| Fixtures | 6,454 | 6,454 |
| `must-flag` | 2,685 | 2,685 |
| `must-not-flag` | 3,602 | 3,602 |
| `not-assertable` | 167 | 167 |
| Fixtures moved out of `not-assertable` | 0 | 0 |
| Fixture whose evidence class changed (`project-policy` to `provider-documented`, outcome unchanged) | | 1 |

Nothing moves out of `not-assertable` in this PR, so the next snapshot's expectations do not change. If the blocked items are applied as decided, the brief's per-item counts say up to 73 fixtures would move: #94 47, #95 8, #96 1, #98 8, #112 3, #114 6 (the 3 Base64 forms are also inside the #94 47, so the net is about 70). They would add to the `must-flag` denominator except the RFC example and empty password (two `must-not-flag`). About 97 would stay `not-assertable`: 16 whole-word placeholders, 2 Unicode, 8 input rejections, 4 header and cookie, 2 digests, the 47 older ones and 15 residual.

## Consequences

- No expectation is asserted without a named non-author reviewer. The decisions are on record so the review is a check of a stated choice, not a fresh decision.
- All records stay `lifecycle: draft`. Nothing here sets `reviewed`, and a release is not a review.
- No release is cut by this change.
