// Authored family narratives for the Discord dossier (benchmarks/support/dossiers/discord.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const API_REFERENCE = "https://docs.discord.com/developers/reference";
const DISCORD_NET = "https://github.com/discord-net/Discord.Net/blob/d34a50eeabb39699a2329fbdac735b7d2b069824/src/Discord.Net.Core/Utils/TokenUtils.cs";

export default {
  provider: "discord",
  dropped: [
    { part: "Candidate: OAuth2 client secrets and webhook URLs", reason: "separate credentials with no research; not families yet" },
    { part: "Open question 3 (a settled disagreement about a scanner rule's behaviour under a mutation)", reason: "scanner state, not credential knowledge" },
    { part: "Open questions 1 and 2 (confirmation by a fresh token; validity of legacy tokens after reset)", reason: "carried as unresolved statements in the family" },
  ],
  families: [
    {
      id: "discord:bot-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "provider-example",
            cls: "provider-documented",
            text: "Discord's API reference shows one example bot-token header, measured as three dot-separated segments of 24, 6 and 27 characters, the older shape. It states no grammar, and an example is not a grammar.",
            cite: [API_REFERENCE],
          },
          {
            id: "segment-1",
            cls: "tool-corroborated",
            text: "A third-party Discord client library's token utilities decode the first segment as the base64url of the bot's user id, with no padding, into an unsigned 64-bit id.",
            cite: [DISCORD_NET],
          },
          {
            id: "segments",
            unresolved: "Rests on dated community reports and third-party patterns; Discord documents no grammar, and the widths of the newer shape were not measured on a freshly issued token.",
            text: "A bot token is three base64url segments joined by two dots, with no padding and the alphabet of letters, digits, underscore and hyphen. Segment 1 is the base64url of the bot user id in decimal ASCII, 24 characters for an 18-digit id and 26 for a 19-digit id (bots created since 2022-07-22). Segment 2 is 6 characters. Segment 3 is 27 characters before about May 2022 and 38 since, and older tokens keep 27 until reset.",
            leadClaims: ["field-segments", "field-segment-1", "field-segment-2", "field-segment-3"],
          },
          {
            id: "first-character",
            unresolved: "Recorded in a research note without a cited source in this family's contract; a scanner rule requires the first character to be M, N or O.",
            text: "The first character of a token is M, N or O, which follows from base64 of a decimal digit string.",
          },
        ],
        issuance: [
          {
            id: "developer-portal",
            cls: "provider-documented",
            text: "Bot tokens are issued from the bot page of the Developer Portal and are sent in an Authorization header with the scheme Bot.",
            cite: [API_REFERENCE],
          },
          {
            id: "not-issued",
            unresolved: "No token was issued for this research; a fresh token (expected 26, 6 and 38 characters for a new application) is the open check.",
            text: "No Discord bot token was issued or observed for this record.",
          },
        ],
        lifecycle: [
          {
            id: "no-stability-guarantee",
            unresolved: "Recorded in a research note without a cited source; Discord states nothing about the validity of older tokens after a reset.",
            text: "Discord gives no guarantee that the token format stays the same, and it is not stated whether legacy 24, 6 and 27 tokens remain valid after reset windows.",
          },
        ],
        collisions: [
          {
            id: "dotted-runs",
            unresolved: "Recorded in a research note without a cited source in this family's contract.",
            text: "No fixed prefix exists; the shape is three dotted base64url runs, so ordinary dotted identifiers and other JWT-like values are the confusable class.",
          },
        ],
        openQuestions: [
          {
            id: "fresh-token",
            unresolved: "One fresh token would confirm the 26, 6 and 38 widths, the digit-decoding of segment 1 and the absence of padding.",
            text: "What does a token issued today look like?",
          },
        ],
      },
    },
  ],
};
