// Authored family narratives for the Doppler dossier (benchmarks/support/dossiers/doppler.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const DOCS = "https://docs.doppler.com/reference/auth-token-formats";

// The seven token types share one grammar; each family states it with its own prefix and role.
const bodyStatements = (prefix) => [
  {
    id: "prefix-and-body",
    cls: "provider-documented",
    text: `A token of this type begins ${prefix}, followed by a body of 40 to 44 letters and digits, with no separator inside the body and no checksum documented. Every documented example and the one observed token have a 43-character body; the documented band is the contract.`,
    cite: [DOCS],
    claims: ["provider-source", "field-prefix", "field-body", "field-separators"],
  },
];

const noOtherIssuer = {
  id: "no-other-dp-issuer",
  unresolved: "Recorded in a research note without a cited source; the search that found no other issuer is not itself an evidence record.",
  text: "No other issuer using the dp. prefix was found.",
};

const rolesAndOpen = (roleText, extraOpen = []) => ({
  issuance: [
    {
      id: "scope",
      cls: "provider-documented",
      text: roleText,
      cite: [DOCS],
      claims: ["provider-source"],
    },
  ],
  openQuestions: [
    {
      id: "body-length",
      unresolved: "No token of this type was issued for the research; one issued token would narrow the documented 40 to 44 band, not change it.",
      text: "Are bodies of this type always 43 characters long?",
    },
    ...extraOpen,
  ],
});

export default {
  provider: "doppler",
  dropped: [
    { part: "Candidate: service-token slugs (--slug) and token names", reason: "non-secret identifiers that are not in dp. form; not a credential family" },
    { part: "Candidate: undocumented future token types", reason: "none are known; not a family" },
    { part: "Statement that Doppler publishes no public or publishable token", reason: "an absence claim recorded in the overview without a cited source; not carried" },
    { part: "Overview note on scanner-rule lag", reason: "scanner coverage is per-scanner state; the contract's peer-lag claim holds it" },
  ],
  families: [
    {
      id: "doppler:service-token",
      status: "migrated",
      sections: {
        shape: [
          ...bodyStatements("dp.st."),
          {
            id: "environment-segment",
            cls: "provider-documented",
            text: "An optional environment segment of 2 to 35 characters (lowercase letters, digits, underscore and hyphen) followed by a dot may sit between the prefix and the body. This is the only one of the seven types that has such a segment.",
            cite: [DOCS],
            claims: ["field-environment-segment"],
          },
        ],
        issuance: [
          {
            id: "scope",
            cls: "provider-documented",
            text: "A service token reads one config.",
            cite: [DOCS],
            claims: ["provider-source"],
          },
        ],
        collisions: [
          {
            id: "preview-form",
            cls: "provider-documented",
            text: "The preview form shown in the command-line tool and the dashboard (dp.st, an ellipsis and the last 6 characters) does not match the grammar and is not a secret.",
            claims: ["field-non-secrets"],
          },
        ],
        openQuestions: [
          {
            id: "body-length",
            unresolved: "No token was issued for the research; one issued service token would narrow the documented band, not change it.",
            text: "Are service-token bodies always 43 characters long?",
          },
          {
            id: "environment-segment-value",
            unresolved: "No issued token was inspected; the provider page gives the segment's allowed characters but not what it is derived from.",
            text: "Does the environment segment always equal the environment slug?",
          },
        ],
      },
    },
    {
      id: "doppler:personal-token",
      status: "migrated",
      sections: {
        shape: bodyStatements("dp.pt."),
        ...rolesAndOpen("A personal token has user-wide scope."),
        collisions: [noOtherIssuer],
      },
    },
    {
      id: "doppler:cli-token",
      status: "migrated",
      sections: {
        shape: bodyStatements("dp.ct."),
        ...rolesAndOpen("A command-line token has user-wide scope."),
        collisions: [noOtherIssuer],
      },
    },
    {
      id: "doppler:service-account-token",
      status: "migrated",
      sections: {
        shape: bodyStatements("dp.sa."),
        ...rolesAndOpen("A service account token has service account scope."),
        collisions: [
          {
            id: "sibling-dp-said",
            cls: "provider-documented",
            text: "The text dp.sa. followed by a body starting id. does not match this family, because the body alphabet excludes the dot; the longer prefix dp.said. identifies the service account identity token and the longest prefix wins.",
            cite: [DOCS],
            claims: ["field-sibling-precedence"],
          },
          noOtherIssuer,
        ],
      },
    },
    {
      id: "doppler:service-account-identity-token",
      status: "migrated",
      sections: {
        shape: bodyStatements("dp.said."),
        ...rolesAndOpen("A service account identity token is short-lived and is minted by an OIDC exchange."),
        collisions: [
          {
            id: "sibling-dp-sa",
            cls: "provider-documented",
            text: "Against dp.sa. the body alphabet excludes the dot, so dp.sa. plus a body starting id. is not a match; the longest prefix wins.",
            cite: [DOCS],
            claims: ["field-sibling-precedence"],
          },
        ],
      },
    },
    {
      id: "doppler:scim-token",
      status: "migrated",
      sections: {
        shape: bodyStatements("dp.scim."),
        ...rolesAndOpen("A SCIM token has SCIM provisioning scope."),
        collisions: [noOtherIssuer],
      },
    },
    {
      id: "doppler:audit-token",
      status: "migrated",
      sections: {
        shape: bodyStatements("dp.audit."),
        ...rolesAndOpen("An audit token has audit log scope."),
        collisions: [noOtherIssuer],
      },
    },
  ],
};
