// Authored family narratives for the HashiCorp Terraform dossier (benchmarks/support/dossiers/hashicorp-terraform.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const USER_PAGE = "https://developer.hashicorp.com/terraform/cloud-docs/api-docs/user-tokens";
const ORG_PAGE = "https://developer.hashicorp.com/terraform/cloud-docs/api-docs/organization-tokens";
const TEAM_PAGE = "https://developer.hashicorp.com/terraform/cloud-docs/api-docs/team-tokens";

const sharedShape = (page, which) => [
  {
    id: "shape",
    cls: "provider-documented",
    text: `${which} A token is 14 alphanumeric characters, the literal marker .atlasv1., then 67 alphanumeric characters, 90 characters in all. No checksum or other marker is documented beyond the .atlasv1. version tag.`,
    cite: [page],
    claims: ["provider-source"],
  },
];

const toolDisagreement = {
  id: "tool-width-disagreement",
  cls: "tool-corroborated",
  text: "Two scanner rules corroborate the family but disagree on width: one uses a looser tail of 60 to 70 characters over a wider alphabet, and the other uses the exact 14 and 67 widths. A tail of 60 to 66 characters is accepted by the looser rule and not by the exact one.",
  claims: ["tool-corroboration"],
};

const tailQuestion = {
  id: "tail-width",
  unresolved: "The exact 67 rests on three provider examples and one scanner rule; no token was issued to show whether a tail of 60 to 66 characters occurs.",
  text: "Does HashiCorp ever issue a tail of 60 to 66 characters?",
};

const notIssued = {
  id: "not-issued",
  unresolved: "No token was minted; all evidence is provider examples and scanner rules.",
  text: "No token of this kind was issued or observed for this record.",
};

export default {
  provider: "hashicorp-terraform",
  dropped: [
    { part: "Candidates: agent pool token and Terraform Enterprise (self-hosted) token", reason: "not families; no distinct grammar was found and the Enterprise reference is recorded as the same shape" },
    { part: "Research log and per-family contract-link lines", reason: "issue workflow and product policy, not credential knowledge" },
  ],
  families: [
    {
      id: "hashicorp-terraform:user-token",
      status: "migrated",
      sections: {
        shape: [
          ...sharedShape(USER_PAGE, "The user-tokens API page publishes a full example whose segments measure exactly 14 and 67."),
          toolDisagreement,
        ],
        issuance: [notIssued],
        collisions: [
          {
            id: "short-placeholder",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "HashiCorp's command-line documentation uses a short placeholder of the same overall form.",
          },
          {
            id: "same-shape-as-others",
            cls: "provider-documented",
            text: "Organization and team tokens share this exact grammar, so the three families are told apart by how the token was issued and not by its shape.",
            claims: ["provider-source"],
          },
        ],
        openQuestions: [tailQuestion],
      },
    },
    {
      id: "hashicorp-terraform:organization-token",
      status: "migrated",
      sections: {
        shape: [
          ...sharedShape(ORG_PAGE, "The organization-tokens page publishes its own example with the same 14 and 67 split, independent of the user-tokens page."),
          {
            id: "enterprise-mirror",
            unresolved: "The mirrored Terraform Enterprise page is recorded in a research note without a source URL in this family's contract.",
            text: "The Terraform Enterprise mirror of the organization-tokens page shows the same shape.",
          },
        ],
        issuance: [notIssued],
        collisions: [
          {
            id: "value-does-not-say-kind",
            cls: "provider-documented",
            text: "Nothing in the value says which kind of token it is, because user, organization and team tokens share one grammar.",
            claims: ["provider-source"],
          },
        ],
        openQuestions: [tailQuestion],
      },
    },
    {
      id: "hashicorp-terraform:team-token",
      status: "migrated",
      sections: {
        shape: sharedShape(TEAM_PAGE, "The team-tokens page publishes a third example with the same 14 and 67 split; agreement across three separately authored pages is the basis for the exact widths."),
        issuance: [notIssued],
        collisions: [
          {
            id: "value-does-not-say-kind",
            cls: "provider-documented",
            text: "Nothing in the value says which kind of token it is, because user, organization and team tokens share one grammar.",
            claims: ["provider-source"],
          },
        ],
        openQuestions: [tailQuestion],
      },
    },
  ],
};
