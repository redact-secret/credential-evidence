# 0013. A twin takes its positive's family in the corpus snapshot

- Status: accepted
- Date: 2026-10-03
- Issue: #78
- Amends: ADR 0009 and ADR 0012 decision 4 (what the credential-eval snapshot carries as `grouping.family`)

## Context

In `snapshot-2026.10.01.2` a case carries `grouping.family` only when the fixture has exactly one family. A twin (a `must-not-flag` mutation of a `must-flag` positive) often has no family of its own, so credential-eval cannot scope its control and reads any finding as `flagged`. A twin whose value wears another provider's key class (an `sk-ant-api01-` value twinning an `sk-ant-admin01-` positive) is found by that other provider's detector, which is correct behaviour, and was scored as a failed twin. The legacy benchmark scoped such a twin by the contract of the positive it twins and read the finding as co-detected.

## Decision

In the snapshot, a case with a `twin` field and no `grouping.family` of its own takes the `grouping.family` of the positive named by `twin.twin_of`, when that positive has one. It is done in `buildCorpusSnapshot` (`scripts/export/lib/projection.mjs`), after every case is built, so it never depends on record order.

- A twin that already carries its own single family keeps it.
- A twin whose positive has no `grouping.family` stays family-less. The snapshot never invents a family: a positive with several families (or none) has none to hand on.
- Twins without a `twin` field (twins of an unresolved T0 positive, ADR 0012 decision 2) are not touched.
- Nothing else changes: no evidence class, kind, tier, expected span or outcome, and no case is added or removed. The records and the legacy projection (`benchmarks/fixture-index.json`, whose `familyIds` still mirror legacy) are unchanged. Parity stays at 0 unexplained with no rule added or changed; its report differs only by the projection digest.

## Consequences

- Measured on the records of this change: 6 twins gain a family, not the 22 the issue expects. The issue counts the 22 twins that carry no family; 16 of them twin positives that have none (14 mailgun triplet twins whose positives have three families, and two `base62` cross-provider twins) and so stay family-less under this rule, as they are in the legacy snapshot. The 6 are the ones the issue's table names: `anthropic-admin01-key-api01-prefix-twin` and `-api03-prefix-twin` (`anthropic:admin-api-key`), `anthropic-api01-key-admin01-prefix-twin` and `-api03-prefix-twin` (`anthropic:compliance-access-key`), `elevenlabs-api-key-stripe-shaped-twin` and `-stripe-test-shaped-twin` (`elevenlabs:api-key`). Scoping the 16 would need a rule for twins of multi-family positives, which is a separate decision.
- The credential-eval snapshot corpus digest changes (`sha256:1bc5a07b...` to `sha256:66dcb94b...`), and so do the release manifest, its digest and the projection digest. A release carries the change only under a **new** tag; `snapshot-2026.10.01.2` is immutable (ADR 0011). Consumers repin to that new tag and manifest digest. No release is cut by this change.
- `docs/migration/dual-run-report.md` records the earlier snapshot digest and was not re-run (not in CI).
