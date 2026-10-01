// Authored family narratives for the Bitwarden dossier (benchmarks/support/dossiers/bitwarden.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const HELP = "https://bitwarden.com/help/access-tokens/";

export default {
  provider: "bitwarden",
  dropped: [
    { part: "Candidate: Password Manager personal and organization API keys", reason: "not a family; carried as a collision of the access token, since they have no distinctive token grammar" },
    { part: "Boundary rule on the bytes before and after the token", reason: "a matching decision of the project, not credential knowledge" },
    { part: "Statements that two scanners have no Bitwarden rule", reason: "state of other scanners, not credential knowledge" },
  ],
  families: [
    {
      id: "bitwarden:secrets-manager-access-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "grammar",
            cls: "provider-documented",
            text: "A token is the literal 0., a UUID in the 8-4-4-4-12 layout (lowercase as issued, uppercase accepted by the parser), a period, exactly 30 letters and digits, a colon, then 22 characters of standard Base64 and ==: 94 characters in all, with no checksum. The provider's SDK parser splits once on the colon and the first part on periods into exactly three parts (version 0, a UUID and a Base64 key that decodes to 16 bytes); the server generator draws the 30-character secret from upper-case, lower-case and numeric characters.",
            claims: ["provider-source", "field-version", "field-token-id", "field-client-secret", "field-encryption-key"],
          },
          {
            id: "unpadded-key",
            cls: "provider-documented",
            text: "The parser also accepts the key without the trailing ==, but the generator always pads, so an unpadded copy lies outside the issued grammar.",
            claims: ["field-unpadded-key"],
          },
        ],
        issuance: [
          {
            id: "carries-secret-and-key",
            cls: "provider-documented",
            text: "The token is supplied through the BWS_ACCESS_TOKEN environment variable, the bws CLI's --access-token flag, SDK clients and CI integrations. It carries both the client secret and the symmetric key that decrypts the secrets, so a leaked token exposes every secret the machine account can read.",
            claims: ["field-transport"],
            cite: [HELP],
          },
          {
            id: "not-issued",
            unresolved: "No token was issued for this research; the grammar rests on provider code and documentation, so an issued token would confirm it rather than establish it.",
            text: "No Bitwarden access token was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "password-manager-api-keys",
            cls: "provider-documented",
            text: "Password Manager personal and organization API keys (user. or organization. followed by a UUID client id, with a 30-character client secret) have no distinctive token grammar and are not this family.",
            claims: ["field-other-credentials"],
          },
        ],
        openQuestions: [
          {
            id: "future-version",
            unresolved: "Only version 0 is documented; no source says whether a later version would change the layout.",
            text: "Does a future token version, other than 0, change the layout?",
          },
        ],
      },
    },
  ],
};
