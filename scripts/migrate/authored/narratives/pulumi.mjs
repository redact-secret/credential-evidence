// Authored family narratives for the Pulumi dossier (benchmarks/support/dossiers/pulumi.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const grammar = () => [
  {
    id: "prefix",
    cls: "provider-documented",
    text: "The token value begins pul-. Pulumi's Cloud REST API reference says the token-creation response includes the tokenValue, prefixed with pul-, and a sibling page about personal access tokens repeats it. Neither page states a length or alphabet for the rest of the value.",
    claims: ["provider-source"],
  },
  {
    id: "body-40-hex",
    cls: "tool-corroborated",
    text: "Scanner rules agree that the body after pul- is exactly 40 lowercase hexadecimal characters. Bodies outside that form (uppercase, other lengths) are outside this grammar.",
    claims: ["tool-corroboration"],
  },
  {
    id: "community-article",
    unresolved: "A community article is said to show a 40-hexadecimal example for each token kind, but it is a research-note reference without a cited source in this family's contract, and it is corroboration, not an independent third source.",
    text: "A community article shows a separate 40-character hexadecimal example for this token kind.",
  },
];

const KIND_NOTE = (kind) => ({
  id: "kind-by-issuance-path",
  cls: "provider-documented",
  text: `Pulumi's reference documents a single prefix for the token value and no kind-specific variant, so a ${kind} token shares its grammar with the other two kinds and differs only by how it is issued. No page shows a per-kind example, so an identical grammar is an inference from the shared prefix statement.`,
  claims: ["provider-source"],
});

export default {
  provider: "pulumi",
  dropped: [
    { part: "Candidates that are not families yet (none found)", reason: "empty section" },
    { part: "Open question 3 (no frozen evidence folder exists)", reason: "a note about where the research record is kept, not credential knowledge" },
    { part: "Statement that the second tool is recorded in review prose only", reason: "describes legacy bookkeeping, not credential knowledge" },
  ],
  families: [
    {
      id: "pulumi:personal-access-token",
      status: "migrated",
      sections: {
        shape: grammar(),
        issuance: [KIND_NOTE("personal")],
        openQuestions: [
          {
            id: "body-grammar",
            unresolved: "Only scanner rules and one article state it; issuing one token of each kind would settle it.",
            text: "Is the body always exactly 40 lowercase hexadecimal characters for all three kinds?",
          },
        ],
      },
    },
    {
      id: "pulumi:organization-access-token",
      status: "migrated",
      sections: {
        shape: grammar(),
        issuance: [KIND_NOTE("organization")],
        openQuestions: [
          {
            id: "per-kind-evidence",
            unresolved: "The organization and team kinds are distinguished only by issuance path; no Pulumi page shows a per-kind example.",
            text: "Does an organization access token follow the same body grammar as a personal token?",
          },
        ],
      },
    },
    {
      id: "pulumi:team-access-token",
      status: "migrated",
      sections: {
        shape: grammar(),
        issuance: [KIND_NOTE("team")],
        openQuestions: [
          {
            id: "per-kind-evidence",
            unresolved: "The organization and team kinds are distinguished only by issuance path; no Pulumi page shows a per-kind example.",
            text: "Does a team access token follow the same body grammar as a personal token?",
          },
        ],
      },
    },
  ],
};
