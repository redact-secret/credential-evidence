# 0011. Snapshot release policy: identity, contents, publication, immutability and pinning

- Status: accepted
- Date: 2026-10-01
- Issue: #17 (part of #1)
- Builds on: ADR 0002 (exports name source revision, schema revision, generator version and a digest), ADR 0005 (fixture materialization), ADR 0009 (the canonical credential-eval snapshot)

## Context

Two consumers must pin an evidence identity: `credential-evidence-site` (a public release names the upstream snapshot it was built from) and the official measurement that `redact-secret-benchmarks` runs through `credential-eval`. Exports already carry a source revision, a schema revision, a generator version and a digest (ADR 0002), but nothing says which revisions are consumable, under which name, or where a consumer fetches them. A commit on `main` is not enough: it carries no statement that the checks passed, and the derived artifacts (the corpus snapshot, the fixture materialization) are gitignored, so a consumer would have to rebuild them and trust its own build.

`credential-eval` has already shipped the consumer side (its PR #17, issue #14): `--evidence-release <tag> --evidence-manifest <file> --evidence-manifest-digest <sha256>` refuses a run unless the manifest's bytes hash to the pinned digest, the manifest's `tag` equals the pinned tag, and the manifest's single `credential-eval/corpus-snapshot.json` entry has the `sha256` of the `--corpus` bytes. It reads only `tag` and `files[] {path, sha256}` and at most 1 MiB of manifest.

## Decision

### 1. Identity: `snapshot-YYYY.MM.DD[.n]`

A release is named `snapshot-YYYY.MM.DD`, the UTC date it was cut. A second or later release on the same UTC day appends `.n` with `n` = 2, 3, ... (`snapshot-2026.10.01.2`). The grammar is `^snapshot-\d{4}\.\d{2}\.\d{2}(\.([2-9]|[1-9][0-9]+))?$` plus a real calendar date; the release workflow also requires the date to be today in UTC. It is a valid `credential-eval` `ReleaseTag`.

A date, not semver tied to the schema revision, because the two move independently: almost every release changes records and not the schema, so a semver number would either stay frozen while the content changes or grow a meaningless patch counter. The schema revision is recorded in the manifest, where a consumer can test it. A date also orders releases and tells a reader how old a pin is. The tag is a release name, not a record id: ADR 0002's rule against dates in ids applies to canonical ids, and no record mentions a release.

The tag names the release; the **manifest digest** (the SHA-256 of `release-manifest.json`'s bytes) identifies its content. A consumer pins both (section 6).

### 2. What a release guarantees

A release exists only if, at its commit on `main`, the release workflow ran every check `ci.yml` runs and they were all green: `validate`, `lint:identity`, `lint:narrative`, `lint:skills`, `coverage:gaps:check`, `npm test` with the pinned legacy checkout, `migrate:check`, `export:legacy:check`, `parity:check` and `fixtures:materialize:check`, plus a dry run that builds the bundle twice and requires identical bytes.

As content, a released snapshot guarantees what the README and ARCHITECTURE state for any pinned snapshot: canonical facts, Cases and provenance; scanner-neutral expected outcomes; stable semantic ids; a snapshot identity and digest. It contains no Redact Secret support status, no product detector assignment as canonical evidence (detector names are optional mapping metadata only) and no release or candidate policy.

It does not guarantee that the evidence is complete or correct beyond what each record's evidence class says, that parity holds at any legacy revision other than the pinned one, or that any scanner behaves in any way. It is maintained by the Redact Secret project and is not independent validation.

### 3. Contents

Every release has exactly these assets. Asset names are flat (GitHub release assets have no directories); each listed file also has a logical path, and the asset name is that path with `/` replaced by `-`.

| Logical path | Asset | Content |
| --- | --- | --- |
| `records/bundle.json` | `records-bundle.json` | Format `credential-evidence/records-bundle` v1: every `records/**/*.json` file byte for byte (`text`, `sha256`, `bytes`), every `schemas/**/*.json` file byte for byte, and the compatibility inputs of the records-tree digest (`migration/**` legacy map, the exporter vocabulary) by path and digest only, so the records-tree digest is recomputable from the bundle while legacy compatibility data is not redistributed as evidence. |
| `credential-eval/corpus-snapshot.json` | `credential-eval-corpus-snapshot.json` | The `credential-eval/corpus-snapshot/v1` document `npm run export:legacy` writes, byte for byte (ADR 0009). Its `identity.revision` is the records-tree digest. It never declares `identity.release`; only `credential-eval` writes that, after verification. |
| `fixtures/materialized-manifest.json` | `fixtures-materialized-manifest.json` | The `manifest.json` of `npm run fixtures:materialize` (ADR 0005): every fixture's path, sha256, outcome, spans and lineage. The fixture bytes themselves are not shipped as 5,925 assets; they are in the corpus snapshot (`content`) and in the bundled fixture-set records, and the tree is regenerated by the rule below. |
| (manifest) | `release-manifest.json` | Section 4. |
| (manifest digest) | `release-manifest.json.sha256` | `<hex>  release-manifest.json`, in `sha256sum` format. A convenience; the pin is the consumer's own record of the digest (section 6). |

Nothing site- or product-specific is in a release: no legacy projection (`dist/legacy-projection/` stays a build output of `npm run export:legacy` at the release commit), no overlay and no `legacy-id-map.json`.

### 4. The release manifest

`release-manifest.json`, format `credential-evidence/release-manifest`, `formatVersion` 1, written with sorted `files`, two-space indentation and a trailing newline, and no timestamp, so the same commit and tag always give the same bytes:

```text
{
  "format": "credential-evidence/release-manifest",
  "formatVersion": 1,
  "tag": "snapshot-2026.10.01",
  "sourceRevision": {
    "commit": "<40-hex git commit>",
    "recordsTree": { "kind": "records-tree-sha256", "digest": "<64-hex>" }
  },
  "schemaRevision": "1.4.0",
  "generator": { "name": "credential-evidence/release-bundle", "version": "1.0.0" },
  "fixtures": { "count": 5925, "digest": "<64-hex materialization digest>", "rule": "npm ci && npm run fixtures:materialize at commit <commit>; ..." },
  "filesDigest": "<sha256 of the '<path> <sha256>' lines of files, joined by newlines>",
  "files": [
    { "path": "credential-eval/corpus-snapshot.json", "asset": "credential-eval-corpus-snapshot.json", "bytes": <n>, "sha256": "<64-hex>" },
    { "path": "fixtures/materialized-manifest.json", "asset": "fixtures-materialized-manifest.json", "bytes": <n>, "sha256": "<64-hex>" },
    { "path": "records/bundle.json", "asset": "records-bundle.json", "bytes": <n>, "sha256": "<64-hex>" }
  ]
}
```

- `sourceRevision.commit` is the authoritative source identity; `recordsTree` is the content digest of the records, the legacy map and the vocabulary that every export is already stamped with (ADR 0006, `scripts/export/lib/source.mjs`).
- Digests are bare lowercase hex, as in the existing export manifests; `credential-eval` accepts bare hex and `sha256:<hex>`.
- The **manifest digest** is the SHA-256 of the file's bytes. It cannot be inside the file it hashes; it is published in the release notes and in `release-manifest.json.sha256`.
- `tag`, `files[].path` and `files[].sha256` are the fields `credential-eval` reads; their names and meaning are frozen for `formatVersion` 1. Other fields may be added within version 1; a consumer ignores fields it does not know. Renaming or removing a field, or changing a meaning, is `formatVersion` 2.
- The generator version (`scripts/release/lib/bundle.mjs` `GENERATOR`) changes whenever the bytes it writes for the same inputs change.

### 5. Publication and immutability

Releases are GitHub releases of `redact-secret/credential-evidence` with the assets above. They are cut only by `.github/workflows/release.yml`, on manual dispatch from `main` with the tag as input. There is no push, tag or schedule trigger and no automatic publication. The workflow refuses a malformed tag, a tag not dated today (UTC), a tag or release (including a draft) that already exists, and any failing check; it builds the assets, verifies them, creates a draft release with the assets at the dispatched commit, publishes it, then downloads it as a consumer would and verifies it again.

A release is immutable. A tag is never moved, deleted or reused, and assets are never replaced. A correction (wrong record, failed verification discovered later, a generator bug) is a **new release** with a new tag; its notes name the release it supersedes and why. The superseded release stays published. Maintainers should enable GitHub's immutable-releases setting and a tag ruleset that blocks updating and deleting `snapshot-*` tags; both are repository settings, not code.

The only exception is safety: if a release turns out to contain material that the safety policy (`docs/governance/safety.md`) forbids, the release is deleted, its tag name is retired (never reused), a corrected release is cut, and the withdrawal (tag, manifest digest, reason, replacement) is recorded in `docs/releases.md`. A consumer pinned to a withdrawn release fails closed, because the download fails, and moves to the replacement deliberately.

### 6. Consumer pinning

A consumer pins **a tag and a manifest digest** together, recorded in its own configuration when it adopts the release. On every fetch it verifies the manifest bytes against the pinned digest, then every file it uses against the manifest's `sha256`. The tag alone is not a pin: it names what to fetch, and the digest proves it is what was pinned. Trusting the `.sha256` asset or the release notes on each fetch is not a pin either; they are where the digest is first read.

`credential-eval` does this with `--evidence-release`, `--evidence-manifest` and `--evidence-manifest-digest`, and records `manifest.evidence.release {tag, manifest_digest}` in its run artifact. Any other consumer can use `npm run release:verify` or `sha256sum` (`docs/releases.md`).

### 7. Retention

Every published release stays available indefinitely, with its assets. No release is pruned for age or superseded status. The only removal is the safety exception in section 5. Because a release is reproducible from its commit (the generation rule and `npm run release:bundle` at that commit give the same bytes, given the same generator), the source commit also stays reachable from `main`; history on `main` is never rewritten.

## Consequences

- `credential-eval`'s verifier works against releases unchanged: the manifest has `tag` and `files[] {path, sha256}` with `credential-eval/corpus-snapshot.json` listed once, and is a few kilobytes.
- A consumer can pin, fetch and verify a snapshot without cloning this repository or running its toolchain.
- A release does not change the cutover rule (`docs/migration/cutover.md`); the legacy repository stays authoritative until that checklist is done. A release is how a consumer switches, not proof that it has.
- Every release costs a full CI run plus a build of about 20 MB of assets, which is acceptable for a manual, infrequent operation.

## Open questions

- Whether to sign releases (artifact attestations or Sigstore) in addition to digests. Not needed for digest pinning; worth adding when a consumer outside the project asks for provenance it cannot get from the commit.
- Whether `credential-evidence-site` also wants the narratives as a separate asset, or reads them from the bundle. The bundle already contains them.
