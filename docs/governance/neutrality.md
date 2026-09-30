# Neutrality

## Wording

The repository is maintained by the Redact Secret project, and public text
must say so wherever it describes the repository's credibility.

Allowed:

- "Maintained by the Redact Secret project."
- "Expectations are scanner-neutral: they name no scanner and are not derived
  from scanner output."
- "Reviewed by <name>, who is not affiliated with the Redact Secret project."
  (only when true and recorded; see [attribution](attribution.md)).

Not allowed for project-maintained material:

- "independent", "third-party", "unbiased", "impartial", "vendor-neutral",
  "community-owned", "industry standard", "authoritative benchmark";
- any ranking, "best", or "most accurate" claim about any scanner;
- "validated" without naming who validated what and against which source.

"Scanner-neutral" describes how expectations are authored. It does not describe
who maintains them. A page must not use one to imply the other.

If governance later moves to a body outside the Redact Secret project, this
page changes in the same pull request that records the move, not before.

## Disclosure placement

The disclosure sentence appears in the README, in GOVERNANCE.md, and on any
public rendering of this data that describes its credibility. A downstream
site or export that drops it misrepresents the source; report it with the
[dispute template](../../.github/ISSUE_TEMPLATE/dispute.yml).

## Tool-neutral expectations

An expectation is tool-neutral when all of these hold:

1. It states a semantic outcome and not a scanner behavior.
2. It does not name a scanner, detector, rule, or product support state.
3. Its justification is a source, a construction argument, or a recorded
   project-policy decision, and never "scanner X does this".
4. It was written before, or independently of, any scanner observation of the
   same fixture. Version control history is the evidence of ordering.
5. It would remain meaningful if any one scanner, including Redact Secret, did
   not exist.

An expectation that fails any item is rewritten or demoted to
[`unresolved`](evidence-classes.md#unresolved).

## No scanner consensus as ground truth

- A scanner's output on a value is an observation about that scanner.
- Agreement among several scanners is an observation that they agree. It does
  not establish that the value is a credential, that it is benign, or what its
  format is. Scanners share rule lineage, copy each other's patterns, and share
  blind spots.
- When scanners disagree with a provider-backed expectation, the expectation
  stands and the disagreement is recorded downstream as an observation.
- Scanner output may inform where to look. It may not be the sole basis for a
  claim, and it may not be used to author or edit the expectation for the
  fixture it was observed on.
- The only role scanner artifacts play in evidence is limited
  [tool corroboration](evidence-classes.md#tool-corroborated) of a format
  claim, under the rules there.
- Measuring scanners belongs in `credential-eval`, not here.

## Conflict-of-interest handling

- A maintainer or contributor whose employer or product benefits from a
  specific expectation discloses that on the pull request. See
  [attribution](attribution.md#affiliation-disclosure).
- A change that would move a Redact Secret result in either direction states so,
  and is reviewed by someone who is not the author.
- Redact Secret's detectors, support states, and release gates are not inputs
  to any evidence decision here.
