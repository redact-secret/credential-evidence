// Authored family narratives for the GitHub dossier (benchmarks/support/dossiers/github.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).
//
// Five families share one prefix table, one body scheme and one source set, exactly as the
// dossier treats them (its per-family text is the same except for the prefix and role), so
// their narratives are built from one parameterised block below. The fine-grained token has
// its own research and its own narrative.

const FORMATS = "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github#githubs-token-formats";
const REST_EXAMPLE = "https://github.com/github/docs/blob/e4859a83ac13c5715b723b3d17e273beba5c4572/src/rest/data/fpt-2026-03-10/credentials.json#L29";
const XCODE = "https://github.com/github/CopilotForXcode/blob/258d4577dcf8fba0e9131b514dbe45b5dbb8906c/Tool/Sources/TelemetryService/TelemetryCleaner.swift#L65";
const FIREWALL = "https://github.com/github/gh-aw-firewall/blob/8f9b21bf756e3a9a46819dc29118b92e96c1b7a8/src/dlp.ts#L64-L65";
const MCPG = "https://github.com/github/gh-aw-mcpg/blob/4576c3e06752aae7d50502883db294b468844dc5/internal/sanitize/sanitize.go#L44";
const COMMUNITY = "https://github.com/community/community/discussions/36441#discussioncomment-3951965";

// [id, prefix, role as the dossier names it]
const CLASSIC = [
  ["github:classic-personal-access-token", "ghp_", "classic personal access token"],
  ["github:oauth-access-token", "gho_", "OAuth access token"],
  ["github:app-user-to-server-token", "ghu_", "GitHub App user-to-server token"],
  ["github:app-server-to-server-token", "ghs_", "GitHub App server-to-server token"],
  ["github:oauth-refresh-token", "ghr_", "OAuth refresh token"],
];

function classic([id, prefix, role]) {
  const fam = {
    id,
    status: "migrated",
    sections: {
      shape: [
        {
          id: "prefix-and-role",
          cls: "provider-documented",
          text: `GitHub's token-formats page lists ${prefix} as the prefix of the ${role}, with an underscore separating the prefix from the body. The prefix and the token's role are the only parts of this family that the provider documents.`,
          cite: [FORMATS],
          claims: ["provider-source"],
        },
        {
          id: "body-36",
          cls: "tool-corroborated",
          text: "The body after the prefix is 36 characters, following the 36-byte body scheme of GitHub's 2021-04-05 token-format post, whose last six characters are a CRC32 checksum. The token-formats page does not restate the length or the checksum, so this part rests on that post and on scanner rules that agree with it.",
          claims: ["provider-source", "tool-corroboration"],
        },
      ],
      collisions: [
        {
          id: "distinct-token-types",
          cls: "provider-documented",
          text: `The same page lists ${prefix} next to the other classic prefixes (ghp_, gho_, ghu_, ghs_, ghr_) and github_pat_, so the prefix, not the body shape, says which kind of token a value is.`,
          cite: [FORMATS],
          claims: ["provider-source"],
        },
      ],
      openQuestions: [
        {
          id: "body-and-checksum-current",
          unresolved: "The only provider statement is the prefix and role. The body length and checksum come from a 2021 post that the token-formats page does not repeat, so it is not established that every token of this family issued today follows it.",
          text: `Does every ${role} issued today carry a 36-character body whose last six characters are a CRC32 checksum, or only those issued under the 2021 scheme?`,
        },
      ],
    },
  };
  if (id === "github:app-server-to-server-token") {
    fam.sections.lifecycle = [
      {
        id: "jwt-installation-token",
        unresolved: "The announcement is recorded in a research note, but none of the sources this family's contract cites states it, so no evidence-source record backs the date or the format here.",
        text: "GitHub announced a new installation-token format of the form ghs_ followed by an app ID and a JWT, of variable length (about 520 characters), rolling out from 2026-04-27. It belongs to this family and not to the fine-grained personal access token family.",
      },
    ];
  }
  return fam;
}

