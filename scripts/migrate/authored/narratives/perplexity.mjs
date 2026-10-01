// Authored family narratives for the Perplexity dossier (benchmarks/support/dossiers/perplexity.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const KEY_DOCS = "https://docs.perplexity.ai/docs/admin/api-key-management";

export default {
  provider: "perplexity",
  dropped: [
    { part: "Candidate: Analytics API key", reason: "organization-scoped and documented only on an analytics page; format undocumented, not a researched family" },
    { part: "Candidate: MCP OAuth access tokens", reason: "shape unknown; not a researched family" },
    { part: "Open question 4 (environment variable names used by third-party tools)", reason: "naming conventions of integrations rather than credential format; no cited source" },
    { part: "GitGuardian 'not prefixed' remark and the console-checklist reference", reason: "a third-party classification of its own rule and a research-issue pointer" },
  ],
  families: [
    {
      id: "perplexity:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "An API key begins with the lowercase prefix pplx- with a single hyphen. The provider's key-management documentation shows a pplx- value with an obviously shortened body, and states no length and no alphabet.",
            cite: [KEY_DOCS],
            claims: ["field-prefix"],
          },
          {
            id: "body-length",
            cls: "tool-corroborated",
            text: "The body is 48 characters after the prefix, 53 in all. Two scanner rules agree on exactly 48, one of them from 2025-04; another redaction rule allows 40 to 60. The two agreeing rules may share lineage, and no provider statement on length was found.",
            claims: ["field-body-length"],
          },
          {
            id: "body-alphabet",
            unresolved: "No provider statement; a scanner rule says letters and digits only, one redaction rule allows 10 or more characters including underscore and hyphen, and the official command-line tool checks only that a key is non-empty printable ASCII.",
            text: "The body contains only letters and digits.",
            leadClaims: ["field-body-alphabet"],
          },
        ],
        issuance: [
          {
            id: "rotation",
            cls: "provider-documented",
            text: "Keys can be rotated through the generate_auth_token and revoke_auth_token calls (2025-09).",
            cite: [KEY_DOCS],
          },
          {
            id: "console-and-reveal",
            unresolved: "Recorded in a research note without a cited source in this family's contract; no key was issued, and a project may need billing set up first.",
            text: "Keys are issued from the API console and scoped to a project since 2025-04 (earlier from account settings). Since 2026-04 a key is revealed only once; before then the console could show it again.",
          },
        ],
        collisions: [
          {
            id: "pplx-lookalikes",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Other strings begin pplx-: model identifiers (pplx-7b-online, pplx-embed-v1-4b), package and command names (pplx-cli, pplx-api), hostnames such as pplx-res.cloudinary.com and *.pplx.app. An OpenRouter key stored under PERPLEXITY_API_KEY is also not a Perplexity key.",
          },
        ],
        openQuestions: [
          {
            id: "earlier-shapes",
            unresolved: "No source documents key shapes before 2025-04 (the pplx-api era) or before 2026-04.",
            text: "Did keys issued before 2025-04 or before 2026-04 differ in shape?",
            leadClaims: ["field-checksum-embedded-project-id-historical-versions"],
          },
          {
            id: "embedded-project-id",
            unresolved: "No source documents any embedded identifier or checksum.",
            text: "Does the key encode a project or group identifier?",
          },
          {
            id: "other-characters",
            unresolved: "No provider statement of the alphabet exists.",
            text: "Is anything beyond letters and digits ever present in the body?",
          },
        ],
      },
    },
  ],
};
