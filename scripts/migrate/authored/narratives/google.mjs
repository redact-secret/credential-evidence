// Authored family narratives for the Google dossier (benchmarks/support/dossiers/google.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const API_KEYS = "https://docs.cloud.google.com/docs/authentication/api-keys";
const OAUTH = "https://developers.google.com/identity/protocols/oauth2";
const OSV = "https://github.com/google/osv-scalibr/blob/5ab8022c6d67ff99d91d9750f2456ed9549fe8cb/veles/secrets/gcpoauth2client/detector.go#L51-L58";
const NOSEY = "https://github.com/praetorian-inc/noseyparker/blob/2e6e7f36ce36619852532bbe698d8cb7a26d2da7/crates/noseyparker/data/default/builtin/rules/google.yml#L17-L29";
const CREDSWEEPER = "https://github.com/Samsung/CredSweeper/blob/f21ab2f2553eea288a72273b9658cd297ab1d11f/credsweeper/rules/config.yaml#L463-L475";

export default {
  provider: "google",
  dropped: [
    { part: "Candidate: AQ. authorization keys", reason: "not a family yet; it survives as an unresolved collision and open question of the generic API key" },
    { part: "Candidate: service account private key (JSON export)", reason: "a structural PEM credential with no provider-prefixed grammar, not a family in this record" },
    { part: "Status of the OAuth2 split and the dossier's intro on scanner coverage", reason: "describes how the project handles the family, not credential knowledge" },
  ],
  families: [
    {
      id: "google:generic-api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-length",
            cls: "provider-documented",
            text: "A Google API key begins AIza and is 39 characters long. Google Cloud's API keys page states this only through one example string, introduced as an encrypted string; it states no prefix rule and no grammar.",
            cite: [API_KEYS],
            claims: ["provider-source", "field-prefix", "field-total-length"],
          },
          {
            id: "body-35",
            unresolved: "Only a scanner rule for Google Cloud keys supplies the 35-character body, and the contract holds that corroboration as an unresolved claim; Google states no body.",
            text: "After the prefix come 35 characters of letters, digits, underscore and hyphen.",
            leadClaims: ["tool-corroboration", "field-body"],
          },
          {
            id: "gemini-split",
            unresolved: "A second scanner rule that splits the key as AIzaSy plus 33 characters, and a third tool agreeing on 35, are recorded in a research note without a source URL in this family's contract.",
            text: "A Gemini-oriented rule reads the same 39 characters as the prefix AIzaSy followed by 33 characters.",
          },
        ],
        collisions: [
          {
            id: "gemini-same-shape",
            unresolved: "Recorded in a research note without a cited source in this family's contract; restriction to an API is not visible in the key's bytes.",
            text: "Gemini keys and Maps keys have the same shape as other Google API keys and are not a separate family.",
          },
          {
            id: "authorization-keys",
            cls: "provider-documented",
            text: "The API keys page now describes authorization keys that authenticate as a service account, and gives no string format for them.",
            cite: [API_KEYS],
          },
          {
            id: "aq-prefix",
            unresolved: "An AQ. prefix has been reported for such keys but does not appear on the API keys page, and no source states the format.",
            text: "Service-account authorization keys may begin AQ. followed by a dot.",
            leadClaims: ["field-aq-dot-format"],
          },
          {
            id: "firebase-web-key",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "A Firebase Web SDK apiKey has the same shape as a Google API key.",
          },
          {
            id: "public-identifiers",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "An OAuth client ID ending apps.googleusercontent.com and a service account email address are public identifiers and not secrets.",
          },
        ],
        openQuestions: [
          {
            id: "body-alphabet",
            unresolved: "Only one provider example exists and it shows the prefix and total length; an issued key would confirm the 35-character alphabet.",
            text: "Does an issued key confirm the 35-character body alphabet?",
          },
          {
            id: "aq-format",
            unresolved: "No source states whether an AQ. prefix exists or what Google says about it.",
            text: "Does the AQ. key format exist, and how does Google describe it?",
            leadClaims: ["field-aq-dot-format"],
          },
        ],
      },
    },
    {
      id: "google:oauth-client-secret",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-body",
            cls: "tool-corroborated",
            text: "An OAuth client secret is GOCSPX- followed by exactly 28 characters of letters, digits, underscore and hyphen, 35 characters in all. Google's own open-source scanner rule (narrowed to exactly 28 by a Google engineer on 2025-12-03) and two third-party rules agree, giving three dated references from three owners.",
            cite: [OSV, NOSEY, CREDSWEEPER],
            claims: ["tool-corroboration", "field-prefix", "field-body"],
          },
          {
            id: "boundary",
            cls: "tool-corroborated",
            text: "Two of the rules require that no letter, digit, underscore or hyphen touch the value on either side.",
            claims: ["field-boundary"],
          },
          {
            id: "no-documented-format",
            unresolved: "Google documents no format for client secrets; the evidence is one Google-authored rule and two third-party rules, which do not count as a provider document.",
            text: "Is the GOCSPX- grammar stated in any page authored by Google for developers?",
            lead: [OSV],
          },
        ],
        collisions: [
          {
            id: "client-id-public",
            cls: "provider-documented",
            text: "The OAuth client ID, written as digits, a hyphen, an identifier and apps.googleusercontent.com, is public and is never this family.",
            cite: [OAUTH],
            claims: ["field-public-client-id"],
          },
          {
            id: "unprefixed-old-secrets",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Client secrets issued before the GOCSPX- prefix have no prefix and are caught only by a client_secret name next to them.",
          },
          {
            id: "sibling-tokens",
            unresolved: "The grammars of the ya29. access token and the 1// refresh token are unestablished, so they are neither positives nor controls for this family.",
            text: "ya29. access tokens and 1// refresh tokens are separate credentials.",
            leadClaims: ["field-sibling-tokens"],
          },
        ],
      },
    },
    {
      id: "google:oauth2-credential",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "literal-prefixes",
            unresolved: "No source in this family's contract reaches a grammar for any of them; the prefixes come from research notes and the client secret has since been split into its own family.",
            text: "Three OAuth 2.0 formats have literal prefixes: GOCSPX- for a client secret, 1// for a refresh token and ya29. for an access token. No body length or alphabet is established for any of them.",
          },
          {
            id: "refresh-token-bound",
            cls: "provider-documented",
            text: "Google's OAuth 2.0 protocol page states only an upper bound of 512 bytes for a refresh token and gives no example.",
            cite: [OAUTH],
          },
          {
            id: "tool-rules",
            unresolved: "These scanner rules are recorded in a research note without a source URL in this family's contract.",
            text: "One scanner has a single 1// rule with an open range of 20 to 160 characters and another has an open-ended ya29. rule, and no consulted scanner has a GOCSPX- rule.",
          },
          {
            id: "provider-examples-disagree",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Google's ya29.c. example has an interior dot that every scanner rule excludes, and its 1// example, 43 characters after the prefix, contradicts the one peer rule that needs 1//0 plus 80 or more.",
          },
        ],
        collisions: [
          {
            id: "client-id-public",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "The OAuth client ID is a public application identifier, and a client_secret assignment can still be caught by generic contextual rules.",
          },
        ],
        openQuestions: [
          {
            id: "oauth-bodies",
            unresolved: "No length or alphabet source exists for the three formats; one issued credential of each kind would settle them and could make them separate families.",
            text: "What are the body lengths and alphabets of GOCSPX-, 1// and ya29. credentials?",
          },
        ],
      },
    },
  ],
};
