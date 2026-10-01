// Authored family narratives for the Microsoft Entra dossier (benchmarks/support/dossiers/microsoft-entra.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

export default {
  provider: "microsoft-entra",
  dropped: [
    { part: "Candidate: 7Q~ 37-character previous format", reason: "inside the same family's grammar range; carried on the family as an unresolved statement" },
    { part: "Candidate: legacy 32-character secrets with no marker", reason: "carried on the family as an unresolved statement" },
    { part: "Open question 2 (whether the product couples the digit to length)", reason: "a question about scanner behaviour, not credential knowledge; the coupling itself is carried as an unresolved shape statement" },
    { part: "Maintainer ruling accepting two SDK example values as evidence", reason: "evidence-grading governance history, not credential knowledge" },
  ],
  families: [
    {
      id: "microsoft-entra:application-client-secret",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "provider-examples",
            cls: "provider-documented",
            text: "Two example SecretText values in Microsoft's Graph PowerShell reference for adding an application password each have 40 characters: three leading characters (equal to the printed Hint), the digit 8, the literal Q~, then 34 characters. The Q~ marker and the width of the 8 variant come from these examples and not from a stated grammar; a Graph SDK maintainer calls the examples not real secrets.",
            claims: ["provider-source"],
          },
          {
            id: "alphabet-and-length-docs",
            cls: "provider-documented",
            text: "Microsoft's data-loss-prevention definition of an Entra client secret describes it as a combination of up to 40 characters from letters, digits, hyphen, underscore, period and tilde.",
            claims: ["mutable-property-source"],
          },
          {
            id: "scanner-corroboration",
            cls: "tool-corroborated",
            text: "Scanner rules for the client secret are consistent with the grammar of three leading characters, a digit, Q~ and a body of letters, digits, underscore, period, tilde and hyphen.",
            claims: ["tool-corroboration"],
          },
          {
            id: "previous-generation",
            unresolved: "Recorded in a research note as drawn from Microsoft's security-utilities code (rule SEC101/156); that source is not cited by this family's contract.",
            text: "The current generation is 8Q~ followed by 34 characters (40 in total) and the previous generation is 7Q~ followed by 31 (37 in total); the digit is coupled to the length.",
          },
          {
            id: "leading-hyphen",
            unresolved: "Recorded in a research note as four field reports and Microsoft's own rule allowing it; none is cited by this family's contract.",
            text: "The first three characters differ per secret and may start with a hyphen.",
          },
          {
            id: "conflicting-pages",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Other Microsoft pages conflict without contradicting the examples: the Graph REST reference says 16 to 64 characters, and the data-loss-prevention page says up to 40 without mentioning Q~.",
          },
        ],
        issuance: [
          {
            id: "not-issued",
            unresolved: "No secret was issued for this research; secrets can be created and deleted per app registration but the structural checks were not performed.",
            text: "No Entra client secret was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "no-prefix",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "The credential has no provider prefix; the digit followed by Q~ is the identifying element.",
          },
          {
            id: "legacy-32-no-marker",
            unresolved: "No source ties the marker-less 32-character secrets shown in the Graph REST reference to a current shape.",
            text: "Older 32-character secrets with no marker exist.",
          },
        ],
        openQuestions: [
          {
            id: "marker-digit",
            unresolved: "Provider examples show only 8 and Microsoft code shows 7 and 8; a fresh secret would settle whether other digits occur.",
            text: "Is the marker digit only ever 7 or 8?",
          },
          {
            id: "alphabet-and-leading",
            unresolved: "A fresh secret would settle the alphabet and the leading-character rules.",
            text: "What are the exact alphabet and leading-character rules?",
          },
        ],
      },
    },
  ],
};
