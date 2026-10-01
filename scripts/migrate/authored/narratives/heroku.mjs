// Authored family narratives for the Heroku dossier (benchmarks/support/dossiers/heroku.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const OAUTH = "https://devcenter.heroku.com/articles/oauth";
const CHANGELOG_2842 = "https://devcenter.heroku.com/changelog-items/2842";
const CHANGELOG_3175 = "https://devcenter.heroku.com/changelog-items/3175";
const TRUFFLEHOG_ISSUE = "https://github.com/trufflesecurity/trufflehog/issues/4510";

export default {
  provider: "heroku",
  dropped: [
    { part: "Candidate: OAuth refresh token and client secret", reason: "not a family; they are bare UUIDs recorded only as collisions" },
    { part: "Candidate: Heroku Postgres DATABASE_URL", reason: "a different family, not part of this provider's credential set here" },
    { part: "Open question 2 (osv-scalibr issue arguing a 65-only rule misses 41-character tokens)", reason: "a disagreement with another scanner's rule; the underlying question of whether 41-character tokens can still be minted is carried" },
    { part: "Research log and per-family contract-link lines", reason: "issue workflow and product policy, not credential knowledge" },
  ],
  families: [
    {
      id: "heroku:oauth-access-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "Heroku's Platform API authenticates with OAuth access tokens. Tokens granted since 2024-04-01 carry the prefix HRKU-. Heroku documents the change in its OAuth article and its changelog, and also calls the token an API key in places such as the Dashboard and the command-line tool's HEROKU_API_KEY variable.",
            cite: [OAUTH, CHANGELOG_2842],
            claims: ["field-prefix"],
          },
          {
            id: "generation-uuid",
            cls: "provider-documented",
            text: "The first prefixed generation is HRKU- followed by a lowercase 8-4-4-4-12 hexadecimal UUID, 41 characters in all, granted from 2024-04-01 through 2025-04-22 and valid until regenerated.",
            claims: ["field-g1-generation", "field-g1-uuid-case"],
          },
          {
            id: "generation-65",
            cls: "provider-documented",
            text: "The second generation is 65 characters long and has been granted since 2025-04-23: HRKU- plus a 60-character body. The OAuth article's prose says 65, while its own response examples still show the 41-character form.",
            cite: [OAUTH],
            claims: ["field-g2-total-length", "provider-source"],
          },
          {
            id: "aa-start",
            cls: "tool-corroborated",
            text: "Every 65-character example starts with the letters AA after the prefix. Two scanner rules pin this start and a third does not. Heroku does not state it.",
            claims: ["field-g2-aa-start", "tool-corroboration"],
          },
          {
            id: "body-alphabet",
            unresolved: "Only a scanner rule supplies the letters, digits, underscore and hyphen alphabet of the 60-character body, and the contract holds it as an unresolved claim.",
            text: "The 60-character body uses letters, digits, underscore and hyphen.",
            leadClaims: ["field-g2-body-alphabet"],
          },
          {
            id: "security-checks",
            unresolved: "Heroku's changelog mentions additional security checks for token validation, which may mean an internal structure or checksum; nothing documents it.",
            text: "The 65-character form may carry an internal structure or checksum.",
            leadClaims: ["field-g2-checksum"],
          },
        ],
        issuance: [
          {
            id: "creation-paths",
            unresolved: "Recorded in a research note without a cited source in this family's contract; no token was created for this record.",
            text: "A token is created with the command-line authorizations:create command (non-expiring by default), from the Dashboard, or through the OAuth flows, and can be revoked from the Dashboard.",
          },
        ],
        lifecycle: [
          {
            id: "old-generations-valid",
            cls: "provider-documented",
            text: "Tokens granted before 2024-04-01 were bare UUIDs and, like the 41-character generation, stay valid until regenerated.",
            cite: [CHANGELOG_2842, CHANGELOG_3175],
            claims: ["field-g1-generation"],
          },
        ],
        collisions: [
          {
            id: "bare-uuid-legacy",
            cls: "provider-documented",
            text: "The bare-UUID token granted before 2024-04-01 has the same shape as the part after HRKU- in the 41-character generation.",
            cite: [CHANGELOG_2842],
          },
          {
            id: "uuid-secrets",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "The OAuth refresh token and client secret are also bare UUIDs, and app, release, request and authorization ids are public UUIDs printed beside the token in command-line output.",
          },
          {
            id: "forty-hex",
            unresolved: "An undated 40-character lowercase hexadecimal token appears in an example in Heroku's authentication article and may be a stale example.",
            text: "A 40-character hexadecimal token may be a further older shape.",
            leadClaims: ["field-forty-hex-netrc-example"],
          },
        ],
        openQuestions: [
          {
            id: "aa-always",
            unresolved: "Only examples show the AA start; a trufflehog issue discusses it and one contributor's fresh tokens all matched, but no provider text says whether it is a version tag or header or always present.",
            text: "Does AA act as a version tag or header, and is it always present in the 65-character form?",
            lead: [TRUFFLEHOG_ISSUE],
          },
          {
            id: "mint-41",
            unresolved: "Provider text says old tokens stay valid but does not say whether new 41-character tokens can still be minted.",
            text: "Can Heroku still mint a 41-character token?",
          },
          {
            id: "dashboard-key-shape",
            unresolved: "No source says which shape a fresh Dashboard API key has.",
            text: "Which shape does a fresh Dashboard API key have?",
          },
        ],
      },
    },
    {
      id: "heroku:legacy-api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "bare-uuid",
            cls: "provider-documented",
            text: "The legacy token is an unprefixed lowercase 8-4-4-4-12 hexadecimal UUID, 36 characters, granted before 2024-04-01 and valid until regenerated. Heroku states no grammar in prose; the shape is one changelog example.",
            cite: [CHANGELOG_2842],
            claims: ["field-shape"],
          },
          {
            id: "no-marker",
            cls: "tool-corroborated",
            text: "The legacy shape has no marker of its own. Scanner rules for it only match beside a same-line heroku keyword.",
            claims: ["field-context-gate", "tool-corroboration"],
          },
          {
            id: "hex-case",
            unresolved: "Provider examples are lowercase, two scanner rules accept uppercase and another does not, and no source says whether Heroku ever issued uppercase.",
            text: "The hexadecimal digits may be uppercase in some tokens.",
            leadClaims: ["field-hex-case"],
          },
        ],
        issuance: [
          {
            id: "no-new-issue",
            cls: "provider-documented",
            text: "A legacy token cannot be newly issued; new tokens carry the HRKU- prefix, in a 41-character and later a 65-character generation.",
            cite: [OAUTH, CHANGELOG_3175],
            claims: ["field-later-generations"],
          },
        ],
        collisions: [
          {
            id: "uuid-ids",
            unresolved: "Recorded in a research note without a cited source in this family's contract; the contract holds the UUID-shaped siblings as an unresolved claim.",
            text: "The token is structurally identical to Heroku app, release, request and user ids and to the OAuth client secret and refresh token, so a same-line keyword is the only gate. An app id on a HEROKU_APP_ID line is the known false positive.",
            leadClaims: ["field-uuid-shaped-siblings"],
          },
          {
            id: "forty-hex",
            unresolved: "An undated 40-character lowercase hexadecimal token appears in Heroku's authentication article and may be a stale example.",
            text: "A 40-character hexadecimal token may be a further older shape.",
            leadClaims: ["field-40-hex-shape"],
          },
        ],
        openQuestions: [
          {
            id: "uppercase-ever",
            unresolved: "No provider example or measurement shows uppercase hexadecimal in the bare-UUID generation.",
            text: "Was uppercase hexadecimal ever issued in the bare-UUID generation?",
          },
        ],
      },
    },
  ],
};
