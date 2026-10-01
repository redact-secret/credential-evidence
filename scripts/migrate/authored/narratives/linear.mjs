// Authored family narratives for the Linear dossier (benchmarks/support/dossiers/linear.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

export default {
  provider: "linear",
  dropped: [
    { part: "Candidate: unprefixed 64-character hex OAuth access token", reason: "carried as an unresolved collision statement on the oauth-access-token family; without a prefix it is not a distinct credential family" },
    { part: "Research log", reason: "issue workflow and release history, not credential knowledge" },
  ],
  families: [
    {
      id: "linear:personal-api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "Linear's changelog of 2021-08-19 says API keys and OAuth access tokens were changed to carry the prefixes lin_api_ and lin_oauth_ so that GitHub secret scanning could detect them. A personal API key begins lin_api_.",
            claims: ["provider-source"],
          },
          {
            id: "body",
            cls: "tool-corroborated",
            text: "After the prefix come 40 letters and digits, with no underscore or hyphen in the body. The length and alphabet come from two scanner rules that agree; Linear states only the prefix.",
            claims: ["tool-corroboration"],
          },
        ],
        collisions: [
          {
            id: "oauth-prefix",
            cls: "provider-documented",
            text: "The lin_oauth_ prefix marks a separate credential, an OAuth access token, and its body is not the 40-character API key body.",
            claims: ["provider-source"],
          },
          {
            id: "client-secret",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "One scanner has a separate, context-gated rule for a 32-character hexadecimal Linear client secret, which is another Linear value.",
          },
        ],
      },
    },
    {
      id: "linear:oauth-access-token",
      status: "partial",
      note: "Only the prefix is established; no body grammar, issuance detail or scanner corroboration exists, so shape is mostly unresolved.",
      sections: {
        shape: [
          {
            id: "prefix",
            unresolved: "The 2021 changelog names the prefix, but the contract holds this family's only claim as unresolved, so the prefix cannot be cited as support here.",
            text: "An OAuth access token begins lin_oauth_.",
            lead: ["https://linear.app/changelog/2021-08-19-github-secret-scanning"],
            leadClaims: ["dossier-research"],
          },
          {
            id: "body-grammar",
            unresolved: "The changelog gives no length or alphabet and no scanner rule covers the family; the 40-character API key length must not be reused.",
            text: "The body after lin_oauth_ has a known length and alphabet.",
          },
        ],
        collisions: [
          {
            id: "bare-hex-example",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Linear's OAuth documentation shows an access token as a bare 64-character hexadecimal string with no prefix, which cannot be told apart from ordinary hexadecimal.",
          },
        ],
        openQuestions: [
          {
            id: "body-length-alphabet",
            unresolved: "One issued OAuth access token would settle it; none was issued.",
            text: "What are the length and alphabet of the lin_oauth_ body?",
          },
          {
            id: "unprefixed-still-issued",
            unresolved: "No source states whether the unprefixed token is still issued alongside the prefixed one.",
            text: "Is the unprefixed hexadecimal token still issued alongside the prefixed one?",
          },
        ],
      },
    },
  ],
};
