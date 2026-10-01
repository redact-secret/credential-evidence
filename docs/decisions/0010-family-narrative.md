# 0010. Family narrative: claim-backed prose for credential families

- Status: accepted
- Date: 2026-09-30
- Issue: #16 (part of #1)
- Amends: ADR 0004 (what the import asserts: free-text legacy prose still never populates a descriptive field; a narrative is how reviewed prose enters instead), ADR 0002 (schema revision 1.4.0, additive)

## Context

The taxonomy import (#3) migrated dossier frontmatter and left the markdown bodies of the 93 legacy dossiers (398,584 bytes) out, because copying them would be hand-authored evidence without traceability (ADR 0004). A family record today carries a one-sentence `description`, contracts and claims. What the credential is, how it is issued, what it collides with and why a case is hard exist only at a pinned legacy path. A reader of the canonical data alone cannot answer those questions.

## Decision

### 1. A separate `family-narrative` record, one per family

A new kind, `schemas/v1/family-narrative.schema.json`, stored at `records/narratives/<provider>/<family>.json`. Its `id` equals the family id (the validator enforces it), so a family has at most one narrative and the link needs no lookup table.

It is a separate record, not a field on `family`, for three reasons: the `family` record is the small root entity and stays so; the narrative has its own lifecycle and review history (it is rewritten and reviewed far more often than a family is renamed); and a separate kind is the additive change ADR 0002 prefers, since no existing record has to be reinterpreted.

```
family-narrative
  id, family, lifecycle, contract?        contract = the revision whose claims the narrative cites
  sections: shape | issuance | lifecycle | collisions | openQuestions   (each optional, each a list of statements)
statement
  id, text, evidenceClass, temporality, observedAt
  citations[]  { kind: claim, claimId } | { kind: source, sourceId, locator? }      (cited statement)
  unresolved   { reviewEvent, reason }  and optional leads[]                         (unresolved statement)
```

A statement is exactly one of: **cited** (a class other than `unresolved` and at least one citation) or **unresolved** (class `unresolved`, no citation, and `unresolved.reviewEvent` naming an event in the narrative's `evidence-review-history`, whose `reason` is restated in that event). `leads` are sources that point at an unresolved statement without establishing it; they never count as support. Sections that are absent are not covered; absence is not a statement that nothing is known. The five sections are fixed. `lifecycle` here means how a credential changes over time (expiry, rotation, revocation), not the record's own `lifecycle`.

### 2. What the validator checks

Beyond the schema (`npm run validate`):

- the family exists, `id` equals `family`, the contract exists and belongs to the family;
- every claim citation resolves to a claim of that contract, and an `unresolved` claim cannot support a statement (it can only be a lead);
- every source citation resolves to an `evidence-source`; a `historical` statement cannot cite a `live-unpinned` source;
- a `provider-documented` statement needs a provider-authored citation: a source typed `provider-documentation` or `provider-sdk-source`, or a `provider-documented` claim (`docs/governance/evidence-classes.md`);
- statement ids are unique across the narrative's sections, and every `reviewEvent` exists in the narrative's review history (subject kind `family-narrative`, added to `evidence-review-history`);
- a narrative may be `reviewed` only with a `reviewed` event, verdict `supports`, by an actor who authored no event of that history (`docs/governance/attribution.md`, review independence).

### 3. Migration is by review, never by copy

`scripts/migrate/authored/narratives/<provider>.mjs` holds the hand-authored narratives: statements rewritten in scanner-neutral language, each with its citations. `npm run migrate:narratives` compiles them into `records/narratives/`, `records/narrative-reviews/` and `docs/migration/narrative-report.md`; `--check` fails on drift. The compiler refuses a statement that cites a source the family's own contract does not already cite: a narrative can lean only on sources the taxonomy import recorded for that family, which stops a statement from citing an arbitrary URL. A statement the sources do not support, or whose source the contract does not hold, is written as `unresolved` with a reason.

Every narrative is `draft` and its review history begins with an `authored` event naming the author, disclosing AI assistance, and linking the pinned dossier. One `observed` event with verdict `not-assertable` is appended per unresolved statement. Promotion to `reviewed` is a separate human step by someone who is not the author.

Source types: the taxonomy import types a source from the legacy field that cited it, and 182 sources came out `other`. A statement cannot be `provider-documented` on a source of unknown type, so reading the sources a narrative relies on includes typing them. `scripts/migrate/authored/source-types.mjs` records each reviewed type with its reason; the taxonomy import applies it, and only to a source it left as `other`. It never overrides a role the legacy data stated.

### 4. The narrative lint

`npm run lint:narrative` (also run by `npm run validate`, `npm run check` and CI) fails a narrative that uses benchmark or product vocabulary: legacy suite names, beta, milestone, wave and release coordinates, detector vocabulary, support status words (`support status`, `stable`, `provisional`, `pending`), evidence-tier labels (`T0` to `T3`, `tier`), issue and pull-request references, and the project's own names and artifacts (`Redact Secret`, `benchmark`, `core`, `corpus`, `fixture`, `taxonomy`, `dossier`, `ledger`). It reads the statement text and the reason of an unresolved statement, not citations. Naming a scanner as a source is allowed: "a scanner rule matches X" is evidence. There is no baseline.

### 5. What a narrative does not carry

Verdicts and tiers (already `family.research` and an evidence class), the `Current contract in core` links (product policy), `Research log` entries (issue workflow), per-run or per-scanner state (open pull requests to another scanner, a settled scanner disagreement), and candidates that are not families. `docs/migration/narrative-report.md` counts the first three and lists the rest per dossier.

### 6. Schema revision 1.4.0

Additive: the new kind and `family-narrative` as a review-history subject kind. Every schema carries revision 1.4.0 (one shared revision per major, ADR 0002). Existing 1.1 to 1.3 records stay valid unchanged.

## Consequences

- A reader can answer shape, issuance, lifecycle, collision and open-question for a migrated family from canonical data alone, and can follow every statement to a source or see that it is unresolved.
- The first migration set is five providers, 22 families, 148 statements (57 unresolved). 88 of 93 dossiers are deferred, each listed with its families in the report. Deferral is not a verdict on a dossier.
- The legacy export and its manifest digest change, because the digest covers `records/`; `npm run export:legacy`, `parity` and `dual-run` outputs are regenerated.

## Open questions

- The representative families the site shows are chosen here from what the site is expected to need (a provider with a shared prefix table, a not-found and a rejected family, a context-gated secret); the site owns the final list.
- Whether the lint's "core" and "stable" bans are too broad is decided by what authors hit. A false positive is fixed by rewording, not by an allowlist.
- Review of the 22 narratives is a human step; none is `reviewed`.
