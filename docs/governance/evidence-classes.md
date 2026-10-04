# Evidence classes

An evidence class describes what supports one claim. It is a property of the
claim's basis, not of the credential family, the provider, or any product.

There are four classes: `provider-documented`, `tool-corroborated`,
`project-policy`, and `unresolved`. They are not aliases for `stable`,
`provisional`, `pending`, or any other product state. No rule here maps a class
to a product state, and none may be added.

Every claim has exactly one class at a time. A claim with several sources
carries the class of the strongest basis it actually satisfies, and lists all
its sources. Every claim also carries its sources, the exact statement each
source supports, and the observed-at date of each
([CONTRIBUTING](../../CONTRIBUTING.md#evidence-requirements)).

## provider-documented

**Definition.** The claim is stated by a source authored or published by the
credential's issuer under its own control: official documentation, API
reference, a provider changelog or security notice, an official SDK or
reference implementation published by the provider, or a test value the
provider publishes for testing.

**Requirements.**

- The source is the provider's, not a third party describing the provider.
- The source states the claim, or the claim follows from the statement by a
  step that a reviewer can repeat. The record quotes or locates the statement
  and says which.
- The record has an observed-at date. For a source that changes, it also has a
  durable reference (an archived copy or a revision permalink) so a later
  reader can see what was observed.

**Standards for a family with no issuer.** For a family with no issuer (provider
group `generic`), a standards-body document (an RFC or an equivalent standard)
may be the source for a claim about the standard's own text: its syntax, its
required members, a role it defines, or a non-secrecy it states. This
applies on these conditions only:

- The statement is located (section or anchor) and quoted, or derived by a step
  a reviewer can repeat, as above.
- It is never used for a claim about what a provider issues or how a provider's
  credential is formatted. Those need the provider's own source.
- It is never extended from a role description to non-secrecy. A standard that
  says a header field carries a validator, a digest or an identifier does not
  thereby say its value is not a credential; such a claim stays
  [`project-policy`](#project-policy) unless the standard says so.
- It does not tell a reader how to treat a value (what to flag or redact).
  That is an expectation, and its basis is judged on its own.

A source of this kind is typed `standard-or-rfc` in the record. It does not
make the claim provider-documented for any family that has an issuer, and the
rule is not applied retroactively: an existing entry is re-based only through
a reviewed change that names it
([ADR 0019](../decisions/0019-maintainer-decisions-for-epic-92-review-debt.md)).

**Does not qualify.** A third-party blog, tutorial, forum answer, or support
thread; a provider employee's personal statement outside an official channel; a
scanner rule that cites the provider; an example found in a public repository.

**Limit.** It records what the provider says. It is not a claim that the
provider's statement is complete or that all issued credentials conform.

## tool-corroborated

**Definition.** No provider statement supports the claim, but named, pinned
artifacts made by parties other than the claim's author are consistent with it.
Artifacts include open-source scanner rules, public test vectors, and
documented observations of issued values.

**Requirements.**

- At least two artifacts from different maintainers. A fork, vendored copy, or
  rule ported from another artifact counts as one.
- Each artifact is pinned to a revision or dated, and located precisely enough
  to re-check.
- The record states in what respect each artifact is consistent with the claim.
  "The tool flags it" is not sufficient.
- The claim is worded as consistency ("artifacts A and B both treat the prefix
  as ..."), not as the provider's rule.
- An artifact written by the claim's author, or by the author's organization,
  does not count as one of the distinct artifacts. This applies to Redact
  Secret detectors when the author is a Redact Secret contributor.

**Does not qualify.** Scanner output on the fixture whose expectation is being
justified; agreement among scanners
([no consensus as ground truth](neutrality.md#no-scanner-consensus-as-ground-truth));
an artifact that cannot be re-checked.

**Limit.** Corroboration can support "consistent with observed practice". It
cannot silently replace a provider statement, and it cannot support a claim
that the provider has said something.

## project-policy

**Definition.** Facts do not settle what the expectation should be, and the
maintainers decided. For example: a value the provider documents neither way,
and the project chose to expect it to be treated as benign.

**Requirements.**

- The record states the question, the options considered, the chosen outcome,
  and the reason.
- The record names the deciding maintainer and at least one reviewer who is not
  the author ([review independence](attribution.md#review-independence)).
  During the [solo-maintainer period](solo-maintainer-period.md) the deciding
  maintainer alone may finalize it; the record is then `maintainer-only`, not
  `reviewed`, and is queued for retro-review.
- Dissent, including from external reviewers, is recorded with the decision.
- The record states what evidence would reverse it.

**Limit.** A policy decision is a choice, not a fact. It must be labeled as
policy wherever it is shown. It is never described as a provider rule, and it
does not count toward corroboration of any other claim.

## unresolved

**Definition.** The claim, question, or expectation is recorded but does not
meet another class: the source is missing, secondhand, contradicted, stale
beyond repair, disputed, or not yet reviewed.

**Requirements.** The record states what is missing or in doubt, and what would
resolve it.

**Limit.** An `unresolved` claim may be tracked and discussed. It must not be
the basis for a must-flag or must-not-flag expectation that a consumer is
expected to rely on. If a case needs an expectation while the underlying claim
is unresolved, the expectation is either recorded as
[`project-policy`](#project-policy) with the reason, or the case is not
published as an expectation.

## Promotion

Promotion moves a claim to a class with a stronger basis. Each promotion is a
reviewed change with a public record of the old class, the new class, the
evidence that justifies it, and who reviewed it.

| From | To | Condition |
| --- | --- | --- |
| `unresolved` | `provider-documented` | A provider source meeting the requirements above is added |
| `unresolved` | `tool-corroborated` | Two or more independent artifacts meeting the requirements above are added, and no provider source is known |
| `unresolved` | `project-policy` | A maintainer decision meeting the requirements above is recorded |
| `tool-corroborated` | `provider-documented` | A provider source is found that supports the same claim; the earlier corroboration stays listed |
| `project-policy` | `provider-documented` or `tool-corroborated` | The evidence now supports the claim itself, and the policy record is marked superseded, not deleted |

Rules:

- The author of the supporting evidence is not the sole reviewer of the
  promotion.
- Promotion changes only the class and the sources. It does not change the
  claim's wording. A wording change is a
  [correction](corrections-and-disputes.md#corrections).
- `project-policy` is not a rung above `tool-corroborated`. It is a different
  kind of basis. It is not promoted by being repeated or by the passage of time.

## Demotion

Demotion moves a claim to a class that its basis now supports.

A claim is demoted when:

- its source changed, was removed, or now contradicts the claim;
- an artifact behind a corroboration was rewritten, retracted, or found to be a
  copy of another;
- a reviewer shows the source does not say what the record says it says;
- a dispute challenges the reading of the source and is unresolved
  ([disputes](corrections-and-disputes.md#disputed-interpretations));
- a `project-policy` reason no longer holds.

Rules:

- The default demotion is to `unresolved`. A claim goes to `tool-corroborated`
  only if the corroboration requirements still hold without the failed source.
- Demotion is never silent and never a deletion. The prior class, the trigger,
  and the date are recorded, and the earlier state remains in history
  ([historical revisions](corrections-and-disputes.md#historical-revisions)).
- Anyone may open an issue proposing a demotion. A maintainer applies it once
  the trigger is checked, or records in the issue why the trigger is not met.
- Expectations that depended on the demoted claim are reviewed in the same
  change and either re-based on another valid class or withdrawn from published
  expectations.

## What classes do not do

- They do not rank credential families, providers, or scanners.
- They do not say a scanner should detect a value. Detection expectations are
  stated separately, as semantic outcomes, with the class of their basis.
- They are not confidence scores and are not combined arithmetically.

## Evidence class and product support status

Evidence class and product support status are separate axes. The class is
recorded here and describes the basis of one claim. A support status (for
Redact Secret: `stable`, `provisional`, `pending`, `unsupported`) is decided by
the product, in the product's repository, from several inputs of which this
repository's snapshot is only one.

- A promotion or demotion here never changes a support status automatically,
  in either direction. A claim may be `project-policy` (legacy tier T3) here
  while Redact Secret qualifies the same family as empirically supported from
  its own product-owned evidence.
- A demotion that exposes an actual evidence or coverage gap may still matter
  to a product. Acting on it is an explicit, reviewed decision under that
  product's policy, not a consequence of the change here.
- The class of a claim is decided on its evidence alone, under the rules above.
  How a product would react is not a reason to promote, demote, or hold a
  claim ([conflict of interest](neutrality.md#conflict-of-interest-handling)).
- Legacy benchmark tiers map one to one onto classes (T1 `provider-documented`,
  T2 `tool-corroborated`, T3 `project-policy`, T0 `unresolved`). The mapping
  is a projection for legacy consumers. It does not carry product meaning.