export default {
  provider: "github",
  dropped: [
    { part: "Candidate: `github_test_token`", reason: "listed in the provider's secret-scanning patterns with no description or shape, so there is nothing to state" },
  ],
  families: [
    ...CLASSIC.map(classic),
    {
      id: "github:fine-grained-personal-access-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "Fine-grained personal access tokens begin with github_pat_. The token-formats table lists the prefix and nothing else: it states no length, alphabet or segment split.",
            cite: [FORMATS],
            claims: ["field-prefix"],
          },
          {
            id: "layout-22-59",
            cls: "tool-corroborated",
            text: "The reviewed layout is github_pat_, then 22 alphanumeric characters, an underscore, and 59 alphanumeric characters, 93 characters in all. The split first appeared as a community expression that a GitHub product manager for identity endorsed on 2022-10-24 (\"purely a high-entropy string that's looked up on our backend ... Your regex looks good though\"). Three GitHub-owned redaction and data-loss-prevention rules, and one full-length value in the REST documentation's \"Revoke a list of credentials\" example, carry exactly this layout; GitHub-owned code redacts tokens and does not generate or validate them.",
            cite: [COMMUNITY, XCODE, FIREWALL, MCPG, REST_EXAMPLE],
            claims: ["dossier-research"],
          },
          {
            id: "wider-scanner-widths",
            cls: "tool-corroborated",
            text: "Scanner rules that admit other widths (an 82-character body of word characters in several rules, and a 36 to 255 range in another) are supersets of the 22 plus 59 layout.",
            claims: ["field-body-length"],
          },
          {
            id: "no-checksum-claimed",
            unresolved: "No provider source states a checksum for this token; a third-party README claims one, and the staff comment reads against it.",
            text: "No body checksum and no fixed leading digits are claimed for the 22 plus 59 layout.",
          },
        ],
        issuance: [
          {
            id: "issuance-path",
            unresolved: "The settings path is recorded in a research note without a cited source, and no fine-grained token was issued or observed for this research.",
            text: "A fine-grained token is created under Settings, Developer settings, Personal access tokens, Fine-grained tokens. The token exists before an organization approves it.",
          },
        ],
        lifecycle: [
          {
            id: "revocation",
            unresolved: "Recorded in a research note without a cited source; revocation was not attempted.",
            text: "A leaked fine-grained token is revoked by its owner, or by GitHub after a report.",
          },
        ],
        collisions: [
          {
            id: "separate-token-types",
            cls: "provider-documented",
            text: "Classic personal access tokens (ghp_) and GitHub App server-to-server tokens (ghs_) are listed beside github_pat_ as separate token types, so they are separate secret families and not benign twins of this one.",
            cite: [FORMATS],
            claims: ["field-prefix"],
          },
          {
            id: "identifier-contains-prefix",
            unresolved: "Observation from research with no cited source.",
            text: "A snake_case identifier in code that contains the text github_pat_, such as a function name, is not a token, and an open-ended pattern for the prefix matches it.",
          },
          {
            id: "token-id-public",
            cls: "provider-documented",
            text: "A fine-grained token's token_id appears in API calls and audit logs; it is an identifier and not the secret.",
            cite: ["https://github.blog/changelog/2025-03-18-fine-grained-pats-are-now-generally-available/"],
          },
        ],
        openQuestions: [
          {
            id: "leading-digits",
            unresolved: "Community sources say the first segment starts with 11 and none is provider-stated. GitHub's own REST example value starts with two letters, so a fixed 11 is not universal.",
            text: "Does a fresh fine-grained token always start with two fixed digits, and is the first segment truly opaque?",
          },
          {
            id: "checksum",
            unresolved: "The community README says yes; GitHub staff words and the 2021 engineering post, which describes a CRC32 in the last six characters, cover a different scheme.",
            text: "Does the body of a fine-grained token carry a checksum?",
          },
          {
            id: "ghes-parity",
            unresolved: "The general-availability announcement says GHES support was expected in 3.17 and does not state whether the format is the same.",
            text: "Do GitHub Enterprise Server and GHE.com issue the same shape as github.com?",
          },
          {
            id: "provider-statement-ruling",
            unresolved: "A maintainer ruling on the evidence-class boundary has not been made; until it is the layout stays corroborated and not provider-documented.",
            text: "Does the staff endorsement, or GitHub-owned redaction code, count as a provider statement of the 22 plus 59 grammar?",
          },
        ],
      },
    },
  ],
};
