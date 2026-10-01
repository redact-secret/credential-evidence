// Authored family narratives for the Pinecone dossier (benchmarks/support/dossiers/pinecone.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const AUTH_DOCS = "https://docs.pinecone.io/reference/api/authentication";
const ADMIN_CREATE_KEY = "https://docs.pinecone.io/reference/api/2026-04/admin/create_api_key";

export default {
  provider: "pinecone",
  dropped: [
    { part: "Candidate: service account client id and secret, and the Admin API access token", reason: "documented but a different credential with no prefix; not a researched family" },
    { part: "Candidate: pckey_<label>_<key>", reason: "carried as statements of pinecone:api-key (documented, never observed)" },
    { part: "Contract note about the same-line context ruling and issue references", reason: "workflow and scanner behaviour; the policy itself is carried as a statement of pinecone:legacy-api-key" },
  ],
  families: [
    {
      id: "pinecone:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "A current API key begins pcsk_. The prefix comes from the provider's command-line tool and SDK code and tests, which are its own source, and not from a written grammar.",
            claims: ["field-prefix"],
          },
          {
            id: "segments",
            cls: "provider-documented",
            text: "The key is three underscore-separated parts: pcsk_, a public label, and a secret. The provider's Python SDK shows this segmentation.",
            claims: ["field-segments"],
          },
          {
            id: "secret-width",
            cls: "tool-corroborated",
            text: "The secret is exactly 63 letters and digits, so a key is 74 or 75 characters in all. Scanner rules agree on the width; one looser rule allows underscore and at least 40 characters.",
            claims: ["field-secret-width"],
          },
          {
            id: "label-width",
            unresolved: "Only a scanner rule states the width; no provider source does.",
            text: "The public label is 5 or 6 letters and digits.",
            leadClaims: ["field-label-width"],
          },
          {
            id: "pckey-documented",
            cls: "provider-documented",
            text: "The Admin API reference for creating a key describes new keys as pckey_ followed by a public label, an underscore and a unique key. No scanner rule, sample or report shows a value with the pckey_ prefix; this contradicts every observation of pcsk_ and is neither a positive nor a negative for either form.",
            cite: [ADMIN_CREATE_KEY],
          },
        ],
        issuance: [
          {
            id: "header-and-variable",
            cls: "provider-documented",
            text: "The provider's authentication page says the key is sent in the Api-Key header and read from the PINECONE_API_KEY environment variable. It states no key grammar.",
            cite: [AUTH_DOCS],
          },
          {
            id: "console-issuance",
            unresolved: "Recorded in a research note without a cited source in this family's contract; no key was issued.",
            text: "Keys are scoped to a project and created in the console on the project's API keys page, shown once; the free Starter plan issues keys with permissions fixed at All. A key created through the Admin API would show whether pckey_ is real, and needs a service account.",
          },
          {
            id: "uuid-to-pcsk-switch",
            unresolved: "The date Pinecone moved from UUID keys to pcsk_ keys is not recorded in any cited source.",
            text: "Keys were issued as bare UUIDs before the pcsk_ form.",
          },
        ],
        collisions: [
          {
            id: "service-account-credentials",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "A service account's client id (32 letters and digits) and client secret (about 64 characters of letters, digits, hyphen and underscore, no prefix) are other credentials, exchanged for an Admin API bearer token.",
          },
          {
            id: "public-identifiers",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "UUIDs for keys, projects, service accounts and organizations, index hosts and PINECONE_ENVIRONMENT strings are public identifiers and not secrets.",
          },
          {
            id: "masked-forms",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Masked displays exist: pcsk*** plus four characters in the command-line tool, and three dots plus four characters in the Python SDK's repr output.",
          },
        ],
        openQuestions: [
          {
            id: "pckey-vs-pcsk",
            unresolved: "The Admin API reference and all observations disagree, and issuing a key through that API is the only way to test it.",
            text: "Why does the Admin API reference say pckey_ when every observation says pcsk_?",
            leadClaims: ["field-documented-pckey-prefix"],
          },
          {
            id: "label-shown-separately",
            unresolved: "No source says whether the console or API shows the label apart from the key.",
            text: "Is the 5 or 6 character label shown separately in the console or API?",
          },
          {
            id: "body-alphabet",
            unresolved: "A looser scanner rule allows underscore; no provider statement of the alphabet exists.",
            text: "Is the secret body strictly letters and digits?",
          },
        ],
      },
    },
    {
      id: "pinecone:legacy-api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "uuid-shape",
            cls: "tool-corroborated",
            text: "A legacy key is a lowercase hexadecimal UUID in the 8-4-4-4-12 layout, used before the pcsk_ form and paired with an environment name. Only a third-party secret catalog and one scanner rule describe it, and no provider source states the shape.",
            claims: ["field-value-shape"],
          },
          {
            id: "provider-silent",
            cls: "provider-documented",
            text: "The provider documents the key as sent in the Api-Key header and read from PINECONE_API_KEY but states no key grammar; it documents project, index, database and service account identifiers as UUIDs.",
            claims: ["mutable-property-source"],
          },
        ],
        issuance: [
          {
            id: "still-issued",
            unresolved: "Nothing indicates the console still issues UUID keys, and whether they still authenticate is unknown.",
            text: "New legacy UUID keys can still be issued.",
            leadClaims: ["field-issuance-status"],
          },
        ],
        collisions: [
          {
            id: "other-uuids",
            cls: "provider-documented",
            text: "A legacy key is lexically identical to the other UUIDs in Pinecone output, such as project, service account and organization identifiers. A UUID under an identifier-named field (PINECONE_PROJECT_ID, X-Project-Id, indexId) is not a key.",
            claims: ["mutable-property-source"],
          },
          {
            id: "context-only-policy",
            cls: "project-policy",
            text: "As a masking policy and not a provider format, a legacy UUID is treated as a key only when it is the value assigned to a Pinecone API-key name on the same line; a bare UUID is not claimed.",
            claims: ["legacy-contract-tier"],
          },
        ],
        openQuestions: [
          {
            id: "legacy-still-authenticates",
            unresolved: "No source says whether legacy UUID keys still authenticate or when Pinecone stopped issuing them.",
            text: "Do legacy UUID keys still authenticate, and when did Pinecone stop issuing them?",
          },
        ],
      },
    },
  ],
};
