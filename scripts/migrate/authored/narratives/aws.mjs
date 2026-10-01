// Authored family narratives for the AWS dossier (benchmarks/support/dossiers/aws.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010). Every
// statement cites sources or contract claims, or is unresolved with a reason.

const IAM_IDS = "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html#identifiers-prefixes";
const PROGRAMMATIC = "https://docs.aws.amazon.com/IAM/latest/UserGuide/security-creds-programmatic-access.html";
const STS_CREDENTIALS = "https://docs.aws.amazon.com/STS/latest/APIReference/API_Credentials.html";
const STS_ASSUME_ROLE = "https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html";
const GITLEAKS_AWS = "https://github.com/gitleaks/gitleaks/blob/b58d3f102cf3a2c84cb7f923d05c25c9b1aed84b/cmd/generate/config/rules/aws.go";
const DETECT_SECRETS_AWS = "https://github.com/Yelp/detect-secrets/blob/5e141933554a0b74e7341841f318be21e895339c/detect_secrets/plugins/aws.py";
const TRUFFLEHOG_SESSION = "https://github.com/trufflesecurity/trufflehog/blob/48b58d3bf3f02ba17bf23b87f095499bc80c6fd7/pkg/detectors/aws/session_keys/sessionkey.go";
const TRUFFLEHOG_ACCESS = "https://github.com/trufflesecurity/trufflehog/blob/48b58d3bf3f02ba17bf23b87f095499bc80c6fd7/pkg/detectors/aws/access_keys/accesskey.go";
const TRUFFLEHOG_COMMON = "https://github.com/trufflesecurity/trufflehog/blob/48b58d3bf3f02ba17bf23b87f095499bc80c6fd7/pkg/detectors/aws/common.go";
const GIT_SECRETS = "https://github.com/awslabs/git-secrets/blob/7d6b970cbd3c216353cb22b383b70c150140662e/git-secrets";
const HASHICORP = "https://github.com/hashicorp/aws-sdk-go-base/blob/41fc7e1b09a140821eb9cbe6889bb53072a0da2e/logging/aws.go";
const JSLUICE = "https://github.com/BishopFox/jsluice/blob/0ddfab153e060a9eeaded4d8669233f7c071e7e4/secret-aws.go";
const GITLEAKS_PR = "https://github.com/gitleaks/gitleaks/pull/1816";
const STEELE = "https://awsteele.com/blog/2020/09/26/aws-access-key-format.html";
const SUMMIT = "https://summitroute.com/blog/2018/06/20/aws_security_credential_formats/";
const ADOBE = "https://blog.adobe.com/security/uncovering-the-hidden-identities-within-aws-access-keys";
const GH_PATTERNS = "https://docs.github.com/en/code-security/secret-scanning/introduction/supported-secret-scanning-patterns";
const BEARER = "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_bearer.html";
const CODEARTIFACT_AUTH = "https://docs.aws.amazon.com/codeartifact/latest/ug/tokens-authentication.html";
const CODEARTIFACT_API = "https://docs.aws.amazon.com/codeartifact/latest/APIReference/API_GetAuthorizationToken.html";
const SERVICE_KEYS = "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_api_keys_for_aws_services.html";
const SERVICE_CRED_API = "https://docs.aws.amazon.com/IAM/latest/APIReference/API_ServiceSpecificCredential.html";
const BEDROCK_BLOG = "https://aws.amazon.com/blogs/security/securing-amazon-bedrock-api-keys-best-practices-for-implementation-and-management/";
const ACCESS_KEYS = "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html";
const ACCESS_KEY_API = "https://docs.aws.amazon.com/IAM/latest/APIReference/API_AccessKey.html";

