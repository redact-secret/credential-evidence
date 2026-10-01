// Authored family narratives for the Langfuse dossier (benchmarks/support/dossiers/langfuse.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

export default {
  provider: "langfuse",
  dropped: [
    { part: "Candidate: self-hosted operator-defined secrets", reason: "carried as an unresolved statement on the secret-key family; it is a variant of the same credential, not a separate family" },
    { part: "Candidate: sk-lf-gw- gateway keys", reason: "carried as an unresolved statement on the secret-key family; the prefix is unconfirmed" },
    { part: "Candidate: base64 Basic-auth blob", reason: "carried as an unresolved statement on the secret-key family; an encoded transport form, not a credential family" },
    { part: "Open question 3 (whether detection should use public-key proximity)", reason: "a question about scanner design, not credential knowledge" },
    { part: "Open question 4 (whether a base64 Basic-auth header is in scope)", reason: "a product scoping question, not credential knowledge" },
  ],
  families: [
    {
      id: "langfuse:secret-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "Secret keys begin sk-lf-. The public sibling begins pk-lf-.",
            claims: ["field-prefix"],
          },
          {
            id: "uuid-body",
            cls: "provider-documented",
            text: "After the prefix comes a lowercase UUIDv4 in 8-4-4-4-12 hexadecimal form with hyphens: version nibble 4, variant nibble 8, 9, a or b, 42 characters in total. The provider's own key generator builds it with a random-UUID call, and the shape is the same in the earliest generator code seen (mid-2023) as in 2026. Organization keys and the AI gateway use the same generator. The provider documents prefixes and roles but not a body grammar, so the body rests on the provider's source code.",
            claims: ["field-body"],
          },
          {
            id: "scanner-agreement",
            cls: "tool-corroborated",
            text: "Scanner rules match the prefix followed by 8-4-4-4-12 lowercase hexadecimal without checking the version and variant nibbles. One of them also requires the word langfuse shortly before the value and a public key beside it.",
            claims: ["field-body-corroboration", "tool-corroboration"],
          },
          {
            id: "masked-display",
            cls: "provider-documented",
            text: "The interface shows a masked form made of the first six characters, three dots and the last four characters, so sk-lf-... followed by four hexadecimal characters.",
            claims: ["field-masked-display"],
          },
          {
            id: "self-hosted-values",
            unresolved: "Operator-chosen values are outside the minted-shape claim; the contract records them as not asserted.",
            text: "Self-hosted deployments let an operator set key values directly through headless initialization or the admin API, so a self-hosted secret key may be any string, or any string starting sk-lf-, rather than the minted UUID shape. The provider's own example value is sk-lf-1234567890.",
            leadClaims: ["field-self-hosted-values"],
          },
        ],
        issuance: [
          {
            id: "shown-once",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "A project (and later an organization) receives a public key and a secret key; the secret is shown once and only its hash is stored.",
          },
          {
            id: "contexts",
            cls: "provider-documented",
            text: "The secret key is passed in the LANGFUSE_SECRET_KEY environment variable, as a secret key argument to the SDKs, as the password in HTTP Basic authentication with the public key as user name, and as the base64 of public:secret in the OpenTelemetry Authorization header. Browser SDKs need only the public key, and the provider says never to expose the secret key in frontend code.",
            claims: ["field-contexts", "field-public-sibling"],
          },
          {
            id: "gateway-bearer",
            cls: "provider-documented",
            text: "The AI gateway accepts the secret key alone as a Bearer or x-api-key value, with no public key beside it.",
            claims: ["field-gateway-bearer"],
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for this research; a free cloud account could create one but the structural checks were not performed.",
            text: "No Langfuse secret key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "public-key-sibling",
            cls: "provider-documented",
            text: "The public key pk-lf- has the same length and alphabet as the secret key and differs by one letter. It is a public identifier and the closest benign sibling.",
            claims: ["field-public-sibling", "field-prefix"],
          },
          {
            id: "log-redactor-wider",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "The provider's own log redactor is wider than the UUID shape and matches sk-lf- followed by any run of letters, digits, underscore and hyphen.",
          },
          {
            id: "gateway-prefix",
            unresolved: "A possible sk-lf-gw- shape appears only in an unmerged change description and interface stories; gateway keys on the main branch use the same generator.",
            text: "A distinct sk-lf-gw- prefix for gateway keys has been mentioned.",
            leadClaims: ["field-sk-lf-gw"],
          },
          {
            id: "basic-auth-encoded",
            unresolved: "The contract makes no claim about the encoded form.",
            text: "In an HTTP Basic authorization header the secret key appears only base64-encoded together with its public key, not as a literal.",
            leadClaims: ["field-basic-auth-base64"],
          },
        ],
        openQuestions: [
          {
            id: "gateway-distinct-prefix",
            unresolved: "Gateway keys use the shared generator in current code; whether a distinct prefix arrives when the feature leaves its allowlist is not known.",
            text: "Will gateway keys receive a distinct prefix?",
            leadClaims: ["field-sk-lf-gw"],
          },
          {
            id: "org-key-prefix-documented",
            unresolved: "The code says organization keys match the project generator; no provider documentation was found stating the organization-key prefix.",
            text: "Is the organization-key prefix documented?",
          },
        ],
      },
    },
  ],
};
