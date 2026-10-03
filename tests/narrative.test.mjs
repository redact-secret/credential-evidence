import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { codesForNarrativeText, narrativeViolations } from "../scripts/lib/narrative-lint.mjs";
import { repoRoot, validateTree } from "../scripts/lib/validator.mjs";
import { errorsOf, example, integrityAfter } from "./helpers.mjs";

const clone = (r) => JSON.parse(JSON.stringify(r));
const NARRATIVE = "family-narrative";
const ID = "examplecloud:api-key";
const HISTORY = "review-narrative-examplecloud-api-key";

// --- schema -------------------------------------------------------------------------------------

test("the example narrative is schema-valid and its integrity holds", () => {
  assert.deepEqual(errorsOf(example(NARRATIVE, ID)), []);
  assert.deepEqual(integrityAfter(() => {}), []);
});

test("a statement is cited or unresolved, never both and never neither", () => {
  const n = clone(example(NARRATIVE, ID));
  const [cited] = n.sections.shape;
  const bare = { ...cited };
  delete bare.citations;
  n.sections.shape = [bare];
  assert.ok(errorsOf(n).length, "no citation and not unresolved");

  const both = clone(example(NARRATIVE, ID));
  both.sections.shape[0].unresolved = { reviewEvent: 2, reason: "x" };
  assert.ok(errorsOf(both).length, "citations and unresolved together");

  const unresolvedWithCitation = clone(example(NARRATIVE, ID));
  unresolvedWithCitation.sections.openQuestions[0].citations = [{ kind: "claim", claimId: "prefixed-live-key" }];
  assert.ok(errorsOf(unresolvedWithCitation).length, "an unresolved statement carries leads, not citations");

  const classMismatch = clone(example(NARRATIVE, ID));
  classMismatch.sections.openQuestions[0].evidenceClass = "provider-documented";
  assert.ok(errorsOf(classMismatch).length, "an unresolved statement has class unresolved");

  const leadOnCited = clone(example(NARRATIVE, ID));
  leadOnCited.sections.shape[0].leads = [{ kind: "source", sourceId: "examplecloud-token-format-doc" }];
  assert.ok(errorsOf(leadOnCited).length, "leads belong to unresolved statements");
});

test("sections are fixed and statement text is one line", () => {
  const extra = clone(example(NARRATIVE, ID));
  extra.sections.history = clone(extra.sections.shape);
  assert.ok(errorsOf(extra).some((e) => e.includes("history")));

  const multiline = clone(example(NARRATIVE, ID));
  multiline.sections.shape[0].text = "line one\nline two";
  assert.ok(errorsOf(multiline).length);

  const empty = clone(example(NARRATIVE, ID));
  empty.sections = {};
  assert.ok(errorsOf(empty).length, "at least one section");
});

test("the narrative schema adds no support status, detector or tier field", () => {
  const text = readFileSync(join(repoRoot, "schemas", "v1", "family-narrative.schema.json"), "utf8");
  for (const word of ["supportStatus", "detector", "tier", "stable", "provisional", "pending"]) assert.ok(!text.includes(`"${word}`), word);
});

// --- integrity ----------------------------------------------------------------------------------

test("a narrative's id must equal its family and the family must exist", () => {
  const e = integrityAfter((_, get) => {
    get(NARRATIVE, ID).family = "examplecloud:webhook-secret";
  });
  assert.ok(e.some((m) => m.includes("must equal family")), e.join("\n"));
  const unknown = integrityAfter((_, get) => {
    get(NARRATIVE, ID).family = "examplecloud:nope";
    get(NARRATIVE, ID).id = "examplecloud:nope";
  });
  assert.ok(unknown.some((m) => m.includes("unknown family")), unknown.join("\n"));
});

test("claim and source citations must resolve", () => {
  const claim = integrityAfter((_, get) => {
    get(NARRATIVE, ID).sections.shape[0].citations[0].claimId = "no-such-claim";
  });
  assert.ok(claim.some((m) => m.includes("unknown claim 'no-such-claim'")), claim.join("\n"));

  const noContract = integrityAfter((_, get) => {
    delete get(NARRATIVE, ID).contract;
  });
  assert.ok(noContract.some((m) => m.includes("names no contract")), noContract.join("\n"));

  const source = integrityAfter((_, get) => {
    get(NARRATIVE, ID).sections.shape[0].citations[1].sourceId = "no-such-source";
  });
  assert.ok(source.some((m) => m.includes("unknown evidence-source 'no-such-source'")), source.join("\n"));
});

test("an unresolved claim cannot support a statement; it can be a lead", () => {
  const e = integrityAfter((entries, get) => {
    get("format-contract", "examplecloud:api-key@2").claims[1].evidenceClass = "unresolved";
    get("format-contract", "examplecloud:api-key@2").claims[1].sources = [];
  });
  assert.ok(e.some((m) => m.includes("which is itself unresolved")), e.join("\n"));

  const asLead = integrityAfter((_, get) => {
    get("format-contract", "examplecloud:api-key@2").claims[1].evidenceClass = "unresolved";
    get("format-contract", "examplecloud:api-key@2").claims[1].sources = [];
    const n = get(NARRATIVE, ID);
    n.sections.shape = n.sections.shape.slice(0, 1);
    n.sections.openQuestions[0].leads = [{ kind: "claim", claimId: "sdk-parser-accepts-only-32" }];
  });
  assert.deepEqual(asLead, []);
});

