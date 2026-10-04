# Governance

This page states who maintains `credential-evidence`, what its evidence claims
and does not claim, and where the detailed rules live. It applies to the
repository's data, documentation, and review process. The boundary rule for
what belongs here at all is in [AGENTS.md](AGENTS.md) and
[ARCHITECTURE.md](ARCHITECTURE.md).

## Disclosure

> Maintained by the Redact Secret project.

`credential-evidence` is created and maintained by the Redact Secret project
(the `redact-secret` GitHub organization). Redact Secret also develops a secret
scanner and a benchmark that consumes this data. That is a conflict of
interest, and this repository does not claim otherwise.

- The repository is not independent, third-party, or neutral in an
  institutional sense. Wording such as "independent", "unbiased", "vendor
  neutral", or "community owned" must not be used for project-maintained
  material. See [neutrality wording](docs/governance/neutrality.md#wording).
- What the repository does claim is narrower and checkable: expectations are
  scanner-neutral (they name no scanner and are not derived from any scanner's
  output), every claim carries provenance, and corrections are public. Each of
  those can be verified without trusting the maintainers.
- Evidence authored by the Redact Secret project is labeled as such. It is
  never described as independent validation, even when a reviewer outside the
  project has checked it.

## What can be checked

A reader can falsify the repository's neutrality claims. Each row names the
observation that would show the claim is false.

| Claim | Shown false by |
| --- | --- |
| Expectations do not depend on any scanner's behavior | A case whose expectation changed after a scanner observation, with no cited source or policy decision explaining the change |
| Redact Secret is treated the same as any other tool | An expectation, class, or review rule that names or is conditioned on Redact Secret's detectors, or a case accepted or rejected because of how one scanner handles it |
| Every material claim has provenance | A claim with no source, no exact supported statement, or no observed-at date |
| Corrections are public | A change to a claim's meaning with no visible correction or supersession record |
| Project-authored work is labeled | A project-authored case or claim presented without authorship, or described as independent |

A report that one of these is false is a valid issue. Use the
[dispute template](.github/ISSUE_TEMPLATE/dispute.yml).

## Neutrality expectations for every consumer

The same evidence must be usable, on the same terms, by Redact Secret,
Gitleaks, TruffleHog, flare-redact, OpenRedaction, a future scanner, or a human
researcher.

- Expectations describe semantics (for example, must be flagged, must not be
  flagged) and never name a scanner.
- No scanner's output, and no agreement among scanners, is ground truth. See
  [no consensus as ground truth](docs/governance/neutrality.md#no-scanner-consensus-as-ground-truth).
- A scanner that disagrees with a provider-backed expectation is an
  observation to record downstream, not a reason to change the expectation.
- Evidence classes describe how well a claim is supported. They are not
  product states such as `stable`, `provisional`, or `pending`, and no such
  state is recorded here.
- This repository is one evidence input to any product's qualification, not
  that qualification and not its only corpus. A product may measure its own
  separately identified evidence populations next to the public snapshot, and
  a change of evidence class here does not change a product support status
  automatically in either direction. See
  [ARCHITECTURE.md](ARCHITECTURE.md#consumer-boundary) and
  [evidence classes](docs/governance/evidence-classes.md#evidence-class-and-product-support-status).

## Policy pages

| Topic | Page |
| --- | --- |
| Neutrality wording, disclosure text, scanner-consensus rule | [neutrality](docs/governance/neutrality.md) |
| Evidence classes, promotion and demotion | [evidence classes](docs/governance/evidence-classes.md) |
| Synthetic-only rule and forbidden material | [safety](docs/governance/safety.md) |
| Contributor and reviewer attribution, affiliation disclosure | [attribution](docs/governance/attribution.md) |
| Project-authored versus independently contributed cases | [case authorship](docs/governance/case-authorship.md) |
| Corrections, staleness, historical revisions, disputes | [corrections and disputes](docs/governance/corrections-and-disputes.md) |
| Reviewing without Redact Secret product knowledge | [external review](docs/governance/external-review.md) |
| The temporary one-maintainer rule and the `maintainer-only` review state | [solo-maintainer period](docs/governance/solo-maintainer-period.md) |

The index is [docs/governance/README.md](docs/governance/README.md).

## Decision-making

- Maintainers are the people with write access to this repository. Their
  identities are visible on GitHub.
- A maintainer merges. A maintainer must not be the only reviewer of their own
  change to a claim or expectation; see
  [review independence](docs/governance/attribution.md#review-independence).
  One temporary exception: while the repository has a single maintainer, a
  project-policy outcome or a change of class to `project-policy` may be
  finalized by that maintainer alone, recorded as `maintainer-only` (never
  `reviewed`, never independent validation) and queued for retro-review. See
  [solo-maintainer period](docs/governance/solo-maintainer-period.md) and
  [ADR 0020](docs/decisions/0020-solo-maintainer-period.md).
- Where evidence does not settle a question, a maintainer may record a
  `project-policy` decision. That decision is labeled as policy, carries its
  rationale, and records any dissent. It is revisable. See
  [project-policy](docs/governance/evidence-classes.md#project-policy).
- Maintainers do not resolve a factual dispute by vote or by seniority. A
  dispute is resolved by evidence, or it stays open and visible. See
  [disputes](docs/governance/corrections-and-disputes.md#disputed-interpretations).

## Changing this policy

A change to `GOVERNANCE.md` or `docs/governance/` is a pull request that states
which rule changes, why, and which existing records it affects. It is reviewed
like any other change, and it is not applied retroactively to records without a
recorded migration. A change that weakens a rule in
[safety](docs/governance/safety.md) or the disclosure above needs review by a
person who is not the author. The solo-maintainer period does not relax that:
it covers project-policy outcomes and class changes to `project-policy` only.
