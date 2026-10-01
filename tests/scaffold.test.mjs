import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { checkIdentity } from "../scripts/lib/identity.mjs";
import { checkPlaceholders, PLACEHOLDER, placeholderLocations } from "../scripts/lib/placeholders.mjs";
import { changedRecordFiles, checkRecordFiles } from "../scripts/lib/record-check.mjs";
import { loadIndex, planRecord, ScaffoldError, SCAFFOLD_KINDS, writeRecord } from "../scripts/lib/scaffold.mjs";
import { checkIntegrity, createValidator, repoRoot, validateTree } from "../scripts/lib/validator.mjs";

const validator = createValidator();
const index = loadIndex(repoRoot);
const today = "2026-10-01";
const plan = (kind, args, opts = {}) => planRecord(kind, args, opts, { index, today, validator });
const refused = (kind, args, opts, re) => assert.throws(() => plan(kind, args, opts), (e) => e instanceof ScaffoldError && re.test(e.message), `${kind} ${args} ${JSON.stringify(opts)}`);

const firstOf = (kind) => index.find((e) => e.record.kind === kind).record;
const aws = "aws:iam-user-access-key";

const SAMPLES = {
  provider: [["examplevendor"], { name: "Example Vendor" }],
  family: [["aws:brand-new-token"], { name: "Brand new token" }],
  contract: [[aws], {}],
  source: [["https://docs.example.org/auth/tokens#format"], { "source-type": "provider-documentation", observer: "test-agent", title: "Token formats" }],
  scenario: [["brand-new-scenario"], { title: "A brand new scenario", family: aws }],
  case: [["brand-new-case"], { title: "A brand new case", type: "benign", family: `${aws}=lookalike`, scenario: "documentation-placeholder" }],
};

// variant, benign-sibling, family-narrative, review and fixture (issue #23) need records that
// do not exist in the real index yet; tests/scaffold-research.test.mjs covers them.
const RESEARCH_KINDS = ["variant", "benign-sibling", "family-narrative", "review", "fixture"];

test("every scaffold kind has a sample or is covered by scaffold-research.test.mjs", () => {
  assert.deepEqual([...Object.keys(SAMPLES), ...RESEARCH_KINDS].sort(), [...SCAFFOLD_KINDS].sort());
});

for (const kind of Object.keys(SAMPLES)) {
  test(`${kind}: skeleton is schema-valid, draft, integrity- and identity-clean`, () => {
    const [args, opts] = SAMPLES[kind];
    const p = plan(kind, args, opts);
    assert.deepEqual(validator.validateRecord(p.record), []);
    assert.equal(p.record.lifecycle, "draft");
    const all = [...index, { path: p.path, record: p.record }];
    assert.deepEqual(checkIntegrity(all).filter((e) => e.startsWith(`${p.path}:`)), []);
    assert.deepEqual(checkIdentity([{ path: p.path, record: p.record }]), []);
  });

  test(`${kind}: deterministic`, () => {
    const [args, opts] = SAMPLES[kind];
    assert.deepEqual(plan(kind, args, opts), plan(kind, args, opts));
  });
}

test("a skeleton keeps its unwritten fields marked and fails placeholder lint", () => {
  for (const kind of ["family", "contract", "scenario", "case"]) {
    const [args, opts] = SAMPLES[kind];
    const p = plan(kind, args, opts);
    assert.ok(placeholderLocations(p.record).length > 0, kind);
    const errors = checkPlaceholders([{ path: p.path, record: p.record }]);
    assert.ok(errors.length > 0 && errors[0].includes(PLACEHOLDER), kind);
  }
});

