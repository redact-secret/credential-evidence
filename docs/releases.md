# Evidence snapshot releases

How to fetch, verify and pin a released `credential-evidence` snapshot. The policy behind it (identity, guarantees, contents, immutability, retention) is [ADR 0011](decisions/0011-snapshot-release-policy.md).

> Maintained by the Redact Secret project. Project-maintained evidence is not presented as independent validation.

## What a pinned snapshot guarantees

A released, pinned snapshot gives a consumer:

- canonical facts, Cases and provenance;
- scanner-neutral expected outcomes;
- stable semantic ids;
- a snapshot identity and digest.

It deliberately does not contain:

- any Redact Secret support status;
- product detector assignments as canonical evidence (detector names exist only as optional mapping metadata that a consumer overlay replaces);
- any release or candidate policy.

The snapshot is one evidence population. A consumer that measures it next to other evidence populations (for Redact Secret: its regression, policy/behavior, candidate-specific and protected corpora) keeps each separately identified, by this snapshot's identity and digest for this one. Populations are never silently merged into one denominator. See [README: One qualification input, not the qualification](../README.md#one-qualification-input-not-the-qualification) and [ARCHITECTURE: Consumer boundary](../ARCHITECTURE.md#consumer-boundary).

A release also guarantees that both tiers of checks (`.github/workflows/ci.yml`: the ordinary gate and, always at release, the historical pinned checks, [validation tiers](migration/validation-split.md)) passed at its commit when it was cut, and that two builds of its assets were byte-identical.

A release is built from the **whole records tree**: a provider, family, case or fixture added after the import, and an amended migrated record, are in the snapshot, the bundle and the materialization like any other (the credential-eval snapshot needs no legacy name, ADR 0015). The legacy map and the exporter vocabulary are compatibility inputs and ride by digest.

## Identity

- **Tag**: `snapshot-YYYY.MM.DD`, the UTC date the release was cut; `snapshot-YYYY.MM.DD.2`, `.3`, ... for later releases the same day.
- **Manifest digest**: the SHA-256 of the bytes of the release's `release-manifest.json`.

A pin is **both**: the tag says what to fetch, the manifest digest proves it is what you pinned. Record the pair once, when you adopt a release (from the release notes or `release-manifest.json.sha256`, after checking the release yourself), and verify against your recorded digest on every later fetch. Do not re-read the digest from the release each time; that checks nothing.

Releases are immutable: a tag is never moved or reused and assets are never replaced. A correction is a new release whose notes name the release it supersedes. Old releases stay available indefinitely.

## Assets

| Asset | Logical path (in the manifest) | Content |
| --- | --- | --- |
| `release-manifest.json` | (the manifest) | Tag, source commit, records-tree digest, schema revision, generator version, fixture digest and generation rule, and `files[]` with `path`, `asset`, `bytes`, `sha256` per file, plus `filesDigest`. |
| `release-manifest.json.sha256` | (the manifest digest) | `<hex>  release-manifest.json` (`sha256sum` format). |
| `credential-eval-corpus-snapshot.json` | `credential-eval/corpus-snapshot.json` | The `credential-eval/corpus-snapshot/v1` input, in canonical ids (ADR 0009). It holds the fixtures the closed v1 contract can represent; the rest are counted in the manifest's `evalExport` as `not exported to eval v1` (ADR 0017). |
| `records-bundle.json` | `records/bundle.json` | Every canonical record and schema file byte for byte (`records[]`, `schemas[]`, each with `path`, `sha256`, `bytes`, `text`); the legacy map and exporter vocabulary by digest only (`compatibilityInputs[]`). |
| `fixtures-materialized-manifest.json` | `fixtures/materialized-manifest.json` | The fixture materialization manifest (ADR 0005). The fixture tree is regenerated with `npm ci && npm run fixtures:materialize` at `sourceRevision.commit`; its `manifest.json` equals this asset and its digest equals the manifest's `fixtures.digest`. |

## Fetch and verify

```bash
TAG=snapshot-2026.10.01            # your pinned tag
PIN=<64-hex manifest digest>       # your pinned manifest digest
gh release download "$TAG" -R redact-secret/credential-evidence -D "evidence-$TAG"
cd "evidence-$TAG"

# 1. The manifest is the one you pinned.
echo "$PIN  release-manifest.json" | sha256sum -c -        # macOS: shasum -a 256 -c -

# 2. The manifest is for this tag, and every file matches its sha256.
jq -e --arg tag "$TAG" '.tag == $tag' release-manifest.json
jq -r '.files[] | "\(.sha256)  \(.asset)"' release-manifest.json | sha256sum -c -
```

Or, from a checkout of this repository (no network, checks the same things plus `filesDigest` and sizes):

```bash
npm run release:verify -- --dir "evidence-$TAG" --tag "$TAG" --manifest-digest "$PIN"
```

