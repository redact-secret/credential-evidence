// Authored family narratives for the Netlify dossier (benchmarks/support/dossiers/netlify.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const ANNOUNCEMENT = "https://answers.netlify.com/t/change-to-the-netlify-authentication-token-format/106146";
const MCP_TEST = "https://github.com/netlify/netlify-mcp/blob/57e547a1b23ace88227b6fc0ce014ec390e4c4f7/src/tools/deploy-tools/deploy-site.test.ts";
const TRUFFLEHOG_V2 = "https://github.com/trufflesecurity/trufflehog/blob/48b58d3bf3f02ba17bf23b87f095499bc80c6fd7/pkg/detectors/netlify/v2/netlify_v2.go";
const KESTREL = "https://github.com/bzzimmy/kestrel/blob/6d5ff28089d0b775e2a2c3f63366907d45ddb6fd/src/rules/cloud.rs";
const MASK_GO = "https://github.com/koki-develop/mask-go/blob/1b861d7ac421b392a5bb962207fd1886b28e013e/builtin_netlify_auth_token.go";
const GEIGER = "https://github.com/puck-security/geiger/blob/be0bc39ca4862f8d6552b6be90538095ee2a794b/internal/modules/netlify.go";
const TESTPATTERN = "https://github.com/testpatterndev/patterns/blob/64580c807ea3a3c2896ca4e0f7044da56333fff6/data/patterns/global-netlify-token.yaml";

export default {
  provider: "netlify",
  dropped: [
    { part: "Candidate: pre-2023 unprefixed tokens", reason: "a shared legacy form across all token classes; carried as an unresolved collision statement on each family rather than a family of its own" },
    { part: "Candidate: build hook URLs", reason: "a separate bearer-secret format that was never researched, so there is nothing to record" },
    { part: "Remark that a former-staff forum announcement may not count as provider documentation", reason: "an evidence-class ruling for the maintainers, not credential knowledge; the announcement is cited under the class its source type gives" },
    { part: "Statement that Netlify was the only committed candidate with a provider source", reason: "research and issue history, not credential knowledge" },
  ],
  families: [
    {
      id: "netlify:personal-access-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-size",
            cls: "provider-documented",
            text: "Netlify's announcement of 2023-11-07 states that every Netlify authentication token starts with nf followed by one identifying character, nfp for a personal access token, and tells customers to allow 40 characters of storage. The underscore after nfp and the body alphabet are not written on the page.",
            claims: ["provider-source"],
          },
          {
            id: "delimiter-and-body",
            cls: "tool-corroborated",
            text: "Two scanner rules agree on nfp_ followed by 36 characters from letters, digits and underscore, 40 characters in all.",
            claims: ["tool-corroboration"],
          },
          {
            id: "api-guide-bearer",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Netlify's API guide documents only creating a token and sending it as a Bearer header.",
          },
        ],
        issuance: [
          {
            id: "not-issued",
            unresolved: "No token was issued for this research.",
            text: "No Netlify personal access token was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "sibling-classes",
            cls: "provider-documented",
            text: "The other four nf classes (nfc, nfo, nfu, nfb, for CLI, OAuth, app and build tokens) share the scheme and length but are different credentials.",
            claims: ["provider-source"],
          },
          {
            id: "pre-2023-unprefixed",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Tokens issued before 2023 share one unprefixed shape across all five classes, so that form cannot be labelled as a personal token. Site, account and deploy ids and preview URLs are not credentials.",
          },
        ],
        openQuestions: [
          {
            id: "delimiter-alphabet",
            unresolved: "No Netlify text states the underscore or the body alphabet for nfp_.",
            text: "What are the delimiter and body alphabet of a personal access token?",
          },
        ],
      },
    },
    {
      id: "netlify:other-prefixed-tokens",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-classes",
            cls: "provider-documented",
            text: "The 2023-11-07 announcement names all five classes, says every new token starts with nf plus one identifying character, and tells customers with fixed-size fields to allow 40 characters. This family covers nfc_ (Netlify CLI), nfo_ (OAuth access token), nfu_ (the web app) and nfb_ (build), each assumed to be 40 characters in all. The announcement does not write the underscore, the body length or the alphabet.",
            cite: [ANNOUNCEMENT],
          },
          {
            id: "underscore-personal-only",
            cls: "provider-documented",
            text: "Netlify's own MCP server tests use an nfp_ placeholder, which shows the underscore for the personal class only.",
            cite: [MCP_TEST],
          },
          {
            id: "scanner-coverage",
            cls: "tool-corroborated",
            text: "A scanner's second-version Netlify rule (behind a netlify keyword) encodes nfp_ only. Independent tools that do key on the other class letters (with body widths from 20 to 36 up to 40 or more) all derive the letters from the announcement and disagree on the body, so they corroborate the prefix set and nothing about the body.",
            cite: [TRUFFLEHOG_V2, KESTREL, MASK_GO, GEIGER, TESTPATTERN],
          },
          {
            id: "body-alphabet-observed",
            unresolved: "The observed body alphabet rests on a structure-only measurement of public code that is not a cited source; no real nfo_, nfu_ or nfb_ value was observed, so the underscore and the 36-character alphanumeric body for those three rest on analogy with nfp_ and nfc_.",
            text: "The body is 36 letters and digits after the prefix.",
          },
        ],
        issuance: [
          {
            id: "mint-cost",
            unresolved: "Recorded in a research note without a cited source in this family's contract; no token was issued.",
            text: "A CLI login token and an OAuth token are cheap to mint and revoke; app and build tokens are minted by the platform for sessions and builds.",
          },
        ],
        collisions: [
          {
            id: "distinct-credentials",
            cls: "provider-documented",
            text: "Each class is a distinct credential, so none is a benign sibling or a positive for the personal access token family.",
            cite: [ANNOUNCEMENT],
          },
          {
            id: "nfc-snake-case",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "nfc_ also opens ordinary snake_case names, which the 36-character body rather than the prefix separates. Pre-2023 unprefixed tokens are a separate variant, and site, account and deploy ids are not credentials.",
          },
        ],
        openQuestions: [
          {
            id: "other-body-shapes",
            unresolved: "One issued token per class would settle whether the nfo_, nfu_ and nfb_ bodies match the 36 alphanumeric characters of nfp_ and nfc_.",
            text: "Are the nfo_, nfu_ and nfb_ bodies the same 36 alphanumeric characters as nfp_ and nfc_?",
          },
        ],
      },
    },
  ],
};
