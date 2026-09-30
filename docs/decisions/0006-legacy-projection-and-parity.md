# 0006. Legacy projection, overlay interface and parity proof

- Status: accepted
- Date: 2026-09-30
- Issue: #6 (part of #1)
- Amended by: ADR 0009 (exporter inputs; the credential-eval snapshot uses canonical ids and paths, legacy ids ride in `legacy-id-map.json`; generator 2.0.0)

## Context

`redact-secret/redact-secret-benchmarks` stays authoritative for current release
qualification until its benchmark inputs can be generated from canonical records
and the difference is proven (epic #1, migration rule). #2 to #5 made the
records. #6 has to do two things without touching the legacy repository: emit the
input shapes its consumers read, and show, at the pinned revision
`ade8a10bd7922765110a68986b0690eb3861f2e5`, how far the emitted data equals the
legacy data.

The legacy consumers read a small set of files (inventory in
`docs/migration/parity-report.md`). Some are evidence (taxonomy, dossier research
state, scenarios, the corpus registry, the corpora, the family and scenario links
per fixture). Some are not: which detector should fire, support status, release
milestones, the Redact Secret revision under measurement and known-gap workflow.
Canonical data never carries the second group (ADR 0001, ADR 0005).

## Decision

### Output: derived, ignored by git, manifest committed

`npm run export:legacy` writes the projection to `dist/legacy-projection/`
(`dist/` is already ignored) and `docs/migration/legacy-projection-manifest.json`.
Only the manifest is committed. The artifacts are about 14 MB and reproducible byte
for byte from `records/`, so committing them would add a second copy that can drift.
`npm run export:legacy -- --check` regenerates in memory and fails if the committed
manifest, or an existing output directory, differs.

### Shape: the legacy paths, pure legacy schemas

The output mirrors the legacy layout so a consumer can point its root at it:

| Artifact | Built from |
| --- | --- |
| `benchmarks/support/taxonomy.json` | provider, family records; detector names from optional `redact-secret-detector` externalRefs; citations from the `taxonomy-sources` claim; notes from the verbatim review events |
| `benchmarks/support/dossier-frontmatter.json` | family research state, the `dossier-research` claim, the first review event (one JSON document; the legacy dossiers are Markdown with YAML frontmatter) |
| `benchmarks/scenarios.json` | the consumer vocabulary (below), limited to scenarios a case uses |
| `benchmarks/categories.json` | fixture sets |
| `benchmarks/fixture-semantics.json`, `benchmarks/fixture-index.json` | cases and fixture sets (the replacement projection for the family and scenario links; the legacy `fixture-index.json` is itself generated from these inputs) |
| `fixtures/<id>/corpus.json`, `fixtures/generated/<id>.json` | fixture sets and their cases: content, spans, `assessment.kind/tier/reason/sources` |
| `credential-eval/corpus-snapshot.json` | fixture sets and cases, in credential-eval's own input contract (next section) |
| `overlay-interface.json`, `provenance-manifest.json` | the overlay contract and the provenance manifest |

Artifacts contain exactly the legacy fields. The legacy schemas forbid additional
properties, so a stamp inside an artifact would break the consumer that validates
it. Provenance is therefore carried by the manifest, which lists for every artifact
its path, bytes, sha256, source revision, schema revision and generator name and
version; the manifest also has a digest over all artifact digests.

### Source revision is a tree digest

The stamp is `{ kind: "records-tree-sha256", digest }`: a SHA-256 over every
`records/**/*.json` file and the vocabulary file (path and content digest, sorted).
A git commit id cannot be written into a file that the same commit contains, and a
digest of the exact bytes read is stronger than a commit id for "what was this built
from". The schema revision is `x-schemaRevision` of the schemas (1.1.0). The
generator is `credential-evidence/legacy-projection` 1.0.0.

### credential-eval input

credential-eval's input contract is `credential-eval/corpus-snapshot/v1` (its
`docs/contracts/README.md` and `schemas/corpus-snapshot-v1.schema.json`), not the legacy
files. The projection therefore also emits `credential-eval/corpus-snapshot.json`: one
case per fixture (id `<suite>--<fixture>`, path `<suite>/<path>`), expected spans with
envelopes, `grouping` (legacy `kind` and `tier` with the same inverse mapping as the
corpora, `group` = case id, `evidence_class` = canonical basis, `family` when the case
has exactly one), and twin lineage. `grouping.targets` (detector assignment) is absent: it is
the `fixture-detectors` overlay. `identity` is `{ source: credential-evidence, revision:
records-tree-sha256:<digest>, evidence_schema: credential-evidence/schema/<rev>, corpus_digest }`
with the digest computed by credential-eval's canonical-JSON rule (compact, keys in byte
order, cases sorted by id). Checked by running credential-eval's own
`CorpusSnapshot::validate` over the file (a scratch copy of its contracts crate with a
five-line example binary; credential-eval was not modified): it deserializes, validates
structure, ranges, twins and the declared digest, 5,925 cases. `tests/export-legacy.test.mjs`
re-derives the digest and, when a credential-eval checkout is reachable, validates the file
against its published JSON Schema.

### The consumer vocabulary

