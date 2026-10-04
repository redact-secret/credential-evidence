# Solo-maintainer period

A temporary rule. It exists because the repository has one maintainer and no second person who can review. It is decided in
[ADR 0020](../decisions/0020-solo-maintainer-period.md) and removed under the condition below.

## The rule

While exactly one person has write access (the deciding maintainer, named in the ADR), that maintainer alone may finalize

- a [project-policy](evidence-classes.md#project-policy) outcome for a case, scenario or fixture, and
- a change of a claim's [evidence class](evidence-classes.md) to `project-policy`,

without the non-author reviewer that [review independence](attribution.md#review-independence) and the project-policy
requirements otherwise ask for. This is the only requirement the rule relaxes.

## The review state `maintainer-only`

A record finalized under this rule is `maintainer-only`. It is a distinct state, between `draft` and `reviewed`:

- It is never `reviewed`. No agent and no tool sets `reviewed`, and a maintainer cannot review their own decision into it.
- It is never described as independent validation, as "externally reviewed", or as a project review. It says that one
  maintainer decided, and nothing about whether anyone else checked.
- It is recorded on the record (`lifecycle` of a case or scenario, `reviewState` of a fixture-set evidence entry) and by a
  `decided` event in the record's review history. The validator rejects the state without the event, and rejects it on any
  basis other than `project-policy`.
- A release counts it. `release-manifest.json` carries `reviewState` (the number of `maintainer-only` fixtures, records and
  decisions, and the number of `reviewed` ones), and the release notes repeat it. The credential-eval snapshot does not carry
  review state; a consumer that needs it reads the manifest or the records bundle.

## Safeguards

1. **Dissent and reversing evidence.** Every `decided` event records the strongest counter-argument and the evidence that
   would reverse the decision, as structured fields. The decision is revisable on that evidence.
2. **Standing backlog.** Every `maintainer-only` record is on the retro-review list, issue
   [#154](https://github.com/redact-secret/credential-evidence/issues/154). When a second person exists they re-review each
   record, and record `confirmed` (the record becomes `reviewed`), `disputed` (the decision is reopened) or `out of scope`.
3. **Temporary.** The rule is removed by a pull request when a second maintainer is named in `GOVERNANCE.md`. From that merge
   no new `maintainer-only` record may be created. Existing ones stay `maintainer-only` until retro-reviewed. The rule has
   no other expiry.
4. **What it does not relax.**
   - [Safety](safety.md) and the disclosure in [GOVERNANCE.md](../../GOVERNANCE.md#disclosure): unchanged. A change that
     weakens them still needs review by a person who is not the author.
   - A `provider-documented` or `tool-corroborated` class: unchanged. Those rest on sources and artifacts, which a reviewer
     checks; a maintainer alone cannot assert them, and `maintainer-only` is invalid on them.
   - [No scanner consensus as ground truth](neutrality.md#no-scanner-consensus-as-ground-truth) and the wording rules.
   - Promotion to `reviewed` of any record: still a second person's act.

## Not retroactive

The rule applies only to the records ADR 0020 lists. Nothing that was `draft` becomes `maintainer-only` by the passage of
time or by being released.
