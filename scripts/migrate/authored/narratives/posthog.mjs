// Authored family narratives for the PostHog dossier (benchmarks/support/dossiers/posthog.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const shapeStatements = (prefix) => [
  {
    id: "prefix-and-generator",
    cls: "provider-documented",
    text: `The key is the prefix ${prefix} followed directly by a random body, with no separator inside the body and no checksum. The provider's key-generation code in its repository, last read at the pinned revision, defines the prefix and the generator.`,
    claims: ["provider-source", "field-prefix", "field-separators"],
  },
  {
    id: "eras",
    cls: "provider-documented",
    text: "Body length and alphabet depend on the generation date, and keys of every era can still be live because rotation is optional. Since 2026-03-30 the body is 48 or 49 characters from a base57 alphabet (base62 without 0, 1, O, I and l). Until then it was a 35-byte base62 body of at most 48 characters; earlier still a 32-byte base62 body of at most 43 characters.",
    claims: ["field-alphabet", "field-body"],
  },
  {
    id: "length-band",
    cls: "provider-documented",
    text: "Across the eras a key therefore has 42 to 49 letters and digits after the prefix. About 1.6 percent of the oldest keys render at 42 characters; shorter renderings are under 0.03 percent of any era. The per-length shares are derived from the generator algorithm, not observed.",
    claims: ["field-body"],
  },
];

export default {
  provider: "posthog",
  dropped: [
    { part: "Candidate: phc_ project token", reason: "public by design and never a credential; carried as a collision statement of both families" },
    { part: "Candidate: pha_ and phr_ OAuth tokens and phh_ heatmap tokens", reason: "short-lived and not researched as families; carried as an unresolved statement" },
    { part: "Candidate: era-1 unprefixed personal keys", reason: "not lexically attributable; carried as a collision statement of the personal key family" },
    { part: "Open question 2 (whether OAuth tokens should become families) and the scanner-lag discussion", reason: "a scoping decision for the project and scanner coverage, not credential knowledge" },
  ],
  families: [
    {
      id: "posthog:personal-api-key",
      status: "migrated",
      sections: {
        shape: [
          ...shapeStatements("phx_"),
          {
            id: "scanner-width-difference",
            cls: "tool-corroborated",
            text: "One scanner rule reads this key as phx_ plus 43 to 48 letters, digits and underscores, which misses 49-character base57 bodies and 42-character base62 bodies and admits an underscore the generator never emits; it is not used to narrow the band.",
            claims: ["field-peer-lag"],
          },
          {
            id: "boundary",
            unresolved: "Treating a key attached to an identifier character as not a key, and a run of 50 or more characters as not a key, are project boundary choices, not provider statements.",
            text: "A run of 50 or more characters after the prefix, or a key directly attached to a letter, digit, underscore or hyphen, is not a key.",
            leadClaims: ["field-boundary"],
          },
        ],
        issuance: [
          {
            id: "documented-key",
            cls: "provider-documented",
            text: "The provider's documentation describes the phx_ personal API key; it acts as the user across every organization the user can reach.",
            claims: ["provider-source", "field-prefix"],
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for this research; an optional check of one key issued today would be expected to be 48 or 49 characters with none of 0, 1, O, I and l.",
            text: "No PostHog personal API key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "project-token",
            cls: "provider-documented",
            text: "The phc_ project token is public by design (the documentation says it is fine to be public) and is not a secret.",
            claims: ["field-project-token"],
          },
          {
            id: "unprefixed-era-1",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "The earliest personal keys had no prefix and were 43 characters of URL-safe Base64; they have no distinguishing anchor.",
          },
          {
            id: "other-prefixes",
            unresolved: "These prefixes are outside what the research covered; no source cited for this family states their shape or lifetime.",
            text: "The pha_ and phr_ OAuth access and refresh tokens and the phh_ heatmap tokens are short-lived credentials with the same prefix style.",
            leadClaims: ["field-deferred-prefixes"],
          },
        ],
      },
    },
    {
      id: "posthog:project-secret-api-key",
      status: "migrated",
      sections: {
        shape: [
          ...shapeStatements("phs_"),
          {
            id: "boundary",
            unresolved: "Treating a key attached to an identifier character as not a key, and a run of 50 or more characters as not a key, are project boundary choices, not provider statements.",
            text: "A run of 50 or more characters after the prefix, or a key directly attached to a letter, digit, underscore or hyphen, is not a key.",
            leadClaims: ["field-boundary"],
          },
        ],
        issuance: [
          {
            id: "documented-secret",
            cls: "provider-documented",
            text: "The provider's documentation describes phs_ as a project-scoped secret key used for feature-flag evaluation. It uses the same generator and body as the personal API key.",
            claims: ["provider-source"],
          },
          {
            id: "length-today",
            unresolved: "No key was issued; the generator suggests 48 or 49 characters like the personal key, but no issued phs_ key was measured.",
            text: "A phs_ key issued today is 48 or 49 characters long.",
          },
        ],
        collisions: [
          {
            id: "project-token",
            cls: "provider-documented",
            text: "The phc_ project token is public by design (the documentation says it is fine to be public) and is not a secret.",
            claims: ["field-project-token"],
          },
        ],
      },
    },
  ],
};
