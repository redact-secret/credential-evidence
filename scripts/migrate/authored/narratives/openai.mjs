// Authored family narratives for the OpenAI dossier (benchmarks/support/dossiers/openai.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const ADMIN_GUIDE = "https://developers.openai.com/api/docs/guides/admin-apis";
const FORUM = "https://community.openai.com/t/1118492/2";
const CODEX = "https://github.com/openai/codex/blob/418199f6ade4f9018b1f0b455a685387a811ad2e/codex-rs/network-proxy/src/credential_broker/providers/openai.rs#L13-L23";
const GITLEAKS = "https://github.com/gitleaks/gitleaks/blob/83d9cd684c87d95d656c1458ef04895a7f1cbd8e/cmd/generate/config/rules/openai.go#L14";
const TRUFFLEHOG_ADMIN = "https://github.com/trufflesecurity/trufflehog/blob/363923b901c911a9164f50b6c423f47c15372b1c/pkg/detectors/openaiadmin/openaiadmin.go#L26-L29";
const NUCLEI = "https://github.com/projectdiscovery/nuclei-templates/blob/02b06eb813310376e9a29543fd63a53f0dd3d4b3/http/exposures/tokens/openai/openai-admin-api-key.yaml#L23";
const POLTERGEIST = "https://github.com/ghostsecurity/poltergeist/blob/e071ca2d15f652c6e87e63a64716144a9383c3b2/pkg/rules/openai.yaml#L36";
const TRUFFLEHOG_ISSUE = "https://github.com/trufflesecurity/trufflehog/issues/4698";

