// Authored family narratives for the Composio dossier (benchmarks/support/dossiers/composio.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).
//
// The three key families share one scheme and mostly one set of statements, so they are
// built from one parameterised block.

const DOCS_AUTH = "https://docs.composio.dev/reference/authenticating-to-composio";
const SDK_CONSTANTS = "https://github.com/ComposioHQ/composio/blob/34484551843e575e79cca244d9fca3e4459f59e9/ts/packages/core/src/utils/sdk.ts";
const LOGIN_CMD = "https://github.com/ComposioHQ/composio/blob/34484551843e575e79cca244d9fca3e4459f59e9/ts/packages/cli/src/commands/login.cmd.ts";

function sharedStatements(prefix, kind, header) {
  return {
    prefix: {
      id: "prefix",
      cls: "provider-documented",
      text: `A Composio ${kind} begins with ${prefix}. The provider's authentication documentation and its SDK source name the prefix${header ? `, and the documentation names the ${header} request header that carries the key` : ""}.`,
      claims: ["field-prefix"],
    },
    alphabet: {
      id: "alphabet",
      cls: "provider-documented",
      text: "The body is a URL-safe nanoid drawn from letters, digits, underscore and hyphen, so a body may begin or end with an underscore or a hyphen. The keys use an underscore-separated scheme with no checksum and no further separators.",
      claims: ["field-alphabet"],
    },
    separatorsUnsourced: {
      id: "no-checksum",
      unresolved: "The statement that no checksum exists is held in a contract claim that is itself unresolved; it rests on one staff comment and no provider specification.",
      text: "The key has no separators and no checksum.",
      leadClaims: ["field-separators"],
    },
  };
}

