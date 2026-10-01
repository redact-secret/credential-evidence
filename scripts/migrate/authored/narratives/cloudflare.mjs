// Authored family narratives for the Cloudflare dossier (benchmarks/support/dossiers/cloudflare.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const TOKEN_FORMATS = "https://developers.cloudflare.com/fundamentals/api/get-started/token-formats/";
const CREATE_TOKEN = "https://developers.cloudflare.com/fundamentals/api/get-started/create-token/";

export default {
  provider: "cloudflare",
  dropped: [
    { part: "Candidates: cfat_ account token, cfk_ scannable global key, legacy unprefixed token and hex global key", reason: "not families here; carried as unresolved collisions and open questions" },
    { part: "Statement that one scanner's rule matches both cfut_ and cfat_, and that another has no cfut_ rule", reason: "state of other scanners, not credential knowledge" },
    { part: "Origin of the checksum-less body misses reported against a scanner", reason: "scanner and benchmark history, not credential knowledge" },
    { part: "Statement that the legacy formats are an evidence-based exclusion", reason: "a scope decision of the project; the underlying fact is carried as an unresolved collision" },
  ],
  families: [
    {
      id: "cloudflare:api-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "documented-format",
            cls: "provider-documented",
            text: "Cloudflare documents cfut_ as the scannable API token format. Its token-formats page says every prefixed token has a distinct prefix followed by 40 characters and a checksum.",
            claims: ["provider-source"],
            cite: [TOKEN_FORMATS, CREATE_TOKEN],
          },
          {
            id: "checksum-follows-body",
            cls: "provider-documented",
            text: "Because Cloudflare says a checksum follows the 40-character body, a bare cfut_ followed by only 40 characters is malformed under the documented format. No checksum algorithm is computed or claimed.",
            cite: [TOKEN_FORMATS],
          },
          {
            id: "checksum-width-and-alphabet",
            unresolved: "Cloudflare says only that a checksum follows the body, and its token-formats page (last updated 2026-04-20) publishes no width or alphabet; the 8 lowercase hexadecimal characters come from one scanner rule.",
            text: "The body is alphanumeric and the checksum is 8 lowercase hexadecimal characters, 53 characters in all.",
            leadClaims: ["tool-corroboration"],
          },
        ],
        issuance: [
          {
            id: "not-issued",
            unresolved: "No token was issued for this research; one issued token would settle the checksum shape.",
            text: "No Cloudflare token was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "cfat-and-cfk",
            unresolved: "These formats are documented on other Cloudflare pages that are not recorded as sources of this family, and no tool corroborates the cfk_ checksum shape.",
            text: "cfat_ (account-owned token) and cfk_ (scannable global key) share the same format cell of 40 characters and a checksum, and are separate credentials.",
            lead: [TOKEN_FORMATS],
          },
          {
            id: "legacy-unprefixed",
            unresolved: "The older formats are described in the research overview; no source recorded for this family states them.",
            text: "The older formats, a 40-character alphanumeric token and a 37 to 45 character hexadecimal global key, have no prefix and cannot be told from ordinary opaque values.",
            lead: [TOKEN_FORMATS],
          },
        ],
        openQuestions: [
          {
            id: "checksum-shape",
            unresolved: "One issued token would settle it, and would also settle the cfat_ shape.",
            text: "Are the 8 checksum characters always lowercase hexadecimal?",
          },
          {
            id: "cfk-grammar",
            unresolved: "No source gives a checksum width or alphabet for cfk_.",
            text: "What is the grammar of a cfk_ global key?",
          },
          {
            id: "checksum-less-body",
            unresolved: "A re-read of the token-formats page on 2026-09-21 found no text supporting it, but absence is not proof.",
            text: "Does any provider text support a cfut_ token with a 40-character body and no checksum?",
          },
        ],
      },
    },
  ],
};
