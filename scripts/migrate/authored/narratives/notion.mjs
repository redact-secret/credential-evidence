// Authored family narratives for the Notion dossier (benchmarks/support/dossiers/notion.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const PAT_GUIDE = "https://developers.notion.com/guides/get-started/personal-access-tokens.md";

export default {
  provider: "notion",
  dropped: [
    { part: "Candidates: nrt_ refresh token and development_ntn_ dev-environment tokens", reason: "unclaimed and backed by one documentation example; carried as unresolved collision statements on the integration-token family" },
    { part: "Candidates: OAuth client secret and organization bot token", reason: "formats undocumented; there is nothing to record" },
    { part: "Open question 4 (which GitHub secret-scanning type covers ntn_)", reason: "a question about a scanner partner list, not credential knowledge" },
    { part: "Remark about Notion's own MCP server code and README using different prefixes", reason: "carried as an unresolved statement on the legacy-integration-token family" },
  ],
  families: [
    {
      id: "notion:legacy-integration-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "Notion's changelog for the September 2024 prefix change documents secret_ as the legacy Public API token prefix that keeps working, with ntn_ for newly generated tokens.",
            claims: ["provider-source", "field-prefix"],
          },
          {
            id: "body",
            unresolved: "Only one scanner rule is cited for the body; Notion says the token is opaque, that its format may change and advises against regular-expression validation, which covers bodies and not the documented prefixes.",
            text: "After secret_ come 43 letters and digits.",
            leadClaims: ["field-body", "tool-corroboration"],
          },
        ],
        issuance: [
          {
            id: "no-new-legacy",
            unresolved: "New tokens are ntn_, so a fresh legacy sample cannot be minted; Notion's own MCP server code still says secret_ marks legacy tokens while its README uses ntn_, and neither source is cited by this family's contract.",
            text: "No new secret_ token is issued, and none was observed for this record.",
          },
        ],
        lifecycle: [
          {
            id: "still-valid",
            cls: "provider-documented",
            text: "Existing secret_ tokens keep working after the move to ntn_.",
            claims: ["field-prefix"],
          },
        ],
        collisions: [
          {
            id: "ntn-successor",
            unresolved: "The successor is a separate family whose values are secrets; this contract holds the relationship as unresolved.",
            text: "Tokens generated after September 2024 begin ntn_ and are a separate family.",
            leadClaims: ["field-ntn-successor"],
          },
          {
            id: "secret-word-and-ids",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "secret_ also appears as an OAuth client secret shape (unverified) and as an ordinary word in many strings. Page and database ids (UUIDs or 32 hexadecimal characters) and share-URL ids are public.",
          },
        ],
        openQuestions: [
          {
            id: "still-issued",
            unresolved: "No source states whether secret_ is still issued anywhere in 2026.",
            text: "Is secret_ still issued anywhere?",
          },
        ],
      },
    },
    {
      id: "notion:integration-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "Public API tokens generated from 2024-09-25 begin ntn_, and existing secret_ tokens keep working.",
            claims: ["field-prefix"],
          },
          {
            id: "body",
            cls: "tool-corroborated",
            text: "After ntn_ come 11 digits and then 35 letters and digits, 50 characters in all. The body comes from one contributor's samples in a scanner issue, carried into several scanners; a secret-linting tool agrees on lengths and a redaction library disagrees (no digit run). Notion advises against regular-expression validation of its tokens.",
            claims: ["field-body", "tool-corroboration"],
          },
          {
            id: "docs-placeholder",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Notion's documentation shows a placeholder with 33 lowercase letters after ntn_, which does not fit the 11-digit-plus-35 body.",
          },
          {
            id: "digit-run-meaning",
            unresolved: "Not documented whether the 11-digit run is a timestamp, a per-workspace or per-bot id, or random.",
            text: "The 11-digit run has an identifiable meaning.",
            leadClaims: ["field-digit-run-semantics"],
          },
        ],
        issuance: [
          {
            id: "where-created",
            unresolved: "Recorded in a research note without a cited source in this family's contract; no token was issued.",
            text: "Internal connection tokens come from the developer portal's Configuration tab and personal access tokens from the settings page.",
          },
        ],
        collisions: [
          {
            id: "shared-prefix",
            cls: "provider-documented",
            text: "The same ntn_ prefix is documented for personal access tokens, and Notion's tooling also uses it for CLI tokens and connection tokens, possibly OAuth access tokens as well. Whether these roles share one body grammar is not known.",
            cite: [PAT_GUIDE],
          },
          {
            id: "siblings",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "nrt_ (OAuth refresh token, one documentation sample of 13 digits and 32 letters and digits) and development_ntn_ are siblings. Ids such as the bot id, workspace id and personal access token record id are UUIDs and public.",
          },
        ],
        openQuestions: [
          {
            id: "shared-body",
            unresolved: "Personal, CLI, OAuth access and internal tokens are not shown to share one body; issued samples of each would settle it.",
            text: "Do personal access tokens, CLI tokens, OAuth access tokens and internal tokens share one body?",
          },
          {
            id: "digit-run-repeats",
            unresolved: "No source states whether the 11-digit run repeats across tokens of one user, workspace or connection.",
            text: "Does the 11-digit run repeat across tokens of one user, workspace or connection?",
          },
        ],
      },
    },
  ],
};
