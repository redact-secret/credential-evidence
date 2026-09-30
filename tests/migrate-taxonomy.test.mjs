// Tests for the taxonomy import (#3).
//
// Two groups. The first reads only committed records and always runs. The
// second compares the records with the pinned legacy revision and runs when a
// legacy checkout is reachable (LEGACY_BENCHMARKS_DIR or a sibling directory);
// set REQUIRE_LEGACY=1 to make a missing checkout a failure instead of a skip.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { repoRoot, validateTree } from "../scripts/lib/validator.mjs";
import { findLegacyDir, LEGACY_REVISION, materializeLegacy, readLegacyJson, LEGACY_PATHS } from "../scripts/migrate/lib/legacy-source.mjs";
import { buildTaxonomyImport, OWNED_SYSTEM } from "../scripts/migrate/lib/taxonomy-import.mjs";
import { ownerOf, isProjectOwned } from "../scripts/migrate/lib/sources.mjs";

const recordsDir = join(repoRoot, "records");
const { errors, records } = validateTree([recordsDir]);
// Cases and fixture sets (#4) live beside the taxonomy records; they are covered by migrate-cases.test.mjs.
const all = records.map((r) => r.record).filter((r) => !["case", "fixture-set", "fixture-projection"].includes(r.kind));
const byKind = (kind) => all.filter((r) => r.kind === kind);
const owned = (r) => (r.externalRefs ?? []).some((x) => x.system === OWNED_SYSTEM);
const importedRecords = all.filter(owned);
const byId = (kind) => new Map(byKind(kind).map((r) => [r.id, r]));

const EXPECTED_PROVIDERS = 93; // 92 taxonomy providers + derived `generic`
const EXPECTED_FAMILIES = 173;

/** The exact legacy URL a sourceRef stands for, rebuilt from canonical records only. */
function reconstructUrl(source, ref) {
  const legacy = (source.externalRefs ?? []).find((x) => x.system === "legacy-url");
  return (legacy ? legacy.id : source.locator.url) + (ref.locator?.startsWith("#") ? ref.locator : "");
}

function citedUrls() {
  const sources = byId("evidence-source");
  const urls = new Set();
  const visit = (refs) => {
    for (const ref of refs ?? []) urls.add(reconstructUrl(sources.get(ref.sourceId), ref));
  };
  for (const c of byKind("format-contract")) for (const claim of c.claims) visit(claim.sources);
  return urls;
}

