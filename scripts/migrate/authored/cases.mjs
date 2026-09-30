// Hand-authored Case prose (ADR 0007 criteria, ADR 0008).
//
// A Case is a reasoning unit someone analysed: a failure mode or ambiguity specific
// to it, prose that no template could produce, an expectation with its own
// justification. Every entry here is written by hand for exactly the inputs it
// covers; nothing is substituted from a family name or a role template.
//
// `from` lists the legacy groups (`<suite>|<group>|<outcome>`) whose fixtures the
// Case carries. Several legacy groups that differ only in evidence tier, or that
// state the same reasoning in two suites, fold into one Case; the tier is kept on
// each fixture's own evidence entry (ADR 0007 section 2).
//
//   title       what the Case is about, in a line.
//   summary     what the inputs are (what happened).
//   rationale   why it matters (what fails when it is handled wrongly).
//   expectation why this outcome is the right one, and what it rests on.
//   scenarios   Scenario records the Case instantiates or is an instance of.

export const CASES = [
  // ------------------------------------------------------------------ first corpus
  {
    id: "early-filler-token-assignments",
    from: ["accuracy|Token formats|must-flag"],
    title: "Filler GitHub and AWS tokens assigned in NAME=value lines",
    summary:
      "Two environment-style lines from the benchmark's first corpus: a GitHub classic token and an AWS access key id, each built from the provider's prefix followed by the word SYNTHETIC and repeated filler characters, so the length and prefix are right and the body is obviously not issued.",
    rationale:
      "These were the first values the benchmark asked a scanner to find. They prove a prefix-and-length match in the simplest carrier, but they are filler, not independent format examples, so they are kept as a project decision and must not be read as evidence about either format.",
    expectation:
      "Flagged by project decision: the prefix and length match the documented formats and the carrier names the credential type. Nothing beyond the project's own authoring supports the exact ranges.",
    scenarios: ["partial-span-leakage"],
  },
  {
    id: "early-filler-token-contexts",
    from: ["accuracy|Context|must-flag"],
    title: "Filler tokens in a Bearer header, after emoji, and in a quoted source literal",
    summary:
      "Three inputs from the first corpus: a Bearer header carrying a synthetic token, a GITHUB_TOKEN assignment that follows an emoji, and a JavaScript string literal holding a GitHub-shaped filler token.",
    rationale:
      "They were the first contexts the benchmark exercised beyond a bare assignment: a header, multibyte text before the value (which shifts byte offsets), and a quoted literal whose quotes are not part of the secret.",
    expectation:
      "Flagged by project decision, with the exact secret range. The contexts are ordinary and the values carry documented prefixes or header position; the expectation records the project's choice, not provider evidence.",
    scenarios: ["partial-span-leakage"],
  },
  {
    id: "early-benign-inputs",
    from: ["accuracy|Negative controls|must-not-flag"],
    title: "Empty assignment, variable reference, documentation text, request id and ordinary text",
    summary:
      "Five benign inputs from the first corpus: an API_KEY assignment with no value, an API_KEY assigned a variable reference, a sentence telling the reader to set an API key, a greeting, and a UUID request id.",
    rationale:
      "The first negative controls. Each holds a credential-sounding word or an identifier-shaped value and no credential, so they show that the name, the word or the shape alone does not decide.",
    expectation:
      "Not flagged. There is no secret byte in any of them: the assignments are empty or a reference, the sentences are prose, and a UUID request id is a public identifier.",
    scenarios: ["credential-named-assignment-false-positive", "templated-reference"],
  },

  // ------------------------------------------------------- AWS documentation literals
  {
    id: "aws-documented-example-keys",
    from: ["milestone-6-closed|#254 · AWS documentation literals|must-not-flag"],
    title: "The AWS documentation example access key and secret",
    summary:
      "The access key id AKIAIOSFODNN7EXAMPLE and the secret access key wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY that AWS publishes in its documentation, appearing bare, in an AWS_ACCESS_KEY_ID assignment and in a quoted secret assignment.",
    rationale:
      "The pair is printed in tutorials to be copied and was never issued. A scanner that reports it buries real findings in noise; a policy that silences it on purpose must not also silence real values that merely look similar, which is what the paired Case checks.",
    expectation:
      "Not flagged. The values are the provider's published examples, not issued credentials; the project policy is to treat exactly these documented literals as placeholders.",
    scenarios: ["documentation-placeholder"],
  },
  {
    id: "aws-example-keys-one-character-off",
    from: ["milestone-6-closed|#254 · AWS documentation literals|must-flag"],
    title: "AWS example keys with one character changed",
    summary:
      "Two assignments that differ from the AWS documentation examples in a single character: the access key id ends in F instead of E, and the secret access key ends in EXAMPLEKEZ instead of EXAMPLEKEY.",
    rationale:
      "Silencing the documented example is only safe if the exemption is exact. A value one character away is no longer the published example, could be a real key, and must still be reported; matching on the EXAMPLE marker alone would hide it.",
    expectation:
      "Flagged. Only the exact published literals are exempt by project policy; any other value in the same position is treated as a credential, and the range covers the whole value.",
    scenarios: ["documentation-placeholder"],
  },

  // ----------------------------------------------------------- connection-URI passwords
  {
    id: "tutorial-default-url-passwords",
    from: ["milestone-6-closed|#255 · Tutorial URL passwords|must-not-flag"],
    title: "Tutorial default passwords in database connection URIs",
    summary:
      "Postgres, MySQL and MariaDB connection URIs whose password is a default that tutorials print, such as mysecretpassword or changeit, across several schemes and carriers.",
    rationale:
      "Quickstarts ship default passwords that are the same on every machine. They are not secrets, and reporting every tutorial URI makes the password rule unusable in documentation-heavy repositories.",
    expectation:
      "Not flagged. The password is a published tutorial default shared by every reader, so it carries no secret; the project policy lists these literals as non-secret.",
    scenarios: ["documentation-placeholder"],
  },
  {
    id: "literal-url-passwords",
    from: ["milestone-6-closed|#255 · Tutorial URL passwords|must-flag"],
    title: "Synthetic literal passwords in database connection URIs",
    summary:
      "The same connection URI shapes as the tutorial defaults (postgres, mysql, mariadb and others) with a synthetic random-looking password in the user-info position.",
    rationale:
      "The exemption for tutorial passwords must depend on the password, not on the URI shape. A real literal in an identical URI is a leak, and only the password bytes are secret: reporting just the scheme and host, or stopping early, leaves the password exposed.",
    expectation:
      "Flagged, and the range must cover the password. The value is not a known tutorial default and is assigned in the one position where a connection URI holds a secret.",
    scenarios: ["partial-span-leakage"],
  },
  {
    id: "connection-uri-placeholder-passwords",
    from: ["milestone-6-closed|#256 · Connection placeholders|must-not-flag"],
    title: "Placeholder passwords in connection URI templates",
    summary:
      "Connection URIs whose password is an instruction to the reader, such as your_password_here, insert-password-here or REPLACE_ME_PASSWORD.",
    rationale:
      "Connection-string templates are in every README and every example configuration. A placeholder in the password position tells the reader to substitute a value; reporting it is pure noise.",
    expectation:
      "Not flagged. The password is placeholder wording, not an issued secret, and no provider or tool treats these phrases as credentials.",
    scenarios: ["documentation-placeholder"],
  },
  {
    id: "connection-uri-placeholder-lookalike-passwords",
    from: ["milestone-6-closed|#256 · Connection placeholders|must-flag"],
    title: "Passwords that only resemble a placeholder",
    summary:
      "Connection URIs whose password imitates a placeholder but carries real-looking material: filler characters ending in a real-looking character, a placeholder word embedded in a long random value, or a placeholder word prefixed to one.",
    rationale:
      "A placeholder rule that matches on a substring would silence any password containing the word password or secret. These values are built to contain such words and still hold a real-looking tail that must be covered.",
    expectation:
      "Flagged. The placeholder exemption applies only to whole placeholder values; a value with a real-looking tail is a literal, and the range covers it entirely.",
    scenarios: ["documentation-placeholder", "partial-span-leakage"],
  },

  // -------------------------------------------------------------- placeholder vocabulary
  {
    id: "placeholder-vocabulary-values",
    from: ["milestone-6-closed|#257 · Placeholder vocabulary|must-not-flag"],
    title: "Placeholder words under credential-named keys",
    summary:
      "Assignments such as secret=\" changeme\" (leading space), secret_key=\"changeme2\" and secret_key: \"REDACTED-EXAMPLE\", where the key sounds like a credential and the value is placeholder vocabulary in several spellings.",
    rationale:
      "The key name is a strong signal, so the value has to be looked at. Placeholder words written with a leading space, a trailing digit or as a compound are still placeholders, and treating only exact matches as placeholders flags half of the documentation examples.",
    expectation:
      "Not flagged. The values are placeholder vocabulary in recognised spellings; nothing in them was issued, and the key name alone is not evidence of a secret.",
    scenarios: ["documentation-placeholder", "credential-named-assignment-false-positive"],
  },
  {
    id: "placeholder-vocabulary-near-misses",
    from: ["milestone-6-closed|#257 · Placeholder vocabulary|must-flag"],
    title: "Values one step away from the placeholder vocabulary",
    summary:
      "Assignments under the same credential-named keys whose values are near the placeholder words but not in them: password1, SECRET01, an unlisted REDACTED-EXAMPLE-VALUE, or a placeholder word inside a longer real-looking value.",
    rationale:
      "A placeholder vocabulary that is too generous becomes an allowlist for weak real passwords. Near-misses mark where the vocabulary ends; below the line the value is a literal someone may actually use.",
    expectation:
      "Flagged. The value is not in the placeholder vocabulary, it sits under a credential-named key, and real systems use values like these; project policy treats it as a literal secret.",
    scenarios: ["documentation-placeholder", "credential-named-assignment-false-positive"],
  },

  // ---------------------------------------------------------------- line boundaries
  {
    id: "credential-key-ending-a-line",
    from: ["milestone-6-closed|#262 · Line boundaries|must-not-flag"],
    title: "A credential-sounding key at the end of a line",
    summary:
      "A YAML block key such as secret: followed by nested keys on the next lines, and password prompts such as Password: or an SSH prompt that end a line, each followed by unrelated text on the next line.",
    rationale:
      "Matching across a line break turns prompts and structure into false credentials: the next line's first word becomes the value. The value of an assignment has to be on the same logical line or in the same block.",
    expectation:
      "Not flagged. There is no value on the key's line; what follows belongs to another line or is structure, so there is no secret to cover.",
    scenarios: ["credential-named-assignment-false-positive"],
  },
  {
    id: "credential-key-with-same-line-value",
    from: ["milestone-6-closed|#262 · Line boundaries|must-flag"],
    title: "A credential-sounding key with its value on the same line",
    summary:
      "password: followed by a synthetic literal on the same line, once with a space and once with a horizontal tab and a CRLF line ending.",
    rationale:
      "The line-boundary rule must not hide genuine assignments. The same key that is silent at the end of a line is a real leak when the value follows on the line, whatever whitespace separates them.",
    expectation:
      "Flagged. A literal value on the same line as a credential-named key is an assignment; the range is the value, not the key or the line ending.",
    scenarios: ["credential-named-assignment-false-positive"],
  },

  // ------------------------------------------------------------- template expressions
  {
    id: "fully-delimited-template-expressions",
    from: ["milestone-6-closed|#263 · Fully delimited templates|must-not-flag", "reference-syntax|Template controls · #263|must-not-flag"],
    title: "Fully delimited template expressions as password values",
    summary:
      "password: \"{{ vault_db_password }}\" in double-quoted, single-quoted and JSON carriers: a Jinja-style expression that opens and closes its delimiters and names a variable.",
    rationale:
      "A template expression is a reference to a secret that lives elsewhere. Flagging it, or flagging only the text inside the braces, breaks every Ansible or Helm file written correctly.",
    expectation:
      "Not flagged. A complete template expression holds no secret bytes; the value is the variable's name.",
    scenarios: ["templated-reference", "credential-named-assignment-false-positive"],
  },
  {
    id: "partially-delimited-template-expressions",
    from: ["milestone-6-closed|#263 · Fully delimited templates|must-flag"],
    title: "Values that begin a template or embed one between real-looking text",
    summary:
      "A password whose value starts with {{ but never closes it, and a password with a real-looking run, a {{var}} expression, and another real-looking run.",
    rationale:
      "If any brace pair silenced a value, wrapping a real secret in braces would hide it. The exemption covers only fully delimited expressions; anything else still contains literal characters that must be covered.",
    expectation:
      "Flagged. A value that is not a complete template expression carries literal material next to the braces, and the whole literal must be reported.",
    scenarios: ["templated-reference", "partial-span-leakage"],
  },

  // ------------------------------------------------------------------- masked values
  {
    id: "already-masked-values",
    from: ["milestone-6-closed|#264 · Masked values|must-not-flag"],
    title: "Values that were already masked",
    summary:
      "Password: ********, Password: •••••••• and PASSWORD=********: values that consist only of mask characters under a credential-named key.",
    rationale:
      "A mask means the secret is already gone. Reporting it again is noise that pollutes the review of real findings.",
    expectation:
      "Not flagged. A run of mask characters carries no secret.",
    scenarios: ["documentation-placeholder"],
  },
  {
    id: "masks-ending-in-a-real-character",
    from: ["milestone-6-closed|#264 · Masked values|must-flag"],
    title: "Masks that end in a real character",
    summary:
      "Password: ********x and Password: •••••••x: mask characters followed by one ordinary character, under the same key.",
    rationale:
      "A masking rule based on a prefix of mask characters would treat a partially masked value as fully masked. A trailing real character means part of the secret is exposed, and the partial value is itself sensitive.",
    expectation:
      "Flagged. The value is not entirely mask characters, so at least one secret byte is visible and the value is reported.",
    scenarios: ["partial-span-leakage"],
  },

  // -------------------------------------------------------------------- YAML structure
  {
    id: "nested-yaml-schema-and-reference-passwords",
    from: ["milestone-6-closed|#265 · Nested YAML recall|must-not-flag"],
    title: "password as a schema or reference key in nested YAML",
    summary:
      "YAML where password: heads a JSON-schema fragment (minLength: 12) or a Kubernetes secretKeyRef block, so the key has children and no scalar value.",
    rationale:
      "Nesting hides the connection between a key and its value. A scanner must tell a structural key with children from a scalar assignment, or every schema and every Kubernetes manifest becomes a finding.",
    expectation:
      "Not flagged. The key introduces a mapping, not a literal, and the nested words (minLength, secretKeyRef, names) are schema and references.",
    scenarios: ["templated-reference", "credential-named-assignment-false-positive"],
  },
  {
    id: "nested-yaml-literal-passwords",
    from: ["milestone-6-closed|#265 · Nested YAML recall|must-flag"],
    title: "Literal passwords nested inside YAML mappings",
    summary:
      "A synthetic literal under password: one, two or three levels deep (database, auth, spec.auth), in block-style YAML.",
    rationale:
      "Excluding structural keys must not cost recall. A literal is just as real three levels down, and depth is precisely where a line-local rule loses the key.",
    expectation:
      "Flagged. The key holds a scalar literal regardless of indentation depth.",
    scenarios: ["credential-named-assignment-false-positive"],
  },
  {
    id: "yaml-flow-collection-secret-keys",
    from: ["milestone-6-closed|#266 · Flow collections|must-not-flag"],
    title: "secret as a structural key in YAML flow collections",
    summary:
      "Flow-style YAML such as volumes: [{name: tls, secret: {secretName: web-tls-cert}}] and secret: [configReference, anotherReference], where secret names a structure or lists references, including one with CRLF line endings.",
    rationale:
      "Kubernetes manifests use secret as a structural key everywhere. Treating the contents of a flow collection as a credential is a false alarm on every such file.",
    expectation:
      "Not flagged. The value is a collection of names and references; nothing in it is a secret value.",
    scenarios: ["templated-reference", "credential-named-assignment-false-positive"],
  },
  {
    id: "block-yaml-and-brace-prefixed-secret-literals",
    from: ["milestone-6-closed|#266 · Flow collections|must-flag"],
    title: "Literal secrets that look like YAML flow collections only at the edges",
    summary:
      "A block-style secret: holding a synthetic literal, and a quoted value that merely starts with a brace, such as secret: \"{YmWZ...\".",
    rationale:
      "The flow-collection exemption depends on real structure. A literal that begins with a brace is not a mapping, and a block-style scalar under secret: is an ordinary assignment.",
    expectation:
      "Flagged. The value is a scalar literal; a leading brace character does not make it a collection.",
    scenarios: ["partial-span-leakage"],
  },

  // ------------------------------------------------------------ references in code
  {
    id: "code-expression-credential-values",
    from: ["milestone-6-closed|#278 · Code reference exclusions|must-not-flag", "reference-syntax|Code expressions · #278|must-not-flag"],
    title: "Code expressions used as credential values",
    summary:
      "Assignments whose value is an expression that reads a secret: settings.DATABASE_PASSWORD, config.anthropicApiKey, random_password.db.result, os.environ[\"OPENAI_API_KEY\"], in Python, TypeScript, Terraform and similar carriers.",
    rationale:
      "Code that reads a credential from configuration or another resource is the recommended pattern. The expression names where the secret is, and reporting it penalises exactly the practice a scanner is meant to encourage.",
    expectation:
      "Not flagged. The value is a code reference; it holds no secret bytes, and the paired Case covers near-misses that must still be reported.",
    scenarios: ["templated-reference", "credential-named-assignment-false-positive"],
  },
  {
    id: "code-expression-lookalike-literals",
    from: ["milestone-6-closed|#278 · Code reference exclusions|must-flag"],
    title: "Literals that look like code references but are not",
    summary:
      "password: SYNTHETIC.REVOKED.CONTEXT_VALUE, password: SYNTHETIC_REVOKED_CONTEXT_VALUE and password: selfhostedYmWZ...: dotted or underscored literals and a value that starts with a plausible root name but continues as a real-looking string.",
    rationale:
      "A rule that exempts anything dotted or underscored would hide real passwords that happen to contain those characters. The exemption has to rest on the structure of a real reference, not on the punctuation.",
    expectation:
      "Flagged. These values do not resolve to a reference form; they are literals that share punctuation with code expressions.",
    scenarios: ["templated-reference"],
  },
  {
    id: "secret-manager-pointer-values",
    from: ["milestone-6-closed|#280 · Secret-manager grammars|must-not-flag", "reference-syntax|Secret references · #280|must-not-flag"],
    title: "Secret-manager pointers used as credential values",
    summary:
      "Values in the grammars of secret managers: op://Benchmark/database/password for 1Password, os.environ/BENCHMARK_API_KEY for LiteLLM, a GCP secret-version path, and a ref+vault:// reference.",
    rationale:
      "A pointer says where a secret is stored without disclosing it. Each manager has its own grammar, so supporting one leaves the others as false alarms.",
    expectation:
      "Not flagged. Each value is a well-formed pointer in a documented secret-manager grammar and carries no secret.",
    scenarios: ["templated-reference"],
  },
  {
    id: "secret-manager-grammar-imitations",
    from: ["milestone-6-closed|#280 · Secret-manager grammars|must-flag"],
    title: "Values that imitate a secret-manager grammar",
    summary:
      "op://YmWZ... with no vault, item and field, os.environ/ followed by a real-looking value with an invalid suffix, and vault: with a real-looking tail and no selector.",
    rationale:
      "Prefix matching on op://, os.environ/ or vault: would let anyone hide a secret behind a pointer-shaped prefix. A pointer must be complete in its grammar to be a reference.",
    expectation:
      "Flagged. The value does not parse as a pointer in any supported grammar, and what follows the prefix is a real-looking literal.",
    scenarios: ["templated-reference", "partial-span-leakage"],
  },

  // ------------------------------------------------------------------------ syntax
  {
    id: "interpolation-and-command-substitution",
    from: ["reference-syntax|Interpolation · #279|must-not-flag", "reference-syntax|Template controls|must-not-flag"],
    title: "Interpolation, command substitution and variable expansion as credential values",
    summary:
      "Values such as $(registryPassword), $(pass show benchmark/database), #{ENV['DB_PASSWORD']}, {env:ANTHROPIC_API_KEY} and ${DATABASE_PASSWORD} assigned to credential-named keys across Azure pipelines, shell, Ruby and configuration formats.",
    rationale:
      "Interpolation defers the secret to run time. Flagging the syntax flags every correctly written pipeline and every shell script that reads a secret from a store.",
    expectation:
      "Not flagged. Each value is an interpolation form in its language and holds no secret bytes.",
    scenarios: ["templated-reference"],
  },
  {
    id: "literal-secrets-under-generic-credential-names",
    from: ["reference-syntax|Literal-secret positive controls|must-flag", "policy-qualified-credentials|generic-token|must-flag"],
    title: "Synthetic literals under generic credential names",
    summary:
      "Synthetic random literals assigned to api_key, password, dotted and quoted password, client_secret and similar generic names, with dots, quotes, Unicode and CRLF around them and no provider format.",
    rationale:
      "Every reference exclusion in the neighbouring Cases is only trustworthy if a real literal in the same position is still reported. These are the counterweight, and because the values have no provider format the assignment name is the only signal.",
    expectation:
      "Flagged under project policy: with no format to recognise, a real-looking literal under a credential name is treated as a secret. The policy is the project's; it is not provider evidence.",
    scenarios: ["credential-named-assignment-false-positive", "partial-span-leakage"],
  },

  // ---------------------------------------------------------------- negative controls
  {
    id: "empty-and-whitespace-inputs",
    from: ["negative-controls|Empty inputs|must-not-flag"],
    title: "Empty input and whitespace-only input",
    summary: "An input of zero bytes and an input holding only spaces, a tab, CRLF and a newline.",
    rationale:
      "The floor of the corpus. If any tool raises a finding here it has failed before looking at content, and offsets computed on empty input are a classic source of crashes.",
    expectation: "Not flagged. There are no non-whitespace bytes, so no credential can be present.",
    scenarios: [],
  },
  {
    id: "empty-referenced-and-templated-credential-values",
    from: ["negative-controls|Placeholders|must-not-flag"],
    title: "GITHUB_TOKEN with an empty value, a variable reference or a template reference",
    summary:
      "GITHUB_TOKEN= with nothing after it, GITHUB_TOKEN=${GITHUB_TOKEN}, github_token: {{ secrets.github_token }} and GITHUB_TOKEN=[REDACTED] in configuration files.",
    rationale:
      "The name is the strongest possible credential signal and the value is empty, a reference or redacted. The name alone must not produce a finding.",
    expectation: "Not flagged. The value is empty, a reference or an explicit redaction marker, so no secret byte is present.",
    scenarios: ["templated-reference", "documentation-placeholder", "credential-named-assignment-false-positive"],
  },
  {
    id: "hashes-commit-ids-and-uuids",
    from: ["negative-controls|Public identifiers|must-not-flag"],
    title: "Checksums, commit hashes, UUIDs and public URLs",
    summary:
      "checksum= with a SHA-256 digest, commit= with a git hash, request_id= with a UUID and a documentation URL, assigned to ordinary field names.",
    rationale:
      "Long random-looking values are everywhere in repositories and are public by nature. Entropy alone, without a format or a credential name, is not a finding.",
    expectation: "Not flagged. Hashes, commit ids, UUIDs and URLs are public identifiers, not credentials, and their field names say so.",
    scenarios: ["benign-encoded-value"],
  },
  {
    id: "base64-of-public-text",
    from: ["negative-controls|Benign encoded text|must-not-flag"],
    title: "Base64 encoding of a public sentence",
    summary: "message= followed by the base64 encoding of an ordinary public sentence.",
    rationale:
      "Base64 text has a high-entropy alphabet that is shared with many credentials, but the decoded content is not a secret. Alphabet and length alone do not make a credential.",
    expectation: "Not flagged. The content is public text in an encoding; the field name is not credential-named.",
    scenarios: ["benign-encoded-value"],
  },
  {
    id: "ordinary-prose-code-and-numbers",
    from: ["negative-controls|Ordinary text|must-not-flag"],
    title: "Unicode prose, safe token handling in code and numeric build metadata",
    summary:
      "A sentence with emoji and CJK text that says it contains no credential, a JavaScript line that reads a token from process.env, and a line of build numbers and durations.",
    rationale:
      "Text that discusses credentials, or code that handles them safely, contains none. Multibyte text and long digit runs are additional chances for offset and entropy mistakes.",
    expectation: "Not flagged. The inputs mention or handle credentials without containing one.",
    scenarios: ["prose-mention", "templated-reference"],
  },
  {
    id: "bare-prefixes-and-truncated-tokens",
    from: ["negative-controls|Incomplete shapes|must-not-flag"],
    title: "Bare credential prefixes and tokens cut short of the format's length",
    summary:
      "A line listing bare prefixes (ghp_ gho_ ghu_ ghs_ ghr_ glpat- npm_ SG. xoxb-), and GITHUB_TOKEN, GITLAB_TOKEN and NPM_TOKEN assignments holding a prefix and six characters.",
    rationale:
      "A prefix alone, or a value shorter than the format allows, is not an issued credential. Prefix-only matching produces a false alarm on every list of token types in documentation.",
    expectation: "Not flagged. The values do not satisfy the documented length, so they are not credentials of those families.",
    scenarios: ["format-near-miss"],
  },

  // ------------------------------------------------------------------ real-world
  {
    id: "realistic-config-files",
    from: ["real-world-shapes|realworld-config|must-not-flag"],
    title: "Realistic configuration files with no secret",
    summary:
      "Twenty locally authored configuration files in the shapes real repositories contain: Docker Compose, nginx, application settings and similar, using variables and example hostnames and holding no credential.",
    rationale:
      "A scanner is run over real repositories. Configuration files are dense with keys, hostnames and identifiers that resemble credentials, so false-alarm rates on realistic files are what users feel.",
    expectation: "Not flagged. Authored by hand to contain no credential; every secret-position value is a variable reference or an example name.",
    scenarios: ["credential-named-assignment-false-positive"],
  },
  {
    id: "realistic-application-logs",
    from: ["real-world-shapes|realworld-logs|must-not-flag"],
    title: "Realistic access, error and deploy logs with no secret",
    summary:
      "Twenty locally authored log files: nginx access logs, application error logs and deploy logs full of ids, timestamps, hashes and request paths.",
    rationale:
      "Logs are the densest source of identifier-like strings in a repository and are scanned at volume. A false alarm here recurs on every line.",
    expectation: "Not flagged. Authored to contain no credential; the long values are ids, hashes and timestamps.",
    scenarios: ["benign-encoded-value"],
  },
  {
    id: "lockfiles-and-integrity-hashes",
    from: ["real-world-shapes|realworld-lockfile|must-not-flag"],
    title: "Lock files and checksum files",
    summary:
      "Twenty snippets of package-lock.json, yarn.lock, go.sum and similar dependency lock files, each line carrying an integrity hash.",
    rationale:
      "Integrity hashes are long, random-looking, base64 or hexadecimal, and public. Lock files are large and committed in nearly every project, so any weakness here multiplies.",
    expectation: "Not flagged. The hashes verify published packages and are public by design.",
    scenarios: ["benign-encoded-value"],
  },
  {
    id: "source-code-handling-credentials-safely",
    from: ["real-world-shapes|realworld-source|must-not-flag"],
    title: "Source code that reads credentials from the environment",
    summary:
      "Twenty JavaScript, Python and Terraform snippets that build a client from an environment variable or a variable, with comments that mention credentials but no credential.",
    rationale:
      "Code that mentions credentials is far more common than code that contains one. Reading a secret from the environment is the practice scanners should encourage.",
    expectation: "Not flagged. Authored so that each credential-related identifier is a variable or an environment lookup.",
    scenarios: ["templated-reference", "credential-named-assignment-false-positive"],
  },
  {
    id: "readmes-api-docs-and-changelogs",
    from: ["real-world-shapes|realworld-docs|must-not-flag"],
    title: "READMEs, API documentation and changelogs that explain authentication",
    summary:
      "Twenty Markdown documents that describe how to authenticate: copy .env.example, send Authorization: Bearer <token>, with placeholders and no credential.",
    rationale:
      "Documentation talks about credentials constantly and is scanned with the rest of the repository. The vocabulary (API key, Bearer, token) is credential-shaped; the content is placeholders.",
    expectation: "Not flagged. Every example value is a placeholder or a description of a header.",
    scenarios: ["documentation-placeholder"],
  },
  {
    id: "agent-transcripts-and-tool-output",
    from: ["real-world-shapes|realworld-agent-output|must-not-flag"],
    title: "Agent transcripts, MCP results and git output",
    summary:
      "Twenty locally authored payloads: chat transcripts between a user and an agent, MCP tool results, and git log and diff output, including environment-style examples, with no credential.",
    rationale:
      "Agent and tool payloads are a fast-growing source of text that contains structured JSON, commit hashes, session ids and example environment variables, and they are scanned in flight.",
    expectation: "Not flagged. Authored so that any environment-style example uses a placeholder and every long value is a hash or an id.",
    scenarios: ["benign-encoded-value", "documentation-placeholder"],
  },

  // ---------------------------------------------------------- project-policy credentials
  {
    id: "bearer-credentials-in-authorization-headers",
    from: ["policy-qualified-credentials|bearer-token|must-flag"],
    title: "Bearer values in Authorization and Proxy-Authorization headers",
    summary:
      "Bearer tokens of adequate length in Authorization and Proxy-Authorization headers, separated from the scheme by spaces or tabs.",
    rationale:
      "Bearer tokens have no provider format, so the header context and the value's length are the only signals. That makes the rule a project policy, which is why it is stated as one and is tested apart from provider formats.",
    expectation:
      "Flagged under project policy: a Bearer value above the project's length floor in an authorization header is treated as a credential. The floor is a project decision, not provider evidence.",
    scenarios: ["partial-span-leakage"],
  },
  {
    id: "password-inside-connection-strings",
    from: ["policy-qualified-credentials|connection-string|must-flag"],
    title: "Passwords inside connection-string URIs",
    summary:
      "postgres and rediss connection URIs with a synthetic password in user-info or in the password-only position (rediss://:password@host).",
    rationale:
      "Only the password is secret; the scheme, user and host are not. Reporting a wider range is acceptable, but failing to cover the password bytes leaves the credential in place.",
    expectation:
      "Flagged under project policy, and the range must cover the password bytes. The password position in a connection URI is where the secret lives.",
    scenarios: ["partial-span-leakage"],
  },
  {
    id: "otp-seeds-in-otpauth-uris",
    from: ["policy-qualified-credentials|otpauth-uri|must-flag"],
    title: "One-time-password seeds in otpauth URIs",
    summary:
      "otpauth:// URIs, in totp and hotp forms, with a synthetic Base32 seed in varying query order, quoting and encodings, including one after Unicode text and CRLF.",
    rationale:
      "The seed is the secret that lets anyone generate codes; the label and issuer are not secret. Query order and carrier must not change whether the seed is found, or how much of it is covered.",
    expectation:
      "Flagged under project policy: a full Base32 seed in an otpauth URI is a long-lived secret, and the range covers the seed.",
    scenarios: ["partial-span-leakage"],
  },
  {
    id: "variable-reference-in-credential-position",
    from: [
      "policy-qualified-credentials|bearer-token|must-not-flag",
      "policy-qualified-credentials|connection-string|must-not-flag",
      "policy-qualified-credentials|generic-token|must-not-flag",
    ],
    title: "A variable reference where a Bearer token, password or API key would be",
    summary:
      "Authorization: Bearer ${ACCESS_TOKEN}, a postgres URI with ${DB_PASSWORD} as the password, and api_key=${API_KEY}: each project-policy credential shape with a variable reference in the secret position.",
    rationale:
      "These shapes are matched by position and context rather than by a provider format, so the position is exactly where a reference would be misread as a value. The reference is the safe form of the same assignment.",
    expectation: "Not flagged. The value is a variable reference and carries no secret bytes.",
    scenarios: ["templated-reference"],
  },
  {
    id: "otpauth-seed-lookalikes",
    from: ["policy-qualified-credentials|otpauth-uri|must-not-flag"],
    title: "otpauth URIs whose seed is not a valid Base32 seed, and a reference",
    summary:
      "otpauth:// URIs whose secret is lowercase, too short in its first secret parameter, or that has a second valid secret parameter after a short one, plus TOTP_URI=${TOTP_URI}.",
    rationale:
      "Only values that can be a Base32 seed are seeds. Lowercase letters or a stub in the first parameter mean the URI cannot drive a one-time-password generator, and reporting it is a false alarm.",
    expectation: "Not flagged. Either the value cannot be a seed (lowercase, too short) or it is a reference.",
    scenarios: ["templated-reference", "format-near-miss"],
  },

  // -------------------------------------------------------------------- SendGrid
  {
    id: "sendgrid-key-in-provider-named-fields",
    from: ["sendgrid-regressions|Provider detection|must-flag"],
    title: "SendGrid keys in provider-named environment fields",
    summary:
      "The complete SendGrid key shape (SG. followed by two base62 segments, including URL-safe - and _ and a trailing -) bare and in SENDGRID_TOKEN and SENDGRID_API_KEY environment assignments.",
    rationale:
      "The complete shape has punctuation inside and at the end of the value. A range that stops at the first punctuation, or drops the trailing dash, leaves part of a live-format key exposed.",
    expectation:
      "Flagged. The value matches the provider's documented key format and sits in a provider-named field; the range is the whole key including any trailing dash.",
    scenarios: ["partial-span-leakage"],
  },
  {
    id: "sendgrid-key-under-a-generic-name",
    from: ["sendgrid-regressions|Generic fallback|must-flag"],
    title: "SendGrid key assigned to a generic api_key",
    summary: "The SendGrid key shape, in base62, URL-safe and trailing-dash forms, assigned to a variable named api_key.",
    rationale:
      "Providers' keys are often stored under generic names. A detector that knows the format must still report the whole key when the name gives no help, and a generic rule must not stop at the first dot or dash.",
    expectation:
      "Flagged. The documented format identifies the value whatever its name; the reported extent must cover the trailing characters.",
    scenarios: ["partial-span-leakage"],
  },
  {
    id: "sendgrid-key-in-json-and-quoted-env",
    from: ["sendgrid-regressions|Structured text|must-flag"],
    title: "SendGrid keys in JSON and single-quoted environment values",
    summary: "The SendGrid key shape as a JSON string value and as a single-quoted environment assignment, in base62 and URL-safe forms.",
    rationale:
      "Quotes and JSON punctuation must not be absorbed into the value or cut into it, and a trailing dash sits right next to the closing quote, where an off-by-one is most likely.",
    expectation: "Flagged. The documented key format is present; the range is the key without the quotes.",
    scenarios: ["partial-span-leakage"],
  },
  {
    id: "sendgrid-key-after-multibyte-text-and-crlf",
    from: ["sendgrid-regressions|Encoding|must-flag"],
    title: "SendGrid keys after emoji and CJK text, and on CRLF lines",
    summary: "The SendGrid key shape after emoji and Chinese text on the same line, and on a CRLF-terminated line under a comment.",
    rationale:
      "Ranges are byte offsets, so multibyte text before the key moves the offsets; a carriage return after the key must not be counted into it.",
    expectation: "Flagged. Byte-exact range of the key, regardless of the text before it or the line ending after it.",
    scenarios: [],
  },
  {
    id: "sendgrid-key-in-markdown",
    from: ["sendgrid-regressions|Documentation|must-flag"],
    title: "SendGrid keys inside Markdown code spans",
    summary: "The SendGrid key shape inside backticks after the words SendGrid credential:, in base62, URL-safe and trailing-dash forms.",
    rationale:
      "A report that spans the closing backtick redacts documentation text, and one that omits the trailing character leaves part of the key visible; a trailing dash right before the backtick is the edge case.",
    expectation: "Flagged. The key is in the documented format; the range excludes the backticks and includes the last character.",
    scenarios: ["partial-span-leakage"],
  },
  {
    id: "sendgrid-key-as-a-bearer-credential",
    from: ["sendgrid-regressions|Authorization|must-flag"],
    title: "SendGrid keys as Bearer credentials in an Authorization header",
    summary: "The SendGrid key shape after Authorization: Bearer, in base62, URL-safe and trailing-dash forms.",
    rationale:
      "The header name and scheme are not secret but the whole key is. Two rules (a provider format and a Bearer rule) can both match; whichever reports, it must cover the complete key.",
    expectation: "Flagged. The value is a documented SendGrid key in a header that carries credentials; the range covers the whole key.",
    scenarios: ["partial-span-leakage"],
  },
  {
    id: "sendgrid-near-miss-values",
    from: ["sendgrid-regressions|Near-miss negatives|must-not-flag"],
    title: "SendGrid near misses: short segments, a missing separator, masks and prose",
    summary:
      "Values that look like SendGrid keys with a shortened id segment, a shortened secret segment, a missing separator between the segments, a SG.[REDACTED].[REDACTED] mask, and a sentence describing the key format.",
    rationale:
      "A near miss is not an issued key. These prove that the SG. prefix alone does not decide: the segment lengths and the separator are part of the format, and masks and prose are not keys.",
    expectation:
      "Not flagged. The structural near misses break the documented format, and the mask and the sentence contain no key material.",
    scenarios: ["format-near-miss", "documentation-placeholder"],
  },

  // ------------------------------------------------------------------- GitHub token
  {
    id: "github-token-reference-and-prose",
    from: ["token-contexts|Negative controls|must-not-flag"],
    title: "A GitHub token variable reference and a sentence about GitHub access",
    summary: "GITHUB_TOKEN=${GITHUB_TOKEN} and the sentence 'This document describes how to configure GitHub access.'",
    rationale:
      "Both mention the credential type and hold none: one is the safe reference form of the assignment, the other is prose. They are the counterweight to the GitHub token carrier scenarios.",
    expectation: "Not flagged. There is no token in either input.",
    scenarios: ["templated-reference", "prose-mention"],
  },
];
