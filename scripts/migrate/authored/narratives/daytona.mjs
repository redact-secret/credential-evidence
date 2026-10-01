// Authored family narratives for the Daytona dossier (benchmarks/support/dossiers/daytona.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const API_KEY_TS = "https://github.com/daytonaio/daytona/blob/01c502bb1f1ff8f2885d0cd490e043736083dca8/apps/api/src/common/utils/api-key.ts";
const DOCS_DUMP = "https://www.daytona.io/docs/llms-full.txt";

export default {
  provider: "daytona",
  dropped: [
    { part: "Candidate: self-provisioned runner keys (unprefixed 64 hex)", reason: "not attributable and not a family; kept only as a collision of the API key" },
    { part: "Candidate: legacy self-hosted keys (unprefixed base64 of a UUID string)", reason: "no prefix and no source in the family contract; not a family" },
    { part: "Candidate: `DAYTONA_JWT_TOKEN` and OAuth access tokens", reason: "JWTs, not a Daytona-specific shape; not a family" },
  ],
  families: [
    {
      id: "daytona:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "generator",
            cls: "provider-documented",
            text: "An API key is the prefix dtn_ followed by exactly 64 lowercase hexadecimal characters (32 random bytes), 68 characters in all, with no separator and no checksum. The provider's generator returns the prefix plus 32 random bytes hex-encoded; the same inline form has been in the public source since 2025-04-28.",
            cite: [API_KEY_TS],
            claims: ["provider-source", "field-prefix", "field-body", "field-separators"],
          },
          {
            id: "dated",
            cls: "provider-documented",
            text: "The grammar is read from the generator as of version 0.190.0 (2026-06-23), the last public version, and is not a statement about the live cloud. Development moved to a private codebase in June 2026; later public sources (client OpenAPI and command-line code, deployment scripts, SDK, documentation dump) name the prefix only, and none contradicts the generator.",
            cite: [API_KEY_TS, DOCS_DUMP],
            claims: ["provider-source", "field-body"],
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "A key is supplied through the DAYTONA_API_KEY environment variable and sent as a Bearer authorization header. The SDK configuration object and the Terraform provider variable also take it.",
            claims: ["field-transport"],
          },
          {
            id: "shared-generator",
            cls: "provider-documented",
            text: "The same generator also mints region proxy, SSH-gateway and runner keys, which are lexically identical to an API key.",
            cite: [API_KEY_TS],
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for this research; an optional issuance check would move the as-of date from the generator's release to the issuance date.",
            text: "No Daytona key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "sha256-shape",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Without the prefix the body is a 64-character hexadecimal value like a SHA-256 digest, including the hash Daytona stores for a key, so the prefix carries the attribution. A self-provisioned runner key made with a random-bytes command is unprefixed 64 hexadecimal characters and cannot be attributed.",
            leadClaims: ["field-self-provisioned-runner-key"],
          },
          {
            id: "dtn-identifiers",
            unresolved: "The boundary rule is an authoring choice, and the identifier forms come from a research note without a cited source.",
            text: "Placeholder identifiers such as dtn_secret_ followed by random characters, and dtn_artifact_ markers, are not credentials; a key glued to identifier characters on either side is not claimed.",
            leadClaims: ["field-boundary"],
          },
        ],
        openQuestions: [
          {
            id: "live-cloud",
            unresolved: "Nothing observed from the live cloud; one issued and revoked key would settle it.",
            text: "Does the live cloud still issue dtn_ followed by 64 lowercase hexadecimal characters?",
          },
        ],
      },
    },
  ],
};
