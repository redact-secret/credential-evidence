// Authored family narratives for the Fireworks AI dossier (benchmarks/support/dossiers/fireworks-ai.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const CREATE_KEY = "https://docs.fireworks.ai/api-reference/create-api-key";
const TUTORIAL = "https://docs.fireworks.ai/tools-sdks/python-client/the-tutorial";

export default {
  provider: "fireworks-ai",
  dropped: [
    { part: "Candidate: fpk_ Fire Pass key", reason: "documented second prefix with unknown body; carried as an unresolved statement, whether it is a family or a sibling is undecided" },
    { part: "Candidate: possible unprefixed legacy key", reason: "no source confirms an older shape; carried as an unresolved statement" },
    { part: "Open question 4 (key names inside the local auth file)", reason: "not documented publicly and not about a credential's shape" },
    { part: "Statement that no scanner has a rule for this prefix", reason: "per-scanner state, not credential knowledge" },
  ],
  families: [
    {
      id: "fireworks-ai:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "An API key begins fw_ (lowercase, with an underscore). The documentation writes keys as fw_ followed by a truncated body, and provider tooling accepts a key only if it starts with fw_ or fpk_ (case-sensitive). No documented length or alphabet exists.",
            cite: [TUTORIAL],
            claims: ["provider-source", "field-prefix", "field-prefix-validation"],
          },
          {
            id: "widths",
            unresolved: "Based on nine distinct public non-placeholder values observed by the maintainers (six with a 22-character body, three with 24); no provider source states a length and a distribution of nine is a hypothesis, not a measurement.",
            text: "The body after fw_ is 22 or 24 characters (25 or 27 in all).",
            leadClaims: ["field-body-length"],
          },
          {
            id: "alphabet",
            unresolved: "The observed values avoided 0, O, I and l, which is consistent with base58 but is an inference; no provider source states the alphabet.",
            text: "The body uses letters and digits, possibly a base58 alphabet.",
            leadClaims: ["field-body-alphabet"],
          },
        ],
        issuance: [
          {
            id: "creation",
            cls: "provider-documented",
            text: "Keys are created in the console (API Keys) or with the firectl command, including for service accounts. The create response returns the key once, together with a prefix field described as the first characters, provided to visually identify the key.",
            cite: [CREATE_KEY],
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for the research; several issued keys would show whether the length varies.",
            text: "No Fireworks AI key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "fire-pass-key",
            unresolved: "The prefix is documented, but its body length and alphabet were not found.",
            text: "Fire Pass keys begin fpk_, share the FIREWORKS_API_KEY variable and are a separate live prefix.",
            leadClaims: ["field-fpk-fire-pass-key"],
          },
          {
            id: "unprefixed-legacy",
            unresolved: "Only older documentation and a third-party scanning-tool documentation page mention an unprefixed form; no source confirms an older shape.",
            text: "Unprefixed older keys may exist.",
            leadClaims: ["field-unprefixed-legacy-key"],
          },
          {
            id: "non-secrets",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "The key id (keyId), the prefix display value, account ids, model paths (accounts/fireworks/models/...), service-account emails, identifiers such as fw_id, fw_version and fw_spec, and a keychain reference written by the fireconnect tool are not keys.",
          },
        ],
        openQuestions: [
          {
            id: "two-widths",
            unresolved: "No source says whether 22 and 24 character bodies come from one generator or two formats.",
            text: "Are 22 and 24 character bodies one generator (base58 length variance) or two formats?",
          },
          {
            id: "unprefixed-validity",
            unresolved: "Pre-2024 documentation shows no prefix; no source says whether an unprefixed format existed or whether such keys still work.",
            text: "Did an unprefixed format exist, and do such keys still work?",
          },
          {
            id: "scoped-keys",
            unresolved: "No source compares training-scoped, secure or service-account keys with ordinary ones.",
            text: "Do training-scoped, secure or service-account keys differ lexically?",
          },
        ],
      },
    },
  ],
};