`scripts/export/legacy-vocabulary.json` holds the few facts about the legacy shapes
that canonical records deliberately do not know: the five scenario definitions
(canonical `scenarios` are free-form, ADR 0005 open question), the category kind,
the corpus path pattern, the null-provider id, and the projection's `sourceNote`.
Nothing in it is evidence. It is part of the source digest, and the parity run
verifies it against the legacy files.

### Overlay interface, never invented data

`overlay-interface.json` is regenerated with every projection and names what a
downstream (credential-eval or redact-secret-benchmarks) must supply, where it
merges, its shape, the key set it must cover (count and digest) and why it is not
canonical:

| Overlay | Legacy file | Why not canonical |
| --- | --- | --- |
| `fixture-detectors` | `benchmarks/fixture-detectors.json` | detector assignment is scanner/product state |
| `taxonomy-support-status` | `families[].supportStatus` | stable/provisional/pending is qualification |
| `fixture-provenance` | `fixtures[].provenance.issue/milestone/release` | release bookkeeping |
| `corpus-fixture-extras` | `detectors`, `arrivalTargets`, `expectedAction`, `policyFamily`, `policyConformance`, `formatReason`, `issue`, `assessment.contract` | scanner and product state |
| `pin-manifest` | `benchmarks/pin-manifest.json` | which product build was measured |
| `known-gaps` | `benchmarks/known-gaps.json` | workflow status, fixes, scanner findings |

The exporter emits none of these files. A projection without an overlay is
complete as evidence and incomplete as a benchmark run, on purpose.

Two explicit compromises stay visible in the artifacts:

- Taxonomy `detectors[]` is passed through from the `redact-secret-detector`
  externalRefs that #3 kept as removable mapping metadata. It is a convenience, not
  identity; an overlay replaces it.
- Legacy `assessment.kind` for an unresolved (T0) fixture is not recoverable (its
  candidate spans were dropped). The projection emits `must-not-flag`, tier `T0`, no
  spans. Legacy consumers key T0 on the tier (`groupKey` gives `pending/T0`; scoring
  skips T0), not the kind.

### Parity: semantic, pinned, classified

`npm run parity` extracts the legacy revision with `git archive`, runs the legacy
fixture generators over it (each generated corpus must reproduce the legacy hash
manifest first), builds the projection in memory, and compares every projected
document with its legacy counterpart leaf by leaf. Comparison normalizes only JSON
whitespace, key order and array order (objects matched by identity, scalars as
sets); it reports how many arrays differed only in order.

Every differing leaf must match a rule in `scripts/parity/rules.json`: artifact,
path pattern, change, optional value constraints and optionally a named predicate
(`scripts/parity/lib/predicates.mjs`) that checks the stated cause against the records
and the legacy document (for example: the added family is listed for another fixture
of the same case; the tier change is backed by the downgrade note in the case
rationale; the dropped span belongs to a silent or unresolved fixture). A rule that
matches nothing fails the run, and a test keeps evidence fields (content, ids, names,
descriptions) uncoverable by any rule. Differences are classified as
`product-state-dropped`, `presentation-substitute`, `case-level-aggregation`,
`dropped-legacy-metadata`, `lossy-import`, `not-imported-scope` or `derived-digest`.

The harness also runs legacy code over the projection: `fixtureIndexProblems`,
`validateCorpus` on all 67 corpora, and the legacy JSON schemas for taxonomy,
scenarios, fixture-semantics and fixture-index. The report
`docs/migration/parity-report.md` is deterministic (no clock) and
`npm run parity -- --check` fails if it is stale or any difference is unexplained.

### Differences that change meaning for a consumer

Explained is not the same as harmless. The report names these; the cutover
document lists them as work for the consumer or for a later schema revision:

- **Case-level family links.** A case, not a fixture, carries families and
  scenarios, so 459 fixtures gain family or scenario links the legacy index did not
  give them (1,066 added links). Consumers that count fixtures per family change their
  counts.
- **Identity digests.** `identity.digest` and the three source digests of the
  fixture index cannot equal the legacy values. Consumers that pin the legacy
  identity (peer observations) must re-key.
- **Twin links to unresolved positives** are omitted (3 fixtures), because the
  legacy loader rejects a twin whose positive has no secret span. The lineage
  stays in records.
- **Tier downgrades** from the importer (343 fixtures) project as T3, not T2.
- **Corpus hashes** in `generated-corpora.json` do not apply to projected corpora.
- **`group`** is the case id, not the legacy label.

## Consequences

- Legacy benchmark data can be generated from canonical data for evidence, with an
  explicit overlay for product state; it does not yet need to be.
- A record change changes the source digest, the projection digest and the parity
  report; the three are committed together and three `--check`s fail on drift.
- `npm run parity` needs a legacy checkout (the same discovery as the importers).
  Tests that need it skip when it is absent and fail under `REQUIRE_LEGACY=1`.

## Open questions

- Should a fixture-set item carry an optional per-fixture `families` override
  (additive) so the projection can reproduce the legacy per-fixture family links,
  or should the case import split cases by family set?
- Should `scenarios` become a controlled vocabulary, removing the exporter's
  vocabulary file?
- A JSON projection of the contract registry (`assessment.ts` and `beta8/*.ts`) is
  not built: its consumers are evidence validators, not runtime inputs.
  Decide when those validators move here.
- Does credential-eval want `fixtures/materialized/` (ADR 0005) or this projection
  as its first canonical input? They carry the same fixtures; the materialized tree
  is scanner-neutral and needs no overlay.
