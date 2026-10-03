import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { BANDS, buildBacklog, GAP_KINDS, latestRecordedDate, minusMonths, monthsBetween, priorityOf, renderMarkdown, selectNext, serialize, SKILLS, validateWishlist, WISHLIST_SCORES } from "../scripts/lib/coverage.mjs";
import { listJson, repoRoot } from "../scripts/lib/validator.mjs";

const script = join(repoRoot, "scripts", "coverage-gaps.mjs");

// ---- synthetic records (the lib is pure over parsed records) ----

const provider = (id) => ({ kind: "provider", id, name: id });
const family = (id, extra = {}) => ({ kind: "family", id, provider: id.split(":")[0], name: id, research: { state: "researched", researchedAt: "2026-06-01" }, currentContract: `${id}@1`, ...extra });
const source = (id, extra = {}) => ({ kind: "evidence-source", id, sourceType: "provider-documentation", title: id, locator: { url: `https://docs.example.org/${id}`, pin: { kind: "live-unpinned" } }, observations: [{ observedAt: "2026-06-01", outcome: "read", observer: "alice" }], ...extra });
const claim = (id, cls, sources, extra = {}) => ({ id, statement: id, evidenceClass: cls, temporality: "current", observedAt: "2026-06-01", sources: sources.map((s) => ({ sourceId: s, supports: "x" })), ...extra });
const contract = (fam, claims, extra = {}) => ({ kind: "format-contract", id: `${fam}@1`, family: fam, revision: 1, period: "current", claims, ...extra });
const narrative = (fam, classes) => ({ kind: "family-narrative", id: fam, family: fam, sections: { shape: classes.map((c, i) => ({ id: `s${i}`, evidenceClass: c, observedAt: "2026-06-01" })) } });
const kase = (id, fams, extra = {}) => ({ kind: "case", id, caseTypes: ["positive"], families: fams.map((f) => ({ family: f, role: "subject" })), expectation: { observedAt: "2026-06-01" }, ...extra });

/** A fully covered family: contract, provider source, narrative, benign case, a case. */
function healthy(fam = "acme:api-key") {
  const p = fam.split(":")[0];
  return [provider(p), family(fam), source(`${p}-docs`), contract(fam, [claim("c1", "provider-documented", [`${p}-docs`])]), narrative(fam, ["provider-documented", "provider-documented"]), kase(`${p}-case`, [fam]), kase(`${p}-benign`, [fam], { caseTypes: ["benign"] })];
}
const AS_OF = "2026-07-01";
const gaps = (records, opts = {}) => buildBacklog(records, { asOf: AS_OF, ...opts }).items;
const kindsOf = (items) => items.map((i) => i.gapKind).sort();
const without = (records, pred) => records.filter((r) => !pred(r));

test("a fully covered family has no gaps", () => {
  assert.deepEqual(gaps(healthy()), []);
});

test("date helpers", () => {
  assert.equal(minusMonths("2026-09-29", 12), "2025-09-29");
  assert.equal(minusMonths("2026-03-31", 1), "2026-02-28");
  assert.equal(minusMonths("2026-01-15", 2), "2025-11-15");
  assert.equal(monthsBetween("2025-06-15", "2026-07-14"), 12);
  assert.equal(monthsBetween("2025-06-15", "2026-07-15"), 13);
  assert.equal(latestRecordedDate([source("a"), contract("x:y", [claim("c", "unresolved", [], { observedAt: "2026-08-02" })])]), "2026-08-02");
  assert.equal(latestRecordedDate([]), null);
});

test("priority bands", () => {
  assert.deepEqual(BANDS.map(([b]) => b), ["P0", "P1", "P2", "P3"]);
  assert.equal(priorityOf(95), "P0");
  assert.equal(priorityOf(90), "P0");
  assert.equal(priorityOf(89), "P1");
  assert.equal(priorityOf(70), "P1");
  assert.equal(priorityOf(69), "P2");
  assert.equal(priorityOf(45), "P2");
  assert.equal(priorityOf(44), "P3");
});

test("every gap kind names a known skill and a reason", () => {
  for (const [k, spec] of Object.entries(GAP_KINDS)) {
    assert.ok(SKILLS.includes(spec.skill), `${k} -> ${spec.skill}`);
    assert.ok(spec.why.length > 10);
    assert.ok(Number.isInteger(spec.score));
  }
});

