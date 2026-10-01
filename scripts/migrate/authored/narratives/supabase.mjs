// Authored family narratives for the Supabase dossier (benchmarks/support/dossiers/supabase.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const KEYS = "https://supabase.com/docs/guides/api/api-keys";
const SELF_HOST = "https://supabase.com/docs/guides/self-hosting/self-hosted-auth-keys";
const CLI = "https://github.com/supabase/cli/blob/a09ff6cf59e89fae5c92458c7b838a09b9a9d777/apps/cli-go/pkg/config/apikeys.go";
const PAT = "https://supabase.com/docs/guides/platform/personal-access-tokens";

export default {
  provider: "supabase",
  dropped: [
    { part: "Candidate: legacy anon and service_role JWTs", reason: "not a family in the model; a short collision statement keeps what the dossier supports" },
    { part: "Candidate: sb_publishable_ keys", reason: "documented safe to expose; kept as a collision statement, not a family" },
    { part: "Open question 5 (a third-party hex-length claim not found again)", reason: "an unsupported claim about another source, not credential knowledge" },
    { part: "Open question 1 (whether the self-hosting page counts as provider evidence for hosted keys)", reason: "a ruling about the project's own evidence bar; the layout statement cites the page as documentation and states the page's scope" },
    { part: "Overview: plan to remove legacy JWT keys by end of 2026", reason: "recorded in the overview without a cited source and a provider roadmap statement that changes; not carried" },
    { part: "Research log and related issues", reason: "issue workflow" },
  ],
  families: [
    {
      id: "supabase:secret-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "layout",
            cls: "provider-documented",
            text: "A secret key is the prefix sb_secret_, a 22-character random part, an underscore, and an 8-character checksum: 31 characters after the prefix and 41 in total. The self-hosting page states this layout and says hosted keys use the same format as the platform.",
            cite: [SELF_HOST, KEYS],
            claims: ["provider-source", "field-prefix", "field-segment-layout"],
          },
          {
            id: "alphabet-and-checksum",
            cls: "provider-documented",
            text: "The segments use the base64url alphabet, so underscore and hyphen can appear inside them and only the underscore at body offset 22 is structural. The checksum is the first 8 base64url characters of a SHA-256 over the project reference, a bar, the prefix and the random part. These details come from Supabase's own scripts and command-line defaults, not from prose documentation, and the self-hosted gateway does not validate the checksum.",
            cite: [CLI],
            claims: ["field-body-alphabet", "field-checksum"],
          },
          {
            id: "not-a-jwt",
            unresolved: "Recorded in a research note as a statement of the API-keys page that the cited text of that page does not carry in this record.",
            text: "The secret is a short opaque string, not a JWT, and can be revealed again through the Management API.",
          },
          {
            id: "hosted-checksum",
            unresolved: "The checksum input of hosted keys was not observed; no source states it.",
            text: "Hosted keys may hash the real project reference, and the platform may validate the checksum.",
            leadClaims: ["field-hosted-checksum-input"],
          },
        ],
        issuance: [
          {
            id: "multiple-keys",
            unresolved: "Recorded in a research note without a cited source; no key was issued and the Management API field forms were not observed.",
            text: "Several secret keys may exist for one project, and the Management API reports each with a prefix and a hash field.",
          },
        ],
        lifecycle: [
          {
            id: "auto-revoke",
            unresolved: "Recorded in a research note as a provider statement, but no cited page in this record carries it.",
            text: "Secret keys pushed to public GitHub repositories are revoked automatically.",
          },
        ],
        collisions: [
          {
            id: "publishable-sibling",
            cls: "provider-documented",
            text: "Keys beginning sb_publishable_ are the documented public sibling and are described as safe to expose online.",
            cite: [KEYS],
            claims: ["field-prefix"],
          },
          {
            id: "legacy-jwts",
            unresolved: "Recorded in a research note without a cited source in this family's record.",
            text: "Legacy anon and service_role keys are JWTs beginning eyJ; hosted ones carry the issuer supabase and the command-line tool's local ones carry supabase-demo.",
          },
          {
            id: "cli-local-keys",
            unresolved: "Whether publicly known local-development sample keys count as secrets is an open policy question and no source decides it.",
            text: "The command-line tool prints structurally valid local-development keys in this layout that are publicly known.",
            leadClaims: ["field-cli-local-dev-constants"],
          },
        ],
        openQuestions: [
          {
            id: "hosted-checksum-input",
            unresolved: "No source states what hosted keys hash or whether the platform validates it.",
            text: "What input does the hosted checksum use, and is it validated server-side?",
          },
          {
            id: "alphabet-in-prose",
            unresolved: "The alphabet is visible only in provider code; no prose page was found stating it.",
            text: "Is the base64url alphabet stated in documentation prose anywhere?",
          },
          {
            id: "masked-forms",
            unresolved: "No key was issued and the Management API and dashboard forms were not observed.",
            text: "What do the Management API prefix and hash fields and the dashboard's masked display look like?",
          },
        ],
      },
    },
    {
      id: "supabase:personal-access-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "The provider page documents the sbp_ prefix by example and the difference between classic and scoped tokens. It states no body grammar.",
            cite: [PAT],
            claims: ["provider-source"],
          },
          {
            id: "body",
            unresolved: "Only a scanner rule states the body, and the claim that records that rule is itself unresolved; no provider source states the width or alphabet.",
            text: "The prefix sbp_ or sbp_v0_ is followed by exactly 40 lowercase letters and digits.",
            leadClaims: ["tool-corroboration"],
          },
        ],
        issuance: [
          {
            id: "not-attempted",
            unresolved: "Issuance was not attempted.",
            text: "How a personal access token is created and displayed is not recorded.",
          },
        ],
        collisions: [
          {
            id: "separate-class",
            unresolved: "Recorded in a research note as a rule that evidence for one Supabase credential class is not evidence for another; not a statement from a source.",
            text: "Management-API personal access tokens are a separate credential class from project API keys, and the two share no evidence.",
          },
        ],
        openQuestions: [
          {
            id: "body-width",
            unresolved: "No issued token was inspected and the provider page gives no body grammar.",
            text: "Is the body always 40 characters, under both sbp_ and sbp_v0_?",
          },
        ],
      },
    },
  ],
};
