// Authored family narratives for the GitLab dossier (benchmarks/support/dossiers/gitlab.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const TOKENS = "https://docs.gitlab.com/security/tokens/";
const RUNNER_DOC = "https://docs.gitlab.com/ci/runners/new_creation_workflow/";
const MR_169322 = "https://gitlab.com/gitlab-org/gitlab/-/merge_requests/169322";
const WORK_ITEM = "https://gitlab.com/gitlab-org/gitlab/-/work_items/623418";
const HANDBOOK = "https://handbook.gitlab.com/handbook/engineering/architecture/design-documents/cells/routable_tokens/";
const RULES = "https://gitlab.com/gitlab-org/security-products/secret-detection/secret-detection-rules/-/blob/e1c7e83815a7e55cc1514dd59d4e56459e39cbfb/rules/mit/gitlab/gitlab.toml";
const GITLEAKS_RULE = "https://github.com/gitleaks/gitleaks/blob/b58d3f102cf3a2c84cb7f923d05c25c9b1aed84b/cmd/generate/config/rules/gitlab.go";
const TRUFFLEHOG_V3 = "https://github.com/trufflesecurity/trufflehog/blob/48b58d3bf3f02ba17bf23b87f095499bc80c6fd7/pkg/detectors/gitlab/v3/gitlab_v3.go";
const TRUFFLEHOG_ISSUE = "https://github.com/trufflesecurity/trufflehog/issues/4551";
const SEMGREP_ISSUE = "https://github.com/semgrep/semgrep-network-broker/issues/189";
const GITLEAKS_ISSUE = "https://github.com/gitleaks/gitleaks/issues/1655";

