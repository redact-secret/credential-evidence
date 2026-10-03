// Tests for the parity harness (#6). The first groups need no legacy checkout. The
// last compares the projection with the pinned legacy revision (it runs the legacy
// fixture generators) and runs when a legacy checkout is reachable
// (LEGACY_BENCHMARKS_DIR or a sibling directory); set REQUIRE_LEGACY=1 to make a
// missing checkout a failure instead of a skip.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { generate } from "../scripts/export/legacy-projection.mjs";
import { repoRoot } from "../scripts/lib/validator.mjs";
import { compareDocs, flatten, satisfies } from "../scripts/parity/lib/diff.mjs";
import { openLegacy } from "../scripts/parity/lib/legacy.mjs";
import { checkOverlayRules, compilePattern, loadRules, runParity } from "../scripts/parity/lib/parity.mjs";
import { PREDICATES } from "../scripts/parity/lib/predicates.mjs";
import { renderParityReport, verdictOf } from "../scripts/parity/lib/report.mjs";

const rulesPath = join(repoRoot, "scripts", "parity", "rules.json");
const inventoryPath = join(repoRoot, "scripts", "parity", "inventory.json");

describe("semantic comparison", () => {
  test("ignores key order, whitespace and the order of keyed arrays and sets", () => {
    const a = { b: 1, a: [{ id: "x", v: [3, 1, 2] }, { id: "y", v: [] }], s: "t" };
    const b = JSON.parse('{ "s": "t", "a": [ {"id":"y","v":[]}, {"v":[2,3,1],"id":"x"} ], "b": 1 }');
    const r = compareDocs(a, b);
    assert.deepEqual(r.diffs, []);
    assert.ok(r.orderOnly >= 1);
  });

  test("a repeated scalar is one set member, but a duplicated object id is kept apart", () => {
    assert.deepEqual(compareDocs({ u: ["a", "a", "b"] }, { u: ["b", "a"] }).diffs, []);
    assert.equal(compareDocs({ o: [{ id: "x", v: 1 }, { id: "x", v: 2 }] }, { o: [{ id: "x", v: 1 }] }).diffs.length, 2);
  });

  test("reports added, removed and changed leaves with a normalized pattern", () => {
    const r = compareDocs({ f: [{ id: "a", n: 1, gone: true }] }, { f: [{ id: "a", n: 2, extra: "x" }] });
    const by = Object.fromEntries(r.diffs.map((d) => [d.change, d]));
    assert.equal(by.changed.pattern, "f[*].n");
    assert.equal(by.removed.path, "f[a].gone");
    assert.equal(by.added.projected, "x");
  });

  test("null, empty and absent are three different things; case and whitespace inside strings matter", () => {
    assert.equal(compareDocs({ a: 1, v: null }, { a: 1 }).diffs.length, 1);
    assert.equal(compareDocs({ a: 1, v: [] }, { a: 1 }).diffs.length, 1);
    assert.equal(compareDocs({ a: 1, v: [] }, { a: 1, v: null }).diffs.length, 1);
    assert.equal(compareDocs({ v: "A b" }, { v: "a b" }).diffs.length, 1);
    assert.equal(compareDocs({ v: "a  b" }, { v: "a b" }).diffs.length, 1);
    assert.ok(flatten({ v: [] }).leaves.has("v"));
  });

  test("value constraints", () => {
    assert.ok(satisfies("T2", { equals: "T2" }));
    assert.ok(!satisfies("T1", { equals: "T2" }));
    assert.ok(satisfies(null, { in: ["T1", null] }));
    assert.ok(satisfies("GENERATED x", { matches: "^GENERATED" }));
    assert.ok(!satisfies(3, { matches: "^3" }));
    assert.throws(() => satisfies(1, { nope: 1 }));
  });
});

describe("reason-collapsed-to-case (#76)", () => {
  const mask = "Placeholder, reference, template, mask, documentation or ordinary text. Expected silence is project policy.";
  const floor = "Control at the sk_org_ support-policy floor (redact-secret#1030): no body.";
  const twinA = "Negative twin of aws-a: prefix: x. Exactly one structural property differs from the positive.";
  const twinB = "Negative twin of aws-b: alphabet: y. Exactly one structural property differs from the positive.";
  // legacy: map of path -> reason; peers: paths sharing the evidence entry
  const ctxOf = (rationale, legacy, peers = []) => ({ caseOf: () => ({ expectation: { rationale } }), legacy: (p) => legacy[p], peerPaths: () => peers });
  const diff = (projected) => ({ path: "f[x].assessment.reason", projected });
  const p = PREDICATES["reason-collapsed-to-case"];

  test("a repeated wording still collapses: a twin rendering takes its entry's twin wording", () => {
    assert.ok(p(diff(twinA), ctxOf(twinA, { "f[x].assessment.reason": twinB, "f[y].assessment.reason": twinA }, ["f[y].assessment.reason"])));
  });

  test("a distinct reason that took another fixture's wording is not explained", () => {
    assert.equal(p(diff(floor), ctxOf(floor, { "f[x].assessment.reason": mask, "f[y].assessment.reason": floor }, ["f[y].assessment.reason"])), false);
  });

  test("a fixture's own wording is explained after whitespace normalization and a basis note", () => {
    const note = "Legacy tier T0: the evidence is unresolved and the fixtures were unscored, so no outcome is asserted. ";
    assert.ok(p(diff(`${note}${mask}`), ctxOf(`${note}${mask}`, { "f[x].assessment.reason": `  ${mask}\n` })));
  });

  test("a twin rendering does not excuse a non-twin entry wording", () => {
    assert.equal(p(diff(floor), ctxOf(floor, { "f[x].assessment.reason": twinA, "f[y].assessment.reason": floor }, ["f[y].assessment.reason"])), false);
  });
});

