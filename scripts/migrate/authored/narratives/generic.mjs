// Authored family narratives for the provider-less (generic) dossier (benchmarks/support/dossiers/generic.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).
// These families have no issuing provider: their grammar comes from a standard (RFC) or from project
// policy, and each statement says which.

const RFC7468 = "https://www.rfc-editor.org/rfc/rfc7468";
const RFC7519 = "https://www.rfc-editor.org/rfc/rfc7519";
const RFC6750 = "https://www.rfc-editor.org/rfc/rfc6750";
const RFC9110 = "https://www.rfc-editor.org/rfc/rfc9110";
const RFC3986 = "https://www.rfc-editor.org/rfc/rfc3986";
const KEY_URI = "https://github.com/google/google-authenticator/wiki/Key-Uri-Format";
const RFC6749 = "https://www.rfc-editor.org/rfc/rfc6749.txt";

export default {
  provider: "generic",
  dropped: [
    { part: "Candidate: PlanetScale, Neon and Aiven passwords", reason: "fixed-prefix connection-string passwords that belong to their own providers' families; named as non-members in the collision statement" },
    { part: "Candidate: password parameters in connection strings (password=, query key, JDBC properties)", reason: "outside the userinfo family definition; not a family" },
    { part: "Candidate: Azure Storage AccountKey=", reason: "outside the userinfo family definition; not a family" },
    { part: "Open question 3 (no research issue records the acceptance of private key and JWT)", reason: "research-workflow state, not credential knowledge" },
    { part: "Statements on the contract floors, caps and acceptance rules of the current detector", reason: "scanner implementation and product policy" },
    { part: "Statement that a scanner skips HMAC-signed JWTs", reason: "per-scanner behaviour, a policy difference and not a grammar fact" },
    { part: "Supabase legacy anon-key exclusion ruling", reason: "a product decision about one detector, not credential knowledge; the JWT-collision fact is carried unresolved" },
    { part: "Verdict and evidence-class wording (ready at the third level, project policy)", reason: "already carried by the family research field and statement classes" },
  ],
  families: [
    {
      id: "generic:private-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "pem-envelope",
            cls: "provider-documented",
            text: "A PEM-encoded private key uses the textual encoding of RFC 7468: a line beginning -----BEGIN followed by a label, base64 body lines, and a matching -----END line with the same label. The BEGIN and END lines belong to the secret.",
            cite: [RFC7468],
            claims: ["provider-source"],
          },
          {
            id: "json-escaped-form",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Service-account key files in JSON embed the PEM as a string with literal backslash-n escapes in place of line breaks.",
          },
        ],
        issuance: [
          {
            id: "local-generation",
            unresolved: "No source is cited; this is a statement about how synthetic examples are made.",
            text: "No provider is involved: a private key is generated locally with any standard tool.",
          },
        ],
        collisions: [
          {
            id: "label-decides",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "PEM certificates and public keys share the envelope and are not secrets; the label decides.",
            lead: [RFC7468],
          },
        ],
        openQuestions: [
          {
            id: "grammar-depth",
            unresolved: "Recorded in a research note; the depth of the label, termination and line-ending grammar is not decided by a cited source.",
            text: "Which labels, line endings and termination forms count as the same family?",
          },
        ],
      },
    },
    {
      id: "generic:jwt",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "compact-serialization",
            cls: "provider-documented",
            text: "A JSON Web Token in compact serialization (RFC 7519) is three parts separated by dots, each URL-safe base64 (so + and / are outside the grammar), and the header decodes to a JSON object. The secret is the whole compact serialization.",
            cite: [RFC7519],
            claims: ["provider-source"],
          },
        ],
        issuance: [
          {
            id: "local-generation",
            unresolved: "No source is cited; this is a statement about how synthetic examples are made.",
            text: "No provider is involved: a token is minted locally by any JWT library.",
          },
        ],
        collisions: [
          {
            id: "dotted-identifiers",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Ordinary dotted identifiers and forms missing the signature part are not tokens of this family.",
          },
          {
            id: "provider-jwts",
            unresolved: "Recorded in a research note linked to a discussion thread, not to a provider document.",
            text: "Some providers' keys are themselves JWTs, for example a legacy Supabase anonymous or service-role key, so a provider family can overlap this one.",
          },
        ],
      },
    },
    {
      id: "generic:bearer-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "carrier-grammar",
            cls: "provider-documented",
            text: "RFC 6750 defines the credential as the keyword Bearer, one or more spaces, then a token of letters, digits and the characters - . _ ~ + / with trailing = padding only. The keyword is case-insensitive and sits outside the secret.",
            cite: [RFC6750, RFC9110],
            claims: ["mutable-property-source", "field-scheme", "field-alphabet"],
          },
          {
            id: "no-length",
            unresolved: "RFC 6750 section 5.2 leaves the token contents unspecified and no standard states a length; any minimum length, padding cap or whitespace rule is a masking choice.",
            text: "The token has no stated length or identifying element.",
            leadClaims: ["field-length"],
          },
          {
            id: "masking-policy",
            cls: "project-policy",
            text: "The span boundary for this family is project masking policy and not a provider grammar. The standard supplies only the carrier syntax; length floors, the padding cap and the treatment of free-text scope are project choices.",
            claims: ["legacy-contract-tier"],
          },
        ],
        issuance: [
          {
            id: "not-applicable",
            unresolved: "No issuing provider exists for this family; the token is issued by whichever service the client authenticates to.",
            text: "Issuance is not applicable.",
          },
        ],
        collisions: [
          {
            id: "wrapped-credentials",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "The value may be a JWT, a provider-prefixed key or an opaque string; a provider's own family is the better attribution when its prefix matches.",
          },
        ],
      },
    },
    {
      id: "generic:connection-string-password",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "userinfo-position",
            cls: "provider-documented",
            text: "In a URI the userinfo component is delimited from the host by @, and the deprecated user:password form places the password after the first colon. The password value has no grammar of its own: no standard states a length or an identifying element.",
            cite: [RFC3986],
            claims: ["mutable-property-source"],
          },
          {
            id: "vendor-encoding-differences",
            unresolved: "Recorded in a research note citing vendor documentation that is not among the sources recorded for this family.",
            text: "Vendors disagree on which characters need percent-encoding in the password: one database requires a dollar sign encoded, one driver requires parentheses, ampersand and equals sign encoded, and one broker forbids a raw colon.",
          },
          {
            id: "masking-policy",
            cls: "project-policy",
            text: "Treating the password as the secret span is project masking policy and not a provider grammar.",
            claims: ["legacy-contract-tier"],
          },
        ],
        issuance: [
          {
            id: "not-applicable",
            unresolved: "No issuing provider exists for this family.",
            text: "Issuance is not applicable.",
          },
        ],
        collisions: [
          {
            id: "prefixed-passwords",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Providers that issue connection-string passwords with a fixed prefix (PlanetScale pscale_pw_, Neon npg_, Aiven and DigitalOcean AVNS_) have their own families.",
          },
        ],
        openQuestions: [
          {
            id: "minimum-length",
            unresolved: "Neither the shortest accepted password nor the usual scanner minimum of three characters is backed by a provider or standard.",
            text: "What is the right minimum length of a connection-string password?",
          },
        ],
      },
    },
    {
      id: "generic:otp-seed",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "otpauth-uri",
            cls: "provider-documented",
            text: "An OTP seed appears in an otpauth:// URI of the form otpauth://TYPE/LABEL?PARAMETERS, where TYPE is hotp or totp and the secret parameter is required and Base32-encoded (letters A to Z and digits 2 to 7, padding omitted or =). The key URI format documentation states no length.",
            cite: [KEY_URI],
            claims: ["mutable-property-source"],
          },
          {
            id: "length-floor",
            unresolved: "RFC 4226 section 4 sets a 128-bit floor for shared secrets, the Google documentation states no length, and no source settles the lowercase and padding variants.",
            text: "The seed's minimum length and the acceptance of lowercase Base32 are not fixed by a source.",
          },
          {
            id: "masking-policy",
            cls: "project-policy",
            text: "The span boundary, the length floor, the case rule, the padding rule and the first-parameter behaviour are project masking choices and not a provider grammar. No standard defines the otpauth scheme.",
            claims: ["legacy-contract-tier"],
          },
        ],
        issuance: [
          {
            id: "not-applicable",
            unresolved: "No issuing provider exists for this family; the seed is generated by whichever service enrols the authenticator.",
            text: "Issuance is not applicable.",
          },
        ],
        collisions: [
          {
            id: "variant-forms",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "The apple-otpauth:// scheme and percent-encoded padding (%3D) are variants of the same seed that a literal match would miss.",
          },
        ],
        openQuestions: [
          {
            id: "floor-below-rfc",
            unresolved: "A minimum of 16 Base32 characters is 80 bits, below the 128-bit RFC 4226 floor; no provider settles it.",
            text: "Should the seed length floor follow the 128-bit minimum of RFC 4226?",
          },
        ],
      },
    },
    {
      id: "generic:unclassified-assignment-literal",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "no-shape",
            cls: "provider-documented",
            text: "There is no shape. An arbitrary literal is assigned to a sensitive-looking name such as client_secret, and entropy only selects confidence. RFC 6749 allows any printable ASCII for such values, and no provider exists for an arbitrary literal.",
            cite: [RFC6749],
            claims: ["mutable-property-source"],
          },
          {
            id: "masking-policy",
            cls: "project-policy",
            text: "Masking the literal is project policy and not a format claim: the assignment context is the only evidence.",
            claims: ["legacy-contract-tier", "mutable-property-source"],
          },
        ],
        issuance: [
          {
            id: "not-applicable",
            unresolved: "The family has no provider.",
            text: "Issuance is not applicable.",
          },
        ],
        collisions: [
          {
            id: "provider-values-in-assignments",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Every provider family whose value sits in an assignment overlaps this one; a named provider family is the better attribution.",
          },
        ],
      },
    },
  ],
};
