import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { ownerOf } from "../scripts/lib/ownership.mjs";
import { dueSources, ObserveError, planObservation } from "../scripts/lib/source-observe.mjs";
import { canonical, normalizeUrl, scanRecords } from "../scripts/lib/tidy-scan.mjs";
import { createValidator, listJson, repoRoot } from "../scripts/lib/validator.mjs";

const validator = createValidator();
const tidyScript = join(repoRoot, "scripts", "tidy-scan.mjs");
const observeScript = join(repoRoot, "scripts", "source-observe.mjs");

const source = (id, url, extra = {}) => ({
  schemaVersion: 1,
  kind: "evidence-source",
  id,
  sourceType: "provider-documentation",
  title: id,
  locator: { url, pin: { kind: "live-unpinned" } },
  observations: [{ observedAt: "2026-06-01", outcome: "read", observer: "alice" }],
  lifecycle: "draft",
  ...extra,
});
const entry = (path, record, text) => ({ path, record, text: text ?? canonical(record) });
const kinds = (findings) => findings.map((f) => f.kind);

// ---- ownership ----

test("ownership mirrors the migration pipelines", () => {
  const marked = { externalRefs: [{ system: "legacy-taxonomy-import", id: "x" }] };
  assert.equal(ownerOf("records/sources/h/a.json", marked), "migrate:taxonomy");
  assert.equal(ownerOf("records/sources/h/a.json", {}), "authored");
  assert.equal(ownerOf("records/providers/a.json", marked), "migrate:taxonomy");
  assert.equal(ownerOf("records/cases/a.json", {}), "migrate:cases");
  assert.equal(ownerOf("records/scenarios/a.json", {}), "migrate:cases");
  assert.equal(ownerOf("records/fixtures/a.json", {}), "migrate:cases");
  assert.equal(ownerOf("migration/legacy-map/a.json", {}), "migrate:cases");
  assert.equal(ownerOf("records/narratives/p/f.json", {}), "migrate:narratives");
  assert.equal(ownerOf("records/narrative-reviews/p/f.json", {}), "migrate:narratives");
  assert.equal(ownerOf("examples/valid/x.json", marked), "authored");
});

// ---- tidy scan ----

test("normalizeUrl folds case, trailing slash, fragment and tracking parameters, not meaningful queries", () => {
  assert.equal(normalizeUrl("https://Docs.Example.org/a/b/#x"), "https://docs.example.org/a/b");
  assert.equal(normalizeUrl("https://docs.example.org/a/b?utm_source=x&id=2"), "https://docs.example.org/a/b?id=2");
  assert.notEqual(normalizeUrl("https://docs.example.org/a?id=1"), normalizeUrl("https://docs.example.org/a?id=2"));
  assert.equal(normalizeUrl("https://docs.example.org/"), "https://docs.example.org/");
});

test("tidy scan: every finding kind is detected, with its owner", () => {
  const dup1 = source("docs-example-aaaaaaaaaa", "https://docs.example.org/keys");
  const dup2 = source("docs-example-bbbbbbbbbb", "https://docs.example.org/keys/");
  const stray = { schemaVersion: 1, kind: "provider", id: "acme", name: "Acme  Cloud ", lifecycle: "draft" };
  const fam = { kind: "family", id: "acme:api-key", provider: "acme", currentContract: "acme:api-key@1" };
  const c1 = { kind: "format-contract", id: "acme:api-key@1", family: "acme:api-key", revision: 1, period: "current", claims: [] };
  const c2 = { kind: "format-contract", id: "acme:api-key@2", family: "acme:api-key", revision: 2, period: "current", claims: [{ id: "a", statement: "Keys are 32 characters." , sources: [{ sourceId: "s", supports: "x" }, { sourceId: "s", supports: "x" }] }, { id: "b", statement: "keys are  32 characters.", sources: [] }] };
  const narr = { kind: "family-narrative", id: "acme:api-key", family: "acme:api-key", contract: "acme:api-key@2", sections: {} };
  const entries = [
    entry("records/sources/docs-example-org/a.json", dup1),
    entry("records/sources/docs-example-org/b.json", dup2),
    entry("records/providers/acme.json", stray, JSON.stringify(stray)),
    entry("records/families/acme/api-key.json", fam),
    entry("records/contracts/acme/api-key@1.json", c1),
    entry("records/contracts/acme/api-key@2.json", c2),
    entry("records/narratives/acme/api-key.json", narr),
  ];
  const f = scanRecords(entries);
  assert.deepEqual([...new Set(kinds(f))].sort(), ["current-contract-mismatch", "duplicate-citation", "duplicate-claim", "duplicate-source-url", "narrative-contract-mismatch", "non-canonical-format", "stray-whitespace"]);
  assert.ok(f.every((x) => x.owner === "authored" || x.owner === "migrate:narratives"), "no taxonomy marker on these records");
  assert.equal(f.find((x) => x.kind === "narrative-contract-mismatch").owner, "migrate:narratives");
  assert.deepEqual(f.map((x) => x.path), [...f.map((x) => x.path)].sort(), "sorted by path");
  assert.deepEqual(scanRecords(entries, { kinds: ["duplicate-claim"] }).map((x) => x.kind), ["duplicate-claim"]);
  assert.deepEqual(scanRecords(entries, { owner: "migrate:narratives" }).map((x) => x.kind), ["narrative-contract-mismatch"]);
});

