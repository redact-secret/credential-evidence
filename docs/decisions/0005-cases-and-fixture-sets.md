# 0005. Cases, sharded fixture sets and materialization

- Status: accepted; partly superseded by 0007 (identity, case grouping, fixture ids)
- Date: 2026-09-30
- Issue: #4 (part of #1)

## Context

ADR 0001 defined the `case` and `fixture-projection` records and left the import of
the legacy fixtures to #4. `redact-secret-benchmarks` at
`ade8a10bd7922765110a68986b0690eb3861f2e5` holds 5,925 fixtures in 67 suites: three
committed, hand-written corpora (140 fixtures) and 64 corpora that generator code
produces from public seeds (5,785 fixtures) and that the legacy repository does not
commit. It records the human reasoning only as group labels, a per-fixture
`assessment.reason` and 63 known-gap issues. It also carries scanner and product state
(detector assignments, arrival targets, expected product actions) that does not belong
here.

Three questions had to be decided: how to turn suites into cases, how to store
thousands of executable fixtures without one file each, and how a consumer gets
plain files back.

## Decision

### One case per shape, role and evidence tier

A case is one scenario with one expected outcome and one evidence basis. Inside a
suite, every fixture that shares a shape (or hand-named group), a role and a legacy
tier is one case:

- **base**: the positive (or benign) inputs of a shape across carriers;
- **twin**: inputs that differ from a positive in exactly one property; the case
  carries `relations: [{ type: "twin-of", target, mutationKind }]`, each fixture
  carries `lineage.of` to its exact positive fixture;
- **control**: benign inputs of one control type (public identifier, placeholder,
  reference, near-miss, encoded value, prose).

This yields 1,925 cases. Fixtures are projections of a case (one to many); a case
never lists its fixtures, the fixture points back (single place to write).

Outcome and basis come from the legacy assessment: `must-redact` is `must-flag`,
`must-not-flag` stays, `policy` is decided by whether the fixture has expected spans;
tier T1/T2/T3/T0 is `provider-documented`/`tool-corroborated`/`project-policy`/
`unresolved` with the tightening from ADR 0004. A T2 case whose cited sources do not
include two distinct owners is recorded as `project-policy` (not `unresolved`), so the
executable expectation survives and the weakness is visible; T0 becomes
`not-assertable` and carries no spans. Every source cited is an existing #3
`evidence-source`; nothing new is minted.

### Authored versus generated

The **case** is always the authored unit. The **fixtures** are of two kinds, and a
set never mixes them:

- `origin.type: authored-cases`, `generated: false`: hand-written literal fixtures
  (`accuracy`, `token-contexts`, `real-world-shapes`, 140 fixtures).
- `origin.type: generation-rule`, `generated: true`: the recorded output of a legacy
  generator. The set records the rule, the generator name, `version`,
  `sourceRevision` (the pinned legacy commit) and `entrypoint` (the generator file);
  the cases it projects are its inputs. Generated content is derived, never
  canonical.

The importer runs the legacy generators over the pinned `git archive` in a child
process and refuses to import if any corpus does not reproduce the SHA-256 in the
legacy `generated-corpora.json`. All 64 reproduce.

### Sharded fixture sets (additive schema, revision 1.1.0)

One `fixture-projection` file per fixture would be 5,925 record files plus 5,925
content files. Instead a new `fixture-set` record (`records/fixtures/<suite>.json`)
holds every fixture of one suite, one line each: id, case, path, optional context and
twin lineage, sha256, the text itself and the expected outcome and spans. That is 67
files, about 3.3 MB, 0.9 MB of it fixture text. The embedded text amends ADR 0001's
"content is referenced, never embedded" for this kind only: the synthetic inputs are
small and a set is the unit that is generated and verified. The single-file
`fixture-projection` remains for one-off authored fixtures (the worked examples use
it).

Also additive: `expectedSpan.envelope` (an authored wider range that may be reported
without being wrong, the answer to ADR 0001's "envelope to be added when #4 needs
it"), and `case.incidents[]` (historical incidents or failure modes: a scanner-neutral
`failureMode`, a summary, an observed date, and the product issue as an
`externalRefs` pointer). All schemas move to revision 1.1.0; no existing record
changes meaning.

The validator gains referential integrity in both directions: every fixture names an
existing case and agrees with its outcome, digests and byte ranges are checked
against the text, lineage resolves across fixtures, and every case with an
assertable expectation is projected by at least one fixture.

### Materialization

`npm run fixtures:materialize` validates `records/` and writes `fixtures/materialized/`
(gitignored): one file per fixture at `<set>/<path>` and a `manifest.json` giving
each fixture's path, sha256, expected outcome, byte spans (with envelopes), case,
family ids, twin lineage and whether it is generated. A consumer such as
credential-eval reads files and manifest and needs no case semantics. The manifest
has a digest over its fixture entries; `-- --check` verifies the records, an
existing output tree, and that the digest equals the one in
`docs/migration/cases-report.md`.

### Secret-shaped values

Every value is one the legacy authors constructed: bodies derived from SHA-256 of
public seeds, structural stand-ins (PEM bodies of public prose, an expired locally
signed JWT), the provider-published AWS documentation examples, or hand-written
filler. Each fixture set's `notes` carries the legacy statement of how its values were
built (`docs/governance/safety.md`, rule 1). Secret scanners flag thousands of these
values by design; the expected triage is "synthetic by construction", recorded per
set, never by weakening a scanner. No fixture is verified against a provider.

### What is dropped

Detector assignments (`fixture-detectors.json` and per-fixture `detectors`), arrival
targets, expected product actions, policy-family bookkeeping, release milestones,
known-gap workflow state (status, fix, promotion, candidate build) and the scanner
findings recorded in known gaps. Counts are in `docs/migration/cases-report.md`.

### Wording

A hand-written topic, scenario and importance text exists for the 114 cases of the
hand-named groups (milestone-6, reference syntax, negative controls, SendGrid, context
edges, policy-qualified, authored corpora) in
`scripts/migrate/lib/case-narratives.mjs`. The other cases are worded from role
templates plus family names. All of it is imported as `draft` and labelled
project-authored.

## Consequences

- `npm run migrate:cases:check` regenerates every case, fixture set and the report
  from the pinned legacy revision and fails on any drift; the legacy generators run
  on every check (about five seconds).
- The fixture content is a snapshot of legacy generator output. Until the generators
  are reimplemented here (or the cutover in #6 makes this repository authoritative),
  regenerating a set needs the legacy checkout.
- Cases are more numerous than a reader would write by hand. The 1,811 templated ones
  are honest about being mechanical; the hand-written ones are the reading path.
- The `records/` tree is about 10 MB and 2,000 files larger than after #3.

## Open questions

- Whether generator code should move here so generated sets can be regenerated
  without the legacy repository, and where its seeds live.
- Whether `cross-provider` and the four theme tags on `scenarios` should become a
  controlled vocabulary (ADR 0001 left `scenarios` free-form).
- Whether cases the importer grouped by legacy tier should be merged once a reviewer
  confirms their evidence, since one shape may end up with several cases that differ
  only in basis.
- Whether a `may-flag` outcome should replace the companion-span note: one legacy
  fixture allowed, but did not require, redacting a public companion identifier.
