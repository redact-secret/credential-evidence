// Authored family narratives for the Resend dossier (benchmarks/support/dossiers/resend.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

export default {
  provider: "resend",
  dropped: [
    { part: "Candidate: webhook signing secret (whsec_)", reason: "a Svix scheme and a separate credential not researched here; carried as a collision statement" },
    { part: "Candidate: re_ plus a GUID, and re_ plus 36 lowercase alphanumerics", reason: "test stubs or placeholders in SDK mock code that contradict the documented layout; not credential knowledge" },
    { part: "Final-disposition note and the false-negative cost estimate of the project's own mixed-case check", reason: "workflow record and matching behaviour of the project, not credential knowledge" },
  ],
  families: [
    {
      id: "resend:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "An API key begins re_. Resend's command-line tool rejects a key that does not start with re_ when logging in.",
            claims: ["field-prefix"],
          },
          {
            id: "layout",
            cls: "provider-documented",
            text: "After the prefix come 8 alphanumeric characters, an underscore, and 24 alphanumeric characters, 36 in all; that underscore is the only one after the prefix. The layout comes from the create-API-key example in the provider's documentation and from values in the provider's SDKs, not from a stated grammar. Full-access and sending-access keys share the shape.",
            claims: ["provider-source", "field-layout"],
          },
          {
            id: "alphabet",
            cls: "provider-documented",
            text: "Every provider example is letters and digits and consistent with a base58 alphabet (no 0, O, I or l), but three distinct samples show what is present and not what is excluded, so the alphabet is recorded as the wider letters-and-digits set.",
            claims: ["field-alphabet"],
          },
          {
            id: "mixed-case",
            unresolved: "Requiring at least one upper-case and one lower-case letter in the 32 body characters is a project false-positive choice, not a provider fact; provider examples are mixed case.",
            text: "A real key body contains both upper-case and lower-case letters.",
            leadClaims: ["field-mixed-case-guard"],
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "The key is read from the RESEND_API_KEY environment variable and sent as Authorization: Bearer.",
            claims: ["field-transport"],
          },
          {
            id: "not-issued",
            unresolved: "No key was issued; the layout rests on documentation and SDK examples.",
            text: "No Resend API key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "short-prefix",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "re_ is a very short prefix that ends many identifiers and Python names; no other issuer using re_ was found.",
          },
          {
            id: "webhook-secrets",
            cls: "provider-documented",
            text: "Webhook signing secrets begin whsec_ and follow the Svix scheme; they are another credential class.",
            claims: ["field-webhook-secret"],
          },
        ],
        openQuestions: [
          {
            id: "base58-or-alphanumeric",
            unresolved: "An issuance check across several keys would show whether the alphabet is base58 or full alphanumeric.",
            text: "Does a real key ever contain 0, O, I or l?",
          },
          {
            id: "split-by-key-type",
            unresolved: "The provider documents the shape for both key types together, but no issued key of each type was compared.",
            text: "Is the 8 and 24 character split the same for full-access and sending-access keys?",
          },
        ],
      },
    },
  ],
};
