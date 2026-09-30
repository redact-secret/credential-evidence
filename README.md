# credential-evidence

Canonical, tool-neutral credential knowledge and evidence for the Redact Secret ecosystem.

This repository is being built as the long-term source of truth for **credential families, public format facts, provenance, benign siblings, cases, and scanner-neutral expectations**. It is intentionally separate from the Redact Secret product and from the engine that evaluates scanners.

> Maintained by the Redact Secret project. Evidence and expectations are intended to be tool-neutral. Project-maintained evidence is not presented as independent validation.

## Why this repository exists

Secret scanners usually embed credential knowledge inside detector code. That makes the knowledge hard to inspect, compare, reuse, or challenge independently of one implementation.

`credential-evidence` separates the knowledge from the scanner.

The core model is:

```text
Provider
  └─ Credential Family
       ├─ Format Contract
       ├─ Evidence Sources
       ├─ Variants / History
       ├─ Benign Siblings
       ├─ Cases
       └─ Fixture Lineage
```

Scanner behavior is deliberately not part of that hierarchy.

The same evidence should be useful whether the consumer is Redact Secret, Gitleaks, TruffleHog, flare-redact, OpenRedaction, a future scanner, or a human researcher.

## What this repository owns

This repository is the intended canonical home for:

- provider and credential-family taxonomy;
- public format contracts;
- provider documentation and source provenance;
- historical format variants;
- benign siblings, public identifiers, placeholders, and known lookalikes;
- first-class human-readable cases;
- positive, benign, twin, mutation, and metamorphic relationships;
- scanner-neutral expected behavior;
- authored-versus-generated fixture lineage;
- evidence review history and observed-at timestamps.

## What this repository does not own

This repository does **not** define:

- Redact Secret detector implementation;
- Redact Secret support statuses such as `stable`, `provisional`, or `pending`;
- scanner execution;
- benchmark scoring;
- release blocking policy;
- website presentation code;
- scanner rankings;
- live credential verification.

Those responsibilities belong elsewhere.

## Ecosystem boundary

```text
credential-evidence
        │
        ├──────────────▶ credential-evidence-site
        │                     public knowledge surface
        │
        ▼
credential-eval
        │
        ▼
scanner observations
        │
        └──────────────▶ product-specific qualification
```

`credential-evidence` must remain meaningful if Redact Secret itself did not exist.

That is the primary architectural test for changes to this repository.

## Cases, not just fixtures

An executable fixture is not the highest-level unit of knowledge.

A **Case** explains why a scenario matters.

Example:

```text
Case:
Documentation placeholder under a high-signal credential name

Expectation:
must-not-flag

Why:
The provider documents the value as an example placeholder,
not an issued credential.

Evidence:
Provider documentation

Fixture projections:
- shell assignment
- JSON
- YAML
- logfmt
```

One case may produce many executable fixtures. Generated fixtures must always preserve a link back to the authored case or contract that justifies them.

## Evidence classes

The repository may distinguish evidence quality such as:

- provider-documented;
- tool-corroborated;
- project-policy;
- unresolved / pending research.

A scanner majority vote is never ground truth.

If multiple scanners disagree with a provider-backed expectation, that is an interesting observation, not a reason to rewrite the expectation.

## Security boundary

Never commit:

- active credentials;
- revoked-but-real credentials;
- customer logs;
- real personal data;
- unsanitized prompt or tool payloads;
- secrets copied from third-party incidents.

Credential-shaped examples must be unmistakably synthetic, public test values, or otherwise safe under the repository's contribution policy.

## Migration

This repository is initially migrating knowledge currently embedded in `redact-secret/redact-secret-benchmarks`.

The migration is intentionally not a big-bang cutover.

Until parity is demonstrated, the existing benchmark repository remains authoritative for current Redact Secret release qualification.

Migration work is tracked under:

- #1 — migration epic
- #2 — canonical schema / IDs / versioning
- #3 — provider taxonomy / dossier / provenance import
- #4 — first-class Case model and fixture lineage
- #5 — evidence governance and external contribution policy
- #6 — compatibility export and cutover parity

## Expected repository shape

The exact layout is not frozen yet, but the intended separation is:

```text
schemas/
  v1/                 # versioned JSON Schemas (draft 2020-12), see docs/decisions/

examples/
  valid/              # synthetic example records, validated by CI
  content/            # synthetic fixture bytes for the examples

records/              # canonical records (empty until #3 and #4 import data)

scripts/
  validate.mjs        # npm run validate
  lib/validator.mjs
  migrate/            # future schema migrations
  export/             # future legacy-compatible exports

tests/                # npm test

docs/
  methodology/
  governance/
  decisions/
```

Schemas are versioned contracts. Generated data must never silently become the canonical source.

## Validation

Requires Node 22 or newer. The validator is offline and deterministic.

```bash
npm ci
npm run validate   # schemas, examples/valid and records/: shape, IDs, cross-references
npm test           # positive and negative cases
```

The model and its rules are recorded in `docs/decisions/0001` to `0003`.

## Public future

The long-term public surface is expected to be `credential-evidence-site`, eventually served from `redactsecret.com`.

The site is a consumer of this repository, not the owner of the facts.

## Status

Early migration and schema-design phase.

Do not treat the current repository structure as stable until the migration epic closes.
