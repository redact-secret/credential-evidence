// Authored family narratives for the Vercel dossier (benchmarks/support/dossiers/vercel.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).
//
// Vercel gave each credential type a prefix in one changelog entry (2026-02-09): vcp for personal
// access tokens, vci for integration tokens, vca for app access tokens, vcr for app refresh tokens
// and vck for API keys. No Vercel page states a body grammar, so every body statement rests on a
// provider example, provider code or scanner rules, and the unproven parts are unresolved.

const CHANGELOG = "https://vercel.com/changelog/new-token-formats-and-secret-scanning";
const ACCESS_TOKENS = "https://vercel.com/docs/accounts/access-tokens";
const CLI_GLOBAL = "https://vercel.com/docs/cli/global-options";
const CLI_TOKENS = "https://vercel.com/docs/cli/tokens";
const TOKENS_ADD = "https://github.com/vercel/vercel/blob/c628be7835e03a965b93e9cf9e2bd5ac2acbf5eb/packages/cli/src/commands/tokens/add.ts#L36-L41";
const REST_AUTH = "https://vercel.com/docs/rest-api/authentication/create-an-auth-token";
const OPENAPI = "https://openapi.vercel.sh";
const AZURE = "https://github.com/vercel/vercel-azure-devops-extension/blob/24183cd1671cdb451e22a20634c2bb19e3478870/vercel-deployment-task-source/src/index.ts#L37-L38";
const SIGNIN_TOKENS = "https://vercel.com/docs/sign-in-with-vercel/tokens";
const SIGNIN_AUTH = "https://vercel.com/docs/sign-in-with-vercel/authorization-server-api";
const PLUGIN = "https://github.com/vercel/vercel-plugin/blob/c632a50838a47a639a160baff8411eb9c6af22bf/.claude/skills/benchmark-sandbox/SKILL.md#L144";
const TURBOREPO = "https://github.com/vercel/turborepo/blob/d7d106538e80f59c80a88ec9503770358197c5fa/crates/turborepo-auth/src/auth/mod.rs#L361";
const REFRESH_TEST = "https://github.com/vercel/vercel/blob/c628be7835e03a965b93e9cf9e2bd5ac2acbf5eb/packages/cli/test/unit/util/login/token-refresh.test.ts#L115-L125";
const INTEGRATIONS_DOC = "https://vercel.com/docs/integrations/create-integration/vercel-api-integrations";
const GATEWAY_KEYS = "https://vercel.com/docs/ai-gateway/authentication-and-byok/api-keys";
const GATEWAY_CLI = "https://vercel.com/docs/cli/ai-gateway";
const GATEWAY_TEST = "https://github.com/vercel/vercel/blob/c628be7835e03a965b93e9cf9e2bd5ac2acbf5eb/packages/cli/test/unit/commands/ai-gateway/coding-agents-setup.test.ts#L90";
const TRUFFLEHOG_LEGACY = "https://github.com/trufflesecurity/trufflehog/blob/4dd8831c5f12599465d4d45c3c447b4018a34c85/pkg/detectors/vercel/vercel.go#L25";
const KINGFISHER_PAT = "https://github.com/mongodb/kingfisher/blob/88d3f780fad83960aaddfcf732a690049853ccc9/crates/kingfisher-rules/data/rules/vercel.yml#L46-L91";
const KINGFISHER_VCI = "https://github.com/mongodb/kingfisher/blob/88d3f780fad83960aaddfcf732a690049853ccc9/crates/kingfisher-rules/data/rules/vercel.yml#L92-L132";
const KINGFISHER_VCA = "https://github.com/mongodb/kingfisher/blob/88d3f780fad83960aaddfcf732a690049853ccc9/crates/kingfisher-rules/data/rules/vercel.yml#L133-L192";
const KINGFISHER_VCR = "https://github.com/mongodb/kingfisher/blob/88d3f780fad83960aaddfcf732a690049853ccc9/crates/kingfisher-rules/data/rules/vercel.yml#L193-L251";
const KINGFISHER_VCK = "https://github.com/mongodb/kingfisher/blob/88d3f780fad83960aaddfcf732a690049853ccc9/crates/kingfisher-rules/data/rules/vercel.yml#L252-L299";
const BETTERLEAKS_PAT = "https://github.com/betterleaks/betterleaks/blob/2a387a5bad4290a84b9a1eb679bffe70611218cc/cmd/generate/config/rules/vercel.go#L46-L80";
const BETTERLEAKS_VCI = "https://github.com/betterleaks/betterleaks/blob/2a387a5bad4290a84b9a1eb679bffe70611218cc/cmd/generate/config/rules/vercel.go#L81-L114";
const BETTERLEAKS_VCA = "https://github.com/betterleaks/betterleaks/blob/2a387a5bad4290a84b9a1eb679bffe70611218cc/cmd/generate/config/rules/vercel.go#L115-L147";
const BETTERLEAKS_VCR = "https://github.com/betterleaks/betterleaks/blob/2a387a5bad4290a84b9a1eb679bffe70611218cc/cmd/generate/config/rules/vercel.go#L148-L181";
const BETTERLEAKS_VCK = "https://github.com/betterleaks/betterleaks/blob/2a387a5bad4290a84b9a1eb679bffe70611218cc/cmd/generate/config/rules/vercel.go#L182-L212";
const CREDSWEEPER = "https://github.com/Samsung/CredSweeper/blob/1aa60465c4ec064357ead06f5b4da7c3adbce7a8/credsweeper/rules/config.yaml#L1995-L2007";
const SECRETLINT = "https://github.com/secretlint/secretlint/blob/e8fc91351add9eebfd5eec5bdd7cd0d551d5e42a/packages/@secretlint/secretlint-rule-vercel/src/index.ts#L27-L58";
const GITHUB_SCANNING = "https://github.blog/changelog/2026-03-10-secret-scanning-pattern-updates-march-2026/";