test("tidy scan: a withdrawn duplicate is the finished state of a merge", () => {
  const a = source("docs-example-aaaaaaaaaa", "https://docs.example.org/keys");
  const b = source("docs-example-bbbbbbbbbb", "https://docs.example.org/keys/", { lifecycle: "withdrawn", notes: "Same page as docs-example-aaaaaaaaaa." });
  assert.deepEqual(scanRecords([entry("records/sources/h/a.json", a), entry("records/sources/h/b.json", b)]), []);
});

test("tidy scan: clean records, different URLs and generated fixture sets produce nothing", () => {
  const a = source("docs-example-aaaaaaaaaa", "https://docs.example.org/keys");
  const b = source("docs-example-bbbbbbbbbb", "https://docs.example.org/other");
  const fixtureSet = { kind: "fixture-set", id: "x" };
  assert.deepEqual(scanRecords([entry("records/sources/h/a.json", a), entry("records/sources/h/b.json", b), entry("records/fixtures/x.json", fixtureSet, JSON.stringify(fixtureSet))]), []);
  const clean = { kind: "family", id: "acme:k", provider: "acme", currentContract: null };
  assert.deepEqual(scanRecords([entry("records/families/acme/k.json", clean)]), []);
});

test("tidy scan: the repository has no findings in authored records, and the CLI reports owners", () => {
  const authored = spawnSync("node", [tidyScript, "--owner", "authored"], { encoding: "utf8" });
  assert.equal(authored.status, 0, authored.stdout + authored.stderr);
  const all = spawnSync("node", [tidyScript, "--json"], { encoding: "utf8" });
  const parsed = JSON.parse(all.stdout);
  assert.equal(parsed.count, parsed.findings.length);
  assert.ok(parsed.findings.every((f) => ["authored", "migrate:taxonomy", "migrate:cases", "migrate:narratives"].includes(f.owner)));
  assert.equal(spawnSync("node", [tidyScript, "--kind", "nope"], { encoding: "utf8" }).status, 2);
});

function seeded(records) {
  const root = mkdtempSync(join(tmpdir(), "tidy-"));
  for (const [rel, text] of records) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
}

