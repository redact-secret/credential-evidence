// Authored family narratives for the Shopify dossier (benchmarks/support/dossiers/shopify.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const TOKENS = "https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens";

const body = (prefix) => [
  {
    id: "prefix",
    cls: "provider-documented",
    text: `The access token begins ${prefix}. Shopify's access-token page documents the prefix and describes the rest as an opaque string with no stated length or character class.`,
    cite: [TOKENS],
    claims: ["provider-source"],
  },
  {
    id: "hex-body",
    cls: "tool-corroborated",
    text: "Scanner rules read the body as 32 hexadecimal characters. The provider page does not state this.",
    claims: ["tool-corroboration"],
  },
];

const bodyOpen = {
  id: "body-grammar",
  unresolved: "The provider calls the body an opaque string and states no length or alphabet, and no issued token was inspected, so the body grammar cannot be established from provider evidence.",
  text: "What are the length and alphabet of the token body?",
};

export default {
  provider: "shopify",
  dropped: [
    { part: "Candidate: shpca_ public storefront token", reason: "not a family; excluded by a product module's documentation, with no taxonomy entry" },
    { part: "Requirement of a myshopify.com shop domain beside the token", reason: "a product matching policy, not credential knowledge" },
    { part: "Research log and related non-research issue", reason: "issue workflow" },
  ],
  families: [
    {
      id: "shopify:custom-app-access-token",
      status: "migrated",
      sections: {
        shape: body("shpat_"),
        issuance: [
          {
            id: "store-installed-custom-app",
            cls: "provider-documented",
            text: "This is the access token of a custom app installed on a single store.",
            cite: [TOKENS],
            claims: ["provider-source"],
          },
        ],
        openQuestions: [bodyOpen],
      },
    },
    {
      id: "shopify:public-app-access-token",
      status: "migrated",
      sections: {
        shape: body("shppa_"),
        issuance: [
          {
            id: "public-or-listed-app",
            cls: "provider-documented",
            text: "This is the access token of a public or listed app.",
            cite: [TOKENS],
            claims: ["provider-source"],
          },
        ],
        openQuestions: [bodyOpen],
      },
    },
  ],
};
