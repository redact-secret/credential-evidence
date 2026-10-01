// Authored family narratives for the Replicate dossier (benchmarks/support/dossiers/replicate.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const TOKENS_DOC = "https://replicate.com/docs/topics/security/api-tokens";

export default {
  provider: "replicate",
  dropped: [
    { part: "Candidate and open question 4: the cog login token", reason: "whether it is the same credential as the API token is unknown and no shape is recorded; carried as an unresolved collision statement rather than a family" },
    { part: "Contract note about the provider-stated length being exact and the alphabet provisional", reason: "support status of the project's own matching, not credential knowledge" },
  ],
  families: [
    {
      id: "replicate:api-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-length",
            cls: "provider-documented",
            text: "Replicate's API tokens page says a token is a 40-character string that always starts with r8_, which fixes the prefix and a 37-character body. The page states no body alphabet.",
            claims: ["provider-source", "field-prefix", "field-total-length"],
          },
          {
            id: "alphabet",
            cls: "tool-corroborated",
            text: "Every observed token body is letters and digits only. One scanner rule also admits hyphen and underscore, while two other rules accept letters and digits only; the provider does not state a character set, so any non-word character is treated as outside the grammar.",
            claims: ["field-body-alphabet"],
          },
          {
            id: "no-checksum-documented",
            unresolved: "No source states a checksum or an embedded account identifier, and the absence of one from the provider's page does not show that none exists.",
            text: "The token carries no checksum or embedded account identifier.",
          },
        ],
        issuance: [
          {
            id: "header-scheme",
            cls: "provider-documented",
            text: "A token is sent as Authorization: Bearer followed by the token. The older Authorization: Token scheme is still accepted (changelog of 2024-04-03).",
            claims: ["field-header-scheme"],
          },
          {
            id: "masked-example",
            cls: "provider-documented",
            text: "The provider's documentation shows a masked example of a token: the r8_ prefix, two visible characters, then asterisks.",
            cite: [TOKENS_DOC],
          },
          {
            id: "creation-and-revocation",
            unresolved: "Recorded in a research note without a cited source in this family's contract; no token was issued.",
            text: "Tokens are created at the account's API tokens page; each account has a default token and can add more, each with a name. Free accounts can create tokens, and Replicate scans public GitHub repositories for committed tokens and disables the ones it finds (it joined GitHub's secret scanning partner program in 2024-04).",
          },
        ],
        collisions: [
          {
            id: "public-r8-strings",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "r8.im/<owner>/<model> container registry references and 64-character hexadecimal model version identifiers are public; they share the r8 stem or sit next to tokens.",
          },
          {
            id: "cog-login-token",
            unresolved: "The relation between the token handed out for the cog command-line login and a created API token is undocumented, so no claim is made.",
            text: "The token obtained for the cog login may be a different credential from an API token.",
            leadClaims: ["field-sibling-tokens"],
          },
        ],
        openQuestions: [
          {
            id: "hyphen-underscore",
            unresolved: "One issued token cannot rule out either character.",
            text: "Can a hyphen or underscore appear in the body?",
          },
          {
            id: "prefix-introduction",
            unresolved: "The earliest dated evidence is the 2024-04 changelog; nothing says when the r8_ prefix began or whether older unprefixed tokens still authenticate.",
            text: "When was the r8_ prefix introduced, and do unprefixed older tokens still authenticate?",
          },
          {
            id: "organization-tokens",
            unresolved: "No source compares organization-owned and user tokens.",
            text: "Do organization tokens differ in shape from user tokens?",
            leadClaims: ["field-sibling-tokens"],
          },
        ],
      },
    },
  ],
};