export default {
  provider: "aws",
  dropped: [
    { part: "Candidates: other IAM unique-ID prefixes (AGPA, AIDA, AIPA, ANPA, ANVA, APKA, AROA, ASCA)", reason: "resource identifiers, not credentials; only AIDA, which the provider's table pairs with access keys, appears in a narrative" },
    { part: "Candidates: ABIA and ACCA key IDs (bare), STS session token", reason: "covered by the narratives of the bearer-token, context-specific and temporary-access-key families" },
  ],
  families: [
    {
      id: "aws:iam-user-access-key",
      status: "migrated",
      sections: {
        shape: [
          { id: "akia-prefix", cls: "provider-documented", text: "The access key ID of an IAM user's long-term access key begins with the four characters AKIA.", cite: [IAM_IDS], claims: ["provider-source"] },
          { id: "body-base32", cls: "tool-corroborated", text: "The 20-character ID is AKIA followed by a 16-character body from the base32 alphabet (A-Z and 2-7). AWS does not state the body length or alphabet in prose, so this rests on corroborating scanner rules and not on a provider statement.", claims: ["tool-corroboration"] },
          { id: "paired-secret", cls: "tool-corroborated", text: "The key ID is issued with a separate 40-character secret access key. The 40-character length is likewise corroborated by scanner rules only.", claims: ["tool-corroboration"] },
        ],
        collisions: [
          { id: "sibling-prefixes", cls: "provider-documented", text: "The same prefix table lists ASIA (temporary STS access key IDs), ABIA and ACCA next to AKIA. Each names a different credential kind, so an AKIA body shape does not establish which kind a value is.", cite: [IAM_IDS], claims: ["provider-source"] },
          { id: "aida-not-a-key", cls: "provider-documented", text: "AIDA is the prefix of an IAM user's unique ID. It is an identifier and not an access key, although it has the same four-letter shape.", cite: [IAM_IDS], claims: ["provider-source"] },
        ],
      },
    },
    {
      id: "aws:sts-temporary-access-key",
      status: "migrated",
      sections: {
        shape: [
          { id: "asia-prefix", cls: "provider-documented", text: "A temporary access key ID issued by STS begins with ASIA. The IAM prefix table lists it as the temporary (STS) access key ID prefix, and the programmatic-access page says ASIA keys come from STS operations.", cite: [IAM_IDS, PROGRAMMATIC], claims: ["field-prefix"] },
          { id: "length-20", cls: "provider-documented", text: "The ID is 20 characters: the four-character prefix and a 16-character body. The provider's own example is 20 uppercase letters and digits, and AWS-owned and peer rules agree. The STS Credentials type allows 16 to 128 word characters for the key ID, a range no example or rule uses.", cite: [STS_CREDENTIALS, STS_ASSUME_ROLE, GIT_SECRETS], claims: ["field-body"] },
          { id: "body-alphabet", cls: "tool-corroborated", text: "The body is read as letters and digits (A-Z and 0-9). No provider source says which characters are issued. One scanner rule narrowed it to base32 (A-Z and 2-7) in April 2025 without maintainer discussion; the other reviewed rules accept any uppercase letter or digit. An independent 2020 observation found only base32 characters, and a 2018 write-up also gives base32, but neither is a provider statement.", cite: [GITLEAKS_AWS, GITLEAKS_PR, DETECT_SECRETS_AWS, GIT_SECRETS, STEELE, SUMMIT], claims: ["field-alphabet"] },
          { id: "session-token-unspecified", cls: "provider-documented", text: "The secret access key and the session token that accompany an ASIA key ID have no documented alphabet or length; the AssumeRole page says the session token size is not fixed. Documentation examples of the token are base64-shaped, and one scanner rule matches 100 or more base64 characters, which is a heuristic and not a grammar.", cite: [STS_ASSUME_ROLE, TRUFFLEHOG_SESSION], claims: ["field-companion"] },
          { id: "base32-observation", cls: "tool-corroborated", text: "The 2020 write-up dates a change in the internal structure of the key ID to 27 to 29 March 2019 and observed none of the characters 0, 1, 8 or 9 in the body.", cite: [STEELE] },
        ],
        issuance: [
          { id: "sts-operations", cls: "provider-documented", text: "ASIA key IDs are created by STS operations. They are usable only together with a secret access key and a session token, so the key ID alone authenticates nothing.", cite: [IAM_IDS, PROGRAMMATIC], claims: ["field-companion"] },
          { id: "not-minted", unresolved: "Nothing was minted for this research: STS issuance needs an AWS account and was not attempted, so no issued value was observed.", text: "No ASIA key was issued or observed for this record; the shape above rests on documentation, AWS-owned code and independent write-ups." },
        ],
        lifecycle: [
          { id: "prefixes-may-vary", cls: "provider-documented", text: "AWS warns that identifier prefixes may vary based on when the identifier was created, so the prefix table describes the present and not every historical value.", cite: [IAM_IDS], claims: ["field-prefix"] },
        ],
        collisions: [
          { id: "bare-key-id-weak", cls: "tool-corroborated", text: "A bare ASIA key ID is the weakest half of the credential. A scanner that reports it with confidence does so only with a paired secret or session token, as GitHub's secret-scanning pattern for temporary AWS key IDs requires a secret and a token.", cite: [GH_PATTERNS, TRUFFLEHOG_SESSION], claims: ["field-peer-lag"] },
          { id: "same-prefix-table", cls: "provider-documented", text: "AKIA, ABIA and ACCA IDs sit in the same prefix table and share the four-letter-plus-body layout, so the prefix is what separates the kinds.", cite: [IAM_IDS] },
        ],
        openQuestions: [
          { id: "digit-outside-base32", unresolved: "No reviewed source shows an ASIA key with a digit outside 2-7, and none shows that none exists.", text: "Does any ASIA key ID carry a digit outside the base32 range 2-7? An earlier research note says legacy values do; no reviewed source shows one, so a base32-only reading cannot be ruled out or confirmed." },
          { id: "structure-undocumented", unresolved: "The structure is reverse-engineered, and AWS marks it as subject to change.", text: "The meaning of the fifth and last characters of the key ID and the encoding of the account ID inside it are reverse-engineered and undocumented by AWS, so they are not part of the format." },
        ],
      },
    },
    {
      id: "aws:sts-service-bearer-token",
      status: "migrated",
      sections: {
        shape: [
          { id: "abia-key-id", cls: "provider-documented", text: "AWS documents that the access key ID inside an STS service bearer token begins with ABIA. It does not describe the bearer token string itself.", cite: [BEARER, IAM_IDS] },
          { id: "token-type-string", cls: "provider-documented", text: "The CodeArtifact API types the returned authorization token only as a string, with no length, alphabet or prefix, and states a life between 15 minutes and 12 hours.", cite: [CODEARTIFACT_API, CODEARTIFACT_AUTH] },
        ],
        issuance: [
          { id: "services-call-get-token", cls: "provider-documented", text: "Services such as CodeArtifact (and, by the same permission, ECR Public) call the sts:GetServiceBearerToken operation and hand the token back to the caller.", cite: [BEARER, CODEARTIFACT_AUTH] },
        ],
        lifecycle: [
          { id: "short-lived", cls: "provider-documented", text: "The CodeArtifact authorization token lives between 15 minutes and 12 hours.", cite: [CODEARTIFACT_API] },
        ],
        collisions: [
          { id: "bare-abia-id", cls: "tool-corroborated", text: "A bare ABIA value that turns up in text is an identifier shaped like the other key IDs, not a bearer token, and belongs with the key-ID layout. Scanner rules that mention ABIA list it only as an access-key-ID prefix.", cite: [GITLEAKS_AWS, TRUFFLEHOG_ACCESS, HASHICORP, JSLUICE] },
        ],
        openQuestions: [
          { id: "token-format-documented", unresolved: "Searches of AWS documentation, SDK and CLI source, blogs, forum threads and code search found the ABIA prefix and the permission only; none states the token's shape. Reddit and Stack Overflow pages could not be read.", text: "Does AWS document the format of the CodeArtifact or ECR Public bearer token, or has anyone published a decoded structure? Nothing reviewed does, so the family has no grammar for the value that actually authenticates." },
        ],
      },
    },
    {
      id: "aws:context-specific-credential",
      status: "migrated",
      sections: {
        shape: [
          { id: "acca-prefix-id", cls: "provider-documented", text: "ACCA is the prefix of a service-specific credential ID. The IAM API pattern for the ID allows word characters, at least 20 and at most 128 of them. The ID identifies a credential; it does not authenticate.", cite: [IAM_IDS, SERVICE_CRED_API, BEDROCK_BLOG] },
          { id: "secret-half-elsewhere", cls: "provider-documented", text: "The value that authenticates is a different field: the generated ServicePassword for CodeCommit and Keyspaces, or the ServiceCredentialSecret and ServiceApiKeyValue for Bedrock and CloudWatch Logs API keys. The Bedrock long-term key has its own documented ABSK prefix.", cite: [SERVICE_KEYS, SERVICE_CRED_API, BEDROCK_BLOG] },
        ],
        issuance: [
          { id: "id-listed-openly", cls: "provider-documented", text: "The IAM API returns the credential ID as the unique identifier used to update, reset or delete the credential, and lists it in ordinary list-service-specific-credentials output; AWS's Bedrock guidance shows it in CloudTrail fields.", cite: [SERVICE_CRED_API, BEDROCK_BLOG] },
        ],
        collisions: [
          { id: "peer-key-id-sets", cls: "tool-corroborated", text: "Several scanner rules include ACCA in a set of access-key-ID prefixes, so ACCA-shaped IDs are matched. None documents that an ACCA value is a credential in its own right, and one of them reports an ID only when it is paired with a secret.", cite: [GITLEAKS_AWS, TRUFFLEHOG_ACCESS, HASHICORP, JSLUICE] },
        ],
        openQuestions: [
          { id: "acca-key-id-scope", unresolved: "The prefix is documented and peer rules corroborate a 20-character form, but whether an identifier that authenticates nothing belongs to this family is a scope decision that no evidence settles.", text: "Should a bare ACCA ID be described as a key-ID shape like AKIA? If so, the family description should say service-specific credential ID and not temporary credential. The research verdict for this family is rejected: the ID is a management handle and not a secret." },
        ],
      },
    },
    {
      id: "aws:iam-user-secret-access-key",
      status: "migrated",
      sections: {
        shape: [
          { id: "forty-characters", cls: "provider-documented", text: "The secret access key paired with an access key ID is 40 characters of the base64 alphabet (letters, digits, plus and slash), with no prefix, lexical marker or checksum. A temporary (ASIA) credential carries a secret of the same shape. AWS's documentation example has this shape, and the IAM AccessKey API types the field only as a string.", cite: [ACCESS_KEYS, ACCESS_KEY_API], claims: ["field-value"] },
          { id: "thirty-bytes", cls: "tool-corroborated", text: "A 2018 write-up describes the 40 characters as base64 of 30 random bytes, which is why no padding character appears inside the 40.", cite: [SUMMIT], claims: ["field-padding"] },
          { id: "padding-disagreement", cls: "tool-corroborated", text: "One AWS-owned scanner rule allows an equals sign in the 40 characters and another omits it; standard base64 has no equals sign inside 40 characters for 30 bytes, so the equals sign is not part of the value.", cite: [GIT_SECRETS, DETECT_SECRETS_AWS, TRUFFLEHOG_COMMON], claims: ["field-padding"] },
        ],
        issuance: [
          { id: "not-issued", unresolved: "No key was created or observed for this research.", text: "No secret access key was issued or observed for this record, so the shape rests on documentation examples, AWS-owned code and independent implementations." },
        ],
        collisions: [
          { id: "bare-value-ambiguous", cls: "tool-corroborated", text: "Any 40-character base64 run is also a hash, a path or an ordinary token, so a bare value does not identify an AWS secret. The supportable reading is a value assigned to an AWS-named key or sitting beside an AKIA or ASIA key ID; the reviewed rules disagree on the key-name list and on quoting, and none treats the bare value as a finding without its neighbour.", cite: [GIT_SECRETS, DETECT_SECRETS_AWS, TRUFFLEHOG_COMMON, HASHICORP], claims: ["field-context", "field-peer-lag"] },
          { id: "example-value-placeholder", cls: "provider-documented", text: "The example secret in AWS documentation is a published placeholder and not a credential.", cite: [ACCESS_KEYS], claims: ["field-value"] },
          { id: "one-char-longer-example", cls: "provider-documented", text: "The AssumeRole and GetSessionToken sample responses show a secret one character longer than 40. No reviewed source treats that as a different format; it reads as a documentation slip.", cite: [STS_ASSUME_ROLE] },
        ],
        openQuestions: [
          { id: "secret-not-forty", unresolved: "No reviewed source reports a secret of another length, and none states that all issued secrets are 40 characters.", text: "Do the two keys of an IAM user, or a temporary credential, ever show a secret that is not 40 characters? No source reports one." },
        ],
      },
    },
  ],
};
