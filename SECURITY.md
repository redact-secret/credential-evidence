# Security policy

Report suspected vulnerabilities or accidental credential exposure privately
through GitHub Security Advisories for
`redact-secret/credential-evidence`. Do not place secret material in a public
issue, pull request, comment, or example.

## Forbidden material

Never commit active credentials, revoked-but-real credentials, production or
incident logs, customer data, personal data, private provider material, or
unsanitized prompt/tool payloads. Rotation does not make a real credential safe
to publish.

## Safe evidence

Prefer grammars, redacted structural descriptions, unmistakably synthetic
values, and provider-published test values with provenance. Evidence should
publish only what is necessary to support detection research and must not add
unnecessary attacker-useful detail.

A scanner disagreement is not a security vulnerability in this repository.
Schema bypasses, unsafe generation, provenance spoofing, path traversal in
validators/exporters, and accidental real-secret inclusion are in scope.

Include the affected revision/path, impact, and a reproduction that does not
reveal the sensitive value. Maintainers will coordinate rotation and history
remediation privately when required.