test("skeletons claim nothing: unresolved basis and not-assertable outcome", () => {
  const c = plan("case", ...SAMPLES.case).record;
  assert.equal(c.expectation.basis, "unresolved");
  assert.equal(c.expectation.outcome, "not-assertable");
  const s = plan("scenario", ...SAMPLES.scenario).record;
  assert.equal(s.evidenceBasis.basis, "unresolved");
  assert.equal(s.expectedOutcomeClass, "not-assertable");
  const k = plan("contract", ...SAMPLES.contract).record;
  assert.equal(k.period, "proposed");
  assert.ok(k.claims.every((x) => x.evidenceClass === "unresolved"));
});

test("contract revisions are computed and append-only", () => {
  const existing = index.filter((e) => e.record.kind === "format-contract" && e.record.family === aws).map((e) => e.record.revision);
  const next = Math.max(...existing) + 1;
  const p = plan("contract", [aws], {});
  assert.equal(p.record.id, `${aws}@${next}`);
  assert.equal(p.record.supersedes, `${aws}@${next - 1}`);
  assert.equal(p.path, `records/contracts/aws/iam-user-access-key@${next}.json`);
  refused("contract", [aws], { revision: "1" }, /append-only/);
  refused("contract", ["aws:no-such-family"], {}, /unknown family/);
});

test("forbidden identity coordinates are refused (ADR 0007)", () => {
  const ids = ["beta8-207-thing", "milestone-6-thing", "thing-issue-254", "pr-12-thing", "thing-rc2", "release-3-thing", "a-detector-case", "trufflehog-thing", "gitleaks", "accuracy-thing", "negative-controls", "reference-syntax-x", "thing-redact-secret-101"];
  for (const id of ids) {
    refused("scenario", [id], { title: "x" }, /forbidden identity coordinate/);
    refused("case", [id], { title: "x", type: "benign" }, /forbidden identity coordinate/);
  }
  refused("family", ["aws:thing-beta-8"], { name: "x" }, /forbidden identity coordinate/);
  refused("provider", ["gitleaks"], { name: "x" }, /forbidden identity coordinate/);
});

test("evidence tier and basis are not identity", () => {
  for (const id of ["thing-t0", "tier-2-thing", "thing-provider-documented", "tool-corroborated-thing", "project-policy-thing", "unresolved-thing"]) {
    refused("case", [id], { title: "x", type: "benign" }, /evidence-tier-or-basis/);
    refused("scenario", [id], { title: "x" }, /evidence-tier-or-basis/);
  }
});

test("ids that are not valid slugs are refused by the schema, not by a second rule here", () => {
  refused("scenario", ["Not_A_Slug"], { title: "x" }, /not schema-valid/);
  refused("provider", ["has space"], { name: "x" }, /not schema-valid/);
  refused("family", ["no-colon"], { name: "x" }, /<provider>:<family-slug>/);
  refused("case", ["a-case"], { title: "x", type: "bogus" }, /not schema-valid/);
});

test("duplicate ids and paths are refused", () => {
  refused("provider", ["aws"], { name: "AWS" }, /already exists at records\/providers\/aws\.json/);
  refused("family", [aws], { name: "dup" }, /already exists/);
  refused("scenario", [firstOf("scenario").id], { title: "x" }, /already exists/);
  refused("case", [firstOf("case").id], { title: "x", type: "benign" }, /already exists/);
});

