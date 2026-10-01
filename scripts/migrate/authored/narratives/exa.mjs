// Authored family narratives for the Exa dossier (benchmarks/support/dossiers/exa.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const UPDATE_KEY = "https://exa.ai/docs/reference/team-management/update-api-key";

export default {
  provider: "exa",
  dropped: [
    { part: "Candidate: service keys (Team Management)", reason: "a second credential class of unknown shape; carried as an unresolved statement on the API key family, not a family" },
    { part: "Open question 2 (wording of the research verdict)", reason: "research-workflow decision, not credential knowledge" },
    { part: "Open question 3 (scanner rule contents checked by name only)", reason: "research-process state about scanners" },
    { part: "Current-contract paragraph and keyword-gated implementation notes", reason: "product policy" },
    { part: "Statement that no scanner has an Exa rule", reason: "per-scanner state; the contract's claims hold scanner observations" },
  ],
  families: [
    {
      id: "exa:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "secret-shape-not-established",
            unresolved: "No provider page, staff statement, SDK code or scanner rule states a prefix, length or alphabet for the secret.",
            text: "The grammar of the API key secret is not established.",
            leadClaims: ["field-secret-shape"],
          },
          {
            id: "identifier-fields",
            cls: "provider-documented",
            text: "The Team Management API documents the key id, the team id and the user id as UUIDs, and a key's response lists its id, name, rate limit and budget with no field for the secret value. The documentation does not say whether the secret equals the id.",
            cite: [UPDATE_KEY],
            claims: ["mutable-property-source", "field-identifier-fields"],
          },
          {
            id: "uuid-measurement",
            unresolved: "One weak code-search measurement found a UUID-shaped value in 1 of 10 assignments and none in 15 in a second pass; that is not a distribution and no source states it.",
            text: "The secret may be a lowercase UUID.",
          },
          {
            id: "exa-prefix",
            unresolved: "The claim came from an untraceable search summary and is contradicted by the provider pages.",
            text: "An exa- prefix on the key.",
            leadClaims: ["field-exa-prefix"],
          },
        ],
        issuance: [
          {
            id: "carriers",
            cls: "provider-documented",
            text: "Keys are created in the web dashboard and sent as the x-api-key header or as a bearer token. The usual carriers are the EXA_API_KEY variable, the api_key constructor argument, and a query parameter on the hosted MCP server URL.",
            claims: ["field-context"],
          },
          {
            id: "service-keys",
            unresolved: "A Team Management API issues service keys; no source states their shape or whether it differs from an ordinary key.",
            text: "Service keys are a second credential class.",
            leadClaims: ["field-service-keys"],
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for the research, so total length, UUID layout and whether the secret differs from the key id were not checked.",
            text: "No Exa key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "uuid-identifiers",
            unresolved: "Follows from the possible UUID shape, which is itself not established.",
            text: "Every UUID in Exa responses and logs (key id, team id, user id, request ids) would share the possible secret shape.",
            leadClaims: ["field-identifier-fields"],
          },
          {
            id: "placeholders",
            unresolved: "Recorded in a research note without a cited source.",
            text: "The placeholders your-api-key and YOUR-EXA-API-KEY are not credentials.",
          },
        ],
        openQuestions: [
          {
            id: "secret-grammar",
            unresolved: "One issued key would show whether the secret is a lowercase UUID.",
            text: "Is the secret a lowercase UUID, and does it differ from the key id?",
          },
          {
            id: "format-drift",
            unresolved: "No changelog entry on key format was found.",
            text: "Has the key format changed over time?",
          },
        ],
      },
    },
  ],
};
