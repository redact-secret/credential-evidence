// Authored family narratives for the Confluent dossier (benchmarks/support/dossiers/confluent.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const OVERVIEW = "https://docs.confluent.io/cloud/current/security/authenticate/workload-identities/service-accounts/api-keys/overview.html";
const RELEASE_NOTES = "https://docs.confluent.io/cloud/current/release-notes/index.html";
const IDENTITY_FAQ = "https://docs.confluent.io/cloud/current/security/authenticate/identity-faq.html";
const CONNECT_API = "https://docs.confluent.io/cloud/current/connectors/connect-api-section.html";
const FLINK_KEY = "https://docs.confluent.io/cloud/current/flink/operate-and-deploy/generate-api-key-for-flink.html";

export default {
  provider: "confluent",
  dropped: [
    { part: "Candidate: SCIM token (`cflt-scim_<JWT>`)", reason: "a different, JWT-shaped credential; kept only as a collision of the prefixed secret" },
    { part: "Candidate: Basic-auth blob (`base64(key:secret)`)", reason: "secret-bearing encoding of a key pair, not a 64-character run, so not a family" },
    { part: "Candidate: Confluent Platform master keys and OAuth/OIDC tokens", reason: "out of scope for Confluent Cloud API secrets" },
    { part: "Open question 4 (real length of the unprefixed form)", reason: "carried as an unresolved statement in the unprefixed family" },
  ],
  families: [
    {
      id: "confluent:cloud-api-secret",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-length-alphabet",
            cls: "provider-documented",
            text: "An API secret created after 2025-07-30 is the literal prefix cflt followed by 60 characters from letters, digits, plus and slash, 64 characters in all.",
            cite: [OVERVIEW],
            claims: ["field-prefix", "field-total-length", "field-alphabet"],
          },
          {
            id: "checksum",
            cls: "provider-documented",
            text: "The final 6 characters are a Base64-encoded CRC-32 checksum of the 54 body characters before them. The provider's own detection snippet fixes the recipe: CRC-32 over the 54 characters after the prefix (the prefix excluded), the 4 bytes in little-endian order, standard Base64, first 6 characters.",
            cite: [OVERVIEW],
            claims: ["field-checksum", "field-checksum-algorithm"],
          },
          {
            id: "final-character-values",
            unresolved: "Derived by reasoning from the published algorithm and not checked against an issued secret.",
            text: "Six Base64 characters carry 36 bits while a CRC-32 has 32, so the last character can take only four values: A, Q, g or w.",
            leadClaims: ["field-final-character"],
          },
          {
            id: "scanner-rules",
            cls: "tool-corroborated",
            text: "One checksum-validating scanner rule matches the cflt form, while two other scanners' rules match a 64-character run without any prefix or checksum handling.",
            claims: ["tool-corroboration"],
          },
        ],
        issuance: [
          {
            id: "boundary-wording",
            cls: "provider-documented",
            text: "Newly created API secrets carry the prefix from 2025-07-30. Provider pages word the boundary day differently (after, on or after, starting), so the exact cut-over day is not fixed by them.",
            cite: [OVERVIEW, RELEASE_NOTES, IDENTITY_FAQ],
          },
          {
            id: "key-id",
            cls: "provider-documented",
            text: "The key id that pairs with a secret is 16 characters and is documented as not secret information.",
            claims: ["field-key-id"],
          },
          {
            id: "scopes",
            unresolved: "The provider pages speak of API secrets generically, and no issued secret was checked per scope.",
            text: "Every key scope (cloud, Kafka, Schema Registry, ksqlDB, Flink, Tableflow, global) issues the same prefixed shape.",
            leadClaims: ["field-scope-coverage"],
          },
          {
            id: "not-issued",
            unresolved: "No secret was issued for this research, so the checksum recipe was recomputed from the provider's own example and not checked against a fresh secret.",
            text: "No Confluent secret was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "public-ids",
            unresolved: "Recorded in a research note without a cited source in this family's contract, except for the key id, which is documented as public.",
            text: "Values nearby that are not this secret include the 16-character key id, resource ids with prefixes such as lkc-, lsrc-, env- and sa-, a SCIM token of the form cflt-scim_ followed by a JWT, and the ticker symbol of a listed company that happens to share the prefix.",
          },
          {
            id: "legacy-overlap",
            unresolved: "Recorded in a research note without a cited source; the overlap is a consequence of the two documented shapes.",
            text: "The older unprefixed 64-character secret shape overlaps this family's alphabet and length, so a prefixed secret also satisfies the older shape.",
          },
        ],
        openQuestions: [
          {
            id: "last-character",
            unresolved: "Checking it needs one issued secret.",
            text: "Is the last character of an issued secret always one of the four derived values?",
          },
        ],
      },
    },
    {
      id: "confluent:cloud-api-secret-legacy",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "unprefixed-64",
            cls: "provider-documented",
            text: "An API secret created before 2025-07-30 may carry no cflt prefix. It is an unprefixed run of letters, digits, plus and slash, 64 characters in every command-line table placeholder, the Flink JSON example and the provider's Terraform test data, with no padding in any example and no documented checksum. One Connect API Basic-auth example shows 60 characters.",
            cite: [OVERVIEW, RELEASE_NOTES, CONNECT_API, FLINK_KEY],
            claims: ["field-prefix", "field-length", "field-alphabet"],
          },
          {
            id: "length-ambiguity",
            unresolved: "The provider states no length or alphabet for the unprefixed form; 64 comes from examples, provider test data and two scanner rules, and one example shows 60.",
            text: "The real length of the unprefixed form is 64 characters rather than 60.",
          },
          {
            id: "scanner-rules",
            cls: "tool-corroborated",
            text: "One scanner rule matches a lowercase-and-digit 64-character run with no plus or slash, and another matches the full 64-character alphabet and requires a key and secret pair. A third scanner imports the first rule's lineage and is not independent.",
            claims: ["tool-corroboration"],
          },
        ],
        issuance: [
          {
            id: "no-new-issuance",
            unresolved: "The conflicting wording across provider pages was not tested, and no old secret was available to observe.",
            text: "A new secret is always the prefixed generation, so no new unprefixed secret can be issued and only a key created before the cut-over could corroborate the shape.",
            leadClaims: ["field-current-issuance-reproducibility"],
          },
          {
            id: "cutover-wording",
            cls: "provider-documented",
            text: "Pages disagree on how earlier secrets are described: one says they may not include the prefix, another says they do not, and the cut-over day is worded as after, on or after, and starting.",
            cite: [OVERVIEW, RELEASE_NOTES, IDENTITY_FAQ],
          },
        ],
        collisions: [
          {
            id: "any-64-run",
            cls: "tool-corroborated",
            text: "Because the shape has no marker, it is claimed only beside a Confluent keyword on the same line. Scanner rules for it are gated the same way.",
            claims: ["field-context-gate"],
          },
          {
            id: "hex-and-prefixed",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "Any 64-character run over the Base64 alphabet, including a 64-digit hexadecimal digest and a prefixed secret, satisfies the same shape. Percent-encoding of plus and slash inside URL userinfo breaks the run.",
          },
        ],
        openQuestions: [
          {
            id: "still-mintable",
            unresolved: "The provider wording conflicts and nothing observed shows whether one can still be created.",
            text: "Can an unprefixed secret still be created after 2025-07-30?",
          },
        ],
      },
    },
  ],
};
