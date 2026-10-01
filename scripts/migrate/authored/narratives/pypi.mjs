// Authored family narratives for the PyPI dossier (benchmarks/support/dossiers/pypi.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const SECRETS = "https://docs.pypi.org/api/secrets/";
const HELP = "https://pypi.org/help/#apitoken";

export default {
  provider: "pypi",
  dropped: [
    { part: "Issuance paragraph about building a structurally faithful synthetic token without a signing key", reason: "describes how test material is constructed, not credential knowledge" },
    { part: "Open question 2 (whether the length has a ceiling)", reason: "answered by the provider's statement that there is no ceiling; carried as a shape statement" },
    { part: "Candidates (none found) and research log", reason: "empty section and issue workflow" },
  ],
  families: [
    {
      id: "pypi:api-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "published-pattern",
            cls: "provider-documented",
            text: "PyPI's own page for secret scanners publishes the token format: the prefix pypi- followed by a URL-safe base64 string (letters, digits, hyphen and underscore) of at least 85 characters, with no ceiling. The body is the base64 serialization of a macaroon.",
            claims: ["provider-source"],
            cite: [SECRETS],
          },
          {
            id: "no-ceiling",
            cls: "provider-documented",
            text: "There is no upper bound on length because caveats can be added to the macaroon.",
            cite: [SECRETS],
          },
          {
            id: "macaroon-header",
            cls: "tool-corroborated",
            text: "Real tokens begin with the encoded macaroon header for the location pypi.org, and two scanner rules key on it. Their rules are narrower than the published pattern: one requires the header plus 150 to 157 further characters, the other the header plus 50 to 1000. The extra character in the first rule implies an identifier of 36 to 39 bytes, consistent with a UUID.",
            claims: ["tool-corroboration"],
          },
        ],
        issuance: [
          {
            id: "password-value",
            cls: "provider-documented",
            text: "The pypi- prefix is part of the password value, so upload tools such as Twine and pip use the whole string as a password and it appears under names like TWINE_PASSWORD.",
            cite: [HELP],
          },
          {
            id: "not-issued",
            unresolved: "No token was issued; the format rests on the provider's published pattern.",
            text: "No PyPI API token was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "readable-identifier",
            cls: "provider-documented",
            text: "The identifier inside the macaroon is meant to be inspectable and is not itself the secret.",
            cite: [HELP],
          },
        ],
        openQuestions: [
          {
            id: "header-requirement",
            unresolved: "The provider's pattern needs only the prefix and 85 characters, while two scanner rules also require the encoded header; no source says which governs.",
            text: "Should a value without the encoded macaroon header count as a token?",
          },
        ],
      },
    },
  ],
};