export default {
  provider: "composio",
  dropped: [
    { part: "Candidate: `ck_` Connect consumer key / scoped project key", reason: "a secret, but no source states its length or alphabet, so it is not yet a family" },
    { part: "Candidate: `cak_` agent key", reason: "seen only as a mock placeholder; shape unknown, so not a family" },
    { part: "Candidate: `pr_` project ids and 12-byte organisation ids", reason: "non-secret identifiers, not credential families" },
    { part: "Open question 1 (whether the user-key body is 43 characters on a key issued today)", reason: "carried as the user key's unresolved issuance and conflict statements; the rest of the question is project scheduling and issue workflow" },
    { part: "Open question 3 (`ck_` body length and alphabet)", reason: "about a candidate that is not a family" },
  ],
  families: [
    {
      id: "composio:project-api-key",
      status: "migrated",
      sections: (() => {
        const s = sharedStatements("ak_", "project API key", "x-api-key");
        return {
          shape: [
            s.prefix,
            {
              id: "body-20",
              cls: "provider-documented",
              text: "The body is exactly 20 characters. A dated statement by Composio's Head of Security (2026-09-17, posted on a public scanner issue) gives ak_ plus 20 nanoid characters, and the provider's OpenAPI example shows an ak_ key with a 20-character body.",
              claims: ["provider-source", "field-openapi-example"],
            },
            s.alphabet,
            s.separatorsUnsourced,
          ],
          issuance: [
            {
              id: "not-issued",
              unresolved: "No project key was issued for this research; an optional issuance check was listed but not performed.",
              text: "No project key was issued or observed to confirm the stated width.",
            },
          ],
          collisions: [
            {
              id: "short-prefix-identifier",
              unresolved: "Recorded in a research note without a cited source: the false-negative cost of the proposed guard is a computed estimate and not a provider fact.",
              text: "The prefix ak_ is short and the alphabet includes the underscore and hyphen, so a 20-character snake_case identifier can look like a project key. Requiring at least one uppercase and one lowercase letter in the body would rule most of these out, at a cost of about 3 in 100,000 genuine keys on each side.",
              leadClaims: ["field-mixed-case-guard"],
            },
            {
              id: "contained-prefixes",
              unresolved: "The boundary rule is an authoring choice recorded in an unresolved contract claim, not a provider statement.",
              text: "The organisation prefix oak_ and the user prefix uak_ both contain ak_, so a key must not be read as a project key when it is glued to an identifier character on its left.",
              leadClaims: ["field-boundary"],
            },
            {
              id: "other-provider-ak",
              unresolved: "Recorded in a research note without a cited source in this family's contract; the claim holding it is unresolved.",
              text: "The provider bkend.ai issues ak_ keys with a 64-character hexadecimal body. It is another provider's credential and the same prefix with a different length.",
              leadClaims: ["field-other-provider"],
            },
          ],
          openQuestions: [
            {
              id: "sibling-shapes",
              unresolved: "Only placeholders for ck_ consumer keys and cak_ agent keys were found; no source states a length or alphabet for either.",
              text: "What are the length and alphabet of the ck_ consumer key and the cak_ agent key that share this scheme?",
              leadClaims: ["field-unshaped-siblings"],
            },
          ],
        };
      })(),
    },
    {
      id: "composio:org-api-key",
      status: "migrated",
      sections: (() => {
        const s = sharedStatements("oak_", "organization API key", "x-org-api-key");
        return {
          shape: [
            s.prefix,
            {
              id: "body-20",
              cls: "provider-documented",
              text: "The body is exactly 20 characters. A dated statement by Composio's Head of Security (2026-09-17, posted on a public scanner issue) gives oak_ plus 20 nanoid characters.",
              claims: ["provider-source"],
            },
            s.alphabet,
            s.separatorsUnsourced,
          ],
          issuance: [
            {
              id: "not-issued",
              unresolved: "No organization key was issued for this research; an optional check of one key was listed but not performed.",
              text: "No organization key was issued or observed to confirm the stated width.",
            },
          ],
          collisions: [
            {
              id: "contains-ak",
              unresolved: "The boundary rule is an authoring choice recorded in an unresolved contract claim, not a provider statement.",
              text: "The prefix oak_ contains ak_, so a project-key reading must not match inside it; the leading boundary separates them. The four-character prefix is distinctive enough that a mixed-case check on the body is harmless but not needed.",
              leadClaims: ["field-boundary"],
            },
          ],
        };
      })(),
    },
    {
      id: "composio:user-api-key",
      status: "migrated",
      sections: (() => {
        const s = sharedStatements("uak_", "user API key", null);
        return {
          shape: [
            {
              id: "prefix",
              cls: "provider-documented",
              text: "A Composio user key begins with uak_. The provider's authentication documentation names the prefix, the SDK defines it as a constant that an executing prefix check uses, and the command-line login flow issues such keys.",
              cite: [DOCS_AUTH, SDK_CONSTANTS, LOGIN_CMD],
              claims: ["field-prefix"],
            },
            {
              id: "body-43",
              cls: "provider-documented",
              text: "The body is exactly 43 characters. A dated statement by Composio's Head of Security (2026-09-17, posted on a public scanner issue) gives uak_ plus 43 nanoid characters.",
              claims: ["provider-source"],
            },
            s.alphabet,
            s.separatorsUnsourced,
          ],
          issuance: [
            {
              id: "login-flow",
              cls: "provider-documented",
              text: "User keys are issued by the command-line login command.",
              cite: [LOGIN_CMD],
            },
            {
              id: "not-issued",
              unresolved: "No user key was issued for this research; one login-issued key was to be measured as confirmation but was not.",
              text: "No user key was issued or observed to confirm the 43-character body.",
            },
          ],
          collisions: [
            {
              id: "contains-ak",
              unresolved: "The boundary rule is an authoring choice recorded in an unresolved contract claim, not a provider statement.",
              text: "The only overlap is the shared ak_ substring, which a leading boundary rules out.",
              leadClaims: ["field-boundary"],
            },
          ],
          openQuestions: [
            {
              id: "comment-shows-20",
              unresolved: "A code comment in the provider's command-line source shows a 20-character body, but it is a comment in a file dated 2025-06 and does not override the staff statement; no dated provider source settles which width applies.",
              text: "A comment in the provider's command-line code shows a user key with a 20-character body, against the staff-stated 43. Is 43 the width of a key issued today, and did an older 20-character format ever exist?",
              leadClaims: ["field-code-comment-width"],
            },
          ],
        };
      })(),
    },
  ],
};
