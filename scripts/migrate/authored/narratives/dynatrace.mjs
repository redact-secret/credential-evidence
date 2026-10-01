// Authored family narratives for the Dynatrace dossier (benchmarks/support/dossiers/dynatrace.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const DOCS = "https://docs.dynatrace.com/docs/dynatrace-api/basics/dynatrace-api-authentication";
const OPERATOR = "https://github.com/Dynatrace/dynatrace-operator/blob/2a39d88a0ee1fbb61e2d22db02520b3dc92ffc80/pkg/util/dttoken/token.go#L14-L58";

export default {
  provider: "dynatrace",
  dropped: [
    { part: "Candidate: OAuth client secrets and tenant tokens in other shapes", reason: "not in the documented three-part format; not a family" },
    { part: "Open questions: none open", reason: "nothing to carry" },
    { part: "Current contract link and implementation status note", reason: "product policy and scanner implementation state" },
  ],
  families: [
    {
      id: "dynatrace:api-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "layout",
            cls: "provider-documented",
            text: "A token has three parts separated by dots: a prefix, a 24-character public portion and a 64-character secret portion, 96 characters in all. The prefix is dt0, then c or s, then two digits. Both portions use uppercase base32 characters (A to Z and 2 to 7).",
            cite: [DOCS, OPERATOR],
            claims: ["provider-source", "field-layout", "field-alphabet"],
          },
          {
            id: "prefix-table",
            cls: "provider-documented",
            text: "The documentation's prefix table lists dt0s01 through dt0s16; dt0c01 is the classic access-token prefix shown in the documentation's request examples.",
            claims: ["field-prefix"],
          },
          {
            id: "alphabet-source",
            cls: "provider-documented",
            text: "Dynatrace's own operator code generates each portion as standard base32 encoding truncated to the portion length, which is where the alphabet comes from; the documentation example agrees.",
            cite: [OPERATOR],
            claims: ["field-alphabet"],
          },
        ],
        issuance: [
          {
            id: "scope",
            cls: "provider-documented",
            text: "Access tokens and platform tokens authenticate the environment and account APIs. Depending on their scopes they read monitoring data (which can include payloads and logs), change configuration, ingest data or manage the account.",
            cite: [DOCS],
          },
          {
            id: "transport",
            cls: "provider-documented",
            text: "The documented carriers are the Authorization header with the Api-Token scheme, the DT_API_TOKEN variable, a DynaKube secret field named apiToken, and an OpenTelemetry exporter header in which the space after the scheme is URL-encoded.",
            claims: ["field-transport"],
          },
          {
            id: "not-issued",
            unresolved: "No token was issued for the research; the grammar rests on provider documentation and provider code.",
            text: "No Dynatrace token was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "token-identifier",
            cls: "provider-documented",
            text: "The token identifier, meaning the prefix plus the public portion, is documented as safe to display in the interface and to log. It is not the secret, although inside a full token it is part of the same string.",
            claims: ["field-token-identifier"],
          },
        ],
      },
    },
  ],
};
