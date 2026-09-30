# ARCHITECTURE

## Purpose

`credential-evidence` is the canonical knowledge layer for credential formats and detection cases.

It exists to separate **what is known about a credential** from **how a scanner implements detection** and from **how a product interprets benchmark results**.

The repository is intentionally designed so that its data can outlive any one scanner.

## Architectural invariant

The root entity is the credential family, not a detector.

```text
Provider
  └─ Credential Family
       ├─ Format Contract
       ├─ Evidence Sources
       ├─ Variants
       ├─ Benign Siblings
       ├─ Cases
       └─ Fixture Lineage
```

The following direction is allowed:

```text
credential-evidence
        ↓
credential-eval
        ↓
scanner observations
```

The reverse is not.

A scanner result must never become the reason that a credential format is considered valid.

## Responsibilities

### Provider and family identity

A provider is a public issuer or logical source of credential families.

A credential family is the stable semantic identity used across evidence, cases, evaluation, and downstream sites.

IDs must be:

- stable;
- URL-safe;
- version-independent where possible;
- independent of any scanner detector name.

A scanner-specific detector mapping is metadata, never canonical identity.

### Format contracts

A format contract captures what can be stated from evidence about one credential family.

Typical fields include:

- known prefix;
- alphabet;
- length or range;
- separators;
- public sibling identifiers;
- known historical variants;
- issuance/source evidence;
- last observed date;
- unresolved questions.

Contracts describe facts. They do not embed detection code.

### Evidence sources

Every claim that depends on an external source should be traceable to:

- source URL;
- source type;
- observed-at date;
- historical permalink where appropriate;
- the exact claim the source supports.

Source freshness and claim validity are separate concepts.

A stale source may still be valid historical evidence.

### Cases

A Case is the unit of human reasoning.

It answers:

- what happened;
- why it matters;
- what the expected semantic outcome is;
- what evidence supports that expectation;
- which credential families are involved;
- which lower-level fixtures or generated variants implement the case.

Cases may be positive, benign, twin, mutation-oriented, metamorphic, or cross-family.

### Fixtures

Fixtures are executable projections of cases or contracts.

They are not authoritative by themselves.

Every fixture must be attributable to one of:

- an authored Case;
- a reviewed format contract;
- a documented generation rule.

Generated fixtures must record lineage.

## Evidence model

The evidence system should support multiple confidence/provenance classes without converting them into product support statuses.

Example classes:

```text
provider-documented
tool-corroborated
project-policy
unresolved
```

These are evidence descriptors.

They must not directly mean:

```text
stable
provisional
pending
```

Those are product-specific interpretations owned downstream.

## Versioning

Schemas must be explicitly versioned.

A schema change is breaking when an existing valid canonical record would change meaning or become invalid without migration.

The repository should prefer:

- additive schema changes;
- migration scripts;
- explicit format revisions;
- deterministic exporters.

Never silently reinterpret old evidence under a new schema.

## Migration from redact-secret-benchmarks

The migration proceeds in layers:

```text
1. schema and IDs
2. taxonomy / dossiers / provenance
3. Cases and fixture lineage
4. governance
5. legacy-compatible export
6. cutover
```

Status: layers 1 to 5 are done (#2 to #6). Layer 6, the cutover, is not: no downstream consumer has switched (`docs/migration/cutover.md`).

The existing benchmark repository remains authoritative for active product qualification until:

- canonical import is complete;
- compatibility export is deterministic;
- downstream evaluation accepts the new source;
- dual-run parity has no unexplained semantic differences.

## Export boundary

This repository may export compatibility data for old consumers.

Exported artifacts are derived and should identify:

- source repository revision;
- schema revision;
- generation command/tool version;
- artifact digest where useful.

Implemented by `scripts/export/legacy-projection.mjs` (`npm run export:legacy`, decision `docs/decisions/0006`): the output is written to a gitignored directory and only its provenance manifest is committed. The manifest lists, per artifact, the source revision (a digest of `records/`), the schema revision, the generator name and version and a sha256. Fields that legacy consumers need but canonical data deliberately lacks (detector assignments, support status, release milestones, product pins, known-gap workflow) are not emitted; `overlay-interface.json` states what a downstream must supply. `npm run parity` proves the projection against the legacy files at a pinned revision and classifies every difference.

Legacy output shape must not constrain the canonical schema forever.

## Security

The repository handles credential knowledge, not live credentials.

Forbidden inputs include:

- active credentials;
- revoked-but-real credentials;
- production logs;
- raw incident payloads;
- customer data;
- personal data unless represented by safe synthetic structures.

No public record should make exploitation easier by publishing unnecessary secret material or attacker-only internals.

## Neutrality and governance

The project is maintained by the Redact Secret organization.

That fact must be disclosed.

Credibility comes from:

- explicit provenance;
- reproducibility;
- scanner-neutral expectations;
- attributed contributors/reviewers;
- public correction history;
- separation between evidence and product qualification.

It does not come from claiming institutional neutrality that does not exist.

## Dependency rule

This repository must not depend on:

- `redact-secret` internals;
- scanner packages;
- benchmark engine code;
- site code.

Consumers depend on evidence, not the reverse.

## Future scale

The architecture should support growth toward:

- thousands of credential families;
- large case archives;
- historical format timelines;
- externally contributed evidence;
- independently reviewed cases;
- multiple scanner consumers;
- multiple public sites or APIs.

The canonical model should therefore optimize for stable identity, provenance, lineage, and auditability over convenience for any single current consumer.
