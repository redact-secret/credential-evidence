// Authored family narratives for the Trigger.dev dossier (benchmarks/support/dossiers/trigger-dev.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).
// All grammar comes from Trigger.dev's own published source at a pinned commit.

const SDK_CORE = "https://github.com/triggerdotdev/trigger.dev/blob/c2b7a72180bbb2dcbc31caa8539e0ca8f8e9e9b8/packages/core/src/v3/apiKeys.ts";
const KEY_GEN = "https://github.com/triggerdotdev/trigger.dev/blob/0b35cc35e053bc4a38cbe80ff4d7d543e8cca7d3/apps/webapp/app/models/api-key.server.ts";
const PAT_GEN = "https://github.com/triggerdotdev/trigger.dev/blob/c2b7a72180bbb2dcbc31caa8539e0ca8f8e9e9b8/apps/webapp/app/services/personalAccessToken.server.ts";
const APIKEYS_DOC = "https://trigger.dev/docs/apikeys";

export default {
  provider: "trigger-dev",
  dropped: [
    { part: "Candidate: `tr_oat_` organization access token", reason: "not a family yet; carried as an unresolved statement and open question of the environment secret key because no generator was found" },
    { part: "Candidates: `tr_uat_` plus a JWT, and public access tokens", reason: "bare or wrapped JWTs belong to the JWT family, not to a Trigger.dev family; mentioned as a collision of the environment secret key" },
    { part: "Candidate: `tr_proj_` project references", reason: "non-secret identifiers, not a credential family; mentioned as a collision" },
    { part: "Research log and current-contract links", reason: "issue workflow and product policy are not carried (ADR 0010 section 5)" },
  ],
  families: [
    {
      id: "trigger-dev:secret-api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "An environment secret key begins with tr_, then one of the environment slugs dev, stg, prod or preview, then an underscore for a root key or _sk_ for an additional key. Those four slugs are the whole set Trigger.dev's own type allows.",
            cite: [SDK_CORE, APIKEYS_DOC],
            claims: ["field-prefix", "field-env-slugs"],
          },
          {
            id: "body",
            cls: "provider-documented",
            text: "The body is letters and digits only, exactly 24 characters for an additional key and for a current root key. A legacy root key, generated up to version 4.0.0, has exactly 20. The webapp generators and the published SDK pattern agree on these lengths.",
            cite: [SDK_CORE, KEY_GEN],
            claims: ["provider-source", "field-body"],
          },
          {
            id: "separators",
            cls: "provider-documented",
            text: "Underscores appear only at the fixed positions of the prefix and never inside the body, and the key carries no checksum.",
            claims: ["field-separators"],
          },
          {
            id: "boundary",
            unresolved: "Recorded in a research note without a cited source: it is a matching choice, not a provider fact.",
            text: "It is not established how a key behaves when glued to an identifier character on either side.",
            leadClaims: ["field-boundary"],
          },
        ],
        issuance: [
          {
            id: "environment-scope",
            unresolved: "No key was issued for this research; the scope description comes from the research note's overview and is not tied to a cited page.",
            text: "An environment secret key triggers and manages jobs in one project environment, and those jobs run with that environment's secrets.",
          },
          {
            id: "additional-keys",
            cls: "provider-documented",
            text: "The additional-key form with _sk_ is recognised by the published SDK pattern, and the research note records it as allowed since 2026-08-25.",
            cite: [SDK_CORE],
            claims: ["provider-source"],
          },
        ],
        lifecycle: [
          {
            id: "legacy-root-keys",
            unresolved: "No source states whether 20-character legacy root keys still authenticate; they are kept in the shape because lookup is by value and nothing says they stopped working.",
            text: "Legacy root keys with a 20-character body may still be valid.",
            leadClaims: ["provider-source"],
          },
        ],
        collisions: [
          {
            id: "public-key",
            cls: "provider-documented",
            text: "The public key has the shape pk_ plus the environment slug and an underscore, then 20 characters. The server classifies the pk_ prefix as public, so it is not a secret.",
            claims: ["field-public-key"],
          },
          {
            id: "jwt-siblings",
            cls: "provider-documented",
            text: "Short-lived delegated tokens (tr_uat_ followed by a JWT) and public access tokens (a bare JWT) are JWTs and stay with the JWT family.",
            claims: ["field-jwt-siblings"],
          },
          {
            id: "outside-slugs",
            cls: "provider-documented",
            text: "Environment slugs outside the four, such as tr_test_ or tr_staging_, are not in the provider's allowed set and are not this key.",
            claims: ["field-env-slugs"],
          },
        ],
        openQuestions: [
          {
            id: "organization-token",
            unresolved: "A tr_oat_ organization access token is recorded as a secret, but no generator was found; its length and alphabet are unknown.",
            text: "What is the grammar of tr_oat_ organization access tokens?",
            leadClaims: ["field-organization-token"],
          },
          {
            id: "legacy-root-validity",
            unresolved: "No source states whether the 20-character legacy root keys still authenticate.",
            text: "Do legacy 20-character root keys still authenticate?",
          },
        ],
      },
    },
    {
      id: "trigger-dev:personal-access-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "A personal access token begins with tr_pat_, named in Trigger.dev's API-keys documentation and in its webapp generator.",
            cite: [PAT_GEN, APIKEYS_DOC],
            claims: ["field-prefix"],
          },
          {
            id: "body",
            cls: "provider-documented",
            text: "The body is exactly 40 characters from a lowercase alphabet that omits the digit 0 and the letter l (letters a to z without l, and digits 1 to 9). There are no separators inside the body and no checksum.",
            cite: [PAT_GEN],
            claims: ["provider-source", "field-body", "field-separators"],
          },
          {
            id: "boundary",
            unresolved: "Recorded in a research note without a cited source: it is a matching choice, not a provider fact.",
            text: "It is not established how a token behaves when glued to an identifier character on either side.",
            leadClaims: ["field-boundary"],
          },
        ],
        issuance: [
          {
            id: "user-scope",
            unresolved: "No token was issued for this research, and the user-wide scope is stated in the research note without a cited page.",
            text: "A personal access token acts for a user across projects, which is why it is a separate family from the environment secret key.",
          },
        ],
        collisions: [
          {
            id: "none-found",
            unresolved: "The research note records that no collision was found; absence of a finding is not evidence that none exists.",
            text: "No lookalike value was found for the personal access token.",
          },
        ],
      },
    },
  ],
};
