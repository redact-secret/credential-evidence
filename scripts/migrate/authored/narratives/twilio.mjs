// Authored family narratives for the Twilio dossier (benchmarks/support/dossiers/twilio.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const AUTHTOKEN_DOC = "https://www.twilio.com/docs/iam/api/authtoken";
const KEY_DOC = "https://www.twilio.com/docs/iam/api-keys/key-resource-v1";
const IAM_SPEC = "https://github.com/twilio/twilio-oai/blob/5aa7f31977ce5812f7b7bc1f46a38555ebaa2888/spec/json/twilio_iam_v1.json";
const CLI_CREATE = "https://github.com/twilio/twilio-cli/blob/48957956fecbd279a2cb8249f20a432fa646484a/src/commands/profiles/create.js";
const SERVERLESS_CHECK = "https://github.com/twilio-labs/serverless-toolkit/blob/1669e746ab6e2993f2ca560aad81959c811fed88/packages/twilio-run/src/checks/check-auth-token.ts";

export default {
  provider: "twilio",
  dropped: [
    { part: "Candidates: Account SID (AC plus 32 hex) and API key SID (SK plus 32 hex)", reason: "documented identifiers, not secrets and not families; they appear as the paired identifier in the API key secret family and as a collision note of the auth token" },
    { part: "Open question 1 (whether Twilio-owned client-side code meets the project's evidence bar for the token length)", reason: "an internal evidence-threshold ruling, not credential knowledge; the underlying fact is carried as the provider-source length statement" },
    { part: "Same-line context gate as a matching rule, and the current-contract and evidence-record links", reason: "matching policy and product policy are not carried (ADR 0010 section 5); the collision with generic 32-character values is carried instead" },
  ],
  families: [
    {
      id: "twilio:auth-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "length-32",
            cls: "provider-documented",
            text: "An account Auth Token is exactly 32 characters with no prefix or marker. Twilio's own command-line client checks that length when a profile is created (the check can be skipped with a hidden flag), and Twilio's serverless toolkit describes the token as 32 characters of letters and numbers.",
            cite: [CLI_CREATE, SERVERLESS_CHECK],
            claims: ["field-length"],
          },
          {
            id: "lowercase-hex",
            unresolved: "The contract's alphabet claim is itself unresolved: no provider source states the alphabet.",
            text: "Scanner rules treat the token as lowercase hexadecimal. Twilio-owned sample code sometimes accepts lowercase letters and digits and calls the result hexadecimal, most likely loosely.",
            leadClaims: ["field-alphabet"],
          },
          {
            id: "untyped-schema",
            cls: "provider-documented",
            text: "Twilio's Auth Token resource types the token as an untyped string, so the reference documentation states no length or alphabet.",
            cite: [AUTHTOKEN_DOC],
          },
          {
            id: "other-token-kinds",
            unresolved: "No reviewed source describes the shape of secondary, regional, test or subaccount tokens.",
            text: "Secondary, regional, test and subaccount tokens have no stated shape.",
          },
        ],
        issuance: [
          {
            id: "account-bound",
            unresolved: "No token was issued for this research; the binding of a token to the account is recorded in a research note without a cited page.",
            text: "An Auth Token is bound to the account, and is paired with the Account SID, which is AC followed by 32 hexadecimal characters.",
            lead: [AUTHTOKEN_DOC],
          },
        ],
        collisions: [
          {
            id: "any-32-hex",
            unresolved: "Recorded in a research note without a cited source.",
            text: "Because the token has no prefix, any 32-character hexadecimal run collides with it, including an MD5 digest or a UUID without dashes.",
          },
        ],
        openQuestions: [
          {
            id: "alphabet-outside-hex",
            unresolved: "Nothing reviewed shows an issued token, so no source can say whether one ever contains characters outside lowercase hexadecimal.",
            text: "Do issued auth tokens ever contain characters outside lowercase hex?",
          },
          {
            id: "secondary-regional-test",
            unresolved: "No reviewed source describes secondary, regional or test tokens.",
            text: "Do secondary, regional and test tokens share the shape of the primary token?",
          },
        ],
      },
    },
    {
      id: "twilio:api-key-secret",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "paired-sid",
            cls: "provider-documented",
            text: "An API key has a key SID, which is SK followed by 32 hexadecimal characters (34 in all), and a secret. The SID is the Basic-authentication user name and the secret is the password; the secret is also the HMAC key for Access Tokens.",
            cite: [KEY_DOC],
            claims: ["field-paired-sid"],
          },
          {
            id: "secret-length-alphabet",
            unresolved: "No Twilio source states the secret's length or alphabet; the new-key secret is an untyped nullable string in the OpenAPI specification, and 32 alphanumeric characters rests on one scanner rule and 32-character placeholder masks in Twilio sample repositories, which are not a specification.",
            text: "The secret is believed to be 32 alphanumeric characters with no prefix, but no provider source confirms the length or the alphabet.",
            lead: [IAM_SPEC],
            leadClaims: ["field-length-and-alphabet"],
          },
        ],
        issuance: [
          {
            id: "shown-once",
            unresolved: "No key was issued for this research; the show-once behaviour is recorded in a research note without a cited page.",
            text: "The secret is returned once, at creation, and cannot be shown again.",
            lead: [KEY_DOC],
          },
        ],
        collisions: [
          {
            id: "any-32-alnum",
            unresolved: "Recorded in a research note without a cited source.",
            text: "As with the auth token, any 32-character alphanumeric run collides with the secret, and the only documented companion is the SK key SID that appears beside it.",
          },
        ],
        openQuestions: [
          {
            id: "alphabet-outside-alnum",
            unresolved: "Nothing reviewed shows an issued secret, so no source can say whether one contains characters outside letters and digits.",
            text: "Do issued API key secrets ever contain characters outside letters and digits?",
          },
        ],
      },
    },
  ],
};
