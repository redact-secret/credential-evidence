---
name: release-regression-check
description: Compare two pinned credential-evidence snapshots and verify schema compatibility, semantic stability, lineage, provenance, and deterministic exports before publication. Use for evidence snapshot release checks.
---

# Release regression check

Require immutable baseline and candidate revisions. Validate each with the
tools present in that revision, then generate comparable snapshots from clean
trees.

Compare provider/family/case identities, claim meaning, evidence classes,
source references, observed-at values, expectations, authored/generated
lineage, schema versions, and export digests. Classify removals, ID changes,
meaning changes, lost provenance, broken lineage, newly unresolved conflicts,
and serialization-only changes separately.

A changed generated fixture is acceptable only when its source case/contract,
generation rule, and generator identity explain it. Re-run exports to detect
nondeterminism. Scan candidate additions for forbidden real material without
printing any match.

Report pinned revisions, validation completeness, semantic changes, migration
requirements, deterministic-export result, and affected IDs. This workflow
checks evidence publication; it does not compare scanner quality.

