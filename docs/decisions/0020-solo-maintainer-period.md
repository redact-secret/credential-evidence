# 0020. A temporary solo-maintainer period, and the `maintainer-only` review state

- Status: accepted (decided by the repository owner; this is the governance amendment, and it is itself a `maintainer-only` act)
- Date: 2026-10-04
- Issues: redact-secret/credential-evidence#142 (the decisions), #154 (the retro-review backlog)
- Deciding maintainer: Milo Kang (GitHub `milocosmopolitan`), the repository owner and the only person with write access
- Amends: `GOVERNANCE.md` (Decision-making), `docs/governance/attribution.md` (review independence), `docs/governance/evidence-classes.md` (project-policy requirements), `AGENTS.md` (the self-merge sentence, for owner-instructed merges only), schema revision 1.7.0
- Builds on: ADR 0019, which decided the epic #92 review debt item by item and left every outcome change `blocked` for want of a second reviewer

## Context

The repository has one maintainer and no second person who can review. [Project-policy](../governance/evidence-classes.md#project-policy) and [review independence](../governance/attribution.md#review-independence) both ask for a reviewer who is not the author. ADR 0019 therefore recorded decisions it could not apply: 73 fixtures stayed `not-assertable` and the denominator of every consumer stayed smaller than the decided corpus. The owner decided that the project stays a one-person project for now, with no second reviewer, and approved this amendment so the decisions can take effect without pretending that anyone else reviewed them.

## What rule changes, and why

| Before | After (this ADR) |
| --- | --- |
| A project-policy outcome or a class change to `project-policy` needs a reviewer who is not the author. | While one person is the only maintainer, that maintainer alone may finalize it. The record is `maintainer-only`. |
| A record is `draft` or `reviewed`. | A third state, `maintainer-only`, exists between them. It is never `reviewed`. |
| Self-merge: "Never merge your own pull request." (AGENTS.md) | Unchanged for everyone, with one exception: a merge the owner explicitly instructed an agent to make in this repository, stated in the pull request body, after green CI. |

Why now: a decision that is recorded but cannot take effect leaves 73 inputs unasserted, and "awaiting review" with no reviewer in sight is a state that never ends. A distinct label is more honest than keeping them `not-assertable` and than calling them reviewed.

## Decision

1. **The rule** ([solo-maintainer period](../governance/solo-maintainer-period.md)). While exactly one person has write access, that person alone may finalize a project-policy outcome and a change of evidence class to `project-policy`.
2. **The state.** `maintainer-only` is recorded as the `lifecycle` of a case or scenario and as `reviewState` of a fixture-set evidence entry (schema 1.7.0), together with a `decided` event in the review history (actor role `maintainer`, with `dissent` and `reversingEvidence` as required fields). The validator rejects the state on any basis other than `project-policy`, on any record kind other than case and scenario (a set states it per evidence entry), and without the event. It is never `reviewed`; no agent and no tool sets `reviewed`.
3. **Visible to consumers.** The credential-eval snapshot does not carry review state (it never did; `docs/releases.md` says review state is never carried) and this ADR does not change that contract. Every release manifest carries `reviewState` (`fixtures {total, draft, maintainerOnly, reviewed}`, `maintainerOnly {fixtures, fixturesByOutcome, records, decisions}`), recomputed by `release:check` and `release:verify` from the bundled records, and the release notes repeat the counts. The records bundle carries every record, so a consumer can list the `maintainer-only` fixtures itself.
4. **Safeguards.** (a) Every decision records its strongest dissent and the evidence that would reverse it. (b) Issue #154 is the standing backlog: when a second person exists they re-review every `maintainer-only` record and record `confirmed` (the record becomes `reviewed`), `disputed` (reopened) or `out of scope`. (c) The rule is temporary: it is removed by a pull request when a second maintainer is named in `GOVERNANCE.md`; from that merge no new `maintainer-only` record may be created, and the existing ones stay `maintainer-only` until retro-reviewed. (d) It does not relax [safety](../governance/safety.md) or the disclosure; it does not touch `provider-documented` or `tool-corroborated` (the validator refuses `maintainer-only` there); it does not relax the wording rules or the rule that scanner agreement is not ground truth.
5. **Not retroactive.** It applies only to the records listed below. A record that was `draft` stays `draft`.
6. **The reconstruction rule.** `scripts/lib/representation.mjs` required a fragment step's `reconstruction` to be `reconstructs-original` for a must-flag span with fragments (ADR 0016). That rule stays for every item except one that is `maintainer-only`: the eight separator cases of ADR 0019 item 3 are a decided policy to protect the fragments, not a fact about how a language rebuilds the value, so their `reconstruction` facts stay as stated (`inserts-separator`, `unresolved`) and no longer force the outcome.

Dissent (the strongest argument against this ADR): a decision nobody else has read is a decision without a check, and a corpus that scores scanners against 96 unchecked labels lends them authority they have not earned; `maintainer-only` is a label on a gap, not a closing of it. A second maintainer-of-convenience could be named to make the gap look closed, which is why the rule requires a reviewer who can actually decide `disputed`. Reversing evidence: a reliable report that a `maintainer-only` expectation is wrong, a second person who retro-reviews and disputes, or the owner withdrawing the rule.

## Records affected

Applied under the rule, with ADR 0019's decision text, strongest dissent and reversing evidence in each review history (`decided` event):

| ADR 0019 item | Records | Fixtures |
| --- | --- | --- |
| 2 (#94) | scenarios `credential-in-base64-or-hex-form`, `credential-in-nested-encoding-layers` (outcome class `must-flag`, `project-policy`); the 12 benign twins through one evidence entry | 32 + 15 `must-flag` (the encoded run is the span, `decoded` kept), 12 `must-not-flag` |
| 3 (#95) | cases `credential-split-by-backslash-crlf-continuation`, `credential-split-by-backslash-newline-inside-single-quotes`, `credential-split-by-literal-line-break-in-plain-text`, `credential-split-by-markdown-paragraph-line-ending`, `credential-with-escaped-line-break-text`; scenarios `whitespace-inserted-into-credential-value`, `escaped-line-break-text-inside-credential-value` | 8 `must-flag` (span is the enclosing range, `fragments` the secret bytes). The three language-reconstruction cases are untouched (tool-corroborated) |
| 4 (#96) | new case `unicode-no-break-space-inside-credential-value` (split from `unicode-credential-reading-depends-on-normalization`) | 1 `must-flag` (`decoded` strips U+00A0) |
| 5 (#98) | case `example-marker-inside-provider-shaped-value-not-published-by-provider` (two evidence entries, one per set) | 8 `must-flag` |
| 6 (#112) | cases `stripe-key-replaced-within-rotation-grace-period`, `aws-temporary-credentials-with-expiration-field`, `app-installation-token-with-one-hour-lifetime-note`; scenarios `offline-text-cannot-establish-expiry`, `rotation-overlap-predecessor-credential` | 3 `must-flag`. The Slack case has no fixture and an assertable case needs one: it stays `not-assertable` |
| 7 (#114) | cases `http-basic-rfc-published-example-credentials`, `http-basic-empty-password-credentials` (`must-not-flag`), `http-basic-user-id-versus-password-scope` (secret token, `companion` user-id), `http-basic-token-nonstandard-base64-forms` (follows #94) | 2 `must-not-flag`, 4 `must-flag` |
| 8(b) (#115) | cases `content-digest-references-in-build-and-package-metadata`, `cache-key-and-content-hashed-filename-values`, `version-strings-embedding-a-commit-hash-fragment`: class `provider-documented` to `project-policy`, outcome unchanged | 11 `must-not-flag` |

Totals: 17 cases, 6 scenarios, 3 evidence entries, 23 `decided` events; 96 `maintainer-only` fixtures (71 `must-flag`, 25 `must-not-flag`). 73 fixtures left `not-assertable`: 71 became `must-flag` and 2 `must-not-flag`. ADR 0019 counted "about 70" because it counted the three Base64 forms twice; the three are HTTP fixtures and not part of the 47 encoded ones.

Kept unresolved exactly as ADR 0019 decided: #96 combining acute, fullwidth forms and the eight rejected inputs; #98 the 16 whole-word fixtures; #113 the five sensitivity cases; #115(a) HMAC and key-hash digests; #114 repeated `Authorization` lines and ordinary cookies; the Slack lifecycle case (no fixture); `provider-key-inside-larger-base64-or-hex-payload`. The PII scope statement (#140) and the Twilio decision (#127) stay as ADR 0019 recorded them: outcome unchanged, `draft`, no second reviewer. ADR 0019 item 1 (the located standard may back `provider-documented`) is a source-based class change that this rule does not cover, and still needs a non-author reviewer.

Candidate readings promoted to expected spans: the 47 encoded ones (the validator re-derives each `decoded` value, PR #145) and the HTTP user-id token. The two repeated-header candidate readings stay non-asserting.

## Counts

| | Before | After |
| --- | ---: | ---: |
| Fixtures | 6,454 | 6,454 |
| `must-flag` | 2,685 | 2,756 |
| `must-not-flag` | 3,602 | 3,604 |
| `not-assertable` | 167 | 94 |
| of the 504 fixtures epic #92 added: `not-assertable` | 120 | 47 |
| of those: `must-flag` / `must-not-flag` | 268 / 116 | 339 / 118 |
| `maintainer-only` fixtures | 0 | 96 |
| `reviewed` fixtures | 0 | 0 |

A larger must-flag denominator is not evidence that any scanner improved or regressed; replay before comparing.

## Consequences

- A consumer sees the state in four places: the manifest's `reviewState`, the release notes, and, in the bundled records, `lifecycle` (cases, scenarios) and `reviewState` (evidence entries). The credential-eval snapshot contract is unchanged (`credential-eval/corpus-snapshot/v1`, representation facts `credential-eval/representation/1`, engine `v0.1.0-alpha.4` or later). The snapshot gains expectations and span facts (`fragments`, `decoded`), so its `facts_digest`, its corpus digest and `evidence_schema` (`credential-evidence/schema/1.7.0`) change.
- `release:check` and `release:verify` fail if the manifest's `reviewState` differs from the bundled records. Generator version 1.3.0.
- Reading a `maintainer-only` expectation as validated, or as a project review, is a misuse the wording rules already forbid.
- Removal: a pull request that deletes the rule and names the second maintainer. Records become `reviewed` only by a second person's recorded `confirmed` review.
