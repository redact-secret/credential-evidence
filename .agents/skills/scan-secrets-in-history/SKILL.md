---
name: scan-secrets-in-history
description: Scan credential-evidence's full Git history for accidentally committed real credentials while safely triaging intentional synthetic and public-test fixtures. Report-only and never prints matched plaintext.
---

# Scan secrets in history

Run a history-aware scanner with redaction enabled over all commits reachable
from `HEAD`; record tool version, rule set, and scope.

Every hit requires provenance-based triage. A fixture is expected only when its
record proves synthetic construction or identifies a provider-published test
value. Patterned appearance, revocation, or location under a fixture directory
is not enough. Hits in sources, cases, prose, migration inputs, generated
snapshots, logs, or CI artifacts receive extra scrutiny.

Report commit, path, rule ID, and one disposition: `verified synthetic`,
`verified public test value`, `unclear—maintainer review`, or `needs private
rotation and history remediation`. Never print or partially quote the match.

Do not rewrite history, contact a provider, rotate credentials, or open a
public issue.