Without `--manifest-digest` the command checks internal consistency only and says the release is not pinned.

To check that a records file is canonical at the release, compare it with the bundle: each `records[]` entry carries the exact `text` and its `sha256`. The records-tree digest in `sourceRevision.recordsTree` is the SHA-256 of the sorted `<path> <sha256>` lines of `records[]` and `compatibilityInputs[]`, joined by newlines.

## What the snapshot does not carry

The v1 contract holds `content` as one string and a twin as a negative. A fixture whose bytes are not valid UTF-8 is not exported to the snapshot, and a twin that carries a secret span is exported without `twin` (ADR 0017). Both are counted in `release-manifest.json` under `evalExport` (`exported`, `notExported.byReason`, `twinLineageNotExported`), with `exported + notExported.total` equal to the materialized fixture count; they stay in `fixtures-materialized-manifest.json`. Releases up to `snapshot-2026.10.03` have no `evalExport`, and `snapshot-2026.10.03` cannot be read by credential-eval `v0.1.0-alpha.1` (75 cases without `content`).

Releases from `snapshot-2026.10.04.2` also carry the representation facts (ADR 0018): `identity.representation` is `credential-eval/representation/1`; `cases[].representation` (`input_validity`, `derivation`, `transformation`, `chunking`) and `expected[].base`, `fragments`, `decoded` appear where the evidence states them. They need credential-eval `v0.1.0-alpha.4` or later (older engines refuse the new fields; the older snapshots stay readable by older engines). `evalExport.representation` records the contract, the `facts_digest` and the counts the engine reports in `manifest.representation` of a run artifact, so a consumer can compare them. `release:check` and `release:verify` recompute them from the snapshot. Still not exported, and counted in `evalExport.notExported`: `invalid-utf8` inputs. A valid UTF-8 `unpaired-surrogate-split` input is exported as an expected rejection (tier `T0`, no spans). Support status is never carried, and neither is review state: the snapshot has no field for it.

## Review state: `maintainer-only`

