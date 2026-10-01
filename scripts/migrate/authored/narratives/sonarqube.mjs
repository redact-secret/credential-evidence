// Authored family narratives for the SonarQube dossier (benchmarks/support/dossiers/sonarqube.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const GENERATOR = "https://github.com/SonarSource/sonarqube/blob/9ec5e86425011f6c1ffa0eb2db08880e3b347271/server/sonar-webserver-auth/src/main/java/org/sonar/server/usertoken/TokenGeneratorImpl.java#L29-L46";
const TOKEN_TYPE = "https://github.com/SonarSource/sonarqube/blob/9ec5e86425011f6c1ffa0eb2db08880e3b347271/server/sonar-db-dao/src/main/java/org/sonar/db/user/TokenType.java#L24-L27";

const transport = {
  id: "transport",
  cls: "provider-documented",
  text: "A token is typically supplied through the SONAR_TOKEN environment variable, the sonar.token scanner property (or the older sonar.login), a sonar.token entry in a project properties file, or a Gradle system property.",
  claims: ["field-transport"],
};

const notIssued = {
  id: "not-issued",
  unresolved: "No token was issued; the grammar comes from the server's token generator, which needs no issued key to read.",
  text: "How a token is created in the product, and what it looks like in the interface, is not recorded.",
};

export default {
  provider: "sonarqube",
  dropped: [
    { part: "Candidate: project badge token (sqb_)", reason: "not a family; read-only and published in badge URLs by design, kept as a collision statement" },
    { part: "Candidate: unprefixed legacy tokens (before SonarQube 9.5)", reason: "no identifying element; kept as a collision statement" },
    { part: "Candidate: SonarQube Cloud sqco_ tokens", reason: "a different product with no provider grammar found; kept as an open question" },
    { part: "Overview of what each token type can do (user acts as the user, global analysis can submit for any project, project analysis is limited to one project)", reason: "recorded in the overview without a cited source; the cited generator and enum state prefixes and bodies only" },
    { part: "Current-contract note that no row exists until a product change merges", reason: "product state" },
    { part: "Research log", reason: "issue workflow" },
  ],
  families: [
    {
      id: "sonarqube:user-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-body",
            cls: "provider-documented",
            text: "A user token is the prefix squ_ followed by exactly 40 lowercase hexadecimal characters, 44 characters in all, with no checksum. SonarQube's token generator builds it as sq, a type letter, an underscore, and 20 random bytes hex-encoded; the type letter u marks a user token.",
            cite: [GENERATOR, TOKEN_TYPE],
            claims: ["provider-source", "field-prefix", "field-body"],
          },
        ],
        issuance: [transport, notIssued],
        collisions: [
          {
            id: "sha1-shaped-body",
            cls: "provider-documented",
            text: "A 40-hex body alone has the shape of a SHA-1 digest such as a git commit id, so the squ_ prefix is what identifies the token. Project badge tokens (sqb_) are read-only and published in README badge URLs by design.",
            claims: ["field-excluded-siblings"],
          },
        ],
        openQuestions: [
          {
            id: "legacy-and-cloud",
            unresolved: "Recorded in a research note without a cited source for the unprefixed form and for the SonarQube Cloud sqco_ form.",
            text: "Tokens issued before SonarQube 9.5 are unprefixed 40-hex values, and SonarQube Cloud issues a differently prefixed token (sqco_); how they relate to the user token is not recorded.",
          },
        ],
      },
    },
    {
      id: "sonarqube:analysis-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-body",
            cls: "provider-documented",
            text: "An analysis token is sqa_ (global analysis) or sqp_ (project analysis) followed by exactly 40 lowercase hexadecimal characters, 44 characters in all, with no checksum. The generator and the token-type enum are the source.",
            cite: [GENERATOR, TOKEN_TYPE],
            claims: ["provider-source", "field-prefix", "field-body"],
          },
        ],
        issuance: [transport, notIssued],
        collisions: [
          {
            id: "sha1-shaped-body",
            cls: "provider-documented",
            text: "As for the user token, a 40-hex body alone has the shape of a SHA-1 digest, so the prefix carries the identification. Project badge tokens (sqb_) are read-only and published by design.",
            claims: ["field-excluded-siblings"],
          },
          {
            id: "unknown-type-letter",
            unresolved: "Recorded in a research note as an inference from the enum; no source states that a token with another type letter is never issued.",
            text: "A prefix such as sqx_ with a type letter outside the enum is not an issued token.",
          },
        ],
      },
    },
  ],
};