test("unresearched family: one item, nothing else asked of it", () => {
  const r = [provider("acme"), family("acme:api-key", { currentContract: null, research: { state: "unresearched", researchedAt: null } })];
  const items = gaps(r);
  assert.deepEqual(kindsOf(items), ["family-unresearched"]);
  assert.equal(items[0].priority, "P0");
  assert.equal(items[0].suggestedSkill, "research-family");
});

test("researched family without a current contract is contract-missing; a recorded negative result is not a gap", () => {
  const base = [provider("acme"), family("acme:api-key", { currentContract: null }), narrative("acme:api-key", ["provider-documented"]), kase("k", ["acme:api-key"]), kase("b", ["acme:api-key"], { caseTypes: ["benign"] })];
  assert.deepEqual(kindsOf(gaps(base)), ["contract-missing"]);
  assert.deepEqual(kindsOf(gaps(base.map((r) => (r.kind === "family" ? { ...r, research: { state: "not-found", researchedAt: "2026-06-01" } } : r)))), []);
  assert.deepEqual(kindsOf(gaps(base.map((r) => (r.kind === "family" ? { ...r, research: { state: "rejected", researchedAt: "2026-06-01" } } : r)))), []);
});

test("a proposed-only contract still counts as missing a current one", () => {
  const r = healthy().map((x) => (x.kind === "format-contract" ? { ...x, period: "proposed" } : x)).map((x) => (x.kind === "family" ? { ...x, currentContract: null } : x));
  const items = gaps(r);
  assert.deepEqual(kindsOf(items), ["contract-missing"]);
  assert.deepEqual(items[0].facts.contracts, ["acme:api-key@1 (proposed)"]);
});

test("evidence that is unresolved only outranks a missing provider source, which needs a claim above unresolved", () => {
  const unresolved = healthy().map((x) => (x.kind === "format-contract" ? { ...x, claims: [claim("c1", "unresolved", [])] } : x));
  assert.deepEqual(kindsOf(gaps(unresolved)), ["evidence-unresolved-only"]);
  const noProvider = healthy().map((x) => (x.kind === "format-contract" ? { ...x, claims: [claim("c1", "tool-corroborated", ["scanner-rule"])] } : x)).concat(source("scanner-rule", { sourceType: "scanner-rule-source" }));
  assert.deepEqual(kindsOf(gaps(noProvider)), ["no-provider-source"]);
  assert.ok(GAP_KINDS["evidence-unresolved-only"].score > GAP_KINDS["no-provider-source"].score);
});

test("staleness: current claims and live-unpinned sources older than 12 months, not pinned or historical ones", () => {
  const old = healthy().map((x) => (x.kind === "format-contract" ? { ...x, claims: [claim("c1", "provider-documented", ["acme-docs"], { observedAt: "2025-05-01" })] } : x));
  const items = gaps(old);
  assert.deepEqual(kindsOf(items), ["evidence-stale"]);
  assert.equal(items[0].facts.staleClaims[0].id, "c1");
  assert.equal(items[0].suggestedSkill, "source-freshness");
  // exactly 12 months is not yet stale
  const edge = healthy().map((x) => (x.kind === "format-contract" ? { ...x, claims: [claim("c1", "provider-documented", ["acme-docs"], { observedAt: "2025-07-01" })] } : x));
  assert.deepEqual(gaps(edge), []);
  const historical = old.map((x) => (x.kind === "format-contract" ? { ...x, claims: [claim("c1", "provider-documented", ["acme-docs"], { observedAt: "2025-05-01", temporality: "historical" })] } : x));
  assert.deepEqual(gaps(historical), []);
  const oldSource = healthy().map((x) => (x.id === "acme-docs" ? source("acme-docs", { observations: [{ observedAt: "2025-01-01", outcome: "read", observer: "alice" }] }) : x));
  assert.deepEqual(kindsOf(gaps(oldSource)), ["evidence-stale"]);
  const pinned = oldSource.map((x) => (x.id === "acme-docs" ? { ...x, locator: { url: "https://github.com/a/b/blob/" + "a".repeat(40) + "/x.md", pin: { kind: "commit-permalink" } } } : x));
  assert.deepEqual(gaps(pinned), []);
  // an old negative verdict is stale too
  const neg = [provider("acme"), family("acme:api-key", { currentContract: null, research: { state: "not-found", researchedAt: "2025-01-01" } })];
  assert.deepEqual(kindsOf(gaps(neg)), ["evidence-stale"]);
});

