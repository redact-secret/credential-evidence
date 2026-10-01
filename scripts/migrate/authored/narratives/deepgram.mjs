// Authored family narratives for the Deepgram dossier (benchmarks/support/dossiers/deepgram.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const AUTHENTICATING = "https://developers.deepgram.com/guides/fundamentals/authenticating";
const CREATE_KEY = "https://developers.deepgram.com/reference/manage/keys/create";
const GRANT = "https://developers.deepgram.com/reference/auth/tokens/grant";
const DISCUSSION = "https://github.com/orgs/deepgram/discussions/577";

export default {
  provider: "deepgram",
  dropped: [
    { part: "Candidate: temporary API keys (250 per day)", reason: "mentioned in the documentation with no format; not a family" },
    { part: "Candidate: legacy 32-character keys", reason: "a hypothesis that nothing supports; carried only as an unresolved statement about the documentation example" },
    { part: "Open question 3 (verdict history of an issue and a scanner rule row)", reason: "issue workflow and product status, not credential knowledge" },
    { part: "Open question 4 (a staff answer on a forum thread that could not be read)", reason: "a limit of the research pass; no statement rests on it" },
    { part: "Open question 5 (a scanner's native rule directory was not located)", reason: "scanner state, not credential knowledge" },
  ],
  families: [
    {
      id: "deepgram:api-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "unprefixed-40",
            cls: "tool-corroborated",
            text: "A project API key has no prefix and is 40 characters long. Two scanner rules agree on the length and a user in a provider-hosted GitHub discussion reports a working 40-character key. The key is recognised only beside a same-line Deepgram name, host or SDK constructor, never as a bare 40-character run, because a Git SHA-1 has the same shape.",
            cite: [DISCUSSION],
            claims: ["field-shape", "field-context", "tool-corroboration"],
          },
          {
            id: "alphabet",
            unresolved: "Scanner rules disagree (lowercase hexadecimal in one, lowercase letters and digits in another) and no provider source decides it.",
            text: "The key is lowercase hexadecimal, as opposed to the wider lowercase letters and digits.",
            leadClaims: ["field-alphabet"],
          },
          {
            id: "length-provider-silent",
            unresolved: "The provider's create-key example shows 32 ascending hexadecimal digits for both the key and the key id, which reads as a placeholder and conflicts with every other source; whether keys were ever 32 characters is untested.",
            text: "The provider documents the key length.",
            lead: [CREATE_KEY],
            leadClaims: ["field-docs-example-length"],
          },
        ],
        issuance: [
          {
            id: "console-and-api",
            cls: "provider-documented",
            text: "Keys are created in the console (Settings, then API Keys) or through the management API, permanent or expiring, and the secret is shown once.",
            cite: [CREATE_KEY, AUTHENTICATING],
          },
          {
            id: "header-and-transport",
            cls: "provider-documented",
            text: "Requests send an Authorization header with the scheme Token followed by the key, not Bearer. The SDKs read the DEEPGRAM_API_KEY variable and accept the key as a constructor argument.",
            claims: ["field-header-scheme", "field-transport"],
          },
          {
            id: "grant-token",
            cls: "provider-documented",
            text: "A separate endpoint returns a short-lived access token (30 seconds by default) that is a JWT and is sent as a Bearer token; it is a different credential from an API key.",
            cite: [GRANT, AUTHENTICATING],
            claims: ["field-header-scheme"],
          },
          {
            id: "not-issued",
            unresolved: "No key was issued for this research; total length, character class, a second key, the shape of the visible key id, an expiring key and the grant token structure were listed for a later check.",
            text: "No Deepgram key was issued or observed for this record.",
          },
        ],
        collisions: [
          {
            id: "public-ids",
            cls: "provider-documented",
            text: "The key id returned beside a key, project ids and request ids are public identifiers. The key id uses the same example shape as the key, so a stored key id is a lookalike; project and request ids are UUIDs.",
            claims: ["field-public-ids"],
          },
          {
            id: "git-sha",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "A Git SHA-1 digest is also 40 lowercase hexadecimal characters.",
          },
        ],
        openQuestions: [
          {
            id: "alphabet-question",
            unresolved: "Scanner rules and one forum observation disagree and no provider source or issued key decides it.",
            text: "Is the alphabet lowercase hexadecimal or lowercase letters and digits?",
          },
          {
            id: "length-question",
            unresolved: "Needs one issued key, and a dated source if an older format ever existed.",
            text: "Is 40 characters universal, and do 32-character keys exist?",
          },
        ],
      },
    },
  ],
};
