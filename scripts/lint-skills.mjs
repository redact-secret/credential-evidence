#!/usr/bin/env node
// npm run lint:skills   validate agent skills under .agents/skills/
//
// Checks each SKILL.md's frontmatter, that the npm scripts and relative paths it names exist,
// that .claude/skills carries a symlink for it, and that it does not instruct product-status
// semantics or detector-id-as-identity. Offline and deterministic. An optional argument
// points at another repository root (the tests use it for seeded broken skills).

import { resolve } from "node:path";
import { lintSkills } from "./lib/skill-lint.mjs";
import { repoRoot } from "./lib/validator.mjs";

const root = process.argv[2] ? resolve(process.argv[2]) : repoRoot;
const { errors, skills } = lintSkills(root);

if (errors.length) {
  for (const e of errors.slice(0, 50)) console.error(e);
  if (errors.length > 50) console.error(`... and ${errors.length - 50} more`);
  console.error(`\nFAIL: ${errors.length} skill problem(s) across ${skills.length} skill(s)`);
  process.exit(1);
}
console.log(`OK: ${skills.length} skill(s) checked, 0 problems`);
