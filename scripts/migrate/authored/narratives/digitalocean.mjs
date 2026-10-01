// Authored family narratives for the DigitalOcean dossier (benchmarks/support/dossiers/digitalocean.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).
//
// The three token kinds share one grammar apart from a three-letter prefix, so they are built
// from one parameterised block.

const RELEASE_NOTES = "https://docs.digitalocean.com/release-notes/api/";
const OAUTH_REF = "https://docs.digitalocean.com/reference/api/oauth/";

// [id, prefix, what the dossier calls it]
const KINDS = [
  ["digitalocean:personal-access-token", "dop_v1_", "personal access token"],
  ["digitalocean:oauth-token", "doo_v1_", "OAuth access token"],
  ["digitalocean:refresh-token", "dor_v1_", "OAuth refresh token"],
];

function kindFamily([id, prefix, name]) {
  const siblings = KINDS.filter(([i]) => i !== id).map(([, p]) => p).join(" and ");
  const family = {
    id,
    status: "migrated",
    sections: {
      shape: [
        {
          id: "prefix",
          cls: "provider-documented",
          text: `A DigitalOcean ${name} begins ${prefix}. The prefix comes from the 2022-03-29 API release notes, which introduced a versioned token format with one prefix per token kind.`,
          cite: [RELEASE_NOTES],
          claims: ["provider-source"],
        },
        {
          id: "length-64",
          cls: "provider-documented",
          text: "The body is 64 characters. The provider's OAuth reference examples show 64-character bodies, but the example bodies contain placeholder text that is not hexadecimal, so they establish the length and not the alphabet.",
          cite: [OAUTH_REF],
        },
        {
          id: "alphabet",
          cls: "tool-corroborated",
          text: "The body is lowercase hexadecimal. Two scanner rules agree on this, in one combined rule for the three prefixes, and the provider's placeholders do not contradict or confirm it.",
          claims: ["tool-corroboration"],
        },
      ],
      collisions: [
        {
          id: "sibling-prefixes",
          cls: "provider-documented",
          text: `The ${siblings} tokens are the same shape and differ only in the last letter before _v1_, so the prefix alone says which kind a token is. Uppercase or mixed-case bodies are not described by the grammar.`,
          cite: [RELEASE_NOTES],
          claims: ["provider-source"],
        },
      ],
      openQuestions: [
        {
          id: "alphabet-question",
          unresolved: "The provider's examples are placeholders, and no issued token of this kind was measured.",
          text: "Is the body always lowercase hexadecimal?",
        },
      ],
    },
  };
  if (id === "digitalocean:refresh-token") {
    family.sections.collisions.push({
      id: "case-insensitive-rule",
      cls: "tool-corroborated",
      text: "One scanner's refresh-token rule alone is case-insensitive; this is treated as an artifact of that rule and is not adopted as evidence that uppercase bodies exist.",
      claims: ["tool-corroboration"],
    });
  }
  return family;
}

export default {
  provider: "digitalocean",
  dropped: [
    { part: "Candidate: DigitalOcean System Token", reason: "listed in a partner list but no consulted source shows its shape; not a family" },
    { part: "Candidate: `dop_v2_` and sibling future versions", reason: "no source exists; recorded as an intentional miss in product policy, not credential knowledge" },
    { part: "Open question 2 (system token and later versions)", reason: "about candidates that are not families" },
  ],
  families: KINDS.map(kindFamily),
};
