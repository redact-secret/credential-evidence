// Authored family narratives for the Neon dossier (benchmarks/support/dossiers/neon.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const API_KEYS_PAGE = "https://neon.com/docs/manage/api-keys";

export default {
  provider: "neon",
  dropped: [
    { part: "Candidates: PlanetScale, CockroachDB Cloud and MongoDB Atlas credentials", reason: "other providers' credentials ranked as follow-ups; they belong in their own provider records, not in Neon's" },
    { part: "Open question 4 (an unticked acceptance box on a scanner change)", reason: "issue workflow, not credential knowledge" },
    { part: "Open question 3 (do personal, organization and project-scoped keys share one grammar)", reason: "carried as an open question on the family instead" },
  ],
  families: [
    {
      id: "neon:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "Neon's changelog of 2025-01-31 says newly created API keys are prefixed with napi_ so that secret scanning can rely on an identifiable marker, and that existing unprefixed keys stay valid. It states no body length or alphabet.",
            claims: ["field-prefix", "mutable-property-source"],
          },
          {
            id: "body",
            cls: "tool-corroborated",
            text: "After napi_ come at least 64 letters and digits, read to the end of the run. One scanner rule matches exactly 64 and a masking library uses 64 as a floor. Two other widely used scanners have no Neon rule, and GitHub secret scanning lists a Neon key type without publishing its expression, which corroborates the prefix only.",
            claims: ["field-body-length", "field-body-alphabet", "tool-corroboration"],
          },
          {
            id: "sixty-four-bit-wording",
            cls: "provider-documented",
            text: "Neon's API-keys page describes a key as a randomly generated 64-bit token, which fits no string length, and its only written example is not a shape, so the page is not used for the body.",
            cite: [API_KEYS_PAGE],
          },
          {
            id: "legacy-unprefixed",
            unresolved: "The changelog says earlier keys stay valid and carry no marker, but no source describes what they look like.",
            text: "Keys issued before the prefix was introduced have no marker.",
            leadClaims: ["field-legacy-keys"],
          },
        ],
        issuance: [
          {
            id: "console-or-api",
            unresolved: "Recorded in a research note without a cited source in this family's contract; no key was issued.",
            text: "Keys are created in the Neon Console or through the API.",
          },
        ],
        collisions: [
          {
            id: "benign-ids",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Project, branch and endpoint ids, pooled hostnames with a database name, and placeholders are benign. A Neon connection URI password is a different credential and never carries a napi_ key.",
          },
        ],
        openQuestions: [
          {
            id: "real-body-length",
            unresolved: "One issued key would settle whether the body is fixed or variable in length.",
            text: "What is the real body length of an issued key, and is it fixed?",
          },
          {
            id: "legacy-in-use",
            unresolved: "No source states whether unprefixed keys remain in use or what they look like.",
            text: "Do unprefixed legacy keys still exist in use?",
          },
          {
            id: "scoped-grammars",
            unresolved: "No source states whether personal, organization and project-scoped keys share one grammar.",
            text: "Do personal, organization and project-scoped keys share one grammar?",
          },
        ],
      },
    },
  ],
};
