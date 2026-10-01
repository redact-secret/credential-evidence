# Neutrality wording rules

Authority: [GOVERNANCE.md](../../../GOVERNANCE.md),
[neutrality](../../../docs/governance/neutrality.md),
[case authorship](../../../docs/governance/case-authorship.md),
[ADR 0010](../../../docs/decisions/0010-family-narrative.md). Applies to record text, notes,
rationales, review-history notes, commit messages and PR descriptions.

## Say

- "Maintained by the Redact Secret project." Project-authored records say they are
  project-authored and not independent evidence.
- "Expectations are scanner-neutral: they name no scanner and are not derived from scanner output."
- "Reviewed by <name>, who is not affiliated with the Redact Secret project." only when true and
  recorded in the review history with `affiliation: external`.
- Precise, falsifiable statements; observed fact apart from inference ("artifacts A and B both
  treat the prefix as ...", not "the prefix is ...").
- Semantic outcomes: must be flagged, must not be flagged, may be flagged, not assertable.

## Never say (project-maintained material)

| Do not | Instead |
| --- | --- |
| independent, third-party, unbiased, impartial, vendor-neutral, community-owned, industry standard, authoritative benchmark | maintained by the Redact Secret project |
| best, most accurate, any ranking of a scanner | nothing; measuring scanners belongs in `credential-eval` |
| "validated" with no who, what and against which source | "checked by <who> against <source> on <date>" |
| "scanner X flags it", "all scanners agree", "the detector expects" | a source, a construction argument or a recorded project-policy decision |
| stable, provisional, pending, supported, support status, tier | an evidence class; coverage or readiness is the product's, not ours |
| "scanner-neutral" to imply who maintains the data | the two are separate claims |

## Expectations are tool-neutral when

1. they state a semantic outcome, not a scanner behaviour;
2. they name no scanner, detector, rule or product state;
3. the justification is a source, a construction argument or a project-policy decision;
4. they were written before or independently of any scanner observation of that fixture;
5. they would still mean something if any one scanner, Redact Secret included, did not exist.

A scanner that disagrees with a provider-backed expectation is an observation recorded
downstream, never a reason to change the expectation. Scanner artifacts appear only as
`scanner-rule-source` sources for limited `tool-corroborated` format claims.

## Narrative prose is linted

`npm run lint:narrative` rejects, in `family-narrative` text, legacy suite names,
beta/milestone/release coordinates, issue or PR workflow (`#123`, "tracking issue"), "detector",
support-status words (`stable`, `provisional`, `pending`), tier words, and product or benchmark
vocabulary (`Redact Secret`, `benchmark`, `core`, `corpus`, `fixture`, `taxonomy`, `ledger`).
Rewrite in product-neutral language; provenance goes in citations or `externalRefs`.

## Conflicts of interest

A change that would move a Redact Secret result either way says so and needs a reviewer who is not
the author. Authors state their affiliation and whether they read Redact Secret detector source.
An agent run is `automation` with affiliation `project-maintainer` and never counts as the
independent reviewer of its own output.
