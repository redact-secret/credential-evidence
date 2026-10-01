// Authored family narratives for the OpenRouter dossier (benchmarks/support/dossiers/openrouter.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const TERRAFORM = "https://github.com/OpenRouterTeam/terraform-provider-openrouter";

export default {
  provider: "openrouter",
  dropped: [
    { part: "Candidate: OPENROUTER_WEBHOOK_SECRET", reason: "format undocumented (the documentation uses a placeholder); not a researched family" },
    { part: "Candidate: BYOK payloads", reason: "they carry other providers' keys, which belong to those providers' families" },
    { part: "Research log and the intentional-gap note about management and uppercase variants", reason: "issue workflow and scanner support state, not credential knowledge" },
  ],
  families: [
    {
      id: "openrouter:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-body",
            cls: "provider-documented",
            text: "An inference API key is the prefix sk-or-v1- followed by 64 lowercase hexadecimal characters, 73 characters in total. OpenRouter's own secret-formats page for its guardrail states this shape, and the create-key reference example matches it.",
            claims: ["provider-source", "field-prefix", "field-body"],
          },
          {
            id: "scanner-agreement",
            cls: "tool-corroborated",
            text: "A scanner rule for OpenRouter keys matches the same prefix and 64-hexadecimal body.",
            claims: ["field-body"],
          },
          {
            id: "uppercase-hex",
            unresolved: "No source states whether uppercase hexadecimal is accepted; one scanner rule matches case-insensitively and a few use looser classes than hexadecimal.",
            text: "An inference key body may contain uppercase hexadecimal characters.",
            leadClaims: ["field-body-case"],
          },
          {
            id: "oauth-pkce-keys",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Keys obtained through the OAuth PKCE flow have the same shape as dashboard-issued keys.",
          },
        ],
        issuance: [
          {
            id: "created-in-settings",
            unresolved: "Recorded in a research note without a cited source in this family's contract; no key was issued.",
            text: "Inference keys are created in the account settings (free accounts can create one), are shown once at creation, and no earlier or later prefix version has been found.",
          },
        ],
        collisions: [
          {
            id: "key-hash",
            cls: "provider-documented",
            text: "The key hash returned by the API (used in /api/v1/keys/{hash}) is 64 lowercase hexadecimal characters with no prefix, the same body shape without sk-or-v1-. A bare 64-hexadecimal string is therefore not a key, and how the hash relates to the key is undocumented.",
            claims: ["field-key-hash"],
          },
          {
            id: "masked-label",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "The label returned by the API is a masked form: sk-or-v1- plus a short head and tail of the key.",
          },
          {
            id: "sk-or-mgmt-sibling",
            unresolved: "The management key prefix is stated only on Terraform-related pages, and no provider page documents its body.",
            text: "Management keys start sk-or-mgmt-, sharing the sk-or- stem; they are a separate family.",
            leadClaims: ["field-management-key"],
          },
          {
            id: "other-sk-families",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "OpenAI keys (sk-) and Anthropic keys (sk-ant-) are different families that also begin sk-.",
          },
        ],
        openQuestions: [
          {
            id: "uppercase-accepted",
            unresolved: "Issuing a key and testing an uppercase variant would settle it; none was issued.",
            text: "Does OpenRouter accept uppercase hexadecimal in an inference key?",
          },
          {
            id: "hash-derivation",
            unresolved: "The provider does not document how the hash is derived.",
            text: "Is the key hash derived from the key, for example as a SHA-256?",
          },
        ],
      },
    },
    {
      id: "openrouter:management-api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            unresolved: "The prefix is stated only on the Terraform provider page and its README; the management-keys guide gives no prefix or length, and no provider page documents the grammar.",
            text: "A management key begins sk-or-mgmt-.",
            lead: [TERRAFORM],
          },
          {
            id: "body",
            unresolved: "No source found documents the body length, alphabet or any embedded version or checksum.",
            text: "The body length, alphabet and structure after sk-or-mgmt- are not established.",
          },
          {
            id: "provisioning-detector-conflict",
            unresolved: "A third-party catalog describes a single rule for provisioning keys, which conflicts with the sk-or-mgmt- prefix; no provider source resolves it.",
            text: "Management keys were formerly called provisioning keys.",
          },
        ],
        issuance: [
          {
            id: "created-in-settings",
            unresolved: "Recorded in a research note without a cited source in this family's contract; no key was issued.",
            text: "Management keys are created in the account settings, are shown once, and take an optional expiry fixed at creation. They administer keys but cannot call completion endpoints.",
          },
        ],
        collisions: [
          {
            id: "shared-stem",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "A management key shares the sk-or- stem with inference keys and is a real secret, so it is not a benign sibling of an inference key.",
          },
        ],
        openQuestions: [
          {
            id: "body-grammar",
            unresolved: "Issuing a management key would settle it; none was issued.",
            text: "What are the sk-or-mgmt- body length, alphabet and structure?",
          },
        ],
      },
    },
  ],
};
