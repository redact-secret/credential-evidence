// Authored family narratives for the Inngest dossier (benchmarks/support/dossiers/inngest.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const SELF_HOSTING = "https://www.inngest.com/docs/self-hosting";
const SIGNING_STRATEGY = "https://github.com/inngest/inngest/blob/dabb03f9e093672aaef2ee77eb7accdf0cd00ca3/pkg/authn/signing_key_strategy.go#L15-L25";

export default {
  provider: "inngest",
  dropped: [
    { part: "Candidates: event key; self-hosted bare hex signing key", reason: "not families; the event key survives as an unresolved collision and the bare hex key as one too" },
    { part: "Open question 2: coverage-probe result for the INNGEST_SIGNING_KEY= name", reason: "scanner behaviour and issue workflow, not credential knowledge" },
    { part: "Research log, ruling references and disposition record", reason: "issue workflow, not credential knowledge" },
  ],
  families: [
    {
      id: "inngest:signing-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "A signing key begins signkey-prod-, signkey-test- or signkey-branch-. The prefixes are constants in Inngest's own code.",
            cite: [SIGNING_STRATEGY],
            claims: ["field-prefix"],
          },
          {
            id: "body",
            cls: "provider-documented",
            text: "After the prefix come exactly 64 lowercase hexadecimal characters, 77 in all for the prod and test prefixes and 79 for branch. The self-hosting documentation says the value is a hexadecimal string with an even number of characters, and its generation command produces 64 lowercase hexadecimal characters.",
            cite: [SELF_HOSTING],
            claims: ["field-body-alphabet", "field-body-length", "provider-source"],
          },
          {
            id: "wire-form",
            cls: "provider-documented",
            text: "The SDK also sends a derived form, signkey-, an environment label, a hyphen and the SHA-256 hexadecimal digest of the key bytes, as a bearer credential. It authenticates as well and has the same shape as the raw key.",
            claims: ["field-wire-form"],
          },
          {
            id: "uppercase-accepted",
            cls: "provider-documented",
            text: "The decoder accepts an uppercase hexadecimal body that Inngest's generator and its SDK tests never produce.",
            claims: ["field-uppercase-hex"],
          },
          {
            id: "transport",
            cls: "provider-documented",
            text: "The key is read from the INNGEST_SIGNING_KEY variable, with INNGEST_SIGNING_KEY_FALLBACK for rotation, from the signingKey client option, and from an Authorization: Bearer header. It authenticates the app to the REST API and signs requests between Inngest and the app's serve endpoint.",
            cite: [SELF_HOSTING],
            claims: ["field-transport"],
          },
        ],
        issuance: [
          {
            id: "not-issued",
            unresolved: "No key was issued; the prefix, alphabet and length are established from provider code and documentation.",
            text: "No Inngest signing key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "other-labels",
            cls: "provider-documented",
            text: "A signkey- prefix with a label other than prod, test or branch, such as preview, is not one of Inngest's constants and is not this family, even though the SDK's own expression would admit other labels.",
            claims: ["field-other-labels"],
          },
          {
            id: "bare-hex",
            unresolved: "Recorded in a research note without a cited source in this family's contract; a bare hexadecimal digest has no marker.",
            text: "A self-hosted signing key written as bare hexadecimal without a prefix cannot be attributed to Inngest.",
          },
          {
            id: "event-key",
            unresolved: "INNGEST_EVENT_KEY has no documented shape and self-hosted event keys are arbitrary strings.",
            text: "An Inngest event key is a different credential and has no distinctive shape.",
            leadClaims: ["field-event-key"],
          },
          {
            id: "no-scanner-rule",
            cls: "tool-corroborated",
            text: "Neither of the two scanners examined has a rule for Inngest signing keys.",
            claims: ["field-peer-lag"],
          },
        ],
        openQuestions: [
          {
            id: "further-labels",
            unresolved: "No source says whether Inngest will issue labels beyond prod, test and branch; a future label is an accepted gap.",
            text: "Are there environment labels beyond prod, test and branch?",
          },
        ],
      },
    },
  ],
};
