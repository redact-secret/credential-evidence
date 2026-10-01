// Authored family narratives for the ElevenLabs dossier (benchmarks/support/dossiers/elevenlabs.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const AUTH = "https://elevenlabs.io/docs/api-reference/authentication";
const WORKSPACE_KEYS = "https://elevenlabs.io/docs/overview/administration/workspaces/api-keys";

export default {
  provider: "elevenlabs",
  dropped: [
    { part: "Candidate: legacy 32-hex keys", reason: "no provider source documents them; carried as an unresolved statement on the API key family, not a family" },
    { part: "Candidate: single-use tokens for client-side use", reason: "a separate credential with no documented shape; named only as a non-secret listing neighbour" },
    { part: "Open question 3 (GitHub partner status)", reason: "a statement about a scanning program, not credential knowledge" },
    { part: "Open question 5 (search debts)", reason: "research-process state, not credential knowledge" },
    { part: "Statement that the provider takes part in a secret-scanning partner program", reason: "scanner-program state, not credential shape" },
    { part: "Issuance checklist from the research issue", reason: "issue workflow, not carried" },
  ],
  families: [
    {
      id: "elevenlabs:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "An API key is written beginning sk_. The provider's own Python and JavaScript SDK source shows the form in a docstring and parses a data-residency suffix; no documentation page states the prefix, a length or an alphabet, so this rests on provider code.",
            claims: ["provider-source", "field-prefix"],
          },
          {
            id: "residency-suffix",
            cls: "provider-documented",
            text: "A key for an isolated data-residency environment (regions seen: eu and in) carries an optional suffix _residency_ followed by lowercase letters and digits. The suffix belongs to the key.",
            claims: ["field-residency-suffix"],
          },
          {
            id: "body",
            cls: "tool-corroborated",
            text: "The body is 48 lowercase hexadecimal characters, 51 in all with the prefix. Two scanner rules and measured code-search samples agree where a key is fully formed; no provider source states it.",
            claims: ["field-body", "tool-corroboration"],
          },
          {
            id: "body-case",
            unresolved: "The scanner rules disagree on uppercase hex and no provider source decides it.",
            text: "Whether an uppercase hexadecimal body occurs.",
            leadClaims: ["field-body-case"],
          },
        ],
        issuance: [
          {
            id: "where-and-how",
            cls: "provider-documented",
            text: "Keys are issued from the developer area of the web application as user keys (optional expiry of 15 minutes to 30 days) or service-account keys (no expiry). A key is shown once and can be restricted by scope, credit quota and IP address.",
            cite: [WORKSPACE_KEYS],
          },
          {
            id: "header",
            cls: "provider-documented",
            text: "A key is sent in the xi-api-key HTTP header.",
            cite: [AUTH],
            claims: ["field-header"],
          },
          {
            id: "isolated-environments",
            cls: "provider-documented",
            text: "Isolated data-residency environments (EU, India, Singapore) use a different API host and a different key.",
            claims: ["field-residency-suffix"],
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for the research, so neither user nor service-account keys, nor an isolated-environment key, were inspected.",
            text: "No ElevenLabs key was issued or observed for this record.",
          },
        ],
        lifecycle: [
          {
            id: "legacy-form",
            unresolved: "No provider source documents a 32-hex key or dates the move to the sk_ prefix; only one scanner rule matches it, beside a keyword.",
            text: "Older accounts may hold a bare 32-hex key from before the sk_ prefix.",
            leadClaims: ["field-legacy-form"],
          },
        ],
        collisions: [
          {
            id: "sk-sibling-prefixes",
            cls: "provider-documented",
            text: "The sk_ start is shared with Stripe secret keys (sk_live_, sk_test_, sk_org_) and with a key shape another project has planned (sk_ plus 32 characters), so the prefix alone cannot attribute a key to ElevenLabs.",
            claims: ["field-sibling-prefixes"],
          },
          {
            id: "public-fields",
            cls: "provider-documented",
            text: "The response fields key_id, hint and hashed_xi_api_key are non-secret listing fields, and single-use client-side tokens are a separate credential.",
            claims: ["field-public-identifiers"],
          },
        ],
        openQuestions: [
          {
            id: "suffix-body",
            unresolved: "No suffixed key was observed, and no code-search fragment showed the suffix.",
            text: "Does a residency key share the 48-hex base, and does the region code sg exist?",
          },
          {
            id: "legacy-validity",
            unresolved: "No source dates the change to the sk_ prefix or says whether 32-hex keys still work.",
            text: "Are 32-hex keys still valid, and when did the sk_ prefix start?",
          },
          {
            id: "service-account-shape",
            unresolved: "No service-account key was issued for the research.",
            text: "Is a service-account key shaped like a user key?",
          },
        ],
      },
    },
  ],
};
