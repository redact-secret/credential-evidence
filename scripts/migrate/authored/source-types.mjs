// Reviewed source types (ADR 0010).
//
// The taxonomy import types a source from the legacy field that cited it. A URL cited only by
// a dossier's undifferentiated research list has no such field, so it imports as `other`
// (docs/migration/taxonomy-report.md, "Source URLs with no known role"). A narrative
// statement cannot be `provider-documented` on a source of unknown type (the validator checks
// this), so a person who rewrites a dossier reads the sources it relies on and records the
// type here.
//
// Rules: only a source the mechanical import left as `other` can be reclassified, so this
// never overrides a role the legacy data stated. Each entry names the URL without its
// fragment, the reviewed type and the reason, which must be checkable from the URL alone
// (the issuer's own documentation or changelog host).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Reviewed types added per provider batch live in source-types.d/*.json ({ "<url>": { sourceType, reason } }).
const dir = join(dirname(fileURLToPath(import.meta.url)), "source-types.d");
const extra = existsSync(dir)
  ? Object.assign({}, ...readdirSync(dir).filter((n) => n.endsWith(".json")).sort().map((n) => JSON.parse(readFileSync(join(dir, n), "utf8"))))
  : {};

const base = {
  reviewedAt: "2026-09-30",
  reviewer: "milocosmopolitan",
  overrides: {
    "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_bearer.html": { sourceType: "provider-documentation", reason: "AWS IAM User Guide, published by AWS on its own documentation host" },
    "https://docs.aws.amazon.com/codeartifact/latest/ug/tokens-authentication.html": { sourceType: "provider-documentation", reason: "AWS CodeArtifact User Guide, published by AWS on its own documentation host" },
    "https://docs.aws.amazon.com/codeartifact/latest/APIReference/API_GetAuthorizationToken.html": { sourceType: "provider-documentation", reason: "AWS CodeArtifact API reference, published by AWS on its own documentation host" },
    "https://developers.openai.com/api/docs/guides/admin-apis": { sourceType: "provider-documentation", reason: "OpenAI API documentation, published by OpenAI on its own developer host" },
    "https://support.claude.com/en/articles/13015708-access-the-compliance-api": { sourceType: "provider-documentation", reason: "Anthropic's official help center article, published by Anthropic on its own support host" },
    "https://platform.claude.com/docs/en/manage-claude/compliance-activity-feed": { sourceType: "provider-documentation", reason: "Anthropic API documentation, published by Anthropic on its own documentation host" },
    "https://community.openai.com/t/1118492/2": { sourceType: "issue-or-discussion", reason: "a public forum thread: a staff post in a forum is a discussion, not provider documentation (docs/governance/evidence-classes.md)" },
  },
};

export default { ...base, overrides: { ...base.overrides, ...extra } };
