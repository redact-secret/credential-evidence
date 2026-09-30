# Case authorship

A case is authored reasoning about why a scenario matters and what the expected
semantic outcome is. Who wrote it changes how it may be described.

## Two kinds

| | Project-authored | Independently contributed |
| --- | --- | --- |
| Author affiliation | `project-maintainer` or `project-contributor` | `external` |
| Described as | "project-authored" | "contributed by <attribution>" |
| May be described as independent | never | only for the parts as submitted, and only per the rules below |
| Reviewed by | someone other than the author | someone other than the author and other than the maintainer who merges when practical; see [review independence](attribution.md#review-independence) |

## Project-authored cases

- Are labeled project-authored wherever they are shown.
- Are never described as independent evidence or independent validation, even
  when reviewed by an external reviewer. The review is recorded as a review.
- Follow every rule in [evidence classes](evidence-classes.md), including
  independence of expectations from scanner output.
- Disclose implementation exposure, since Redact Secret authors normally know
  the detectors.

## Independently contributed cases

A case qualifies as independently contributed only when all of these hold:

1. The author's affiliation is `external`.
2. The author disclosed implementation exposure.
3. The author states how the expectation was derived, and that no scanner's
   output was consulted for it.
4. The submitted expectation is recorded before any scanner observation of the
   case. Version control history is the evidence.
5. The contributed synthetic material passes the [safety rule](safety.md).

Independence here is about authorship of the submitted case. It does not make
the repository independent, and the case's evidence class is decided by its
sources like any other.

## Maintainer edits to a contributed case

- A change that alters an expectation, the fixture material, or the reasoning
  is a **material** edit. After a material edit the case is described as
  "adapted from a contribution by <attribution>" and is treated as
  project-authored from that revision on. The original submission remains in
  history and stays attributed.
- A change that fixes a typo or formatting, or adds a source that leaves the
  expectation unchanged, is not material. It is still recorded.
- If a maintainer thinks a contributed expectation is wrong, they open a
  dispute with the contributor rather than editing it silently. Preferred
  outcomes are: the contributor revises it, the contributor submits a new
  case, or the maintainer records a separate project-authored case with its own
  reasoning. See [disputes](corrections-and-disputes.md#disputed-interpretations).
- Rejection of a contributed case states which rule it failed. It is not
  rejected because a scanner behaves differently on it.

## Expectations and scanner results

- The expectation for a case is authored from the sources and from how the
  fixture values were constructed.
- If a scanner later handles the case differently, that is an observation for
  downstream repositories. It does not amend the case.
- A contributor's expectation is not adjusted to match the maintainers' own
  tooling.

## Lineage

Executable fixtures generated from a case name the case they came from, and
generated fixtures are marked generated. The authorship label of a fixture is
the label of the case or contract it derives from.
