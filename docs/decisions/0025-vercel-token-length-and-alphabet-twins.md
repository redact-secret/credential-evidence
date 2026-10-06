# 0025. Vercel vca_, vcr_ and vcp_ length and alphabet twins

- Status: accepted (decided by the repository owner as the sole maintainer, ADR 0020; the decision is a `maintainer-only` act, never `reviewed`)
- Date: 2026-10-06
- Issues: credential-evidence#257 (the question, raised from a consumer replay of `snapshot-2026.10.06.2`)
- Deciding maintainer: Milo Kang (GitHub `milocosmopolitan`), the repository owner, who instructed an agent on 2026-10-06 to work #257. Recorded by an AI agent on the owner's instruction.
- Inputs: the issue text, the contracts `vercel:app-access-token@1`, `vercel:app-refresh-token@1` and `vercel:personal-access-token@1`, the pages and rule files read raw on 2026-10-06 and cited below, [ADR 0022](0022-polar-boundary-and-identifier-expectations-not-assertable.md), [ADR 0024](0024-residual-review-debt-and-polar-closure.md) item 2

## Context

Each of the three families has four `must-not-flag` twins that a consumer reads as failures: a 55-character body, a 57-character body, a body with `-` and a body with `_` (12 fixtures). They rested on the contract claims `field-body` ("exactly 56 [A-Za-z0-9]") and `field-alphabet-bound`, both typed `provider-documented`. The question is whether any Vercel statement supports either. The product's handling of these inputs (a security-first fallback) is product behavior and does not enter canonical evidence.

## What the sources say (shape only)

| Source (pinned or observed 2026-10-06) | Owner | What it supports | Rule or example |
| --- | --- | --- | --- |
| vercel.com/changelog/new-token-formats-and-secret-scanning | Vercel | prefixes `vcp`, `vci`, `vca`, `vcr`, `vck` per credential type; no length, no alphabet | statement (prefix only) |
| vercel.com/docs/accounts/access-tokens | Vercel | personal access tokens begin with `vcp_`; the request example is a 24-character placeholder | statement of the prefix; the placeholder is not a length |
| vercel.com/docs/sign-in-with-vercel/tokens | Vercel | `vca_` and `vcr_` examples, one shared 56-character alphanumeric body | example |
| vercel.com/docs/cli/global-options | Vercel | a `vcp_` example with a 56-character alphanumeric body ending in the word EXAMPLE | example, hand-written |
| authorization-server API and create-auth-token pages | Vercel | `vca_...` and `vcp_` prefixes only | prefix |
| vercel/vercel-azure-devops-extension `index.ts` | Vercel (code) | masks `vcp_` and `vca_` followed by `[A-Za-z0-9_-]+`, no length | code of a masker, not a format statement |
| Kingfisher `vercel.yml` at `88d3f78` | MongoDB | `vcp_`, `vca_`, `vcr_` followed by 50 of `[A-Za-z0-9_-]` and 6 of `[A-Za-z0-9]` | scanner rule |
| Betterleaks `vercel.go` at `2a387a5` | Betterleaks | the same prefixes followed by 56 of `[A-Za-z0-9_-]` | scanner rule |
| CredSweeper `config.yaml` at `1aa6046` | Samsung | `vcp_` followed by 56 of `[0-9A-Za-z]`, no `_` or `-` after it; no rule for `vca_` or `vcr_` | scanner rule |

Answers to the points of the issue:

1. **No Vercel page states a length or an alphabet.** "Exactly 56" rests on one provider example per class and on three rules (two for `vca_` and `vcr_`). Kingfisher and Betterleaks reproduce the documented `vca_` example value, so their agreement on that example is not independent evidence.
2. **Class.** A provider example is not a statement of a rule, so it cannot make a claim `provider-documented`. Three artifacts by different maintainers that agree on 56 meet the `tool-corroborated` bar for the length (consistency, not a Vercel rule). The alphabet is disputed by the artifacts themselves and by a provider-owned masker, so it is `unresolved`.
3. See the decisions below.
4. The product's fallback is not described in a Case or a fixture rationale: what a product does with an input is not evidence.

## Decisions

| Twin | Fixtures | Decision |
| --- | --- | --- |
| 55-character body | `vercel-<class>-body-55-twin` (3) | **Kept** `must-not-flag`, `tool-corroborated`. A shorter value is a truncated near-miss, and three rules by different maintainers fix 56 characters after the prefix; the corroboration rule of the evidence classes is met. The wording stays consistency, not a Vercel rule. |
| 57-character body | `vercel-<class>-body-57-twin` (3) | **`not-assertable`**. It is a well-formed token with one character more, the case that ADR 0024 item 2 leaves unresolved for every provider (ADR 0019 item 3: a value padded so the secret bytes stay intact may be a partial leak), and no Vercel page states a length. |
| `-` and `_` in the body | `vercel-<class>-hyphen-in-body-twin`, `-underscore-in-body-twin` (6) | **`not-assertable`**. Two of three rules and Vercel's own masker admit both characters, one rule and every example exclude them, and no page states an alphabet. |

Nine fixtures change, three stay. Each moved fixture keeps its identity, input bytes and lineage; its expectation moves from silence to unresolved, so no outcome is asserted. The contracts get revision 2: `field-body` and `field-alphabet-bound` are replaced by `field-length` (`tool-corroborated`) and `field-alphabet` (`unresolved`), and the descriptive pattern of revision 1 (which asserted both) is not carried over.

## Dissent and reversing evidence

- Keeping the 55-character twin: the argument against is that Vercel never states a length, so a 55-character body could be a token of another era, as ADR 0022 allowed for Polar. Reversing evidence: a Vercel statement or a dated issuance that shows another length, after which the twin moves to `not-assertable`.
- Moving the 57-character and alphabet twins: the argument against is that a corpus asserting nothing here leaves a real leak path unmeasured. Reversing evidence: a Vercel statement of the length or of the alphabet (then `provider-documented`, and the twins return to `must-not-flag` or the positives widen), or a cross-provider boundary policy adopted by the owner.

## Consequences

- The next snapshot differs from `snapshot-2026.10.06.2` in nine cases: each keeps its kind (`must-not-flag`) but moves to not-assertable (tier T0, class `unresolved`), so a consumer scores none of them. Nothing is added or removed; the review state is unchanged. No snapshot is cut by this ADR and no consumer pin moves.
- A consumer that scored these nine as failures or passes must replay on the next snapshot: a score is not comparable across the two without it. The `twinFailures` of the three families fall by the moved twins; the three 55-character twins remain.
- Baseline records amended and declared: `records/fixtures/vercel.json`, the plan `records/fixture-plans/unsettled-evidence-inputs.json` (the three families join its list) and five re-read sources (the others read are not import-baseline records). The reviews of the three families gain an event citing this decision.
- #257 closes with this ADR.
