// Materialize executable fixtures from cases and fixture sets.
//
// Pure and deterministic: `buildMaterialization` maps schema-valid `fixture-set` and
// `case` records to a file tree plus a manifest. A consumer (credential-eval) reads
// the tree and the manifest and needs no case semantics: each manifest entry already
// says which file to scan, whether it must, must not or may be flagged, and the
// exact byte ranges.
//
// The tree is derived data. It is never committed; `npm run fixtures:materialize --
// --check` verifies it (or the records it would be built from) against the digest.

import { createHash } from "node:crypto";

export const MATERIALIZE_VERSION = "2.1.0";
export const MANIFEST_FORMAT = "credential-evidence/materialized-fixtures";
// Version 2 (schema revision 1.3.0): a fixture projects a Case or a fixture-plan cell, so `case` is optional and `target`, `plan` and `basis` are added.
// Schema revision 1.5.0 (ADR 0012) adds two optional entry facts within version 2: `families` honours a per-fixture
// override, and an unresolved fixture may carry a non-asserting `candidateReading` next to its (empty) expected spans.
export const MANIFEST_FORMAT_VERSION = 2;

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * @param {{ sets: object[], cases: object[], scenarios: object[] }} input  schema-valid records
 * @returns {{ files: Map<string, Buffer>, manifest: object, manifestText: string, digest: string }}
 */
export function buildMaterialization({ sets, cases, scenarios = [] }) {
  const caseById = new Map(cases.map((c) => [c.id, c]));
  const scenarioById = new Map(scenarios.map((s) => [s.id, s]));
  const files = new Map();
  const entries = [];
  for (const set of [...sets].sort((a, b) => cmp(a.id, b.id))) {
    for (const item of set.fixtures) {
      const c = item.case ? caseById.get(item.case) : undefined;
      if (item.case && !c) throw new Error(`fixture ${item.id}: unknown case ${item.case}`);
      const sc = item.cell ? scenarioById.get(item.cell.scenario) : undefined;
      if (item.cell && !sc) throw new Error(`fixture ${item.id}: unknown scenario ${item.cell.scenario}`);
      const basis = set.evidence?.[item.evidence]?.basis ?? c?.expectation.basis ?? sc?.evidenceBasis.basis;
      const bytes = Buffer.from(item.text, "utf8");
      if (createHash("sha256").update(bytes).digest("hex") !== item.sha256) throw new Error(`fixture ${item.id}: sha256 does not match text`);
      const path = `${set.id}/${item.path}`;
      if (files.has(path)) throw new Error(`fixture ${item.id}: duplicate materialized path ${path}`);
      files.set(path, bytes);
      const entry = {
        id: item.id,
        path,
        sha256: item.sha256,
        bytes: bytes.length,
        expected: { outcome: item.expected.outcome, spans: item.expected.spans },
        target: item.case ? { type: "case", id: item.case } : { type: "scenario", id: item.cell.scenario, plan: item.cell.plan },
        ...(item.case ? { case: item.case } : {}),
        families: (item.families ?? (c ? c.families.map((f) => f.family) : item.cell.families)).slice().sort(cmp),
        basis,
        generated: set.generated,
      };
      if (item.context) entry.context = item.context;
      // Non-asserting (ADR 0012 decision 2): never part of `expected`, never scored.
      if (item.candidateReading) entry.candidateReading = { asserting: false, outcome: item.candidateReading.outcome, spans: item.candidateReading.spans };
      if (item.lineage) entry.lineage = { relation: item.lineage.relation, of: item.lineage.of, ...(item.lineage.mutationKind ? { mutationKind: item.lineage.mutationKind } : {}) };
      entries.push(entry);
    }
  }
  entries.sort((a, b) => cmp(a.id, b.id));
  const digest = createHash("sha256").update(JSON.stringify(entries)).digest("hex");
  const manifest = {
    format: MANIFEST_FORMAT,
    formatVersion: MANIFEST_FORMAT_VERSION,
    generator: `scripts/materialize-fixtures.mjs ${MATERIALIZE_VERSION}`,
    digest,
    count: entries.length,
    fixtures: entries,
  };
  return { files, manifest, manifestText: `${JSON.stringify(manifest, null, 2)}\n`, digest };
}
