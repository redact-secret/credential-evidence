// Authored family narratives for the Slack dossier (benchmarks/support/dossiers/slack.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const TOKENS = "https://docs.slack.dev/authentication/tokens";
const LENGTHENING = "https://docs.slack.dev/changelog/2016/08/23/token-lengthening";
const ROTATION = "https://docs.slack.dev/authentication/using-token-rotation/";
const SOCKET = "https://docs.slack.dev/apis/events-api/using-socket-mode";
const JAVA = "https://github.com/slackapi/java-slack-sdk/blob/49b62a6b866bf43eb4c3bfe9c8423a65400d2928/docs/english/guides/socket-mode.md#L180";
const SLACK_CLI = "https://github.com/slackapi/slack-cli/blob/20dd73092a65d3797180f95f0ee765053d7ef634/internal/goutils/strings_test.go#L198-L202";

export default {
  provider: "slack",
  dropped: [
    { part: "Candidate: rotating xoxe.xoxp- and xoxe- tokens and their refresh tokens", reason: "not yet a family; the rotation page is cited in the user-token family where the prefix collides" },
    { part: "Candidate: xoxc- browser session token and xoxd- cookie", reason: "found only through scanner rules and community posts; not a family" },
    { part: "Candidate: service and configuration tokens named on the tokens page without a prefix", reason: "no prefix and no grammar; not a family" },
    { part: "Bot-token 18-character secret floor and the frozen-grammar decision", reason: "a product matching policy, not credential knowledge" },
    { part: "Pending ruling on whether four-section placeholders count as corroboration, and the fixture counts around it", reason: "a maintainer ruling about the project's own evidence bar and generated artifacts" },
    { part: "Correction that two scanner rules do not agree on 1/11/13/64 widths", reason: "a settled disagreement about scanner behaviour, not credential knowledge" },
    { part: "Open question 4 (rotating variants as supported variants in a product)", reason: "answered by a product decision; whether a family should exist is a taxonomy question" },
    { part: "Wording on tier, verdict and a pending shape for xwfp-", reason: "evidence-tier and support bookkeeping" },
    { part: "Research log", reason: "issue workflow" },
  ],
  families: [
    {
      id: "slack:bot-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-sections",
            cls: "provider-documented",
            text: "A bot token begins xoxb- and is divided into dash-separated sections, with the secret as the last section. Slack's tokens page lists the prefix and the structure and gives no section widths or alphabet.",
            cite: [TOKENS],
            claims: ["provider-source"],
          },
          {
            id: "widths",
            cls: "tool-corroborated",
            text: "Scanner rules read two numeric sections of 10 to 13 digits each, followed by an alphanumeric secret. These widths are agreement among tools, not a Slack statement.",
            claims: ["tool-corroboration"],
          },
        ],
        issuance: [
          {
            id: "not-attempted",
            unresolved: "No bot token was issued for the research, so no real token was measured.",
            text: "How a bot token is issued and what widths a real one has is not recorded.",
          },
        ],
        openQuestions: [
          {
            id: "secret-width",
            unresolved: "No source states the secret width or alphabet and no issued token was inspected.",
            text: "What are the real widths of the numeric sections and of the secret?",
          },
        ],
      },
    },
    {
      id: "slack:user-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-sections",
            cls: "provider-documented",
            text: "A user token begins xoxp- followed by three numeric sections and then the secret section, dash-separated with the secret last. Slack's example uses three-digit placeholder sections, so the widths are not stated.",
            cite: [TOKENS],
            claims: ["provider-source", "field-prefix", "field-section-structure", "field-numeric-section-count"],
          },
          {
            id: "legacy-short-secrets",
            cls: "provider-documented",
            text: "Secrets issued before August 2016 can be 6 or 10 characters instead of 32. Slack's 2016 note on token lengthening tells integrators to expect tokens up to 255 characters and not to rely on any meaning in the string.",
            cite: [TOKENS, LENGTHENING],
            claims: ["field-secret-width-and-alphabet"],
          },
          {
            id: "widths-and-alphabet",
            unresolved: "Scanner rules disagree and no Slack source states the numeric widths or the secret alphabet: rules read 10 to 13 digits per section, 12 digits, or leave the tail open, and the secret as 32 lowercase hex, alphanumeric, or alphanumeric with hyphen.",
            text: "Real user tokens use 10 to 13 digit numeric sections and a 32 character lowercase hexadecimal secret.",
            leadClaims: ["field-numeric-section-widths"],
          },
        ],
        issuance: [
          {
            id: "kinds",
            unresolved: "Recorded in a research note without a cited page; none of the kinds was issued for the research.",
            text: "A user token comes from an OAuth v2 user grant, from the legacy tester token (no longer issued), and possibly from a service token.",
            leadClaims: ["field-service-token"],
          },
        ],
        lifecycle: [
          {
            id: "rotation",
            cls: "provider-documented",
            text: "Slack's token-rotation feature issues short-lived tokens that are renewed with a refresh token; a rotating user token has a different prefix from the plain xoxp- token.",
            cite: [ROTATION],
          },
          {
            id: "revocation",
            unresolved: "Recorded in a research note without a cited page for the revocation method.",
            text: "A user token can be revoked through the auth.revoke method.",
          },
        ],
        collisions: [
          {
            id: "rotating-xoxe-xoxp",
            cls: "provider-documented",
            text: "Rotating user tokens and app configuration tokens begin xoxe.xoxp-, which contains xoxp- but is a different credential and must not be read as a plain user token.",
            cite: [ROTATION],
          },
          {
            id: "sibling-prefixes",
            unresolved: "Recorded in a research note from scanner rules and a command-line example without a provider source: xoxc- (browser session token, same skeleton, 64 hex secret in one rule), xoxb-, xoxe-, and the xoxp-1- service-token example.",
            text: "Other Slack prefixes share the sectioned skeleton but are distinct credentials; team, user and enterprise ids inside a token are public.",
            leadClaims: ["field-service-token"],
          },
        ],
        openQuestions: [
          {
            id: "real-widths",
            unresolved: "No issued xoxp- token was inspected and tool evidence conflicts.",
            text: "What are the real widths of the three numeric sections and of the secret, and is the secret hex-only or alphanumeric?",
          },
        ],
      },
    },
    {
      id: "slack:app-level-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-role",
            cls: "provider-documented",
            text: "An app-level token begins xapp-. Slack's tokens page and its Socket Mode page state the prefix, and the Socket Mode page shows it as a Bearer credential.",
            cite: [TOKENS, SOCKET],
            claims: ["field-prefix"],
          },
          {
            id: "sections",
            cls: "provider-documented",
            text: "Placeholders in Slack's own Java SDK guide and command-line tests show a digit section followed by three more dash-separated sections (digit, alphanumeric, digit, alphanumeric in the order recorded), while other Slack placeholders show fewer sections. No Slack page states the section count.",
            cite: [JAVA, SLACK_CLI],
            claims: ["field-section-structure"],
          },
          {
            id: "widths-and-alphabet",
            unresolved: "Tools and placeholders suggest one digit, an app-id-like section, 13 digits and a 64-hex secret (97 characters), but scanner rules disagree on the widths and no Slack text states any of it.",
            text: "The sections are 1, 11, 13 and 64 characters wide, with the final section lowercase hexadecimal.",
            leadClaims: ["field-section-widths", "field-alphabet"],
          },
        ],
        issuance: [
          {
            id: "creation",
            unresolved: "Recorded in a research note without a cited page; no token was issued for the research.",
            text: "An app-level token is created on an app's Basic Information page, with a scope chosen at creation (connections:write, authorizations:read or app_configurations:write).",
            lead: [SOCKET],
          },
        ],
        collisions: [
          {
            id: "siblings",
            unresolved: "Recorded in a research note without a cited source.",
            text: "Other sectioned Slack prefixes such as xoxa-2- share the skeleton, words such as xapp-store are not tokens, and app ids are public.",
          },
        ],
        openQuestions: [
          {
            id: "app-id-section",
            unresolved: "Scanner samples disagree and no provider text says what the second section is.",
            text: "Is the second section the public app id?",
            leadClaims: ["field-app-id-embedding"],
          },
          {
            id: "version-digit",
            unresolved: "No provider source and no issued token shows any version digit other than 1.",
            text: "Have version digits other than 1 been issued?",
          },
          {
            id: "widths",
            unresolved: "No issued token was inspected.",
            text: "What are the real section widths and the secret alphabet?",
          },
        ],
      },
    },
    {
      id: "slack:workflow-webhook-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "Slack's tokens page states that workflow tokens begin xwfp-. It gives no section widths or alphabet.",
            cite: [TOKENS],
            claims: ["dossier-research"],
          },
          {
            id: "body",
            unresolved: "The provider page states the prefix only and nothing was issued for the research.",
            text: "The body grammar of a workflow token is not recorded.",
          },
        ],
        openQuestions: [
          {
            id: "body-grammar",
            unresolved: "No Slack source states the body grammar and no workflow token was inspected.",
            text: "What are the section structure, widths and alphabet of the body after xwfp-?",
          },
        ],
      },
    },
  ],
};
