# 0002. IDs, schema versioning and migration

- Status: accepted; id rules extended by 0007 (no suite, milestone, issue or migration coordinates)
- Date: 2026-09-30
- Issue: #2 (part of #1)

## Context

Identity must survive scanner renames, schema changes and repository moves.
Legacy identity mixes conventions: `provider:family` ids in the taxonomy and
`category--fixture` slugs in the fixture index. The architecture requires IDs
that are stable, URL-safe, version-independent where possible and independent of
any detector name.

## Decision

### ID and slug rules

All ids are ASCII, lowercase, and URL-safe (unreserved characters plus `:` and
`@`, both legal path characters).

| Entity | Form | Pattern |
| --- | --- | --- |
| slug (base rule) | words joined by single `-` | `^[a-z0-9]+(-[a-z0-9]+)*$`, 1 to 96 chars |
| provider | slug; `generic` is reserved for provider-less families | slug |
| family | `<provider>:<family-slug>` | `^slug:slug$` |
| format-contract | `<family-id>@<revision>` | revision `[1-9][0-9]{0,5}`, no leading zero |
| fixture-projection | `<collection>--<name>` | `^slug--slug$` (legacy fixture slug, kept verbatim) |
| evidence-source, variant, benign-sibling, case, review history | slug | slug |

Rules: an id is assigned once and never reused for a different entity; it is
never renamed (a superseded record keeps its id and points at its successor); it
must not contain a date, a scanner or detector name, or a release name unless the
entity intrinsically has one (a contract revision number is the one permitted
version marker, because revisions are distinct facts). A family id is
independent of any contract revision and of the provider's product renames: if a
provider rebrands, add an alias and keep the id.
The filename is not identity; the `id` inside the record is authoritative and
the validator does not depend on file layout.

### Schema versioning

- Every record states `schemaVersion` (integer) and `kind`. The validator picks
  `urn:credential-evidence:schema:v<schemaVersion>:<kind>` and fails on an
  unknown pair rather than guessing.
- Schema files live in `schemas/v<major>/` and are never deleted or rewritten
  in a breaking way after release; v1 files stay valid forever for v1 records.
- Each schema carries `x-schemaRevision` (`major.minor.patch`). Minor bumps add
  optional properties or new enum values that do not change the meaning of
  existing valid records; patch bumps fix descriptions or tighten nothing. A
  test enforces one shared revision per major.
- A change is breaking, and needs a new major, when a previously valid record
  would become invalid or change meaning: removing or renaming a property,
  narrowing a pattern or enum, making an optional property required, or
  redefining a value. Never reinterpret an existing record in place.

### Migration

- A new major arrives with `schemas/v<n+1>/` and a deterministic, pure migration
  `scripts/migrate/v<n>-to-v<n+1>.mjs` (record in, record out, no network, no
  clock, sorted output). Migrations are idempotent and tested against the
  example records.
- Migrated records get the new `schemaVersion`; the old file in history remains
  the audit trail. A migration that must invent a value is not allowed: it emits
  an explicit `unresolved` marker and a review-history event instead.
- Additive changes (preferred) need no migration. Adding a required field is
  breaking unless it has a total default expressible for every old record.
- Exporters for legacy consumers (#6) read canonical records and never write
  back. Exports name source revision, schema revision, generator version and a
  digest.

## Consequences

- The legacy `provider:family` and `category--fixture` forms carry over
  unchanged, so imports (#3, #4) need no id translation for those. Checked
  against the legacy repository at `ade8a10bd7922765110a68986b0690eb3861f2e5`:
  every provider id and family id in `taxonomy.json` and all 5925 fixture slugs
  in `fixture-index.json` match the patterns above.
- `schemas/v1/` is now a compatibility promise. Anything experimental lands as
  an optional property in a minor revision.
- Only the `v1` schema exists today, so no migration script is shipped; the
  policy is what future changes are checked against.

## Open questions

- Whether contract revisions should ever be reassigned after a merge conflict;
  proposal: no, allocate the next free integer and record both in `supersedes`.
