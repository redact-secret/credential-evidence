// Authored family narratives for the New Relic dossier (benchmarks/support/dossiers/new-relic.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const IBM_MQ = "https://docs.newrelic.com/docs/opentelemetry/integrations/ibm-mq/host/";
const EBPF_K8S = "https://docs.newrelic.com/docs/ebpf/k8s-installation/";
const EBPF_LINUX = "https://docs.newrelic.com/docs/ebpf/linux-installation/";
const API_KEYS = "https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/";

export default {
  provider: "new-relic",
  dropped: [
    { part: "Candidate: other New Relic key types (browser and Insights keys)", reason: "not researched and not recorded as a family; nothing to record" },
    { part: "Open question 1 (whether the product contract keeps FFFF or only NRAL)", reason: "a question about a scanner contract, not credential knowledge" },
    { part: "Remark that suffixed shapes need no same-line keyword after a product change", reason: "scanner behaviour, not credential knowledge" },
    { part: "Empirical check of fresh Ingest - License keys specified in a search pass", reason: "a plan for issuance not performed; recorded only as an unresolved issuance statement" },
  ],
  families: [
    {
      id: "new-relic:user-api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "New Relic's documentation says most user keys begin with the prefix NRAK-, so a user key without it is a case the provider documents as possible. The documentation page shows only a masked NRAK- placeholder.",
            claims: ["provider-source"],
          },
          {
            id: "body",
            cls: "tool-corroborated",
            text: "After NRAK- come 27 uppercase letters and digits, according to two scanner rules that agree.",
            claims: ["tool-corroboration"],
          },
        ],
        issuance: [
          {
            id: "not-issued",
            unresolved: "No key was issued for this research.",
            text: "No New Relic user key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "license-key-doc-error",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "NRAK- appears on one New Relic documentation page as the expected prefix of a license key, which reads as a documentation error.",
          },
        ],
      },
    },
    {
      id: "new-relic:license-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "suffix-and-length",
            cls: "provider-documented",
            text: "New Relic's own documentation describes the ingest license key as 40 characters with the literal suffix NRAL, and its eBPF install pages show elided examples ending FFFFNRAL.",
            cite: [IBM_MQ, EBPF_K8S, EBPF_LINUX],
            claims: ["provider-source"],
          },
          {
            id: "current-generation",
            unresolved: "The hexadecimal body, the FFFF segment and the eu01xx region prefix rest on New Relic-authored code (its CLI's license-key format check and the documentation site's key checker) and one scanner rule; none of those sources is cited by this family's contract.",
            text: "The current generation is 32 lowercase hexadecimal characters followed by FFFFNRAL (40 in all), or for the EU region eu01xx, 26 hexadecimal characters and FFFFNRAL.",
            leadClaims: ["tool-corroboration"],
          },
          {
            id: "older-generations",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "An older generation is 36 hexadecimal characters followed by NRAL, and a legacy 40-character all-hexadecimal key has no marker.",
          },
          {
            id: "canonical-page-contradicts",
            cls: "provider-documented",
            text: "The canonical API-keys page still calls the license key a 40-character hexadecimal string, which contradicts the NRAL suffix unless it describes the legacy key.",
            cite: [API_KEYS],
          },
        ],
        issuance: [
          {
            id: "not-issued",
            unresolved: "No key was issued for this research; an empirical check of fresh Ingest - License keys was planned but not performed.",
            text: "No New Relic license key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "sha1-collision",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "The legacy all-hexadecimal shape collides with SHA-1 digests and commit ids.",
          },
        ],
        openQuestions: [
          {
            id: "older-nral-issued",
            unresolved: "No source states whether the 36-hexadecimal NRAL generation is still issued.",
            text: "Is the 36-hexadecimal NRAL generation still issued?",
          },
          {
            id: "region-prefixes",
            unresolved: "A real EU key was reported with a single x (eu01x) and staff said parsers read up to the first x; the report is not in this family's contract, and New Relic code also maps other region prefixes (us01, gov01, jp).",
            text: "Which region prefixes exist beyond eu01xx?",
          },
          {
            id: "docs-disagree",
            unresolved: "Two documentation pages disagree (the hexadecimal description and an NRAK-prefixed license key); provider clarification would settle both.",
            text: "Which description of the license key is right where the documentation pages disagree?",
          },
        ],
      },
    },
  ],
};
