// Authored family narratives for the Mailchimp dossier (benchmarks/support/dossiers/mailchimp.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

export default {
  provider: "mailchimp",
  dropped: [
    { part: "Open question 1 and 2 issue references", reason: "issue workflow; the underlying questions (body length, uppercase hex) are carried as open questions" },
  ],
  families: [
    {
      id: "mailchimp:marketing-api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "layout",
            cls: "tool-corroborated",
            text: "A key is a run of hexadecimal characters, a literal -us and a one- or two-digit data center number. Scanner rules agree on a 32-character hexadecimal body; they differ on how many digits follow -us, on whether uppercase hexadecimal is accepted and on whether a nearby keyword is required.",
            claims: ["tool-corroboration"],
          },
          {
            id: "provider-example",
            cls: "provider-documented",
            text: "The provider states the shape only through examples. Its fundamentals page shows a key with a 31-character hexadecimal body followed by -us6, and says the data center subdomain of the API host is the us-number suffix of the key.",
            claims: ["mutable-property-source"],
          },
          {
            id: "wordpress-example",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Mailchimp's own WordPress plugin shows a key with 32 hexadecimal characters and -us19.",
          },
          {
            id: "length-by-count",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Every scanner rule, a 2009 staff post and 111 of 115 public code candidates use 32 characters; 2 of the 115 candidates contained uppercase A to F.",
          },
          {
            id: "non-us-and-letters",
            unresolved: "No source shows a key whose data center literal is not us or whose body has letters beyond f.",
            text: "Data center literals other than us, and body letters g to z, occur in issued keys.",
          },
        ],
        issuance: [
          {
            id: "account-page",
            unresolved: "Recorded in a research note without a cited source in this family's contract; no key was issued.",
            text: "Keys are created on the account's API key page, and afterwards the interface shows only the first four characters of a key.",
          },
        ],
        collisions: [
          {
            id: "dc-label-public",
            cls: "provider-documented",
            text: "The data center label (us followed by a number) names the API host the account uses and is not secret.",
            claims: ["mutable-property-source"],
          },
          {
            id: "md5-like-body",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "A 32-character hexadecimal run on its own matches any MD5-style digest, so the data center suffix or a nearby Mailchimp keyword is what makes a match meaningful. The four-character preview shown in the interface is public.",
          },
          {
            id: "advice-against-regex",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "A 2009 staff post advises against validating keys by regular expression because the format may change.",
          },
        ],
        openQuestions: [
          {
            id: "body-length-today",
            unresolved: "The provider's example has 31 body characters; one issued key would settle whether the body is 31 or 32 characters today.",
            text: "Is the body 31 or 32 characters today?",
          },
          {
            id: "uppercase-hex",
            unresolved: "Scanners disagree and no source states whether a real key can contain A to F.",
            text: "Can a real key contain uppercase hexadecimal?",
          },
          {
            id: "non-us-literals",
            unresolved: "No source shows one.",
            text: "Are data center literals other than us ever issued?",
          },
        ],
      },
    },
  ],
};
