// Skill lint rules. Pure over a repository root so tests can aim it at seeded fixtures.
//
// A skill is a directory under .agents/skills/ holding a SKILL.md. Directories whose
// name starts with "_" (for example _shared) are reference material, not skills.

import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { parse as parseYaml } from "yaml";

export const KNOWN_KEYS = new Set([
  "name",
  "description",
  "license",
  "compatibility",
  "metadata",
  "allowed-tools",
  "argument-hint",
  "model",
  "user-invocable",
  "disable-model-invocation",
]);
export const DESCRIPTION_MIN = 40;
export const DESCRIPTION_MAX = 1024;

const PATH_EXT = /\.(md|json|mjs|js|yml|yaml|txt|sh)$/;
// A line that tells the agent NOT to do something is the guard, not the violation.
const NEGATION = /\b(not|never|no|without|forbidden|must not|do not|don't|neither|nor)\b/i;
const STATUS_WORD = /\b(stable|provisional|pending)\b/i;
const STATUS_CONTEXT = /\b(status|state|tier|classif\w*|label\w*|verdict|count|support\w*|mark\w*|set|assign\w*)\b/i;
const DETECTOR_IDENTITY = [
  /\bdetector[-_ ]?(id|name|key)s?\b/i,
  /\b(identity|identif\w*|key|keyed|id)\b[^.\n]{0,40}\b(by|from|on|using)\b[^.\n]{0,20}\bdetector\b/i,
  /\bdetector\b[^.\n]{0,30}\bas (the |an? )?(id|identity|key|identifier)\b/i,
];

export function listSkillDirs(root) {
  const dir = join(root, ".agents", "skills");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();
}

/** Split `---` frontmatter from the body. Returns { data, body, error }. */
export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return { error: "missing YAML frontmatter (expected a leading --- block)" };
  let data;
  try {
    data = parseYaml(m[1]);
  } catch (e) {
    return { error: `frontmatter is not valid YAML: ${e.message.split("\n")[0]}` };
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) return { error: "frontmatter must be a YAML mapping" };
  return { data, body: m[2] };
}

function inside(root, p) {
  return p === root || p.startsWith(root + sep);
}

function isLocalPathToken(tok) {
  if (!/^[\w.@~-][\w./@-]*$/.test(tok)) return false;
  if (/^(https?:|\.\.\.)/.test(tok) || tok.includes("..") && !tok.startsWith("../")) return false;
  const last = tok.split("/").pop();
  return PATH_EXT.test(last) && !/^\d+(\.\d+)+$/.test(last);
}

function collectPaths(body) {
  const out = [];
  for (const m of body.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = m[1].split("#")[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("//")) continue;
    out.push({ ref: target, kind: "link" });
  }
  for (const m of body.matchAll(/`([^`\n]+)`/g)) {
    const tok = m[1].trim();
    if (isLocalPathToken(tok)) out.push({ ref: tok, kind: "path" });
  }
  return out;
}

function lintBody(rel, body, lineOffset, scripts, root, skillDir, errors) {
  for (const m of body.matchAll(/\bnpm\s+(?:run(?:-script)?\s+)([\w:.-]+)/g)) {
    if (!(m[1] in scripts)) errors.push(`${rel}: references \`npm run ${m[1]}\`, which is not in package.json scripts`);
  }
  if (/\bnpm\s+test\b/.test(body) && !("test" in scripts)) errors.push(`${rel}: references \`npm test\`, which is not in package.json scripts`);

  for (const { ref, kind } of collectPaths(body)) {
    const candidates = [resolve(root, ref), resolve(skillDir, ref)];
    if (!candidates.some((c) => inside(root, c) && existsSync(c))) errors.push(`${rel}: ${kind} \`${ref}\` does not exist (checked from repo root and the skill directory)`);
  }

  body.split(/\r?\n/).forEach((line, i) => {
    if (/lint-skills:\s*allow/.test(line)) return;
    const where = `${rel}:${i + 1 + lineOffset}`;
    if (STATUS_WORD.test(line) && STATUS_CONTEXT.test(line) && !NEGATION.test(line)) {
      errors.push(`${where} product-status semantics (${STATUS_WORD.exec(line)[1].toLowerCase()}) are not a repository concept; measurement and status belong to the product repo`);
    }
    if (DETECTOR_IDENTITY.some((re) => re.test(line)) && !NEGATION.test(line)) {
      errors.push(`${where} detector id used as identity; identity comes from provider/family/case, never a detector (ADR 0007)`);
    }
  });
}

/** Lint every skill under `root`. Returns { errors, skills } with deterministic ordering. */
export function lintSkills(root) {
  const errors = [];
  let scripts = {};
  try {
    scripts = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts ?? {};
  } catch {
    errors.push("package.json: missing or unparsable");
  }

  const names = listSkillDirs(root);
  const claudeDir = join(root, ".claude", "skills");

  for (const name of names) {
    const skillDir = join(root, ".agents", "skills", name);
    const file = join(skillDir, "SKILL.md");
    const rel = `.agents/skills/${name}/SKILL.md`;

    if (!existsSync(file)) {
      errors.push(`${rel}: missing SKILL.md`);
    } else {
      const text = readFileSync(file, "utf8");
      const fm = parseFrontmatter(text);
      if (fm.error) {
        errors.push(`${rel}: ${fm.error}`);
      } else {
        const { data, body } = fm;
        if (data.name !== name) errors.push(`${rel}: frontmatter name ${JSON.stringify(data.name)} must equal the directory name "${name}"`);
        const d = data.description;
        if (typeof d !== "string" || !d.trim()) errors.push(`${rel}: frontmatter description is required`);
        else if (d.trim().length < DESCRIPTION_MIN) errors.push(`${rel}: description is ${d.trim().length} chars; say when to use the skill (>= ${DESCRIPTION_MIN})`);
        else if (d.length > DESCRIPTION_MAX) errors.push(`${rel}: description is ${d.length} chars (> ${DESCRIPTION_MAX})`);
        for (const key of Object.keys(data)) if (!KNOWN_KEYS.has(key)) errors.push(`${rel}: unknown frontmatter key "${key}"`);
        lintBody(rel, body, text.slice(0, text.length - body.length).split("\n").length - 1, scripts, root, skillDir, errors);
      }
    }

    const link = join(claudeDir, name);
    let st = null;
    try {
      st = lstatSync(link);
    } catch {
      // handled below
    }
    if (!st) errors.push(`.claude/skills/${name}: missing symlink to ../../.agents/skills/${name}`);
    else if (!st.isSymbolicLink()) errors.push(`.claude/skills/${name}: must be a symlink to ../../.agents/skills/${name}, not a copy`);
    else {
      let target = null;
      try {
        target = realpathSync(link);
      } catch {
        // dangling
      }
      if (target !== realpathSync(skillDir)) errors.push(`.claude/skills/${name}: symlink does not resolve to .agents/skills/${name}`);
    }
  }

  // Symlinks into .agents/skills with no skill behind them.
  if (existsSync(claudeDir)) {
    for (const d of readdirSync(claudeDir, { withFileTypes: true })) {
      if (!d.isSymbolicLink() || names.includes(d.name)) continue;
      errors.push(`.claude/skills/${d.name}: symlink has no matching skill in .agents/skills/ (stale or dangling)`);
    }
  }

  return { errors, skills: names };
}