describe("explained-difference rules", () => {
  const rules = loadRules(rulesPath);
  const classes = new Set(["product-state-dropped", "presentation-substitute", "case-level-aggregation", "dropped-legacy-metadata", "lossy-import", "not-imported-scope", "derived-digest"]);

  test("every rule is justified, narrow and uses a known class and predicate", () => {
    assert.ok(rules.length >= 20);
    for (const r of rules) {
      assert.ok(classes.has(r.class), `${r.id}: class ${r.class}`);
      assert.ok(r.justification.length >= 120, `${r.id}: justification is too thin`);
      assert.ok(["added", "removed", "changed"].includes(r.change), `${r.id}: a rule names one change, not 'any'`);
      assert.ok(r.patterns.length > 0 && r.patterns.every((p) => p !== "**" && !p.startsWith("**")), `${r.id}: patterns`);
      if (r.predicate) assert.ok(PREDICATES[r.predicate], r.id);
    }
  });

  test("the rules do not allowlist the evidence themselves: content, ids, names and outcomes have no rule", () => {
    const covered = rules.flatMap((r) => r.patterns);
    for (const forbidden of ["fixtures[*].content", "fixtures[*].id", "fixtures[*].path", "families[*].id", "families[*].name", "families[*].description", "fixtures[*].slug"]) {
      assert.ok(!covered.some((p) => compilePattern(p).test(forbidden)), `a rule covers ${forbidden}`);
    }
  });

  test("a product-state rule names the overlay that carries the field, and the overlay interface must declare that field", () => {
    const dropped = rules.filter((r) => r.class === "product-state-dropped");
    assert.ok(dropped.length >= 4);
    for (const r of dropped) assert.ok(r.overlay, r.id);
    const overlays = { overlays: [
      { id: "corpus-fixture-extras", merge: "set the listed fields", shape: "{ detectors?, arrivalTargets?, expectedAction?, policyFamily?, policyConformance?, formatReason?, issue?, assessment.contract? }" },
      { id: "taxonomy-support-status", merge: "set families[].supportStatus", shape: "family id -> pending" },
      { id: "fixture-provenance", merge: "set fixtures[].provenance.issue, .milestone, .release", shape: "slug -> {}" },
    ] };
    checkOverlayRules(rules, overlays);
    // an overlay that does not declare a field cannot excuse its removal
    const stripped = { overlays: overlays.overlays.map((o) => (o.id === "corpus-fixture-extras" ? { ...o, shape: "{ detectors? }" } : o)) };
    assert.throws(() => checkOverlayRules(rules, stripped), /does not declare the field/);
    assert.throws(() => checkOverlayRules(rules, { overlays: [] }), /is not in overlay-interface/);
  });

  test("patterns: [*] is an array key, {} one object key, trailing .** anything deeper", () => {
    assert.ok(compilePattern("a[*].b").test("a[*].b"));
    assert.ok(!compilePattern("a[*].b").test("a[*].b.c"));
    assert.ok(compilePattern("p.{}.f").test("p.aws.f"));
    assert.ok(!compilePattern("p.{}.f").test("p.a.b.f"));
    assert.ok(compilePattern("m.**").test("m.x[*].y"));
    assert.ok(!compilePattern("m.**").test("m"));
  });

  test("inventory lists every file a projection disposition is claimed for", () => {
    const { files } = JSON.parse(readFileSync(inventoryPath, "utf8"));
    const dispositions = new Set(files.map((f) => f.disposition));
    for (const d of dispositions) assert.ok(["projected", "overlay", "replaced", "product-owned", "not-projected", "not-imported"].includes(d), d);
    for (const f of files) assert.ok(f.justification.length > 20 && f.needles.length, f.path);
    const overlays = files.filter((f) => f.disposition === "overlay").map((f) => f.overlay);
    assert.deepEqual(overlays.sort(), ["fixture-detectors", "known-gaps", "pin-manifest"]);
  });
});

// -------------------------------------------------------------- against legacy

let legacy = null;
let skipReason = null;
try {
  legacy = openLegacy();
} catch (e) {
  skipReason = `legacy checkout unavailable: ${e.message.split("\n")[0]}`;
  if (process.env.REQUIRE_LEGACY) throw e;
}
after(() => legacy?.cleanup());

