// Authored family narratives for the ClickHouse Cloud dossier (benchmarks/support/dossiers/clickhouse-cloud.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

export default {
  provider: "clickhouse-cloud",
  dropped: [
    { part: "Candidate: key ID", reason: "no prefix; recorded as an unresolved statement and an open question, not a family" },
    { part: "Candidate: database user passwords and ClickStack or HyperDX keys", reason: "separate credentials that were not researched" },
    { part: "At-least-one-uppercase guard and its false-negative cost; boundary rules", reason: "matching policy of the project, not provider facts" },
    { part: "Description of one scanner rule's entropy floor and word-boundary behaviour", reason: "state of another scanner, not credential knowledge" },
  ],
  families: [
    {
      id: "clickhouse-cloud:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-body",
            cls: "provider-documented",
            text: "The key secret is 4b1d followed by exactly 38 mixed-case letters and digits, 42 characters in all, with no separator or checksum. A ClickHouse employee wrote in a scanner-rule contribution merged on 2025-04-16 that the prefix was chosen deliberately and gave the rule 4b1d plus 38 alphanumerics; provider-owned Terraform examples since 2023-05 and a 2024 unit-test value agree at 42 characters.",
            claims: ["provider-source", "field-prefix", "field-body-length", "field-alphabet", "field-separators"],
          },
          {
            id: "older-39-character-example",
            unresolved: "A single knowledge-base example from 2023 is 39 characters in all; it predates the staff statement and is not recorded as a source of this family.",
            text: "An older example key is 39 characters rather than 42.",
          },
          {
            id: "key-id",
            unresolved: "The key ID appears only as an unmarked companion of the secret and as a public identifier; no source settles its length.",
            text: "The key ID (the Basic-auth username) has no marker and is 17 or 20 alphanumeric characters.",
            leadClaims: ["field-key-id"],
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "The secret is read from CLICKHOUSE_CLOUD_API_SECRET, with its key ID in CLICKHOUSE_CLOUD_API_KEY, or set as the Terraform token_secret; the pair is used as HTTP Basic credentials with the key ID as user name.",
            claims: ["field-transport"],
          },
          {
            id: "hashdata-secrets",
            cls: "provider-documented",
            text: "The API accepts a caller-supplied pre-hashed secret, so a secret created that way has no fixed shape.",
            claims: ["field-hashdata-secrets"],
          },
          {
            id: "admin-rights",
            unresolved: "Recorded in the research overview without a cited source in this family's contract.",
            text: "An admin key can create, scale and delete services and manage members.",
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for this research; the only contradiction is older than the staff statement, so an issued key would confirm rather than establish the width.",
            text: "No ClickHouse Cloud key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "hex-look-alikes",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "4b1d is valid hexadecimal, so a hash digest that starts with it, or a UUID containing -4b1d-, can contain the marker without being a key.",
          },
        ],
        openQuestions: [
          {
            id: "key-id-width",
            unresolved: "Only an issued key settles the key ID's length, and it would not make the ID distinctive.",
            text: "Is the key ID 17 or 20 characters?",
          },
          {
            id: "second-secret-width",
            unresolved: "No newer source shows a second width; nothing rules one out.",
            text: "Is a second live secret width in use?",
          },
        ],
      },
    },
  ],
};
