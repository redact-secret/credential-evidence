# 0014. An evidence entry splits on distinct reasons

- Status: accepted
- Date: 2026-10-03
- Issue: #76
- Amends: ADR 0005 (how the importer groups fixtures into evidence entries) and the `fixture-reason-collapsed-to-case` parity rule (ADR 0006)

## Context

The cases importer builds one evidence entry per legacy imported case (suite, group, role, outcome, tier) and kept one rationale on it: the most frequent `assessment.reason` of its fixtures. That assumed the other wordings repeat the same reason. At legacy `1020d2b5` the 10 new `stripe-token-policy-org-*-control` fixtures out-voted `stripe-token-mask`, `-reference` and `-label-prose` (10 to 3), so those three carried the `sk_org_` floor wording. Evidence class and outcome were unchanged; the rationale prose was wrong, and the parity rule could not tell a repeated wording from a distinct reason.

## Measurement

At `1020d2b5` the first import collapsed 875 `assessment.reason` variants in 409 imported cases:

| Variants | Count | What they are |
| --- | --- | --- |
| "Negative twin of `<positive>`: `<mutation>`. ..." | 840 | One twin template rendered per fixture; the positive and the mutation are already structural (`lineage`). Repetition. |
| Other wordings in a `base` case | 32 | Distinct: per-family contract wording (Datadog, Twilio, Heroku, Travis CI), "Malformed-by-construction control" next to "Public identifier constructed..." (12 families), relabelling notes citing a decision record, and the Stripe mask next to the `sk_org_` floor. |
| Other wordings in a `control` case | 3 | Distinct: relabelling notes (Daytona, Cerebras, RunPod). |

So 840 of 875 are repetitions and 35 are substantively distinct. No twin case held a non-twin wording.

## Decision

Option 1 of the issue, keyed inside the imported case rather than on it. Fixtures of one imported case are partitioned by reason (`groupByReason`): every "Negative twin of `<positive>`: ..." wording is one repetition group, and any other normalized wording is its own group. Each group becomes one evidence entry (its own basis rationale, sources and date, computed from its fixtures). The imported case, its classification, the Case/Scenario it projects, fixture ids, set membership and the legacy map are untouched; only the `evidence` key a fixture cites can change. The Case-level expectation (basis, sources, date) is still computed over all fixtures of the imported case, so Case records are byte-identical.

Option 2 (a per-fixture override) is not needed and no schema changes. Option 3 was rejected: the wrong prose is recoverable at no schema cost.

The parity predicate `reason-collapsed-to-case` is tightened without adding a rule. A projected reason is explained when it equals the fixture's own legacy reason (normalized, or its clipped prefix, after an importer basis note). The only legitimate collapse left is a repetition: the fixture's own wording and the entry's are both twin-template renderings and the entry's is a legacy reason of a peer. A distinct reason that took another fixture's wording is now unexplained.

## Consequences

- Reasons collapsed: 875 to 840 (repetitions only); 35 distinct reasons are kept as their own entries.
- Evidence entries (global distinct keys): 1,180 to 1,187. In the 98 set files, 51 of 5,950 fixtures cite a different evidence key; 8 keys are new and 6 gone (the rest reuse an existing key whose content is identical, for example the three Stripe controls move to `ev-5ee3151b93`). No evidence class (basis) changes for any fixture; no outcome, span, fixture id, Case or Scenario changes.
- `ev-b6fa413b1d` (the `sk_org_` floor wording) is unchanged and is cited only by the 10 floor controls.
- Parity: 0 unexplained, 21 rules, none added. `fixture-reason-collapsed-to-case` 1,214 to 1,171 values; `assessment-sources-case-union` 824 to 648 (a split entry cites only its own fixtures' sources); `assessment-sources-empty-marker` 31 to 34.
- Digests: the materialization digest (`d4ac653b...`) and the credential-eval snapshot corpus digest (`sha256:66dcb94b...`) are unchanged: neither carries a rationale or an evidence key. The records-tree digest, the projection digest and the records bundle change, so the next release manifest differs from `snapshot-2026.10.01.2` (which is immutable and unaffected) in those. No release is cut by this change.
- Residual lossy case: a twin entry's rationale names one positive's wording; the others stay in the legacy corpus and in `lineage`.
