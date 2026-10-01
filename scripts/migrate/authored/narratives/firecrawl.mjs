// Authored family narratives for the Firecrawl dossier (benchmarks/support/dossiers/firecrawl.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

export default {
  provider: "firecrawl",
  dropped: [
    { part: "Candidate: legacy bare dashed UUID keys", reason: "carried as a collision statement under the API key family; not attributable on their own" },
    { part: "Candidate: fco_ OAuth access token and fcmcp_ MCP delegated credential", reason: "no fixed grammar documented; carried as an unresolved statement, not families" },
    { part: "Open question 2 (revisit fco_ and fcmcp_ if a grammar is published)", reason: "a future-work note, not credential knowledge" },
  ],
  families: [
    {
      id: "firecrawl:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "An API key begins fc-. The documentation and the provider's SDK and MCP code document the prefix.",
            claims: ["provider-source", "field-prefix"],
          },
          {
            id: "body",
            cls: "provider-documented",
            text: "The body is exactly 32 lowercase hexadecimal characters, 35 in all: a dashless random UUID version 4, so the 13th hex character is 4 and the 17th is one of 8, 9, a or b. There is no separator after the prefix and no checksum. This comes from provider server code: the key normalizer strips the prefix and re-inserts dashes in the 8-4-4-4-12 layout, the key column defaults to a random UUID, and the auth controller rejects anything that fails a UUID check.",
            claims: ["provider-source", "field-body", "field-uuid-v4-nibbles", "field-separators"],
          },
          {
            id: "version-acceptance",
            cls: "provider-documented",
            text: "The server's validator would accept UUID versions 1 through 8, but issued keys are version 4.",
            claims: ["field-uuid-v4-nibbles"],
          },
        ],
        issuance: [
          {
            id: "use",
            unresolved: "Recorded in a research note without a cited source in this family's contract; the credit-spending role and the Bearer carrier are from the overview of the research note.",
            text: "A key is set in the FIRECRAWL_API_KEY variable, sent as a bearer token, and spends the team's credits.",
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for the research; the grammar rests on provider code.",
            text: "No Firecrawl key was issued or observed for this record.",
          },
        ],
        lifecycle: [
          {
            id: "legacy-keys",
            cls: "provider-documented",
            text: "Bare dashed UUID keys from before 2024-04-16 are still accepted by the server's key parser. They carry no prefix, so they cannot be attributed to Firecrawl by shape.",
            claims: ["field-legacy-keys"],
            historical: true,
          },
        ],
        collisions: [
          {
            id: "short-prefix",
            unresolved: "Recorded in a research note without a cited source: fc- is a short prefix that also appears in CSS and calendar class names such as fc-daygrid-day, which fail the 32-hex body.",
            text: "The short fc- start also appears in CSS and calendar class names, which do not match the body.",
            leadClaims: ["field-boundary"],
          },
          {
            id: "dashed-uuid",
            cls: "provider-documented",
            text: "A bare dashed UUID is not attributable to Firecrawl: the legacy key form is indistinguishable from any other identifier of that shape.",
            claims: ["field-legacy-keys"],
          },
          {
            id: "other-credentials",
            unresolved: "No fixed grammar is documented for these two credentials.",
            text: "The fco_ OAuth access token (opaque, introspected) and the fcmcp_ delegated MCP credential (HMAC, base64url, up to 2048 characters) are separate credentials.",
            leadClaims: ["field-other-credentials"],
          },
        ],
        openQuestions: [
          {
            id: "unprefixed-in-dashboard",
            unresolved: "No key was issued for the research, so it is not known whether the dashboard still shows any unprefixed key.",
            text: "Does the dashboard still show any unprefixed key?",
          },
        ],
      },
    },
  ],
};
