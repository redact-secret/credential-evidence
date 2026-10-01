// Authored family narratives for the Helicone dossier (benchmarks/support/dossiers/helicone.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const AUTH_DOC = "https://docs.helicone.ai/helicone-headers/helicone-auth";
const REGEX = "https://github.com/Helicone/helicone/blob/067d9290acb4f1fc9320e902fc67b4b399b50363/worker/src/lib/util/apiKeyRegex.ts";
const GENERATOR = "https://github.com/Helicone/helicone/blob/067d9290acb4f1fc9320e902fc67b4b399b50363/web/utils/generateAPIKeyHelper.ts";

const grammar = (role, kindText) => [
  {
    id: "grammar",
    cls: "provider-documented",
    text: `${kindText} The key is ${role}-helicone, then an optional -eu segment, then an optional -rl segment in that order, then a hyphen and four groups of exactly 7 characters from lowercase letters and digits joined by hyphens. The length is 43 characters, 46 with one optional segment, and 49 with both. This comes from Helicone's own worker validation expressions and key generators, which were unchanged when re-checked on 2026-09-28; the -rl segment was added on 2025-04-29.`,
    cite: [REGEX, GENERATOR],
    claims: ["provider-source", "field-role-prefix", "field-provider-segment", "field-optional-segments", "field-groups"],
  },
  {
    id: "alphabet-wider-than-generator",
    unresolved: "The generator's library emits only the base32 alphabet (a to z and 2 to 7, with the last character of each group one of a, i, q or y), but the provider's validation accepts the wider lowercase-and-digit class; the narrower alphabet is a generator detail and no source says keys are limited to it.",
    text: "Issued keys may use only a base32 subset of the lowercase-and-digit alphabet.",
    leadClaims: ["field-alphabet-narrowing"],
  },
];

const legacyCollision = {
  id: "unattributable-shapes",
  cls: "provider-documented",
  text: "A legacy bare sk- key followed by four groups of 7 characters, which has no helicone segment and is 34 characters long, cannot be attributed to Helicone and overlaps the generic sk- space. Customer-portal keys with a -cp- marker also carry no provider segment, and -gov combinations carry no helicone token or are unresolved.",
  claims: ["field-unattributable-shapes"],
};

const govQuestion = {
  id: "gov-combinations",
  unresolved: "The dashboard generator can produce -gov combinations but no validation expression matches them, and only an issuance check on one would show whether they are accepted.",
  text: "Does Helicone's validation accept keys with a -gov segment?",
};

const notIssued = {
  id: "not-issued",
  unresolved: "No key was issued or observed for this record; the checklist also asks whether -gov combinations are accepted.",
  text: "No Helicone key of this kind was issued.",
};

const placeholder = (role) => ({
  id: "placeholder-shape",
  unresolved: "Recorded in research notes as an accepted false positive; no source says Helicone documents such a placeholder.",
  text: `A placeholder made of ${role}-helicone and four groups of 7 letter x has the exact key shape, so it cannot be told from a real key by form.`,
  leadClaims: ["field-exact-width-placeholder"],
});

export default {
  provider: "helicone",
  dropped: [
    { part: "Candidates: legacy bare sk- keys and customer-portal -cp- keys; -gov combinations", reason: "not families; they are carried as unattributable-shape collisions and an open question" },
    { part: "Open question 2: whether a policy should treat pk- as warn rather than redact", reason: "a product choice recorded in a handoff, not a research fact" },
    { part: "Research log, ruling references and disposition record", reason: "issue workflow, not credential knowledge" },
  ],
  families: [
    {
      id: "helicone:api-key",
      status: "migrated",
      sections: {
        shape: [
          ...grammar("sk", "Helicone read-write keys use the role sk. The role is documented on Helicone's authentication header page, which describes the Bearer key sent in the Helicone-Auth header."),
          {
            id: "proxy-key",
            cls: "provider-documented",
            text: "A proxy key form exists: sk-helicone-proxy-, the four 7-character groups, a hyphen and a lowercase 8-4-4-4-12 UUID, 86 characters in all. Helicone's server generator builds it.",
            cite: [AUTH_DOC],
            claims: ["field-proxy-key"],
          },
          {
            id: "boundary",
            unresolved: "Recorded in a research note without a source in this family's contract; it is a rule for matching, not a fact about the credential.",
            text: "A key glued to an identifier character on either side is not a key, and a slash delimits the gateway URL-path form.",
            leadClaims: ["field-boundary"],
          },
        ],
        issuance: [notIssued],
        collisions: [
          legacyCollision,
          placeholder("sk"),
          {
            id: "no-scanner-rule",
            cls: "tool-corroborated",
            text: "Neither of the two scanners examined has a rule for Helicone keys.",
            claims: ["field-peer-lag"],
          },
        ],
        openQuestions: [govQuestion],
      },
    },
    {
      id: "helicone:write-api-key",
      status: "migrated",
      sections: {
        shape: [
          ...grammar("pk", "Helicone write-only keys use the role pk. Helicone's authentication header page names pk- as the write-only key."),
          {
            id: "credential-not-public",
            cls: "provider-documented",
            text: "Helicone documents a pk- key as an API key with write permission, and no provider source calls it public. The documentation allows placing it in a URL path, which is a transport convenience and does not make it public.",
            cite: [AUTH_DOC],
            claims: ["field-pk-policy"],
          },
        ],
        issuance: [notIssued],
        collisions: [
          legacyCollision,
          placeholder("pk"),
          {
            id: "no-scanner-rule",
            cls: "tool-corroborated",
            text: "Neither of the two scanners examined has a rule for Helicone keys.",
            claims: ["field-peer-lag"],
          },
        ],
        openQuestions: [govQuestion],
      },
    },
  ],
};
