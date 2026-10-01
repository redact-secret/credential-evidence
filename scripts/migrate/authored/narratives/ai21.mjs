// Authored family narratives for the AI21 dossier (benchmarks/support/dossiers/ai21.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const CREATE_KEY = "https://docs.ai21.com/docs/create-api-key";
const AI21_EXAMPLE = "https://github.com/AI21Labs/ai21-python/blob/bbc422f6f955134c2e33a9473ec0f71d21611764/examples/studio/batches/batches.py#L6";

export default {
  provider: "ai21",
  dropped: [
    { part: "Open question 2 (tier of the family) and the benchmark-contract and research-log bullets", reason: "verdict, tier and scanner-contract bookkeeping are not credential knowledge" },
    { part: "Open question 3 (the absence of an AI21 detector in one scanner's list)", reason: "a statement about a scanner's rule list, not about the credential" },
    { part: "Open question 4 (search debts: two community spaces unreachable, API reference page not re-located)", reason: "research workflow state, not credential knowledge" },
  ],
  families: [
    {
      id: "ai21:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "thirty-two-alphanumerics",
            cls: "tool-corroborated",
            text: "A key is 32 mixed-case letters and digits with no prefix. A peer scanner rule and two independent implementations agree on exactly 32 characters from that alphabet; no provider text states the shape.",
            claims: ["tool-corroboration", "field-shape"],
          },
          {
            id: "no-prefix-or-checksum",
            unresolved: "Neither a prefix nor a checksum was observed or documented, and the provider says nothing either way.",
            text: "The key carries no prefix and no checksum.",
            leadClaims: ["field-prefix-and-checksum"],
          },
          {
            id: "no-validation-in-sdk",
            cls: "provider-documented",
            text: "The provider's Python SDK reads the key from the AI21_API_KEY environment variable and sends it as a Bearer token, with no prefix, length or alphabet validation.",
            claims: ["field-context"],
          },
          {
            id: "provider-committed-literals",
            unresolved: "Whether a provider-committed literal of unknown validity counts as a provider example or as a leak is an undecided maintainer question; the literals' validity was not tested.",
            text: "AI21 staff committed key literals to the provider's own example code and a 2023 demo app: six literals, each 32 mixed-case alphanumerics and none a UUID.",
            lead: [AI21_EXAMPLE],
          },
          {
            id: "other-widths-reported",
            unresolved: "A removed scanner rule read a UUID after an ai21 keyword and another tool reads 40 to 64 alphanumerics; no provider source settles either, though every literal found contradicts both.",
            text: "A UUID, or 40 to 64 alphanumerics, have been read as AI21 keys by other tools.",
            leadClaims: ["field-other-widths"],
          },
        ],
        issuance: [
          {
            id: "studio-create-key",
            cls: "provider-documented",
            text: "Keys are created in AI21 Studio under Settings, then API Keys, with Create new key. The documentation says the key is shown once, that only its last characters are visible afterwards, and that anyone holding it can call the API.",
            cite: [CREATE_KEY],
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for this research; a checklist of length, character set, fixed segments, case mix, the masked suffix shown afterwards and a second workspace was drawn up but not performed.",
            text: "No AI21 key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "context-gated",
            cls: "provider-documented",
            text: "Because the key has no prefix, a bare 32-character alphanumeric run is not distinctive; the surrounding AI21 name, host or SDK constructor is what ties a value to this credential.",
            claims: ["field-context"],
          },
          {
            id: "look-alike-strings",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "MD5 and other 32-character hashes, dash-less UUIDs, session ids and other vendors' 32-byte keys have the same shape.",
          },
          {
            id: "non-secret-settings",
            cls: "provider-documented",
            text: "The AI21_API_HOST, AI21_API_VERSION and AI21_AWS_REGION settings, and the masked suffix the console shows after creation, are not credentials.",
            claims: ["field-non-secrets"],
          },
        ],
        openQuestions: [
          {
            id: "real-shape",
            unresolved: "No issued key and no provider statement of the shape exist; keys from before the Jamba rebuild of Studio may differ.",
            text: "Is 32 mixed-case alphanumerics correct for every key, and did Studio-era keys before the Jamba rebuild differ?",
          },
        ],
      },
    },
  ],
};
