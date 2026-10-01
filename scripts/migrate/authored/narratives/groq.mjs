// Authored family narratives for the Groq dossier (benchmarks/support/dossiers/groq.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const SECURITY = "https://console.groq.com/docs/production-readiness/security-onboarding";

export default {
  provider: "groq",
  dropped: [
    { part: "Candidates: base64-encoded key and older key versions", reason: "not families; no Groq-specific grammar was recorded for either, and both survive as unresolved statements of the API key" },
    { part: "Contract-freeze and implementation notes", reason: "project workflow, not credential knowledge" },
  ],
  families: [
    {
      id: "groq:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "A Groq (GroqCloud) API key begins gsk_. Groq's documentation shows the prefix and states no length or alphabet.",
            cite: [SECURITY],
            claims: ["field-prefix"],
          },
          {
            id: "body-52",
            cls: "tool-corroborated",
            text: "After the prefix come 52 letters and digits, 56 characters in all. Four scanner rules agree on 52, and a four-sample maintainer observation of public environment files also found 52 mixed-case alphanumerics.",
            claims: ["field-body-length-and-alphabet"],
          },
          {
            id: "internal-segment",
            unresolved: "A four-key observation of public files found the segment WGdyb3FY at body offsets 20 to 27; it is undocumented, used by no tool, and not a grammar requirement.",
            text: "An internal segment may sit inside the body at a fixed offset.",
            leadClaims: ["field-fixed-segment"],
          },
          {
            id: "forty-eight",
            unresolved: "A scanner proposal and blogs that copy it say 48 characters with no primary source, and every scanner rule plus the observation above contradict it.",
            text: "A 48-character body has been reported.",
            leadClaims: ["field-alternate-length"],
          },
        ],
        issuance: [
          {
            id: "not-issued",
            unresolved: "No key was issued; that needs a GroqCloud account.",
            text: "No Groq API key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "xai-keys",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "xAI keys begin xai-, and mixing up the Grok and Groq environment variable names is seen in the wild.",
          },
          {
            id: "public-response-ids",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Groq response identifiers with the prefixes chatcmpl-, req_, file_ and batch_ are public.",
          },
          {
            id: "gsk-elsewhere",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "The string gsk_ also occurs in unrelated identifiers, so the prefix alone is weak evidence.",
          },
          {
            id: "base64-form",
            unresolved: "GitHub's pattern table lists a base64-encoded Groq form, but whether an encoded key belongs to the family is undecided and no grammar was recorded.",
            text: "A base64-encoded form of the key has been reported.",
            leadClaims: ["field-encoded-form"],
          },
        ],
        openQuestions: [
          {
            id: "segment-everywhere",
            unresolved: "Only four keys were observed.",
            text: "Is the segment WGdyb3FY present in every key, across projects and dates?",
          },
          {
            id: "pre-projects",
            unresolved: "No source covers keys issued before projects existed.",
            text: "Do keys issued before projects existed differ in shape?",
          },
          {
            id: "checksum",
            unresolved: "None was observed or documented.",
            text: "Does the key contain a checksum?",
          },
          {
            id: "github-versions",
            unresolved: "GitHub's pattern table hints at more than one version and the older shape is unknown.",
            text: "What are the token versions GitHub lists for this type?",
          },
        ],
      },
    },
  ],
};
