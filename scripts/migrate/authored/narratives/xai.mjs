// Authored family narratives for the xAI dossier (benchmarks/support/dossiers/xai.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const QUICKSTART = "https://docs.x.ai/developers/quickstart";
const MGMT_AUTH = "https://docs.x.ai/developers/rest-api-reference/management/auth";
const MGMT_GUIDE = "https://docs.x.ai/developers/management-api-guide";
const LITELLM = "https://github.com/BerriAI/litellm/issues/9291";

export default {
  provider: "xai",
  dropped: [
    { part: "Candidate: management key (xai-token- plus 80 characters, per one scanner only)", reason: "no provider documentation gives a format, so no family is proposed; carried as a collision and an unresolved statement of the API key" },
    { part: "Open question 5 (a secret-scanning list marks the type not prefixed)", reason: "a single third-party label that conflicts with every other source; recorded as unresolved context, not carried as a claim" },
    { part: "Current-contract link and the checklist reference", reason: "product policy and issue workflow are not carried (ADR 0010 section 5)" },
  ],
  families: [
    {
      id: "xai:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "A Grok API key begins with xai-, shown in the provider's quickstart and in its management API reference.",
            cite: [QUICKSTART, MGMT_AUTH],
            claims: ["field-prefix"],
          },
          {
            id: "body-80",
            cls: "provider-documented",
            text: "The key's body after the prefix is 80 characters. The provider's API-key response schema shows one example with an 80-character alphanumeric body and its prose never states the length, so this is documented by example. A third-party error message that masks a key (LiteLLM) also shows an 80-character body.",
            cite: [MGMT_AUTH, LITELLM],
            claims: ["field-body-length"],
          },
          {
            id: "body-alphabet",
            cls: "tool-corroborated",
            text: "Every positive example body uses letters and digits only. Scanner rules disagree about whether underscore and hyphen may appear: one admits an underscore, another admits both, and others accept letters and digits only.",
            claims: ["field-body-alphabet"],
          },
          {
            id: "alphabet-open",
            unresolved: "The documentation never states the alphabet in prose, and no real key containing an underscore or hyphen was seen.",
            text: "It is not established whether the body can contain an underscore or a hyphen.",
            lead: [MGMT_AUTH],
          },
          {
            id: "right-boundary",
            unresolved: "Scanner rules differ on a value with an 81st word character: one rejects it, one truncates to 80 and one anchors exactly; no provider source settles it.",
            text: "It is not established how a key followed by further word characters should be read.",
            leadClaims: ["field-right-boundary"],
          },
        ],
        issuance: [
          {
            id: "console",
            unresolved: "No key was issued for this research; the console flow and the show-once behaviour are recorded in a research note without a cited page.",
            text: "A key is created from the API Keys page of the xAI console, belongs to a team, and its full value is returned once at creation. The official Python SDK reads XAI_API_KEY and validates nothing.",
            lead: [QUICKSTART],
          },
        ],
        collisions: [
          {
            id: "management-key",
            unresolved: "Provider documentation gives no format for a management key; only a scanner source reports an xai-token- prefix.",
            text: "A management key (XAI_MANAGEMENT_KEY) for the Management API is a separate credential. One scanner reports an xai-token- prefix followed by 80 characters.",
            lead: [MGMT_GUIDE],
            leadClaims: ["field-management-key"],
          },
          {
            id: "public-neighbours",
            unresolved: "Recorded in a research note without a cited source.",
            text: "Public values next to keys include the apiKeyId and teamId UUIDs, access-control strings such as api-key:endpoint:chat, the xai-org and xai-sdk names, and the redacted form of xai- followed by an ellipsis and four characters. A Groq gsk_ value stored under XAI_API_KEY is not an xAI key.",
          },
        ],
        openQuestions: [
          {
            id: "beta-era-shape",
            unresolved: "No source was found for the shape of keys issued in 2024 before the current format.",
            text: "Did keys issued in 2024 use another shape?",
          },
          {
            id: "project-sub-prefixes",
            unresolved: "A search summary claimed project-scoped sub-prefixes, but no fetched page supports it.",
            text: "Are there project-scoped sub-prefixes of xai-?",
          },
          {
            id: "management-prefix-real",
            unresolved: "Only one scanner source reports the xai-token- prefix.",
            text: "Is the xai-token- management prefix real?",
          },
        ],
      },
    },
  ],
};
