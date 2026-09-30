---
name: scorecard-check
description: Run OpenSSF Scorecard for redact-secret/credential-evidence and turn low scores into repository-specific supply-chain and evidence-integrity actions. Report-only.
---

# Scorecard check

Run Scorecard against `github.com/redact-secret/credential-evidence` when
access permits. Record version, date, repository revision, and unavailable
checks.

Inspect the repository evidence behind low scores: pinned CI actions,
least-privilege permissions, branch protection, review requirements, dependency
updates, SAST, secret scanning, release provenance, and signed publication
artifacts. Give special attention to whether canonical snapshot generation is
reviewed and reproducible.

Mark release-oriented checks not applicable when no release mechanism exists;
do not turn absence in an early repository into a fabricated failure. Route
dependency details to `dependency-audit`, static findings to `sast-sweep`,
and secret-history review to `scan-secrets-in-history`.

Do not change settings or estimate scores that were not returned.

