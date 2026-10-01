// Authored family narratives for the Polar dossier (benchmarks/support/dossiers/polar.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

export default {
  provider: "polar",
  dropped: [
    { part: "Candidate: checkout client secrets (polar_c_, polar_cl_)", reason: "carried as a collision statement of both families; handed to the browser by design, not a server credential family" },
    { part: "Candidate: session, authorization-code and verification tokens", reason: "short-lived credentials not researched as families; noted as a collision statement" },
    { part: "Open question 1 (ruling about treating a failed checksum as a false negative)", reason: "a maintainer policy ruling on matching behaviour, not credential knowledge; the checksum fact itself is carried" },
    { part: "Peer-scanner lag note", reason: "describes scanner coverage, which is not credential knowledge" },
  ],
  families: [
    {
      id: "polar:organization-access-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-length",
            cls: "provider-documented",
            text: "An organization access token is the prefix polar_oat_ followed by exactly 43 letters and digits, 53 characters in all. The provider's server code adds the prefix, and its token generator fixes the body length.",
            claims: ["provider-source", "field-prefix", "field-alphabet", "field-body-length"],
          },
          {
            id: "checksum",
            cls: "provider-documented",
            text: "The body is 37 random letters and digits followed by a 6-character checksum: the CRC32 of the 37 characters written in base62 (digit order 0-9, A-Z, a-z) and zero-padded. The service that issues these tokens postdates the introduction of the checksum, so there is only one era.",
            claims: ["field-checksum", "provider-source"],
          },
          {
            id: "checksum-corroboration-only",
            unresolved: "The treatment of a failed checksum is a project choice, not a provider statement: a shape-valid value with a mismatching checksum is still treated as a token.",
            text: "A failed checksum does not by itself show that a value is not a token.",
            leadClaims: ["field-policy-checksum"],
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "The token is read from POLAR_ACCESS_TOKEN and sent as Authorization: Bearer; the Python and JavaScript SDKs take it as access_token or accessToken.",
            claims: ["field-transport"],
          },
          {
            id: "not-issued",
            unresolved: "No token was issued; the grammar rests on the provider's server code.",
            text: "No Polar organization access token was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "webhook-secrets",
            cls: "provider-documented",
            text: "Polar webhook secrets are whsec_ followed by 43 characters from the same generator. The whsec_ prefix is already used for Stripe webhook signing secrets, so it does not identify a Polar credential.",
            claims: ["field-webhook-secret"],
          },
          {
            id: "public-and-short-lived",
            cls: "provider-documented",
            text: "polar_ci_ is a public OAuth client identifier and polar_c_ and polar_cl_ checkout client secrets are handed to the browser by design; session, authorization-code and verification tokens are short-lived.",
            claims: ["field-public-and-short-lived-siblings"],
          },
        ],
      },
    },
    {
      id: "polar:api-credential",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefixes",
            cls: "provider-documented",
            text: "Seven role prefixes exist: polar_pat_ (personal access token), polar_at_u_ and polar_at_o_ (OAuth access tokens for a user or an organization), polar_rt_u_ and polar_rt_o_ (refresh tokens), polar_cs_ (OAuth client secret) and polar_crt_ (client registration token). Each is followed by exactly 43 characters.",
            claims: ["field-prefix", "field-body-length"],
          },
          {
            id: "two-eras",
            cls: "provider-documented",
            text: "Before 2025-01-02 the body was 43 unpadded URL-safe Base64 characters (letters, digits, underscore and hyphen); since then it is 37 letters and digits plus a 6-character base62 checksum. The accepted alphabet is the union of the two eras, and a body from the earlier era is all letters and digits only about a quarter of the time, so no checksum applies to the family.",
            claims: ["provider-source", "field-alphabet"],
          },
          {
            id: "boundary",
            unresolved: "Treating a token attached to an identifier character on either side as not a token is a project boundary choice, not a provider statement.",
            text: "A token directly attached to a letter, digit, underscore or hyphen on either side is not a token.",
            leadClaims: ["field-boundary"],
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "Access tokens are read from POLAR_ACCESS_TOKEN and sent as Authorization: Bearer.",
            claims: ["field-transport"],
          },
          {
            id: "not-issued",
            unresolved: "No credential was issued; the grammar rests on the provider's server code and its history.",
            text: "No Polar personal access token, OAuth token or client secret was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "bare-polar-at",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "polar_at_ without the u_ or o_ sub-type is not a prefix.",
          },
          {
            id: "webhook-secrets",
            cls: "provider-documented",
            text: "Polar webhook secrets are whsec_ followed by 43 characters from the same generator; that prefix is already used for Stripe webhook signing secrets, so it does not identify a Polar credential.",
            claims: ["field-webhook-secret"],
          },
          {
            id: "public-and-short-lived",
            cls: "provider-documented",
            text: "polar_ci_ is a public OAuth client identifier and polar_c_ and polar_cl_ checkout client secrets are handed to the browser by design; session, authorization-code and verification tokens are short-lived.",
            claims: ["field-public-and-short-lived-siblings"],
          },
        ],
      },
    },
  ],
};
