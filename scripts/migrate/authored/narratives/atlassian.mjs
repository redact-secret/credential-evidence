// Authored family narratives for the Atlassian dossier (benchmarks/support/dossiers/atlassian.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const SUPPORT_API_TOKENS = "https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/";
const SUPPORT_ACCESS_TOKENS = "https://support.atlassian.com/bitbucket-cloud/docs/using-access-tokens/";
const FORUM_ANSWER = "https://community.atlassian.com/forums/Bitbucket-questions/Can-we-confirm-BitBucket-s-token-prefixes/qaq-p/3093481";
const FORUM_OPAQUE = "https://community.developer.atlassian.com/t/about-the-format-of-atlassian-security-tokens/62553";
const DATADOG = "https://github.com/DataDog/dd-sensitive-data-scanner/blob/4e53b6ac37ab4b6699f4331868a1c486f0d21147/sds/src/secondary_validation/atlassian_token_checksum.rs";
const CREDSWEEPER = "https://github.com/Samsung/CredSweeper/blob/f21ab2f2553eea288a72273b9658cd297ab1d11f/credsweeper/rules/config.yaml";
const TRUFFLEHOG_V2 = "https://github.com/trufflesecurity/trufflehog/blob/48b58d3bf3f02ba17bf23b87f095499bc80c6fd7/pkg/detectors/atlassian/v2/atlassian.go";
const TRUFFLEHOG_ADMIN_REPORT = "https://github.com/trufflesecurity/trufflehog/pull/3065";
const TRAJAN = "https://github.com/praetorian-inc/trajan/blob/8d8d43a52eacafb0c262f1c7927050966465b381/pkg/bitbucket/bitbucket.go";
const RESEARCH_NOTE = "https://github.com/redact-secret/redact-secret/blob/8b6a5fde52ecb4dfce13f09c7a947062d21483c7/docs/audits/evidence/643/README.md";

