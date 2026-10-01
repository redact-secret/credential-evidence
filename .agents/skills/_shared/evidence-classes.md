# Evidence class decision table

The rules are in [docs/governance/evidence-classes.md](../../../docs/governance/evidence-classes.md);
read it before changing a class. This is only the quick lookup. One class per claim: the
strongest basis it actually satisfies, with all its sources listed. Classes describe how a
claim is supported; they are not `stable`, `provisional`, `pending` or any product state, and
no mapping to one may be written.

| Class | Choose it when | Needs | Never |
| --- | --- | --- | --- |
| `provider-documented` | the issuer's own source states the claim, or a repeatable step follows from its statement | a `provider-documentation` / `provider-sdk-source` source, quote or locator, observed-at, a durable pin if the page changes | a blog, forum, support thread, an example from a public repository, a scanner rule citing the provider |
| `tool-corroborated` | no provider statement, and at least two pinned artifacts by different maintainers are consistent with it | 2+ distinct-maintainer artifacts (a fork or port counts once), pinned or dated, how each is consistent; worded as consistency ("artifacts A and B both treat ...") | scanner output on the fixture being justified; scanner agreement; an artifact by the claim's author or their organisation (Redact Secret detectors included); a claim that the provider said something |
| `project-policy` | facts do not settle it and a maintainer decided | question, options, outcome, reason, deciding maintainer, a non-author reviewer, dissent, what would reverse it | calling it a provider rule; counting it as corroboration of another claim; promoting it by repetition |
| `unresolved` | the source is missing, secondhand, contradicted, stale beyond repair, disputed or unreviewed | what is missing and what would resolve it | the basis of a `must-flag` / `must-not-flag` expectation consumers rely on (outcome must be `not-assertable`, or re-base as `project-policy`) |

## Choosing

1. Is there a provider-authored statement you read? -> `provider-documented`.
2. Else are there two or more pinned artifacts from different maintainers, none yours? ->
   `tool-corroborated`.
3. Else did a maintainer make a recorded decision with a reviewer? -> `project-policy`.
4. Else -> `unresolved` (the default; also the scaffolder's starting state).

## Moving a class

Promotion or demotion is a reviewed change with the old class, new class, evidence and
reviewer recorded; it changes only class and sources, never the claim's wording (a wording
change is a [correction](../../../docs/governance/corrections-and-disputes.md#corrections)).
Demote to `unresolved` when the source changed, vanished or no longer says it; never silently,
never by deleting. The author of the supporting evidence is not the sole reviewer.
An expectation change also needs a review-history event
([ADR 0003](../../../docs/decisions/0003-provenance-observed-at-and-mutability.md)).

## Where the validator enforces it

`provider-documented` and `tool-corroborated` need at least one source; `unresolved` forces
outcome `not-assertable`; a narrative statement of class `provider-documented` needs a
provider-authored citation; an `unresolved` claim cannot support a statement (it may be a
lead); a `historical` claim cannot cite a `live-unpinned` source. Two-maintainer independence
and "who wrote the artifact" are not machine-checked: they are the reviewer's check.
