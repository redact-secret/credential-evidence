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

A Case is reserved for a real reasoning unit (partial-span leakage, reference versus literal, public identifier versus secret, a chunk boundary). A **Scenario** is a reusable semantic scenario whose reasoning is the same for every family it applies to (documentation placeholder, prefix near miss, wrong alphabet). A **fixture plan** declares a family x Scenario (or Case) matrix projection with its generation rule and lineage and asserts nothing itself. The criteria are in `docs/decisions/0007`.

Canonical ids and record paths never contain legacy suite names, beta, milestone or issue coordinates, detector ids, release or migration-source coordinates, and evidence tier or basis is never part of identity. Those live in `externalRefs` and `migration/legacy-map.json`. `npm run lint:identity` enforces this; the imported records from #4 still violate it and are listed in a shrinking baseline until #12 stage B renames them.

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

Until parity is demonstrated and downstream consumers have switched, the existing benchmark repository remains authoritative for current Redact Secret release qualification.

Status after #6: the canonical records exist (#2 to #5) and a deterministic exporter produces the legacy benchmark inputs and the credential-eval corpus snapshot from them (`npm run export:legacy`). At the pinned legacy revision the parity report shows zero unexplained differences (`docs/migration/parity-report.md`). **The cutover has not happened:** no downstream consumer has switched, so no legacy file may be deleted or frozen. What remains, and the cutover rule, are in `docs/migration/cutover.md`.

Migration work is tracked under:

- #1 — migration epic
- #2 — canonical schema / IDs / versioning
- #3 — provider taxonomy / dossier / provenance import
- #4 — first-class Case model and fixture lineage
- #5 — evidence governance and external contribution policy
- #6 — compatibility export and cutover parity
- #12 — correction: no legacy coordinates in canonical identity; Scenario and fixture plans; reclassify the imported cases (stage A: rule, schema, lint, CI; stage B: the data)

## Expected repository shape

The exact layout is not frozen yet, but the intended separation is:

```text
schemas/
  v1/                 # versioned JSON Schemas (draft 2020-12), see docs/decisions/

examples/
  valid/              # synthetic example records, validated by CI
  content/            # synthetic fixture bytes for the examples

records/              # canonical records; layout in docs/decisions/0004
  providers/ families/ contracts/ reviews/ sources/   # taxonomy import (#3)
  cases/<suite>/     # authored Cases: scenario, why it matters, expected outcome, evidence (#4)
  fixtures/<suite>.json  # sharded fixture projections of cases; authored or generated (#4)
  scenarios/ fixture-plans/                           # reusable scenarios and matrix projections (#12)
  variants/ siblings/                                 # reserved

migration/            # legacy-map.json: legacy suite/case/fixture -> canonical record (#12 stage B); validated with records/

dist/legacy-projection/ # gitignored: derived legacy-compatible projection (npm run export:legacy); its manifest is committed in docs/migration/

fixtures/materialized/  # gitignored: executable fixtures materialized from records/ (npm run fixtures:materialize)

scripts/
  validate.mjs        # npm run validate
  lib/validator.mjs
  lib/identity.mjs, lint-identity.mjs, lint/identity-baseline.json   # npm run lint:identity (ADR 0007)
  materialize-fixtures.mjs   # npm run fixtures:materialize: files + manifest for credential-eval
  migrate/            # import-taxonomy.mjs, import-cases.mjs (npm run migrate:taxonomy, migrate:cases); future schema migrations
  export/             # legacy-projection.mjs (npm run export:legacy): legacy-compatible projection + credential-eval snapshot
  parity/             # run.mjs (npm run parity): projection versus the pinned legacy files; rules.json, inventory.json

tests/                # npm test

docs/
  migration/          # generated migration reports
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
npm run lint:identity   # no legacy coordinates in canonical ids and paths; baseline may only shrink (#12)
npm run migrate:check   # both migration regeneration checks (need the pinned legacy checkout)
npm test           # positive and negative cases, imported records, round trips
npm run migrate:taxonomy:check   # regenerate the taxonomy records from the pinned legacy revision and diff
npm run migrate:cases:check      # regenerate cases and fixture sets (runs the legacy generators) and diff
npm run fixtures:materialize     # write fixtures/materialized/ (gitignored) from records/
npm run fixtures:materialize:check   # verify the records, the digest and any existing output
npm run export:legacy            # write dist/legacy-projection/ (gitignored) and docs/migration/legacy-projection-manifest.json
npm run export:legacy:check      # regenerate in memory; fail if the committed manifest or the output differs
npm run parity                   # compare the projection with the pinned legacy files; write docs/migration/parity-report.md
npm run parity:check             # fail on any unexplained difference or a stale report
```

`examples/valid` and `records/` are validated as separate universes, so an
illustrative example may reuse the id of a real record. The taxonomy and case imports need
a checkout of `redact-secret-benchmarks` (`--legacy <path>` or
`LEGACY_BENCHMARKS_DIR`; a sibling directory is found automatically) and reads
only commit `ade8a10bd7922765110a68986b0690eb3861f2e5` of it. Tests that compare
against that checkout skip when it is absent unless `REQUIRE_LEGACY=1`.

The model and its rules are recorded in `docs/decisions/0001` to `0007` (0007 corrects parts of 0001 and 0005); what the imports kept, dropped and could not map is in `docs/migration/taxonomy-report.md` and `docs/migration/cases-report.md`.

Cases are the human unit (`records/cases/`); fixtures are their executable
projections (`records/fixtures/`). A fixture set is either authored (hand-written
inputs) or generated (the recorded output of a documented generation rule, never
canonical). `npm run fixtures:materialize` turns them into plain files and a
manifest so a consumer such as credential-eval needs no case semantics; see
`docs/decisions/0005-cases-and-fixture-sets.md`.

## Public future

The long-term public surface is expected to be `credential-evidence-site`, eventually served from `redactsecret.com`.

The site is a consumer of this repository, not the owner of the facts.

## Status

Late migration phase: canonical records, governance, compatibility export and parity proof exist; downstream cutover is pending (`docs/migration/cutover.md`).

Do not treat the current repository structure as stable until the migration epic closes.