test("tidy scan CLI: exit 1 with findings, scoped by path, never writes", () => {
  const dup1 = source("docs-example-aaaaaaaaaa", "https://docs.example.org/keys");
  const dup2 = source("docs-example-bbbbbbbbbb", "https://docs.example.org/keys");
  const root = seeded([
    ["records/sources/h/a.json", canonical(dup1)],
    ["records/sources/h/b.json", canonical(dup2)],
  ]);
  try {
    const r = spawnSync("node", [tidyScript, "--root", root], { encoding: "utf8" });
    assert.equal(r.status, 1);
    assert.match(r.stdout, /a\.json: duplicate-source-url: same page as docs-example-bbbbbbbbbb \[authored\]/);
    const scoped = spawnSync("node", [tidyScript, "--root", root, join(root, "records/sources/h/a.json")], { encoding: "utf8" });
    assert.match(scoped.stdout, /a\.json/);
    assert.doesNotMatch(scoped.stdout, /b\.json/);
    assert.equal(readFileSync(join(root, "records/sources/h/a.json"), "utf8"), canonical(dup1));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---- source observations ----

const today = "2026-10-01";
const plan = (src, opts, bytes) => planObservation(src, bytes ?? canonical(src), { today, observer: "bob", outcome: "unchanged", ...opts });
const refused = (src, opts, re, bytes) => assert.throws(() => plan(src, opts, bytes), (e) => e instanceof ObserveError && re.test(e.message), JSON.stringify(opts));

test("planObservation appends one validated entry and changes nothing else", () => {
  const s = source("docs-example-aaaaaaaaaa", "https://docs.example.org/keys");
  const p = plan(s, { outcome: "unchanged", digest: "a".repeat(64), note: "Still states the 69-character length." });
  assert.deepEqual(p.entry, { observedAt: today, outcome: "unchanged", observer: "bob", contentDigest: "a".repeat(64), note: "Still states the 69-character length." });
  assert.equal(p.record.observations.length, 2);
  assert.deepEqual(p.record.observations[0], s.observations[0]);
  assert.deepEqual(validator.validateRecord(p.record), []);
  assert.deepEqual({ ...p.record, observations: s.observations }, s);
  assert.equal(s.observations.length, 1, "input not mutated");
});

test("planObservation refusals", () => {
  const s = source("docs-example-aaaaaaaaaa", "https://docs.example.org/keys");
  refused(s, { outcome: "ok" }, /--outcome must be one of/);
  refused(s, { observer: undefined }, /--observer is required/);
  refused(s, { observer: "Bob Smith" }, /lowercase slug/);
  refused(s, { observer: "legacy-import" }, /not an import/);
  refused(s, { observedAt: "2026-13-40" }, /YYYY-MM-DD/);
  refused(s, { observedAt: "2026-10-02" }, /future/);
  refused(s, { observedAt: "2026-05-31" }, /earlier than the latest/);
  refused(s, { digest: "xyz" }, /sha256/);
  refused(s, { outcome: "changed" }, /--note is required/);
  refused(s, { outcome: "unreachable" }, /--note is required/);
  refused(s, { outcome: "unreachable", note: "404", digest: "a".repeat(64) }, /no digest/);
  refused(s, {}, /canonical form/, `${JSON.stringify(s)}\n`);
  assert.equal(plan(s, { outcome: "changed", note: "Page now says 72 characters." }).entry.outcome, "changed");
});

test("dueSources: unreachable first, then stale, then import-only; cited-by current contracts only", () => {
  const live = (id, extra) => source(id, `https://docs.example.org/${id}`, extra);
  const records = [
    { kind: "family", id: "acme:k", provider: "acme", currentContract: "acme:k@1" },
    { kind: "format-contract", id: "acme:k@1", family: "acme:k", revision: 1, period: "current", claims: [
      { id: "c", temporality: "current", sources: ["fine", "gone", "old", "imported", "pinned"].map((sourceId) => ({ sourceId })) },
      { id: "h", temporality: "historical", sources: [{ sourceId: "hist" }] },
    ] },
    live("fine"),
    live("gone", { observations: [{ observedAt: "2026-05-01", outcome: "read", observer: "a" }, { observedAt: "2026-06-01", outcome: "changed", observer: "a" }] }),
    live("old", { observations: [{ observedAt: "2024-01-01", outcome: "read", observer: "a" }] }),
    live("imported", { observations: [{ observedAt: "2026-06-01", outcome: "read", observer: "legacy-import" }] }),
    live("pinned", { locator: { url: "https://github.com/a/b/blob/" + "a".repeat(40) + "/x.md", pin: { kind: "commit-permalink" } }, observations: [{ observedAt: "2020-01-01", outcome: "read", observer: "a" }] }),
    live("hist", { observations: [{ observedAt: "2020-01-01", outcome: "read", observer: "a" }] }),
    live("uncited", { observations: [{ observedAt: "2020-01-01", outcome: "read", observer: "a" }] }),
    { kind: "family", id: "other:k", provider: "other", currentContract: null },
  ];
  const due = dueSources(records, { asOf: today });
  assert.deepEqual(due.map((d) => [d.id, d.reason]), [["gone", "unreachable-last"], ["old", "stale"], ["imported", "unverified-import"]]);
  assert.deepEqual(due[1].citedBy, ["acme:k"]);
  assert.deepEqual(dueSources(records, { asOf: today, family: "other:k" }), []);
  assert.deepEqual(dueSources(records, { asOf: today, provider: "acme" }).length, 3);
});

function observeRoot(src, marked = false) {
  const record = marked ? { ...src, externalRefs: [{ system: "legacy-taxonomy-import", id: "x" }] } : src;
  return { root: seeded([[`records/sources/docs-example-org/${src.id}.json`, canonical(record)]]), record };
}
const observe = (root, args) => spawnSync("node", [observeScript, "--root", root, ...args], { encoding: "utf8" });

test("source:observe CLI appends to an authored source and refuses a generated one", () => {
  const src = source("docs-example-aaaaaaaaaa", "https://docs.example.org/keys");
  const free = observeRoot(src);
  try {
    const dry = observe(free.root, [src.id, "--outcome", "unchanged", "--observer", "bob", "--observed-at", "2026-06-02", "--dry-run"]);
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(readFileSync(join(free.root, `records/sources/docs-example-org/${src.id}.json`), "utf8"), canonical(src), "dry run writes nothing");
    const w = observe(free.root, [src.id, "--outcome", "unchanged", "--observer", "bob", "--observed-at", "2026-06-02"]);
    assert.equal(w.status, 0, w.stderr);
    const after = JSON.parse(readFileSync(join(free.root, `records/sources/docs-example-org/${src.id}.json`), "utf8"));
    assert.equal(after.observations.length, 2);
    assert.equal(after.observations[1].observer, "bob");
    assert.equal(observe(free.root, [src.id, "--outcome", "changed", "--observer", "bob"]).status, 1, "changed needs a note");
    assert.equal(observe(free.root, ["no-such-source", "--outcome", "read", "--observer", "bob"]).status, 1);
    assert.equal(observe(free.root, [src.id, "--outcome", "nope", "--observer", "bob"]).status, 2);
    assert.equal(observe(free.root, []).status, 2);
  } finally {
    rmSync(free.root, { recursive: true, force: true });
  }
  const gen = observeRoot(src, true);
  try {
    const r = observe(gen.root, [src.id, "--outcome", "unchanged", "--observer", "bob", "--observed-at", "2026-06-02"]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /generated by migrate:taxonomy/);
    assert.equal(JSON.parse(readFileSync(join(gen.root, `records/sources/docs-example-org/${src.id}.json`), "utf8")).observations.length, 1);
    const forced = observe(gen.root, [src.id, "--outcome", "unchanged", "--observer", "bob", "--observed-at", "2026-06-02", "--allow-generated"]);
    assert.equal(forced.status, 0, forced.stderr);
  } finally {
    rmSync(gen.root, { recursive: true, force: true });
  }
});

test("source:observe --due lists real sources deterministically and offline", () => {
  const a = spawnSync("node", [observeScript, "--due", "--limit", "3", "--as-of", "2026-10-01"], { encoding: "utf8" });
  const b = spawnSync("node", [observeScript, "--due", "--limit", "3", "--as-of", "2026-10-01"], { encoding: "utf8" });
  assert.equal(a.status, 0, a.stderr);
  assert.equal(a.stdout, b.stdout);
  const parsed = JSON.parse(a.stdout);
  assert.equal(parsed.sources.length, 3);
  assert.ok(parsed.count >= 3);
  assert.ok(parsed.sources.every((s) => s.url.startsWith("https://") && s.citedBy.length));
  assert.equal(spawnSync("node", [observeScript, "--due", "--limit", "0"], { encoding: "utf8" }).status, 2);
});

test("hygiene skills state stop conditions and outputs and link the shared references", () => {
  for (const name of ["coverage-gaps", "tidy-records", "source-freshness"]) {
    const text = readFileSync(join(repoRoot, ".agents", "skills", name, "SKILL.md"), "utf8");
    assert.match(text, /^## Stop conditions$/m, name);
    assert.match(text, /^## Output$/m, name);
    assert.match(text, /\.\.\/_shared\/README\.md/, name);
  }
});

test("the records the real due list names all exist and validate", () => {
  const ids = new Set(listJson(join(repoRoot, "records", "sources")).map((f) => JSON.parse(readFileSync(f, "utf8")).id));
  const r = spawnSync("node", [observeScript, "--due", "--limit", "5", "--as-of", "2026-10-01"], { encoding: "utf8" });
  for (const s of JSON.parse(r.stdout).sources) assert.ok(ids.has(s.id));
});
