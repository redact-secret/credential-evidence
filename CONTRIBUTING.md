# Contributing

`credential-evidence` accepts source-backed, scanner-neutral knowledge about
credential families and detection cases. Read `README.md`,
`ARCHITECTURE.md`, and `CONVENTIONS.md` first.

## Ways to contribute

- correct or add provider and credential-family facts;
- add a provenance source and the exact claim it supports;
- document a historical variant or benign sibling;
- author a case with a reasoned semantic expectation;
- add synthetic fixture projections with explicit lineage;
- improve schemas, migrations, validators, or deterministic exporters;
- review stale evidence or record a correction.

Scanner adapters, measurements, and normalized observations belong in
`credential-eval`. Site routes and presentation belong in
`credential-evidence-site`. Product support status belongs with the product.

## Evidence requirements

For every factual claim, record the source type, URL or durable reference,
observed-at date, and the precise claim supported. Prefer provider-authored
sources. Tool corroboration can supplement provider evidence but cannot replace
it silently. If evidence conflicts or is incomplete, preserve the uncertainty.

A case must explain the scenario, why it matters, expected semantic behavior,
supporting evidence or project-policy rationale, involved families, and fixture
lineage. Expectations are authored independently of scanner results.

## Safety

Never submit an active credential, a revoked-but-real credential, production
or incident logs, customer data, personal data, or an unsanitized tool/prompt
payload. Describe formats as grammar when possible. Synthetic values must be
clearly constructed and non-issuable; public test values require provenance.

## Schema and migration changes

Explain compatibility impact, provide an explicit migration for breaking
changes, and keep generated output reproducible. A legacy export may preserve
an old shape but must not dictate the canonical schema.

## Pull requests

State the affected provider/family/case IDs, claims added or changed, source
provenance, safety basis for fixture material, validation commands run, and
whether generated artifacts were refreshed. Do not claim scanner support,
independent validation, or product readiness.