test("staleness adds one point per three months past the period", () => {
  const mk = (observedAt) => healthy().map((x) => (x.kind === "format-contract" ? { ...x, claims: [claim("c1", "provider-documented", ["acme-docs"], { observedAt })] } : x));
  const base = gaps(mk("2025-05-01"))[0]; // 14 months
  const older = gaps(mk("2024-05-01"))[0]; // 26 months
  assert.equal(base.score, 80); // 70 base, +10 in use, +0 age (14 months is under 15)
  assert.ok(older.score > base.score);
  assert.ok(older.rationale.some((l) => /age/.test(l)));
});

test("a source whose last observation was unreachable or changed is flagged", () => {
  const r = healthy().map((x) => (x.id === "acme-docs" ? source("acme-docs", { observations: [{ observedAt: "2026-06-01", outcome: "read", observer: "alice" }, { observedAt: "2026-06-20", outcome: "unreachable", observer: "bob" }] }) : x));
  const items = gaps(r);
  assert.deepEqual(kindsOf(items), ["source-unreachable"]);
  assert.match(items[0].facts.sources[0], /unreachable/);
  const recovered = healthy().map((x) => (x.id === "acme-docs" ? source("acme-docs", { observations: [{ observedAt: "2026-06-01", outcome: "unreachable", observer: "bob" }, { observedAt: "2026-06-20", outcome: "read", observer: "alice" }] }) : x));
  assert.deepEqual(gaps(recovered), []);
});

test("import-only observations are flagged until someone re-reads", () => {
  const imp = healthy().map((x) => (x.id === "acme-docs" ? source("acme-docs", { observations: [{ observedAt: "2026-06-01", outcome: "read", observer: "legacy-import" }] }) : x));
  assert.deepEqual(kindsOf(gaps(imp)), ["observation-unverified"]);
  const reread = imp.map((x) => (x.id === "acme-docs" ? { ...x, observations: [...x.observations, { observedAt: "2026-06-25", outcome: "unchanged", observer: "alice" }] } : x));
  assert.deepEqual(gaps(reread), []);
});

test("narrative: missing, and unresolved-heavy scaled by share", () => {
  assert.deepEqual(kindsOf(gaps(without(healthy(), (r) => r.kind === "family-narrative"))), ["narrative-missing"]);
  const heavy = (classes) => healthy().map((x) => (x.kind === "family-narrative" ? narrative("acme:api-key", classes) : x));
  assert.deepEqual(gaps(heavy(["unresolved", "provider-documented", "provider-documented"])), []); // 33%
  const half = gaps(heavy(["unresolved", "provider-documented"]));
  const all = gaps(heavy(["unresolved", "unresolved"]));
  assert.deepEqual(kindsOf(half), ["narrative-unresolved-heavy"]);
  assert.ok(all[0].score > half[0].score);
});

test("benign siblings and cases", () => {
  assert.deepEqual(kindsOf(gaps(without(healthy(), (r) => r.id === "acme-benign"))), ["benign-siblings-missing"]);
  // a benign-sibling record also satisfies it
  const sib = without(healthy(), (r) => r.id === "acme-benign").concat({ kind: "benign-sibling", id: "acme-public-id", families: ["acme:api-key"] });
  assert.deepEqual(gaps(sib), []);
  // no case and no plan: cases-missing; a fixture plan listing the family satisfies it
  const noCases = without(healthy(), (r) => r.kind === "case");
  assert.deepEqual(kindsOf(gaps(noCases)), ["benign-siblings-missing", "cases-missing"]);
  const planned = noCases.concat({ kind: "fixture-plan", id: "p", matrix: { families: { select: "listed", ids: ["acme:api-key"] }, targets: [] } });
  assert.deepEqual(kindsOf(gaps(planned)), ["benign-siblings-missing"]);
  const all = noCases.concat({ kind: "fixture-plan", id: "p", matrix: { families: { select: "all-applicable" }, targets: [] } });
  assert.deepEqual(kindsOf(gaps(all)), ["benign-siblings-missing"]);
});

