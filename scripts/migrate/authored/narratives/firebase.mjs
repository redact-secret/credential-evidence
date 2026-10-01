// Authored family narratives for the Firebase dossier (benchmarks/support/dossiers/firebase.md).
// Rewritten by hand from the dossier body in scanner-neutral language (ADR 0010).

const BLOG = "https://firebase.googleblog.com/2017/01/debugging-firebase-cloud-messaging-on.html";
const RELEASES = "https://firebase.google.com/support/releases";
const SDK_TEST = "https://github.com/firebase/firebase-js-sdk/blob/5ab2fc6f889be5226f44d2e50c7eb20144f69338/integration/messaging/test/utils/sendMessage.js";
const NUCLEI = "https://github.com/projectdiscovery/nuclei-templates/blob/8cf94b93a389a47bef77b89f8c8915b2755018f0/http/exposures/tokens/firebase-fcm-server-key-disclosure.yaml";
const FAQ = "https://web.archive.org/web/20240602080626/https://firebase.google.com/support/faq";

export default {
  provider: "firebase",
  dropped: [
    { part: "Candidate: late-2016 generation (162 to 183-character bodies)", reason: "recorded as a bounded variant inside the server key family's shape statements, not a family" },
    { part: "Open question 1 (retire the family or keep it for historical leaks)", reason: "a product-scope decision, not credential knowledge" },
    { part: "Open question 2 (whether to require the APA91b body start)", reason: "a product-policy trade-off about false positives" },
    { part: "Statement that a detector's comments call the prefix and lengths documented", reason: "product-internal commentary" },
    { part: "Statement that all tool regexes copy one 2020 write-up", reason: "recorded without a cited source; carried only as an unresolved statement" },
  ],
  families: [
    {
      id: "firebase:server-key",
      status: "migrated",
      sections: {
        shape: [
          {
            id: "head-and-delimiter",
            cls: "tool-corroborated",
            text: "A key is a literal AAAA plus 7 more characters (an 11-character head that base64url-decodes to the 64-bit Firebase project number), a literal colon, then a body of characters from letters, digits, underscore and hyphen. The AAAA start holds only while project numbers stay below 2^40. A real key in the Firebase JavaScript SDK's own messaging integration test measures 11 characters, the colon, and 140.",
            cite: [SDK_TEST, NUCLEI],
          },
          {
            id: "body-length",
            cls: "tool-corroborated",
            text: "The body is 140 characters in about 88 percent of keys from 2017 onward (58 of 66 unique real keys measured). Late-2016 keys have bodies of 162, 167 or 183 characters. Google's own only length statement, in a 2017 post, is a 175-character total, which the 140-character body does not match.",
            cite: [BLOG, SDK_TEST],
          },
          {
            id: "body-start",
            cls: "tool-corroborated",
            text: "Every real key measured has APA91b right after the colon, the same start FCM registration tokens use; it is a regularity of observed keys and not a documented requirement.",
            cite: [SDK_TEST, NUCLEI],
          },
          {
            id: "no-provider-grammar",
            unresolved: "No Google page states the head, the body width or the alphabet; the scanner regexes available to compare trace to one 2020 write-up, so they are not independent corroboration.",
            text: "The shape is not stated by the issuer.",
            lead: [BLOG],
          },
        ],
        issuance: [
          {
            id: "transport",
            cls: "provider-documented",
            text: "Legacy HTTP and XMPP server keys were sent as Authorization: key=<key>. Google stopped creating the older AIza-style legacy server key in March 2020 and pointed users to the newer Server key, which is this family; keys of this shape were still issued afterwards.",
            cite: [BLOG, RELEASES],
          },
          {
            id: "legacy-api-closed",
            cls: "provider-documented",
            text: "The legacy FCM HTTP and XMPP API shut down between June and July 2024, so no new server key can be issued and a fresh key cannot be checked. Leaked historical keys are the remaining exposure.",
            cite: [FAQ],
            historical: true,
          },
        ],
        lifecycle: [
          {
            id: "shutdown",
            cls: "provider-documented",
            text: "The legacy FCM API that these keys authenticated was shut down in June 2024.",
            cite: [FAQ],
            historical: true,
          },
        ],
        collisions: [
          {
            id: "registration-token",
            cls: "provider-documented",
            text: "FCM registration tokens look similar to server keys and share the APA91b body start; the 2017 post describes a 153-character registration token as a string that looks a lot like a server key.",
            cite: [BLOG],
          },
          {
            id: "aiza-form",
            unresolved: "Recorded in a research note without a cited source in this family's contract; the AIza form is Google API key territory.",
            text: "The older AIza Google API key form is a different credential family.",
          },
        ],
        openQuestions: [
          {
            id: "provider-width-statement",
            unresolved: "No issuer source states the 140-character width or why the head starts with AAAA; the AAAA start follows from project numbers below 2^40.",
            text: "Does any provider statement establish the 140-character body width or the head layout?",
          },
        ],
      },
    },
  ],
};
