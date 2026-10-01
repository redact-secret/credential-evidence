// Authored family narratives for the Together AI dossier (benchmarks/support/dossiers/together.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const DOCS = "https://docs.together.ai/docs/api-keys-authentication";
const BETTERLEAKS = "https://github.com/betterleaks/betterleaks/blob/6cf4f1a29160b68be7c6390599b9b773234e5a43/cmd/generate/config/rules/togetherai.go";
const KINGFISHER = "https://github.com/mongodb/kingfisher/blob/82d050530cdef9af070b8f9a75701c9c27a948c3/crates/kingfisher-rules/data/rules/togetherai.yml#L8";
const CREDSWEEPER = "https://github.com/Samsung/CredSweeper/blob/f21ab2f2553eea288a72273b9658cd297ab1d11f/credsweeper/rules/config.yaml#L1814-L1827";
const TOGETHER_PY = "https://github.com/togethercomputer/together-py/blob/9c9c34e47686344b996eaf19a7c470f72dcdecd6/src/together/lib/cli/_track_cli.py#L205";

export default {
  provider: "together",
  dropped: [
    { part: "Shape note that the key is recognised bare or in any context, with identifier boundaries", reason: "a matching-policy choice for a scanner contract, not a property of the credential" },
    { part: "Naming note (taxonomy id versus the research name `together-ai:api-key`, arrival id and detector id renames)", reason: "records the history of internal identifiers, not credential knowledge" },
    { part: "Pending ruling Q-TG and the corroboration counts (4 references, 4 owners, 1 class)", reason: "an internal evidence-threshold ruling about when the project would treat the format as established, not a property of the credential" },
    { part: "Candidate: legacy Together keys", reason: "not a family; the format is undocumented and is carried as an unresolved statement of the project API key instead" },
    { part: "Open question 4 (corroboration counts) and open question 5 (blocked Reddit and Stack Overflow searches)", reason: "research workflow state, not credential knowledge" },
    { part: "Research log and current-contract link", reason: "issue workflow and product policy are not carried (ADR 0010 section 5)" },
  ],
  families: [
    {
      id: "together:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-width",
            cls: "tool-corroborated",
            text: "A current project API key is the lowercase prefix tgp_v1_ followed by 43 characters drawn from letters, digits, underscore and hyphen, 50 characters in all. The width rests on three independent scanner rules (betterleaks, Kingfisher, CredSweeper) and on four full-length samples seen in public code search.",
            cite: [BETTERLEAKS, KINGFISHER, CREDSWEEPER],
            claims: ["field-prefix"],
          },
          {
            id: "provider-cli-redactor",
            cls: "provider-documented",
            text: "Together's own command-line client redacts keys with an expression that confirms the tgp_ prefix and a body of letters, digits, underscore and hyphen, with no length stated.",
            cite: [TOGETHER_PY],
          },
          {
            id: "no-provider-format-page",
            unresolved: "No provider page or staff statement was found that states the prefix, length or alphabet; the documentation establishes only issuance, the environment variable and the legacy population.",
            text: "Together's documentation does not state the key's prefix, length or alphabet, so the exact 43-character body is not provider-confirmed.",
            lead: [DOCS],
          },
          {
            id: "checksum",
            unresolved: "No checksum or fixed inner segment is documented or observed in any reviewed source.",
            text: "It is not established whether the body carries a checksum.",
            leadClaims: ["field-checksum"],
          },
        ],
        issuance: [
          {
            id: "project-keys-page",
            cls: "provider-documented",
            text: "Keys are created from a project's API keys page, shown once, optionally given an expiration date, and sent as a bearer token. Current keys are project-scoped, and the documentation names TOGETHER_API_KEY as the conventional environment variable.",
            cite: [DOCS],
            claims: ["field-transport"],
          },
          {
            id: "sample-issuance",
            unresolved: "No key was issued for this research; the planned checks (prefix, total length of 50, alphabet, project and expiry variants) were not performed.",
            text: "Whether keys issued with different project or expiry settings share the same prefix, width and alphabet has not been checked against an issued key.",
          },
        ],
        lifecycle: [
          {
            id: "legacy-keys",
            cls: "provider-documented",
            text: "The documentation states that a population of deprecated legacy keys exists. They cannot be scoped or revoked, only regenerated.",
            cite: [DOCS],
          },
        ],
        collisions: [
          {
            id: "benign-lookalikes",
            unresolved: "Recorded in a research note without a cited source.",
            text: "The string tgp appears only in unrelated project names. The TOGETHER_BASE_URL variable, model names and 64-character hex digests are benign. A scanner rule for a bare 64-hex Together key is a sibling shape and does not corroborate this format.",
          },
        ],
        openQuestions: [
          {
            id: "legacy-format",
            unresolved: "The legacy key format is undocumented; a commonly repeated 64-hex belief was searched for and found in no source except one scanner rule, so it is not recorded as a grammar.",
            text: "What does a deprecated legacy key look like, and how many accounts still hold one?",
            leadClaims: ["field-legacy-keys"],
          },
          {
            id: "version-drift",
            unresolved: "A tgp_v2_ prefix appears only as a scanner negative case; no source says a second version exists.",
            text: "Does the v1 segment imply later versions?",
            leadClaims: ["field-other-versions"],
          },
          {
            id: "length-stability",
            unresolved: "Bodies of 26 and 31 characters seen in code search are unexplained and were not used to widen the grammar.",
            text: "Is the 43-character body fixed?",
          },
        ],
      },
    },
  ],
};