test("provider without families and unused scenarios", () => {
  const items = gaps([provider("empty"), provider("generic"), { kind: "scenario", id: "lonely" }, { kind: "scenario", id: "used" }, { kind: "scenario", id: "planned" }, kase("k", [], { scenarios: ["used"] }), { kind: "fixture-plan", id: "p", matrix: { families: { select: "all-applicable" }, targets: [{ type: "scenario", id: "planned" }] } }]);
  assert.deepEqual(items.map((i) => i.id).sort(), ["provider-no-families:empty", "scenario-unused:lonely"]);
  assert.equal(items.find((i) => i.gapKind === "scenario-unused").suggestedSkill, "author-case");
});

test("usage bonus and blocker penalty adjust the score and say so", () => {
  const bare = [provider("acme"), family("acme:api-key"), source("d"), contract("acme:api-key", [claim("c", "provider-documented", ["d"])]), narrative("acme:api-key", ["provider-documented"])];
  const plain = gaps(bare).find((i) => i.gapKind === "benign-siblings-missing");
  assert.equal(plain.score, 40);
  const used = gaps(bare.concat(kase("k", ["acme:api-key"]))).find((i) => i.gapKind === "benign-siblings-missing");
  assert.equal(used.score, 50);
  assert.ok(used.rationale.some((l) => l.startsWith("+10 in-use")));
  const blocked = gaps(bare.map((x) => (x.kind === "family" ? { ...x, research: { ...x.research, blockers: [{ kind: "issuance-gated", summary: "needs a paid account" }] } } : x))).find((i) => i.gapKind === "benign-siblings-missing");
  assert.equal(blocked.score, 25);
  assert.deepEqual(blocked.blockedBy, ["issuance-gated"]);
  // freshness work is not blocked by issuance gates
  const fresh = gaps(bare.map((x) => (x.kind === "family" ? { ...x, research: { ...x.research, blockers: [{ kind: "issuance-gated", summary: "x" }] } } : x)).map((x) => (x.id === "d" ? source("d", { observations: [{ observedAt: "2026-06-01", outcome: "read", observer: "legacy-import" }] }) : x))).find((i) => i.gapKind === "observation-unverified");
  assert.equal(fresh.score, 35);
});

test("ordering: score descending, then id; items carry every field the cron needs", () => {
  const r = [...healthy("acme:one"), ...healthy("beta:two")].filter((x) => x.kind !== "case");
  const items = gaps(r);
  const sorted = [...items].sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  assert.deepEqual(items.map((i) => i.id), sorted.map((i) => i.id));
  for (const i of items) {
    assert.deepEqual(Object.keys(i).sort(), ["blockedBy", "dedupe", "facts", "gapKind", "id", "priority", "rationale", "scope", "score", "suggestedInput", "suggestedSkill"]);
    assert.equal(i.id, `${i.gapKind}:${i.scope.id}`);
    assert.deepEqual(Object.keys(i.dedupe).sort(), ["branchHint", "key", "prTitleTag"]);
    assert.ok(i.dedupe.branchHint.startsWith("coverage/") && !/[:@]/.test(i.dedupe.branchHint));
    assert.ok(SKILLS.includes(i.suggestedSkill));
  }
});

test("deterministic: input order does not matter, output is byte-stable", () => {
  const r = [...healthy("acme:one"), ...healthy("beta:two")].filter((x) => x.kind !== "case");
  const a = serialize(buildBacklog(r, { asOf: AS_OF }));
  const b = serialize(buildBacklog([...r].reverse(), { asOf: AS_OF }));
  assert.equal(a, b);
  assert.equal(a.endsWith("}\n"), true);
});

test("the default reference date is the newest recorded date, so output depends on records only", () => {
  const r = healthy();
  assert.equal(buildBacklog(r).asOf, "2026-06-01");
  assert.throws(() => buildBacklog([provider("x")]), /reference date/);
});

test("wishlist entries become new-provider items below every recorded-data gap; recorded providers drop out", () => {
  const wishlist = { schemaVersion: 1, kind: "provider-wishlist", entries: [{ id: "algolia", name: "Algolia", rationale: "Public search keys next to secret admin keys.", priority: 1 }, { id: "acme", name: "Acme", rationale: "Already recorded provider, should drop out.", priority: 1 }, { id: "zendesk", name: "Zendesk", rationale: "Support platform API tokens in integrations.", priority: 3, docsHint: "https://developer.zendesk.com/" }] };
  const b = buildBacklog(healthy(), { asOf: AS_OF, wishlist });
  const wish = b.items.filter((i) => i.gapKind === "new-provider");
  assert.deepEqual(wish.map((i) => i.id), ["new-provider:algolia", "new-provider:zendesk"]);
  assert.equal(wish[0].score, WISHLIST_SCORES[1]);
  assert.equal(wish[0].suggestedSkill, "research-provider");
  assert.equal(wish[1].facts.docsHint, "https://developer.zendesk.com/");
  assert.deepEqual(b.totals.wishlistAlreadyRecorded, ["acme"]);
  assert.ok(WISHLIST_SCORES[1] < GAP_KINDS["narrative-missing"].score);
});

