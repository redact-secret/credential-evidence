// Authored family narratives for the Stripe dossier (benchmarks/support/dossiers/stripe.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).
//
// The four secret and restricted key families share one provider page and one set of
// statements in the dossier, so they are built from one parameterised block.

const KEYS = "https://docs.stripe.com/keys";
const ORG_KEYS = "https://docs.stripe.com/keys/organization-api-keys";
const WEBHOOKS = "https://docs.stripe.com/webhooks";
const SIGNATURE = "https://docs.stripe.com/webhooks/signature";
const ENDPOINT_OBJECT = "https://docs.stripe.com/api/webhook_endpoints/object";

// [id, prefix, what the dossier calls it]
const KEY_FAMILIES = [
  ["stripe:secret-key-live", "sk_live_", "live secret key"],
  ["stripe:secret-key-test", "sk_test_", "test secret key"],
  ["stripe:restricted-key-live", "rk_live_", "live restricted key"],
  ["stripe:restricted-key-test", "rk_test_", "test restricted key"],
];

function keyFamily([id, prefix, name]) {
  return {
    id,
    status: "migrated",
    sections: {
      shape: [
        {
          id: "prefix",
          cls: "provider-documented",
          text: `Stripe's API-keys page documents ${prefix} as the prefix of a ${name}. The secret and restricted key types are told apart by their first segment (sk_ or rk_) and the environment segment (live_ or test_).`,
          cite: [KEYS],
          claims: ["provider-source"],
        },
        {
          id: "body-32",
          cls: "tool-corroborated",
          text: "The key page states nothing about the length or alphabet of the body after the prefix. A 32-character body is corroborated by scanner rules only, and the format is left undecided here.",
          claims: ["provider-source", "tool-corroboration"],
        },
      ],
      collisions: [
        {
          id: "publishable-keys",
          cls: "provider-documented",
          text: "Publishable keys (pk_live_ and pk_test_) share the layout but are documented as safe to expose, so they are public identifiers and not secrets.",
          cite: [KEYS],
          claims: ["provider-source"],
        },
      ],
      openQuestions: [
        {
          id: "body-grammar",
          unresolved: "No Stripe page states the body length or alphabet of the sk_ and rk_ keys, and the 32-character body is corroborated by scanner rules only.",
          text: "What are the length and alphabet of the body of the sk_ and rk_ keys?",
        },
      ],
    },
  };
}

