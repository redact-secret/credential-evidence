# 0023. Expectation corrections the product proposed for core #1205

- Status: proposed. Accepted when the repository owner, as the sole maintainer (ADR 0020), merges it; the decision is then a `maintainer-only` act, never `reviewed`. Written by an AI agent on the owner's instruction, as a recommendation: the owner may change any row before merging.
- Date: 2026-10-05
- Issues: redact-secret/redact-secret#1205 (handoff), credential-evidence#228, benchmarks#698
- Inputs: the product's decision `decision-settle-the-snapshot-2026-10-04-4-added-case-roots` (an input, not ground truth: [no scanner consensus](../governance/neutrality.md#no-scanner-consensus-as-ground-truth)); the precedent [ADR 0021](0021-expectation-corrections-proposed-by-the-product-for-1203.md)

## Context

The product replayed `snapshot-2026.10.04.4` and classified 24 base cases it does not pass, 57 root causes in the benchmark triage. It proposes that nine rows of expectations change. Each proposal is read here against the evidence, not against what the product returns, as in ADR 0021. An expectation moves only where a standard, a provider page or the case's own construction supports the move.

The same limits as in ADR 0021 apply. The model has no scanner action (`warn`, `redact`, `block` are product vocabulary). `may-flag` exists in the record schema but the v1 corpus snapshot cannot carry it, so "review-required" has no representation. What the snapshot does carry for "acceptable either way" is a `companion` span, an `envelope`, the family scope of a twin (ADR 0013), and the representation facts of ADR 0018 (`transformation`, `fragments`, `decoded`), which state what a consumer must do before a span applies.

Eleven of the cases are new in `snapshot-2026.10.04.4` (epic #158, round 1). Their input bytes are the carrier as the format writes it, and each span is a UTF-8 byte range into those raw bytes. A detector that cannot read a carrier misses the span; that is a statement about the detector.

## Decisions

| # | Case(s) | Decision | Evidence read |
| --- | --- | --- | --- |
| 1 | `graphql-requests-and-responses-authored--get-url-variables-value` | **Kept** (`must-flag`, provider-documented) | The synthetic key's characters are all unreserved, so percent-encoding the surrounding JSON leaves the secret span as plain bytes in the raw input (178-247). Only the delimiter before it is `%22`. The fixture already carries its `transformation`. Not finding it behind a `%22` is a product limit on percent decoding (#491). Dropping the percent-encoded form would remove the one URL-carrier variant of the case. |
| 2 | `har-exports-authored--bearer-token-in-postdata-params` | **Kept** | HAR 1.2 stores a form body as `params[]` of `name`/`value` objects, and RFC 6750 section 2.2 names `access_token` as a body parameter. The case's basis is documented; the product has no JSON name/value pairing. Authoring it as `name=value` would stop it being a HAR. |
| 3 | `har-exports-authored--bearer-token-in-url-and-querystring-array` | **Kept** (both spans) | The same bearer value occurs in `url` and in a `queryString` member. A repeated occurrence is its own span (#99): a finding on the URL string does not cover the member. The product claims the first exactly and misses the second; that is a miss, not an over-assertion. |
| 4 | `har-exports-authored--session-cookie-in-headers-and-cookies-arrays` | **Kept** | RFC 6265 section 8.4 (a session value is a credential) is the basis; the product declares no session-cookie family (#1203). Absence of a family is the product's scope. |
| 5 | `hashicorp-terraform-authored--state-json-output-password-with-sensitive-true` | **Kept** | The HashiCorp pages say `terraform show -json` and `output -json` print sensitive values in plain text and that the sensitivity structure holds only `true`. A JSON reader is a product capability, not evidence. |
| 6 | `jupyter-notebook-files-authored--source-value-split-between-array-elements` | **Kept** | nbformat joins a `source` list with an empty string, so the value is whole for any reader that rejoins it. The fixture declares its fragments. Whether a fragment is scored on the enclosing range is a measurement question for credential-eval, not a reason to change the expectation. |
| 7 | `jupyter-notebook-files-authored--stdout-mask-where-source-has-environment-reference` | **Kept** (`must-not-flag`, `already-masked-values`, project-policy) | A real stream output stores its text as a JSON string, and a newline inside a JSON string is the two characters `\n`. A real line break would not be valid JSON, so the fixture would stop being a notebook; the proposal to use one changes the carrier to fit the detector. A `warn`-level allowance has no representation (above). The ambiguity the product describes (a mask run ending in an escaped line break) is recorded for the consumer, not decided here. |
| 8 | 11 `base64-hex-representation-projections--sendgrid-key-*` and 4 `line-break-and-fragment-authored--key-split-*` cases | **Kept**; the "gate-peer occurrences `not-assertable`" part is a scoring classification for benchmarks#698 and #622, not an evidence change | These carry the maintainer-only decisions of ADR 0019 items 2 and 3 (an encoded credential is protected over its encoded run; a key split or padded so that the secret bytes stay intact is a partial leak). The product not decoding or rebuilding fragments does not reverse them: reversing needs reversing evidence, which the proposal does not offer. The cases already declare `decoded` and `fragments`. |
| 9 | `docker-compose-resolution-authored--required-message`, `jupyter-notebook-files-authored--same-value-in-source-stream-result-json-error-and-traceback` | **No change** | The product fixed both in an unreleased build (#1206). Re-measure on a release or the candidate; nothing in the evidence moves. |

Counts: 0 expectations changed, 0 added, 0 removed. 13 rows of the table are kept, the ninth is a no-change acknowledgement. The corpus does not change, so no snapshot is cut for this ADR.

## Dissent and reversing evidence

- Rows 1 to 6: the strongest argument against keeping is that a corpus a product cannot read measures only its reading ability, and that the maintainer's own ADR 0019 item 2 places encoded forms as covered runs. The cases state their carrier and their preconditions, which is what a consumer needs to score or exclude them. Reversing evidence: a recorded decision to carry `may-flag` or an unsupported-carrier outcome in the snapshot (an exporter and engine contract change), or a measurement contract in credential-eval that excludes cases whose preconditions the product declares out of contract.
- Row 7: the argument against is that a measurement that cannot express "a warning is fine" leaves a control failing on an input that is ambiguous at the product's boundary. Reversing evidence: a recorded policy that a mask run followed by a JSON-escaped line break is ambiguous, or a representation for "either".
- Row 8: the argument against is that fifteen cases fail on every product that reads raw input. Reversing evidence: a change to ADR 0019 item 2 or 3 by the owner.

## Consequences

- No evidence record changes, so there is no new snapshot. `snapshot-2026.10.05.2` is current.
- The product's disagreements stay recorded as scope limits of the raw-input contract: percent decoding (#491), JSON name/value and parent-keyed readers, the session-cookie family, base64 and hex decoding, and fragment rebuilding. Whether each is scored as a miss, excluded or classified as a justified divergence is decided in benchmarks#698 and #622, not in the evidence.
- A consumer replays after the product release that carries #1206; the two cases of row 9 are expected to pass.
