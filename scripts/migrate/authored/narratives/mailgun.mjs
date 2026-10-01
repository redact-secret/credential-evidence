// Authored family narratives for the Mailgun dossier (benchmarks/support/dossiers/mailgun.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const SIGNING_KEY_REF = "https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/account-management/get-v5-accounts-http_signing_key";
const KEYS_API = "https://documentation.mailgun.com/docs/mailgun/api-reference/send/mailgun/keys/post-v1-keys";
const HELP_VALIDATIONS = "https://help.mailgun.com/hc/en-us/articles/360010523074-Email-Validations";
const HELP_KEYS = "https://help.mailgun.com/hc/en-us/articles/203380100-Where-can-I-find-my-API-keys-and-SMTP-credentials";
const DEMO = "https://github.com/mailgun/validator-demo/blob/2c0f9731d26c35ea9fd257979342fc77c5fd38e9/index.html";
const PY_FILTER = "https://github.com/mailgun/mailgun-python/blob/ce47f6bb7c9035d2c8070a9cf2c2e1a57eb5b40a/mailgun/filters.py";
const RUBY_ISSUE = "https://github.com/mailgun/mailgun-ruby/issues/145";
const HEROKU = "https://devcenter.heroku.com/articles/mailgun-validations";
const GITLAB = "https://docs.gitlab.com/user/application_security/dast/browser/checks/798.73/";
const GITLEAKS_TOML = "https://github.com/gitleaks/gitleaks/blob/b58d3f102cf3a2c84cb7f923d05c25c9b1aed84b/config/gitleaks.toml";

