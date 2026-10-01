// Authored family narratives for the HashiCorp Vault dossier (benchmarks/support/dossiers/hashicorp-vault.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const TOKENS = "https://developer.hashicorp.com/vault/docs/concepts/tokens";

const shape = (prefix, kind) => [
  {
    id: "prefix",
    cls: "provider-documented",
    text: `${kind} Vault's tokens concept page documents the prefixes hvs., hvb. and hvr. and a minimum of 24 random characters after the prefix, and states that the token structure is opaque. This kind begins ${prefix}.`,
    cite: [TOKENS],
    claims: ["provider-source"],
  },
  {
    id: "tool-length",
    cls: "tool-corroborated",
    text: "The two scanner rules examined use a length of 90 to 120 characters for Vault tokens. That is corroboration and not a provider statement, since Vault does not publish the full structure.",
    claims: ["tool-corroboration"],
  },
];

const body = {
  id: "body-opaque",
  cls: "provider-documented",
  text: "The body beyond the 24-character minimum is opaque in Vault's documentation, so its alphabet and upper length are not provider-established.",
  claims: ["provider-source"],
};

export default {
  provider: "hashicorp-vault",
  dropped: [
    { part: "Open question 2: the contract requires an explicit Vault endpoint alongside the token", reason: "product policy about how a scanner pairs the token, not credential knowledge" },
    { part: "Research log and per-family contract-link lines", reason: "issue workflow and product policy, not credential knowledge" },
  ],
  families: [
    {
      id: "hashicorp-vault:service-token",
      status: "migrated",
      sections: {
        shape: [...shape("hvs.", "A standard Vault service token."), body],
        collisions: [
          {
            id: "legacy-prefixes",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Older Vault tokens used one-letter prefixes, which differ from the hvs. prefix.",
          },
        ],
        openQuestions: [
          {
            id: "body-grammar",
            unresolved: "Vault states the structure is opaque and no issued token was examined.",
            text: "What alphabet and length does the body of a service token have beyond the 24-character minimum?",
          },
        ],
      },
    },
    {
      id: "hashicorp-vault:batch-token",
      status: "migrated",
      sections: {
        shape: [
          ...shape("hvb.", "A lightweight, non-renewable Vault batch token."),
          body,
        ],
        openQuestions: [
          {
            id: "body-grammar",
            unresolved: "Vault states the structure is opaque and no issued token was examined.",
            text: "What alphabet and length does the body of a batch token have beyond the 24-character minimum?",
          },
        ],
      },
    },
    {
      id: "hashicorp-vault:recovery-token",
      status: "migrated",
      sections: {
        shape: [
          ...shape("hvr.", "A Vault recovery operation token."),
          body,
        ],
        openQuestions: [
          {
            id: "body-grammar",
            unresolved: "Vault states the structure is opaque and no issued token was examined.",
            text: "What alphabet and length does the body of a recovery token have beyond the 24-character minimum?",
          },
        ],
      },
    },
  ],
};
