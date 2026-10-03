# Remaining-work decision packet

Audit date: 2026-10-03. This is an automation-authored work inventory, not a
maintainer decision or a human review. Maintained by the Redact Secret project;
project-maintained evidence is not presented as independent validation.

## Completed work and stale blockers

The [release ledger](../releases.md#releases) records `snapshot-2026.10.03`,
source commit `cb5d2aeed47e47e457cb89e43e905ab9145e9634`, schema 1.6.0,
6,454 materialized fixtures and manifest digest
`d70507ca1d6595c260ab8dc06a804b93b4c149a80b9bfd0788761f06ae0b0ee9`.
It includes epic #92 draft records and deliberately not-assertable expectations.
Thus [#142](https://github.com/redact-secret/credential-evidence/issues/142)'s
instruction to cut a snapshot newer than `snapshot-2026.10.01.2` is complete.
Consumer repin/replay remains a separate handoff; publication alone proves no
score change, consumer adoption or human review.

[ADR 0015](../decisions/0015-validation-tiers-and-import-baseline.md) resolved
the pipeline-ownership blocker reported in #21's older comment: new records
pass the ordinary gate, imported edits need amendment declarations, and
historical checks regenerate the pinned baseline. That comment's ownership
blocker no longer prevents a research PR from being green.

## Human decisions still required by #142

For each row, record the question, options, deciding maintainer, non-author
reviewer, rationale, dissent and reversing evidence before asserting a new
project-policy outcome. An automated checklist is not that review. Existing
unresolved outcomes stay `not-assertable` until the applicable rule is met.
The proposals below are recommendations, not newly adopted expectations.

| Unit | Decision and options | Recommended next action and basis |
| --- | --- | --- |
| Encoded values, [#137](https://github.com/redact-secret/credential-evidence/pull/137) | Must an encoded credential be protected, and what source range represents it? Options: encoded range covering the decoded credential / qualified may-flag / remain unresolved. | Consider encoded text as the range to cover when the decoded base is a credential; RFC 4648 establishes representation, not confidentiality. Keep product decoding depth, expansion and size limits downstream. |
| Fragments, [#136](https://github.com/redact-secret/credential-evidence/pull/136) | Protect separator-inserted fragments across literal line breaks, Markdown wrapping, single-quoted backslash-newline and escaped newline text, or require language-defined reconstruction? | Review each carrier's language-spec reading before choosing; a syntactic reconstruction claim and a protection policy are separate. |
| Unicode, [#138](https://github.com/redact-secret/credential-evidence/pull/138) | NBSP inside a key, combining mark after it and fullwidth normalization: must-flag / may-flag / unresolved. Also confirm escaped invisibles are the stated synthetic construction. | Keep the three ambiguous readings unresolved pending a scoped decision; Unicode normalization facts do not alone determine credential confidentiality. Decide the fixture-text injection-gate exception separately from prose safeguards. |
| Placeholders and scope, [#140](https://github.com/redact-secret/credential-evidence/pull/140) | Are EXAMPLE/SAMPLE whole words or unpublished provider-shaped EXAMPLE bodies placeholders? Confirm credential-only handling of personal-data-shaped controls. | Distinguish provider-published placeholders from arbitrary marker text; keep ambiguous inputs unresolved. Record generic-assignment and PII settings in downstream comparisons. |
| Compound values, [#127](https://github.com/redact-secret/credential-evidence/pull/127) | Review `twilio-sid-only-and-placeholder-token-near-neighbors` and confidentiality of components. | Confirm the source reading separately from the policy; bundle structure does not imply every component is confidential. |
| Lifecycle, [#129](https://github.com/redact-secret/credential-evidence/pull/129) | Rotated-out values inside/past overlap, expiry-looking timestamps and short-lifetime notes: must-flag / may-flag / unresolved. | Consider must-flag because offline text cannot establish actual revocation or expiry; this is policy, not a provider-documented validity claim. |
| HTTP carriers, [#133](https://github.com/redact-secret/credential-evidence/pull/133) | Six cases: published Basic example; user-id scope; empty password; nonstandard Base64 forms; repeated Authorization lines; ordinary cookies/application state. | Decide each independently. Cookie grammar and non-nonce content do not establish non-secrecy. Verify RFC 6265 successor status before any grammar correction. |
| Structured files, [#134](https://github.com/redact-secret/credential-evidence/pull/134) | Five sensitivity cases: service-account identifiers; kubeconfig exec/auth-provider values; certificate/server fields; netrc login/anonymous template; npmrc username/email/password. Keep Docker client config under docker or introduce another provider? | Keep five cases unresolved unless evidence or policy settles them; retaining docker is the original proposal. Separately review unresolved AWS identifier and Kubernetes serialization contract claims. |
| Digests, [#139](https://github.com/redact-secret/credential-evidence/pull/139) | Derived HMAC/key hashes; whether content-verification role proves non-credential status; whether to cite new sources in two legacy benign cases. | Keep derived-digest case unresolved. Review role-to-benign inference explicitly; legacy source additions require amendment declarations and preserve prior evidence. |
| Standards class, [#144](https://github.com/redact-secret/credential-evidence/pull/144) | Can standard-or-rfc support provider-documented for issuerless generic families? A: generic-only located standard text; B: issuer-only and migrate RFC-backed claims; C: per-family decisions. | Recommend A, narrowly limited to what the standard states, with a reviewed governance clarification, consistent source typing and explicit affected-record migration. Do not automatically treat role descriptions as non-secrecy. |

The fragment row follows #142: at this audit, #136 has a fragment title but
its PR body duplicates the encoded-value notes from #137. Its title/body
mismatch must not be used as evidence that fragment decisions are settled.

All cases, scenarios, contracts and fixtures from PRs #125–#140 still need a
non-author reviewer before leaving draft. Review scope must distinguish
confirming a source passage from confirming that an expectation follows.
The [attribution rule](../governance/attribution.md#review-independence) and
[evidence classes](../governance/evidence-classes.md#project-policy) apply.

## Technical sequence and boundaries

| Work | Necessary for | Sequence |
| --- | --- | --- |
| Validate decoded candidate readings using the same strict derivation as asserted spans | Integrity of already-authored candidate representations | Can proceed without deciding their semantic outcome; add failing malformed-reading tests and preserve not-assertable status. |
| Add optional decoded sub-range semantics | Embedded key within a larger decoded payload | Define byte coordinate system and strict decoded bounds, version additively, then author the currently missing fixture for `provider-key-inside-larger-base64-or-hex-payload`. Not required to represent current whole-value encoded fixtures. |
| Add optional compound group/relationship semantics | Explicit completeness and component roles within one bundle | Agree meaning before schema and validator implementation; existing secret/companion spans remain valid. Not required to review existing component policy. |
| Extend credential-eval snapshot with fragments, decoded and inputValidity | Consumers receiving representation semantics through that closed contract | Coordinate with credential-eval and document compatibility; materialized manifest already carries them. Optional for current canonical authoring and publication, required for a consumer needing these fields through the snapshot. |

Schema/shared-generator changes require both ordinary and historical checks.
Record-only or documentation-only work uses the ordinary gate and
fixtures:materialize:check. Neither schema fields nor green checks replace
human evidence review. Consumer execution, adapter mappings, product action
policy and replay belong outside this repository.

## #21 acceptance audit

The six implementation children (#22–#27) are completed, but the epic asks for
a scheduled run selecting a real gap, researching it with provenance, opening
a validated PR and leaving the repository green. The current
[operating contract](../ops/research-cron.md#open-questions-for-the-maintainer)
records these unresolved operational conditions:

1. A repository-scoped bot credential that triggers PR CI, rather than
   GITHUB_TOKEN, and a real bot-created PR with successful CI.
2. Agent isolation protecting the model credential and enforcing network scope.
3. A runner-provided allowlisted raw-fetch helper, or a documented decision to
   leave model-mediated-only source readings unresolved.
4. Wrapper-enforced token budget; the runner itself enforces wall time only.
5. One real end-to-end manual pilot using the configured agent, with retained
   run summary, provenance, published PR and current-head checklist result.

A live `npm run research:run -- --dry-run` on 2026-10-03 selected the
Atlassian API-token gap, checked deduplication and generated its budget and
fetch allowlist. The operator used a temporary Git wrapper with HTTPS and the
gh credential helper: the harness sanitized environment did not preserve SSH
authentication. No repository Git configuration changed. This proves live
planning, not configured-agent execution or a bot-created green PR.

A dry run and mocked tests establish planning and mechanics, not that live
acceptance. No schedule exists; the examples are inert. Recommend keeping #21
open until the pilot and operating decisions are recorded, then treating
schedule activation as the separate maintainer decision specified in the
contract. Do not enable a schedule just to close the issue.

## Shared prefix review (#60 and #68)

The latest issue comments report `gitlab--short-gitlab` restored by #105 and
`slack--short-slack` restored by #106. Both remaining requests concern the same
`cross-provider--prefix-only` fixture, which also names GitHub, npm and
SendGrid. One combined evidence-entry review is the bounded next unit; two
family PRs editing that entry would duplicate work. Review every prefix's
support and artifact ownership before proposing a class change, or retain
project-policy with an explicit not-restorable rationale. Do not claim either
issue complete from its provider-specific restoration alone.
