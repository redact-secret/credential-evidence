# Case, Scenario or matrix projection?

Authority: [ADR 0007 section 3](../../../docs/decisions/0007-identity-correction-scenarios-and-fixture-plans.md)
and [CONVENTIONS.md](../../../CONVENTIONS.md#cases-and-fixtures). Decide in this order and stop at
the first yes.

## 1. Is it a Case?

All five must hold:

1. You can state a failure mode or ambiguity specific to it (partial-span leakage, reference
   versus literal, public identifier versus secret, a chunk boundary, a retired format still in a
   config).
2. Its `summary` and `rationale` cannot be produced by substituting family, carrier or provider
   names into a template.
3. Removing it loses an expectation: no Scenario plus a family list reproduces it.
4. The expectation has its own evidence, or an explicit project-policy decision someone made.
5. It can be named without a coordinate.

If any fails, go to 2.

## 2. Is it a Scenario?

A named semantic situation (documentation placeholder, prefix near miss, wrong alphabet, public
identifier, templated reference) where the same sentence of reasoning holds for every family it
applies to and differs only by the family's own name, prefix or length. Written once; it lists the
families (or free-slug classes) it applies to and carries the basis for the class. No per-family
prose.

If the reasoning is not shared across families, it was a Case after all (criterion 2 or 3 failed
for the wrong reason): re-read 1.

## 3. Otherwise it is a matrix projection

A cell whose only family-specific content is mechanical. Not a record you author prose for: it is
a `fixture-plan` cross product (family x Scenario or Case) with a generation rule, and fixtures
are its executable output. Add the family to an existing plan or Scenario applicability instead
of creating a record.

## Quick table

| | Case | Scenario | Matrix projection |
| --- | --- | --- | --- |
| Reasoning lives | here, per case | here, once | nowhere new: points at the Case or Scenario |
| Family-specific prose | yes | no | no |
| Outcome | `expectation.outcome` | `expectedOutcomeClass` or `by-projection` | per cell, must agree with its target |
| Count scales with | judgement calls | distinct meanings (tens) | derived |
| Command | `record:new -- case` | `record:new -- scenario` | edit a `fixture-plan` |

## Red flags

- A new case per family or per carrier with the same wording: a Scenario plus a plan.
- A new case per evidence tier: tier is data, not identity (change `basis` through a review event).
- Prose that says "the AWS key" in one record and "the Stripe key" in the next with nothing else
  different: Scenario.
- A scenario that needs "except for family X" sentences: split it, or make X a Case.
- Unsure after 1 to 3: write the Case as `draft`, `not-assertable`, say so in `notes`, and let a
  reviewer decide; do not invent a Scenario to avoid the question.
