// Authored family narratives for the Okta dossier (benchmarks/support/dossiers/okta.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const GUIDE = "https://developer.okta.com/docs/guides/create-an-api-token/main/";
const OIE_GUIDE = "https://github.com/okta/okta-developer-docs/blob/ae696b9f70cd1bca21f640f4ad3bbdff461279ff/packages/%40okta/vuepress-site/docs/guides/oie-upgrade-api-sdk-to-oie-sdk/main/index.md";
const OPENAPI = "https://github.com/okta/okta-management-openapi-spec/blob/74fcd17fad54332caee96ebbb11fd7f203b03e4f/dist/current/management-dev-noEnums-minimal.yaml#L60548";
const BOOK = "https://github.com/okta/okta-developer-docs/blob/8aff3329cb8e651d2182ce6dcd5ebd303b42a690/packages/@okta/vuepress-site/books/api-security/api-keys/other-options/index.md#L18";

export default {
  provider: "okta",
  dropped: [
    { part: "Candidate: Okta OAuth client id and secret", reason: "a different credential that was not researched; not a family of this record" },
    { part: "Pending ruling paragraph and open question 3 (closure of the research issue)", reason: "issue and review workflow, not credential knowledge" },
  ],
  families: [
    {
      id: "okta:api-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "scheme-and-lead",
            cls: "provider-documented",
            text: "A Management API token is sent as Authorization: SSWS followed by the token. The provider's guide shows an elided example whose value begins with the literal characters 00. The guide states no length and no alphabet.",
            cite: [GUIDE],
            claims: ["mutable-property-source"],
          },
          {
            id: "length-and-body",
            cls: "provider-documented",
            text: "Three dated, distinct full-length examples in the issuer's own repositories (a 2019 API-security book page, a migration guide, and the Management OpenAPI specification, last seen 2025-01 to 2026-03) are each 00 followed by 40 letters and digits, 42 characters in all.",
            cite: [OIE_GUIDE, OPENAPI, BOOK],
          },
          {
            id: "underscore-hyphen",
            cls: "tool-corroborated",
            text: "Two scanner rules admit letters, digits, underscore and hyphen in the 40-character body. Of 52 distinct public candidates that were not placeholders, 47 were 42 characters long, none contained an equals sign, and underscore and hyphen were both common.",
            claims: ["tool-corroboration", "dossier-research"],
          },
          {
            id: "equals-sign",
            unresolved: "Only a scanner's generic alphanumeric-extended helper admits an equals sign; no issuer example and none of the 52 public candidates contains one.",
            text: "The token body may contain an equals sign.",
          },
          {
            id: "forum-always-42",
            unresolved: "Recorded in a research note without a cited source in this family's contract, and the answer's author is not confirmed as Okta staff.",
            text: "A 2019 developer-forum answer states that tokens are always 42 characters and gives a pattern of 00 followed by 40 letters, digits, hyphen or underscore.",
          },
          {
            id: "no-set-structure",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "An Okta team reply in a 2023 developer-forum thread says not to assume a set structure for the tokens and that there are no plans to change it.",
          },
        ],
        issuance: [
          {
            id: "admin-console",
            cls: "provider-documented",
            text: "The provider's guide describes creating an API token in the Admin Console; the token is then used with the SSWS authorization scheme.",
            cite: [GUIDE],
          },
          {
            id: "ui-only-shown-once",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Tokens can only be created in the web console and not through the API; the value is shown once and stored only as a hash; a free developer organization can issue one.",
          },
          {
            id: "not-issued",
            unresolved: "No token was issued for this research; a checklist of total length, leading 00, alphabet classes, header and checksum has no recorded result.",
            text: "No Okta API token was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "leading-00-not-distinctive",
            cls: "tool-corroborated",
            text: "The leading 00 is not a distinctive prefix. A value is attributed to Okta by the SSWS scheme beside it or an okta keyword on the same line, and one scanner additionally requires an Okta tenant domain.",
            claims: ["mutable-property-source", "tool-corroboration"],
          },
        ],
        openQuestions: [
          {
            id: "equals-in-body",
            unresolved: "No issuer example shows an equals sign; only an issued token or an Okta statement would settle it.",
            text: "Can an equals sign appear in the token body?",
          },
          {
            id: "fresh-token-shape",
            unresolved: "No token was issued, so length and alphabet of a freshly issued token are unmeasured.",
            text: "What are the length and alphabet of a freshly issued token?",
          },
        ],
      },
    },
  ],
};
