// Authored family narratives for the Anthropic dossier (benchmarks/support/dossiers/anthropic.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const COMPLIANCE_ACCESS = "https://platform.claude.com/docs/en/manage-claude/compliance-api-access";
const ADMIN_KEYS = "https://platform.claude.com/docs/en/manage-claude/admin-api-keys";
const ADMIN_API = "https://platform.claude.com/docs/en/manage-claude/admin-api";
const ACTIVITY_FEED = "https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed";
const HELP_CENTER = "https://support.claude.com/en/articles/13015708-access-the-compliance-api";

export default {
  provider: "anthropic",
  dropped: [
    { part: "Open question 7 (tier of the admin family)", reason: "answered by a maintainer decision about evidence class and product naming; no credential fact remains open" },
  ],
  families: [
    {
      id: "anthropic:secret-api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "A Claude API key begins sk-ant-api03-. Anthropic's compliance-access page lists it as the Claude API key prefix.",
            cite: [COMPLIANCE_ACCESS],
            claims: ["provider-source", "field-prefix"],
          },
          {
            id: "body-93-aa",
            cls: "tool-corroborated",
            text: "After the prefix the body is 93 characters of letters, digits, underscore and hyphen, then the two characters AA, about 108 characters in all. The body, alphabet and tail are corroborated by scanner rules and are not stated by Anthropic. Two of the rules belong to one lineage (a rule set and its fork) and count as a single corroboration.",
            claims: ["field-body", "tool-corroboration"],
          },
        ],
        issuance: [
          {
            id: "console-creation",
            unresolved: "Recorded in a research note without a cited source, and no key was minted for this research.",
            text: "A Claude API key is created in the Claude Console under Settings, API keys.",
          },
        ],
        collisions: [
          {
            id: "sibling-prefixes",
            cls: "provider-documented",
            text: "The sibling prefixes sk-ant-api01- (the Enterprise organization key, documented as the Compliance Access Key) and sk-ant-admin01- (the Admin API key) differ from sk-ant-api03- by one segment and are different key classes.",
            cite: [COMPLIANCE_ACCESS],
            claims: ["field-sibling-prefixes"],
          },
        ],
      },
    },
    {
      id: "anthropic:compliance-access-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "An Enterprise organization key begins sk-ant-api01-. Anthropic's documentation says \"sk-ant-api01- is a Compliance Access Key\" and lists it as the Claude Enterprise organization key prefix.",
            cite: [COMPLIANCE_ACCESS, ADMIN_KEYS],
            claims: ["field-prefix"],
          },
          {
            id: "scope-not-encoded",
            cls: "provider-documented",
            text: "The same prefix is used for any scope set (compliance, analytics, spend limits, members), so the value does not say compliance and the scope is not encoded in it.",
            cite: [ADMIN_KEYS],
            claims: ["field-scope-of-prefix"],
          },
          {
            id: "header",
            cls: "provider-documented",
            text: "The Admin API page sends API keys in the x-api-key header; the authentication page now recommends an Authorization Bearer header and calls x-api-key legacy.",
            cite: [ADMIN_API],
            claims: ["field-header"],
          },
          {
            id: "body-unknown",
            unresolved: "No provider, scanner or observation states a length for this prefix; the body of the api03 key must not be extrapolated to it.",
            text: "The length, alphabet and tail of the body after sk-ant-api01- are not established.",
          },
        ],
        issuance: [
          {
            id: "organization-settings",
            cls: "provider-documented",
            text: "The key is created in the claude.ai organization settings under API and is shown once. Anthropic's help center article covers issuance and that the key is shown once, and nothing about the body.",
            cite: [HELP_CENTER],
          },
          {
            id: "enterprise-parent-organization",
            cls: "provider-documented",
            text: "Creating one needs a Claude Enterprise parent organization, its primary owner or an organization owner, and the Compliance API enabled. A standalone Console organization cannot create one.",
            cite: [HELP_CENTER, COMPLIANCE_ACCESS, ACTIVITY_FEED],
          },
        ],
        lifecycle: [
          {
            id: "no-expiry",
            unresolved: "Recorded in a research note without a cited source; no key was issued to observe expiry.",
            text: "The key does not expire on its own.",
          },
        ],
        collisions: [
          {
            id: "sibling-classes",
            cls: "provider-documented",
            text: "The sk-ant-api03- Claude API key and the sk-ant-admin01- Admin API key differ from this key only in the prefix segment and are distinct credential classes.",
            cite: [COMPLIANCE_ACCESS, ADMIN_KEYS],
          },
          {
            id: "third-party-guides",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Third-party integration guides name Enterprise api01 keys as a confusable and reject the wrong type, and vendor pages that repeat the prefix disagree with Anthropic on where the key is created.",
          },
        ],
        openQuestions: [
          {
            id: "api01-body",
            unresolved: "One issued Enterprise key would settle length, alphabet and whether it ends in AA; until then the body is unresearched.",
            text: "What are the length, alphabet and tail of an sk-ant-api01- key, and does it end in AA like the api03 and admin01 keys?",
          },
          {
            id: "api01-history",
            unresolved: "One unsourced blog says api01 and api02 were older general key generations, which Anthropic's Enterprise use of api01 appears to contradict; no provider source reconciles them.",
            text: "Was api01 ever a general key generation before it became the Enterprise organization key prefix?",
          },
          {
            id: "oauth-siblings",
            unresolved: "A scanner request names these two prefixes for Claude Code OAuth tokens; no provider source was found for either.",
            text: "Do sk-ant-oat01- and sk-ant-ort01- have a provider source and, if so, a family of their own?",
          },
          {
            id: "analytics-key",
            unresolved: "The compliance-access page lists an Analytics API key without a prefix, so there is nothing to describe yet.",
            text: "Does the Analytics API key have a documented prefix?",
            lead: [COMPLIANCE_ACCESS],
          },
          {
            id: "forum-coverage",
            unresolved: "The Reddit archive was rate-limited partway through the research, so the absence of community posts on api01 and admin01 is weak evidence.",
            text: "Do community posts that could not be read show a different api01 or admin01 shape?",
          },
        ],
      },
    },
    {
      id: "anthropic:admin-api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "An Admin API key begins sk-ant-admin01-. Two Anthropic pages document it, and one writes it sk-ant-admin... without the version segment.",
            cite: [ADMIN_KEYS, ADMIN_API],
            claims: ["field-prefix"],
          },
          {
            id: "body-93-aa",
            cls: "tool-corroborated",
            text: "After the prefix the body is 93 characters of letters, digits, underscore and hyphen, then AA, 110 characters in all. Only scanner rules state this and Anthropic states no length. Two of the three rules share a lineage (a rule set and its fork), so only the third is independent corroboration.",
            claims: ["field-body", "tool-corroboration"],
          },
          {
            id: "header",
            cls: "provider-documented",
            text: "The Admin API page sends the key in the x-api-key header. A Bearer header appears there for an OAuth org:admin token, so an admin key is not the only credential seen in that API's requests.",
            cite: [ADMIN_API],
            claims: ["field-header"],
          },
        ],
        issuance: [
          {
            id: "console-admin",
            cls: "provider-documented",
            text: "An organization admin creates the key in Claude Console under Settings, Admin keys. It is shown once, and a Console admin key has full access to every endpoint that accepts an Admin API key.",
            cite: [ADMIN_KEYS],
            claims: ["provider-source"],
          },
        ],
        lifecycle: [
          {
            id: "selectable-expiry",
            cls: "provider-documented",
            text: "The key's expiration is chosen when it is created.",
            cite: [ADMIN_KEYS],
            claims: ["provider-source"],
          },
        ],
        collisions: [
          {
            id: "sibling-classes",
            cls: "provider-documented",
            text: "The sk-ant-api03- Claude API key and the sk-ant-api01- Enterprise organization key are different classes and differ from the admin key by one prefix segment.",
            cite: [COMPLIANCE_ACCESS, ADMIN_KEYS],
            claims: ["field-sibling-classes"],
          },
        ],
        openQuestions: [
          {
            id: "admin-body-grammar",
            unresolved: "Anthropic's text states neither the always-93-plus-AA body nor a second version; confirming it needs a second key issued with a different expiry.",
            text: "Is the admin key body always 93 characters plus AA, and does an admin02 version exist?",
          },
          {
            id: "admin-version",
            unresolved: "admin01 is the only documented version; the unversioned spelling appears on one page and no source documents admin02.",
            text: "Is sk-ant-admin- without a version segment a real spelling, and is there a version other than admin01?",
            lead: [ADMIN_API],
          },
        ],
      },
    },
  ],
};