export default {
  provider: "openai",
  dropped: [
    { part: "Open question 4 (a scanner disagreement, resolved as a misreading)", reason: "a settled question about another scanner's behaviour, not credential knowledge" },
  ],
  families: [
    {
      id: "openai:secret-api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefixes-and-marker",
            cls: "tool-corroborated",
            text: "Project keys begin sk-proj-, service-account keys sk-svcacct-, and older keys sk-. Each carries the public watermark T3BlbkFJ between two body segments. OpenAI's own credential-broker code in its codex repository names the prefixes and the watermark, but it is an allow-list in code and not a published grammar.",
            cite: [CODEX],
            claims: ["tool-corroboration"],
          },
          {
            id: "widths-and-alphabet",
            cls: "tool-corroborated",
            text: "Namespaced keys measure 74 characters on each side of the watermark (164 or 167 characters in community reports); 58 on each side and a 20-by-20 early sk-proj- generation are older shapes. The alphabet is letters, digits, underscore and hyphen. The lengths and alphabet come from a scanner rule and from measurements of public code, not from OpenAI.",
            claims: ["tool-corroboration", "dossier-research"],
          },
          {
            id: "namespace-variants-unsourced",
            unresolved: "These two prefixes appear in community sources only and no provider source states them, so no grammar is recorded for either.",
            text: "The prefixes sk-None- (user keys, mid-2024) and sk-service- have been reported.",
          },
        ],
        issuance: [
          {
            id: "not-issued",
            unresolved: "No key was issued for this research; structural checks of a project key, two service-account keys and an optional admin key are listed in a search pass but were not performed.",
            text: "No OpenAI secret key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "sk-namespace",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Anthropic keys (sk-ant-) and OpenRouter keys (sk-or-) share the sk- start with OpenAI keys.",
          },
          {
            id: "staff-says-same-as-before",
            unresolved: "An OpenAI staff member's forum post is not a provider document (docs/governance/evidence-classes.md), so it cannot support the statement.",
            text: "OpenAI staff say sk-proj- keys work just like the previous sk- keys.",
            lead: [FORUM],
          },
        ],
        openQuestions: [
          {
            id: "provider-statement-of-shape",
            unresolved: "A search of the provider's own domains was exhaustive as of 2026-09-23 and found no page that states the prefix, marker, length or alphabet. A staff forum post names sk-proj-, and provider code names the prefixes and the watermark; neither is a provider document. Issued keys would settle it.",
            text: "Does any page authored by OpenAI state the prefix, marker, length or alphabet of a secret API key?",
            lead: [FORUM, CODEX],
          },
          {
            id: "older-generations",
            unresolved: "No source measures how many 20-by-20 sk-proj- keys exist today.",
            text: "Do keys of the older 20-by-20 sk-proj- generation still exist in the wild?",
          },
        ],
      },
    },
    {
      id: "openai:admin-api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "tool-corroborated",
            text: "An organization Admin API key begins sk-admin-. OpenAI's credential-broker code names the prefix and the watermark; no provider page states the length or alphabet.",
            cite: [CODEX],
            claims: ["field-prefix"],
          },
          {
            id: "structure-58-58",
            cls: "tool-corroborated",
            text: "The reviewed structure is sk-admin-, then 58 characters of letters, digits, underscore and hyphen, the marker T3BlbkFJ, then 58 more: 133 characters in all. One scanner's three admin test values are all 58 and 58, a second scanner's dedicated admin rule requires the marker and exactly 58 and 58, and two further rules match 58, the marker and 58. With OpenAI's own broker code that is five references from five owners.",
            cite: [GITLEAKS, TRUFFLEHOG_ADMIN, NUCLEI, POLTERGEIST, CODEX],
            claims: ["field-marker", "field-segment-widths"],
          },
          {
            id: "width-74-only-by-union",
            cls: "tool-corroborated",
            text: "No source anywhere shows a 74-by-74 admin key. One scanner's rule admits that width only through the width union it shares with sk-proj- and sk-svcacct- keys, so the width is outside what the evidence supports.",
            cite: [GITLEAKS],
          },
          {
            id: "marker-less-body",
            unresolved: "A single unsourced request describes a marker-less body; no issued key shows one. The 124-character length equals 58 plus the 8-character marker plus 58.",
            text: "A marker-less sk-admin- body of any length is unevidenced, including the 124-character body in one scanner feature request.",
            lead: [TRUFFLEHOG_ISSUE],
          },
        ],
        issuance: [
          {
            id: "created-by-owner",
            cls: "provider-documented",
            text: "An organization owner creates an admin key. The Admin API guide states its scope: an admin key cannot call endpoints that are not administration endpoints, and its documented environment variable is OPENAI_ADMIN_KEY.",
            cite: [ADMIN_GUIDE],
          },
          {
            id: "not-issued",
            unresolved: "No admin key was issued for this research; a checklist of prefix, the two segment widths, marker offset, alphabet and whether the key is shown once was drawn up but not performed.",
            text: "No OpenAI admin key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "shared-namespace",
            cls: "tool-corroborated",
            text: "An admin key shares the sk- namespace and the watermark grammar with sk-proj- and sk-svcacct- keys, so the segment after sk- is what tells the kinds apart.",
            cite: [CODEX, GITLEAKS],
          },
          {
            id: "resource-id-public",
            unresolved: "Recorded in a research note as a checklist item; its shape was recorded and not observed, and no source is cited for it.",
            text: "The admin key resource id (beginning key_) and the redacted value the API displays are public identifiers and not the secret.",
          },
          {
            id: "blog-widths",
            unresolved: "Two blog pages state these figures; the scanner test values for admin keys contradict them, so they are not used.",
            text: "Some blog posts conflate the 164-character project widths and a floor of 40 characters with the admin key.",
          },
        ],
        openQuestions: [
          {
            id: "admin-widths-and-marker",
            unresolved: "One issued admin key would show whether the marker is always present and whether 74-by-74 occurs.",
            text: "Does a real admin key carry the marker, and is it 58 and 58 only or also 74 and 74?",
          },
          {
            id: "provider-code-as-provider-statement",
            unresolved: "The written bar treats provider code that is only an allow-list as not a grammar statement, so the class stays tool-corroborated; whether that distinction holds is a maintainer decision that has not been recorded for OpenAI.",
            text: "Does a staff forum post, or provider code published on GitHub, count as a provider statement of the key grammar?",
          },
          {
            id: "forum-coverage",
            unresolved: "Reddit could not be read in either research pass, so the absence of reports there is weak evidence.",
            text: "Do community reports on forums that could not be read show a different admin key shape?",
          },
        ],
      },
    },
  ],
};
