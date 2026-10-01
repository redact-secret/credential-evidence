// Placeholder lint: a record scaffolded by `npm run record:new` marks every field a
// human or agent still has to write with PLACEHOLDER. Any record that still carries it
// fails validation, so a skeleton cannot be merged unfilled. Pure and deterministic.
//
// fixture-set and legacy-map records are skipped: their text is arbitrary content or
// verbatim legacy material, not prose an author fills in.

export const PLACEHOLDER = "TODO(record:new)";
const SKIPPED_KINDS = ["fixture-set", "legacy-map"];

/** JSON-pointer-like locations of every string that contains the placeholder marker. */
export function placeholderLocations(value, where = "") {
  const out = [];
  if (typeof value === "string") {
    if (value.includes(PLACEHOLDER)) out.push(where || "/");
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => out.push(...placeholderLocations(v, `${where}/${i}`)));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) out.push(...placeholderLocations(v, `${where}/${k}`));
  }
  return out;
}

/** Error strings for every record that still carries a scaffold placeholder. */
export function checkPlaceholders(entries) {
  const errors = [];
  for (const { path, record } of entries) {
    if (!record || SKIPPED_KINDS.includes(record.kind)) continue;
    for (const loc of placeholderLocations(record)) {
      errors.push(`${path}: placeholder: ${loc} still holds ${PLACEHOLDER}; write the field (docs/authoring.md)`);
    }
  }
  return errors.sort();
}
