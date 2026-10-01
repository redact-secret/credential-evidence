// Authored family narratives for the Travis CI dossier (benchmarks/support/dossiers/travis-ci.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const AUTH = "https://developer.travis-ci.com/authentication";
const TRIGGER = "https://docs.travis-ci.com/user/triggering-builds";

export default {
  provider: "travis-ci",
  dropped: [
    { part: "Candidates: CircleCI, Buildkite and GitHub Actions", reason: "other providers' credentials ranked during family selection; none is a Travis CI family" },
    { part: "Open question 2 (unticked acceptance boxes of the selection issue)", reason: "issue workflow, not credential knowledge" },
    { part: "Selection rationale (why Travis CI was chosen over other CI providers) and the research log", reason: "issue workflow and project prioritisation, not credential knowledge" },
    { part: "Contract precision guards (mixed letters and digits, no repeated character, skipped under identifier keys) and the same-line keyword gate as a matching rule", reason: "matching policy for a scanner contract; the underlying keyword context is carried as tool-corroborated evidence and the guards as unresolved" },
    { part: "Current-contract link", reason: "product policy is not carried (ADR 0010 section 5)" },
  ],
  families: [
    {
      id: "travis-ci:api-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "length-alphabet",
            cls: "tool-corroborated",
            text: "A Travis CI API token is a run of 22 alphanumeric characters. The length and the letters-and-digits alphabet are corroborated by two scanner rules (gitleaks and trufflehog), not by Travis CI.",
            claims: ["field-length", "field-alphabet"],
          },
          {
            id: "underscore-disagreement",
            cls: "tool-corroborated",
            text: "The two scanner rules disagree on the underscore: gitleaks matches only letters and digits case-insensitively, while trufflehog also admits an underscore in the body. Only the letters-and-digits intersection is treated as the shape.",
            claims: ["field-alphabet"],
          },
          {
            id: "no-provider-shape",
            unresolved: "Travis CI's pages show only a masked twelve-character placeholder in the header and state no length or alphabet, and no provider-documented prefix exists.",
            text: "Travis CI does not document the token's length, alphabet or any prefix, so the 22-character shape is not provider-confirmed.",
            lead: [AUTH, TRIGGER],
          },
          {
            id: "mixed-class",
            unresolved: "A guard recorded in the research note, not a provider fact: roughly 2 percent of uniformly random 22-character tokens contain no digit and would not satisfy it.",
            text: "It is not established that a token always contains at least one letter and one digit.",
            leadClaims: ["field-mixed-letters-and-digits"],
          },
        ],
        issuance: [
          {
            id: "travis-token-command",
            cls: "provider-documented",
            text: "An API token is generated with the travis token command of the Travis CI command-line client against a Travis CI account, and is sent in an Authorization header with the word token before the value.",
            cite: [AUTH, TRIGGER],
            claims: ["field-transport", "mutable-property-source"],
          },
          {
            id: "no-sample",
            unresolved: "No token was issued for this research, and no provider-issued token has been observed.",
            text: "The real length and alphabet of an issued token have not been checked against an issued sample.",
          },
        ],
        collisions: [
          {
            id: "same-line-keyword",
            cls: "tool-corroborated",
            text: "A bare 22-character alphanumeric run has no identifying prefix, so both scanner rules require the word travis near the value (a case-insensitive keyword on the same line) before treating it as a Travis CI token.",
            claims: ["field-context"],
          },
          {
            id: "numeric-and-hex-ids",
            unresolved: "Recorded in a research note without a cited source.",
            text: "Travis build, job and repository ids are numeric and commit SHAs are 40 hexadecimal characters, so those identifiers on a Travis line do not match the 22-character shape; a 22-character mixed-case value under a non-identifier key on such a line would.",
          },
        ],
        openQuestions: [
          {
            id: "real-length-alphabet",
            unresolved: "Neither Travis CI nor an issued token confirms the shape, and the underscore disagreement between the two scanner rules is unresolved.",
            text: "What are the real length and alphabet of an issued Travis CI token?",
          },
        ],
      },
    },
  ],
};
