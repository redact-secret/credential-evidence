// Authored family narratives for the Cerebras dossier (benchmarks/support/dossiers/cerebras.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

export default {
  provider: "cerebras",
  dropped: [
    { part: "Candidate: Management API keys", reason: "shape unknown; recorded only as an unresolved statement under collisions" },
    { part: "Boundary rule before the prefix", reason: "a matching decision of the project, not credential knowledge" },
    { part: "Ruling on filling the alphabet by policy, and statements about scanner rules lagging", reason: "evidence-bar and scanner state, not credential knowledge" },
  ],
  families: [
    {
      id: "cerebras:inference-api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-length",
            cls: "provider-documented",
            text: "A key begins csk- (current) or csk_ (accepted after a window in 2025-10) and is exactly 52 characters, so a 48-character body. The length comes from the validator in the provider's VS Code extension, which rejects any key that does not start csk_ or csk- or is not 52 long (introduced 2025-08-29 and unchanged). Provider staff wrote on 2025-10-23 and 2025-10-24 that customers hold keys with both prefixes, that csk_ was an unintentional recent change, that new keys use csk-, and that both should be accepted.",
            claims: ["provider-source", "field-prefix", "field-body-length"],
          },
          {
            id: "body-alphabet",
            unresolved: "No provider source states an alphabet and the extension's validator accepts any 48 code units; scanner rules use lowercase letters and digits only, and the wider class including underscore and hyphen is a project choice.",
            text: "The key body is drawn from letters, digits, underscore and hyphen.",
            leadClaims: ["field-policy-alphabet", "field-tool-alphabet"],
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "The key is read from the CEREBRAS_API_KEY environment variable and sent as an Authorization: Bearer header to api.cerebras.ai, or passed to Cerebras(api_key=...).",
            claims: ["field-transport"],
          },
          {
            id: "access",
            unresolved: "Recorded in the research overview without a cited source in this family's contract.",
            text: "An inference key calls the Cerebras Cloud API on the account's quota and billing.",
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for this research.",
            text: "No Cerebras key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "pinecone-keys",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Pinecone keys start pcsk_ or pcsk-, so the byte before csk is p; Pinecone keeps pcsk_ with a 69 or 70 character body, so no width overlaps.",
          },
          {
            id: "management-key",
            unresolved: "No source states the shape of the Management API key; nothing was read about it.",
            text: "The Management API key for dedicated endpoints is a separate credential of unknown shape.",
            leadClaims: ["field-management-key"],
          },
        ],
        openQuestions: [
          {
            id: "issued-alphabet",
            unresolved: "An issued sample would replace the chosen class with a documented one.",
            text: "What alphabet does the provider actually issue for the key body?",
          },
        ],
      },
    },
  ],
};
