// Authored family narratives for the Docker dossier (benchmarks/support/dossiers/docker.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const AI_GOVERNANCE = "https://docs.docker.com/reference/api/ai-governance/api.yaml";
const HUB_SPEC = "https://docs.docker.com/reference/api/hub/latest.yaml";

export default {
  provider: "docker",
  dropped: [
    { part: "Candidate: Docker Hub legacy password and `docker login` credentials", reason: "no lexical shape, so not a family" },
    { part: "Open question 2 (whether the family label should read Organization access token)", reason: "a naming choice for the project's records; the provider's own name is stated in the family" },
    { part: "Open question 3 (whether a PAT-width body under the OAT prefix is a positive)", reason: "scanner behaviour, not credential knowledge" },
    { part: "Mentions of a scanner change that accepts 27 or 32 body bytes", reason: "product policy and issue workflow" },
  ],
  families: [
    {
      id: "docker:personal-access-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "A Docker Hub personal access token begins dckr_pat_. The credential table of Docker's AI Governance API reference lists the format as dckr_pat_ followed by a wildcard.",
            cite: [AI_GOVERNANCE],
            claims: ["provider-source"],
          },
          {
            id: "body-27",
            unresolved: "No Docker page states the body length or alphabet; the scanner claim for it is itself unresolved, and Docker-owned rules disagree with the public tally on the alphabet.",
            text: "The body is 27 characters from letters, digits, underscore and hyphen. Of 92 distinct non-placeholder public bodies, 69 were 27 characters, and of those 27 contained an underscore and 19 a hyphen. Several scanners and Docker-owned rules carry related patterns, but the Docker-owned ones are narrower (no underscore) and contradicted by the tally.",
            leadClaims: ["tool-corroboration"],
          },
          {
            id: "hub-examples",
            cls: "provider-documented",
            text: "The Hub API specification's personal-access-token examples are 15-character placeholders, so they establish neither a length nor an alphabet.",
            cite: [HUB_SPEC],
          },
        ],
        issuance: [
          {
            id: "not-issued",
            unresolved: "No token was issued for this research; an optional check of one or two fresh tokens was described but not performed.",
            text: "No personal access token was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "dckr-namespace",
            cls: "provider-documented",
            text: "Personal access tokens share the dckr_ namespace with organization access tokens, which begin dckr_oat_ and are listed in the same table; the prefix tells the two kinds apart.",
            cite: [AI_GOVERNANCE],
            claims: ["provider-source"],
          },
        ],
        openQuestions: [
          {
            id: "body-grammar",
            unresolved: "No Docker page states it; a freshly issued token would settle it.",
            text: "What are the body length and alphabet of a personal access token issued today?",
          },
        ],
      },
    },
    {
      id: "docker:oauth-access-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "An organization access token begins dckr_oat_. Docker's AI Governance API reference lists the format in its credential table; Docker and GitHub secret scanning both call this credential an Organization Access Token, while the project's family label reads OAuth access token.",
            cite: [AI_GOVERNANCE],
            claims: ["provider-source"],
          },
          {
            id: "hub-example",
            cls: "provider-documented",
            text: "Docker's Hub API example shows a body of 27 alphanumeric characters, and every Docker-authored artefact that shows a width shows 27.",
            cite: [HUB_SPEC],
          },
          {
            id: "body-32",
            unresolved: "No Docker statement settles 27 against 32; the scanner rule that gives 32 is the origin of the other scanners that state it, so they are not independent, and the scanner claim is itself unresolved.",
            text: "The body is 32 characters, as one scanner rule states.",
            leadClaims: ["tool-corroboration"],
          },
        ],
        issuance: [
          {
            id: "plan-requirement",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Issuing an organization access token needs an organization owner on a Team or Business plan.",
          },
          {
            id: "not-issued",
            unresolved: "No token was issued for this research; a fresh token is the only thing that can settle 27 against 32.",
            text: "No organization access token was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "pat-width",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "A body of the width of one token kind under the prefix of the other is a boundary case between the personal and organization families.",
          },
        ],
        openQuestions: [
          {
            id: "body-grammar",
            unresolved: "Needs one freshly issued organization access token.",
            text: "What are the body width and alphabet of a freshly issued organization access token?",
          },
        ],
      },
    },
  ],
};
