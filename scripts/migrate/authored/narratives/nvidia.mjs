// Authored family narratives for the NVIDIA dossier (benchmarks/support/dossiers/nvidia.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

export default {
  provider: "nvidia",
  dropped: [
    { part: "The 128-byte upper bound on the run", reason: "a project policy for how a scanner treats very long runs, not a provider fact" },
    { part: "Remarks on how an over-long run or a glued identifier is handled", reason: "scanner handling decisions, not credential knowledge" },
    { part: "Suggestion that a uniform width would allow an exact-width contract later", reason: "a possible contract change, not credential knowledge; the width question is carried as an open question" },
  ],
  families: [
    {
      id: "nvidia:ngc-api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "Keys begin nvapi-. NVIDIA's own SDK constant for the scoped key prefix uses it with an executing startswith check, and NVIDIA-owned code treats NGC personal, NGC service and build.nvidia.com keys as sharing the prefix, with no separator or checksum.",
            claims: ["provider-source", "field-prefix"],
          },
          {
            id: "alphabet-and-floor",
            cls: "provider-documented",
            text: "After the prefix come at least 60 characters from letters, digits, underscore and hyphen, open-ended. This comes from a secret-scanning rule authored in an NVIDIA-owned organization (added 2026-05-21); a second NVIDIA rule uses a lower floor of 40 with the same class and contradicts nothing. No provider source states an exact width.",
            claims: ["provider-source", "field-alphabet", "field-floor"],
          },
          {
            id: "dot-in-body",
            cls: "provider-documented",
            text: "Only one looser NVIDIA redaction rule admits a dot in the body, so a body containing a dot is not part of the shape.",
            claims: ["field-dot-in-body"],
          },
          {
            id: "observed-width",
            cls: "tool-corroborated",
            text: "One scanner rule expects exactly 64 characters after the prefix and lags provider-grammar values of 60 to 63 and 65 or more; another scanner rule uses a width of 60 to 70; a third has no NVIDIA rule.",
            claims: ["field-peer-lag", "tool-corroboration"],
          },
          {
            id: "legacy-ngc-key",
            unresolved: "Its structure is tool-inferred and no provider source states it.",
            text: "A legacy NGC key is 84 non-space characters with no prefix and is used as the password for the $oauthtoken registry login.",
            leadClaims: ["field-legacy-ngc-key"],
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "The key is read from the NVIDIA_API_KEY and NGC_API_KEY environment variables and sent as an Authorization Bearer header to integrate.api.nvidia.com, or given as the api_key argument of the chat client.",
            claims: ["field-transport"],
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for this research.",
            text: "No NVIDIA key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "sdk-names",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Names of the NVAPI SDK and its crates (nvapi-sys, nvapi-rs) begin with the same text but fall below the 60-character floor.",
          },
        ],
        openQuestions: [
          {
            id: "kind-widths",
            unresolved: "An issued sample of each of the three key kinds would settle whether their widths are uniform; one scanner expects 64.",
            text: "What widths do the three key kinds have, and are they uniform?",
          },
        ],
      },
    },
  ],
};
