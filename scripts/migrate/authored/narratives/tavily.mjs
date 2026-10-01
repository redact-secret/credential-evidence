// Authored family narratives for the Tavily dossier (benchmarks/support/dossiers/tavily.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const API = "https://docs.tavily.com/documentation/api-reference/introduction";
const GENERATE = "https://docs.tavily.com/documentation/enterprise/generate-keys";

export default {
  provider: "tavily",
  dropped: [
    { part: "Candidate: tvly-prod- keys", reason: "no example exists anywhere; kept as an open question inside the family, not a separate family" },
    { part: "Open question 3 (tier wording) and the paragraph on tiers in Sources", reason: "evidence-tier bookkeeping, not credential knowledge" },
    { part: "Open question 4 (no forum or staff statement located)", reason: "an absence of evidence in a search, not a claim" },
    { part: "Statement on how a command-line detector treats Bearer tvly-YOUR_API_KEY", reason: "scanner-specific false-positive history" },
    { part: "Overview note on whether a product detects the family", reason: "product state" },
    { part: "Research log", reason: "issue workflow" },
  ],
  families: [
    {
      id: "tavily:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "Tavily's documentation shows the prefix tvly- in a placeholder (a Bearer header with tvly-YOUR_API_KEY), which is an illustration and not a stated format. It gives no length or alphabet, and the provider's SDKs do no validation.",
            cite: [API],
            claims: ["field-prefix"],
          },
          {
            id: "dev-segment",
            cls: "provider-documented",
            text: "Truncated sample keys in Tavily's key-generation documentation carry a dev- segment after the prefix (tvly-dev-). Older samples have no such segment. The documentation does not say whether the dev- form replaced the bare form or both exist.",
            cite: [GENERATE],
            claims: ["field-dev-segment"],
          },
          {
            id: "body",
            unresolved: "One scanner rule and three observed samples state a 32-character alphanumeric body; the rule predates the dev- segment, and no provider statement exists.",
            text: "After the last hyphen the body is 32 letters and digits.",
            leadClaims: ["field-body"],
          },
          {
            id: "scanner-agreement",
            cls: "tool-corroborated",
            text: "A scanner rule from before the dev- segment and a secret-detection service's catalogue entry both treat the key as prefixed; neither is a Tavily statement, and the service states no length.",
            claims: ["tool-corroboration"],
          },
        ],
        issuance: [
          {
            id: "key-types",
            unresolved: "Recorded in a research note without a citation to the page that lists the key types.",
            text: "Keys are issued from the Tavily dashboard in development (the default) and production types, and enterprise accounts can generate expiring keys.",
          },
          {
            id: "transport",
            cls: "provider-documented",
            text: "A key is sent as an Authorization Bearer header, in the api_key field of a JSON request body, or, for the remote MCP server, in a tavilyApiKey query parameter; the TAVILY_API_KEY environment variable is also used.",
            cite: [API],
            claims: ["field-transport"],
          },
          {
            id: "not-attempted",
            unresolved: "No key was issued for the research, so the prefix, body width, alphabet and masked display of a real key are unrecorded.",
            text: "What a freshly issued development key looks like is not recorded.",
          },
        ],
        collisions: [
          {
            id: "non-secrets",
            cls: "provider-documented",
            text: "The tvly command-line tool name, the key-name field (a string such as a key type, an expiration and an index) and the request_id values of search responses are not credentials.",
            cite: [GENERATE],
            claims: ["field-non-secrets"],
          },
        ],
        openQuestions: [
          {
            id: "production-keys",
            unresolved: "No production or enterprise key example was found; one third-party page says production keys begin plain tvly-, which is not a provider source.",
            text: "Do production keys use a tvly-prod- prefix, and what are the widths of production and enterprise expiring-key bodies?",
            leadClaims: ["field-production-prefix"],
          },
          {
            id: "alphabet",
            unresolved: "Only alphanumeric bodies were seen and no source states the alphabet.",
            text: "Do hyphens or underscores ever appear in the body?",
          },
        ],
      },
    },
  ],
};