During the [solo-maintainer period](governance/solo-maintainer-period.md) ([ADR 0020](decisions/0020-solo-maintainer-period.md)) some project-policy expectations are finalized by the sole maintainer alone. They are `maintainer-only`: never `reviewed`, never independent validation, queued for retro-review in [#154](https://github.com/redact-secret/credential-evidence/issues/154). Releases from `snapshot-2026.10.04.3` count them:

- `release-manifest.json` carries `reviewState`: `fixtures {total, draft, maintainerOnly, reviewed}` and `maintainerOnly {fixtures, fixturesByOutcome, records {case, scenario}, decisions}`. `release:check` and `release:verify` recompute it from the bundled records, so it cannot differ from them.
- The release notes repeat the counts.
- The bundled records say which fixtures: `lifecycle: "maintainer-only"` on a case or scenario, `reviewState: "maintainer-only"` on a fixture-set evidence entry (a fixture that cites its own evidence entry takes that entry's state, else its case's or scenario's), and a `decided` event with `dissent` and `reversingEvidence` in the review history.
- The credential-eval snapshot is unchanged in kind (`credential-eval/corpus-snapshot/v1`, representation `credential-eval/representation/1`, engine `v0.1.0-alpha.4` or later). Its `evidence_schema` is `credential-evidence/schema/1.7.0`.

A consumer that reports results over this snapshot says that part of the must-flag and must-not-flag denominator is `maintainer-only`, and does not describe it as reviewed.

## Consuming it from credential-eval

`credential-eval` verifies the release itself before an official run (its `docs/official-runs.md`). Pass the downloaded snapshot as the corpus and the pinned pair as release flags:

```bash
credential-eval run --run-class official \
  --corpus "evidence-$TAG/credential-eval-corpus-snapshot.json" \
  --evidence-release "$TAG" \
  --evidence-manifest "evidence-$TAG/release-manifest.json" \
  --evidence-manifest-digest "sha256:$PIN" \
  --config run-config.json --out artifact.json
```

It refuses the run (exit 4, no artifact) unless the manifest hashes to `$PIN`, its `tag` is `$TAG`, and its single `credential-eval/corpus-snapshot.json` entry matches the `--corpus` bytes. The artifact then records `manifest.evidence.release {tag, manifest_digest}` next to the snapshot's `revision` (the records-tree digest), `evidence_schema` and `corpus_digest`: the snapshot identity and digest of this evidence population.

## Cutting a release (maintainers)

1. Locally, at the commit you intend to release: `npm run release:check -- --tag snapshot-YYYY.MM.DD`. It builds the bundle twice in memory, requires identical bytes, verifies it and prints the manifest summary. It writes nothing.
2. Merge to `main`, and wait for CI to be green.
3. Dispatch the workflow with today's UTC date (add `.2`, `.3`, ... if a release was already cut today):

   ```bash
   gh workflow run release.yml -R redact-secret/credential-evidence --ref main -f tag=snapshot-YYYY.MM.DD
   ```

   It refuses anything but `main`, a malformed tag, a tag not dated today, and an existing tag or release; reruns every CI check of both tiers at that commit (the historical tier against the pinned legacy commit); builds and verifies the assets; creates the release as a draft with the assets, publishes it; and downloads and verifies it again. The run summary and the release notes give the manifest digest.
4. Announce the tag and manifest digest to consumers. Never edit, re-tag or delete a release; correct by cutting a new one.

Recommended repository settings (maintainers, not code): GitHub immutable releases on, and a tag ruleset blocking updates and deletion of `snapshot-*`.

## Releases

| Tag | Commit | Manifest digest | Notes |
| --- | --- | --- | --- |
| `snapshot-2026.10.01` | `adadf33096c417141897a4148d049a0a267c3278` | `54e47836b5c36a0b7c0871da8bfe227b041404ff2bc652e62566fe74ceab0182` | First snapshot release; 5,925 materialized fixtures. |
| `snapshot-2026.10.01.2` | `a5362d6cfe644dcf069858ef9bd9cad4d7a96c4a` | `2557a72ae8dec3ca6d734a6c87b6db9cb4881543541693a4555fdfd9f7ba26d8` | Superseded by `snapshot-2026.10.03` for new pins. Legacy reference `1020d2b5` (beta.12 re-pin, #74); ADR 0012 decisions 1–4; schema 1.5.0; 5,950 materialized fixtures (digest `d4ac653b…`); credential-eval snapshot digest `sha256:1bc5a07b…`. Supersedes `snapshot-2026.10.01` for new pins. |
| `snapshot-2026.10.03` | `cb5d2aeed47e47e457cb89e43e905ab9145e9634` | `d70507ca1d6595c260ab8dc06a804b93b4c149a80b9bfd0788761f06ae0b0ee9` | Current pin target for new pins. Schema 1.6.0 (ADR 0016); 6,454 materialized fixtures (digest `47d80d8e…`); credential-eval snapshot corpus digest `sha256:a8d79523…`, records tree `dd8886d8…`. Contains the evidence-review restorations (T1/T2, #41-#72 round), ADR 0013 twin families, ADR 0014 evidence-entry split, and the epic #92 research records (all `draft`, unreviewed; several expectations are deliberately not-assertable, see #142). Supersedes `snapshot-2026.10.01.2` for new pins. Not a score claim: replay before comparing. |
| `snapshot-2026.10.04` | `32224d40e4456fa3ed80f444a90c346323de5f10` | `c82b2f005c7e499c06e8851356f63a80ecad923e11ea284b0429c01fac1e4da8` | Readable by credential-eval `v0.1.0-alpha.1` (ADR 0017): 6,454 materialized fixtures, 6,449 exported and 5 not exported to eval v1 (`invalid-utf8`), 29 twin lineages not written; credential-eval snapshot corpus digest `sha256:5c004181…`, records tree `806545ba…`. No representation facts. Supersedes `snapshot-2026.10.03` for new pins that stay on an engine before `v0.1.0-alpha.4`. |
| `snapshot-2026.10.04.2` | (release notes) | (release notes) | Representation facts under credential-eval `representation/1` (ADR 0018, #150); needs credential-eval `v0.1.0-alpha.4` or later. Same records tree as `snapshot-2026.10.04` (`806545ba…`) and the same cases, content, spans and tiers; only the facts and the declaration are added, so the corpus digest differs. Commit and manifest digest are in the release notes and the comment on #150: a row in the commit it describes cannot name that commit. Supersedes `snapshot-2026.10.04` for pins on an engine at or after `v0.1.0-alpha.4`. |
| `snapshot-2026.10.04.3` | (release notes) | (release notes) | The ADR 0019 decisions applied as `maintainer-only` (ADR 0020, schema 1.7.0): 73 fixtures left `not-assertable` (71 `must-flag`, 2 `must-not-flag`), 96 fixtures `maintainer-only`, none `reviewed`; 6,454 materialized fixtures; manifest `reviewState`. Same engine floor as `snapshot-2026.10.04.2` (credential-eval `v0.1.0-alpha.4` or later). The corpus, `facts_digest` and expectations differ from `snapshot-2026.10.04.2`. Commit and manifest digest are in the release notes and the comment on #142: a row in the commit it describes cannot name that commit. Supersedes `snapshot-2026.10.04.2` for new pins. Not a score claim: replay before comparing. |

Everything on `main` up to commit `cb5d2ae` is in `snapshot-2026.10.03`; the ADR 0013 change to the corpus digest is part of it. Consumers pinned to an earlier tag still need to repin and replay.

## Withdrawn releases

Only for material the safety policy forbids (ADR 0011, section 5). A withdrawn tag is never reused.

| Tag | Manifest digest | Reason | Replacement |
| --- | --- | --- | --- |
| (none) | | | |