export default {
  provider: "atlassian",
  dropped: [
    { part: "Behaviour of the product's match span around the = and the 8-hex suffix (collision bullet and open question 3)", reason: "describes a scanner's span decision, not the credential" },
    { part: "Open question 1 (whether a forum answer counts as provider documentation) as a decision for the maintainers", reason: "an evidence-bar ruling; it is recorded here as the reason the prefix statement is unresolved" },
    { part: "Open question 4 (answered): atlassian:access-token is researched under its own family", reason: "answered and workflow-only; the remaining route question is carried as an open question of the access-token family" },
    { part: "Candidate: ATBB app passwords", reason: "no taxonomy family; carried as a collision of both families, with its provenance recorded as unresolved" },
    { part: "Candidate: organization admin API keys with the ATCTT3xFfGN0 header", reason: "covered by atlassian:access-token until a route-level split is shown to matter; the report is recorded there" },
    { part: "Statements on tool-by-tool rule coverage (which scanners have or lack an ATCT or ATAT rule) and tools that copy one scanner's regex", reason: "state of other scanners, not credential knowledge" },
  ],
  families: [
    {
      id: "atlassian:api-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "header-observed",
            cls: "tool-corroborated",
            text: "Current account API tokens begin ATAT and share a fixed 12-character header, ATATT3xFfGF0. A scanner's validator treats the same layout as carrying a checksum suffix.",
            cite: [DATADOG],
          },
          {
            id: "provider-states-prefix",
            unresolved: "The prefix rests on one answer by an account labelled Atlassian Team on a community forum (2025-08-25); whether a forum answer counts as provider documentation is an undecided maintainer ruling, and no Atlassian documentation page, API specification or changelog states the prefix.",
            text: "Atlassian states that account API tokens begin ATAT.",
            lead: [FORUM_ANSWER],
            leadClaims: ["field-prefix"],
          },
          {
            id: "total-length-and-suffix",
            unresolved: "The 192-character layout was confirmed on one freshly issued key and in a customer report of five keys, both recorded in a research note, which is below the number of observations required to assert it.",
            text: "A current token is 192 characters: the 12-character header, a 171-character body from letters, digits, underscore and hyphen, one literal =, then 8 uppercase hexadecimal characters.",
            lead: [RESEARCH_NOTE],
            leadClaims: ["field-minimum-length", "field-fixed-header", "field-total-length-and-suffix"],
          },
          {
            id: "crc32-suffix",
            cls: "tool-corroborated",
            text: "Two scanner implementations treat the final 8 hexadecimal characters as an uppercase CRC32 of everything before them, the = included. The check was not confirmed on a key issued for this research.",
            claims: ["field-checksum"],
          },
          {
            id: "length-called-varied",
            unresolved: "The statement comes from Atlassian's own support page, but that source is recorded with a scanner-rule role and cannot back a provider-documented statement until its type is reviewed.",
            text: "Atlassian's support page on managing API tokens states no lexical shape and calls the token length varied.",
            lead: [SUPPORT_API_TOKENS],
          },
          {
            id: "tokens-opaque-2022",
            unresolved: "A staff post on a developer forum is a discussion, not provider documentation, and it predates the 2023 format change.",
            text: "In 2022 an Atlassian staff member said that tokens are opaque and clients cannot depend on their format.",
            lead: [FORUM_OPAQUE],
          },
        ],
        issuance: [
          {
            id: "account-tokens",
            unresolved: "Recorded in the research overview without a cited source; the support page on managing API tokens is the provider's documentation but it was not read for this statement.",
            text: "Account API tokens are used with the account email through Basic authentication for Jira, Confluence and Bitbucket.",
            lead: [SUPPORT_API_TOKENS],
          },
          {
            id: "not-issued-for-checksum",
            unresolved: "One key was issued by a maintainer for the header check; a further freshly issued key would settle whether the CRC32 holds, and none has been issued.",
            text: "A checksum check against a freshly issued key has not been performed.",
          },
        ],
        lifecycle: [
          {
            id: "older-tokens-expired",
            unresolved: "The statement comes from Atlassian's own support page, but that source is recorded with a scanner-rule role and cannot back a provider-documented statement until its type is reviewed.",
            text: "Tokens created before the prefixed format were unprefixed, and the support page states that all older tokens expired by 2026-05-12.",
            lead: [SUPPORT_API_TOKENS],
          },
          {
            id: "unprefixed-24-characters",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Tokens created before 2023-01-18 were unprefixed and 24 characters long.",
          },
        ],
        collisions: [
          {
            id: "sibling-prefixes",
            unresolved: "The forum answer is not provider documentation, and the date app passwords stopped working has no cited source.",
            text: "ATBB (Bitbucket app passwords, which stopped working on 2026-06-09) and ATCT (Bitbucket access tokens) share the layout of this token.",
            lead: [FORUM_ANSWER],
          },
        ],
        openQuestions: [
          {
            id: "provider-prefix-statement",
            unresolved: "Whether a forum answer by an Atlassian-labelled account counts as provider documentation is undecided; length, alphabet, the = delimiter and the CRC32 suffix are empirical only.",
            text: "Does any provider-authored source state the ATAT prefix, length, alphabet and suffix of an account API token?",
          },
          {
            id: "crc32-on-real-keys",
            unresolved: "One freshly issued key would answer it; none has been issued.",
            text: "Is the trailing 8-character hexadecimal suffix a CRC32 on real keys?",
          },
        ],
      },
    },
    {
      id: "atlassian:access-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-header",
            cls: "tool-corroborated",
            text: "Access tokens begin ATCT and have the same 192-character layout as account API tokens: a fixed 12-character header (ATCTT3xFfGN0, differing from the API-token header in the fourth and fifth characters), a 171-character body from letters, digits, underscore and hyphen, one literal =, then 8 uppercase hexadecimal characters. One scanner's rule matches ATCTT3xFfG, a base64url-style body, = and 8 alphanumerics; a second scanner's rule matches the 12-character header, 80 to 800 body characters and the 8-hex tail.",
            cite: [TRUFFLEHOG_V2, CREDSWEEPER],
            claims: ["dossier-research"],
          },
          {
            id: "crc32-suffix",
            cls: "tool-corroborated",
            text: "The trailing 8 characters are a CRC32 of everything before them, the = included, in a scanner's filter and in a separate structure-only measurement of public code.",
            cite: [CREDSWEEPER],
          },
          {
            id: "public-code-measurement",
            unresolved: "A structure-only measurement of public code search results, recorded in a research note: 80 candidate values in 74 repositories, of which 73 were 192 characters, 79 carried the ATCTT3xFfGN0 header, 74 had the = at position 184 followed by 8 uppercase hex characters and 72 passed the CRC32 check. The values were not verified with Atlassian and some may be truncated or edited, so it is a lower-bound count that the cited source cannot reproduce.",
            text: "Public code contains values with this exact layout, with the CRC32 holding on nearly all of them.",
            lead: [RESEARCH_NOTE],
          },
          {
            id: "provider-states-prefix",
            unresolved: "The prefix rests on a forum answer by an account labelled Atlassian Team (2025-08-25) that names ATCT for workspace, project and repository access tokens; whether a forum answer counts as provider documentation is undecided. The asker's own observation of the header is not an Atlassian statement.",
            text: "Atlassian states that workspace, project and repository access tokens begin ATCT.",
            lead: [FORUM_ANSWER],
          },
          {
            id: "provider-pages-no-shape",
            cls: "provider-documented",
            text: "Atlassian's Bitbucket page on access tokens shows only {repository_access_token} and {workspace_access_token} placeholders and states no shape.",
            cite: [SUPPORT_ACCESS_TOKENS],
          },
          {
            id: "admin-keys-same-header",
            cls: "tool-corroborated",
            text: "A trufflehog contributor reported the same header and exactly 192 characters for organization admin API keys (2024-07-15), so the ATCT header spans more than Bitbucket access tokens. Service-account API keys were not checked.",
            cite: [TRUFFLEHOG_ADMIN_REPORT],
          },
        ],
        issuance: [
          {
            id: "auth-scheme",
            cls: "provider-documented",
            text: "An access token is sent as a Bearer token, or with x-token-auth as the Basic user name for git over HTTPS.",
            cite: [SUPPORT_ACCESS_TOKENS],
          },
          {
            id: "client-chooses-scheme-by-header",
            cls: "tool-corroborated",
            text: "A third-party Bitbucket client chooses Bearer for a value starting ATCTT3x and Basic with the account email for one starting ATATT3x.",
            cite: [TRAJAN],
          },
          {
            id: "not-issued",
            unresolved: "No token was issued for this research; a Bitbucket repository access token is free to mint and revoke and would settle the anchor-length question.",
            text: "No access token was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "layout-shared-with-api-token",
            cls: "tool-corroborated",
            text: "Access tokens share the layout of account API tokens (ATAT) and of the retired ATBB app passwords; the header differs, so a rule anchored on ATAT does not match them.",
            cite: [TRUFFLEHOG_V2, CREDSWEEPER],
            claims: ["dossier-research"],
          },
          {
            id: "data-center-tokens",
            cls: "tool-corroborated",
            text: "Bitbucket Data Center HTTP access tokens (prefix BBDC-) and Jira and Confluence Data Center personal access tokens are different credentials, not this family.",
            cite: [CREDSWEEPER],
          },
        ],
        openQuestions: [
          {
            id: "anchor-length",
            unresolved: "Staff say ATCT, tools use 10 or 12 characters and every observed value shares 12; no issued token has settled it.",
            text: "How many leading characters are fixed for an access token: the 4-character prefix, 10 or 12?",
          },
          {
            id: "routes-share-header",
            unresolved: "A token minted through each route (repository, project, workspace, admin key, service account) would show whether all routes share one header; only the repository route is partly evidenced.",
            text: "Do repository, project, workspace, organization admin and service-account routes all share the ATCTT3xFfGN0 header?",
          },
        ],
      },
    },
  ],
};
