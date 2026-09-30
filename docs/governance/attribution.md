# Attribution

Every claim, case, and review is attributed to the people who did the work.
Attribution serves two purposes: giving credit, and letting a reader judge how
much weight a record deserves.

## What is recorded

For each claim and case:

- **Author**: who wrote it.
- **Reviewers**: who checked it, what they checked (their scope), and what they
  concluded.
- **Affiliation**: one of `project-maintainer`, `project-contributor`, or
  `external`, as defined below.
- **Implementation exposure** (cases and expectations only): whether the author
  read Redact Secret's detector implementation, tests, or rules before writing,
  and what they read. Reading it does not disqualify a contribution; it is
  disclosed so readers can weigh it.

## Identity

- Attribute by GitHub handle, real name, organization, or a durable pseudonym
  the person keeps using. A pseudonym must be stable enough that the same
  contributor can be recognized across records.
- No private email addresses or other personal data in records.
- A contributor may ask to change or withdraw their attribution. The change is
  recorded as a correction and does not rewrite history; see
  [historical revisions](corrections-and-disputes.md#historical-revisions).
  Withdrawal cannot remove the record that a contribution was made when the
  contribution remains in the repository.

## Affiliation disclosure

| Value | Meaning |
| --- | --- |
| `project-maintainer` | Has write access to this repository, or is a member of the Redact Secret project team |
| `project-contributor` | Contributes to Redact Secret repositories, or is employed or funded by the project, but has no write access here |
| `external` | Neither of the above |

- Affiliation is self-declared on the pull request and checked by a maintainer
  against public information. It is recorded as of the contribution date.
- Someone who also contributes to another scanner discloses that too. It does
  not change their affiliation value. A field cannot enumerate every conflict,
  so free-text disclosure is expected.
- A missing disclosure is corrected when found. An affiliation that was
  misstated on purpose is grounds to demote the contribution's labeling and to
  reject the contributor's later attribution claims until resolved.

## Review independence

- A change to a claim's class, wording, or a case's expectation needs review by
  someone other than its author.
- For a `project-maintainer` author, at least one reviewer is not the author.
  It is not required that the reviewer is external, and a review by a project
  member is labeled as project review, not external review.
- The label "externally reviewed" is used only when a reviewer whose
  affiliation is `external` recorded a review of that record. It states the
  reviewer's scope, not that the project's work is independent.
- A reviewer does not review their own contribution, or a contribution from
  their close collaborator on the same change, without disclosing the
  relationship.

## Credit for reviews

Review is contribution. A review that identifies a factual error, a stale
source, or a scanner-derived expectation is recorded with the reviewer's
attribution whether or not the change is merged. Reviewers are credited in
the same place as authors.

## Recording review outcomes

A reviewer records one of:

- **confirmed**: checked the stated scope and found it supported;
- **disputed**: found the claim, source reading, or expectation unsupported,
  with the reason (see [disputes](corrections-and-disputes.md#disputed-interpretations));
- **out of scope**: could not assess it, and says why.

A review records its scope. "Confirmed the source says this" and "confirmed the
expectation follows from the claim" are different scopes, and a reviewer may
confirm one only. See [external review](external-review.md).
