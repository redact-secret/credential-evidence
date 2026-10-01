// Authored family narratives for the Weights & Biases dossier (benchmarks/support/dossiers/wandb.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const ENV_DOC = "https://docs.wandb.ai/guides/track/environment-variables/";
const LENGTH_DOC = "https://docs.wandb.ai/support/models/articles/why-does-my-api-key-fail-with-must-be-40-characters";
const VALIDATION = "https://github.com/wandb/wandb/blob/98f93d636e523bf6e195a2a154f23ba8775623a9/wandb/sdk/lib/wbauth/validation.py#L26-L63";
const PR_10688 = "https://github.com/wandb/wandb/pull/10688";
const WEAVE_TEST = "https://github.com/wandb/weave-claude-code/blob/8c4111adbafe7abf15312b3188eb69a0b7bf8f79/tests/config-set-masks-secrets.test.ts#L13";

export default {
  provider: "wandb",
  dropped: [
    { part: "Candidate: legacy 40-hex key (optionally with a host prefix)", reason: "not a family; the legacy key has no anchor and is carried as a collision of the wandb_v1_ key" },
    { part: "Candidate: OIDC identity-token files (WANDB_IDENTITY_TOKEN_FILE)", reason: "a different credential, not a W&B API key" },
    { part: "Contract note about a tolerant length band chosen by a maintainer decision, and the current-contract link", reason: "product policy is not carried (ADR 0010 section 5)" },
    { part: "Scanner-specific peer-rule coverage", reason: "per-scanner state is not carried (ADR 0010 section 5); the internal underscore split seen in scanner rules is carried as unresolved" },
  ],
  families: [
    {
      id: "wandb:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "A current Weights & Biases API key begins with wandb_v1_. The prefix appears as a constant in a test file of W&B's own Weave tooling.",
            cite: [WEAVE_TEST],
            claims: ["field-prefix"],
          },
          {
            id: "alphabet",
            cls: "provider-documented",
            text: "The body uses letters, digits and underscore. W&B's SDK validator accepts word characters and a dash, the dash being needed only for the host prefix of a self-managed key, and its error message says a key may contain only letters, digits and underscores.",
            cite: [VALIDATION],
            claims: ["field-alphabet", "provider-source"],
          },
          {
            id: "total-length",
            cls: "provider-documented",
            text: "The documentation says W&B now issues longer API keys of about 86 characters, and every provider test value of a new key is exactly 86 characters in total (a 77-character body after the prefix). The SDK validator tests use lengths of 39, 40 and 86.",
            cite: [LENGTH_DOC, PR_10688],
            claims: ["field-total-length"],
          },
          {
            id: "host-prefix",
            cls: "provider-documented",
            text: "A key issued by a self-managed deployment is written as the host label, a dash, then the key. The host label is public and is outside the key.",
            claims: ["field-host-prefix"],
          },
          {
            id: "inner-split",
            unresolved: "Scanner rules split the body after 27 characters with an underscore (the key id), but the reviewed provider sources do not require a separator, and both split and unsplit bodies appear in samples.",
            text: "It is not established whether the body always contains an underscore after its first 27 characters.",
            leadClaims: ["field-inner-split"],
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "A key is supplied through the WANDB_API_KEY environment variable or the netrc file entry for api.wandb.ai, and is sent as HTTP Basic authentication with the user name api. It reads and writes every project the user or service account can reach.",
            cite: [ENV_DOC],
            claims: ["field-transport"],
          },
          {
            id: "no-issuance",
            unresolved: "No key was issued for this research, so the documented word about is not confirmed against a freshly issued key.",
            text: "It is not confirmed that a key issued today is exactly 86 characters.",
          },
        ],
        collisions: [
          {
            id: "legacy-40-hex",
            cls: "provider-documented",
            text: "The legacy key is 40 lowercase hexadecimal characters, optionally preceded by a host label, with no prefix. That makes it indistinguishable from a SHA-1 digest or a git commit id, and it is not part of this family.",
            claims: ["field-legacy-key"],
          },
          {
            id: "client-jwts",
            unresolved: "Recorded in a research note without a cited source.",
            text: "Internal client JSON Web Tokens are a different credential and are handled as JWTs.",
          },
        ],
        openQuestions: [
          {
            id: "length-variance",
            unresolved: "The documentation says about 86 and every provider test uses exactly 86; one issuance check would settle whether the length can vary.",
            text: "Is a key issued today always 86 characters, or does the length vary?",
          },
          {
            id: "later-versions",
            unresolved: "No source documents a wandb_v2_ or any later version.",
            text: "Does a wandb_v2_ or later key version exist?",
            leadClaims: ["field-other-versions"],
          },
        ],
      },
    },
  ],
};
