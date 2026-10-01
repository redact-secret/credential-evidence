---
name: promote-finding
description: Promote a researched credential fact or case from unresolved evidence to a reviewed canonical proposal with explicit provenance and safety checks. Use when asked to advance or promote an evidence finding.
---

# Promote an evidence finding

Identify the provider, credential family, claim or case, and current evidence
class. A scanner observation alone is not promotable evidence.

Require the exact proposed claim, provider-authored or otherwise classified
sources, observed-at dates, conflicts and open questions, reviewer context, and
a safety assessment. For a case, also require scanner-neutral expected
behavior and fixture lineage. Re-check that every credential-shaped value is
synthetic or a documented public test value.

Update canonical records only when the user requested the promotion and the
current schema supports it. Preserve old meaning through history or migration;
do not overwrite conflicting evidence without recording the conflict. Regenerate
derived artifacts with the repository's actual tools and validate references.

The result must say what is established, what is inferred, what remains
unresolved, and why the evidence class changed. It must not assign product
support status or claim independent validation.

The pull request this produces is checked by [`review-research-pr`](../review-research-pr/SKILL.md),
the reviewer-side counterpart; run `npm run review:check -- <base>..<head>` on it before
requesting review. That check never counts as the independent review the promotion needs.
