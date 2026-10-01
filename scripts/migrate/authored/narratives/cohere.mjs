// Authored family narratives for the Cohere dossier (benchmarks/support/dossiers/cohere.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const RATE_LIMITS = "https://docs.cohere.com/docs/rate-limits";
const GITLEAKS_TOML = "https://github.com/gitleaks/gitleaks/blob/83d9cd684c87d95d656c1458ef04895a7f1cbd8e/config/gitleaks.toml";
const BLOG = "https://getbifrost.ai/guides/api-keys/how-to-get-a-cohere-api-key";

export default {
  provider: "cohere",
  dropped: [
    { part: "Naming note: the research name cohere:production-api-key maps to cohere:api-key", reason: "a research-naming and issue-history note; the substance (one family covers trial and production keys) is carried as a statement" },
    { part: "Candidate: co- prefixed keys", reason: "not a family; carried as an unresolved statement" },
    { part: "Open question 2 (an inconclusive probe of one scanner and unchecked scanners)", reason: "state of other scanners, not credential knowledge" },
    { part: "Open question 3 (verdict history and how the maintainer treats the keyword-gated rows)", reason: "verdict and workflow history, not credential knowledge" },
    { part: "Open question 4 (Reddit and Stack Overflow not searched) and the Java builder and masked-value recognition notes", reason: "research workflow and matching policy, not credential knowledge" },
    { part: "Statements that GitGuardian lists the key as not prefixed and that GitHub secret scanning has an unpublished Cohere pattern", reason: "state of other scanners, not credential knowledge" },
  ],
  families: [
    {
      id: "cohere:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "forty-alphanumerics",
            unresolved: "One scanner rule (a keyword followed by 40 letters and digits) is the only length source and the length is its author's inference; no provider source states any shape, and the provider's SDK performs no validation.",
            text: "A key has no documented prefix and is 40 mixed-case letters and digits.",
            lead: [GITLEAKS_TOML],
            leadClaims: ["field-shape", "tool-corroboration"],
          },
          {
            id: "co-prefix-claim",
            unresolved: "A vendor blog is the only source, with no example and no second source, and it contradicts the scanner rules; it was not adopted.",
            text: "Keys begin with co-.",
            lead: [BLOG],
            leadClaims: ["field-co-prefix"],
          },
        ],
        issuance: [
          {
            id: "dashboard-and-entitlements",
            cls: "provider-documented",
            text: "Cohere issues API keys from its dashboard in two entitlements: a free evaluation (trial) key and a paid production key. The two differ by entitlement, not by shape, so one family covers both.",
            claims: ["field-trial-vs-production"],
            cite: [RATE_LIMITS],
          },
          {
            id: "transport",
            cls: "provider-documented",
            text: "The SDK reads the key from CO_API_KEY (documented) and also accepts COHERE_API_KEY; it is sent as an Authorization: Bearer header.",
            claims: ["field-transport"],
          },
          {
            id: "dashboard-details",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Keys are created on the dashboard's API keys page, key names cannot contain spaces, a key is shown once, and it can be revoked in the web UI or the CLI.",
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for this research; a comparison of one trial and one production key was proposed but not performed.",
            text: "No Cohere key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "public-ids",
            cls: "provider-documented",
            text: "The organization_id (org_ followed by an identifier) and owner_id (user_ followed by an identifier) in the check-api-key response are public identifiers, not keys.",
            claims: ["field-public-ids"],
          },
          {
            id: "unprefixed-look-alikes",
            unresolved: "Recorded in a research note without a cited source in this family's contract; a bare 40-character run is not distinctive because the key has no prefix.",
            text: "SHA-1-length hexadecimal digests, random identifiers and unrelated co- strings have a similar shape.",
            leadClaims: ["field-context"],
          },
        ],
        openQuestions: [
          {
            id: "exact-length",
            unresolved: "No provider source states a length; two issued keys, one trial and one production, would answer both parts.",
            text: "Is the key length always 40, and is there any trial versus production difference in shape?",
          },
        ],
      },
    },
  ],
};
