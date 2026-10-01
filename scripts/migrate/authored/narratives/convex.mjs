// Authored family narratives for the Convex dossier (benchmarks/support/dossiers/convex.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const KEY_TYPES = "https://docs.convex.dev/cli/deploy-key-types";

export default {
  provider: "convex",
  dropped: [
    { part: "Candidate: cloud `eyJ2` body (same family in a split, gated)", reason: "carried inside the deployment-key family as unresolved statements, not a separate family" },
    { part: "Candidate: team access and OAuth tokens, command-line device token, login access token", reason: "shape undocumented; not families" },
    { part: "Collisions: a name-only partial span was a generic defect, fixed in an issue", reason: "scanner behaviour and issue workflow, not credential knowledge" },
    { part: "Collisions: a later change made two environment variable names a contextual finding", reason: "product policy, not credential knowledge" },
  ],
  families: [
    {
      id: "convex:deployment-key",
      status: "partial",
      note: "Covers the hex-body deployment, project and admin keys. The current cloud deploy-key body, which begins eyJ2, is recorded only as unresolved because its alphabet, padding and length are not established.",
      sections: {
        shape: [
          {
            id: "composition",
            cls: "provider-documented",
            text: "A key is an optional type lead, a name, exactly one vertical bar, and an encrypted body. The whole string is the credential, public name part included. The provider's key-format code joins the name and the encrypted body with the bar.",
            claims: ["provider-source", "field-join"],
          },
          {
            id: "type-lead",
            cls: "provider-documented",
            text: "The type lead is prod: or dev: followed by a cloud deployment name (lowercase words and a number, joined by hyphens), or preview: or project: followed by a team slug, a colon and a project slug. A key for a self-hosted or default instance has no type lead and is an admin key, led by the instance or deployment name; the self-hosted default name is convex-self-hosted.",
            cite: [KEY_TYPES],
            claims: ["field-typed-lead", "field-untyped-name"],
          },
          {
            id: "hex-body",
            cls: "provider-documented",
            text: "After the bar the body is lowercase hexadecimal that starts with 01, the key encryptor's version byte. Its length is always even and falls in 74 to 96 hex characters: a 29-byte envelope plus a proto of 8 to 19 bytes. The band is derived from the generator code, not stated by the provider.",
            claims: ["field-body-version", "field-body-alphabet", "field-body-length"],
          },
          {
            id: "name-bound",
            unresolved: "The character class and the 63-character bound for names and slugs are an authoring policy, not a provider statement; no source gives a slug grammar.",
            text: "Names and the preview and project slugs fit a lowercase alphanumeric-and-hyphen class of at most 63 characters.",
            leadClaims: ["field-slugs"],
          },
          {
            id: "cloud-body",
            unresolved: "Only a truncated documentation example is available; the issuer is closed source, and the length and Base64 flavour were not established. Issuance research narrowed the structure to the Base64 of a JSON object tagged v2, but did not fix it.",
            text: "The current cloud deploy-key body begins eyJ2; its alphabet, padding and length are not established.",
            lead: [KEY_TYPES],
            leadClaims: ["field-cloud-body"],
          },
        ],
        issuance: [
          {
            id: "environment-variables",
            cls: "provider-documented",
            text: "Deploy keys are supplied through CONVEX_DEPLOY_KEY and self-hosted admin keys through CONVEX_SELF_HOSTED_ADMIN_KEY, and a key is sent as an Authorization header with the scheme Convex.",
            claims: ["field-transport"],
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for this research; a structure-only check of the cloud body was named as the most valuable next step but not performed.",
            text: "No Convex key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "public-selectors",
            cls: "provider-documented",
            text: "Deployment selectors of the form CONVEX_DEPLOYMENT=<type>:<name>, hostnames such as <name>.convex.cloud and <name>.convex.site, and bare deployment names are public and carry no bar and no body.",
            claims: ["field-non-secrets"],
          },
          {
            id: "legacy-bare-key",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "A bare legacy key from before version 0.16.0 has no anchor that separates it from other values.",
          },
          {
            id: "preview-branch-name",
            unresolved: "Recorded in an issuance research note that is not a source of this family's contract.",
            text: "A preview deployment key can read preview:<branch-name>| with a name of up to 40 characters, where colon and bar are mapped to underscore. Such a name can fall outside the bounded name class, which is an accepted miss.",
          },
        ],
        openQuestions: [
          {
            id: "cloud-body-grammar",
            unresolved: "Needs one issued key checked for structure only.",
            text: "What are the alphabet (standard or URL-safe Base64), padding and length of the cloud eyJ2 body, and does the key's scope change the length?",
          },
          {
            id: "slug-grammar",
            unresolved: "No source states the slug grammar; issuance research also found a wider preview:<branch-name>| form.",
            text: "What is the team and project slug grammar for preview: and project: keys?",
          },
        ],
      },
    },
  ],
};
