# 0026. A twin names the sibling family whose contract owns its value

- Status: accepted (decided by the repository owner as the sole maintainer, ADR 0020; the decision is a `maintainer-only` act, never `reviewed`)
- Date: 2026-10-06
- Issues: credential-evidence#260 (request), redact-secret/credential-eval#63 and its ADR 0019 (the evaluator side), [ADR 0013](0013-twin-family-scope-in-the-corpus-snapshot.md) (the twin scope rule)
- Deciding maintainer: Milo Kang (GitHub `milocosmopolitan`), the repository owner, who instructed an agent on 2026-10-06 to work #260. Recorded by an AI agent on the owner's instruction.
- Schema: additive, revision 1.8.0 (every schema file carries the revision).

## Context

Some twins are not broken near-misses: they carry a real credential of another key class of the same provider, scoped to the family they twin (for example `sk-ant-api03-` as a twin of an admin key). The evaluator cannot tell them from a plain broken-prefix twin (`xk-ant-api03-`), because the class is named only in the free-text `mutation`; a provider-wide label is read as a flag on the first and as a flag on the second alike (credential-eval ADR 0019, decision 3). It asked for a structured marker; it will not parse prose or keep a per-case exception list.

## Decisions

1. **`lineage.siblingFamily`, optional, on a `twin-of` relation** of a fixture-set item and of a fixture projection. Its value is a family id: the family whose contract owns the twin's value. Absent for an ordinary near-miss. It names a family; it carries no scanner, policy or action, and relabels no expected family.
2. **Validated, never free text.** The family must exist; it must be of the same provider as the family the twin is scoped to (`cell.families`, or the subject and lookalike families of its case); the twin must be scoped to a family other than the sibling; and a contract of the scoped family must state sibling classes (a claim `field-sibling-classes` or `field-sibling-prefixes`, with or without the `field-` prefix). So the field cannot name a class the evidence does not already treat as a sibling.
3. **Applied to eight Anthropic twins**, each checked against the prefix of its value: `admin01-key-api01-prefix-twin` (sibling `anthropic:compliance-access-key`), `admin01-key-api03-prefix-twin` and `api01-key-api03-prefix-twin` (`anthropic:secret-api-key`), `api01-key-admin01-prefix-twin` (`anthropic:admin-api-key`), and the four `anthropic-token-api03-(admin|compliance)-prefix-(plain|unicode-crlf)-twin` (`anthropic:admin-api-key` and `anthropic:compliance-access-key`). The two cases named in the issue are among them.
4. **The seven GitLab `routable-personal-access-token` twins do not get the field.** They change a checksum, a boundary, a length holder, a payload length or the case of the base36 tail of a routable token; none of them carries a credential of another class, and no contract states a sibling class for the family. A provider-wide label flagging them is a flag on the token's own class, not a sibling.
5. **Not written to the credential-eval snapshot yet.** The v1 snapshot's `twin` object is closed in the engine (`deny_unknown_fields`), and ADR 0018 settled the order: a new fact is a contract change in credential-eval first, then a mapping line here. The field is carried in the records bundle and in `fixtures-materialized-manifest.json` (`lineage.siblingFamily`). The mapping for the snapshot, proposed as `twin.sibling_family`, is a one-line addition to the exporter once credential-eval accepts it; releases keep exporting the closed v1 `twin` until then, so no snapshot becomes unreadable.

## Dissent and reversing evidence

- Naming a family in the twin's lineage invites the evaluator to treat it as co-detection, which lowers a miss count; the field must stay a fact about the value, not a scoring hint. Reversing evidence: an evaluator protocol that reads it as anything but a family id.
- Item 4 reads the GitLab twins as same-class variants. Reversing evidence: a GitLab contract that states a legacy class owning a mutated routable value, with its sibling claim.

## Consequences

- Schema 1.8.0: every release manifest and the `evidence_schema` of the snapshot read `1.8.0` from the next release. The legacy projection manifest and the parity report are regenerated; there are no unexplained parity differences.
- `records/fixtures/anthropic.json` is amended and declared (8 items; no expectation, input or outcome changes). No snapshot case changes, because the field is not exported.
- A consumer needs nothing until credential-eval accepts the snapshot field; this repository then adds the mapping and cuts a release.

## Addendum 1 (2026-10-06): the snapshot mapping

credential-eval accepted the field (its ADR 0020, PR #66, engine `0.1.0-alpha.15`, contract revision 1.9) as `twin.sibling_family`, so item 5 is carried out. It supersedes item 5 and the first Consequence on what a snapshot holds.

- **Mapping.** The release exporter writes `twin.sibling_family` from `lineage.siblingFamily` for every twin it exports (`buildSnapshot(inputs, { representation: true, siblingFamily: true })`). The default export and the legacy projection, parity and dual-run checks keep the closed v1 document with no such field, so the import baseline and the earlier snapshots are unchanged. The release generator is `credential-evidence/release-bundle` 1.4.0.
- **The engine's rule is checked first.** Its validator refuses a twin whose case has no scope family or whose scope family equals the sibling. The exporter throws before writing instead: every twin with a sibling family needs a scope family (ADR 0013) other than the sibling, and every such twin of the records is written with it.
- **Accounting.** The release manifest records `evalExport.twinSiblingFamily.exported` when a snapshot carries any; `release:check` and `release:verify` recompute it from the snapshot's own cases and refuse a difference. A twin that is not exported (ADR 0017) carries no sibling field and is already counted in `twinLineageNotExported`.
- **Compatibility.** Minimum engine: credential-eval `v0.1.0-alpha.15`. Proven with engines built from credential-eval commits: alpha.15 (`0024de6`) reads a snapshot with 8 twins carrying `sibling_family` and validates it; alpha.14 (`1c3b63a`) refuses the same snapshot with `unknown field sibling_family`, and reads the same snapshot without the field. So an older engine refuses loudly and does not misread. Earlier releases stay readable by the engines they were cut for.
- **No expectation changes.** The field is evidence input to the evaluator's scoring of the 8 Anthropic twins (its ADR 0020 decision 3); no outcome, input or expected family changes here.
