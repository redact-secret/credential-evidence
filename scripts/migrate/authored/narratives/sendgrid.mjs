// Authored family narratives for the SendGrid dossier (benchmarks/support/dossiers/sendgrid.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const SUPPORT = "https://support.sendgrid.com/hc/en-us/articles/44146758703387-Can-I-Use-a-Reduced-Shorter-API-Key-Size-in-SendGrid";

export default {
  provider: "sendgrid",
  dropped: [
    { part: "Candidates that are not families", reason: "the dossier records none" },
    { part: "Related non-research issues and the research log", reason: "issue workflow, not credential knowledge" },
  ],
  families: [
    {
      id: "sendgrid:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "fixed-length",
            cls: "provider-documented",
            text: "A SendGrid API key is always 69 characters long in total and is never issued shorter.",
            cite: [SUPPORT],
            claims: ["provider-source"],
          },
          {
            id: "prefix-and-segments",
            cls: "tool-corroborated",
            text: "Scanner rules read a key as the prefix SG., a 22-character identifier segment, a dot, and a 43-character secret segment drawn from letters, digits, underscore and hyphen. The support article does not state the prefix, the split or the alphabet.",
            claims: ["tool-corroboration"],
          },
        ],
        issuance: [
          {
            id: "scopes-share-format",
            unresolved: "Recorded in a research note without a cited source; the cited support article addresses key length only.",
            text: "Full-access and restricted-access API keys share one format.",
          },
        ],
        openQuestions: [
          {
            id: "segment-split-and-alphabet",
            unresolved: "No SendGrid page states the 22 and 43 character split or the alphabet; only scanner rules do, and no issued key was inspected.",
            text: "Is the 22 and 43 character split, with its alphabet, a documented property of the key?",
          },
        ],
      },
    },
  ],
};
