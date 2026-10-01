// Authored family narratives for the Apify dossier (benchmarks/support/dossiers/apify.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const MCP_SERVER = "https://github.com/apify/apify-mcp-server";

export default {
  provider: "apify",
  dropped: [
    { part: "Candidate: apify_ui_ Console tokens as a family of their own", reason: "not a family yet; the prefix is recorded under collisions and the missing length and alphabet source under open questions" },
    { part: "Candidate: Actor Run, Integration and Webhook Dispatch API tokens", reason: "no shape is public, so there is no claim to record" },
    { part: "Candidate: proxy password", reason: "fourteen alphanumerics from an example that cannot be attributed to the provider; not a credential family" },
  ],
  families: [
    {
      id: "apify:api-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-alphabet-floor",
            cls: "provider-documented",
            text: "A token begins apify_api_ and continues with letters and digits, at least 20 of them, with no separator and no checksum. The prefix appears in the provider's documentation placeholders; the alphabet and the floor come from a leak linter the provider publishes in its own skills repository.",
            claims: ["provider-source", "field-prefix", "field-alphabet", "field-floor"],
          },
          {
            id: "observed-width-36",
            cls: "tool-corroborated",
            text: "No provider source states an exact length. The only observed width is 36 body characters, from a scanner rule that requires exactly 36 and allows a wider character class than the provider's own linter.",
            claims: ["field-peer-lag"],
          },
          {
            id: "upper-bound",
            unresolved: "A cap of 128 characters was chosen for bounded matching; it is a limit adopted by this project, not a provider fact, and the provider's own pattern is open-ended.",
            text: "Token length has an upper bound of 128 body characters.",
            leadClaims: ["field-upper-bound"],
          },
          {
            id: "shared-prefix-across-kinds",
            unresolved: "Recorded in a research note without a cited source; no provider page was read that says personal, organization and scoped tokens share one prefix.",
            text: "Personal, organization and scoped tokens share the one apify_api_ prefix.",
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "The token is read from the APIFY_TOKEN environment variable and sent as an Authorization: Bearer header or as a token query parameter.",
            claims: ["field-transport"],
          },
          {
            id: "not-issued",
            unresolved: "No token was issued for this research; a structure-only check of one personal, one organization and one scoped token was proposed but not performed.",
            text: "No Apify token was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "console-session-tokens",
            cls: "provider-documented",
            text: "Console session tokens begin apify_ui_, as shown by a startsWith branch in the provider's MCP server code. No source states their length or alphabet, so they are a separate credential with an unknown grammar.",
            cite: [MCP_SERVER],
          },
          {
            id: "placeholders-too-short",
            cls: "provider-documented",
            text: "A placeholder made of the prefix followed by a word breaks the alphanumeric run below 20 characters, so it falls below the provider's floor.",
            claims: ["field-prefix", "field-alphabet", "field-floor"],
          },
        ],
        openQuestions: [
          {
            id: "uniform-width",
            unresolved: "No source states a width; a structure-only check of personal, organization and scoped tokens would show whether 36 is uniform.",
            text: "Is the token body always 36 characters across personal, organization and scoped tokens?",
          },
          {
            id: "console-token-grammar",
            unresolved: "No source gives a length or alphabet for apify_ui_ tokens.",
            text: "Do apify_ui_ Console tokens have a length and alphabet that would let them be described as a family of their own?",
          },
        ],
      },
    },
  ],
};
