// Authored family narratives for the Sentry dossier (benchmarks/support/dossiers/sentry.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const RFC = "https://github.com/getsentry/rfcs/blob/6bdc964983762d614dfc9127d669d15ce521be3f/text/0091-ci-upload-tokens.md";

const noWebPage = {
  id: "no-web-page-states-format",
  unresolved: "An absence claim recorded in a research note: no page on Sentry's documentation, product, developer or command-line sites was found stating the format. The search is not itself an evidence record.",
  text: "Does any Sentry documentation page state this token's format?",
};

const notIssued = (what) => ({
  id: "no-issued-token",
  unresolved: `No ${what} was issued or compared for the research; the shape rests on Sentry's published code.`,
  text: `Does a freshly issued ${what} match the shape recorded here?`,
});

export default {
  provider: "sentry",
  dropped: [
    { part: "Candidates: sntrya_ and sntryi_ tokens", reason: "other token types named in the provider's code; no family and no research" },
    { part: "Candidate: legacy unprefixed 64-hex user tokens", reason: "valid but have no identifying element; kept as an unresolved statement inside the user-token family instead" },
    { part: "Open questions 1 and 2 (whether a draft-status RFC or a placeholder on a Sentry web domain meets the provider-source bar)", reason: "maintainer rulings about the project's own evidence bar, not credential knowledge" },
    { part: "Collision note on the contract's looser eyJ anchor and payload floor", reason: "a product matching choice, not credential knowledge" },
    { part: "Research log", reason: "issue workflow" },
  ],
  families: [
    {
      id: "sentry:user-auth-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-body",
            cls: "provider-documented",
            text: "A user auth token is the prefix sntryu_ followed by 64 lowercase hexadecimal characters, which is 32 random bytes hex-encoded. Sentry's server code builds it this way and cannot emit uppercase, and its command-line tool requires the body to decode to exactly 32 bytes.",
            claims: ["field-prefix", "field-body", "mutable-property-source"],
          },
          {
            id: "legacy-unprefixed",
            unresolved: "Recorded in a research note without a cited source for the date of the change that introduced the prefix.",
            text: "User tokens created before the prefix shipped (April 2024) are bare 64 hexadecimal characters, remain valid, and fall outside the prefixed shape.",
            leadClaims: ["field-legacy-unprefixed-tokens"],
          },
          {
            id: "docs-name",
            unresolved: "Recorded in a research note without a cited Sentry page.",
            text: "Sentry's documentation calls these tokens personal tokens.",
          },
        ],
        issuance: [
          {
            id: "not-attempted",
            unresolved: "Issuance was not attempted and no maintainer observed an issued token.",
            text: "How a user creates this token and what scope it carries is not recorded.",
          },
        ],
        collisions: [
          {
            id: "sibling-prefixes",
            cls: "provider-documented",
            text: "The prefixes sntrys_, sntrya_ and sntryi_ belong to other Sentry token types, so the sntryu_ prefix is what marks a user token.",
            claims: ["field-prefix"],
          },
        ],
        openQuestions: [noWebPage, notIssued("user auth token")],
      },
    },
    {
      id: "sentry:organization-auth-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "structure",
            cls: "provider-documented",
            text: "An organization auth token is the prefix sntrys_, a base64-encoded JSON object of facts about the token (which makes the payload start eyJ), a second underscore, and a secret. A valid token has exactly two underscores. Sentry's design RFC states the prefix and the facts-then-secret structure.",
            cite: [RFC],
            claims: ["field-structure", "mutable-property-source"],
          },
          {
            id: "payload-alphabet",
            cls: "provider-documented",
            text: "The payload uses standard base64, with plus and slash, and keeps any equals-sign padding; it is never base64url. Sentry's generator is the authority here, and scanner rules that assume a base64url alphabet or a fixed total length are contradicted by it.",
            claims: ["field-payload-alphabet"],
          },
          {
            id: "secret",
            cls: "provider-documented",
            text: "The secret is 32 random bytes in standard base64 with the padding stripped, exactly 43 characters with no hyphen, underscore or equals sign. The RFC calls the secret recipe an implementation detail; the generator and the command-line tool confirm it.",
            claims: ["field-secret"],
          },
          {
            id: "payload-keys",
            unresolved: "The key order and the null-or-empty url on self-hosted installs rest on a project research note, not on a Sentry source.",
            text: "The payload keys are iat, url, region_url and org in that order, and url may be null or empty on self-hosted installs.",
            leadClaims: ["field-payload-keys"],
          },
          {
            id: "measured-lengths",
            unresolved: "Recorded in a research note as seven measured tokens without a cited source.",
            text: "Measured payloads run 96 to 152 characters and whole tokens 147 to 203 characters.",
          },
        ],
        issuance: [
          {
            id: "ci-upload-purpose",
            cls: "provider-documented",
            text: "The token was designed for CI uploads such as source maps; the design RFC is titled for CI upload tokens.",
            cite: [RFC],
            claims: ["field-structure"],
          },
          {
            id: "not-attempted",
            unresolved: "Issuance was not attempted and no freshly issued token was checked.",
            text: "How a user creates this token is not recorded.",
          },
        ],
        openQuestions: [
          noWebPage,
          notIssued("organization auth token"),
        ],
      },
    },
  ],
};
