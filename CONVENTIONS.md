# Conventions

## Canonical entities

Use the hierarchy `Provider -> Credential Family -> Format Contract / Evidence
Sources / Variants / Benign Siblings / Cases / Fixture Lineage`. A detector or
scanner name is mapping metadata, never canonical identity.

IDs are lowercase, URL-safe, stable across versions, and descriptive without
embedding dates or scanner names unless those are intrinsically part of the
entity.

Canonical IDs and record file paths (scenario, case, fixture-plan, fixture-set)
never contain a legacy suite name, a beta, milestone, issue or pull-request
coordinate, a detector identifier, a release coordinate or a migration-source
coordinate. Evidence tier or basis is never part of identity. Put such
coordinates in `externalRefs`, `imported` or `migration/legacy-map.json`.
`npm run lint:identity` enforces it (ADR 0007); a clean pattern does not make
an id a good one.

## Claims and provenance

Every source-backed claim records what the source proves, source type, source
location, and observed-at date. Distinguish current facts, historical facts,
project policy, tool corroboration, and unresolved research. Do not turn
freshness into truth or a scanner vote into evidence.

Use evidence classes such as `provider-documented`, `tool-corroborated`,
`project-policy`, and `unresolved`. They are not aliases for product states
such as stable, provisional, or pending.

## Cases and fixtures

Cases are authored units of reasoning: a specific situation with its own
rationale. A Scenario is a reusable semantic scenario with one meaning across
families; a fixture plan is a declared family x Scenario (or Case) projection
with its generation rule. If a record's prose is a template with the family name
substituted, it is a Scenario or a projection, not a Case (ADR 0007 has the
criteria). Fixtures are executable projections.
Every fixture traces to a case, reviewed format contract, or documented
generation rule. Generated data is marked generated and records its inputs,
generator version, and source identity.

Expected behavior describes semantics such as must-flag or must-not-flag
without naming a scanner. Preserve twins, mutations, and metamorphic relations
as explicit lineage.

## Schemas and exports

Version schemas explicitly. Prefer additive evolution. Breaking meaning changes
require a migration and a new schema revision. Sort deterministic exports by
stable IDs and include source revision, schema revision, generator version, and
a digest where useful.

## Writing

Use precise, falsifiable wording. Separate observed facts from inference.
Identify the Redact Secret project as maintainer and do not call its evidence
independent.

