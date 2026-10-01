// Authored family narratives for the Telegram dossier (benchmarks/support/dossiers/telegram.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const API = "https://core.telegram.org/bots/api";
const FEATURES = "https://core.telegram.org/bots/features";
const SERVER = "https://github.com/tdlib/telegram-bot-api/blob/e3e9dd8e5b3d7ab8537cd5a10dc31d5ffa8f82d1/telegram-bot-api/ClientManager.cpp";

export default {
  provider: "telegram",
  dropped: [
    { part: "Candidate: Telegram API id and hash, MTProto session strings", reason: "no research recorded; not a family" },
    { part: "Candidate: serverless command-line token (app<id>:<secret>) and managed-bot tokens", reason: "found in a research comment only; no taxonomy entry and no cited source in this family's record" },
    { part: "Open question 3 (the matching floor of a 5-digit id and 34-character body)", reason: "a product matching floor, not credential knowledge" },
    { part: "Research log", reason: "issue workflow" },
  ],
  families: [
    {
      id: "telegram:bot-token",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "id-colon-secret",
            cls: "provider-documented",
            text: "A bot token is the bot's numeric user id, a literal colon, and a secret from letters, digits, underscore and hyphen. Telegram's Bot API server rejects a token with no colon, with a slash, longer than 80 characters, starting with 0, or whose id is not between 0 and 2 to the power 54. The server code accepts ids of 1 to 16 digits; real ids are usually 8 to 10.",
            cite: [SERVER],
            claims: ["field-delimiter", "field-bot-id", "mutable-property-source"],
          },
          {
            id: "examples-only",
            cls: "tool-corroborated",
            text: "Telegram's documentation shows example tokens introduced as what a token looks like and never states a grammar. The server code is acceptance logic, not documentation.",
            cite: [API, FEATURES],
            claims: ["dossier-research"],
          },
          {
            id: "secret-width",
            unresolved: "The documentation examples and community reports disagree and no source states the width: all three Telegram examples show 34 characters while most tools and reports say 35.",
            text: "The secret is 34 or 35 characters long.",
            leadClaims: ["field-secret-body"],
          },
          {
            id: "leading-aa",
            unresolved: "Two of three Telegram examples and most scanner rules show a leading A or AA after the colon, and no source explains it or reports it for real tokens.",
            text: "The secret usually starts with AA.",
          },
        ],
        issuance: [
          {
            id: "botfather",
            unresolved: "Recorded in the overview without a cited page; no token was issued, and a fresh token would settle the width and the lead.",
            text: "Bot tokens are issued through BotFather.",
          },
        ],
        collisions: [
          {
            id: "digits-colon-string",
            unresolved: "Recorded in a research note as an inference, without a cited source.",
            text: "Any short digits-colon-string pair has this outline; the numeric id alone is a weak marker, so the secret body carries the discrimination.",
          },
        ],
        openQuestions: [
          {
            id: "secret-length",
            unresolved: "No freshly issued token was measured and no provider text states the width or alphabet.",
            text: "Is the secret 34 or 35 characters, and does its alphabet ever include underscore?",
            leadClaims: ["field-secret-body"],
          },
          {
            id: "why-aa",
            unresolved: "No empirical report says real tokens start with AA; only examples and scanner rules do.",
            text: "Why do the documented examples and most scanner rules start AA after the colon?",
          },
        ],
      },
    },
  ],
};
