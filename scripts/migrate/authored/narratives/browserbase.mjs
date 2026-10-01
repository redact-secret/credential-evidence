// Authored family narratives for the Browserbase dossier (benchmarks/support/dossiers/browserbase.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

export default {
  provider: "browserbase",
  dropped: [
    { part: "Candidate: bb_test_ keys as a second prefix", reason: "not a family yet; carried as an unresolved statement and an open question" },
    { part: "The 128-byte upper bound and the boundary rules", reason: "matching decisions of the project, not provider facts" },
    { part: "Statements that two scanners have no Browserbase rule", reason: "state of other scanners, not credential knowledge" },
  ],
  families: [
    {
      id: "browserbase:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-alphabet-floor",
            cls: "provider-documented",
            text: "A key begins bb_live_ and continues with at least 20 letters and digits, open-ended, with no separator or checksum. The prefix comes from documentation placeholders and a provider redaction pattern in its stagehand repository; the alphabet and floor come from a hygiene check in its cookbook repository, written by a public member of the Browserbase organization. The stagehand redaction pattern also admits underscore and hyphen after the first four body characters; the alphanumeric class is the narrower reading.",
            claims: ["provider-source", "field-prefix", "field-alphabet", "field-floor"],
          },
          {
            id: "no-upper-bound",
            unresolved: "A cap of 128 characters was chosen for bounded matching; it is not a provider fact and the provider's own pattern is open-ended.",
            text: "A key body has an upper bound of 128 characters.",
            leadClaims: ["field-policy-upper-bound"],
          },
          {
            id: "test-keys",
            unresolved: "Only a loose pattern and a comment mention bb_test_ keys; none was issued and the provider states no grammar for them.",
            text: "bb_test_ keys exist and are not part of this family.",
            leadClaims: ["field-bb-test"],
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "The key is read from the BROWSERBASE_API_KEY environment variable and sent as the X-BB-API-Key header, or passed to Browserbase(api_key=...) and new Stagehand({ apiKey }).",
            claims: ["field-transport"],
          },
          {
            id: "access",
            unresolved: "Recorded in the research overview without a cited source in this family's contract.",
            text: "A key creates and drives sessions for a project on the account's usage budget, reads session recordings and logs, and reuses stored browser contexts that hold the cookies and logins of visited sites.",
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for this research; one issued bb_live_ key, and whether a bb_test_ key can be created, would narrow the grammar.",
            text: "No Browserbase key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "snake-case-look-alikes",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "bb_live_session_ followed by more words and other snake_case identifiers, bb_ followed by a timestamp in cookie names, and project-id UUIDs are not keys.",
          },
          {
            id: "glued-hyphen",
            unresolved: "The contract records this as a boundary decision rather than a provider statement; which reading is right is open.",
            text: "The provider's two rules agree that a trailing underscore on the run means it is not a key and disagree about a trailing hyphen.",
            leadClaims: ["field-boundary"],
          },
        ],
        openQuestions: [
          {
            id: "bb-test-keys",
            unresolved: "No bb_test_ key has been issued, so its body grammar is unknown.",
            text: "Can a bb_test_ key be created, and does it share the bb_live_ body grammar?",
          },
        ],
      },
    },
  ],
};
