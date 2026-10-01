// Authored family narratives for the Grafana dossier (benchmarks/support/dossiers/grafana.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const SA_BLOG = "https://grafana.com/blog/new-in-grafana-9-1-service-accounts-are-now-ga/";
const CLOUD_GUIDE = "https://grafana.com/docs/grafana-cloud/observe-and-act/agent-observability/get-started/grafana-cloud/";
const PDC_PATH = "https://grafana.com/docs/learning-paths/private-data-source-connect/generate-token/";

export default {
  provider: "grafana",
  dropped: [
    { part: "Candidate: legacy Grafana API key", reason: "out of scope of both families; it survives only as an unresolved collision of the service account token" },
    { part: "Verdict and tier lines, and the intro note on how families are detected", reason: "support and research status, not credential knowledge" },
  ],
  families: [
    {
      id: "grafana:service-account-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-checksum",
            cls: "provider-documented",
            text: "Grafana's 9.1 service-accounts announcement says tokens can be identified by a glsa prefix and that a checksum was added. It states no length.",
            cite: [SA_BLOG],
            claims: ["provider-source"],
          },
          {
            id: "segments",
            cls: "tool-corroborated",
            text: "A token is the literal glsa_, 32 alphanumeric characters, a second underscore, and an 8-character hexadecimal checksum, 46 characters in all. The two separators, the 32 and 8 split and the checksum alphabet come from one scanner's rule, and a second scanner's rule agrees on the glsa_ shape.",
            claims: ["tool-corroboration"],
          },
        ],
        collisions: [
          {
            id: "legacy-api-key",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "The older Grafana API key has no prefix of its own and is a base64-encoded JSON object that begins eyJrIjoi, a different credential.",
          },
        ],
        openQuestions: [
          {
            id: "segment-widths",
            unresolved: "Grafana states no length; the 32 and 8 split is agreed only by scanner rules, and one issued token would confirm it.",
            text: "Is the 32 and 8 split of a service account token confirmed by an issued token?",
          },
        ],
      },
    },
    {
      id: "grafana:cloud-access-policy-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "Grafana Cloud's agent-observability guide says tokens start with glc_, and the private data source connect learning path says the value must begin with glc_. The learning path's wording says the token name, which its context shows to mean the value.",
            cite: [CLOUD_GUIDE, PDC_PATH],
            claims: ["provider-source"],
          },
          {
            id: "body",
            unresolved: "Only scanner rules supply the alphabet, the 32-character floor and the eyJ observation, and the contract holds that corroboration as an unresolved claim; Grafana states no body.",
            text: "After the prefix comes a base64-alphabet body (letters, digits, plus and slash) of at least 32 characters. It is the base64 of a JSON object, so in practice it starts eyJ, and padding equals signs are not part of the matched grammar.",
            leadClaims: ["tool-corroboration"],
          },
        ],
        openQuestions: [
          {
            id: "upper-bound",
            unresolved: "One scanner rule caps the body at 400 characters and another uses a narrower range beginning eyJ; no provider text settles the bound.",
            text: "Is there an upper bound on the length of the body?",
          },
        ],
      },
    },
  ],
};