test("selectNext filters, skips by id, branch hint or PR tag, and limits", () => {
  const r = [provider("acme"), family("acme:one", { currentContract: null, research: { state: "unresearched", researchedAt: null } }), family("acme:two", { currentContract: null, research: { state: "unresearched", researchedAt: null } }), provider("beta"), family("beta:x", { currentContract: null })];
  const b = buildBacklog(r, { asOf: AS_OF });
  assert.equal(selectNext(b).length, 1);
  assert.equal(selectNext(b, { limit: 99 }).length, b.items.length);
  const top = selectNext(b)[0];
  assert.equal(top.gapKind, "family-unresearched");
  assert.notEqual(selectNext(b, { skip: [top.id] })[0].id, top.id);
  assert.notEqual(selectNext(b, { skip: [top.dedupe.branchHint] })[0].id, top.id);
  assert.notEqual(selectNext(b, { skip: [top.dedupe.prTitleTag] })[0].id, top.id);
  assert.ok(selectNext(b, { limit: 99, provider: "beta" }).every((i) => i.scope.provider === "beta"));
  assert.ok(selectNext(b, { limit: 99, gapKind: "contract-missing" }).every((i) => i.gapKind === "contract-missing"));
  assert.ok(selectNext(b, { limit: 99, minPriority: "P0" }).every((i) => i.priority === "P0"));
});

// ---- wishlist validation ----

const wl = (entries) => ({ schemaVersion: 1, kind: "provider-wishlist", entries });
const entry = (extra = {}) => ({ id: "algolia", name: "Algolia", rationale: "Public search keys next to secret admin keys.", priority: 1, ...extra });

test("wishlist validation", () => {
  assert.deepEqual(validateWishlist(wl([entry()])), []);
  const bad = (e, re) => assert.ok(validateWishlist(wl([entry(e)])).some((x) => re.test(x)), JSON.stringify(e));
  bad({ id: "Algolia" }, /lowercase slug/);
  bad({ id: "generic" }, /reserved/);
  bad({ id: "gitleaks" }, /forbidden coordinate/);
  bad({ id: "acme-beta8" }, /forbidden coordinate/);
  bad({ name: "" }, /name is required/);
  bad({ rationale: "short" }, /rationale/);
  bad({ priority: 4 }, /priority/);
  bad({ docsHint: "http://x.example/" }, /docsHint/);
  bad({ docsHint: "https://user:pw@x.example/" }, /docsHint/);
  bad({ docsHint: "https://x.example/?token=abc" }, /docsHint/);
  bad({ extra: 1 }, /unknown field/);
  assert.ok(validateWishlist(wl([entry(), entry()])).some((x) => /duplicate id/.test(x)));
  assert.ok(validateWishlist(wl([entry({ id: "zed" }), entry({ id: "abc" })])).some((x) => /sorted/.test(x)));
  assert.ok(validateWishlist({ schemaVersion: 2, kind: "x", entries: [] }).length >= 2);
  assert.ok(validateWishlist(null).length);
});

// ---- the committed files ----

test("the committed wishlist is valid and seeded", () => {
  const doc = JSON.parse(readFileSync(join(repoRoot, "docs/research/provider-wishlist.json"), "utf8"));
  assert.deepEqual(validateWishlist(doc), []);
  assert.ok(doc.entries.length >= 15);
});

