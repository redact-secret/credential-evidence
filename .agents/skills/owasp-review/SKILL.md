---
name: owasp-review
description: Review credential-evidence validators, generators, importers, and exporters against applicable OWASP guidance and the repository's evidence trust model. Use for secure-design reviews. Read-only.
---

# OWASP review

Review the repository's own tooling and contribution surfaces. Start with
`ARCHITECTURE.md`, `SECURITY.md`, schemas, and the scoped implementation.

Assess untrusted structured-data validation, reference and path containment,
archive handling, remote-source fetching, template/output encoding, denial of
service, CI permissions, dependency integrity, error/log redaction, and
provenance or authorship spoofing. Include integrity controls that prevent
scanner output or generated fixtures from silently becoming canonical facts.

Report each applicable control as `pass`, `fail`, or `not assessable` with
file/line evidence. Separate application-security controls from evidence
quality: an unsupported claim is a governance/data-quality issue unless it
also bypasses a security boundary.

Do not edit records or judge scanner detection quality.

