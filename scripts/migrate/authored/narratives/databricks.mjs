// Authored family narratives for the Databricks dossier (benchmarks/support/dossiers/databricks.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const PAT_PAGE = "https://docs.databricks.com/aws/en/dev-tools/auth/pat";
const PURVIEW = "https://learn.microsoft.com/en-us/purview/sit-defn-azure-databricks-personal-access-token";

export default {
  provider: "databricks",
  dropped: [
    { part: "Candidate: other Databricks secret types (OAuth client secrets and the rest of the 12 listed by GitHub)", reason: "no shape research; not families yet" },
    { part: "Open question 3 (whether a provider page ever states the prefix, length or alphabet)", reason: "carried as unresolved statements in the family" },
  ],
  families: [
    {
      id: "databricks:personal-access-token",
      status: "partial",
      note: "The optional rotation suffix (a hyphen and a digit) is left out of the shape: it rests on scanner rules that disagree about its meaning, digit count and existence.",
      sections: {
        shape: [
          {
            id: "prefix-and-body",
            cls: "tool-corroborated",
            text: "A personal access token is the prefix dapi followed by 32 lowercase hexadecimal characters. Three scanner rules agree on this shape.",
            claims: ["tool-corroboration"],
          },
          {
            id: "purview-length",
            cls: "tool-corroborated",
            text: "Microsoft's data-classification definition for Azure Databricks tokens gives only a length of 32 characters and admits uppercase A to F, and its own example contradicts its pattern.",
            cite: [PURVIEW],
          },
          {
            id: "provider-silent",
            unresolved: "The provider's token page uses placeholders only; no Databricks page states the prefix, the length or the alphabet.",
            text: "Databricks documents the dapi prefix, the 32-character length and the lowercase hexadecimal alphabet.",
            lead: [PAT_PAGE],
          },
          {
            id: "uppercase-hex",
            unresolved: "Sources disagree and no token was measured; only one issued token could settle whether uppercase A to F can occur.",
            text: "A real token may contain uppercase hexadecimal characters.",
            leadClaims: ["mutable-property-source"],
          },
          {
            id: "rotation-suffix",
            unresolved: "Four scanner rules mention a hyphen and a digit after a rotation, but their meaning, digit count and even existence differ, and no provider source states it.",
            text: "A rotated token may be followed by a hyphen and a digit.",
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "A token authenticates REST and command-line calls to a workspace through an Authorization header with the Bearer scheme, the DATABRICKS_TOKEN environment variable, or a token line in the .databrickscfg profile file.",
            cite: [PAT_PAGE],
          },
          {
            id: "not-issued",
            unresolved: "No token was issued for this research; measuring case and suffix needs one issued token.",
            text: "No personal access token was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "public-values",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Workspace hostnames (dbc- and adb- prefixes) and the token id returned beside a token value are public. OAuth client secrets are a separately documented credential and not this family.",
          },
        ],
        openQuestions: [
          {
            id: "uppercase-hex-question",
            unresolved: "Needs one issued token measured for case only.",
            text: "Can a real token contain A to F in uppercase?",
          },
          {
            id: "suffix-question",
            unresolved: "Digit count and semantics differ across tools, and no provider source describes the suffix.",
            text: "What is the hyphen-and-digit suffix, if it exists?",
          },
        ],
      },
    },
  ],
};
