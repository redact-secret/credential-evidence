// Authored family narratives for the E2B dossier (benchmarks/support/dossiers/e2b.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

export default {
  provider: "e2b",
  dropped: [
    { part: "Candidate: sk_e2b_ user access token", reason: "retired credential class; carried as a collision statement under the team API key family, not a family of its own" },
    { part: "Candidate: sandbox envd and traffic tokens", reason: "64 hex characters with no prefix, so not lexically attributable; not a family" },
    { part: "Contradicting third-party connector page (32-character length)", reason: "traced to an illustrative value; not credential knowledge" },
  ],
  families: [
    {
      id: "e2b:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-body",
            cls: "provider-documented",
            text: "A team API key is the prefix e2b_ followed by exactly 40 lowercase hexadecimal characters, 44 in all, with no separator and no checksum. The provider's key package sets the prefix and generates 20 random bytes, hex-encoded; its legacy SQL generator and a local-development seed test agree. The grammar comes from provider code, because the documentation names the variable and shows placeholders only.",
            claims: ["provider-source", "field-prefix", "field-body", "field-separators"],
          },
          {
            id: "uppercase-accepted",
            cls: "provider-documented",
            text: "The server-side verifier accepts an uppercase-hex body that the generator never issues, so the issued grammar is lowercase only.",
            claims: ["field-uppercase-hex"],
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "The key is carried in the E2B_API_KEY environment variable and sent in the X-API-Key header. It creates and controls sandboxes on the team's quota.",
            claims: ["field-transport"],
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for the research; the prefix and the 20-byte key length were unchanged when re-checked on 2026-09-28.",
            text: "No E2B key was issued or observed for this record.",
          },
        ],
        lifecycle: [
          {
            id: "retired-user-token",
            cls: "provider-documented",
            text: "A separate user access token of the form sk_e2b_ plus 40 hex characters was retired on 2026-08-01. It is another credential class, not a benign sibling.",
            claims: ["field-retired-user-token"],
            historical: true,
          },
        ],
        collisions: [
          {
            id: "hex-body-ambiguous",
            unresolved: "Recorded in a research note without a cited source: a 40-hex string alone has the shape of a SHA-1 digest or a git commit id, so the e2b_ prefix is what identifies the key.",
            text: "The 40-hex body alone is shaped like a SHA-1 digest or a git commit id, so the prefix carries the identification.",
          },
          {
            id: "package-names",
            unresolved: "Recorded in a research note without a cited source: names such as e2b_code_interpreter share the prefix but fail the exact-40-hex body.",
            text: "Package names beginning e2b_ do not match the key grammar because their remainder is not 40 hex characters.",
          },
          {
            id: "inside-user-token",
            unresolved: "A glue-boundary rule, not a provider statement: the contract records the boundary as unresolved.",
            text: "The text e2b_ inside the retired sk_e2b_ user token is not a team API key.",
          },
        ],
        openQuestions: [
          {
            id: "console-key-shape",
            unresolved: "No console-issued key was inspected; confirming the 44-character total and lowercase hex on one issued key is an optional check.",
            text: "Does a key issued from the console have 44 characters in total and a lowercase hex body?",
          },
        ],
      },
    },
  ],
};