export default {
  provider: "gitlab",
  dropped: [
    { part: "Candidates: runner registration token, glrtr- runner tokens, other gl prefixes", reason: "candidates that are not families yet; the registration token and other prefixes appear only as collisions" },
    { part: "Routable PAT contradiction (3): the design document omits the version segment the code emits", reason: "a settled disagreement between a proposal document and provider code; the contract claim on grammar already carries the version segment" },
    { part: "Verdict, tier, research-date lines and the administrator-customized prefix support policy", reason: "support and research status, not credential knowledge" },
  ],
  families: [
    {
      id: "gitlab:legacy-personal-access-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "GitLab's token overview documents the glpat- prefix for personal access tokens. The same prefix also covers impersonation tokens and project and group access tokens.",
            cite: [TOKENS],
            claims: ["provider-source"],
          },
          {
            id: "body-20",
            cls: "tool-corroborated",
            text: "The legacy body is 20 characters of letters, digits, underscore and hyphen after the prefix. This comes from two scanner rules that agree with each other; GitLab's token overview does not state the body.",
            claims: ["tool-corroboration"],
          },
        ],
        collisions: [
          {
            id: "routable-form-separate",
            cls: "provider-documented",
            text: "The token overview does not cover routable personal access tokens, which share the glpat- prefix but carry a longer payload and a checksum. They form a separate family.",
            claims: ["provider-source"],
          },
        ],
        openQuestions: [
          {
            id: "admin-configured-prefix",
            unresolved: "Recorded in a research note as an administrator-configurable prefix without a source in this family's contract; no shape is known.",
            text: "What do personal access tokens look like on an instance where an administrator has changed the prefix?",
          },
        ],
      },
    },
    {
      id: "gitlab:routable-personal-access-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "grammar",
            cls: "provider-documented",
            text: "The prefix is glpat-, then an unpadded base64url payload, a dot, a 2-character base36 version, a dot, a 2-character base36 payload length, and a 7-character base36 CRC32. GitLab's rules bound the payload at 27 to 300 characters.",
            cite: [RULES],
            claims: ["field-grammar", "field-prefix", "field-payload", "field-separators"],
          },
          {
            id: "payload-content",
            cls: "provider-documented",
            text: "The payload is 16 random bytes followed by a routing payload of newline-separated key:value pairs and a trailing length byte. The routing keys are limited to c, g, o, p, u and t, with at least one of c or o, and the routing payload is capped at 159 bytes. Personal access tokens declare the o (organization) and u (user) keys.",
            cite: ["https://gitlab.com/gitlab-org/gitlab/-/blob/87cb885dccf8cfa81ee5aa734b7f2e796413e221/lib/authn/token_field/generator/routable_token.rb", "https://gitlab.com/gitlab-org/gitlab/-/blob/87cb885dccf8cfa81ee5aa734b7f2e796413e221/app/models/personal_access_token.rb"],
            claims: ["field-payload"],
          },
          {
            id: "version-and-length",
            cls: "provider-documented",
            text: "The version is currently 1, written 01. The length holder is the payload length in two base36 characters.",
            claims: ["field-version", "field-length-holder"],
          },
          {
            id: "checksum",
            cls: "provider-documented",
            text: "The checksum is the base36 zlib CRC32 of every byte from the start of the prefix through the length holder, zero-padded to 7 characters. GitLab's decoder verifies it, so a token can be checked offline.",
            claims: ["field-checksum"],
          },
          {
            id: "excluded-forms",
            cls: "provider-documented",
            text: "The 20-character legacy glpat- form, the unversioned routable form, instance or custom prefixes, and glrt- tokens are not this family.",
            claims: ["field-excluded-forms"],
          },
          {
            id: "overall-length-in-change-request",
            unresolved: "The change request is an issue-tracker entry typed as other, and its overall length of 43 to 316 characters differs from the 46 to 319 bytes derived from the code.",
            text: "The merge request that introduced the format, opened 2024-10-15 behind the routable_pat flag, gives 43 to 316 characters overall.",
            lead: [MR_169322],
          },
        ],
        issuance: [
          {
            id: "rollout",
            unresolved: "A GitLab work item states this but is an issue-tracker entry and not documentation; the fetch of it carried no date.",
            text: "Routable personal access tokens began in GitLab 18.0 and became unconditional in 18.3, and the versioned form is the default from 18.3.",
            lead: [WORK_ITEM],
          },
          {
            id: "not-issued",
            unresolved: "No token was issued or observed for this record; the checksum can be checked offline from the published code alone.",
            text: "No routable personal access token was issued or observed.",
          },
        ],
        collisions: [
          {
            id: "readable-routing",
            cls: "provider-documented",
            text: "The routing payload decodes to readable text, so a decoded token shows its routing keys in the clear.",
            claims: ["field-payload"],
          },
          {
            id: "other-gl-prefixes",
            cls: "provider-documented",
            text: "GitLab's token overview lists other prefixes beginning gl, each for a different token type, and the 20-character legacy glpat- form is a different family.",
            cite: [TOKENS],
            claims: ["field-excluded-forms"],
          },
          {
            id: "peer-lag-and-overreach",
            cls: "tool-corroborated",
            text: "One scanner rule reads only the unversioned single-dot form and so misses the versioned default. Another scanner's rule accepts both dots but also allows an equals sign in the payload and checks neither the length holder nor the checksum. GitLab's own rules do not allow the equals sign, and the generator emits unpadded base64url.",
            cite: [GITLEAKS_RULE, TRUFFLEHOG_V3, TRUFFLEHOG_ISSUE],
            claims: ["field-peer-lag"],
          },
          {
            id: "hard-coded-version",
            unresolved: "A scanner vendor's issue reports this drift; it is an issue-tracker report and not a provider document.",
            text: "A hard-coded .01. version segment and tokens over 54 characters were reported as drift from the format, so neither the version value nor the version segment's existence should be assumed.",
            lead: [SEMGREP_ISSUE, GITLEAKS_ISSUE],
          },
        ],
        openQuestions: [
          {
            id: "unversioned-ever-issued",
            unresolved: "No source shows the unversioned single-dot form outside pre-release; only the versioned form is confirmed as the 18.3 default.",
            text: "Was the unversioned single-dot routable form ever issued in production?",
          },
          {
            id: "which-instances-mint",
            unresolved: "A research note says self-managed instances below 18.0 keep the 20-character form, without a source.",
            text: "Which instances mint routable personal access tokens?",
          },
          {
            id: "design-doc-status",
            unresolved: "The design document in GitLab's handbook is still marked proposed and was not re-read in full, so it corroborates nothing on its own.",
            text: "Does the routable tokens design document match what the code emits?",
            lead: [HANDBOOK],
          },
        ],
      },
    },
    {
      id: "gitlab:runner-authentication-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "Runner authentication tokens begin glrt-, or glrtr- when created through a registration token. GitLab's token overview and its runner creation workflow page document both prefixes.",
            cite: [TOKENS, RUNNER_DOC],
            claims: ["field-prefix"],
          },
          {
            id: "legacy-body",
            cls: "provider-documented",
            text: "The legacy body is 20 characters of a URL-safe alphabet from GitLab's friendly-token routine: letters, digits, underscore and hyphen, with l, I, O and 0 replaced. This comes from GitLab server code, not documentation.",
            claims: ["field-legacy-body"],
          },
          {
            id: "partition-segment",
            cls: "provider-documented",
            text: "An optional t, a hexadecimal partition number and an underscore (runner types 1 to 3) may sit between the prefix and the 20-character body. GitLab's runner model strips it as a legacy form, and a forum post from March 2025 shows one.",
            claims: ["field-legacy-partition-segment"],
          },
          {
            id: "routable-body",
            cls: "provider-documented",
            text: "From GitLab 18.0 the body is routable: a base64url payload of 27 to 300 characters, a dot, a 2-character base36 version, a dot, a 2-character base36 payload length, and a 7-character base36 CRC32 of everything before it. The payload is 16 random bytes, sorted key:value routing lines and a trailing length byte.",
            claims: ["field-routable-grammar", "field-routable-checksum", "field-routable-version"],
          },
        ],
        issuance: [
          {
            id: "creation",
            cls: "provider-documented",
            text: "A runner authentication token is returned when a runner is created, through the runner creation workflow in the web interface or the user runners API endpoint.",
            cite: [RUNNER_DOC],
          },
          {
            id: "not-issued",
            unresolved: "No token was issued or observed for this record, and a registration-token creation was not attempted.",
            text: "No runner authentication token, and no glrtr- token, was issued or observed.",
          },
        ],
        lifecycle: [
          {
            id: "routable-since-18",
            cls: "provider-documented",
            text: "Routable runner tokens appear from GitLab 18.0; earlier tokens use the 20-character body.",
            claims: ["field-routable-version"],
          },
          {
            id: "registration-tokens",
            unresolved: "Recorded in a research note without a source in this family's contract.",
            text: "Registration tokens, the fixed prefix GR1348941 followed by 20 characters, are a separate and deprecated class that registers runners rather than authenticating as one, and registration tokens before 2022 were unprefixed.",
          },
        ],
        collisions: [
          {
            id: "other-gl-prefixes",
            cls: "provider-documented",
            text: "Other gl prefixes in GitLab's token overview, such as glpat-, gldt- and glcbt-, are real GitLab secrets and not clean negatives for this family.",
            cite: [TOKENS],
          },
          {
            id: "glrtr-superstring",
            cls: "provider-documented",
            text: "The glrtr- prefix starts with the letters glrt but not with glrt-, so a rule written for glrt- does not match it.",
            claims: ["field-prefix"],
          },
          {
            id: "public-ids",
            unresolved: "Recorded in a research note without a source in this family's contract.",
            text: "Runner ids and system ids made of s_ plus 12 hexadecimal characters are public identifiers and not secrets.",
          },
          {
            id: "instance-prefixed",
            unresolved: "The shape of instance-prefixed tokens is unverified without a self-managed observation; a research note says they sit behind a feature flag and are documented as not production ready.",
            text: "Instance-prefixed tokens, written as an instance prefix, a hyphen and then glrt-, exist behind a feature flag.",
            leadClaims: ["field-glrtr-instance-prefix-unversioned-routable-form"],
          },
        ],
        openQuestions: [
          {
            id: "partition-before-routable",
            unresolved: "No observed token combines the partition segment with a routable payload.",
            text: "Does a t, hexadecimal and underscore segment ever precede a routable payload?",
          },
          {
            id: "glrtr-routable",
            unresolved: "A token created through a registration token is needed; the shape is presumed to be the routable form with the glrtr- prefix and is not verified.",
            text: "Is glrtr- routable?",
            leadClaims: ["field-glrtr-instance-prefix-unversioned-routable-form"],
          },
          {
            id: "unversioned-routable-runner",
            unresolved: "No self-managed observation exists.",
            text: "Was the unversioned single-dot routable form ever issued for runners?",
            leadClaims: ["field-glrtr-instance-prefix-unversioned-routable-form"],
          },
          {
            id: "partition-window",
            unresolved: "Only one forum sighting dated March 2025 is known; no source gives the window.",
            text: "In which versions was the partition-prefixed shape minted?",
          },
        ],
      },
    },
  ],
};
