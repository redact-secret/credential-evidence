#!/usr/bin/env node
// npm run record:new -- <kind> <arg> [flags]
// Writes a valid, draft skeleton of one canonical record under records/. See docs/authoring.md.
// Deterministic: same arguments and --date give the same bytes. Never overwrites a file,
// never fetches, never invents a claim.

import { parseArgs } from "node:util";
import { PLACEHOLDER, placeholderLocations } from "./lib/placeholders.mjs";
import { planRecord, ScaffoldError, serialize, SCAFFOLD_KINDS, SOURCE_TYPES, writeRecord } from "./lib/scaffold.mjs";
import { baselineOwners, declareAmendment, loadAmendments } from "./lib/baseline.mjs";
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
  variant   <variant-slug>              --family <id> --name <name> --variant-type <t> --change <c>
                                        [--contract <id>] [--replaces <variant-slug>] [--description <text>]
  benign-sibling <sibling-slug>         --family <id>... --sibling-class <c> --name <name> [--description <text>]
  family-narrative <provider>:<family-slug>   [--contract <id>]    (one unresolved placeholder per section)
  review    <kind>:<subject-id>         --actor <slug> [--role author|automation|contributor] [--affiliation <a>]
                                        [--event authored|observed|corrected|disputed] [--verdict <v>] [--note <text>]
                                        [--unresolved <section>/<statement-id>=<reason>]... [--append]
                                        kind: family, family-narrative, case, variant, benign-sibling, scenario,
                                        format-contract or evidence-source. --unresolved takes <section>/<id>=<reason> for a
                                        family-narrative and <id>=<reason> for every other subject.
  fixture   <case-slug>                 --set <set-slug> --name <slug> (--text <value> | --text-file <path>)
                                        [--secret <substring>]... [--context <slug>] [--path <p>] [--title <set title>]
                                        (sha256, byte spans and outcome are computed; the case must be assertable)

common: --date <YYYY-MM-DD> (default: today, UTC)   --dry-run (print, write nothing)   --root <dir>

The skeleton is a draft. Every field to write holds ${PLACEHOLDER}; 'npm run validate' fails until none is left.
Next: edit the file, then 'npm run record:check -- <path>'.`;

const MULTI = ["alias", "family", "class", "type", "scenario", "secret", "unresolved"];
const STRINGS = ["name", "title", "homepage", "description", "revision", "source-type", "observer", "observed-at", "applies-to", "date", "root", "variant-type", "change", "sibling-class", "contract", "replaces", "actor", "role", "affiliation", "event", "verdict", "note", "set", "text", "text-file", "context", "path"];

let parsed;
try {
  parsed = parseArgs({
    allowPositionals: true,
    options: {
      ...Object.fromEntries(MULTI.map((k) => [k, { type: "string", multiple: true }])),
      ...Object.fromEntries(STRINGS.map((k) => [k, { type: "string" }])),
      "dry-run": { type: "boolean" },
      append: { type: "boolean" },
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
    console.log(`${plan.append ? "appended to" : "created"} ${plan.path}`);
    // appending to a record of the import baseline is an amendment: declare it with the tool's own cause (ADR 0015)
    if (plan.append && baselineOwners(root).has(plan.path) && !loadAmendments(root).amendments.some((x) => x.path === plan.path)) {
      const a = declareAmendment({ root, path: plan.path, reason: `record:new appended a ${plan.record.events.at(-1).type} event to an imported review history` });
      console.log(`declared baseline amendment (${a.change}) for ${plan.path}`);
    }
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
