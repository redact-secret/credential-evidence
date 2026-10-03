// The CI split (ADR 0015): the ordinary gate runs everywhere and needs no legacy checkout; the historical pinned
// checks run on their own paths, on dispatch and on release, against the pinned legacy commit, never its HEAD.
// Workflow changes stay least-privilege and SHA-pinned.

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import test from "node:test";
import YAML from "yaml";
import { HISTORICAL_PATHS, historicalScope, isHistoricalPath } from "../scripts/lib/historical-scope.mjs";
import { repoRoot } from "../scripts/lib/validator.mjs";

const wfDir = join(repoRoot, ".github", "workflows");
const load = (name) => YAML.parse(readFileSync(join(wfDir, name), "utf8"));
const text = (name) => readFileSync(join(wfDir, name), "utf8");
const steps = (wf, job) => wf.jobs[job].steps;
const runs = (wf, job) => steps(wf, job).map((s) => s.run ?? "").join("\n");
const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
const PIN = /LEGACY_REVISION = "([0-9a-f]{40})"/.exec(readFileSync(join(repoRoot, "scripts/migrate/lib/legacy-source.mjs"), "utf8"))[1];

test("every workflow is SHA-pinned, read-only by default and has no schedule", () => {
  for (const name of readdirSync(wfDir).filter((n) => n.endsWith(".yml"))) {
    const wf = load(name);
    assert.deepEqual(wf.permissions, { contents: "read" }, `${name}: top-level permissions are contents: read`);
    assert.ok(!("schedule" in (wf.on ?? {})), `${name} must not run on a schedule`);
    for (const m of text(name).matchAll(/uses:\s*(\S+)/g)) assert.match(m[1], /^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/, `${name}: ${m[1]} is pinned to a commit`);
    for (const [job, def] of Object.entries(wf.jobs)) if (def.permissions) assert.ok(name === "release.yml" && job === "release", `${name}/${job}: only the release job may widen permissions`);
  }
});

test("ci.yml: the ordinary job needs no legacy checkout and runs every ordinary check", () => {
  const ci = load("ci.yml");
  assert.deepEqual(Object.keys(ci.on).sort(), ["pull_request", "push", "workflow_dispatch"]);
  assert.deepEqual(ci.on.push.branches, ["main"]);
  const verify = runs(ci, "verify");
  for (const cmd of ["npm run validate", "npm run lint:identity", "npm run lint:narrative", "npm run lint:skills", "npm run lint:source-revision", "npm run baseline:check", "npm run fixtures:materialize:check", "npm test"]) assert.ok(verify.includes(cmd), cmd);
  assert.doesNotMatch(verify, /coverage:gaps/, "the coverage report is generated on demand, not a PR gate (#88)");
  const verifyText = YAML.stringify(ci.jobs.verify);
  assert.doesNotMatch(verifyText, /legacy|migrate:|export:legacy|parity|historical|LEGACY_BENCHMARKS_DIR|REQUIRE_LEGACY/i, "the ordinary gate does not touch the historical tier");
  assert.equal(ci.jobs.verify["timeout-minutes"] <= 20, true);
});