export default {
  provider: "vercel",
  dropped: [
    { part: "Verdicts table (verdict, evidence level and the corroborated-route counts per family) and the correction history of the research pass", reason: "verdicts and evidence levels are already carried by family research and evidence classes; the counting rules are internal evidence-threshold bookkeeping" },
    { part: "Maintainer ruling Q-VC (treat the five classes as one generator) and open question 4's second half", reason: "an internal ruling about when the project would treat a format as established, not a property of the credential; the shared-generator inference is carried as unresolved where it matters" },
    { part: "Section on what the frozen shape does not freeze (boundary behaviour, hedged third-party length ranges)", reason: "matching-policy choices for a scanner contract; the underlying disagreements are carried as statements" },
    { part: "Third-party pull request that derived a 24-character mask from the placeholder", reason: "state of another project's change request, not credential knowledge; the placeholder fact is carried" },
    { part: "Candidate: legacy unprefixed 24-character tokens", reason: "not carried as a family; the shape and its evidence are carried as statements of the access-token record, and whether it should become a family is a taxonomy decision" },
    { part: "Open question 5 (whether the legacy form becomes its own family and the aggregate leaves the taxonomy)", reason: "a taxonomy decision, not credential knowledge" },
    { part: "Candidate: a sixth GitHub secret-scanning type for support access tokens", reason: "not a family; no published prefix in any source read" },
    { part: "Candidates: blob read-write tokens and gateway client secrets", reason: "not researched; no provider page was read" },
    { part: "Section 'Searched with no Vercel-specific result' and the research log", reason: "research workflow state, not credential knowledge" },
    { part: "Current-contract links and the warning not to call the compromised-secret route with a real value", reason: "product policy and testing guidance are not carried (ADR 0010 section 5)" },
  ],
  families: [
    {
      id: "vercel:access-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "not-a-family",
            unresolved: "The research verdict is that this record is not a credential family: it is a label that groups five prefixed classes, so there is no shape of its own to research, and its former profile combined five hypotheses that must not be read as evidence for any modern class.",
            text: "This record does not describe a single credential. It stands for the five prefixed Vercel token classes taken together, and no body grammar is stated for the group.",
            lead: [CHANGELOG, ACCESS_TOKENS],
          },
          {
            id: "prefixes",
            cls: "provider-documented",
            text: "Vercel's changelog of 2026-02-09 gave each credential type a prefix: vcp for personal access tokens, vci for integration tokens, vca for app access tokens, vcr for app refresh tokens and vck for API keys. Each class is its own record.",
            cite: [CHANGELOG],
          },
          {
            id: "opaque-body",
            unresolved: "Vercel states the body is opaque and gives no length or alphabet for any class.",
            text: "The provider calls the token body an opaque format not meant to be human-readable and states no length or alphabet.",
            lead: [ACCESS_TOKENS],
          },
        ],
        lifecycle: [
          {
            id: "legacy-24",
            cls: "tool-corroborated",
            text: "Before the prefixes, tokens were 24 alphanumeric characters with no marker. A scanner rule for Vercel still matches only a 24-character alphanumeric value labelled as Vercel's, and other scanners do the same, so the legacy form is corroborated but only in context.",
            cite: [TRUFFLEHOG_LEGACY],
          },
          {
            id: "legacy-rest-example",
            cls: "provider-documented",
            text: "Vercel's REST reference for creating an auth token shows an unprefixed 24-character bearer token beside a prefix of vcp_. The example data carries 2021-era timestamps and the generated SDK documentation copies it unchanged, so it predates the 2026 formats and is taken as the legacy form.",
            cite: [REST_AUTH],
          },
        ],
        collisions: [
          {
            id: "bare-24-ids",
            unresolved: "Recorded in a research note without a cited source.",
            text: "A bare 24-character alphanumeric value collides with Vercel identifiers, so the legacy form is recognisable only with a Vercel label beside it.",
          },
        ],
        openQuestions: [
          {
            id: "legacy-still-issued",
            unresolved: "No source says whether Vercel still issues unprefixed tokens.",
            text: "Does Vercel still issue unprefixed tokens?",
          },
        ],
      },
    },
    {
      id: "vercel:personal-access-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "Vercel's access-tokens guide says personal access tokens begin with the prefix vcp_, and its changelog names the same class.",
            cite: [ACCESS_TOKENS, CHANGELOG],
            claims: ["field-prefix"],
          },
          {
            id: "provider-example-length",
            cls: "provider-documented",
            text: "The CLI global-options page prints one vcp_ value, in the --token example and the VERCEL_TOKEN example, with a 56-character body of letters and digits, 60 in all. The value is hand-written (it ends in an English word), so it shows a shape and is not a generated token.",
            cite: [CLI_GLOBAL],
            claims: ["field-body"],
          },
          {
            id: "peer-rules-length",
            cls: "tool-corroborated",
            text: "Three scanner rules (Kingfisher, Betterleaks and CredSweeper) give the same 60-character total. They are less independent than they look: Kingfisher's examples are synthetic values, Betterleaks copies Kingfisher's examples, and CredSweeper's samples are independent of Kingfisher.",
            cite: [KINGFISHER_PAT, BETTERLEAKS_PAT, CREDSWEEPER],
            claims: ["tool-corroboration"],
          },
          {
            id: "alphabet",
            cls: "tool-corroborated",
            text: "Every provider example uses letters and digits only. Kingfisher and Betterleaks accept underscore and hyphen in the body, while CredSweeper and one more rule accept letters and digits only. Provider masking expressions in the Azure DevOps extension and the CLI admit underscore and hyphen but state no length.",
            cite: [KINGFISHER_PAT, BETTERLEAKS_PAT, CREDSWEEPER, AZURE],
            claims: ["field-alphabet-bound"],
          },
          {
            id: "checksum",
            unresolved: "Kingfisher's rule states that the last 6 characters are the base62 form of the CRC-32 of the first 50, one provider value for another class passes it, and the hand-written vcp_ example fails it; one provider value is too little to establish it.",
            text: "It is not established whether the last 6 characters of a personal access token are a checksum of the first 50 characters of the body.",
            leadClaims: ["field-checksum"],
            lead: [OPENAPI],
          },
          {
            id: "boundary",
            unresolved: "No provider statement; scanner rules require a non-token character on both sides but that is their matching choice.",
            text: "It is not established how a token behaves when glued to other token characters on either side.",
          },
        ],
        issuance: [
          {
            id: "scopes",
            cls: "provider-documented",
            text: "Vercel's CLI treats vcp_ as the personal-token marker and says some are team- or project-scoped, so the prefix does not imply full-account scope. The CLI tokens page says adding a token requires a classic personal access token.",
            cite: [TOKENS_ADD, CLI_TOKENS],
          },
        ],
        collisions: [
          {
            id: "legacy-and-placeholder",
            cls: "provider-documented",
            text: "The REST reference example pairs an unprefixed 24-character bearer token with a vcp_ prefix, which is the legacy form and not a current token. The access-tokens guide uses a masked vcp_ filler of 24 x characters, which is a placeholder and not a generated value.",
            cite: [REST_AUTH, ACCESS_TOKENS],
          },
          {
            id: "sibling-ids",
            unresolved: "Recorded in a research note without a cited source.",
            text: "Deployment, project, team, integration and client ids are sibling identifiers, and an unprefixed 24-character value is not decided by width alone.",
          },
          {
            id: "github-type",
            cls: "tool-corroborated",
            text: "GitHub's secret scanning lists a vercel_personal_access_token type and enabled push protection for it by default in March 2026. The type names the class and does not state a shape.",
            cite: [GITHUB_SCANNING],
          },
        ],
        openQuestions: [
          {
            id: "classic",
            unresolved: "The CLI documentation does not say whether classic means the unprefixed legacy form or a full-scope vcp_ token.",
            text: "Is a classic personal token the unprefixed legacy form or a full-scope vcp_ token?",
          },
          {
            id: "body-alphabet",
            unresolved: "A provider statement or one inspected, revoked token would settle it; none was available.",
            text: "Do underscore or hyphen occur in the 56-character body?",
          },
        ],
      },
    },
    {
      id: "vercel:integration-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "stem",
            cls: "provider-documented",
            text: "Vercel's changelog names the stem vci for integration tokens and prints no value.",
            cite: [CHANGELOG],
          },
          {
            id: "underscore-and-body",
            unresolved: "No Vercel page, specification or source writes vci_ with the underscore or shows a value; the underscore, 56-character body and alphabet come from scanner rules only, from three owners but one source class.",
            text: "It is not established that an integration token is vci_ followed by 56 characters, as the sibling classes with provider examples are.",
            lead: [KINGFISHER_VCI, BETTERLEAKS_VCI, SECRETLINT],
          },
          {
            id: "peer-rules",
            cls: "tool-corroborated",
            text: "Kingfisher, Betterleaks and secretlint have rules for the class. Kingfisher's and Betterleaks's examples are synthetic values; Betterleaks copies Kingfisher's examples; secretlint accepts 20 to 60 letters and digits. GitHub's vercel_integration_access_token type names the class and not a shape.",
            cite: [KINGFISHER_VCI, BETTERLEAKS_VCI, SECRETLINT, GITHUB_SCANNING],
          },
        ],
        issuance: [
          {
            id: "oauth-exchange",
            unresolved: "Whether OAuth code exchange now returns vci_ tokens is undocumented; the Building Integrations page still shows unprefixed 24-character access-token and client values in its examples, which look legacy or stale.",
            text: "Integration tokens are obtained by creating an integration and running the OAuth code exchange.",
            lead: [INTEGRATIONS_DOC],
          },
          {
            id: "no-sample",
            unresolved: "No integration token was issued for this research; the planned check (marker with underscore, total length 60, body alphabet and whether the last 6 characters checksum the previous 50) was not performed.",
            text: "None of the shape properties has been checked against an issued token.",
          },
        ],
        openQuestions: [
          {
            id: "shared-generator",
            unresolved: "No source says whether the five classes share one generator.",
            text: "Do the five classes share one generator, so that the structure of vcp_ and vca_ extends to vci_?",
          },
        ],
      },
    },
    {
      id: "vercel:app-access-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "App access tokens, issued by Sign in with Vercel, begin with vca_, as the changelog, the authorization-server reference and Vercel's OpenAPI specification show.",
            cite: [CHANGELOG, SIGNIN_AUTH],
            claims: ["field-prefix"],
          },
          {
            id: "body",
            cls: "provider-documented",
            text: "The Sign in with Vercel Tokens page shows a 60-character example (vca_ plus a 56-character body of letters and digits) and calls the format opaque, validated on the server. The example predates the changelog, since an archived copy is from November 2025.",
            cite: [SIGNIN_TOKENS],
            claims: ["field-body"],
          },
          {
            id: "peers-copy-example",
            cls: "tool-corroborated",
            text: "Kingfisher and Betterleaks both state vca_ plus 56, but both copy Vercel's own example value, so they add no independent observation of the body.",
            cite: [KINGFISHER_VCA, BETTERLEAKS_VCA],
            claims: ["tool-corroboration"],
          },
          {
            id: "alphabet",
            cls: "provider-documented",
            text: "Every provider example of the body uses letters and digits only, and Vercel's Azure DevOps extension masks vca_ followed by letters, digits, underscore and hyphen without a length.",
            cite: [SIGNIN_TOKENS, AZURE],
            claims: ["field-alphabet-bound"],
          },
          {
            id: "token-suffix",
            cls: "provider-documented",
            text: "Vercel's OpenAPI specification describes a tokenSuffix field as the token checksum suffix, and the one provider vca_ example passes a check in which the last 6 characters are the base62 form of the CRC-32 of the first 50.",
            cite: [OPENAPI, SIGNIN_TOKENS],
          },
          {
            id: "checksum-open",
            unresolved: "One provider value is too little to establish that every token carries the checksum, and a 50 plus 6 split is not stated by any provider page.",
            text: "It is not established that every app access token ends in a checksum of its first 50 characters.",
            leadClaims: ["field-checksum"],
          },
        ],
        issuance: [
          {
            id: "cli-login",
            cls: "provider-documented",
            text: "Vercel's own command-line login stores a vca_ token: Turborepo's authentication code treats a token that starts with vca_ as an OAuth token rather than a legacy one, and a Vercel skill file refers to the same.",
            cite: [TURBOREPO, PLUGIN],
          },
        ],
        lifecycle: [
          {
            id: "lifetime",
            cls: "provider-documented",
            text: "App access tokens last one hour.",
            cite: [SIGNIN_TOKENS],
          },
          {
            id: "revocation",
            cls: "tool-corroborated",
            text: "Kingfisher documents revoking the token through Vercel's OAuth token-revocation route with client credentials.",
            cite: [KINGFISHER_VCA],
          },
        ],
        collisions: [
          {
            id: "legacy-token",
            cls: "provider-documented",
            text: "The legacy unprefixed 24-character token is a different form, and vci_ and vck_ are other Vercel classes whose body is not established.",
            claims: ["field-sibling-classes"],
          },
        ],
      },
    },
    {
      id: "vercel:app-refresh-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix",
            cls: "provider-documented",
            text: "App refresh tokens begin with vcr_, as the changelog, the authorization-server reference and Vercel's OpenAPI specification show.",
            cite: [CHANGELOG, SIGNIN_AUTH],
            claims: ["field-prefix"],
          },
          {
            id: "body",
            cls: "provider-documented",
            text: "The Sign in with Vercel Tokens page example reuses the vca_ body behind a vcr_ prefix, so the 56-character body of letters and digits is the same observation as for app access tokens and there is no independent vcr_ body.",
            cite: [SIGNIN_TOKENS],
            claims: ["field-body"],
          },
          {
            id: "peers",
            cls: "tool-corroborated",
            text: "Kingfisher and Betterleaks state vcr_ plus 56, with Kingfisher's example copying Vercel's value and Betterleaks copying Kingfisher's.",
            cite: [KINGFISHER_VCR, BETTERLEAKS_VCR],
            claims: ["tool-corroboration"],
          },
          {
            id: "cli-test-dummies",
            cls: "provider-documented",
            text: "Vercel's CLI refresh-token tests use short dummy values, which show the marker and the role and not the body length.",
            cite: [REFRESH_TEST],
          },
          {
            id: "alphabet",
            cls: "provider-documented",
            text: "Every provider example of the body uses letters and digits only, and underscore and hyphen are not claimed in the body.",
            cite: [SIGNIN_TOKENS],
            claims: ["field-alphabet-bound"],
          },
          {
            id: "checksum-open",
            unresolved: "One provider value for the sibling class is the only checksum-valid example; no provider page states a checksum for refresh tokens.",
            text: "It is not established that a refresh token ends in a checksum of its first 50 characters.",
            leadClaims: ["field-checksum"],
          },
        ],
        lifecycle: [
          {
            id: "lifetime",
            cls: "provider-documented",
            text: "Refresh tokens last 30 days and rotate on use.",
            cite: [SIGNIN_TOKENS],
          },
        ],
        collisions: [
          {
            id: "siblings",
            cls: "provider-documented",
            text: "The legacy unprefixed 24-character token is a different form, and vci_ and vck_ are other Vercel classes whose body is not established.",
            claims: ["field-sibling-classes"],
          },
        ],
        openQuestions: [
          {
            id: "independent-body",
            unresolved: "The only provider example copies the vca_ body, so no source shows a vcr_ body that is independent of it.",
            text: "Does a refresh token have its own independent body grammar?",
          },
        ],
      },
    },
    {
      id: "vercel:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "marker",
            cls: "provider-documented",
            text: "The AI Gateway API Keys page and the vercel ai-gateway CLI page show vck_ followed by an ellipsis, and a mask of vck_ plus four dots plus four digits. Vercel's CLI, AI SDK and Terraform tests use short vck_ dummy values. The marker with its underscore is therefore provider-backed.",
            cite: [CHANGELOG, GATEWAY_KEYS, GATEWAY_CLI, GATEWAY_TEST],
          },
          {
            id: "no-full-value",
            unresolved: "No provider source shows a full-length vck_ value, and no page states a grammar for the body.",
            text: "It is not established that an API key is vck_ followed by 56 characters.",
            lead: [GATEWAY_KEYS, GATEWAY_CLI],
          },
          {
            id: "peer-rules",
            cls: "tool-corroborated",
            text: "Kingfisher and Betterleaks state vck_ plus 56 with synthetic examples, Betterleaks copying Kingfisher's, and secretlint covers the marker only. GitHub's secret scanning lists a type for the class that names it and states no shape.",
            cite: [KINGFISHER_VCK, BETTERLEAKS_VCK, SECRETLINT, GITHUB_SCANNING],
          },
        ],
        issuance: [
          {
            id: "no-sample",
            unresolved: "No AI Gateway key was issued for this research; creating one key in the dashboard and recording its structure, then revoking it, would settle the length and alphabet.",
            text: "None of the shape properties has been checked against an issued key.",
          },
        ],
        lifecycle: [
          {
            id: "compromised-report",
            cls: "provider-documented",
            text: "The AI Gateway documentation describes an unauthenticated route, POST /external/compromised_secret, for reporting a leaked key.",
            cite: [GATEWAY_KEYS],
          },
        ],
        openQuestions: [
          {
            id: "shared-generator",
            unresolved: "No source says whether the five classes share one generator, so the structure of vcp_ and vca_ may not extend to vck_.",
            text: "Do the five Vercel classes share one generator and one 56-character body?",
          },
        ],
      },
    },
  ],
};