test("a source is one URL: duplicates are refused and the fragment is not stored", () => {
  const opts = { "source-type": "other", observer: "test-agent" };
  // a URL the imported records already cite (live-unpinned, id derived from the URL)
  refused("source", ["https://answers.netlify.com/t/change-to-the-netlify-authentication-token-format/106146#reply"], opts, /already exists at records\/sources\/answers-netlify-com\//);
  const p = plan("source", ["https://docs.example.org/a#frag"], opts);
  assert.equal(p.record.locator.url, "https://docs.example.org/a");
  assert.match(p.note, /locator/);
  assert.equal(p.record.observations[0].observedAt, today);
  assert.match(p.record.title, new RegExp(PLACEHOLDER.replace(/[()]/g, "\\$&")));
});

test("source safety: no credentials in URLs, no moving GitHub links, https only", () => {
  const opts = { "source-type": "other", observer: "test-agent" };
  refused("source", ["http://docs.example.org/a"], opts, /https URL/);
  refused("source", ["https://user:pw@docs.example.org/a"], opts, /credentials/);
  refused("source", ["https://docs.example.org/a?api_key=abc"], opts, /credential or signature/);
  refused("source", ["https://docs.example.org/a?X-Amz-Signature=abc"], opts, /credential or signature/);
  refused("source", ["https://github.com/example/repo/blob/main/README.md"], opts, /branch or tag/);
  refused("source", ["https://docs.example.org/a"], { observer: "x" }, /--source-type/);
  refused("source", ["https://docs.example.org/a"], { "source-type": "other" }, /--observer/);
  refused("source", ["https://docs.example.org/a"], { "source-type": "nonsense", observer: "x" }, /not schema-valid/);
  const sha = "0123456789abcdef0123456789abcdef01234567";
  const pinned = plan("source", [`https://github.com/example/repo/blob/${sha}/README.md`], { ...opts, "source-type": "scanner-rule-source" });
  assert.deepEqual(pinned.record.locator.pin, { kind: "commit-permalink", commit: sha });
  // a scanner's repository is a legitimate source even though its name is a forbidden id word
  plan("source", ["https://github.com/gitleaks/gitleaks/issues/1"], opts);
});

test("references must resolve", () => {
  refused("family", ["nosuchprovider:thing"], { name: "x" }, /unknown provider/);
  refused("case", ["a-case"], { title: "x", type: "benign", family: "aws:nothing" }, /unknown family/);
  refused("case", ["a-case"], { title: "x", type: "benign", scenario: "no-such-scenario" }, /unknown scenario/);
  refused("case", ["a-case"], { title: "x", type: "benign", family: `${aws}=nonsense` }, /role/);
  refused("scenario", ["a-scenario"], { title: "x", family: "aws:nothing" }, /unknown family/);
  refused("scenario", ["a-scenario"], { title: "x", "applies-to": "everyone" }, /applies-to/);
});

test("case scoping: no family means an unscopedReason placeholder; cross-family needs two", () => {
  const unscoped = plan("case", ["a-generic-case"], { title: "x", type: "benign" }).record;
  assert.deepEqual(unscoped.families, []);
  assert.ok(unscoped.unscopedReason.includes(PLACEHOLDER));
  refused("case", ["a-cross-case"], { title: "x", type: "cross-family", family: aws }, /not schema-valid/);
  const pinned = plan("case", ["a-pinned-case"], { title: "x", type: "benign", family: `${aws}@1=subject` }).record;
  assert.equal(pinned.families[0].contract, `${aws}@1`);
});

test("layout: the planned path matches where existing records live", () => {
  const checks = { provider: 0, family: 0, contract: 0 };
  for (const { path, record } of index) {
    if (path.startsWith("migration/")) continue;
    let planned;
    if (record.kind === "provider") planned = `records/providers/${record.id}.json`;
    else if (record.kind === "family") planned = `records/families/${record.provider}/${record.id.split(":")[1]}.json`;
    else if (record.kind === "format-contract") planned = `records/contracts/${record.family.replace(":", "/")}@${record.revision}.json`;
    else continue;
    assert.equal(path, planned);
    checks[record.kind === "format-contract" ? "contract" : record.kind] += 1;
  }
  assert.ok(Object.values(checks).every((n) => n > 0));
  // and the scaffolder uses that same layout
  assert.equal(plan("family", ...SAMPLES.family).path, "records/families/aws/brand-new-token.json");
  assert.equal(plan("provider", ...SAMPLES.provider).path, "records/providers/examplevendor.json");
});

function cli(script, args) {
  return spawnSync(process.execPath, [join(repoRoot, "scripts", script), ...args], { encoding: "utf8" });
}

test("CLI end to end in a scratch root: create, refuse duplicates, fail until filled, pass once filled", () => {
  const root = mkdtempSync(join(tmpdir(), "record-new-"));
  try {
    const run = (...a) => cli("record-new.mjs", [...a, "--root", root, "--date", today]);
    const ok = (r) => assert.equal(r.status, 0, r.stderr + r.stdout);
    ok(run("provider", "examplevendor", "--name", "Example Vendor"));
    ok(run("family", "examplevendor:api-key", "--name", "API key", "--description", "A 32-character key that the vendor documents."));
    ok(run("contract", "examplevendor:api-key"));
    ok(run("scenario", "documentation-example-value", "--title", "A documentation example value", "--family", "examplevendor:api-key"));
    ok(run("case", "example-key-in-readme", "--title", "Example key in a README", "--type", "benign", "--family", "examplevendor:api-key=lookalike", "--scenario", "documentation-example-value"));
    ok(run("source", "https://docs.example.org/keys", "--source-type", "provider-documentation", "--observer", "test-agent", "--title", "Keys"));

    const dup = run("provider", "examplevendor", "--name", "Again");
    assert.equal(dup.status, 1);
    assert.match(dup.stderr, /already exists/);
    assert.equal(run("scenario", "beta9-1-thing", "--title", "x").status, 1);
    assert.equal(run("nonsense", "x").status, 2);
    assert.equal(run("provider", "--bogus-flag").status, 2);
    const dry = run("provider", "dryvendor", "--name", "Dry", "--dry-run");
    assert.equal(dry.status, 0);
    assert.match(dry.stdout, /would write records\/providers\/dryvendor\.json/);
    assert.equal(loadIndex(root).some((e) => e.record.id === "dryvendor"), false);

    // unfilled: the unfilled skeletons fail both record:check and validate
    const tree = validateTree([join(root, "records")], { root });
    assert.ok(tree.errors.some((e) => e.includes("placeholder:")), tree.errors.join("\n"));
    const before = checkRecordFiles(["records/cases/example-key-in-readme.json"], { root });
    assert.ok(before.errors.some((e) => e.includes("placeholder:")));
    assert.deepEqual(before.errors.filter((e) => !e.includes("placeholder:")), []);

    // fill every placeholder, as an author would
    for (const e of loadIndex(root)) {
      const text = readFileSync(join(root, e.path), "utf8");
      if (text.includes(PLACEHOLDER)) writeFileSync(join(root, e.path), text.replace(/TODO\(record:new\): [^"]*/g, "Written by the author."));
    }
    const after = validateTree([join(root, "records")], { root });
    assert.deepEqual(after.errors, []);
    const r = cli("record-check.mjs", ["--root", root, "records"]);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.match(r.stdout, /^OK: 6 record file/);

    // record:check surfaces a broken reference on the changed record only
    const caseFile = join(root, "records/cases/example-key-in-readme.json");
    const rec = JSON.parse(readFileSync(caseFile, "utf8"));
    rec.scenarios = ["no-such-scenario"];
    writeFileSync(caseFile, `${JSON.stringify(rec, null, 2)}\n`);
    const broken = cli("record-check.mjs", ["--root", root, "records/cases/example-key-in-readme.json"]);
    assert.equal(broken.status, 1);
    assert.match(broken.stderr, /no-such-scenario/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("record:check passes on existing records", () => {
  const some = index.filter((e) => e.path.startsWith("records/") && ["case", "scenario", "family-narrative"].includes(e.record.kind)).slice(0, 12).map((e) => e.path);
  const { errors, checked } = checkRecordFiles(some, { root: repoRoot, validator });
  assert.deepEqual(errors, []);
  assert.equal(checked, some.length);
  const r = cli("record-check.mjs", ["--help"]);
  assert.equal(r.status, 0);
});

test("changedRecordFiles returns repository-relative record paths only", () => {
  for (const f of changedRecordFiles({ root: repoRoot })) assert.match(f, /^(records|migration|examples\/valid)\/.*\.json$/);
});
