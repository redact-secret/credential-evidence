// Hand-authored Scenario records (ADR 0007, ADR 0008).
//
// Each scenario is written once. It states what the situation is and the rule that
// fixes its outcome for every family it applies to; nothing here names a family,
// a provider, a suite or a scanner. `plan` names the fixture plan that holds the
// scenario's family cells (a scenario with no plan is instantiated only by Cases).
//
// Outcome classes are scanner-neutral expectations (docs/governance/evidence-classes.md).
// Basis is `project-policy` throughout: these are the project's stated rules; the
// evidence for an individual value (provider documentation, corroborating tools) is
// carried by each fixture's own evidence entry in its fixture set.

export const SCENARIO_BASIS_RATIONALE =
  "The scenario states a project rule of the benchmark's design. Whether a particular value is, for its family, an instance of the rule is a per-fixture question: each fixture carries its own evidence (provider documentation, corroborating artifacts or project policy) in its fixture set.";

export const PLANS = {
  "documented-format-positives": {
    title: "Documented-format values in carriers",
    description:
      "Synthetic values built to a family's documented format and rendered in realistic carriers (environment files, headers, command lines, SDK configuration, source, logs). Each cell says: for this family, the value in this carrier must be reported, with its exact byte range.",
    rule: "family-carrier-matrix",
  },
  "one-property-twins": {
    title: "One-property twins of positive values",
    description:
      "For a positive fixture, a twin that differs in exactly one property (length, prefix, alphabet, boundary, carrier marker, checksum, public sibling prefix). Each cell says which property was changed for which family; the twin's lineage points at the exact positive fixture it was made from.",
    rule: "one-property-twin-matrix",
  },
  "benign-and-near-miss-controls": {
    title: "Benign controls and near misses",
    description:
      "Values that resemble a family's credentials without being one (public identifiers, documentation placeholders, references, near misses, encoded values, prose mentions, format lookalikes), plus the near misses the project policy still reports because they sit under a credential-named assignment.",
    rule: "family-control-matrix",
  },
  "carrier-edge-matrix": {
    title: "Carrier and input-edge matrix",
    description:
      "Carrier-level edge conditions (input boundaries, quoting, structured text, source literals, Markdown, multibyte text, line endings, several credentials, long inputs, plain assignments) applied to a listed set of formats. Each cell says: in this carrier the format must still be reported, with the exact extent.",
    rule: "family-carrier-edge-matrix",
  },
  "unsettled-evidence-inputs": {
    title: "Inputs whose outcome the evidence does not settle",
    description:
      "Positive, twin and control inputs for which the legacy evidence was unresolved, so no outcome may be relied on. They are kept visible as open questions, not as expectations.",
    rule: "unsettled-input-matrix",
  },
};

const ANY = (why) => ({ appliesTo: "any-family", rationale: why });

