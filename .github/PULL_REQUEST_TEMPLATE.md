## Summary

<!-- What changes, and why. Name the provider/family/case IDs affected, if any. -->

Closes #
Part of #

## Type

- [ ] Claim or source (new, changed, corrected)
- [ ] Case or fixture projection
- [ ] Class promotion or demotion
- [ ] Correction or supersession
- [ ] Schema, migration, validator, or exporter
- [ ] Documentation or policy

## Claims and provenance

<!-- For each claim added or changed: source type, location or durable
reference, observed-at date, the exact statement the source supports, and the
evidence class. Write "none" if the PR adds no claims. -->

## Authorship and affiliation

- Author affiliation: <!-- project-maintainer / project-contributor / external -->
- Implementation exposure (cases only): <!-- did you read Redact Secret detector source, rules, or tests? which? -->
- Conflicts of interest to disclose: <!-- employer, product, or scanner you work on that benefits from this change, or "none" -->

## Checklist

Evidence
- [ ] Every new or changed claim has a source, the exact supported statement, and an observed-at date.
- [ ] Each claim's evidence class meets its requirements in [evidence classes](../docs/governance/evidence-classes.md).
- [ ] Any promotion or demotion states the old class, new class, and trigger.
- [ ] No claim depends on scanner output or scanner agreement as its basis.
- [ ] Expectations name no scanner, detector, or product support state.

Cases and fixtures
- [ ] Each case states scenario, why it matters, expected semantic outcome, evidence or policy rationale, involved families, and fixture lineage.
- [ ] Expectations were authored from sources and construction, not from a scanner's output.
- [ ] Generated fixtures are marked generated and link back to their case, contract, or generation rule.

Safety
- [ ] Every credential-shaped value is synthetic (construction stated), provider-published (linked), or a grammar.
- [ ] No live, revoked, real-derived, incident, customer, or personal data. See [safety](../docs/governance/safety.md).

Corrections and history
- [ ] A change of meaning keeps the old claim as superseded, with reason and link.
- [ ] Affected cases, contracts, and exports are listed.
- [ ] If this edits an independently contributed case materially, the case is relabeled per [case authorship](../docs/governance/case-authorship.md).

Wording
- [ ] No text calls project-maintained evidence independent, or claims scanner rankings, scanner support, or product readiness.

Validation
- [ ] Validation, schema, reference, and formatting checks that exist in the repository were run. List them below, or write "none exist yet".

## Validation run

<!-- Commands and results. If no tooling exists yet, say so. -->

## Reviewers

<!-- A reviewer other than the author is required for claim, class, and expectation changes. External reviewers: see docs/governance/external-review.md -->
