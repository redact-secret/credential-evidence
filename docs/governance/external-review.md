# Reviewing without Redact Secret product knowledge

You can review research and cases here without knowing anything about the
Redact Secret product, its detectors, or its support states. Nothing in the
evidence depends on them. If a record cannot be checked without that knowledge,
that is a defect in the record; say so in your review.

## What you do not need

- Redact Secret's source code, detector names, or configuration;
- any scanner installed or run;
- the benchmark, scoring, or release process;
- access to any live provider account.

## What you need

- The record under review, and the sources it cites.
- A web browser to open those sources.
- The [evidence class definitions](evidence-classes.md).

## What to check

Pick the questions in your area. You may review a subset; state which.

**Source reading**

1. Does the cited source exist at the given location or durable reference?
2. Does it say what the record says it supports? Quote the words that do or do
   not.
3. Is it the provider's own source, if the record says `provider-documented`?
4. Is the observed-at date plausible, and is it plausibly still true for a
   claim about current behavior?

**Class**

5. Do the requirements for the claimed [class](evidence-classes.md) hold? For
   `tool-corroborated`: are the artifacts really from different maintainers, or
   is one a copy?
6. Does the claim overreach its sources, for example stating a provider rule
   when only tool artifacts exist?

**Case reasoning**

7. Does the expected semantic outcome follow from the cited claim, without
   needing anything from a scanner?
8. Does the case name or depend on any scanner, detector, or product state? It
   should not.
9. Is there a reasonable reading of the sources under which the expectation
   would be different? If so, say so; that may be a dispute.

**Safety**

10. Is every credential-shaped value clearly synthetic, provider-published with
    a link, or a grammar? Does the record say how it was constructed?
11. Does anything look like a real value? Do not reproduce it; see
    [safety](safety.md).

**Attribution**

12. Are the author and affiliation stated? Is implementation exposure
    disclosed, for cases?

## How to record your review

Post a review on the pull request or issue that states:

- **Scope**: which of the questions above you covered.
- **Outcome**: confirmed, disputed, or out of scope, per
  [attribution](attribution.md#recording-review-outcomes).
- **Basis**: what you opened or checked, with links or quoted source text.
- **Affiliation**: `external`, or your relationship to Redact Secret or to a
  scanner, if any.

A review that says "looks fine" without scope or basis is welcome but is not
recorded as a review of any specific question.

## How to challenge a record

If you think a claim, class, or expectation is wrong, open a
[dispute](../../.github/ISSUE_TEMPLATE/dispute.yml), or a
[review request](../../.github/ISSUE_TEMPLATE/review-request.yml) if you want
something checked but have no objection yet. Being outside the project does
not weaken your standing: the process has the same requirements for everyone
([disputes](corrections-and-disputes.md#disputed-interpretations)).

## What a review means

A review from an `external` reviewer is recorded as an external review of the
stated scope. It does not make the repository independent, and it does not turn
project-authored work into independent work.

## Where reviewers are expected to get stuck, and what to do

- If the cited source needs a login or is unavailable, mark the source
  unverifiable and outcome out of scope. The record may be demoted.
- If the record uses terms you cannot find defined in this repository, report
  it as a documentation defect.
- If the only way to assess an expectation seems to be running a scanner, the
  expectation is probably not authored from evidence; report that.