test("ci.yml: the historical job pins the legacy commit, decides its scope from the diff and runs the whole historical suite", () => {
  const ci = load("ci.yml");
  assert.equal(ci.env.LEGACY_REVISION, PIN, "the workflow pin equals LEGACY_REVISION in legacy-source.mjs");
  const hist = steps(ci, "historical");
  const legacy = hist.find((s) => s.with?.repository === "redact-secret/redact-secret-benchmarks");
  assert.equal(legacy.with.ref, "${{ env.LEGACY_REVISION }}", "the pin, never the legacy HEAD or a branch");
  assert.equal(legacy.if, "steps.scope.outputs.run == 'true'");
  assert.equal(legacy.with["persist-credentials"], false);
  const scope = hist.find((s) => s.id === "scope");
  assert.match(scope.run, /historical-scope\.mjs --base "\$PR_BASE" --head "\$PR_HEAD"/);
  assert.match(scope.run, /historical-scope\.mjs --base "\$PUSH_BEFORE" --head "\$PUSH_AFTER"/);
  assert.match(scope.run, /historical-scope\.mjs --always/, "dispatch (the periodic audit) and anything else always run");
  const main = hist.find((s) => /npm run historical:check/.test(s.run ?? ""));
  assert.equal(main.if, "steps.scope.outputs.run == 'true'");
  assert.equal(main.env.REQUIRE_LEGACY, "1", "a missing legacy checkout is a failure here, never a skip");
  assert.ok(main.env.LEGACY_BENCHMARKS_DIR.endsWith("/legacy-benchmarks"));
  // untrusted event data reaches the shell only through env, never interpolated into the script
  assert.doesNotMatch(scope.run, /\$\{\{/);
});

test("release.yml runs both tiers at the released commit against the pinned legacy commit", () => {
  const rel = load("release.yml");
  assert.equal(rel.env.LEGACY_REVISION, PIN);
  const v = runs(rel, "verify");
  for (const cmd of ["npm run validate", "npm run baseline:check", "npm run fixtures:materialize:check", "npm test", "npm run historical:check", "npm run release:check"]) assert.ok(v.includes(cmd), cmd);
  const legacy = steps(rel, "verify").find((s) => s.with?.repository === "redact-secret/redact-secret-benchmarks");
  assert.equal(legacy.with.ref, "${{ env.LEGACY_REVISION }}");
  assert.equal(steps(rel, "verify").find((s) => /historical:check/.test(s.run ?? "")).env.REQUIRE_LEGACY, "1");
  assert.deepEqual(Object.keys(rel.on), ["workflow_dispatch"]);
});

test("package scripts: npm test and npm run check are ordinary; historical:check is the whole pinned tier", () => {
  const s = pkg.scripts;
  assert.ok(!s.test.includes("historical") && s.test.includes("tests/*.test.mjs") && !s.test.includes("**"), "npm test does not recurse into tests/historical");
  assert.equal(s["test:historical"], 'node --test "tests/historical/*.test.mjs"');
  for (const part of ["baseline:check", "migrate:check", "export:legacy:check", "parity:check", "test:historical"]) assert.ok(s["historical:check"].includes(`npm run ${part}`), part);
  for (const part of ["validate", "lint:identity", "lint:narrative", "lint:skills", "lint:source-revision", "baseline:check", "npm test"]) assert.ok(s.check.includes(part), part);
  for (const part of ["migrate", "export:legacy", "parity", "historical"]) assert.ok(!s.check.includes(part), `npm run check must not include ${part}`);
  for (const name of readdirSync(join(repoRoot, "tests")).filter((n) => n.endsWith(".test.mjs") && n !== "workflows.test.mjs")) {
    const src = readFileSync(join(repoRoot, "tests", name), "utf8");
    assert.doesNotMatch(src, /REQUIRE_LEGACY|findLegacyDir|openLegacy|materializeLegacy/, `tests/${name} is ordinary and must not need the legacy checkout`);
  }
});

// ------------------------------------------------------------------ historical scope

const IMPORT = /(?:import|export)[^"'`]*?from\s+"(\.[^"]+)"|import\("(\.[^"]+)"\)|import\s+"(\.[^"]+)"/g;
function closure(entries) {
  const seen = new Set();
  const visit = (file) => {
    const rel = relative(repoRoot, file).split("\\").join("/");
    // test support modules (a scratch-repository helper) are not generator code: do not follow them
    if (seen.has(file) || !existsSync(file) || !file.endsWith(".mjs") || (rel.startsWith("tests/") && !rel.startsWith("tests/historical/"))) return;
    seen.add(file);
    for (const m of readFileSync(file, "utf8").matchAll(IMPORT)) visit(normalize(join(dirname(file), m[1] ?? m[2] ?? m[3])));
  };
  for (const e of entries) visit(join(repoRoot, e));
  return [...seen].map((f) => relative(repoRoot, f).split("\\").join("/")).sort();
}

test("the historical trigger paths cover every file the historical entry points and tests import", () => {
  const entries = [
    "scripts/migrate/import-taxonomy.mjs",
    "scripts/migrate/import-cases.mjs",
    "scripts/migrate/import-narratives.mjs",
    "scripts/export/legacy-projection.mjs",
    "scripts/parity/run.mjs",
    "scripts/dual-run/dual-run.mjs",
    "scripts/baseline.mjs",
    ...readdirSync(join(repoRoot, "tests", "historical")).filter((n) => n.endsWith(".mjs")).map((n) => `tests/historical/${n}`),
  ];
  const files = closure(entries);
  assert.ok(files.length > 40);
  const uncovered = files.filter((f) => !f.startsWith("tests/") && !isHistoricalPath(f));
  assert.deepEqual(uncovered, [], "a shared module the historical checks import must trigger them when it changes: add it to HISTORICAL_PATHS");
  // the release bundle and ordinary tooling import shared code too: they are not historical entry points
  assert.ok(!isHistoricalPath("scripts/lib/research-run.mjs") && !isHistoricalPath("scripts/lib/scaffold.mjs") && !isHistoricalPath("scripts/lib/tidy-scan.mjs"));
  for (const p of HISTORICAL_PATHS) assert.ok(existsSync(join(repoRoot, p)), `${p} exists`);
});

test("scope: a research or record change does not run the historical tier; importer, schema and workflow changes do", () => {
  const no = (paths) => assert.equal(historicalScope({ paths }).run, false, paths.join(","));
  const yes = (paths) => assert.equal(historicalScope({ paths }).run, true, paths.join(","));
  no(["records/families/acme/key.json", "records/providers/acme.json", "docs/research/README.md", ".agents/skills/research-family/SKILL.md", "docs/ops/research-cron.md", "README.md", "docs/decisions/0099-x.md", "docs/releases.md"]);
  no(["scripts/lib/research-run.mjs", "scripts/coverage-gaps.mjs", "tests/research-run.test.mjs"]);
  yes(["scripts/migrate/lib/classify.mjs"]);
  yes(["scripts/export/lib/projection.mjs"]);
  yes(["scripts/parity/rules.json"]);
  yes(["scripts/lib/validator.mjs"]);
  yes(["schemas/v1/common.schema.json"]);
  yes(["migration/legacy-map/accuracy.json"]);
  yes(["docs/migration/baseline-manifest.json"]);
  yes(["tests/historical/amended-tree.test.mjs"]);
  yes([".github/workflows/ci.yml"]);
  yes(["package-lock.json"]);
  yes(["records/families/acme/key.json", "scripts/export/legacy-vocabulary.json"]);
  // fail closed
  assert.equal(historicalScope({ paths: null }).run, true);
  assert.equal(historicalScope({ paths: ["README.md"], always: true }).run, true);
  assert.match(historicalScope({ paths: ["README.md"] }).reason, /none of 1 changed path/);
});

test("the legacy checkout is reached only through legacy-source.mjs (the pin), and tests/scripts never read its working tree", () => {
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name);
      if (name.isDirectory()) walk(p);
      else if (name.name.endsWith(".mjs") && /process\.env\.LEGACY_BENCHMARKS_DIR|["'`]LEGACY_BENCHMARKS_DIR["'`]/.test(readFileSync(p, "utf8"))) offenders.push(relative(repoRoot, p).split("\\").join("/"));
    }
  };
  walk(join(repoRoot, "scripts"));
  assert.deepEqual(offenders.sort(), ["scripts/lib/research-run.mjs", "scripts/migrate/lib/legacy-source.mjs"], "only the resolver (and the harness's environment scrub) names LEGACY_BENCHMARKS_DIR");
});
