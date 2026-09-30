import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkIntegrity, createValidator, listJson, repoRoot } from "../scripts/lib/validator.mjs";

export const validator = createValidator();
export const examplesDir = join(repoRoot, "examples", "valid");

/** Fresh deep copies of every example record as [{ path, record }]. */
export function exampleEntries() {
  return listJson(examplesDir).map((file) => ({
    path: file.slice(repoRoot.length + 1),
    record: JSON.parse(readFileSync(file, "utf8")),
  }));
}

export function example(kind, id) {
  const hit = exampleEntries().find((e) => e.record.kind === kind && e.record.id === id);
  if (!hit) throw new Error(`no example ${kind} ${id}`);
  return hit.record;
}

/** Schema errors for one record. */
export const errorsOf = (record) => validator.validateRecord(record);

/** Integrity errors after applying `mutate(entries)` to the example set. */
export function integrityAfter(mutate) {
  const entries = exampleEntries();
  mutate(entries, (kind, id) => entries.find((e) => e.record.kind === kind && e.record.id === id).record);
  return checkIntegrity(entries);
}
