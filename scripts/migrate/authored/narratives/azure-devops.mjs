// Authored family narratives for the Azure DevOps dossier (benchmarks/support/dossiers/azure-devops.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const PAT_ARTICLE = "https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate#pat-format";

export default {
  provider: "azure-devops",
  dropped: [
    { part: "Statement that other Azure credentials (Entra client secrets, storage connection strings) are separate providers", reason: "scope note about other providers, not a claim about this family" },
    { part: "Candidate: legacy 52-character PAT as a family", reason: "no marker or structure to build a grammar on; carried as an unresolved collision of the current format" },
    { part: "Statement that scanners still target the older format", reason: "state of other scanners, not credential knowledge" },
  ],
  families: [
    {
      id: "azure-devops:personal-access-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "length-and-signature",
            cls: "provider-documented",
            text: "A token is 84 characters long with the fixed signature AZDO at zero-based offsets 76 to 79: 76 characters, then AZDO, then 4 characters. Microsoft's article words this as positions 76 through 80, which spans five positions for a four-character marker; only the zero-based half-open reading fits the worked example on Microsoft's Purview page.",
            claims: ["provider-source", "field-total-length", "field-signature"],
          },
          {
            id: "alphabet",
            cls: "provider-documented",
            text: "Every position outside the signature is a letter or digit, case-sensitive. The Purview page's own format summary says letters, digits and special characters, which contradicts its detailed pattern and its worked example; the detailed pattern is followed here.",
            claims: ["field-alphabet"],
          },
          {
            id: "random-portion",
            cls: "provider-documented",
            text: "The provider says 52 of the 84 characters are random and does not say what the other 32 hold, so only the length, marker position and alphabet are claims.",
            cite: [PAT_ARTICLE],
          },
        ],
        issuance: [
          {
            id: "purpose",
            cls: "provider-documented",
            text: "Azure DevOps issues personal access tokens for its REST APIs and for Git operations; Microsoft publishes the current format.",
            cite: [PAT_ARTICLE],
          },
          {
            id: "not-issued",
            unresolved: "No token was issued for this research.",
            text: "No Azure DevOps token was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "legacy-52-character",
            unresolved: "Recorded as an unsupported variant in a tracking note; no provider source for the older format was read for this record.",
            text: "The previous token format is a 52-character alphanumeric value with no embedded marker and no distinguishing structure.",
            leadClaims: ["field-legacy-52-character-generation"],
          },
        ],
        openQuestions: [
          {
            id: "purview-alphabet-contradiction",
            unresolved: "An issued token containing a non-alphanumeric character would settle which of the page's two alphabet statements is right.",
            text: "Does a real token ever contain a character outside letters and digits, as the Purview format summary implies?",
          },
          {
            id: "non-random-characters",
            unresolved: "No source says what the 32 non-random characters contain.",
            text: "What do the 32 non-random characters of the token hold?",
          },
        ],
      },
    },
  ],
};
