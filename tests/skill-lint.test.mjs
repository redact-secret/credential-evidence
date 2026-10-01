import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { lintSkills } from "../scripts/lib/skill-lint.mjs";
import { repoRoot } from "../scripts/lib/validator.mjs";

const GOOD_DESC = "Do a bounded piece of evidence work end to end. Use when asked to exercise the fixture skill.";
const GOOD_BODY = "# Fixture skill\n\nRun `npm run validate`, then read [the rules](rules.md) and `docs/spec.md`.\n";

/** Build a throwaway repo root with one skill; `opts` override pieces to seed a defect. */
function build(opts = {}) {
  const root = mkdtempSync(join(tmpdir(), "skill-lint-"));
  const name = opts.name ?? "fixture-skill";
  const put = (rel, text) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  };
  put("package.json", JSON.stringify({ scripts: { validate: "x", check: "x", ...opts.scripts } }));
  put("docs/spec.md", "spec\n");
  const front = opts.frontmatter ?? `name: ${name}\ndescription: ${GOOD_DESC}`;
  put(`.agents/skills/${name}/SKILL.md`, opts.raw ?? `---\n${front}\n---\n\n${opts.body ?? GOOD_BODY}`);
  if (opts.rules !== false) put(`.agents/skills/${name}/rules.md`, "rules\n");
  if (opts.shared) put(".agents/skills/_shared/README.md", "not a skill\n");
  mkdirSync(join(root, ".claude", "skills"), { recursive: true });
  if (opts.link !== false) symlinkSync(`../../.agents/skills/${name}`, join(root, ".claude", "skills", name));
  if (opts.copy) put(`.claude/skills/${name}/SKILL.md`, "copy\n");
  if (opts.stale) symlinkSync("../../.agents/skills/gone", join(root, ".claude", "skills", "gone"));
  return root;
}

function problems(opts) {
  const root = build(opts);
  try {
    return lintSkills(root).errors;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const has = (errors, re) => errors.some((e) => re.test(e));

test("the real repository skills pass", () => {
  const { errors, skills } = lintSkills(repoRoot);
  assert.deepEqual(errors, []);
  assert.ok(skills.length >= 8);
});

test("npm run lint:skills exits 0 on the repo and nonzero on a seeded broken skill", () => {
  const script = join(repoRoot, "scripts", "lint-skills.mjs");
  assert.equal(spawnSync("node", [script], { encoding: "utf8" }).status, 0);
  const root = build({ frontmatter: "name: other\ndescription: short" });
  try {
    const r = spawnSync("node", [script, root], { encoding: "utf8" });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /FAIL: \d+ skill problem/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the checked-in seeded broken skill fails on every rule", () => {
  const root = join(repoRoot, "tests", "fixtures", "broken-skills");
  const { errors } = lintSkills(root);
  for (const re of [/must equal the directory name/, /description is \d+ chars/, /unknown frontmatter key "colour"/, /npm run missing-script/, /docs\/missing.md/, /product-status semantics/, /detector id used as identity/, /missing symlink/]) {
    assert.ok(has(errors, re), `expected a problem matching ${re}`);
  }
  assert.equal(spawnSync("node", [join(repoRoot, "scripts", "lint-skills.mjs"), root], { encoding: "utf8" }).status, 1);
});

test("a well-formed fixture skill passes, and _shared is not treated as a skill", () => {
  assert.deepEqual(problems({ shared: true }), []);
});

test("frontmatter: missing, name mismatch, weak description, unknown key", () => {
  assert.ok(has(problems({ raw: "# no frontmatter\n" }), /missing YAML frontmatter/));
  assert.ok(has(problems({ frontmatter: `name: wrong\ndescription: ${GOOD_DESC}` }), /must equal the directory name/));
  assert.ok(has(problems({ frontmatter: "name: fixture-skill" }), /description is required/));
  assert.ok(has(problems({ frontmatter: "name: fixture-skill\ndescription: too short" }), /description is \d+ chars/));
  assert.ok(has(problems({ frontmatter: `name: fixture-skill\ndescription: ${GOOD_DESC}\ncolour: red` }), /unknown frontmatter key "colour"/));
  assert.ok(has(problems({ frontmatter: "name: [unclosed" }), /not valid YAML/));
});

test("references: unknown npm script, missing link target, missing path", () => {
  assert.ok(has(problems({ body: "Run `npm run nope:missing`.\n" }), /npm run nope:missing/));
  assert.ok(has(problems({ body: "See [x](absent.md).\n" }), /link `absent.md` does not exist/));
  assert.ok(has(problems({ body: "Read `docs/absent.json`.\n" }), /path `docs\/absent.json` does not exist/));
  assert.deepEqual(problems({ body: "See [web](https://example.com/a.md) and [top](#anchor).\n" }), []);
});

test("symlinks: missing, a copy instead of a link, and a stale link", () => {
  assert.ok(has(problems({ link: false }), /missing symlink/));
  assert.ok(has(problems({ link: false, copy: true }), /must be a symlink/));
  assert.ok(has(problems({ stale: true }), /gone: symlink has no matching skill/));
});

test("product-status semantics are flagged unless the line forbids them", () => {
  assert.ok(has(problems({ body: "Mark the case stable status in the record.\n" }), /product-status semantics \(stable\)/));
  assert.ok(has(problems({ body: "Set the family to provisional.\n" }), /product-status semantics \(provisional\)/));
  assert.deepEqual(problems({ body: "Never assign a stable status.\n" }), []);
});

test("detector id as identity is flagged unless the line forbids it", () => {
  assert.ok(has(problems({ body: "Key each case by detector id.\n" }), /detector id used as identity/));
  assert.ok(has(problems({ body: "Use the detector as the identifier of the case.\n" }), /detector id used as identity/));
  assert.deepEqual(problems({ body: "Never derive identity from a detector id.\n" }), []);
});
