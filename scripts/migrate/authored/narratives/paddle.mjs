// Authored family narratives for the Paddle dossier (benchmarks/support/dossiers/paddle.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const DOCS = "https://developer.paddle.com/api-reference/about/api-keys";

export default {
  provider: "paddle",
  dropped: [
    { part: "Candidate: legacy API keys (before 2025-05-06)", reason: "carried as a collision statement of paddle:api-key; not a separate family" },
    { part: "Candidate: Paddle.js client-side tokens and Paddle Classic vendor auth codes", reason: "a frontend credential by design and another product; not researched as families" },
    { part: "Open question 1 ('none open') and the peer-scanner lag note", reason: "an empty section, and scanner coverage state respectively" },
  ],
  families: [
    {
      id: "paddle:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "grammar",
            cls: "provider-documented",
            text: "A Billing API key is pdl_live_apikey_ or pdl_sdbx_apikey_, then 26 lowercase letters and digits, an underscore, 22 letters and digits, an underscore, and 3 letters and digits. It is 69 characters in all with five underscores, and the provider's page publishes a regular expression for it.",
            claims: ["provider-source", "field-prefix", "field-id-segment", "field-secret-segment", "field-suffix"],
          },
          {
            id: "case-sensitive",
            cls: "provider-documented",
            text: "Keys are case-sensitive; the first segment after the prefix is lowercase only and the other two segments accept upper and lower case.",
            cite: [DOCS],
            claims: ["field-prefix"],
          },
          {
            id: "boundary",
            unresolved: "The documented expression is anchored and says nothing about neighboring characters; treating a key glued to an identifier character as not a key is a project handoff choice.",
            text: "A key directly attached to a letter, digit, underscore or hyphen on either side is not a key.",
            leadClaims: ["field-boundary"],
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "The key is read from PADDLE_API_KEY, passed to the SDK constructor, and sent as Authorization: Bearer. Live keys act on the live account and sandbox keys on the sandbox only.",
            claims: ["field-transport"],
          },
          {
            id: "not-issued",
            unresolved: "No key was issued; the grammar rests on the provider's published expression.",
            text: "No Paddle API key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "key-id",
            cls: "provider-documented",
            text: "The apikey_ segment plus its 26 characters is the key identifier, returned by the API and in webhook payloads; it is not a secret.",
            claims: ["field-key-id"],
          },
          {
            id: "legacy-keys",
            cls: "provider-documented",
            text: "Keys created before 2025-05-06 are 50 lowercase letters and digits with no prefix. They are a different, older shape and not covered by this grammar.",
            claims: ["field-legacy-keys"],
          },
        ],
      },
    },
  ],
};
