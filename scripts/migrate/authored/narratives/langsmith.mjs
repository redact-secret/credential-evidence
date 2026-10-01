// Authored family narratives for the LangSmith dossier (benchmarks/support/dossiers/langsmith.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

export default {
  provider: "langsmith",
  dropped: [
    { part: "Candidate: personal access token and service key as separate families", reason: "a modelling choice about how this repository groups records, not credential knowledge; both roles are described inside the one family" },
    { part: "Candidates: SCIM token, OAuth tokens, deployment keys, license key", reason: "no shape recorded; they appear as an unresolved sibling statement on the api-key family" },
    { part: "Candidate: legacy ls__ key", reason: "carried as an unresolved statement on the api-key family" },
  ],
  families: [
    {
      id: "langsmith:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "tool-corroborated",
            text: "Keys begin lsv2_ followed by a role code and an underscore: pt for a personal access token, sk for a service key. The provider's documentation shows only masked forms and states no grammar; scanner rules and the provider's own SDK redactor agree on the lsv2_pt_ and lsv2_sk_ prefixes.",
            claims: ["field-prefix", "tool-corroboration"],
          },
          {
            id: "segment-widths",
            cls: "tool-corroborated",
            text: "After the prefix come exactly 32 characters, an underscore and exactly 10 characters, 51 characters in all. Scanner rules agree on this layout; one of them merges the two roles into a single rule and others split them. The provider's own SDK redactor is wider (32 or more characters and any number of underscore-separated tails), and its own test value uses a 36-character first segment.",
            claims: ["field-segment-widths"],
          },
          {
            id: "alphabet",
            unresolved: "One scanner rule is lowercase-only, two others are case-insensitive and the provider's redactor accepts any letters and digits, so uppercase acceptance is not established.",
            text: "Both segments are lowercase hexadecimal.",
            leadClaims: ["field-alphabet"],
          },
          {
            id: "tail-meaning",
            unresolved: "Not documented; the provider's Helm chart carries an API key salt setting, which hints at server-side derivation but does not state it.",
            text: "The 10-character tail is a checksum, a key-id fragment or random.",
            leadClaims: ["field-tail-semantics"],
          },
        ],
        issuance: [
          {
            id: "two-roles",
            cls: "provider-documented",
            text: "API keys are created under the settings page with an expiry and are shown once. Two roles exist: a personal access token, which inherits the creating user's permissions, and a service key scoped to a workspace or organization.",
            claims: ["field-roles"],
          },
          {
            id: "contexts",
            cls: "provider-documented",
            text: "The key is read from the LANGSMITH_API_KEY environment variable (legacy name LANGCHAIN_API_KEY), sent in an X-API-Key header, or given as x-api-key in the OpenTelemetry exporter headers. SDK profile files under the user's home directory also carry an api_key value. The workspace id and endpoint settings that sit beside the key are not secret.",
            claims: ["field-contexts", "field-profile-file"],
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for this research; a free developer account can issue both roles but the structural checks were not performed.",
            text: "No LangSmith API key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "legacy-ls",
            unresolved: "Only a placeholder appears; the provider SDK still redacts ls__ followed by 16 or more characters, but the real length, alphabet and retirement date are not established.",
            text: "An older key form beginning ls__ exists.",
            leadClaims: ["field-legacy-ls"],
          },
          {
            id: "other-credentials",
            unresolved: "Their shapes are unknown or corroborated only by forum posts and a security write-up, none of which is provider documentation of a grammar.",
            text: "A self-hosted license key, a SCIM bearer token, OAuth access and refresh tokens, an internal X-Service-Key JWT and deployment keys are distinct LangSmith credentials outside this family.",
            leadClaims: ["field-sibling-credentials"],
          },
          {
            id: "public-ids",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Workspace and organization UUIDs, project names, the short_key display value and ls_-prefixed trace metadata names such as ls_provider sit beside keys and are not secrets.",
          },
        ],
        openQuestions: [
          {
            id: "self-hosted-shapes",
            unresolved: "No source states whether self-hosted instances issue the same lsv2_ shapes.",
            text: "Do self-hosted instances issue the same lsv2_ shapes?",
          },
          {
            id: "legacy-still-authenticate",
            unresolved: "No source states whether ls__ keys still authenticate.",
            text: "Do legacy ls__ keys still authenticate?",
          },
          {
            id: "lsv2-introduction",
            unresolved: "Not documented when lsv2_ replaced the older placeholder forms.",
            text: "When did lsv2_ replace the older ls__ and ls_ placeholders?",
          },
        ],
      },
    },
  ],
};
