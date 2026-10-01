// Authored family narratives for the Axiom dossier (benchmarks/support/dossiers/axiom.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

export default {
  provider: "axiom",
  dropped: [
    { part: "Boundary decision (a token glued to an identifier is not claimed)", reason: "a matching decision of the project, not credential knowledge" },
    { part: "Statements that two scanners have no Axiom rule", reason: "state of other scanners, not credential knowledge" },
  ],
  families: [
    {
      id: "axiom:api-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-uuid-body",
            cls: "provider-documented",
            text: "A token is xaat- followed by a lowercase-hex UUID in the 8-4-4-4-12 layout, 41 characters in all. The prefix comes from a runtime check in Axiom's Go SDK; the layout and lowercase hex come from one response example in Axiom's documentation and the SDK's test values.",
            claims: ["provider-source", "field-prefix", "field-body"],
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "The token is supplied through AXIOM_TOKEN, a token field in the Vector or Fluent Bit sink, an Authorization: Bearer header for OpenTelemetry export, or the service-account password field.",
            claims: ["field-transport"],
          },
          {
            id: "rights",
            unresolved: "Recorded in the research overview without a cited source in this family's contract.",
            text: "An API token is either ingest-only or carries query and dataset-management rights.",
          },
          {
            id: "not-issued",
            unresolved: "No token was issued for this research; one basic, one advanced and one personal token would confirm the layout and letter case.",
            text: "No Axiom token was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "placeholders",
            cls: "provider-documented",
            text: "Documentation placeholders such as xaat-your-api-token do not follow the UUID layout.",
            claims: ["field-placeholders"],
          },
          {
            id: "bare-uuid",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "A bare UUID is not distinctive; the xaat- prefix is what ties a value to this credential.",
          },
        ],
        openQuestions: [
          {
            id: "advanced-tokens",
            unresolved: "Only one documentation example and the SDK's test values show the layout; an issued advanced token would show whether they share the prefix.",
            text: "Do advanced API tokens share the xaat- prefix, and is every body a lowercase UUID?",
          },
        ],
      },
    },
    {
      id: "axiom:personal-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-uuid-body",
            cls: "provider-documented",
            text: "A personal access token is xapt- followed by a lowercase-hex UUID, 41 characters in all. The documentation says it starts with xapt-; the Go SDK checks that prefix at runtime, and its test values use the same UUID layout for both token kinds.",
            claims: ["provider-source", "field-prefix", "field-body"],
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "The token is used with an organization id: AXIOM_TOKEN together with AXIOM_ORG_ID, or an Authorization: Bearer header with the x-axiom-org-id header.",
            claims: ["field-transport"],
          },
          {
            id: "access",
            unresolved: "Recorded in the research overview without a cited source in this family's contract.",
            text: "A personal access token carries the user's full console and API access, including queries over every ingested log.",
          },
          {
            id: "not-issued",
            unresolved: "No token was issued for this research; a structure-only check would confirm the layout and letter case.",
            text: "No Axiom personal access token was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "placeholders",
            cls: "provider-documented",
            text: "Documentation placeholders such as xaat-your-api-token do not follow the UUID layout.",
            claims: ["field-placeholders"],
          },
          {
            id: "bare-uuid",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "A bare UUID is not distinctive; the xapt- prefix is what ties a value to this credential.",
          },
        ],
        openQuestions: [
          {
            id: "personal-token-layout",
            unresolved: "The layout is shared from the SDK's test values for both kinds; no documentation example shows a personal token body, and none was issued.",
            text: "Is every personal access token body a lowercase UUID?",
          },
        ],
      },
    },
  ],
};