export const SCENARIOS = [
  // ------------------------------------------------------------ role scenarios
  {
    id: "documented-format-literal",
    plan: "documented-format-positives",
    title: "Documented-format value in a realistic carrier",
    outcome: "must-flag",
    description:
      "A synthetic value that follows the format the provider documents for a credential family (right prefix, alphabet and length) appears in an ordinary carrier: an environment assignment, a header, a command line, SDK configuration, source code or a log line.",
    semantics:
      "The value's structure identifies it, not its carrier. A value in the documented format is a credential of that family wherever it sits, so it must be reported with the exact byte range of the secret; carrier syntax (quotes, delimiters, key names) is not part of the secret.",
    applicability: ANY("Every family with a documented or evidenced format has instances; which formats are covered is listed by the plan, not assumed here."),
  },
  {
    id: "unsettled-evidence-input",
    plan: "unsettled-evidence-inputs",
    title: "Input whose expected outcome the evidence does not settle",
    outcome: "not-assertable",
    unresolved: true,
    description:
      "An input the legacy benchmark left unscored because its evidence was unresolved: for example a value whose format question (is the variant real, is the boundary part of it) had no provider answer.",
    semantics:
      "When the evidence does not settle whether a value is a credential, no outcome is asserted. The input stays in the corpus so the open question is visible; it carries no expected spans and nothing may be scored against it until evidence resolves it.",
    applicability: ANY("Any family can have an open question; the plan lists the ones that do."),
  },
  {
    id: "wrong-length",
    plan: "one-property-twins",
    title: "Right shape, wrong length",
    outcome: "must-not-flag",
    description:
      "A positive value with exactly one change: its body is shorter or longer than the length the format allows, everything else (prefix, alphabet, carrier) unchanged.",
    semantics:
      "Length is part of the format. A value outside the documented length is not an issued credential of that family, so it must not be reported as one. Reporting it shows that the prefix alone, not the whole structure, decided.",
    applicability: ANY("Applies to any family whose format fixes a length or a length range."),
  },
  {
    id: "prefix-near-miss",
    plan: "one-property-twins",
    title: "Right body, wrong prefix",
    outcome: "must-not-flag",
    description:
      "A positive value with exactly one change: its prefix is another namespace or a near-identical spelling of the documented prefix, body unchanged.",
    semantics:
      "The prefix names the credential kind. A body that is right under a wrong prefix is not a credential of the family, so it must not be reported as one; an adjacent, real family with that prefix is a different case.",
    applicability: ANY("Applies to any family whose format starts with a documented prefix."),
  },
  {
    id: "wrong-alphabet",
    plan: "one-property-twins",
    title: "Right shape, character outside the alphabet",
    outcome: "must-not-flag",
    description:
      "A positive value with exactly one change: one or more characters fall outside the alphabet the format allows, length and prefix unchanged.",
    semantics:
      "The alphabet is part of the format. A value containing a character the provider never issues is not a credential of the family, so it must not be reported as one.",
    applicability: ANY("Applies to any family whose format restricts its alphabet."),
  },
  {
    id: "boundary-violation",
    plan: "one-property-twins",
    title: "Right value, wrong boundary",
    outcome: "must-not-flag",
    description:
      "A positive value with exactly one change: it is cut, extended or joined to neighbouring text so that it no longer starts or ends where the format says it does.",
    semantics:
      "A credential has edges. A format-shaped run that continues past, or starts inside, a longer token is part of something else, so it must not be reported as a credential of the family.",
    applicability: ANY("Applies to any family whose format has a fixed end or start."),
  },
  {
    id: "missing-context-marker",
    plan: "one-property-twins",
    title: "Right value, carrier lacks the identifying marker",
    outcome: "must-not-flag",
    description:
      "A positive value with exactly one change: the value is unchanged but the carrier no longer contains the key name, prefix word or other marker that made the value identifiable.",
    semantics:
      "For formats without a distinctive prefix, the marker in the carrier is part of what makes a value a credential. The same bytes under a non-credential name are not reported.",
    applicability: ANY("Applies to any family whose recognition depends on carrier context."),
  },
  {
    id: "invalid-checksum",
    plan: "one-property-twins",
    title: "Right shape, invalid embedded checksum",
    outcome: "must-not-flag",
    description: "A positive value with exactly one change: the checksum the format embeds no longer matches the rest of the value.",
    semantics:
      "An embedded checksum is part of the format. A value whose checksum does not validate was not issued by the provider, so it must not be reported as a credential of the family.",
    applicability: ANY("Applies to any family whose format embeds a checksum."),
  },
  {
    id: "public-sibling-prefix",
    plan: "one-property-twins",
    title: "Public sibling identifier instead of the secret",
    outcome: "must-not-flag",
    description:
      "A positive value with exactly one change: the prefix is that of the provider's public sibling identifier (a publishable key, a client id) rather than the secret.",
    semantics:
      "Providers issue public identifiers next to their secrets with a near-identical shape. The public one is meant to appear in client code and pages; reporting it is a false alarm.",
    applicability: ANY("Applies to any family that has a public sibling identifier with a similar shape."),
  },
  {
    id: "public-identifier",
    plan: "benign-and-near-miss-controls",
    title: "Public identifier beside a credential",
    outcome: "must-not-flag",
    description:
      "A public identifier that sits next to a credential and looks like it: an account, key or client id, a request or trace id, a cloud resource id.",
    semantics:
      "Identifiers are public by design and readers need them. Reporting one is a false alarm and redacting it removes information a reader legitimately needs.",
    applicability: ANY("Any family whose provider publishes identifiers next to its secrets."),
  },
  {
    id: "documentation-placeholder",
    plan: "benign-and-near-miss-controls",
    title: "Documentation placeholder or example value",
    outcome: "must-not-flag",
    description:
      "A placeholder written for documentation: an angle-bracket name, an ellipsis, a mask, a REDACTED marker, or the provider's own published example value.",
    semantics:
      "Documentation is written to be copied. A placeholder was never issued, so reporting it is noise, and a scanner that stays silent on it must not also stay silent on a real value in the same position.",
    applicability: ANY("Any family can be documented with placeholders."),
  },
  {
    id: "templated-reference",
    plan: "benign-and-near-miss-controls",
    title: "Reference to a secret instead of the secret",
    outcome: "must-not-flag",
    description:
      "A value that names a secret without containing it: a variable, a template expression, an interpolation, a secret-manager pointer, a CI secret reference.",
    semantics:
      "A reference is the safe way to use a secret. Reporting it punishes the practice a scanner exists to encourage, and there is no secret byte in it to cover.",
    applicability: ANY("Any family's secret can be referenced rather than embedded."),
  },
  {
    id: "format-near-miss",
    plan: "benign-and-near-miss-controls",
    title: "Near miss that breaks the format",
    outcome: "must-not-flag",
    description:
      "A value that resembles a family's format but breaks it: truncated, wrong separator, wrong prefix, too short, a bare prefix, a header name only.",
    semantics:
      "Incomplete or malformed values are not issued credentials. They test whether the format's structure, and not only its look, identifies a credential.",
    applicability: ANY("Any family's format can be approximated and broken."),
  },
  {
    id: "benign-encoded-value",
    plan: "benign-and-near-miss-controls",
    title: "Hash, digest or encoded value of the same general shape",
    outcome: "must-not-flag",
    description:
      "A hash, checksum, digest, UUID or base64 text that shares alphabet and length with a family's credentials: image digests, ETags, content MD5 headers, encoded identifiers.",
    semantics:
      "High-entropy text of a credential-like length is everywhere in repositories and is not secret. Appearance alone, without the format's structure or context, does not make a credential.",
    applicability: ANY("Any family whose alphabet and length coincide with common encoded values."),
  },
  {
    id: "prose-mention",
    plan: "benign-and-near-miss-controls",
    title: "Prose or log text that mentions the credential type",
    outcome: "must-not-flag",
    description: "Text about a credential type (a rotation notice, a creation note, an error message) that contains no credential.",
    semantics:
      "Words about credentials are common and hold none. The surrounding words alone must not decide the outcome.",
    applicability: ANY("Any family can be mentioned in prose."),
  },
  {
    id: "benign-lookalike",
    plan: "benign-and-near-miss-controls",
    title: "Benign lookalike of a family's credentials",
    outcome: "must-not-flag",
    description:
      "A benign input built to resemble a family's credentials in one respect: a bare prefix, a mask, a short body, a prose label, a reference, or an identifier that embeds the prefix.",
    semantics:
      "A value that only resembles a credential is not one. Reporting it is a false alarm; it shows whether structure and context, not appearance, decide the outcome.",
    applicability: ANY("Any family can be imitated; the plan lists the ones that are."),
  },
  {
    id: "credential-named-literal-near-miss",
    plan: "benign-and-near-miss-controls",
    title: "Near-miss literal under a credential-named assignment",
    outcome: "must-flag",
    description:
      "A value that fails its provider's format (truncated, over-long, a public-id shape, an unprefixed hex string) but is assigned to a variable whose name says it is a credential.",
    semantics:
      "When the assignment name is the signal, a literal value under it is reported under the project's generic-literal rule even though the provider format is broken: the name, not the format, is the evidence, and a real-looking literal under a credential name is a leak until shown otherwise.",
    applicability: ANY("Applies wherever a provider-named credential variable can hold a literal of the wrong shape."),
  },

  // -------------------------------------------------------- carrier scenarios
  {
    id: "value-at-input-edges",
    plan: "carrier-edge-matrix",
    title: "Credential at the edges of the input",
    outcome: "must-flag",
    description:
      "A credential-shaped value stands alone, or ends the input with no trailing newline, in the shape of one provider format per input.",
    semantics:
      "Scanners commonly anchor on delimiters. At the start and end of an input there is no delimiter, so boundary handling decides whether the value is found and whether its exact extent is right.",
    applicability: ANY("Carrier-level: the reasoning does not depend on which format the value has."),
  },
  {
    id: "quoted-value-extent",
    plan: "carrier-edge-matrix",
    title: "Credential inside single or double quotes",
    outcome: "must-flag",
    description: "The value is assigned inside single or double quotes.",
    semantics:
      "Quotes are not part of a credential. An extent error here either leaves a quote in the report or drops the last character of the secret, which leaves secret bytes exposed.",
    applicability: ANY("Carrier-level: quoting is independent of the format."),
  },
  {
    id: "structured-text-value",
    plan: "carrier-edge-matrix",
    title: "Credential in JSON, YAML, TOML and similar structured text",
    outcome: "must-flag",
    description: "The value is a field in a structured document: a JSON string, a YAML scalar, a TOML value.",
    semantics:
      "Real secrets live in configuration files. Structured syntax adds quoting, colons and nesting around the value without changing it, so the reported range must be the value, not its syntax.",
    applicability: ANY("Carrier-level."),
  },
  {
    id: "source-code-string-literal",
    plan: "carrier-edge-matrix",
    title: "Credential in a source-code string literal",
    outcome: "must-flag",
    description: "The value is a string literal in JavaScript or Python source.",
    semantics:
      "Hard-coded credentials in source are a common leak, and the surrounding code (assignments, semicolons, call syntax) differs from configuration files. The literal's content is the secret; its quotes and terminators are not.",
    applicability: ANY("Carrier-level."),
  },
  {
    id: "markdown-and-comment-value",
    plan: "carrier-edge-matrix",
    title: "Credential in Markdown or a code comment",
    outcome: "must-flag",
    description: "The value appears in a Markdown code span or in a code comment.",
    semantics:
      "Credentials pasted into documentation and comments are leaked as easily as those in configuration. The delimiters (backticks, comment markers) must not become part of the reported value, and the final character must not be dropped.",
    applicability: ANY("Carrier-level."),
  },
  {
    id: "multibyte-text-offsets",
    plan: "carrier-edge-matrix",
    title: "Credential after multibyte or unusual text",
    outcome: "must-flag",
    description: "The value follows emoji, CJK text, combining marks or a byte order mark.",
    semantics:
      "Ranges are byte offsets. A scanner that counts characters or code units instead of bytes reports the wrong range once earlier text is multibyte, which leaves secret bytes exposed or redacts innocent text.",
    applicability: ANY("Carrier-level."),
  },
  {
    id: "crlf-line-endings",
    plan: "carrier-edge-matrix",
    title: "Credential on a line with Windows line endings",
    outcome: "must-flag",
    description: "The value sits on a CRLF-terminated line or after blank lines.",
    semantics:
      "A carriage return is not part of the value, and blank lines must not shift the reported extent.",
    applicability: ANY("Carrier-level."),
  },
  {
    id: "multiple-credentials-per-input",
    plan: "carrier-edge-matrix",
    title: "Several credentials in one input",
    outcome: "must-flag",
    description: "Two or more distinct credentials appear on separate lines, repeated lines or the same line.",
    semantics:
      "Reporting must be exact per occurrence. Merged or dropped spans leave one of the credentials unredacted.",
    applicability: ANY("Carrier-level."),
  },
  {
    id: "credential-after-long-input",
    plan: "carrier-edge-matrix",
    title: "Credential after a long prefix of benign text",
    outcome: "must-flag",
    description: "The value appears after roughly 72 KB of benign text.",
    semantics:
      "Scanners that window, chunk or truncate input must still find, or correctly ignore, values deep inside a large file.",
    applicability: ANY("Carrier-level."),
  },
  {
    id: "environment-assignment",
    plan: "carrier-edge-matrix",
    title: "Credential in a plain NAME=value assignment",
    outcome: "must-flag",
    description: "One synthetic value in a bare `NAME=value` line: the smallest carrier that still has a key and a delimiter.",
    semantics:
      "The simplest carrier shows whether the format itself is recognised before any other syntax is added; the reported range is the value, not the name or the equals sign.",
    applicability: ANY("Carrier-level."),
  },

  // ------------------------------------------------ cross-cutting theme scenarios
  {
    id: "partial-span-leakage",
    plan: null,
    title: "Credential embedded in a longer structure",
    outcome: "must-flag",
    description:
      "A credential sits inside a longer structure (a connection URI, a header value, an otpauth URI, a JSON field) where reporting only part of the value, or only the structure around it, leaves secret bytes exposed.",
    semantics:
      "What must be covered is the whole secret, not a prefix of it or its wrapper. A wider report that still covers the secret is acceptable; a narrower one is a leak.",
    applicability: ANY("A property of how a value is reported, independent of the family."),
  },
  {
    id: "credential-named-assignment-false-positive",
    plan: null,
    title: "Credential-sounding name, non-secret value",
    outcome: "must-not-flag",
    description:
      "A value is assigned under a name that sounds like a credential (password, secret, api_key) but is not a secret: a schema word, a reference, a placeholder, an empty value, an ordinary number.",
    semantics:
      "The name is a strong signal but not a verdict. The value has to be examined; a name alone must not decide the outcome.",
    applicability: ANY("Independent of the family: the name is generic."),
  },
];