export default {
  provider: "mailgun",
  dropped: [
    { part: "Candidate: Mailgun sending or domain keys and other key types", reason: "mentioned as existing with no shape research; there is nothing to record beyond the sentence in the open questions" },
    { part: "Open question 3 (answered: the public validation key is documented as a front-end key)", reason: "answered; the answer is carried as statements on the public-validation-key family" },
    { part: "Follow-up about removing or reclassifying the public validation key row", reason: "an administrative step on this repository's own classification, not credential knowledge" },
    { part: "Taxonomy digest and product false-positive remarks in the public-validation-key section", reason: "product and measurement handling, outside the credential knowledge scope" },
  ],
  families: [
    {
      id: "mailgun:private-api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "key-prefix-32",
            cls: "tool-corroborated",
            text: "The shape recorded is the literal key- followed by 32 characters from lowercase letters and digits. One scanner rule matches it without a keyword, another requires a mailgun keyword and hexadecimal characters only, and a third agrees. Mailgun's own PHP SDK test uses a signing key with letters beyond f, so the body is not hexadecimal-only.",
            claims: ["tool-corroboration"],
          },
          {
            id: "provider-example-signing-key",
            cls: "provider-documented",
            text: "The one provider example of the key- shape is for the HTTP webhook signing key, shown in the account management reference, so this family covers the private API key and the signing key under one shape.",
            cite: [SIGNING_KEY_REF],
          },
          {
            id: "case",
            unresolved: "No source states whether the body is case-sensitive or whether uppercase occurs.",
            text: "The body is lowercase only.",
          },
        ],
        issuance: [
          {
            id: "not-issued",
            unresolved: "Help-center articles returned an access-denied status in the research pass and were not read; no key was issued.",
            text: "No Mailgun private key was issued or observed for this record, and the account help articles on keys were not read.",
          },
        ],
        collisions: [
          {
            id: "pubkey-and-key-id",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "The public validation key (beginning pubkey-) and the 8-8 hexadecimal key id shown for key objects in the documentation are different values. A 32-8-8 hexadecimal triplet may be the current private key.",
          },
        ],
        openQuestions: [
          {
            id: "fresh-key-shape",
            unresolved: "Three third-party sources say the current private key is a prefix-less 32-8-8 triplet, so key- may be the older shape; an issued key would settle which shape a fresh private key and a fresh signing key have.",
            text: "Which shape does a freshly issued private API key have: key- plus 32 characters or the 32-8-8 triplet? Which does a fresh signing key have?",
          },
          {
            id: "body-case",
            unresolved: "No source settles it.",
            text: "Is the key- body case-sensitive?",
          },
        ],
      },
    },
    {
      id: "mailgun:public-validation-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "Mailgun never states the shape. The prefix pubkey- comes from the log filter of Mailgun's own Python SDK, which scrubs Mailgun private and public key patterns with the expression (key-|pubkey-) followed by word characters and hyphens.",
            cite: [PY_FILTER],
          },
          {
            id: "scanner-shape",
            cls: "tool-corroborated",
            text: "A scanner rule gives pubkey- followed by 32 lowercase hexadecimal characters behind a mailgun keyword, and about thirty tools copy it or its ancestors. Other scanners have no pubkey- rule. A measurement of public code found 17 candidates of that form, 16 of them hexadecimal-only.",
            cite: [GITLEAKS_TOML],
          },
        ],
        issuance: [
          {
            id: "what-it-is",
            cls: "provider-documented",
            text: "It is the account's Verifications Public Key (also called the Public Validation Key), shown on the dashboard's API Security page beside the HTTP webhook signing key and the private keys. It authenticated the public email-validation endpoint.",
            cite: [HELP_VALIDATIONS],
          },
          {
            id: "regenerate-endpoint",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "A regenerate call named public key under the keys API still exists and returns the account public key, with no shape stated.",
          },
        ],
        lifecycle: [
          {
            id: "dropped-from-docs",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Current Mailgun documentation no longer shows the public validation key: the validation overview and the authentication page use the private key only, and the version 4 validation endpoint has no public variant.",
          },
        ],
        collisions: [
          {
            id: "documented-public",
            cls: "provider-documented",
            text: "Mailgun's help center says the public validation endpoint is meant to be used within front-end applications, that its key has an initial monthly limit to protect it, and that the private endpoint is for back-end code. The provider therefore presents the key as one for front-end use, in the same exclusion as other keys documented as safe to expose.",
            cite: [HELP_VALIDATIONS],
          },
          {
            id: "demo-in-browser",
            cls: "provider-documented",
            text: "Mailgun's own validator demo (a jQuery plugin, last changed in 2019) puts the key in browser JavaScript with the comment to replace it with the account's public API key.",
            cite: [DEMO],
            historical: true,
          },
          {
            id: "heroku-two-key",
            unresolved: "A third-party page reproducing Mailgun's guide is not provider documentation; it is a lead only.",
            text: "A 2018 reproduction of Mailgun's validation guide tells readers to use the public key in publicly accessible code.",
            lead: [HEROKU],
          },
          {
            id: "counter-evidence",
            unresolved: "These points are conservative log hygiene in two SDKs and a third-party rating; none says the key grants account access, and the record does not settle whether a redactor should mask it.",
            text: "Mailgun's Python SDK and Ruby test suite still treat the value as sensitive to log, the help center says exhausting the public verification limit can disable the account, and a third-party security check rates a match high and calls the key deprecated.",
            lead: [GITLAB, RUBY_ISSUE],
          },
          {
            id: "help-keys-page",
            unresolved: "Not read in the research pass in a way the record states beyond the page's title.",
            text: "The help center's page on finding API keys and SMTP credentials also lists the account keys.",
            lead: [HELP_KEYS],
          },
        ],
      },
    },
    {
      id: "mailgun:legacy-signing-key-triplet",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "triplet",
            cls: "tool-corroborated",
            text: "Dash-separated lowercase hexadecimal groups of 32, 8 and 8 characters with no prefix. Two scanner rules match the shape, and one of them requires a nearby mailgun keyword. No issued key of this shape has been observed.",
            claims: ["field-shape", "field-context", "tool-corroboration"],
          },
          {
            id: "role",
            unresolved: "No provider source shows the 32-8-8 shape. Three prose sources (a contributor in 2019, customer reports in 2018 and a scanner issue in 2025) describe it as the newer private key, which is why the name legacy signing key is doubtful.",
            text: "The triplet is the current private API key and not only a superseded signing key.",
            leadClaims: ["field-role"],
          },
        ],
        collisions: [
          {
            id: "key-object-id",
            cls: "provider-documented",
            text: "Mailgun's keys API documents keys as objects with a separate id, shown as two 8-character hexadecimal groups, and states no secret shape. That id is not the secret.",
            claims: ["field-key-id", "mutable-property-source"],
          },
          {
            id: "unrelated-hex",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "An unrelated hexadecimal value of the same 32-8-8 layout is not a credential; the shape is recognized only beside a mailgun keyword.",
          },
        ],
        openQuestions: [
          {
            id: "current-or-superseded",
            unresolved: "An issued key would settle whether the triplet is the current key, a superseded signing key or both.",
            text: "Is the triplet the current key, a superseded signing key, or both?",
            leadClaims: ["field-role"],
          },
        ],
      },
    },
  ],
};
