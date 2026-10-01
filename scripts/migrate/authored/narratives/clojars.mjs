// Authored family narratives for the Clojars dossier (benchmarks/support/dossiers/clojars.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

export default {
  provider: "clojars",
  dropped: [
    { part: "Boundary rule on identifiers glued to the token", reason: "a matching decision of the project, not credential knowledge" },
    { part: "Description of one scanner rule's case-insensitive, boundary-less behaviour, and that another has no Clojars rule", reason: "state of other scanners, not credential knowledge" },
    { part: "Open questions: none open", reason: "nothing to carry; the openQuestions section is left out, which records no coverage" },
  ],
  families: [
    {
      id: "clojars:deploy-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-hex-body",
            cls: "provider-documented",
            text: "A token is CLOJARS_ (upper case, case-sensitive) followed by exactly 60 lowercase hexadecimal characters, 68 in all, with no checksum. The provider's generator appends 30 secure-random bytes written as lowercase hex to the prefix, and its server validator accepts exactly that pattern.",
            claims: ["provider-source", "field-prefix", "field-body"],
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "The token is used as the deploy password: through CLOJARS_PASSWORD in CI, a Leiningen :password entry or a Maven settings.xml password element.",
            claims: ["field-transport"],
          },
          {
            id: "scope",
            unresolved: "Recorded in the research overview without a cited source in this family's contract.",
            text: "A deploy token can be scoped to a group or an artifact, and a leaked one is a supply-chain risk.",
          },
          {
            id: "not-issued",
            unresolved: "No token was issued for this research; the grammar rests on the provider's own code, so none was needed to establish it.",
            text: "No Clojars deploy token was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "env-var-names",
            cls: "provider-documented",
            text: "The variable names CLOJARS_USERNAME, CLOJARS_PASSWORD and CLOJARS_ENVIRONMENT are not tokens; they fail the 60-character hexadecimal body.",
            claims: ["field-env-names"],
          },
          {
            id: "legacy-passwords",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Older account passwords are an earlier way to authenticate and have no distinctive shape.",
          },
        ],
      },
    },
  ],
};
