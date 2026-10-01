// Authored family narratives for the crates.io dossier (benchmarks/support/dossiers/crates-io.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const TOKEN_RS = "https://github.com/rust-lang/crates.io/blob/7b2475e26337856ab054844c9078bb23c11b2f19/crates/crates_io_database/src/utils/token.rs";
const TRUSTPUB_RS = "https://github.com/rust-lang/crates.io/blob/f937ab051067e793ed647c7b587a5419db85949b/crates/crates_io_trustpub/src/access_token.rs";

export default {
  provider: "crates-io",
  dropped: [
    { part: "Open question 1 (whether a failed check character should ever become an intentional false negative)", reason: "a product decision about how a scanner treats the check character, not credential knowledge; the check character's role is recorded in the family" },
    { part: "Current contract links mentioning an unmerged scanner change", reason: "product policy and scanner state" },
  ],
  families: [
    {
      id: "crates-io:api-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "grammar",
            cls: "provider-documented",
            text: "A crates.io API token is the literal prefix cio followed by exactly 32 letters and digits, 35 characters in all. The registry's server code defines the prefix and a 32-character length and generates the body with a random alphanumeric sampler. Its token parser rejects any token without the prefix, so unprefixed tokens are no longer accepted.",
            cite: [TOKEN_RS],
            claims: ["provider-source", "field-prefix", "field-body"],
          },
          {
            id: "no-checksum",
            unresolved: "The server code read does not show a checksum, but no provider statement says the body has none.",
            text: "The body of an API token carries no checksum.",
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "A token is supplied through the CARGO_REGISTRY_TOKEN variable, the registry token entry of the Cargo credentials file, or the publish command's token option. A token minted by the trusted-publishing exchange in CI is also exported for the publish command.",
            claims: ["field-transport"],
          },
          {
            id: "not-issued",
            unresolved: "No token was issued for this research; the grammar is read from provider source, so none was needed.",
            text: "No API token was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "three-letter-prefix",
            unresolved: "The boundary rule is an authoring choice recorded in an unresolved contract claim, and the accepted miss is a research-note judgement.",
            text: "The prefix cio is only three letters, so the exact body length and a boundary on both sides carry the precision: a token must not be claimed when glued to identifier characters on either side, and cio plus 32 inside a longer alphanumeric run is never truncated. A standalone random 35-character value that happens to start with cio is an accepted false positive.",
            leadClaims: ["field-boundary"],
          },
        ],
      },
    },
    {
      id: "crates-io:trusted-publishing-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "grammar",
            cls: "provider-documented",
            text: "A trusted-publishing token is the literal prefix cio_tp_ followed by exactly 32 letters and digits, 39 characters in all. The registry's server code defines the prefix and generates 31 random alphanumerics, then one check character; its parser requires exactly 32 characters after the prefix.",
            cite: [TRUSTPUB_RS],
            claims: ["provider-source", "field-prefix", "field-body"],
          },
          {
            id: "check-character",
            cls: "provider-documented",
            text: "The 32nd body character is a check character drawn from letters and digits: the XOR of the 31 raw bytes, modulo 62.",
            cite: [TRUSTPUB_RS],
            claims: ["field-checksum"],
          },
          {
            id: "check-never-rejects",
            unresolved: "A handling choice, not a provider fact: the registry code read does not say whether a mismatching check character is rejected on the server side.",
            text: "The check character corroborates a match but does not by itself reject a value that otherwise has the right shape.",
            leadClaims: ["field-policy-checksum"],
          },
        ],
        issuance: [
          {
            id: "short-lived",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "A trusted-publishing token is minted from a CI OIDC exchange and can publish for its short lifetime.",
          },
          {
            id: "transport",
            cls: "provider-documented",
            text: "A trusted-publishing token minted in CI is exported for the publish command, which takes registry tokens from the CARGO_REGISTRY_TOKEN variable, the Cargo credentials file or a command-line option.",
            claims: ["field-transport"],
          },
          {
            id: "not-issued",
            unresolved: "No token was issued for this research; the grammar is read from provider source, so none was needed.",
            text: "No trusted-publishing token was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "api-token-prefix",
            cls: "provider-documented",
            text: "The API-token body excludes the underscore, so a cio_tp_ token is never read as a cio API token.",
            cite: [TOKEN_RS, TRUSTPUB_RS],
            claims: ["field-body"],
          },
        ],
      },
    },
  ],
};
