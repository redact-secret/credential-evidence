// Authored family narratives for the Honeycomb dossier (benchmarks/support/dossiers/honeycomb.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const AUTH_DOC = "https://docs.honeycomb.io/api/authentication";
const LIBHONEY_PY = "https://github.com/honeycombio/libhoney-py/blob/11b59417c1df1d97384dc5e870f2ea462da02b80/libhoney/client.py#L11-L18";
const LIBHONEY_GO = "https://github.com/honeycombio/libhoney-go/blob/02e9dbf361012fafbe8698f429b65630500dc10a/libhoney.go#L74-L178";

export default {
  provider: "honeycomb",
  dropped: [
    { part: "Candidate: management key (hc?mk_ + 26 + colon + 32)", reason: "not a family yet; issuance-gated, carried as an unresolved statement of the ingest key" },
    { part: "Candidate: configuration keys (22 characters) and classic keys (32 hexadecimal)", reason: "no distinctive shape, so not families" },
    { part: "Research log and contract-link lines", reason: "issue workflow and product policy, not credential knowledge" },
  ],
  families: [
    {
      id: "honeycomb:ingest-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "An ingest key starts with hc, one lowercase letter, then ik_ for an environment key or ic_ for a classic key. Honeycomb's authentication page says the letter varies and is assigned at key creation, and two of its SDKs carry the classic expression.",
            cite: [AUTH_DOC, LIBHONEY_PY, LIBHONEY_GO],
            claims: ["field-prefix", "provider-source"],
          },
          {
            id: "body",
            cls: "provider-documented",
            text: "After the prefix come exactly 58 lowercase letters and digits, 64 characters in all. The key is the key id and the secret concatenated with no separator. The length comes from the documentation placeholder and from a 64-byte gate in the Go SDK.",
            cite: [AUTH_DOC, LIBHONEY_GO],
            claims: ["field-body-length", "field-alphabet"],
          },
          {
            id: "transport",
            cls: "provider-documented",
            text: "An ingest key is passed in the HONEYCOMB_API_KEY variable, the X-Honeycomb-Team header, the OpenTelemetry exporter headers variable or collector headers map, and the SDK initialisation call.",
            claims: ["field-transport"],
          },
        ],
        issuance: [
          {
            id: "not-issued",
            unresolved: "No key was issued; the grammar rests on provider documentation and SDK code.",
            text: "No Honeycomb key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "non-secret-ids",
            cls: "provider-documented",
            text: "The first 26 characters of the body are the key id, a non-secret identifier. Configuration-key and environment ids, with prefixes hc?lk_ and hc?en_, are also non-secret, and a 26-character run alone is not an ingest key.",
            cite: [AUTH_DOC],
            claims: ["field-key-id"],
          },
          {
            id: "management-key",
            unresolved: "The prefix and segment lengths of a management key are documented but the alphabet of both segments was not found, and an issued key would settle it.",
            text: "A management key is hc, a letter, mk_, 26 characters, a colon and 32 characters, and manages environments and API keys for the team.",
            leadClaims: ["field-management-key"],
          },
          {
            id: "classic-config-keys",
            cls: "tool-corroborated",
            text: "Configuration keys (22 unprefixed alphanumerics) and classic keys (32 hexadecimal characters) have no distinctive shape. One scanner rule is keyword-gated on Honeycomb and matches only those two shapes, so it misses every ingest key.",
            claims: ["field-peer-lag"],
          },
        ],
        openQuestions: [
          {
            id: "management-alphabets",
            unresolved: "One issued and revoked key, structure only, would settle the alphabet classes of the 26- and 32-character segments; the documentation placeholder is digits only.",
            text: "What are the alphabet classes of the two segments of a management key?",
            leadClaims: ["field-management-key"],
          },
        ],
      },
    },
  ],
};
