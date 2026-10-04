# 0016. Representation and lineage of transformed credentials

- Status: accepted
- Date: 2026-10-03
- Issue: groundwork for #94, #95, #96 and #99 (refs #92; no `Closes`)
- Amends: ADR 0002 (schema revision 1.6.0, additive), ADR 0005 and ADR 0008 (fixture-set items and fixture plans)
- Amended by: ADR 0018 (the snapshot builder now writes these facts under credential-eval's representation contract)
- Builds on: ADR 0007 (identity, Cases, Scenarios, plans), ADR 0012 (additive item facts), ADR 0015 (ordinary validation of new records)

## Context

Epic #92 turns a synthetic stress run into reviewed evidence. Four child issues share one need: a fixture is no longer
only "this text, these byte ranges". It is an original value, a transformation, and the question of which source bytes
stand for which decoded bytes.

- #94: standard and URL-safe Base64, padding, hex casing, whole value or embedded, one or nested layers.
- #95: literal line breaks, escaped text and reconstructed fragments, and how a surrounding language rebuilds (or does not rebuild) the value.
- #96: zero-width characters, NBSP, BOM, combining characters, normalization, valid UTF-8 byte chunking against invalid UTF-16 string chunks, expected rejections.
- #99: context, repeated and large-input projections, with the count of independent authored bases reported apart from the count of generated inputs.

The stress run's own limit applies to all of them: transformations of one base are correlated, not independent samples.
Before four research pull requests add records, one decision has to say whether schema 1.5.0 can carry that chain without loss, and if
not, what the narrowest addition is. The private reproduction archive is not an input to this decision or to any record that follows.

## Gap analysis

The chain asked for is: original bytes, transformation, decoded bytes, source spans, with authored bases kept apart from generated
projections. Each row says what 1.5.0 could say, and whether anything was lost.

| # | Requirement | What 1.5.0 could express | Lost without a change | Resolved by |
| --- | --- | --- | --- | --- |
| R1 | Original bytes of an input | `text`: a JSON string, hashed as UTF-8 | Input that is not valid UTF-8 cannot be a JSON string. A 1 MiB input must be embedded byte for byte. | `bytesHex`, `recipe` (decisions 1, 2) |
| R2 | The transformation, machine-readable | `lineage.mutationKind` (a free slug) and `lineage.mutation` (free text), against exactly one other fixture, with twin semantics (a one-property change that flips the outcome) | Alphabet, padding, hex case, whole against embedded, layer order, line-break kind, reconstruction reading. Only prose survives, and nothing can check it. | `transformation` (decision 4) |
| R3 | Decoded bytes | Nothing. Spans are offsets into the input. | The value the source stands for, its length and its digest; whether it equals the authored base. | `expected.spans[].decoded` (decision 3) |
| R4 | Source spans of a fragmented secret | One contiguous `[start, end)` and an optional wider `envelope` | Which bytes inside the range are the secret and which are separators (line breaks, `\`, quotes). Full coverage of one secret cannot be told apart from coverage of its separators. | `expected.spans[].fragments` (decision 3) |
| R5 | Authored base against generated projection | Set level only: `origin.type` and `generated`. A fixture names no base. | Which authored value an input derives from; mixed inputs with two bases; repeated occurrences of one base. | `derivation`, `spans[].base`, plan `fixture` inputs (decisions 2, 3, 6) |
| R6 | Independent base count, apart from generated count | Not derivable: items are all that can be counted | The sample size a scorer may report. | `npm run report:bases` (decision 8) |
| R7 | Unicode invisibles, NBSP, BOM, combining marks, normalization | Content: yes, JSON strings hold every one and spans are UTF-8 byte offsets (see the `multibyte-text-offsets` Scenario). Transformation and decoding: no. | Which code points were inserted, and how the value is recovered. | `insert-codepoints`, `normalize` steps; `strip-codepoints`, `normalize` decode steps |
| R8 | Chunk boundaries; valid UTF-8 byte chunking against invalid UTF-16 string chunks; expected rejection | Nothing. There is no outcome for a rejected input and no chunk description. | The input-domain fact that separates "a valid chunking of a valid input" from "an input an interface rejects", and the separate denominators the issue requires. | `chunking`, `inputValidity` (decision 5) |
| R9 | Context, repeated and large projections; deterministic seed | Plans, cells, carriers, `generation.seed` and several spans per item already exist and are enough for the matrix. Per-occurrence spans exist. | Only the embedding cost of large inputs and the head, middle, tail placement as data. | `recipe`; `place` and `repeat` steps |
| R10 | Allowed envelopes and "uncovered secret bytes against outside-secret ranges" | `envelope` is the allowed wider range. The secret bytes are the span (or, now, its fragments). A consumer computes uncovered and outside bytes by comparing what it reported with them. | Nothing further: the two quantities are derivable. | none |
| R11 | Ambiguous expectations stay unresolved with history | `not-assertable`, `unresolved` basis, review histories | Nothing, except that a fragment reading can be marked `unresolved` and the validator then requires the outcome to match. | `reconstruction` (decision 4) |
| R12 | Public cases against protected holdouts | Not a concept here | Out of scope: a holdout is a population measure owned downstream. | none, stated in the handoffs |

Conclusion: R1 to R5 and R8 lose information in 1.5.0, R6 is not derivable, and R7 and R9 lose only the transformation facts and the
embedding cost. R10 to R12 need nothing. The additions below are each optional, none changes what an existing record means, and none adds an
outcome value.

## Decision

### 1. An item states its content in exactly one of three forms

`text` (unchanged: a JSON string, hashed as UTF-8), `bytesHex` (lowercase hex, for content that is not valid UTF-8) or `recipe` (decision 2). The `required`
list of an item no longer names `text`; a new `oneOf` requires exactly one form. Every earlier record states `text` and stays valid. `sha256` is
always over the exact bytes, and every span is a UTF-8 byte offset into them. A `text` that holds an unpaired surrogate is refused (it has no UTF-8 bytes): give the bytes as `bytesHex`.

### 2. `recipe`: large and repeated inputs as data, not as embedded text

`recipe.parts` is an ordered list (at most 64) of `{ text }`, `{ repeat: { text, times } }` (unit up to 256 characters, up to 4,194,304 repetitions) and `{ fixture }`: the whole content of an authored base. The assembled
bytes are capped at 4 MiB, checked before allocation, so a hostile record cannot make the validator allocate without bound. A `fixture` part is an authored base (never itself a recipe), so
resolution does not recurse. The recipe is the generation rule written down: the validator and the materializer assemble it, check `sha256` and every span against the result, and the
materialized file is the assembled bytes.

### 3. Span facts: `base`, `fragments`, `decoded`

On an expected span of role `secret` (`common.expectedSpan`):

- `base`: the authored base fixture whose value this span carries. Required on every secret span of a projection. A repeated secret is two spans with the same `base`; a mixed input is spans with different bases.
- `fragments`: the secret bytes inside `[start, end)` when the value is not contiguous. At least two, sorted, disjoint, separated by at least one byte, the first starting at `start` and the last ending at `end`. The bytes of `[start, end)` outside the fragments are separators and not secret. Full coverage of the secret is coverage of every fragment; coverage of the separators is not required and, being outside the secret, is an outside-secret byte.
- `decoded`: `{ via, sha256, bytes }`. `via` is the ordered decode steps from the source bytes (the fragments concatenated, else `[start, end)`) to the value: `base64` (alphabet `standard` or `url-safe`, padding `padded` or `unpadded`), `hex` (case `lower`, `upper` or `mixed`), `strip-codepoints` (code points as `U+200B`), `normalize` (`nfc`, `nfd`, `nfkc`, `nfkd`). The decoded plaintext is never repeated: it is the base's secret, and `decoded.sha256` must equal its digest.

The validator re-derives `via` strictly (alphabet, padding, case, canonical form, even hex length) and fails on any mismatch of bytes, digest, length or base. A span with a `base` and no `decoded` must equal the base's value byte for byte.
Nested layers are two steps, in decode order.

### 4. `transformation`, and the three readings of a fragment

An item that is a projection may state `transformation.steps` (at most 16), the input-level steps from the base to this content, in forward order:

| `op` | Fields | Mirrors |
| --- | --- | --- |
| `encode` | `codec` `base64` with `alphabet`, `padding`; or `hex` with `case` | `decoded.via` `base64`, `hex` |
| `insert-codepoints` | `codePoints`, optional `positions` (`start`, `inside`, `end`, `between-every-character`) | `strip-codepoints` |
| `normalize` | `form` | `normalize` |
| `fragment` | `mechanism` (slug), `lineBreak` (`lf`, `crlf`, `cr`, `none`), optional `width`, `reconstruction` | `fragments` |
| `embed` | `mode` `whole-value` or `embedded`, optional `carrier` | none |
| `escape` | `style` (slug) | none |
| `place` | `placement` `head`, `middle`, `tail`; `fillerBytes` | none |
| `repeat` | `count` | none |

`reconstruction` is the data form of issue #95's three readings: `reconstructs-original` (the surrounding language or serialization rebuilds the value: a shell line continuation, string concatenation), `inserts-separator` (whitespace was inserted into a different value:
a literal line feed in plain text) and `unresolved` (the reading depends on the consumer). The validator ties it to the outcome: a `must-flag` item cannot rest on anything but `reconstructs-original`, a span with `fragments` needs one, and `unresolved` forces `not-assertable`.
This records the mechanism, never a claim about a particular language: the evidence for why a mechanism reconstructs lives in the Case or Scenario rationale and its sources.

When an item has exactly one secret span with `decoded`, its `encode`, `insert-codepoints` and `normalize` steps must be the reverse of that span's `via`. With several secret spans the per-span `decoded.via` is the checked form and the item steps are descriptive.
`lineage` is unchanged and keeps its meaning (a twin or mutation pair where one property flips the outcome); a projection names its bases through `derivation`, not through `lineage`.

### 5. Chunking and input validity, with a separate denominator

- `chunking`: `{ unit: utf8-byte | utf16-code-unit, boundaries }`, strictly increasing, inside the content. A UTF-8 byte boundary may fall inside a multibyte sequence and the input is still valid for a byte stream. A UTF-16 code-unit boundary between the two halves of a surrogate pair makes that chunk an invalid string.
- `inputValidity`: `valid` (default), `invalid-utf8`, `unpaired-surrogate-split`. **The validator verifies the claim** against the bytes and the boundaries, in both directions: a valid-looking input cannot be labelled invalid, and an invalid one cannot be left unlabelled.
  An item that is not `valid` is an expected rejection: its outcome is `not-assertable` and it has no spans. No `reject` outcome is added: a new outcome would change what every consumer that switches on `expected.outcome` reads. The Case it projects states the project-policy
  basis ("a rejection is recorded as input validity, not as a true or false negative"). The manifest carries `inputValidity`, so a consumer keeps the item out of every true-positive and false-negative denominator and reports it as its own one.
- A product error code is never a field here. Whether an interface rejects, with which code, is the owning product's assertion (see the handoffs).

### 6. Authored base against projection, and plan declared bases

`derivation.kind` is `authored-base` or `projection`. An authored base is a hand-written item in a `generated: false` set, with at most one secret span (or none, for a benign base, whose value is its whole content), and no transformation, chunking or recipe. A projection names `bases`
(authored base fixtures; one for a single-secret input, several for a mixed one) and may live in an authored set (a hand-written pair) or a generated one. An item with no `derivation` is **unattributed**: every item that existed before 1.6.0. Nothing is guessed for them.
A fixture plan may list authored bases in `generation.inputs` with the new kind `fixture`; when it does, every base its cells use must be among them.

### 7. What the validator checks

All in `scripts/lib/representation.mjs`, shared with the materializer, `record:new` and the report. Beyond schema: the sha256 of the assembled content; a recipe's ceiling and its `fixture` parts; every base resolves to an authored base; every secret span of a projection has a base listed in `derivation.bases`; each `decoded` re-derives to the base's value, length and digest; each identity span equals the base's value; fragment geometry;
the reconstruction rules of decision 4; the mirror of `transformation` and `via`; `inputValidity` against the bytes and the chunk boundaries; chunk boundaries inside the content; a plan's declared bases.

### 8. `npm run report:bases`

`npm run report:bases [-- <dir> ...] [--json] [--plan <id>]` counts, deterministically and read-only: fixtures; authored bases and their distinct values; **independent base values used by projections** (distinct SHA-256 of the base's secret, or of its content for a benign base: two base ids holding one value count once); projections, split into generated and hand-authored; unattributed items; and, per plan, the items,
the generated projections, the independent bases, the declared bases and any base used but not declared or declared but unused. The figure a scorer may call the sample size is the independent base count. The generated count says how many correlated inputs came from it. The two are never added. On the current tree every item is unattributed; the report says so rather than inferring bases from the 5,950 imported fixtures.

### 9. `record:new fixture`

`--authored-base`, `--projection-of <base-fixture-id>` (repeatable) and `--extra-file <json>` (`transformation`, `chunking`, `inputValidity` and, per `--secret` in offset order, `spans: [{ base, fragments, decoded }]`). The tool runs the same checks as the validator and refuses a lineage it would reject. A `recipe` item is generator output and is not scaffolded by hand.

## Schema revision 1.6.0

Additive per ADR 0002; every v1 schema now carries revision 1.6.0. New optional properties: on `fixture-set` items `bytesHex`, `recipe`, `derivation`, `transformation`, `chunking`, `inputValidity`; on `expectedSpan` `base`, `fragments`, `decoded`; one new enum value on a plan's `generation.inputs[].kind` (`fixture`). `text` leaves the item's `required` list in favour of the one-of; a record that states `text` means exactly what it meant.
New shared definitions: `byteRange`, `codePoint`, `decodeStep`, `decodedValue`. No outcome, evidence class or enum value that existing records use changed.

## Evidence that existing data is unaffected

- `npm run validate`: every record under `records/`, `migration/` and `examples/valid/` validates unchanged.
- `npm run fixtures:materialize:check`: the materialization digest of the 5,950 imported fixtures is `fed56318f500cdc95003a14b76e512a01e5e3fde58911fec32aba1beb913db59` before and after. The manifest adds the new keys only to an item that states them, so every earlier entry serializes identically.
- Worked examples, all synthetic (`examples/valid/representation/`, built from the words SYNTHETIC and EXAMPLE and zeros; none issued, none tested against any service): standard padded Base64, nested URL-safe over standard, upper-case hex embedded in JSON, a benign Base64 of the documented placeholder, a shell line continuation that reconstructs, a literal line feed that does not, an escaped-newline reading left unresolved, a zero-width space inside the key,
  an emoji with a UTF-8 byte boundary inside it (valid) and a UTF-16 boundary inside it (rejected), invalid UTF-8 bytes (rejected), and five placement projections of two bases as recipes (head, middle and tail of 64 KiB, a repeated key, two distinct keys). Each claim in them is re-derived by the validator (`tests/representation.test.mjs`).
- Each rule above has a test that breaks the example one way and expects the validator's message.

## Consequences

- #94, #95, #96 and #99 add authored bases, Cases, Scenarios and plans with `record:new` and `--extra-file`, and generated projections as generated sets with recipes. The representation guide is in [docs/authoring.md](../authoring.md#representing-transformed-credentials) and
  [`_shared/representation.md`](../../.agents/skills/_shared/representation.md). Each of the four reports `npm run report:bases` in its PR notes.
- The schema revision bump changes `evidence_schema` in the credential-eval snapshot identity and in the legacy projection manifest and parity report, so those are regenerated here. A release carries the change only under a **new** tag; `snapshot-2026.10.01.2` and earlier are immutable (ADR 0011).
- Not done, on purpose. The legacy projection and the credential-eval snapshot builders are unchanged: they read the import baseline (ADR 0015) and credential-eval's contract is closed, so a snapshot that carries `fragments`, `decoded`, `derivation` or `inputValidity` is a later decision with credential-eval. Until then a fragmented secret reaches
  an old-contract consumer only through the manifest. A new item that states `bytesHex` or `recipe` must not be given a legacy name.
- Counting caveat: base values are compared by digest, so an authored base that differs from another by one character counts as independent. Independence of a base from the generator's other values is a research judgement, recorded in the Case, not computed.

## Handoffs

This repository states facts about inputs. It does not change any owner's policy.

| Owner | What this decision gives it | What stays its decision |
| --- | --- | --- |
| credential-eval | Exact original bytes, spans (secret bytes by fragment), decoded digest per span, `inputValidity` and chunk boundaries in the manifest | Execution; mapping a decoded finding to a source range (its peer adapters were reported ambiguous or unmappable on encoded inputs: errors stay unmeasured, never zero detections); denominators; whether the snapshot contract gains these fields |
| redact-secret | The reconstruction reading per mechanism, the bounded decode steps (depth, size) that the examples exercise | Decoding, depth and size limits, expansion bounds, the action (warn, redact, block), rejection codes and input and finding limits |
| redact-secret-benchmarks | Reviewed expectations with rationale, base counts, projection lineage | Actual-output checks, qualification, population measures, protected holdouts (public cases stay separate from them) |

## Open questions

- Whether credential-eval's snapshot contract should gain non-asserting `fragments`, `decoded` and `inputValidity` (as it did not for `candidateReading`, ADR 0012).
- Whether `mechanism` and `style` slugs deserve a controlled vocabulary once #95 has produced a dozen of them.
- Whether Unicode normalization should be restricted to a pinned Unicode version: normalization forms are stable across versions, but a pinned data version would make that a stated fact.
