// Authored family narratives for the RunPod dossier (benchmarks/support/dossiers/runpod.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

export default {
  provider: "runpod",
  dropped: [
    { part: "Candidate: S3-compatible rps_ secrets and access keys", reason: "a different credential with no researched shape; carried as an unresolved collision statement" },
    { part: "Candidate: legacy unprefixed keys (before 2024-11)", reason: "no prefix and not researched; carried in the same collision statement" },
    { part: "Scanner rule differences and the false-negative acceptance for 16 to 30 character bodies", reason: "scanner coverage and matching policy of the project, not credential knowledge" },
  ],
  families: [
    {
      id: "runpod:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "New API keys begin rpa_ (RunPod's 2024-11 post on scoped keys says any new keys are created with this prefix), with no separator or checksum.",
            claims: ["field-prefix"],
          },
          {
            id: "alphabet-and-provider-floor",
            cls: "provider-documented",
            text: "After the prefix the body is letters and digits and open-ended. A scrubber authored by the provider in its own repository (added 2026-09-16) matches rpa_ followed by 16 or more letters and digits, which is the provider-side floor.",
            claims: ["provider-source", "field-alphabet", "field-provider-floor"],
          },
          {
            id: "observed-layout",
            cls: "tool-corroborated",
            text: "Every observed body is 46 characters: 40 upper-case letters or digits followed by 6 mixed letters and digits. This layout is an observed regularity, not a stated grammar.",
            claims: ["field-observed-layout"],
          },
          {
            id: "floor-and-cap",
            unresolved: "The provider's own floor is 16 and it states no cap; a floor of 31 and a cap of 128 characters are project matching choices, not provider facts.",
            text: "A key body has at least 31 and at most 128 characters.",
            leadClaims: ["field-policy-floor", "field-policy-upper-bound"],
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "The key is read from the RUNPOD_API_KEY environment variable and sent as Authorization: Bearer to the REST and GraphQL APIs; the Python SDK takes it as runpod.api_key and the runpodctl tool through its config command.",
            claims: ["field-transport"],
          },
          {
            id: "scopes",
            unresolved: "Recorded in a research note without a cited source in this family's contract; no key was issued.",
            text: "A key is scoped All or Read Only and both scopes share the rpa_ prefix; an All key can create, stop and terminate pods and endpoints on the account's balance.",
          },
        ],
        collisions: [
          {
            id: "redirect-pizza",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Tokens of another service (Redirect.pizza) are rpa_ followed by 30 characters, so a floor as low as 16 would take them for RunPod keys; a longer token of that service, if one exists, would read as a RunPod key.",
            leadClaims: ["field-policy-floor"],
          },
          {
            id: "other-credentials",
            unresolved: "These credentials were not researched; only a research note records them as separate.",
            text: "S3-compatible rps_ secrets and access keys, and legacy keys with no prefix, are separate credentials.",
            leadClaims: ["field-other-credentials"],
          },
        ],
        openQuestions: [
          {
            id: "uniform-46",
            unresolved: "An issued All key and an issued Read Only key would show whether the body is a uniform 46 characters.",
            text: "Is the body a uniform 46 characters across key scopes?",
          },
        ],
      },
    },
  ],
};