describe("projection versus the pinned legacy revision", { skip: skipReason ?? false }, () => {
  let inputs;
  let projection;
  let result;
  before(() => {
    ({ inputs, projection } = generate());
    result = runParity({ legacyRoot: legacy.root, inputs, projection, rulesPath, inventoryPath });
  });

  test("zero unexplained differences, every rule used, every legacy consumer check passes", () => {
    assert.deepEqual(result.unexplained.slice(0, 5), []);
    assert.deepEqual(result.unusedRules, []);
    assert.deepEqual(result.consumer.indexProblems, []);
    assert.deepEqual(result.consumer.corpusFailures, []);
    assert.ok(result.conformance.every((c) => c.valid), JSON.stringify(result.conformance.filter((c) => !c.valid)));
    assert.ok(result.inventory.every((f) => f.exists));
    assert.ok(verdictOf(result));
    assert.equal(result.docRows.length, 6 + 67);
  });

  test("the committed parity report is the rendering of this run", () => {
    assert.equal(readFileSync(join(repoRoot, "docs", "migration", "parity-report.md"), "utf8"), renderParityReport(result));
  });

  test("a projection that changes the evidence is caught, not absorbed by a rule", () => {
    const artifacts = new Map(projection.artifacts);
    const edit = (path, fn) => {
      const doc = JSON.parse(artifacts.get(path));
      fn(doc);
      artifacts.set(path, `${JSON.stringify(doc, null, 2)}\n`);
    };
    edit("benchmarks/support/taxonomy.json", (d) => {
      d.families[0].name = `${d.families[0].name} (tampered)`;
    });
    edit("fixtures/accuracy/corpus.json", (d) => {
      d.fixtures[0].content += "x";
      const t1 = d.fixtures.find((f) => f.assessment.tier === "T1") ?? d.fixtures.find((f) => f.assessment.tier === "T3");
      t1.assessment.tier = t1.assessment.tier === "T1" ? "T2" : "T1";
    });
    edit("benchmarks/fixture-index.json", (d) => {
      d.fixtures[0].familyIds = ["aws:iam-user-access-key", "stripe:webhook-signing-secret"];
    });
    edit("benchmarks/support/dossier-frontmatter.json", (d) => {
      const fam = Object.values(d.providers)[0].families[0];
      fam.research.researchedAt = "1999-01-01";
    });
    edit("benchmarks/fixture-index.json", (d) => {
      d.identity.digest = "0".repeat(64);
    });
    edit("benchmarks/support/dossier-frontmatter.json", (d) => {
      const fam = Object.values(d.providers).flatMap((p) => p.families).find((f) => f.research.tier === "T1");
      fam.research.tier = "T0";
    });
    const tampered = runParity({ legacyRoot: legacy.root, inputs, projection: { ...projection, artifacts }, rulesPath, inventoryPath });
    const patterns = new Set(tampered.unexplained.map((d) => `${d.artifact}:${d.pattern}`));
    const reported = (artifact, suffix) => [...patterns].some((p) => p.startsWith(`${artifact}:`) && p.endsWith(suffix));
    assert.ok(reported("taxonomy", "families[*].name"), "a changed family name");
    assert.ok(reported("corpus", "fixtures[*].content"), "changed fixture text");
    assert.ok(reported("corpus", "fixtures[*].assessment.tier"), "a tier change that is not a recorded downgrade");
    assert.ok(reported("index", "fixtures[*].familyIds[*]"), "a family link no peer in the case has");
    assert.ok(reported("dossiers", "research.researchedAt"), "a changed research date");
    assert.ok(reported("index", "identity.digest"), "a digest that is not the digest of the projected content");
    assert.ok(reported("dossiers", "research.tier"), "a dossier tier that the canonical claim does not record as unresolved");
    assert.ok(tampered.unexplained.length >= 6);
    assert.ok(!verdictOf(tampered));
  });

  test("the twin, downgrade and span rules fire only for their recorded cause", () => {
    const counts = Object.fromEntries(result.rules.map((s) => [s.rule.id, s.count]));
    assert.ok(counts["assessment-tier-downgraded-on-import"] > 0);
    // every downgrade is backed by a recorded note on the case (the predicate), and the two kind rules agree with the tier rule in entities
    const tier = result.rules.find((s) => s.rule.id === "assessment-tier-downgraded-on-import");
    const kind = result.rules.find((s) => s.rule.id === "assessment-kind-follows-downgraded-tier");
    assert.ok(tier.entities.size >= kind.entities.size);
    // ADR 0012: candidate spans and per-fixture families are carried, so the rules that excused their loss are gone
    for (const gone of ["twin-fields-omitted-for-unresolved-positive", "assessment-unresolved-kind-not-recoverable", "index-families-case-union", "semantics-families-case-union"]) assert.equal(counts[gone], undefined, gone);
  });
});
