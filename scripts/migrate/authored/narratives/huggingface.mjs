// Authored family narratives for the Hugging Face dossier (benchmarks/support/dossiers/huggingface.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const SDK = "https://huggingface.co/docs/huggingface.js/hub/modules";
const OPENAPI = "https://huggingface.co/.well-known/openapi.json";

export default {
  provider: "huggingface",
  dropped: [
    { part: "Candidates: api_org_ organization tokens; hf_oauth_ and hf_jwt_ tokens", reason: "not families; they appear only as an unresolved collision and statement of the API token" },
    { part: "Open question 1: whether provider code counts as a provider statement of the alphabet", reason: "a review-policy decision about evidence classes, not credential knowledge" },
    { part: "Research log and contract-link lines", reason: "issue workflow and product policy, not credential knowledge" },
  ],
  families: [
    {
      id: "huggingface:api-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "Hugging Face user access tokens begin hf_. The SDK reference for the hub package types an access token as the template hf_ followed by any string; this is a type annotation and not prose.",
            cite: [SDK],
            claims: ["provider-source"],
          },
          {
            id: "length-34",
            cls: "provider-documented",
            text: "The token is hf_ followed by 34 characters. The Hub OpenAPI specification's credential-revocation example shows hf_ plus 34 placeholder characters, while its schema states only a minimum length of 1 and a maximum of 200, so the length rests on one example.",
            cite: [OPENAPI],
            claims: ["provider-source"],
          },
          {
            id: "alphabet-split",
            cls: "tool-corroborated",
            text: "Two scanner rules are consistent with a 34-character body but split on the alphabet: one is letters-only and the other admits digits. Every observed sample and every letters-only expression is narrower than letters and digits, and no source says digits never occur.",
            claims: ["tool-corroboration"],
          },
          {
            id: "provider-code-alphabet",
            unresolved: "Hugging Face's own current code and a retired validator are recorded in a research note as using letters and digits for the 34 characters, but the code locations are not recorded as sources, and code is not documentation.",
            text: "Hugging Face's own code validates the body as 34 letters and digits.",
          },
          {
            id: "other-hf-tokens",
            unresolved: "Recorded in a research note without a cited source in this family's contract; no grammar is recorded for them.",
            text: "Other documented hf_ tokens exist, such as hf_oauth_ and hf_jwt_ tokens, so a later underscore in a body does not prove it is not a Hugging Face token.",
          },
        ],
        issuance: [
          {
            id: "not-issued",
            unresolved: "No token was issued; the only source for the user token's creation is a research note stating that tokens are created in account settings.",
            text: "User access tokens are created from account settings, and no token was issued for this record.",
          },
        ],
        collisions: [
          {
            id: "api-org-variant",
            unresolved: "The api_org_ variant has no current source: a 2021 archived page shows a placeholder, staff say organization tokens are deprecated, and the current SDK rejects organization tokens at login.",
            text: "Legacy organization tokens begin api_org_.",
          },
        ],
        openQuestions: [
          {
            id: "api-org-current-source",
            unresolved: "No source for a current api_org_ shape has been found.",
            text: "Does a current provider source for the api_org_ shape exist?",
          },
        ],
      },
    },
  ],
};