test("provider-documented needs a provider-authored citation", () => {
  const e = integrityAfter((_, get) => {
    // the only provider-documented claim and the provider documentation page are replaced by a scanner-style source
    const n = get(NARRATIVE, ID);
    n.sections.shape = [
      {
        id: "scanner-only",
        text: "A live API key is exc_live_ followed by 32 base62 characters.",
        evidenceClass: "provider-documented",
        temporality: "current",
        observedAt: "2026-09-30",
        citations: [{ kind: "claim", claimId: "sdk-parser-accepts-only-32" }],
      },
    ];
    get("format-contract", "examplecloud:api-key@2").claims[1].evidenceClass = "tool-corroborated";
    get("evidence-source", "examplecloud-sdk-key-parser").sourceType = "scanner-rule-source";
  });
  assert.ok(e.some((m) => m.includes("needs a provider-authored citation")), e.join("\n"));
});

test("a historical statement cannot cite a live-unpinned source", () => {
  const e = integrityAfter((_, get) => {
    get("evidence-source", "examplecloud-legacy-key-announcement").locator.pin = { kind: "live-unpinned" };
  });
  assert.ok(e.some((m) => m.includes("live-unpinned")), e.join("\n"));
});

test("statement ids are unique across sections", () => {
  const e = integrityAfter((_, get) => {
    get(NARRATIVE, ID).sections.lifecycle[0].id = "live-key-layout";
  });
  assert.ok(e.some((m) => m.includes("duplicate statement id")), e.join("\n"));
});

test("an unresolved statement points at an event of the narrative's review history", () => {
  const missing = integrityAfter((_, get) => {
    get(NARRATIVE, ID).sections.openQuestions[0].unresolved.reviewEvent = 9;
  });
  assert.ok(missing.some((m) => m.includes("is not an event of review history")), missing.join("\n"));

  const noHistory = integrityAfter((entries) => {
    const i = entries.findIndex((x) => x.record.id === HISTORY);
    entries.splice(i, 1);
  });
  assert.ok(noHistory.some((m) => m.includes("no evidence-review-history has subject family-narrative")), noHistory.join("\n"));
});

test("a reviewed narrative needs a review by someone who did not author it", () => {
  const selfReviewed = integrityAfter((_, get) => {
    get("evidence-review-history", HISTORY).events[2].actor.id = "example-author";
  });
  assert.ok(selfReviewed.some((m) => m.includes("did not author")), selfReviewed.join("\n"));

  const unreviewed = integrityAfter((_, get) => {
    get("evidence-review-history", HISTORY).events.pop();
  });
  assert.ok(unreviewed.some((m) => m.includes("did not author")), unreviewed.join("\n"));

  const draft = integrityAfter((_, get) => {
    get(NARRATIVE, ID).lifecycle = "draft";
    get("evidence-review-history", HISTORY).events.pop();
  });
  assert.deepEqual(draft, []);
});

// --- lint ---------------------------------------------------------------------------------------

test("the narrative lint rejects benchmark, product and workflow vocabulary", () => {
  const bad = {
    "suite-name": "Listed in the credential-formats suite.",
    "beta-or-milestone-coordinate": "Added in beta.8.",
    "issue-workflow": "Tracked in redact-secret/redact-secret-benchmarks#473.",
    "detector-vocabulary": "The detector reads the prefix.",
    "support-status": "The family is provisional.",
    "evidence-tier": "Graded T1 on the prefix.",
    "product-or-benchmark-vocabulary": "Core adopted the shape.",
  };
  for (const [code, text] of Object.entries(bad)) assert.ok(codesForNarrativeText(text).includes(code), `${code}: ${text}`);
});

test("the narrative lint allows the words ordinary credential prose needs", () => {
  const fine = [
    "OpenAI issues API keys from the platform dashboard.",
    "A scanner rule matches a 40-character base64 run.",
    "Accuracy of the length is not established.",
    "The key is shown once and the account owner can revoke it.",
    "AWS says prefixes may vary based on when the identifier was created.",
  ];
  for (const text of fine) assert.deepEqual(codesForNarrativeText(text), [], text);
});

test("the lint reads statement text and unresolved reasons and reports where", () => {
  const n = clone(example(NARRATIVE, ID));
  n.sections.shape[0].text = "Support status: stable.";
  n.sections.openQuestions[0].unresolved.reason = "See #12.";
  const v = narrativeViolations(n);
  assert.ok(v.some((x) => x.where === "sections.shape[live-key-layout].text" && x.code === "support-status"));
  assert.ok(v.some((x) => x.where === "sections.openQuestions[rotation-interval].unresolved.reason" && x.code === "issue-workflow"));
  assert.deepEqual(narrativeViolations({ kind: "family", id: "x:y" }), []);
});

test("every migrated narrative passes the lint with no baseline", () => {
  const { errors } = validateTree([join(repoRoot, "records"), join(repoRoot, "migration")], {});
  assert.deepEqual(errors.filter((e) => e.includes("narrative lint")), []);
});
