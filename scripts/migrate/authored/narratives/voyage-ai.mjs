// Authored family narratives for the Voyage AI dossier (benchmarks/support/dossiers/voyage-ai.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const DOCS = "https://www.mongodb.com/docs/voyageai/management/api-keys/";
const DOCS_SOURCE = "https://github.com/mongodb/docs/blob/2fdb2535da7d5595a9974569f1e7b981b797cd45/content/voyageai/source/management/api-keys.txt#L119-L121";
const PY_SDK = "https://github.com/voyage-ai/voyageai-python/blob/cf6b295b691f4923946cd13fd8c2efdd9344d74a/voyageai/util.py";
const OPENAPI = "https://github.com/mongodb/openapi/blob/5e6f651422c9ac9efd2ad21eba8a4256c38af864/openapi/v2.yaml#L1781-L1798";
const PIPELINE = "https://github.com/mongodb-labs/ai-ml-pipeline-testing/blob/dce1cd9ec156d602b7af040678bcb022bbbf1159/.evergreen/utils.sh#L134-L146";
const BETTERLEAKS = "https://github.com/betterleaks/betterleaks/blob/2bc07526bd83d8402bed0f7991c4d3e60f345af3/cmd/generate/config/rules/voyageai.go";

export default {
  provider: "voyage-ai",
  dropped: [
    { part: "Candidates: `al-us-` scoped keys and legacy keys issued at signup before the `pa-` prefix", reason: "not families; the first is unsourced and the second undocumented, so both are carried as unresolved statements of the API key" },
    { part: "Pending rulings (whether the Atlas example is the al- grammar; whether a scanner rule written by provider staff counts as a staff statement) and the evidence-threshold discussion", reason: "internal evidence-threshold rulings, not credential knowledge; the underlying facts are carried as statements with their sources" },
    { part: "Open questions 3 and 4 (unread parts of a secret-scanning vendor's list and a JavaScript-only forum)", reason: "research workflow state, not credential knowledge" },
    { part: "Open question 5 (whether a routing prefix alone meets the project's evidence bar for al-)", reason: "an internal evidence-threshold ruling, not credential knowledge" },
    { part: "Current-contract section (named assignment, Bearer, JSON, YAML and tool-call forms and a generic gap) and the issuance checklist reference", reason: "product policy and issue workflow are not carried (ADR 0010 section 5)" },
  ],
  families: [
    {
      id: "voyage-ai:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefixes",
            cls: "provider-documented",
            text: "A key from the standalone Voyage AI dashboard begins with pa-, and a MongoDB Atlas model API key begins with al-. MongoDB's own pipeline test code states both prefixes, and Voyage AI's Python SDK routes an al- key to the MongoDB endpoint.",
            cite: [PIPELINE, PY_SDK],
          },
          {
            id: "regional-prefix",
            cls: "provider-documented",
            text: "MongoDB's documentation says prefixes encode the key's scope and gives al-eu- for EU-scoped keys.",
            cite: [DOCS, DOCS_SOURCE],
          },
          {
            id: "name-limit",
            cls: "provider-documented",
            text: "The documented limit of 250 characters applies to the name given to a key, as the Atlas Admin API schema shows, and not to the key itself.",
            cite: [OPENAPI],
          },
          {
            id: "body-43",
            cls: "provider-documented",
            text: "The Atlas Admin API schema example shows one full-length key, al- followed by 43 letters and digits, with a masked form of al- then asterisks and the last four characters. That is one example and not a stated grammar, and it gives 46 characters for the unscoped forms.",
            cite: [OPENAPI],
          },
          {
            id: "body-scanner-rules",
            cls: "tool-corroborated",
            text: "Scanner rules for the body (betterleaks and Kingfisher) were written by a MongoDB engineer who says so, so every source for the 43-character body speaks with one MongoDB voice. They allow letters, digits, underscore and hyphen, and third-party code checks only the pa- prefix.",
            cite: [BETTERLEAKS],
          },
          {
            id: "body-grammar",
            unresolved: "The body length and alphabet are not stated by any provider page; the only evidence is one schema example and scanner rules from the same issuer, and the length of a scoped al-eu- key can only be shown by an issued key.",
            text: "It is not established that the body is always 43 characters, per prefix or overall, or whether underscore and hyphen can appear in it.",
            lead: [OPENAPI],
          },
        ],
        issuance: [
          {
            id: "two-issuers",
            unresolved: "The overview is recorded in a research note, and no key was issued for this research; the cited sources establish the prefixes and the endpoint routing but not the dashboards.",
            text: "Voyage AI, now operated by MongoDB, has two issuers: a standalone dashboard that issues keys for the Voyage AI API, and MongoDB Atlas, which issues model API keys for the MongoDB endpoint and regional endpoints. Both send the key as a bearer token and the SDK reads VOYAGE_API_KEY.",
            lead: [DOCS, PY_SDK],
          },
          {
            id: "issued-sample",
            unresolved: "No key was issued; the planned checks (one standalone and one Atlas key: prefix, body length, underscore and hyphen, regional variants, masked list view and signup-issued keys) were not performed.",
            text: "None of the key properties has been checked against an issued key.",
          },
        ],
        lifecycle: [
          {
            id: "legacy-keys",
            unresolved: "No reviewed source describes keys issued at signup before the pa- prefix existed.",
            text: "Legacy keys issued before the pa- prefix are undocumented.",
          },
        ],
        collisions: [
          {
            id: "short-prefixes",
            unresolved: "Recorded in a research note without a cited source.",
            text: "The two-letter prefixes pa- and al- are common in slugs and transliterations, and a 43-character base64url value matches a SHA-256 digest. Placeholders such as pa-your-key-here and model names such as voyage-3 are benign, and key ids and names are public.",
          },
        ],
        openQuestions: [
          {
            id: "pa-provenance",
            unresolved: "No provider documentation page states the pa- prefix; only MongoDB-owned test code does.",
            text: "Where does the provider itself document the pa- prefix?",
          },
          {
            id: "us-scoped",
            unresolved: "An al-us- prefix is implied by al-eu- but is not stated in any source found.",
            text: "Do other region-scoped prefixes such as al-us- exist?",
          },
        ],
      },
    },
  ],
};
