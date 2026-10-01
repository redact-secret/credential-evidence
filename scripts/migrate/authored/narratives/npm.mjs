// Authored family narratives for the npm dossier (benchmarks/support/dossiers/npm.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const CHANGELOG_2021 = "https://github.blog/changelog/2021-09-23-npm-has-a-new-access-token-format/";
const BLOG_2021 = "https://github.blog/security/announcing-npms-new-access-token-format/";
const CHANGELOG_CREATION_OFF = "https://github.blog/changelog/2025-11-05-npm-security-update-classic-token-creation-disabled-and-granular-token-changes/";
const CHANGELOG_REVOKED = "https://github.blog/changelog/2025-12-09-npm-classic-tokens-revoked-session-based-auth-and-cli-token-management-now-available/";
const NPM_DOCS = "https://docs.npmjs.com/about-access-tokens";
const DETECT_SECRETS = "https://github.com/Yelp/detect-secrets/blob/5e141933554a0b74e7341841f318be21e895339c/detect_secrets/plugins/npm.py";
const TRUFFLEHOG_NPM = "https://github.com/trufflesecurity/trufflehog/blob/48b58d3bf3f02ba17bf23b87f095499bc80c6fd7/pkg/detectors/npmtoken/npmtoken.go";
const GITLEAKS_NPM = "https://github.com/gitleaks/gitleaks/blob/b58d3f102cf3a2c84cb7f923d05c25c9b1aed84b/cmd/generate/config/rules/npm.go";
const GITGUARDIAN = "https://docs.gitguardian.com/secrets-detection/secrets-detection-engine/detectors/specifics/npm_token";

export default {
  provider: "npm",
  dropped: [
    { part: "Candidates not yet families", reason: "none were recorded in the legacy research" },
    { part: "Correction of an earlier reading that the changelog mentions the UUID format only as a predecessor", reason: "research history, not credential knowledge; the corrected fact is carried as a statement" },
    { part: "Open question 2 (which peer rules cover the UUID form)", reason: "a question about scanner coverage; the coverage that was observed is carried as a statement" },
  ],
  families: [
    {
      id: "npm:granular-access-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-checksum",
            cls: "provider-documented",
            text: "Tokens in the format introduced in September 2021 begin npm_, use an underscore as the delimiter and end in a six-character Base62 CRC32 checksum, as the GitHub changelog of 2021-09-23 documents.",
            claims: ["provider-source"],
          },
          {
            id: "body",
            cls: "tool-corroborated",
            text: "The body is 36 characters, according to two scanner rules that agree. The checksum is not part of the lexical pattern.",
            claims: ["tool-corroboration"],
          },
        ],
      },
    },
    {
      id: "npm:legacy-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "uuid-pattern",
            cls: "provider-documented",
            text: "Before the 2021 change npm tokens were created as a UUID pattern of 36 characters (8-4-4-4-12 hexadecimal groups with hyphens, no prefix), and the new tokens change the delimiter away from a hyphen. npm calls the older form legacy in the 2021 announcements and classic from 2025.",
            cite: [CHANGELOG_2021, BLOG_2021],
          },
          {
            id: "version-and-case",
            unresolved: "npm does not state the UUID version (version 4 is likely and unconfirmed); the case is tool-stated, with one scanner lowercase-only and another accepting either.",
            text: "The legacy token is a version 4 UUID in lowercase.",
            lead: [TRUFFLEHOG_NPM, DETECT_SECRETS],
          },
        ],
        issuance: [
          {
            id: "cannot-issue-now",
            cls: "provider-documented",
            text: "New classic tokens could not be created after 2025-11-05, and npm's documentation now says legacy tokens have been removed. No live legacy token can be issued or verified, so only values from leaked history remain.",
            cite: [CHANGELOG_CREATION_OFF, NPM_DOCS],
          },
        ],
        lifecycle: [
          {
            id: "revocation",
            cls: "provider-documented",
            text: "npm revoked all remaining classic tokens on 2025-12-09, after moving the date from 2025-11-19.",
            cite: [CHANGELOG_REVOKED],
          },
        ],
        collisions: [
          {
            id: "scanner-contexts",
            cls: "tool-corroborated",
            text: "One scanner matches an _authToken value of 36 hexadecimal-and-hyphen characters (or an npm_ value) in .npmrc form; another matches a lowercase UUID after the keyword npm and verifies it against the registry's whoami endpoint; a third-party scanner catalogue page lists a plain and a prefixed npm token format. A further scanner rule and GitHub secret scanning cover only the npm_ form, so the UUID form is absent from both.",
            cite: [DETECT_SECRETS, TRUFFLEHOG_NPM, GITGUARDIAN, GITLEAKS_NPM],
          },
          {
            id: "every-other-uuid",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "The pattern is identical to every other UUID (request ids, package integrity strings, database keys), so a bare UUID is not a supportable match; context such as an _authToken assignment or an npm keyword nearby is what identifies it.",
          },
        ],
        openQuestions: [
          {
            id: "uuid-version",
            unresolved: "Only a decoded historical token would settle which UUID version npm minted, and none can be issued now.",
            text: "Which UUID version did npm mint?",
          },
        ],
      },
    },
  ],
};
