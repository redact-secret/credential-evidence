// Authored family narratives for the Postman dossier (benchmarks/support/dossiers/postman.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const AUTH_DOCS = "https://learning.postman.com/docs/developer/postman-api/authentication/";
const KEY_API = "https://learning.postman.com/api-docs/api-reference/collection-access-keys/get-collection-access-keys";
const GITLAB = "https://gitlab.com/gitlab-org/security-products/secret-detection/secret-detection-rules/-/blob/e1c7e83815a7e55cc1514dd59d4e56459e39cbfb/rules/mit/postman/postman.toml";

export default {
  provider: "postman",
  dropped: [
    { part: "Open question 3 (whether other Postman credential forms exist)", reason: "an earlier module note said none is documented; no source for or against, nothing to record" },
    { part: "Ranking, registry and issue notes about how the collection access key was classified", reason: "issue workflow and scanner support state, not credential knowledge" },
  ],
  families: [
    {
      id: "postman:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "header-only",
            cls: "provider-documented",
            text: "The provider's authentication page says an API key is sent in the X-API-Key header. It states no prefix, length or example.",
            cite: [AUTH_DOCS],
          },
          {
            id: "structure",
            cls: "tool-corroborated",
            text: "A key is the prefix PMAK-, 24 lowercase hexadecimal characters, a literal hyphen, then 34 lowercase hexadecimal characters: a 59-character body and 64 characters in all. Scanner rules agree on the structure, and one of them corroborates only the prefix and the 59-character body length.",
            claims: ["tool-corroboration"],
          },
          {
            id: "public-candidate-check",
            unresolved: "A research note records that 31 of 33 public-code candidates matched and none had a 35 or 36 character second segment, but the note is not a cited source; one unsourced proposal says the second segment is 34 to 36 characters.",
            text: "The second segment is always 34 characters.",
            leadClaims: ["dossier-research"],
          },
          {
            id: "provider-redaction-config",
            unresolved: "The provider's own redaction configuration is described as fixing the same structure, but no source for it is cited in this family's contract.",
            text: "Postman's own agent redaction configuration describes the same 24 plus 34 hexadecimal structure.",
          },
          {
            id: "uppercase-hex",
            unresolved: "No source states whether uppercase hexadecimal is accepted.",
            text: "The hexadecimal segments may contain uppercase characters.",
          },
        ],
        issuance: [
          {
            id: "account-settings",
            unresolved: "Recorded in a research note without a cited source in this family's contract; no key was issued.",
            text: "API keys are created in the Postman account settings, with an expiry set when the key is created.",
          },
        ],
        collisions: [
          {
            id: "id-fragment",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "The first part of a full key (PMAK- plus 24 hexadecimal characters) is an identifier part and not a credential by itself, although the provider's own redaction configuration also scrubs it.",
          },
          {
            id: "pmat-separate",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "PMAT- values are a separate credential, the collection access key.",
          },
        ],
        openQuestions: [
          {
            id: "second-segment-and-case",
            unresolved: "No issued key has been measured.",
            text: "Does the second segment ever differ from 34 characters, and can the hexadecimal be uppercase?",
          },
        ],
      },
    },
    {
      id: "postman:collection-access-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-masked-display",
            cls: "provider-documented",
            text: "A collection access key begins PMAT-. The provider renders it masked as PMAT- followed by asterisks and four trailing characters, 26 in all, and states no alphabet.",
            claims: ["field-prefix", "mutable-property-source"],
          },
          {
            id: "body-26-uppercase",
            cls: "tool-corroborated",
            text: "One scanner rule (GitLab's secret-detection rules) matches PMAT- followed by exactly 26 uppercase letters and digits, which agrees with the length implied by the masked display.",
            cite: [GITLAB],
          },
          {
            id: "lowercase-accepted",
            unresolved: "Only one scanner rule states the alphabet, and a research note says the product accepts either case without a cited source.",
            text: "The body accepts lowercase letters as well as uppercase.",
            lead: [GITLAB],
          },
          {
            id: "ulid-body",
            unresolved: "Every example in the one scanner rule has the shape of a ULID (26 Crockford base32 characters with a timestamp prefix), but no source says the body is one.",
            text: "The body may be a ULID.",
            lead: [GITLAB],
          },
        ],
        issuance: [
          {
            id: "sharing-and-api",
            cls: "provider-documented",
            text: "A collection access key is a read-only credential for one collection, created by sharing the collection and also through the collection access keys API; it expires after 60 days without use.",
            claims: ["field-credential"],
            cite: [KEY_API],
          },
          {
            id: "not-issued",
            unresolved: "No key was issued or observed.",
            text: "No Postman collection access key was issued for this record.",
          },
        ],
        collisions: [
          {
            id: "url-parameter",
            cls: "provider-documented",
            text: "The key appears as the access_key query parameter of the shared collection URL.",
            claims: ["field-credential"],
          },
          {
            id: "pmak-distinct",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "PMAK- API keys are distinct credentials.",
          },
          {
            id: "partner-list",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "GitHub's secret-scanning partner list names a postman_collection_key type beside postman_api_key.",
          },
        ],
        openQuestions: [
          {
            id: "pmat-uppercase",
            unresolved: "Only one scanner rule states the alphabet and no key was issued.",
            text: "Is the PMAT- alphabet always uppercase?",
          },
        ],
      },
    },
  ],
};
