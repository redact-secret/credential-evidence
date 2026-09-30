# Corrections, staleness, historical revisions, and disputes

## Corrections

Anyone may report that a claim, source reading, case, or expectation is wrong.

- A correction is a public change. It states what was wrong, what is now
  claimed, the evidence for the change, and which cases, contracts, or exports
  depended on the old claim.
- A correction that changes meaning is not applied by overwriting. The old
  claim is kept as superseded with the reason, the correction date, and a link
  to the change. Consumers can then see that a change happened and what it was.
- A typo or formatting fix does not need a supersession record.
- Corrections are credited to the reporter, unless they ask otherwise.
- A correction discovered to affect a scanner-neutral expectation is labeled in
  the change so downstream repositories can find and re-run affected work.
- Maintainers do not delete a claim to hide that it was wrong. The exceptions
  are in [historical revisions](#historical-revisions).

## Source staleness

Staleness is a property of the observation, not of the claim.

- Every source carries an observed-at date: when someone last confirmed that
  the source said what the record says.
- An old date does not make a claim false. A stale source may still be valid
  historical evidence, for example a documented format that was later replaced.
- A claim about the provider's **current** behavior whose observed-at date is
  older than 12 months is marked stale. The 12-month period is a proposed
  starting point and may be changed by pull request under
  [GOVERNANCE.md](../../GOVERNANCE.md#changing-this-policy).
- A claim about a **past** format, backed by a durable reference (an archived
  copy or revision permalink) that says what it said at that time, is not
  subject to the staleness period.
- Marking a claim stale does not change its class. Re-checking it does one of
  three things, and records the new observed-at date and the person who did it:
  - the source still says it: the observed-at date is updated;
  - the source changed: the claim is corrected, or split into a past claim and
    a current claim;
  - the source is gone: the claim is demoted per
    [demotion](evidence-classes.md#demotion) unless a durable reference
    exists.
- A stale claim that nobody re-checks stays visible as stale. A consumer that
  hides staleness misrepresents the record.
- Freshness is not corroboration. A recent observed-at date does not raise a
  claim's class.

## Historical revisions

- Records are append-only in meaning. Earlier versions of a claim, case, or
  contract stay reachable through version control and through supersession
  records.
- A credential family's format can change over time. Each format version is
  its own claim with the period it applies to, so a change is a new claim and
  not an edit of the old one.
- The permitted reasons to remove content from history or from the current tree
  are limited to those in [safety](safety.md) (real credentials or personal
  data) and legal takedown. Removal is recorded in a public notice that says a
  removal happened and why, without the removed content.
- An exported artifact records the source revision it was generated from, so
  that a past export can be tied to the state of the record at that time.
- Old records are not reinterpreted under a new schema without a recorded
  migration ([ARCHITECTURE.md](../../ARCHITECTURE.md#versioning)).

## Disputed interpretations

A dispute exists when a person with a stated basis disagrees with a claim, a
reading of a source, or a case's expectation, and the disagreement is not
resolved by a simple correction.

How a dispute works:

1. **Open.** Anyone opens a dispute using the
   [dispute template](../../.github/ISSUE_TEMPLATE/dispute.yml). It states the
   claim disputed, the alternative interpretation, and the evidence. Being a
   contributor, a maintainer, or an outsider does not change what is required.
2. **Mark.** A maintainer acknowledges it and labels the disputed record as
   disputed with a link to the issue. Whether the claim's class changes
   depends on the dispute:
   - if it challenges what the source says or whether the source qualifies, the
     claim is demoted to `unresolved` until settled;
   - if it challenges a conclusion that follows from a sound source, the class
     stays and the dispute is shown beside it.
3. **Discuss.** Both interpretations, with their evidence, stay visible. Neither
   is deleted or rewritten to look like the consensus.
4. **Resolve.** A dispute is resolved by:
   - new evidence that settles it (the resolution states which evidence);
   - the disputer withdrawing it, with the reason;
   - a [`project-policy`](evidence-classes.md#project-policy) decision, when the
     facts cannot settle the question and an expectation is needed. It is
     labeled as policy and records the dissent.
5. **Record.** The outcome, date, and participants are recorded on the
   resolved record. A resolved dispute is not deleted.

Rules:

- A dispute is not settled by counting votes, by seniority, or by what a
  scanner does.
- A dispute against project-authored work is handled by the same process. A
  maintainer whose work is disputed does not decide it alone.
- If the project cannot resolve a dispute, it stays open and visible. An open
  dispute is an acceptable state.
- A dispute about safety (a value that may be real) is not handled in public;
  follow [SECURITY.md](../../SECURITY.md).
