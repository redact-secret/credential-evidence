# 0003. Provenance, observed-at and mutability

- Status: accepted
- Date: 2026-09-30
- Issue: #2 (part of #1)

## Context

Legacy data records research dates (`researchedAt`), pinned evidence for past
states (dossier `evidence` must be a 40-hex commit link), review dates and
observation runs. The rules for those were spread across TypeScript checks. The
canonical model must state them once and keep freshness separate from truth.

## Decision

### Four different times

| Field | Meaning | Who sets it |
| --- | --- | --- |
| `observedAt` | When a person or tool actually read or re-confirmed the source or claim | the observer, at the time of the read |
| `publishedAt` | Date the source itself claims, or `null` | copied from the source |
| `occurredAt` / `validity.from`, `validity.until` | When a fact held at the provider | from the evidence; `null` means unknown or unbounded, never "today" |
| review event `at` | When a review decision was made or the reviewed evidence was observed | the reviewer |

Rules: `observedAt` is never advanced without a real re-read, and a scanner
observation never updates it. It is a `YYYY-MM-DD` date or an RFC 3339 UTC
timestamp ending in `Z`; offsets and free text are rejected. Legacy imports that
only know a date use the date form and say so in a note. A stale `observedAt`
does not invalidate a claim: freshness and validity are separate, and a
historical claim can rest on an old source.

### Claims

A `supportedClaim` (used in contracts) states one claim with `evidenceClass`,
`temporality` (`current` or `historical`), `observedAt` and `sources[]`. Each
`sourceRef` says what the source is cited for (`supports`), optionally where
(`locator`). `provider-documented` and `tool-corroborated` claims need at least
one source.

### Pinned links

`evidence-source.locator` is a `pinnedLink`: a URL plus a `pin` of one kind:

- `commit-permalink` (40-hex commit),
- `archive-snapshot` (archive URL, optional capture time),
- `content-digest` (sha256), or
- `live-unpinned` (content that can change).

GitHub `blob`, `tree`, `raw` and `raw.githubusercontent.com` URLs cannot be
`live-unpinned` (schema rule). A `historical` claim may not cite a `live-unpinned`
source (validator rule), because a moving page cannot prove a past state.
`live-unpinned` is acceptable for a current fact and its `observedAt` then
carries the freshness. Legacy dossier `evidence` links map to
`commit-permalink` pins unchanged.

### Immutable vs mutable

- Immutable once `lifecycle` is `reviewed`: `format-contract` revisions. A
  correction is a new revision with `supersedes`, never an edit.
- Append-only: `evidence-source.observations`, `variant.history`,
  `evidence-review-history.events` (strictly increasing `seq` from 1, no gaps;
  the validator checks it). Mistakes are fixed by a later `corrected` event.
- Mutable descriptive records: `provider`, `family`, `benign-sibling`, `case`
  text. Git history is the change record, and any change to an expectation
  (`case.expectation`) must be accompanied by a review-history event so the
  reason is visible in evidence, not only in the diff.
- Derived: `fixture-projection`. It may be regenerated at any time; its origin
  and generator version say how, and it is never the canonical human record.
- Records are withdrawn (`lifecycle: withdrawn`), never deleted, once anything
  can cite them. A withdrawn id is not reused.
- An immutable record is enforced by review and CI comparison against the base
  branch (governance, #5); v1 validates shape and cross-references only.

### Review history is about evidence

Event types: `authored`, `observed`, `reviewed`, `disputed`, `resolved`,
`corrected`, `withdrawn`, `superseded`. There is no event or verdict that means a
product status. Every event discloses the actor's `affiliation`
(`project-maintainer`, `external`, `unknown`), so project review is not presented
as independent. Product workflow (issue filed, fix shipped, run ids) can appear
only as `externalRefs` on an event.

## Consequences

- Freshness audits are a query over `observedAt`, not a change to any claim.
- Historical evidence is durable against link rot.
- Immutability of contracts is not enforced by the schema alone; #5 should add
  the base-branch check.

## Open questions

- Whether `content-digest` pins should require an accompanying archive URL.
- Retention of scanner observations: kept out of this repository (measurement
  artifacts own them); only an optional `externalRefs` pointer is allowed.
