// Authored family narratives for the RubyGems.org dossier (benchmarks/support/dossiers/rubygems.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const KEYABLE = "https://github.com/rubygems/rubygems.org/blob/d4cfcc961d08cb5f661f2e5dc0081736233b97ec/app/controllers/concerns/api_keyable.rb#L19-L21";

export default {
  provider: "rubygems",
  dropped: [
    { part: "GitHub partner pattern for RubyGems keys with push protection", reason: "scanner and platform coverage, not credential knowledge; no source record is cited for it" },
    { part: "Candidate: legacy unprefixed keys", reason: "carried as an unresolved collision statement, not a family" },
    { part: "Open questions (none open) and research log", reason: "empty section and issue workflow" },
  ],
  families: [
    {
      id: "rubygems:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-body",
            cls: "provider-documented",
            text: "A RubyGems.org API key is the prefix rubygems_ followed by exactly 48 lowercase hexadecimal characters (24 random bytes), 57 characters in all, with no checksum. The provider's own key-generation code builds it that way.",
            cite: [KEYABLE],
            claims: ["field-prefix", "field-body", "provider-source"],
          },
          {
            id: "scanner-rules-agree",
            cls: "tool-corroborated",
            text: "Scanner rules agree with the grammar: one reads the 48 characters as lowercase hexadecimal and only requires a trailing delimiter, and another matches the same length with a character-class typo that admits letters it should not.",
            claims: ["tool-corroboration", "field-peer-lag"],
          },
          {
            id: "carriers",
            unresolved: "The contract's carrier statement rests on a project research note and not on a provider source.",
            text: "The key is carried in the GEM_HOST_API_KEY environment variable, in the :rubygems_api_key: line of ~/.gem/credentials, and as a bare Authorization header value with no scheme.",
            leadClaims: ["field-transport"],
          },
        ],
        issuance: [
          {
            id: "not-issued",
            unresolved: "No key was issued for this research; the grammar comes from the provider's key-generation code, so no sample was needed.",
            text: "No RubyGems.org API key was issued or observed for this record.",
          },
          {
            id: "scopes",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "A key can push and yank gems and manage owners within its scopes, so a leak is a supply-chain risk for every gem the account owns.",
          },
        ],
        lifecycle: [
          {
            id: "oidc-short-lived",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Short-lived keys obtained by an OIDC exchange come from the same key generator and have the same shape.",
          },
        ],
        collisions: [
          {
            id: "gemspec-metadata-keys",
            unresolved: "The contract's statement rests on a project research note and not on a provider source.",
            text: "The gemspec metadata keys rubygems_version and rubygems_mfa_required start with the prefix but are not credentials, and they fail the 48-hexadecimal body.",
            leadClaims: ["field-metadata-keys"],
          },
          {
            id: "legacy-unprefixed",
            unresolved: "Recorded in a research note without a cited source; no shape is documented for the older keys.",
            text: "Older RubyGems keys without the rubygems_ prefix have no distinctive shape.",
          },
        ],
      },
    },
  ],
};
