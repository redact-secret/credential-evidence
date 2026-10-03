# Representing a transformed credential

Authority: [ADR 0016](../../../docs/decisions/0016-representation-and-lineage-of-transformed-credentials.md) and the
section "Representing transformed credentials" of [docs/authoring.md](../../../docs/authoring.md#representing-transformed-credentials).
When this page and the schema differ, the schema wins and this page is the bug.

Read it before you author any fixture whose value is encoded (Base64, hex), split (line breaks, concatenation, escapes),
altered by invisible or combining characters, chunked (byte or string), placed among filler or repeated.

## The chain

original bytes (an **authored base**) -> transformation (steps on the **projection**) -> decoded bytes
(`decoded.via`, digest and length on the span, equal to the base's value) -> source spans (`expected.spans`, with `fragments`
when the secret is not contiguous).

## Decide first

| Question | Answer | Record |
| --- | --- | --- |
| Is it a value you wrote and reviewed? | an authored base | `record:new -- fixture ... --authored-base` |
| Is it that value changed by a rule? | a projection of it | `--projection-of <base-id>`, `--extra-file` |
| Is the rule a reasoning unit of its own (a failure mode, an ambiguity)? | a Case or Scenario, with evidence | [case-vs-scenario.md](case-vs-scenario.md) |
| Is it only the same reasoning across families, carriers or sizes? | a plan cell, generated | a `fixture-plan` listing the bases as `fixture` inputs |
| Does the surrounding language rebuild the value? | `reconstructs-original`, cited | the Case rationale and its sources |
| Does it not, or is it unsettled? | `inserts-separator` (no spans) or `unresolved` (`not-assertable`) | same |
| Does an interface reject the input before scanning? | `inputValidity` other than `valid`, outcome `not-assertable`, no spans | a Case stating the rejection is neither a hit nor a miss |

## Generated sets pin a main commit

A generator records `generator.sourceRevision`. Run it without `--source-revision` (it records the merge-base with `origin/main`) and rerun it after merging `main`; never pin the branch HEAD or a commit made on the branch, since a squash merge orphans it. Update a hand-written plan's copy of the value too. `npm run lint:source-revision` checks it ([ADR 0005, Addendum 1](../../../docs/decisions/0005-cases-and-fixture-sets.md)).

## Never

- Count generated inputs as samples. Report `npm run report:bases`: independent bases first, generated projections as correlated.
- Strip whitespace or invisible characters globally to make a value valid; say which code points were inserted and which decode step removes them.
- Turn "the decoder succeeded" into a secret. A benign base (a hash, a public sentence, a placeholder) has projections too, with no spans.
- Encode a product behaviour: a decoder, a depth limit, an action or an error code is the owning product's statement, not a fixture fact.
- Add a `lineage` for a projection. `lineage` stays the twin or mutation pair that flips an outcome; a projection names its bases in `derivation`.
- Rely on the private 2026-10-03 reproduction archive. Author the base yourself and state how it was built.

Worked, validated, synthetic examples of every row: `examples/valid/representation/`.
