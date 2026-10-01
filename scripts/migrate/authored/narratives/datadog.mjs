// Authored family narratives for the Datadog dossier (benchmarks/support/dossiers/datadog.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const SPEC_V1 = "https://docs.datadoghq.com/resources/json/full_spec_v1.json";
const PAT_PAGE = "https://docs.datadoghq.com/account_management/personal-access-tokens/";
const SAT_PAGE = "https://docs.datadoghq.com/account_management/service-access-tokens/";
const KEYS_GO = "https://github.com/DataDog/datadog-agent/blob/f0012103d472748fae9f09011b4ebe124c3da98c/pkg/privateactionrunner/util/keys.go";
const CFN_TEMPLATE = "https://github.com/DataDog/cloudformation-template/blob/db39dcd1de0019f0bc5b03420a66750c69ef3038/aws_quickstart/datadog_agentless_saas.yaml";

export default {
  provider: "datadog",
  dropped: [
    { part: "Candidate: `ddpat_` personal access tokens and `ddsat_` service access tokens", reason: "documented with a secret-plus-checksum grammar but not yet a family; they appear here only as collisions of the application key" },
    { part: "Open question 3 (release notes are login-gated and unread)", reason: "a limit of the research pass, not credential knowledge" },
    { part: "Open question 4 (an issue body that should point at the evidence record)", reason: "issue workflow" },
    { part: "Open question 1 and 2 (body of `ddapp_` keys; uppercase in legacy keys)", reason: "carried as unresolved statements in the respective families" },
  ],
  families: [
    {
      id: "datadog:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "length-32",
            cls: "provider-documented",
            text: "An API key is exactly 32 characters with no prefix, no delimiter and no checksum. Datadog's v1 API specification gives the key field a minimum and a maximum length of 32; the v2 schema states no length.",
            cite: [SPEC_V1],
            claims: ["provider-source"],
          },
          {
            id: "alphabet",
            unresolved: "The alphabet is corroborated only by scanner rules and by Datadog's own validators, which disagree on whether uppercase A to F is admitted; no provider page states it.",
            text: "The key is lowercase hexadecimal in every observed value.",
            leadClaims: ["tool-corroboration"],
          },
        ],
        issuance: [
          {
            id: "markers",
            cls: "provider-documented",
            text: "The key authenticates API calls through the apiKeyAuth scheme, which the specification names with the DD-API-KEY header and the DD_API_KEY variable.",
            cite: [SPEC_V1],
            claims: ["provider-source"],
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for this research; one fresh key was to be checked for length, any uppercase and any fixed leading text.",
            text: "No API key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "bare-hex",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "A bare 32-character hexadecimal run is common (MD5 digests, UUIDs without dashes), so the value needs a marker such as the header or variable name to be read as an API key.",
          },
        ],
      },
    },
    {
      id: "datadog:application-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "A current-generation application key begins ddapp_. The comparison table of access-token types on the personal and service access token pages lists ddapp_ (new) as the identifiable prefix of application keys.",
            cite: [PAT_PAGE, SAT_PAGE],
            claims: ["provider-source", "field-prefix"],
          },
          {
            id: "body",
            cls: "provider-documented",
            text: "The body is 34 letters and digits after the prefix, 40 characters in all. Every Datadog-owned validator (the Agent's key check, the CloudFormation and ARM templates) agrees on 34; no documentation page states the length.",
            claims: ["field-body-length", "field-body-alphabet"],
          },
          {
            id: "scrubber-underscore",
            unresolved: "Only the Agent's log scrubber admits an underscore in the body, and it is read as lenient by design; no provider statement settles the alphabet.",
            text: "The body of an application key may contain an underscore.",
          },
          {
            id: "no-checksum",
            cls: "provider-documented",
            text: "The documented CRC-32 checksum grammar applies to ddpat_ personal access tokens only, not to application keys.",
            cite: [PAT_PAGE],
          },
          {
            id: "scanner-rules",
            cls: "tool-corroborated",
            text: "Rules and validators in the Datadog Agent, the Datadog CloudFormation and agentless-scanner templates, an AWS Secrets Manager partner page and two scanners are consistent with the ddapp_ plus 34 characters grammar.",
            claims: ["tool-corroboration"],
          },
        ],
        issuance: [
          {
            id: "not-issued",
            unresolved: "No key was issued for this research; a fresh key would settle the body length and alphabet.",
            text: "No ddapp_ key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "access-tokens-in-key-slot",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "ddpat_ personal access tokens and ddsat_ service access tokens can be sent where an application key is expected, so a value under an application-key name may not begin ddapp_.",
          },
          {
            id: "legacy-generation",
            unresolved: "The legacy generation is held in a separate contract whose claims are scanner-corroborated; this family records only the boundary.",
            text: "An earlier generation of application keys is a bare 40-character lowercase hexadecimal value with no prefix; it is a separate family.",
            leadClaims: ["field-legacy-40-hex-generation"],
          },
        ],
        openQuestions: [
          {
            id: "body-grammar",
            unresolved: "No documentation page states it; a fresh key would settle it.",
            text: "What are the exact body length and alphabet of a ddapp_ key issued today?",
          },
        ],
      },
    },
    {
      id: "datadog:application-key-legacy",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "forty-hex",
            cls: "provider-documented",
            text: "A legacy application key is 40 lowercase hexadecimal characters with no prefix. Datadog's v1 API specification gives the application-key hash a length of 40; this is the only provider-domain statement and it states the length only.",
            cite: [SPEC_V1],
          },
          {
            id: "provider-code",
            cls: "tool-corroborated",
            text: "Datadog-owned code (the Agent's key check, a CloudFormation template and an ARM script) accepts either 40 lowercase hexadecimal characters or the ddapp_ form, and the CloudFormation changelog names the first the legacy 40-character hex format. Two scanner rules match the same shape.",
            cite: [KEYS_GO, CFN_TEMPLATE],
            claims: ["tool-corroboration"],
          },
          {
            id: "uppercase",
            unresolved: "The Agent's log scrubber alone also accepts uppercase, while other Datadog validators do not; no provider source settles it.",
            text: "A legacy key may contain uppercase hexadecimal characters.",
          },
        ],
        lifecycle: [
          {
            id: "legacy-status",
            unresolved: "Recorded in a research note without a cited source in this family's contract; release notes that might date it were login-gated and not read.",
            text: "Datadog describes application keys as legacy features after the third quarter of 2026.",
          },
        ],
        collisions: [
          {
            id: "sha1-shape",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "SHA-1 digests and Git commit ids have the same shape, so a bare 40-character hexadecimal value cannot be attributed to Datadog; it is claimed only beside an application-key or Datadog marker on the same line.",
          },
        ],
        openQuestions: [
          {
            id: "uppercase-question",
            unresolved: "Datadog's own validators disagree and no issued key was measured.",
            text: "Does uppercase hexadecimal ever appear in a legacy key?",
          },
        ],
      },
    },
  ],
};
