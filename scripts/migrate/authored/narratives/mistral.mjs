// Authored family narratives for the Mistral dossier (benchmarks/support/dossiers/mistral.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const OPENAPI = "https://github.com/mistralai/platform-docs-public/blob/ecac75b617af32e87a6d59c5d9e39e7029fc35db/openapi-public-doc.yaml";
const GITLENS = "https://github.com/gitkraken/vscode-gitlens/blob/6492b560fd704d62fc6e0bd4f86c4daa06a4d8e1/packages/plus/ai/src/providers/mistralProvider.ts";
const CLIENT_AUTH = "https://docs.mistral.ai/studio-api/audio/speech_to_text/realtime_transcription/client_auth";
const CLIENTSECRET = "https://github.com/mistralai/client-python/blob/878fdda2ab8ad64439da729a9cfa23eb195dd73f/src/mistralai/client/models/clientsecret.py";
const KEYS_ADMIN = "https://docs.mistral.ai/admin/identity-access/api-keys";

export default {
  provider: "mistral",
  dropped: [
    { part: "Candidate: Codestral keys", reason: "whether they share the Studio shape is undocumented; carried as an unresolved sibling statement on the api-key family, not a family" },
    { part: "Open question 2 (verdict history and maintainer scope direction)", reason: "governance and issue history, not credential knowledge" },
    { part: "Open question 6 (Reddit blocked in both passes)", reason: "a research-coverage remark; carried only where it affects a statement" },
    { part: "Remaining gates described as product false negatives", reason: "scanner behaviour, not credential knowledge" },
    { part: "Taxonomy id naming note (research name studio-api-key)", reason: "an internal identifier history, not credential knowledge" },
  ],
  families: [
    {
      id: "mistral:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "no-prefix-32-alnum",
            cls: "tool-corroborated",
            text: "A Studio API key has no prefix and is 32 letters and digits, recognised by scanner rules only beside Mistral context on the same line (a mistral or codestral name, the api.mistral.ai host or a Mistral constructor argument). The rules come from one repeated assertion rather than three measurements of real keys, and both upper- and lowercase letters occur in their positives.",
            claims: ["field-shape", "field-context", "field-body-case", "tool-corroboration"],
          },
          {
            id: "provider-example",
            cls: "provider-documented",
            text: "Provider prose states no shape and the SDK types the key as a plain optional string without validation, but Mistral's own public API schema for the key-management object shows one full-length example key of exactly 32 letters and digits.",
            cite: [OPENAPI],
          },
          {
            id: "client-validator",
            cls: "tool-corroborated",
            text: "An editor extension's provider integration validates a Mistral key as exactly 32 letters and digits, which agrees with the provider example. Two further client projects are reported to do the same.",
            cite: [GITLENS],
          },
          {
            id: "second-prefixed-key",
            unresolved: "A third-party scanner catalogue lists a second, prefixed Mistral key with an undisclosed prefix; no Mistral source mentions one.",
            text: "A second, prefixed Studio key generation exists.",
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "The key is supplied as the MISTRAL_API_KEY environment variable, as the api_key argument of the client, and as an Authorization Bearer header.",
            claims: ["field-transport"],
          },
          {
            id: "console-creation",
            cls: "provider-documented",
            text: "The key-management page of Mistral's administration documentation covers creating keys in the console.",
            cite: [KEYS_ADMIN],
          },
          {
            id: "console-details",
            unresolved: "Recorded in a research note from the console without a cited source in this family's contract; no key was issued.",
            text: "The console's Create new key action takes a name and an expiry, may take a few minutes before the key is usable, and offers a connector scope option. Codestral keys use a separate console tab and their shape is undocumented.",
          },
        ],
        collisions: [
          {
            id: "hex-near-mistral",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Any 32-character hash, request id or other vendor's 32-character key near the word mistral looks the same. Model ids such as mistral-large-latest are benign.",
          },
          {
            id: "realtime-token",
            unresolved: "The shape of the realtime client token is recorded as a separate family; this contract holds no claim for the sibling.",
            text: "The realtime client token is minted with this key and has a different shape.",
            leadClaims: ["field-sibling-shapes"],
          },
        ],
        openQuestions: [
          {
            id: "always-32",
            unresolved: "One issued key would settle whether every key is 32 letters and digits and whether keys created before workspaces differ.",
            text: "Is the Studio key always 32 letters and digits, and did earlier keys differ?",
          },
        ],
      },
    },
    {
      id: "mistral:realtime-client-token",
      status: "partial",
      note: "Prefix and carriers are covered; body grammar, lifetime and issuance checks are unresolved because no token was minted.",
      sections: {
        shape: [
          {
            id: "prefix-opaque-body",
            cls: "provider-documented",
            text: "The realtime client token begins rt_ and its body is opaque. It is minted by the client sessions endpoint, returned as the client secret value, and sent by the browser in the Sec-WebSocket-Protocol header as the word realtime, a comma and the token, which the page describes as the only supported transport. The token is scoped to a single model and reusable until it expires. The Python SDK types the value as a plain string.",
            cite: [CLIENT_AUTH, CLIENTSECRET],
          },
          {
            id: "body-grammar",
            unresolved: "No source states the length, alphabet or checksum; they are unknown until a token is minted.",
            text: "The token body has a known length and alphabet.",
          },
        ],
        issuance: [
          {
            id: "requires-studio-key",
            unresolved: "Recorded in a research note without a cited source in this family's contract; no token was minted.",
            text: "Minting needs a Studio key holding the create_client_session permission.",
          },
        ],
        lifecycle: [
          {
            id: "lifetime",
            unresolved: "The page states about 900 seconds while its own example and search snippets suggest 60 seconds, and the SDK exposes a ttl_seconds setting, so the lifetime is configurable and the documentation drifts.",
            text: "The token lifetime is about 900 seconds.",
            lead: [CLIENT_AUTH],
          },
        ],
        collisions: [
          {
            id: "rt-identifier-prefix",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "The prefix rt_ is a common identifier prefix (for example rt_config and rt_timeout), so a rule on the prefix alone would match unrelated names. The token is not the Studio key.",
          },
        ],
        openQuestions: [
          {
            id: "bearer-acceptance",
            unresolved: "No source states whether the realtime endpoint accepts the token as a Bearer value.",
            text: "Does the realtime endpoint accept the token as an Authorization Bearer value?",
          },
        ],
      },
    },
  ],
};
