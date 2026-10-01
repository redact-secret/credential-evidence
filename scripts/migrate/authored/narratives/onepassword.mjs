// Authored family narratives for the 1Password dossier (benchmarks/support/dossiers/onepassword.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

export default {
  provider: "onepassword",
  dropped: [
    { part: "Candidate: Connect server token", reason: "recorded as a collision of the service account token family; it is an ordinary three-segment JWT and not a separate family here" },
    { part: "Candidate and open question 2: Account Secret Key grammar", reason: "not researched; carried as an unresolved collision statement, and a later research item rather than a claim" },
    { part: "Peer-scanner lag note", reason: "describes scanner coverage, which is not credential knowledge" },
  ],
  families: [
    {
      id: "onepassword:service-account-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "A service account token begins with the literal prefix ops_. The provider's security page says the prefix was chosen to help code analyzers recognize the token.",
            claims: ["provider-source", "field-prefix"],
          },
          {
            id: "body-lead",
            cls: "provider-documented",
            text: "The rest of the token is a serialized JSON object encoded as Base64url, so the body begins eyJ, the Base64 of an opening brace and quote.",
            claims: ["field-body-lead"],
          },
          {
            id: "alphabet",
            cls: "provider-documented",
            text: "The documented encoding is Base64url (letters, digits, underscore and hyphen), with optional equals padding at the end. Every sample seen contains only letters and digits after the prefix. A standard-Base64 plus or slash is outside the documented class, although one scanner rule uses the standard class.",
            claims: ["field-alphabet", "field-peer-lag"],
          },
          {
            id: "length",
            cls: "provider-documented",
            text: "Length is variable by construction. The provider's one encoded example is 634 characters and begins ops_eyJ; values observed in the research range from 634 to 870 characters.",
            claims: ["field-length"],
          },
          {
            id: "minimum-length",
            unresolved: "The provider states no minimum length; a floor of 250 Base64url characters after the prefix is a project choice that matches one scanner's floor.",
            text: "A real token has at least 250 Base64url characters after ops_eyJ.",
            leadClaims: ["field-floor"],
          },
        ],
        issuance: [
          {
            id: "env-variable",
            cls: "provider-documented",
            text: "A service account hands automation its token through the OP_SERVICE_ACCOUNT_TOKEN environment variable, which the command-line tool and the SDKs read.",
            claims: ["field-transport"],
          },
          {
            id: "not-issued",
            unresolved: "No service account token was issued for this research.",
            text: "No 1Password service account token was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "connect-token",
            cls: "provider-documented",
            text: "The Connect server token (OP_CONNECT_TOKEN) is a different credential: a standard three-segment JWT.",
            claims: ["field-connect-token"],
          },
          {
            id: "secret-references",
            cls: "provider-documented",
            text: "Secret references of the form op://vault/item/field point at a secret and are not themselves secrets.",
            claims: ["field-secret-references"],
          },
          {
            id: "account-secret-key",
            unresolved: "The grammar of the account Secret Key has not been researched; only a research note records that it is a separate credential.",
            text: "The account Secret Key (the A3- form) is a separate credential with its own grammar.",
            leadClaims: ["field-secret-key"],
          },
        ],
        openQuestions: [
          {
            id: "dashboard-vs-cli-serialization",
            unresolved: "A difference has been reported but not confirmed; no issued dashboard token and CLI token were compared.",
            text: "Does the serialization produced by the web dashboard differ in length or alphabet from the command-line serialization?",
          },
        ],
      },
    },
  ],
};