describe("imported records (no legacy checkout needed)", () => {
  test("every record under records/ validates and cross-references resolve", () => {
    assert.deepEqual(errors, []);
    assert.ok(records.length > 0);
  });

  test("record counts match the taxonomy", () => {
    assert.equal(byKind("provider").length, EXPECTED_PROVIDERS);
    assert.equal(byKind("family").length, EXPECTED_FAMILIES);
    assert.equal(byKind("format-contract").length, EXPECTED_FAMILIES);
    assert.equal(byKind("evidence-review-history").length, EXPECTED_FAMILIES);
    assert.ok(byKind("evidence-source").length > 0);
  });

  test("every provider and family resolves by canonical id", () => {
    const providers = byId("provider");
    const families = byId("family");
    const contracts = byId("format-contract");
    for (const p of providers.values()) assert.match(p.id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    for (const f of families.values()) {
      assert.match(f.id, /^[a-z0-9]+(-[a-z0-9]+)*:[a-z0-9]+(-[a-z0-9]+)*$/);
      assert.ok(providers.has(f.provider), `${f.id}: provider ${f.provider}`);
      assert.ok(f.id.startsWith(`${f.provider}:`));
      assert.ok(contracts.has(`${f.id}@1`), `${f.id}: contract @1`);
    }
    assert.ok(providers.has("generic"), "reserved generic provider");
    assert.ok(families.has("aws:iam-user-access-key"));
    assert.ok(families.has("stripe:secret-key-live"));
    assert.ok(families.has("generic:private-key"));
    // every provider has at least one family
    const withFamily = new Set([...families.values()].map((f) => f.provider));
    for (const id of providers.keys()) assert.ok(withFamily.has(id), `provider ${id} has no family`);
    // every family is reviewed exactly once
    const reviewed = new Map();
    for (const r of byKind("evidence-review-history")) {
      assert.equal(r.subject.kind, "family");
      reviewed.set(r.subject.id, (reviewed.get(r.subject.id) ?? 0) + 1);
    }
    for (const id of families.keys()) assert.equal(reviewed.get(id), 1, `${id}: review history`);
  });

  test("currentContract is set exactly for current contracts", () => {
    const contracts = byId("format-contract");
    for (const f of byKind("family")) {
      const c = contracts.get(`${f.id}@1`);
      assert.ok(c.claims.length > 0);
      if (c.period === "current") assert.equal(f.currentContract, c.id);
      else assert.equal(f.currentContract, null, `${f.id}: ${c.period} contract must not be current`);
    }
  });

  test("migrated source facts round-trip: URLs, pins and observed dates are recoverable", () => {
    const sources = byId("evidence-source");
    for (const s of sources.values()) {
      assert.ok(s.observations.length > 0, `${s.id}: observation`);
      const dates = s.observations.map((o) => o.observedAt);
      assert.deepEqual(dates, [...dates].sort(), `${s.id}: observations ordered`);
      for (const o of s.observations) assert.equal(o.observer, "legacy-import");
      const moving = (s.externalRefs ?? []).find((x) => x.system === "legacy-url");
      if (moving) {
        // a moving ref cannot be a GitHub file locator: the repository is, the exact URL is preserved
        assert.equal(s.locator.pin.kind, "live-unpinned");
        assert.match(moving.id, /^https:\/\/(github\.com\/[^/]+\/[^/]+\/(blob|tree|raw)\/|raw\.githubusercontent\.com\/)/);
      }
      if (s.locator.pin.kind === "commit-permalink") assert.match(s.locator.url, new RegExp(s.locator.pin.commit));
    }
    const urls = citedUrls();
    assert.ok(urls.size > 800, `only ${urls.size} cited URLs`);
    for (const u of urls) assert.match(u, /^https:\/\/[^\s]+$/);
  });

  test("the AWS worked example round-trips through the import", () => {
    const c = byId("format-contract").get("aws:iam-user-access-key@1");
    const provider = c.claims.find((x) => x.id === "provider-source");
    assert.equal(provider.evidenceClass, "provider-documented");
    assert.equal(provider.observedAt, "2026-09-17");
    const source = byId("evidence-source").get(provider.sources[0].sourceId);
    assert.equal(source.locator.url, "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html");
    assert.equal(provider.sources[0].locator, "#identifiers-prefixes");
    assert.equal(c.structure.descriptivePattern, "^AKIA[A-Z2-7]{16}$");
    const family = byId("family").get("aws:iam-user-access-key");
    assert.equal(family.research.state, "researched");
    assert.equal(family.research.researchedAt, "2026-09-20");
    assert.ok(family.research.issues.includes("redact-secret/redact-secret-benchmarks#36"));
  });

  test("every imported record carries migration provenance for the pinned legacy revision", () => {
    assert.ok(importedRecords.length > 1000);
    const legacyPath = /^benchmarks\/(support\/taxonomy\.json|support\/dossiers\/[a-z0-9-]+\.md|evaluation\/domains\/credential\/assessment\.ts|lib\/beta8\/[a-z0-9-]+\.ts)$/;
    for (const r of all) {
      assert.ok(owned(r), `${r.kind} ${r.id}: no ${OWNED_SYSTEM} reference`);
      for (const ref of r.externalRefs.filter((x) => x.system === OWNED_SYSTEM)) {
        const [sha, path] = [ref.id.slice(0, 40), ref.id.slice(41)];
        assert.equal(sha, LEGACY_REVISION);
        assert.equal(ref.id[40], ":");
        assert.match(path, legacyPath);
        assert.equal(ref.url, `https://github.com/redact-secret/redact-secret-benchmarks/blob/${sha}/${path}`);
      }
    }
  });

  test("the import creates neither cases nor fixtures", () => {
    const allowed = new Set(["provider", "family", "format-contract", "evidence-source", "evidence-review-history"]);
    for (const r of importedRecords) assert.ok(allowed.has(r.kind), `${r.kind} ${r.id}`);
  });

  test("imported records are drafts: import is not review", () => {
    for (const r of importedRecords) if ("lifecycle" in r) assert.equal(r.lifecycle, "draft", `${r.kind} ${r.id}`);
    for (const r of byKind("evidence-review-history")) {
      for (const e of r.events) {
        assert.equal(e.actor.id, "legacy-import");
        assert.equal(e.actor.role, "automation");
        assert.equal(e.actor.affiliation, "project-maintainer");
      }
    }
  });

  test("no benchmark workflow state or product status enters structured fields", () => {
    const banned = /\b(stable|provisional|pending|supportStatus|support-status)\b/i;
    const bannedKeys = /^(status|supportStatus|stage|score|tier|detectors?|fixtures?|candidate|promotion)$/i;
    const freeText = (path) => /(^|\/)(events\/\d+\/note|claims\/\d+\/statement|sources\/\d+\/supports|notes)$/.test(path);
    const walk = (value, path, rec) => {
      if (typeof value === "string") {
        if (!freeText(path) && !path.startsWith("/externalRefs")) assert.doesNotMatch(value, banned, `${rec.kind} ${rec.id} ${path}`);
      } else if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}/${i}`, rec));
      else if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) {
          assert.doesNotMatch(k, bannedKeys, `${rec.kind} ${rec.id}: key ${k}`);
          walk(v, `${path}/${k}`, rec);
        }
      }
    };
    for (const r of all) walk(r, "", r);
    // detector ids exist only as optional external references
    for (const f of byKind("family")) {
      for (const ref of f.externalRefs.filter((x) => x.system === "redact-secret-detector")) assert.ok(ref.id.length > 0);
    }
  });

  test("evidence classes follow the tier mapping and the governance requirements", () => {
    const contracts = byId("format-contract");
    const sources = byId("evidence-source");
    for (const c of contracts.values()) {
      for (const claim of c.claims) {
        if (claim.evidenceClass === "provider-documented" || claim.evidenceClass === "tool-corroborated") {
          assert.ok(claim.sources.length > 0, `${c.id}/${claim.id}`);
        }
        if (claim.evidenceClass === "tool-corroborated") {
          const owners = new Set(
            claim.sources
              .map((ref) => reconstructUrl(sources.get(ref.sourceId), { locator: undefined }))
              .filter((u) => !isProjectOwned(u.replace(/#.*/, "")))
              .map((u) => ownerOf(u)),
          );
          assert.ok(owners.size >= 2, `${c.id}/${claim.id}: tool-corroborated needs two distinct owners`);
        }
      }
    }
    // T0 and untiered dossier verdicts never produce a provider-documented or tool-corroborated dossier claim
    for (const f of byKind("family")) {
      const review = byKind("evidence-review-history").find((r) => r.subject.id === f.id);
      const m = /tier (T[0-3]|none) \(([a-z-]+)\)/.exec(review.events[0].note);
      assert.ok(m, `${f.id}: review note carries the tier`);
      const dossier = contracts.get(`${f.id}@1`).claims.find((c) => c.id === "dossier-research");
      if (m[1] === "T0" || m[1] === "none") assert.equal(dossier.evidenceClass, "unresolved", f.id);
      if (m[1] === "T3") assert.equal(dossier.evidenceClass, "project-policy", f.id);
      if (m[1] === "T1") assert.ok(["provider-documented", "unresolved"].includes(dossier.evidenceClass), f.id);
    }
  });

  test("gated, not-found and rejected verdicts stay proposed and carry blockers or no current contract", () => {
    const contracts = byId("format-contract");
    for (const f of byKind("family")) {
      if (f.research.state !== "researched") assert.equal(contracts.get(`${f.id}@1`).period, "proposed");
      if (f.research.blockers) for (const b of f.research.blockers) assert.ok(b.summary.length <= 240);
    }
  });
});

// -------------------------------------------------------------- against legacy

let legacy = null;
let skipReason = null;
try {
  legacy = materializeLegacy(findLegacyDir());
} catch (e) {
  skipReason = `legacy checkout unavailable: ${e.message.split("\n")[0]}`;
  if (process.env.REQUIRE_LEGACY) throw e;
}
after(() => legacy?.cleanup());

describe("imported records against the pinned legacy revision", { skip: skipReason ?? false }, () => {
  let built;
  before(() => {
    built = buildTaxonomyImport({ root: legacy.root });
  });

  test("every legacy provider and family resolves by its canonical id", () => {
    const taxonomy = readLegacyJson(legacy.root, LEGACY_PATHS.taxonomy);
    const providers = byId("provider");
    const families = byId("family");
    for (const p of taxonomy.providers) {
      assert.ok(providers.has(p.id), `provider ${p.id}`);
      assert.equal(providers.get(p.id).name, p.name);
    }
    for (const f of taxonomy.families) {
      const fam = families.get(f.id);
      assert.ok(fam, `family ${f.id}`);
      assert.equal(fam.name, f.name);
      assert.equal(fam.description, f.description);
      assert.deepEqual(
        fam.externalRefs.filter((r) => r.system === "redact-secret-detector").map((r) => r.id),
        [...f.detectors].sort(),
      );
    }
    assert.equal(providers.size, taxonomy.providers.length + 1);
    assert.equal(families.size, taxonomy.families.length);
  });

  test("every legacy source URL, with its fragment, is recovered exactly from canonical records", () => {
    const recovered = new Set();
    const sources = byId("evidence-source");
    for (const s of sources.values()) {
      const legacyRef = (s.externalRefs ?? []).find((x) => x.system === "legacy-url");
      recovered.add(legacyRef ? legacyRef.id : s.locator.url);
    }
    for (const u of citedUrls()) recovered.add(u);
    const missing = built.report.legacyUrls.filter((u) => !recovered.has(u));
    assert.deepEqual(missing, []);
    // and every canonical source was cited by some legacy field
    const legacyBases = new Set(built.report.legacyUrls.map((u) => u.replace(/#.*/, "")));
    for (const s of sources.values()) {
      const base = (s.externalRefs ?? []).find((x) => x.system === "legacy-url")?.id ?? s.locator.url;
      assert.ok(legacyBases.has(base), `${s.id}: not a legacy URL ${base}`);
    }
  });

  test("dossier verdicts, dates and issues round-trip onto families", () => {
    const families = byId("family");
    for (const f of built.report.familyMeta) assert.ok(families.has(f.id));
    const reviews = new Map(byKind("evidence-review-history").map((r) => [r.subject.id, r]));
    for (const fam of families.values()) {
      const note = reviews.get(fam.id).events[0].note;
      assert.match(note, new RegExp(`researchedAt ${fam.research.researchedAt}`));
      const verdict = /research verdict '([a-z-]+)'/.exec(note)[1];
      const expectState = { ready: "researched", "issuance-gated": "researched", "date-gated": "researched", "not-found": "not-found", rejected: "rejected" }[verdict];
      assert.equal(fam.research.state, expectState, fam.id);
    }
  });

  test("the generated tree and report are byte-identical to a fresh import (idempotent)", () => {
    const again = buildTaxonomyImport({ root: legacy.root });
    assert.deepEqual([...again.files.keys()], [...built.files.keys()]);
    for (const [path, text] of built.files) assert.equal(again.files.get(path), text, path);
    const out = spawnSync(process.execPath, [join(repoRoot, "scripts/migrate/import-taxonomy.mjs"), "--check", "--legacy", findLegacyDir()], { encoding: "utf8" });
    assert.equal(out.status, 0, out.stdout + out.stderr);
  });
});
