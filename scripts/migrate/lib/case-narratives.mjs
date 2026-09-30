// Authored narrative for the cases the importer builds.
//
// The legacy suites carry structure (groups, twins, contexts, tiers) but very little
// prose. This module holds the human wording. It has three layers:
//
//   1. GROUPS: hand-written topic, scenario and importance for every hand-named
//      group of the non-generated-by-shape suites (milestone-6, reference syntax,
//      negative controls, SendGrid, context edges, accuracy, and so on).
//   2. ROLES: wording templates for the three roles a case can play (the positive
//      base, a one-property twin, a benign control), used with the family names.
//   3. Glossaries for mutation kinds, control types and carrier contexts.
//
// Wording states expected behavior in scanner-neutral terms. It never names a
// detector, a scanner or a product status. Everything here is deterministic text;
// nothing is read from scanner output.

export const NARRATIVE_VERSION = "1.0.0";

/** Scenario themes that cut across providers (added to `scenarios`). */
export const THEMES = {
  "documentation-placeholder": "Documentation examples, tutorial defaults and placeholder text that look like credentials but were never issued.",
  "templated-reference": "Template expressions, variable interpolation and secret-manager references that name a secret without containing it.",
  "partial-span-leakage": "Credentials embedded in a longer structure, where reporting only part of the value (or only the structure) leaves secret bytes exposed.",
  "high-signal-assignment-false-positive": "Values assigned under a credential-sounding name that are nevertheless not secrets, so the name alone must not decide.",
  "cross-provider": "The case involves credential families of more than one provider.",
};

// ---------------------------------------------------------------- glossaries

export const MUTATION_GLOSS = {
  length: "the value's length differs from the contracted length",
  prefix: "the prefix differs from the contracted prefix (another namespace or a near-identical spelling)",
  alphabet: "a character outside the documented alphabet is present",
  boundary: "the value is cut, extended or delimited so that it no longer ends where the format ends",
  context: "the value is unchanged but the carrier lacks the marker that makes the value identifiable",
  "public-prefix": "the prefix is that of a public sibling identifier rather than the secret",
  checksum: "the embedded checksum does not validate",
};

export const CONTROL_GLOSS = {
  "public-id": {
    what: "public identifiers that sit next to the credential and look like it but are not secret",
    why: "Providers publish identifiers (account, key or client ids) beside their secrets. Reporting one is a false alarm, and redacting it removes information a reader legitimately needs.",
    themes: [],
  },
  placeholder: {
    what: "documentation placeholders and example values for the credential",
    why: "Documentation is written to be copied. A placeholder was never issued, so reporting it is noise, and a scanner that stays silent on it must not also stay silent on a real value in the same position.",
    themes: ["documentation-placeholder"],
  },
  reference: {
    what: "references (variables, template expressions, secret-manager pointers) that name the credential without containing it",
    why: "A reference is the safe way to use a secret. Reporting it punishes the practice the scanner exists to encourage.",
    themes: ["templated-reference"],
  },
  "near-miss": {
    what: "near-miss values that resemble the format but break it (truncated, wrong separator, wrong prefix or too short)",
    why: "Incomplete or malformed values are not issued credentials. They test whether the format's structure, and not only its look, is what identifies a credential.",
    themes: [],
  },
  "encoded-value": {
    what: "benign encoded or hashed values of the same general shape",
    why: "Hashes, checksums and encoded text share alphabets and lengths with credentials. Reporting them is a false alarm that grows with repository size.",
    themes: [],
  },
  prose: {
    what: "prose or log lines that mention the credential type without a credential",
    why: "Text about credentials (rotation notices, error messages) is common and contains none. It tests whether the surrounding words alone decide the outcome.",
    themes: [],
  },
};

export const CONTEXT_GLOSS = {
  env: "environment files",
  "tool-output": "command and tool output",
  "source-code": "source code",
  header: "HTTP headers",
  "structured-file": "structured files (JSON, YAML, TOML)",
  "ci-config": "CI configuration",
  "container-config": "container and orchestration configuration",
  "basic-auth": "basic-auth URLs",
  "sdk-config": "SDK and client configuration",
  cli: "command lines",
  log: "log lines",
  prose: "prose",
  url: "URLs",
  "shell-export": "shell exports",
};

