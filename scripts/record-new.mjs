#!/usr/bin/env node
// npm run record:new -- <kind> <arg> [flags]
// Writes a valid, draft skeleton of one canonical record under records/. See docs/authoring.md.
// Deterministic: same arguments and --date give the same bytes. Never overwrites a file,
// never fetches, never invents a claim.

import { parseArgs } from "node:util";
import { PLACEHOLDER, placeholderLocations } from "./lib/placeholders.mjs";
import { planRecord, ScaffoldError, serialize, SCAFFOLD_KINDS, SOURCE_TYPES, writeRecord } from "./lib/scaffold.mjs";
import { repoRoot } from "./lib/validator.mjs";

const USAGE = `usage: npm run record:new -- <kind> <arg> [flags]

  provider  <provider-id>               --name <name> [--alias <a>]... [--homepage <https-url>]
  family    <provider>:<family-slug>    --name <name> [--description <text>]
  contract  <provider>:<family-slug>    [--revision <next>]       (revision and supersedes are computed)
  source    <https-url>                 --source-type <${SOURCE_TYPES.join("|")}>
                                        --observer <slug> [--title <text>] [--observed-at <YYYY-MM-DD>]
  scenario  <scenario-slug>             --title <text> [--family <id>]... [--class <slug>]...
                                        [--applies-to any-family|families|family-classes]
  case      <case-slug>                 --title <text> --type <t>[,<t>]... [--family <id>[@<rev>][=<role>]]...
                                        [--scenario <slug>]...

common: --date <YYYY-MM-DD> (default: today, UTC)   --dry-run (print, write nothing)   --root <dir>

The skeleton is a draft. Every field to write holds ${PLACEHOLDER}; 'npm run validate' fails until none is left.
Next: edit the file, then 'npm run record:check -- <path>'.`;

const MULTI = ["alias", "family", "class", "type", "scenario"];
const STRINGS = ["name", "title", "homepage", "description", "revision", "source-type", "observer", "observed-at", "applies-to", "date", "root"];

let parsed;
try {
  parsed = parseArgs({
    allowPositionals: true,
    options: {
      ...Object.fromEntries(MULTI.map((k) => [k, { type: "string", multiple: true }])),
      ...Object.fromEntries(STRINGS.map((k) => [k, { type: "string" }])),
      "dry-run": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
} catch (e) {
  console.error(`usage error: ${e.message}\n\n${USAGE}`);
  process.exit(2);
}
const { values, positionals } = parsed;
if (values.help || !positionals.length) {
  console.log(USAGE);
  process.exit(values.help ? 0 : 2);
}
const [kind, ...args] = positionals;
if (!SCAFFOLD_KINDS.includes(kind)) {
  console.error(`usage error: unknown kind '${kind}'; one of ${SCAFFOLD_KINDS.join(", ")}\n\n${USAGE}`);
  process.exit(2);
}

try {
  const root = values.root ?? repoRoot;
  const plan = planRecord(kind, args, values, { root, ...(values.date ? { today: values.date } : {}) });
  if (values["dry-run"]) {
    console.log(`# would write ${plan.path}`);
    process.stdout.write(serialize(plan.record));
  } else {
    writeRecord(plan, root);
    console.log(`created ${plan.path}`);
  }
  if (plan.note) console.log(`note: ${plan.note}`);
  const todos = placeholderLocations(plan.record);
  if (todos.length) console.log(`${todos.length} field(s) to write (${PLACEHOLDER}): ${todos.join(", ")}`);
  console.log(`next: edit, then npm run record:check -- ${plan.path}`);
} catch (e) {
  if (!(e instanceof ScaffoldError)) throw e;
  console.error(`error: ${e.message}`);
  process.exit(1);
}