export default {
  provider: "stripe",
  dropped: [
    { part: "Candidate: `absec_` (Stripe Apps signing secret)", reason: "seen only in search results and not fetched; no source is cited for it" },
    { part: "Open question 6 (two open pull requests to another scanner)", reason: "the state of another scanner's change requests is scanner state, not credential knowledge" },
  ],
  families: [
    ...KEY_FAMILIES.map(keyFamily),
    {
      id: "stripe:organization-api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "The prefix sk_org_ is named on Stripe's key-types page and on its organization-keys page. Neither page gives a body length or alphabet.",
            cite: [KEYS, ORG_KEYS],
            claims: ["dossier-research"],
          },
        ],
        openQuestions: [
          {
            id: "body-grammar",
            unresolved: "The prefix is the only documented property; the body grammar is undecided, and the shape is not asserted beyond the prefix.",
            text: "What are the length and alphabet of the body of an organization API key?",
          },
        ],
      },
    },
    {
      id: "stripe:webhook-signing-secret",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "A webhook signing secret begins with whsec_. The Dashboard's reveal-secret flow shows such a secret, v2 event destinations return one, and the CLI's secrets also begin with whsec_ but are documented as different from the Dashboard's.",
            cite: [WEBHOOKS, SIGNATURE],
            claims: ["field-prefix"],
          },
          {
            id: "not-an-api-key",
            cls: "provider-documented",
            text: "Stripe calls webhook signing secrets \"not API keys\": each is a per-webhook-endpoint secret, configured on the endpoint and passed to the SDK's signature verifier.",
            cite: [KEYS, WEBHOOKS],
            claims: ["field-context"],
          },
          {
            id: "no-mode-segment",
            cls: "provider-documented",
            text: "Live and test endpoints have different secrets, but the prefix carries no live or test segment.",
            cite: [WEBHOOKS],
            claims: ["field-mode-marker"],
          },
          {
            id: "body-length",
            cls: "provider-documented",
            text: "The body after the prefix is at least 32 characters in the examples that exist: the API reference example secret has a 32-character mixed-case alphanumeric body, and an SDK's placeholder is 64 zeros. An example is not a grammar, so no maximum is established.",
            cite: [ENDPOINT_OBJECT, "https://github.com/stripe/stripe-node/blob/master/examples/webhook-signing/.env.example"],
            claims: ["field-body-length"],
          },
          {
            id: "body-alphabet-disagrees",
            cls: "provider-documented",
            text: "Stripe's own code disagrees about the alphabet: the CLI's error-report scrubber admits plus, slash and trailing equals signs after the prefix, while another expression in the same repository accepts letters and digits only.",
            cite: ["https://github.com/stripe/stripe-cli/blob/master/pkg/reporting/scrub.go", "https://github.com/stripe/stripe-cli/blob/master/canary/testutil/sanitize.go"],
            claims: ["field-body-alphabet"],
          },
          {
            id: "whole-string-key",
            cls: "provider-documented",
            text: "Stripe's SDKs use the whole string, prefix included, as the HMAC key and never Base64-decode it.",
            cite: [WEBHOOKS],
          },
          {
            id: "checksum",
            unresolved: "Nothing in the reviewed Stripe sources states a checksum or an embedded identifier.",
            text: "It is not established whether the body carries a checksum or an embedded id.",
          },
        ],
        issuance: [
          {
            id: "per-endpoint",
            cls: "provider-documented",
            text: "A signing secret belongs to one webhook endpoint, and the CLI's secrets are documented as different from the Dashboard's. There is no live or test segment, so the environment is not visible in the value.",
            cite: [WEBHOOKS, SIGNATURE],
            claims: ["field-prefix", "field-mode-marker"],
          },
          {
            id: "sample-route",
            unresolved: "Recorded in a research note without a cited source, and no sample was issued for this research.",
            text: "A free way to obtain a sample is a sandbox Dashboard endpoint, or the CLI's listen command with --print-secret.",
          },
        ],
        collisions: [
          {
            id: "svix-standard-webhooks",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Svix and Standard Webhooks also use the whsec_ prefix, with a Base64 body of 24 to 64 bytes that is decoded before use, and have asymmetric siblings with the prefixes whsk_ and whpk_. The prefix alone therefore does not say a value is Stripe's.",
          },
          {
            id: "nearby-public-ids",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Public or non-secret values nearby include we_ webhook endpoint ids, ed_ event destination ids, evt_ event ids, Stripe-Signature digests and pk_ publishable keys.",
          },
        ],
        openQuestions: [
          {
            id: "shared-width-alphabet",
            unresolved: "No reviewed source compares the secrets issued by the Dashboard, the API, v2 event destinations, Connect and the CLI.",
            text: "Do Dashboard, API, v2 event destination, Connect and CLI secrets share width and alphabet, and do real secrets ever contain plus, slash or equals signs?",
          },
          {
            id: "sixty-four-variant",
            unresolved: "The only 64-character values seen are a placeholder of zeros and hex digests.",
            text: "Is a 64-character variant real, or only an artifact of placeholders and hex digests?",
          },
          {
            id: "non-stripe-whsec",
            unresolved: "A scope question that no evidence settles: whsec_ values issued by other providers are neither examples nor controls here.",
            text: "Should a non-Stripe whsec_ value, such as a Svix secret, count as this family?",
          },
        ],
      },
    },
  ],
};