// ------------------------------------------------------------------- groups
// Keyed `<suite>|<legacy group>`. `topic` is a short noun phrase; `what` says what the
// inputs are; `why` says why the scenario matters. `flag` replaces `what` for the
// members of the group that the expectation says must be flagged. `themes` adds
// scenario tags. `incidentNote` is a fixed origin for the group where the legacy
// suite names one.

const CE = "context-edges|";
const M6 = "milestone-6-closed|";
const RS = "reference-syntax|";
const NC = "negative-controls|";
const SG = "sendgrid-regressions|";
const PQ = "policy-qualified-credentials|";

export const GROUPS = {
  [`${CE}Boundaries`]: {
    topic: "Credential at the edges of the input",
    what: "A credential-shaped value stands alone, or ends the input with no trailing newline, in the shape of one provider format per input.",
    why: "Scanners commonly anchor on delimiters. At the start and end of an input there is no delimiter, so boundary handling decides whether the value is found and whether its exact extent is right.",
  },
  [`${CE}Quoting`]: {
    topic: "Credential inside single or double quotes",
    what: "The value is assigned inside single or double quotes.",
    why: "Quotes are not part of a credential. Extent errors here either leave a quote in the report or drop the last character of the secret.",
    themes: ["partial-span-leakage"],
  },
  [`${CE}Structured text`]: {
    topic: "Credential in JSON, YAML, TOML and similar structured text",
    what: "The value is a field in a structured document.",
    why: "Real secrets live in configuration files. Structured syntax adds quoting, colons and nesting around the value without changing it.",
  },
  [`${CE}Source code`]: {
    topic: "Credential in a source-code string literal",
    what: "The value is a string literal in JavaScript or Python source.",
    why: "Hard-coded credentials in source are a common leak, and the surrounding code (assignments, semicolons, call syntax) differs from configuration files.",
  },
  [`${CE}Documentation`]: {
    topic: "Credential in Markdown or a comment",
    what: "The value appears in a Markdown code span or in a code comment.",
    why: "Credentials pasted into docs and comments are leaked as easily as those in config. The delimiters (backticks, comment markers) must not become part of the reported value.",
  },
  [`${CE}Encoding`]: {
    topic: "Credential after multibyte or unusual text",
    what: "The value follows emoji, CJK text, combining marks or a byte order mark.",
    why: "Ranges are byte offsets. A scanner that counts characters or code units instead of bytes reports the wrong range once earlier text is multibyte.",
  },
  [`${CE}Line endings`]: {
    topic: "Credential with Windows line endings and blank lines",
    what: "The value sits on a CRLF-terminated line or after blank lines.",
    why: "A carriage return must not be treated as part of the value, and blank lines must not shift the reported extent.",
  },
  [`${CE}Multiple spans`]: {
    topic: "Several credentials in one input",
    what: "Two or more distinct credentials appear on separate lines, repeated lines or the same line.",
    why: "Reporting must be exact per occurrence. Merged or dropped spans leave one of the credentials unredacted.",
    themes: ["partial-span-leakage"],
  },
  [`${CE}Long input`]: {
    topic: "Credential after a long prefix of benign text",
    what: "The value appears after roughly 72 KB of benign text.",
    why: "Scanners that window, chunk or truncate input must still find, or correctly ignore, values deep inside a large file.",
  },

  [`${M6}#254 · AWS documentation literals`]: {
    topic: "AWS documentation example credentials",
    what: "The example access key ID and secret access key from the AWS documentation appear bare, in environment assignments and in quoted assignments.",
    flag: "Values one character away from the published AWS example (a changed final character of the key ID or of the secret). They are no longer the documented example, so they must still be reported.",
    why: "These values are published to be copied and were never issued. Reporting them is noise, and a policy that silences them must not also silence a real value in the same position.",
    themes: ["documentation-placeholder"],
  },
  [`${M6}#255 · Tutorial URL passwords`]: {
    topic: "Tutorial passwords in connection URIs",
    what: "Connection URIs whose password is a tutorial default such as `mysecretpassword`.",
    flag: "Connection URIs whose password is a synthetic literal. Only the password bytes are the secret; the scheme, user and host are not.",
    why: "Tutorials and quickstarts ship default passwords that are not secrets. The same URI shape with a literal password is a real leak, so the password value, not the URI shape, decides.",
    themes: ["documentation-placeholder", "partial-span-leakage"],
  },
  [`${M6}#256 · Connection placeholders`]: {
    topic: "Placeholder passwords in connection URIs",
    what: "Connection URIs whose password is a placeholder such as `your_password_here` or `REPLACE_ME_PASSWORD`.",
    flag: "Connection URIs whose password only resembles a placeholder: filler characters ending in a real-looking character, or a placeholder word embedded in or prefixed to a real-looking value.",
    why: "Templates for connection strings are everywhere in documentation. A placeholder in the password position is an instruction to the reader, not a secret.",
    themes: ["documentation-placeholder"],
  },
  [`${M6}#257 · Placeholder vocabulary`]: {
    topic: "Placeholder words assigned to credential-named keys",
    what: "Assignments such as `secret=\" changeme\"` or `secret_key: \"REDACTED-EXAMPLE\"` where the key sounds like a credential and the value is placeholder vocabulary.",
    flag: "Values near the placeholder vocabulary but not in it: a placeholder word plus a digit, an unlisted word, or a placeholder word embedded in a longer real-looking value.",
    why: "The key name is a strong signal, so the value has to be examined: placeholder words in many spellings (leading space, trailing digit, compound) are not credentials.",
    themes: ["documentation-placeholder", "high-signal-assignment-false-positive"],
  },
  [`${M6}#262 · Line boundaries`]: {
    topic: "Credential-named key whose value is on the next line",
    what: "A credential-sounding key ends a line (a YAML block key, a password prompt) and the next line is unrelated text.",
    flag: "The same key with its value on the same line (also after a horizontal tab), which is a genuine assignment.",
    why: "Matching across a line break turns prompts and structure into false credentials. The value must be on the same logical line or in the same block.",
    themes: ["high-signal-assignment-false-positive"],
  },
  [`${M6}#263 · Fully delimited templates`]: {
    topic: "Fully delimited template expressions",
    what: "Values such as `{{ vault_db_password }}` in YAML, JSON and other carriers.",
    flag: "Values that only begin a template or embed one between real-looking text, so they are not fully delimited template expressions.",
    why: "A template expression is a reference to a secret, not the secret. Flagging it, or flagging only its inside, breaks templates that are correct.",
    themes: ["templated-reference"],
  },
  [`${M6}#264 · Masked values`]: {
    topic: "Masked values",
    what: "Values that were already masked (`********`, bullets) under credential-named keys.",
    flag: "Values that look masked but end in a real character (`********x`), so part of the value is exposed.",
    why: "A mask means the secret is already gone. Reporting it again is noise and pollutes the review of real findings.",
    themes: ["documentation-placeholder"],
  },
  [`${M6}#265 · Nested YAML recall`]: {
    topic: "Nested YAML: schema words versus a literal password",
    what: "YAML where `password:` heads a schema (`minLength: 12`) or a reference (`secretKeyRef`).",
    flag: "YAML where a nested `password:` key holds a synthetic literal value.",
    why: "Nesting hides the connection between a key and its value. A scanner must tell a schema or a reference under a password key apart from a real literal in the same structure.",
    themes: ["templated-reference", "high-signal-assignment-false-positive"],
  },
  [`${M6}#266 · Flow collections`]: {
    topic: "YAML flow collections that mention secrets by name",
    what: "Flow-style YAML (`secret: {secretName: web-tls-cert}`, arrays of references) where `secret` is a key of a structure, not a value.",
    flag: "Block-style YAML `secret:` holding a synthetic literal, and a quoted value that merely starts with a brace.",
    why: "Kubernetes-style manifests use `secret` as a structural key. Treating a name or a reference in a flow collection as a credential is a false alarm.",
    themes: ["templated-reference", "high-signal-assignment-false-positive"],
  },
  [`${M6}#278 · Code reference exclusions`]: {
    topic: "Code expressions used as credential values",
    what: "Assignments whose value is a code expression such as `settings.DATABASE_PASSWORD`, `config.apiKey` or `random_password.db.result`.",
    flag: "Values that look like code references but are not (dotted or underscored literals, a near-miss root name).",
    why: "Code that reads a secret from configuration is the recommended pattern. The expression is a reference and holds no secret.",
    themes: ["templated-reference", "high-signal-assignment-false-positive"],
  },
  [`${M6}#280 · Secret-manager grammars`]: {
    topic: "Secret-manager pointers",
    what: "Values such as `op://Vault/item/field`, `os.environ/NAME` or a GCP secret version path.",
    flag: "Values that only imitate a secret-manager grammar (a malformed pointer around a real-looking identifier).",
    why: "Secret-manager pointers name where a secret lives without disclosing it. Each manager has its own grammar, so a fix for one leaves the others.",
    themes: ["templated-reference"],
  },

  [`${RS}Code expressions · #278`]: {
    topic: "Code expressions as credential values",
    what: "Assignments in Python, TypeScript, Terraform and similar whose value is a code expression, not a literal.",
    why: "Reading a secret from settings or another resource is the safe pattern; the expression holds no secret.",
    themes: ["templated-reference", "high-signal-assignment-false-positive"],
  },
  [`${RS}Interpolation · #279`]: {
    topic: "Interpolation and command substitution as credential values",
    what: "Values such as `$(registryPassword)`, `$(pass show ...)` or `#{ENV['DB_PASSWORD']}` across several languages.",
    why: "Interpolation defers the secret to run time. Flagging the syntax flags every correctly written pipeline.",
    themes: ["templated-reference"],
  },
  [`${RS}Secret references · #280`]: {
    topic: "Secret-manager references as credential values",
    what: "Pointers into a secret manager or environment (1Password, LiteLLM, GCP resource names).",
    why: "The pointer is public and the secret is elsewhere; reporting it is a false alarm.",
    themes: ["templated-reference"],
  },
  [`${RS}Template controls · #263`]: {
    topic: "Template expression as credential value",
    what: "A Jinja expression assigned to a password key.",
    why: "A template expression is a reference, not a literal secret.",
    themes: ["templated-reference"],
  },
  [`${RS}Template controls`]: {
    topic: "Shell variable as credential value",
    what: "A shell variable expansion assigned to a password key.",
    why: "A variable expansion is a reference, not a literal secret.",
    themes: ["templated-reference"],
  },
  [`${RS}Literal-secret positive controls`]: {
    topic: "Literal secrets under generic credential names",
    what: "Synthetic literals assigned to `api_key`, `password` or `client_secret`, with dots, quotes, Unicode and CRLF.",
    why: "Every reference exclusion above is only trustworthy if a real literal in the same position is still reported. These positives are the counterweight, and they test generic credential handling rather than a provider format.",
    themes: ["high-signal-assignment-false-positive"],
  },

  [`${NC}Empty inputs`]: {
    topic: "Empty and whitespace-only inputs",
    what: "An empty input and an input holding only whitespace.",
    why: "The floor case: nothing in the input can be a credential.",
  },
  [`${NC}Placeholders`]: {
    topic: "Empty, referenced and templated values under a credential name",
    what: "`GITHUB_TOKEN=`, `GITHUB_TOKEN=${GITHUB_TOKEN}` and template references in configuration.",
    why: "The name is the strongest possible credential signal and the value is empty or a reference. The name alone must not produce a finding.",
    themes: ["documentation-placeholder", "templated-reference", "high-signal-assignment-false-positive"],
  },
  [`${NC}Public identifiers`]: {
    topic: "Hashes, commit ids and UUIDs",
    what: "SHA-256 checksums, commit hashes and UUIDs assigned to ordinary field names.",
    why: "Long random-looking values are everywhere in repositories and are public by nature.",
  },
  [`${NC}Benign encoded text`]: {
    topic: "Base64 text that is not a credential",
    what: "A base64 encoding of a public sentence.",
    why: "High-entropy alphabets alone do not make a credential.",
  },
  [`${NC}Ordinary text`]: {
    topic: "Ordinary prose, code and numbers",
    what: "Prose with Unicode, code that reads a token from the environment, and numeric build metadata.",
    why: "Text that discusses credentials, or code that handles them safely, contains none.",
  },
  [`${NC}Incomplete shapes`]: {
    topic: "Prefixes and truncated tokens",
    what: "Bare credential prefixes and tokens cut short of the format's length.",
    why: "A prefix alone, or a value shorter than the format allows, is not an issued credential.",
  },

  [`${SG}Provider detection`]: {
    topic: "SendGrid key in provider-specific fields",
    what: "The complete SendGrid key shape (base62 body, URL-safe `-`/`_`, trailing `-`) bare and in provider-named environment fields.",
    why: "The complete shape has punctuation inside and at the end of the value. Extent errors here either drop the last characters or split the value at a separator.",
    themes: ["partial-span-leakage"],
  },
  [`${SG}Generic fallback`]: {
    topic: "SendGrid key under a generic credential name",
    what: "The SendGrid key shape assigned to a generic `api_key`.",
    why: "Providers' keys are often stored under generic names. The reported extent must still cover the whole key, including trailing punctuation.",
    themes: ["partial-span-leakage"],
  },
  [`${SG}Structured text`]: {
    topic: "SendGrid key in JSON and quoted environment values",
    what: "The SendGrid key shape in JSON and in single-quoted environment values.",
    why: "Quotes and JSON punctuation must not be absorbed into or cut out of the value.",
    themes: ["partial-span-leakage"],
  },
  [`${SG}Encoding`]: {
    topic: "SendGrid key after multibyte text and CRLF",
    what: "The SendGrid key shape after Unicode text or on CRLF lines.",
    why: "Byte offsets must stay right after multibyte text, and a carriage return is not part of the key.",
  },
  [`${SG}Documentation`]: {
    topic: "SendGrid key in Markdown",
    what: "The SendGrid key shape inside a Markdown code span.",
    why: "A report that spans the closing backtick, or omits the trailing character, leaves part of the key exposed or redacts documentation text.",
    themes: ["partial-span-leakage"],
  },
  [`${SG}Authorization`]: {
    topic: "SendGrid key in a Bearer header",
    what: "The SendGrid key shape as a Bearer credential.",
    why: "The header name and scheme are not secret, but the whole key must be covered.",
    themes: ["partial-span-leakage"],
  },
  [`${SG}Near-miss negatives`]: {
    topic: "SendGrid near-misses",
    what: "Values with a shortened segment, a missing separator, the wrong prefix or only masks and prose.",
    why: "A near-miss is not an issued key. These prove that structure, not the `SG.` prefix, decides the outcome.",
  },

  [`${PQ}bearer-token`]: {
    topic: "Bearer credentials in authorization headers",
    what: "Bearer values of adequate length in `Authorization` and `Proxy-Authorization` headers, separated by spaces or tabs, and a value below the project length floor as a twin.",
    benign: "Bearer headers whose value is a variable reference, not a literal.",
    why: "Bearer tokens have no provider format. The header context and the value's length are the only signals, so they are project policy, stated as such.",
    themes: ["partial-span-leakage"],
  },
  [`${PQ}connection-string`]: {
    topic: "Passwords inside connection strings",
    what: "URIs (postgres, rediss and others) with a synthetic password in user-info or in the password-only position, and a twin with the password separator removed.",
    benign: "Connection URIs whose password is a variable reference, not a literal.",
    why: "Only the password is secret. The scheme, user and host are not, and redacting them is acceptable but must not replace covering the password.",
    themes: ["partial-span-leakage"],
  },
  [`${PQ}otpauth-uri`]: {
    topic: "One-time-password seeds in otpauth URIs",
    what: "`otpauth://` URIs with a synthetic base32 seed in varying query order, quoting and encodings, and a twin whose seed leaves the Base32 alphabet.",
    benign: "Values that only resemble a seed (lowercase, a too-short first `secret` parameter) and a variable reference.",
    why: "The seed is the secret; the label and issuer are not. Parameter order and carrier must not change the outcome.",
    themes: ["partial-span-leakage"],
  },
  [`${PQ}generic-token`]: {
    topic: "High-signal generic assignments",
    what: "Synthetic literals assigned to `api_key`, `password` and similar names, and a twin of the same value under a non-credential name such as `build_id`.",
    benign: "Assignments whose value is a variable reference, not a literal.",
    why: "With no provider format, the assignment name is the signal. The twin proves the name, not the value's shape alone, decides.",
    themes: ["high-signal-assignment-false-positive"],
  },

  "accuracy|Token formats": {
    topic: "Legacy filler credentials in an assignment",
    what: "Synthetic filler values (`ghp_SYNTHETIC...`, `AKIASYNTHETIC...`) in `NAME=value` lines from the first benchmark corpus.",
    why: "The oldest fixtures are not independently reviewed format examples; their expected ranges are kept as a project decision, not as evidence about the formats.",
  },
  "accuracy|Context": {
    topic: "Legacy filler credentials in header, Unicode and quoted contexts",
    what: "The same filler values in a Bearer header, after emoji, and in a quoted source-code literal.",
    why: "The first contexts the benchmark exercised; kept as a project decision, not as evidence.",
  },
  "accuracy|Negative controls": {
    topic: "Legacy benign inputs",
    what: "An empty assignment, a variable reference, documentation text, a public identifier and ordinary text.",
    why: "The first negative controls the benchmark exercised; expected silence is a project decision.",
    themes: ["documentation-placeholder", "templated-reference"],
  },
  "token-contexts|Environment": { topic: "GitHub token in an environment assignment", what: "One synthetic GitHub-shaped token in a `NAME=value` line, and a twin one character shorter.", why: "The smallest carrier: it shows whether the format's length, not the assignment, decides." },
  "token-contexts|JSON": { topic: "GitHub token in JSON", what: "One synthetic GitHub-shaped token as a JSON string value, and a twin one character shorter.", why: "JSON quoting must not be part of the value." },
  "token-contexts|Unicode": { topic: "GitHub token after emoji", what: "One synthetic GitHub-shaped token after emoji, and a twin one character shorter.", why: "Ranges are byte offsets; multibyte text before the value shifts them." },
  "token-contexts|CRLF": { topic: "GitHub token on CRLF lines", what: "One synthetic GitHub-shaped token on a Windows line, and a twin one character shorter.", why: "A carriage return is not part of the value." },
  "token-contexts|Negative controls": { topic: "GitHub token variable reference and prose", what: "A variable reference to the token and ordinary prose about GitHub access.", why: "Neither holds a credential.", themes: ["templated-reference"] },

  "real-world-shapes|realworld-config": { topic: "Realistic configuration files without secrets", what: "Docker Compose, nginx, application settings and similar configuration authored locally to look real.", why: "A scanner is run over real repositories, where almost everything is benign. This measures a global false-alarm floor, not any family's evidence." },
  "real-world-shapes|realworld-logs": { topic: "Realistic logs without secrets", what: "Access logs, error logs and deploy logs authored locally.", why: "Logs are dense with identifiers, ids and timestamps that resemble credentials." },
  "real-world-shapes|realworld-lockfile": { topic: "Lock files and checksums", what: "package-lock, yarn.lock, go.sum and similar snippets full of integrity hashes.", why: "Integrity hashes are long, random-looking and public." },
  "real-world-shapes|realworld-source": { topic: "Source code that handles credentials safely", what: "JavaScript, Python and Terraform snippets that read credentials from the environment.", why: "Code that mentions credentials is far more common than code that contains one." },
  "real-world-shapes|realworld-docs": { topic: "READMEs, API docs and changelogs", what: "Documentation that explains authentication without disclosing a credential.", why: "Documentation talks about credentials constantly and contains placeholders, not secrets.", themes: ["documentation-placeholder"] },
  "real-world-shapes|realworld-agent-output": { topic: "Agent transcripts and tool output", what: "Transcripts, MCP results and git output authored locally, including environment-style examples.", why: "Agent and tool payloads are a fast-growing source of text that passes through scanners." },
};

// ------------------------------------------------------------------- wording

const oxford = (xs) => (xs.length <= 1 ? xs.join("") : xs.length === 2 ? `${xs[0]} and ${xs[1]}` : `${xs.slice(0, -1).join(", ")}, and ${xs.at(-1)}`);
export { oxford };

export function contextPhrase(contexts) {
  const words = contexts.map((c) => CONTEXT_GLOSS[c] ?? c);
  if (!words.length) return "";
  return words.length > 6 ? ` across ${words.length} carrier types` : ` in ${oxford(words)}`;
}

export const OUTCOME_WORDS = {
  "must-flag": "must be flagged",
  "must-not-flag": "must not be flagged",
  "may-flag": "may be flagged",
  "not-assertable": "expected outcome not assertable",
};

/** Topic fallback for a case with no hand-written group entry. */
export function familyTopic(names, fallback) {
  if (!names.length) return fallback;
  if (names.length <= 2) return oxford(names);
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}
