// Authored family narratives for the Amazon Bedrock dossier (benchmarks/support/dossiers/aws-bedrock.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const IAM_SSC = "https://docs.aws.amazon.com/IAM/latest/APIReference/API_ServiceSpecificCredential.html";
const KEY_REFERENCE = "https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys-reference.html";
const KEY_REVOKE = "https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys-revoke.html";
const WIZ = "https://www.wiz.io/blog/a-new-type-of-long-lived-key-on-aws-bedrock-api-keys";

export default {
  provider: "aws-bedrock",
  dropped: [
    { part: "Statements about which other scanners carry the long-term key shape, and the contradicted claim that GitHub secret scanning covers it", reason: "state of other scanners, not credential knowledge" },
    { part: "Candidate: Claude Platform on AWS keys", reason: "not a family yet; reported by one vendor only; carried as an unresolved collision of the short-term key" },
    { part: "Candidate: decoded presigned URL form of a short-term key", reason: "a different lexical form of the same secret, an open question for the short-term family and not a family" },
    { part: "Open question 5 (Reddit unreachable)", reason: "research workflow state, not credential knowledge" },
    { part: "The maintainer ruling that accepted the blog as evidence for the prefix and alphabet", reason: "an evidence-bar ruling; its scope is expressed by the evidence class of each statement" },
  ],
  families: [
    {
      id: "aws-bedrock:long-term-api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-and-alphabet",
            cls: "provider-documented",
            text: "A long-term key begins ABSK and continues with standard Base64 (letters, digits, plus and slash, up to two trailing = pad characters). AWS's own security blog prints this scan pattern; a blog is not a format specification, so only the prefix and alphabet rest on it. No source documents a URL-safe variant.",
            claims: ["provider-source", "field-prefix", "field-body-alphabet"],
          },
          {
            id: "console-head",
            cls: "provider-documented",
            text: "For a key created in the console, ABSK is followed by QmVkcm9ja0FQSUtleS, the Base64 of BedrockAPIKey-. This holds only when the IAM user name starts with BedrockAPIKey-.",
            claims: ["field-console-head"],
          },
          {
            id: "total-length",
            cls: "tool-corroborated",
            text: "A console key measured 132 characters and a secondary key (a +1 user name) works out to 136 by layout arithmetic. Scanner rules tolerate a wider band of lengths; that band is the scanner authors' choice, not provider-stated.",
            claims: ["field-total-length"],
          },
          {
            id: "decoded-structure",
            unresolved: "A security vendor's note says the structure is subject to change, and the IAM API reference supports only the split between a public alias and the secret.",
            text: "Decoded, a key reads BedrockAPIKey-, a user name, -at-, the 12-digit account id, a colon, then 44 random bytes as Base64.",
            leadClaims: ["field-decoded-structure"],
            lead: [WIZ],
          },
        ],
        issuance: [
          {
            id: "service-specific-credential",
            cls: "provider-documented",
            text: "AWS issues a long-term key as an IAM service-specific credential; the credential's public alias is separate from its secret.",
            claims: ["field-public-alias"],
            cite: [IAM_SSC],
          },
          {
            id: "transport",
            cls: "provider-documented",
            text: "The key is passed in the AWS_BEARER_TOKEN_BEDROCK environment variable or as an Authorization: Bearer header.",
            claims: ["field-transport"],
          },
          {
            id: "console-and-cli",
            unresolved: "Recorded in a research note without a cited source in this family's contract; the user guide's key reference was listed but not matched to these details.",
            text: "A key is created in the Bedrock console or with aws iam create-service-specific-credential, is shown once, and an IAM user can hold at most two.",
            lead: [KEY_REFERENCE],
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for this research; a checklist of length, padding and the decoded head was drawn up but not performed.",
            text: "No Bedrock long-term key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "public-alias",
            cls: "provider-documented",
            text: "The decoded BedrockAPIKey-<user>-at-<account> alias is a public identifier; only the part after the colon is secret.",
            claims: ["field-public-alias"],
          },
          {
            id: "access-key-ids",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "A long-term key is distinct from AKIA and ASIA access key ids and from the public credential alias.",
          },
          {
            id: "not-prefixed-claim",
            unresolved: "A third-party reference page says the key is not prefixed, which contradicts AWS's blog; that page is not recorded as a source of this family.",
            text: "A third-party reference states that the key carries no prefix.",
          },
        ],
        openQuestions: [
          {
            id: "length-universal",
            unresolved: "No source gives a provider length; issued keys with a secondary key and other user names would settle it.",
            text: "Is 132 characters universal, or does it depend on the layout (a secondary key, other IAM user names)?",
          },
        ],
      },
    },
    {
      id: "aws-bedrock:short-term-api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "prefix-head-alphabet",
            cls: "provider-documented",
            text: "A short-term key begins bedrock-api-key- and continues with the standard padded Base64 of a SigV4-presigned CallWithBearerToken URL that ends in &Version=1. The first 133 Base64 characters after the prefix are constant: they encode the fixed host, action, algorithm and credential parameter names. AWS's Python, JavaScript and Java token generators and its security blog agree; the blog's printed body class is malformed and the intended one is standard Base64. No URL-safe variant is documented.",
            claims: ["provider-source", "field-prefix", "field-fixed-head", "field-body-alphabet", "field-version-suffix"],
          },
          {
            id: "total-length",
            unresolved: "No source documents a length; a vendor blog gives the larger figure and no bound is stated by AWS.",
            text: "A key is about 500 characters when presigned without a session token and over 1000 with one.",
            leadClaims: ["field-total-length"],
            lead: [WIZ],
          },
        ],
        issuance: [
          {
            id: "client-side-and-lifetime",
            cls: "provider-documented",
            text: "AWS's token generators mint the key client-side as a presigned URL. It is valid for the shorter of 12 hours and the lifetime of the session that generated it.",
            claims: ["provider-source", "field-lifetime"],
          },
          {
            id: "transport",
            cls: "provider-documented",
            text: "As with the long-term key, it is passed in AWS_BEARER_TOKEN_BEDROCK or as an Authorization: Bearer header.",
            claims: ["field-transport"],
          },
          {
            id: "revocation",
            cls: "provider-documented",
            text: "A short-term key is not listed and cannot be revoked individually; access is stopped by denying the session that generated it.",
            cite: [KEY_REVOKE],
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for this research; a comparison of console output with SDK output was drawn up but not performed.",
            text: "No Bedrock short-term key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "shares-header-with-long-term",
            cls: "provider-documented",
            text: "It shares the Authorization header and the environment variable with the long-term key; the prefix tells the two apart.",
            claims: ["field-transport", "field-prefix"],
          },
          {
            id: "decoded-access-key-id",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "The decoded URL exposes an ASIA access key id, but the encoded form wraps it in Base64.",
          },
          {
            id: "claude-platform-keys",
            unresolved: "Reported by one security vendor only; no AWS source was read.",
            text: "Keys for Claude Platform on AWS use a different prefix and belong to a separate product.",
          },
        ],
        openQuestions: [
          {
            id: "console-versus-sdk",
            unresolved: "No console-issued key has been compared with SDK output.",
            text: "Is a console-issued short-term key byte-identical to one minted by an SDK?",
            leadClaims: ["field-console-output"],
          },
          {
            id: "version-drift",
            unresolved: "All three SDKs have used &Version=1 since 2025-06 and nothing documents a change; no source states whether it will move.",
            text: "Will the &Version=1 marker change, and would a changed marker alter the key shape?",
          },
          {
            id: "regions-and-partitions",
            unresolved: "The GovCloud and China hosts and their scope were not read.",
            text: "Do keys for GovCloud and China partitions use a different host or shape?",
          },
        ],
      },
    },
  ],
};