test("the report over the live records is deterministic, is generated rather than committed, and the wishlist has no recorded provider (#88)", () => {
  const records = listJson(join(repoRoot, "records")).map((f) => JSON.parse(readFileSync(f, "utf8")));
  const wishlist = JSON.parse(readFileSync(join(repoRoot, "docs/research/provider-wishlist.json"), "utf8"));
  const b = buildBacklog(records, { wishlist });
  assert.equal(serialize(buildBacklog(records, { wishlist })), serialize(b), "same records, same bytes");
  assert.equal(renderMarkdown(buildBacklog(records, { wishlist })), renderMarkdown(b));
  assert.deepEqual(b.totals.wishlistAlreadyRecorded, [], "prune wishlist entries whose provider is now recorded");
  // no committed copy exists to drift: the output directory is gitignored and nothing in docs/research claims to be generated output
  assert.match(readFileSync(join(repoRoot, ".gitignore"), "utf8"), /^\/docs\/research\/generated\/$/m);
  assert.doesNotMatch(readFileSync(join(repoRoot, "package.json"), "utf8"), /coverage:gaps:check/);
});

// ---- the CLI ----

function seededRoot(records, wishlist) {
  const root = mkdtempSync(join(tmpdir(), "coverage-"));
  for (const r of records) {
    const p = join(root, "records", `${r.kind}`, `${r.id.replace(/[:@]/g, "-")}.json`);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(r));
  }
  mkdirSync(join(root, "records"), { recursive: true });
  if (wishlist) {
    mkdirSync(join(root, "docs", "research"), { recursive: true });
    writeFileSync(join(root, "docs", "research", "provider-wishlist.json"), JSON.stringify(wishlist));
  }
  return root;
}
const run = (args) => spawnSync("node", [script, ...args], { encoding: "utf8" });

test("CLI: generate into the gitignored directory, deterministic rerun, --next with skip, --check is gone", () => {
  const root = seededRoot(healthy().filter((x) => x.kind !== "family-narrative"));
  try {
    assert.equal(run(["--root", root, "--check"]).status, 2, "the committed-file check no longer exists");
    const w = run(["--root", root]);
    assert.equal(w.status, 0, w.stderr);
    assert.match(w.stdout, /wrote docs\/research\/generated\/backlog.json and coverage.md \(gitignored\): 1 items as of 2026-06-01/);
    assert.ok(!existsSync(join(root, "docs/research/backlog.json")) && !existsSync(join(root, "docs/research/coverage.md")), "nothing is written next to the authored files");
    const before = readFileSync(join(root, "docs/research/generated/backlog.json"), "utf8");
    const page = readFileSync(join(root, "docs/research/generated/coverage.md"), "utf8");
    run(["--root", root]);
    assert.equal(readFileSync(join(root, "docs/research/generated/backlog.json"), "utf8"), before, "rerun is byte-identical");
    assert.equal(readFileSync(join(root, "docs/research/generated/coverage.md"), "utf8"), page);
    assert.match(page, /\]\(\.\.\/README\.md\)/, "links resolve from the generated directory");
    const next = JSON.parse(run(["--root", root, "--next", "1"]).stdout);
    assert.equal(next.items[0].id, "narrative-missing:acme:api-key");
    const skipped = JSON.parse(run(["--root", root, "--next", "1", "--skip", "narrative-missing:acme:api-key"]).stdout);
    assert.equal(skipped.count, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CLI: --as-of changes staleness, bad input exits 2, bad wishlist exits 1", () => {
  const stale = healthy().filter((x) => x.kind !== "family-narrative").map((x) => (x.kind === "format-contract" ? { ...x, claims: [claim("c1", "provider-documented", ["acme-docs"], { observedAt: "2026-06-01" })] } : x));
  const root = seededRoot(stale);
  try {
    const now = JSON.parse(run(["--root", root, "--next", "5", "--as-of", "2026-06-02"]).stdout);
    assert.ok(!now.items.some((i) => i.gapKind === "evidence-stale"));
    const later = JSON.parse(run(["--root", root, "--next", "5", "--as-of", "2028-01-01"]).stdout);
    assert.ok(later.items.some((i) => i.gapKind === "evidence-stale"));
    assert.equal(run(["--root", root, "--as-of", "yesterday"]).status, 2);
    assert.equal(run(["--root", root, "--next", "0"]).status, 2);
    assert.equal(run(["--root", root, "--min-priority", "P9", "--next", "1"]).status, 2);
    assert.equal(run(["--bogus"]).status, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  const bad = seededRoot(healthy(), wl([entry({ priority: 9 })]));
  try {
    const r = run(["--root", bad]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /provider-wishlist.json: .*priority/);
  } finally {
    rmSync(bad, { recursive: true, force: true });
  }
});
