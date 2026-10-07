# Contributing

`credential-evidence` accepts source-backed, scanner-neutral knowledge about
credential families and detection cases. Read `README.md`,
`ARCHITECTURE.md`, and `CONVENTIONS.md` first.

This repository is maintained by the Redact Secret project. Its policies are in
[GOVERNANCE.md](GOVERNANCE.md) and [docs/governance/](docs/governance/README.md):
read the disclosure before contributing, and note that contributions are
described accurately (project-authored work is never called independent).

## Where to start

| I want to... | Use |
| --- | --- |
| Ask for a new credential type to be supported (first time) | core's [Request sensitive-data support form](https://github.com/redact-secret/redact-secret/issues/new?template=request-detector.yml), the one route; see [contribution handoff](docs/contribution-handoff.md) |
| Propose a source-backed fact | [source issue form](.github/ISSUE_TEMPLATE/research-source.yml) |
| Propose a case | [case issue form](.github/ISSUE_TEMPLATE/case-proposal.yml) |
| Report an error or stale source | [correction form](.github/ISSUE_TEMPLATE/correction.yml) |
| Challenge an interpretation, class, or neutrality claim | [dispute form](.github/ISSUE_TEMPLATE/dispute.yml) |
| Review something, with no product knowledge needed | [external review guide](docs/governance/external-review.md), [review form](.github/ISSUE_TEMPLATE/review-request.yml) |
| Report exposed credential material | private [security advisory](SECURITY.md), never a public issue |

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

## Handoff to core

The five handoff states (`intake`, `research-needed`, `implementation-ready`, `verification-needed`, `complete`), who
applies each, and what a reviewed handoff records for core are in
[contribution handoff](docs/contribution-handoff.md). A handoff or state word never grants a support status.

## Evidence requirements

For every factual claim, record the source type, URL or durable reference,
observed-at date, and the precise claim supported. Prefer provider-authored
sources. Tool corroboration can supplement provider evidence but cannot replace
it silently. If evidence conflicts or is incomplete, preserve the uncertainty.

Every claim has one [evidence class](docs/governance/evidence-classes.md):
`provider-documented`, `tool-corroborated`, `project-policy`, or `unresolved`.
State which class you believe applies and why. Classes are not product support
states. Scanner output, and agreement among scanners, is never the basis for a
claim or an expectation
([why](docs/governance/neutrality.md#no-scanner-consensus-as-ground-truth)).
Sources go stale: record when you observed each one, and see
[corrections and disputes](docs/governance/corrections-and-disputes.md) for
fixing errors and handling stale or disputed claims.

## Attribution and affiliation

State on the pull request or issue whether you are a Redact Secret project
maintainer, a project contributor, or neither, plus any other relationship
(for example, you work on another scanner) that a reader would want to know.
For cases, also state whether you read Redact Secret detector source, rules, or
tests. This does not disqualify a contribution. See
[attribution](docs/governance/attribution.md) and
[case authorship](docs/governance/case-authorship.md). You are credited by
handle, name, or a durable pseudonym of your choice, and reviewers are credited
the same way.

## Reviewing

You can review without knowing the Redact Secret product; the
[external review guide](docs/governance/external-review.md) lists the checks and
how to record the result. Changes to claims, classes, and expectations need a
reviewer other than the author.

A case must explain the scenario, why it matters, expected semantic behavior,
supporting evidence or project-policy rationale, involved families, and fixture
lineage. Expectations are authored independently of scanner results.

## Safety

Never submit an active credential, a revoked-but-real credential, production
or incident logs, customer data, personal data, or an unsanitized tool/prompt
payload. Describe formats as grammar when possible. Synthetic values must be
clearly constructed and non-issuable; public test values require provenance.
Do not test a value against a provider to see whether it is live. The full rule
is [safety](docs/governance/safety.md).

## Schema and migration changes

Explain compatibility impact, provide an explicit migration for breaking
changes, and keep generated output reproducible. A legacy export may preserve
an old shape but must not dictate the canonical schema.

## Pull requests

The [pull request template](.github/PULL_REQUEST_TEMPLATE.md) carries the
checklist. State the affected provider/family/case IDs, claims added or changed, source
provenance, safety basis for fixture material, validation commands run, and
whether generated artifacts were refreshed. Do not claim scanner support,
independent validation, or product readiness.

