// Builds the family-narrative records (ADR 0010) from the authored narrative files.
//
// This is not a bulk import. The legacy dossier prose is read by a person, rewritten in
// scanner-neutral language, and each statement is authored with its citations in
// scripts/migrate/authored/narratives/<provider>.mjs. This module compiles those authored
// files into canonical records and refuses anything that cannot be traced:
//
//   - a statement cites a source (by URL) or a claim of the family's contract (by id), or is
//     unresolved with a reason; there is no third kind;
//   - a cited source must be one the family's own contract already cites, so a narrative can
//     only lean on sources the taxonomy import recorded for that family;
//   - a claim must exist, and an unresolved claim cannot support a statement.
//
// Authored statement shape:
//   { id, text, cls, cite: [url | { url, locator }], claims: [claimId], unresolved: "reason",
//     lead: [url | { url, locator }], leadClaims: [claimId], historical: true, at: "YYYY-MM-DD" }
// `lead` and `leadClaims` are for unresolved statements: sources that point at the statement
// without establishing it.
// `at` defaults to the family's research date (when the dossier research was last confirmed);
// it is never the authoring date.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { listJson } from "../../lib/validator.mjs";
import { sourceIdFor, splitUrl } from "./sources.mjs";

export const NARRATIVE_DIR = "records/narratives";
export const REVIEW_DIR = "records/narrative-reviews";
export const OWNED_DIRS = [NARRATIVE_DIR, REVIEW_DIR];
export const AUTHORED_DIR = "scripts/migrate/authored/narratives";
export const GENERATOR = "import-narratives 1.0.0";

// The date the narratives were authored (an event date, not an observed-at date).
export const AUTHORED_AT = "2026-09-30";
export const AUTHOR = { id: "milocosmopolitan", role: "author", affiliation: "project-maintainer" };
export const SECTION_ORDER = ["shape", "issuance", "lifecycle", "collisions", "openQuestions"];
export const STATUSES = ["migrated", "partial"];

const json = (v) => `${JSON.stringify(v, null, 2)}\n`;

/** Load every authored provider file: [{ file, data }]. */
export async function loadAuthored(root) {
  const dir = join(root, AUTHORED_DIR);
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith(".mjs")).sort()) {
    out.push({ file: `${AUTHORED_DIR}/${name}`, data: (await import(pathToFileURL(join(dir, name)).href)).default });
  }
  return out;
}

/** Canonical records the builder resolves citations against. */
export function loadCanonical(root) {
  const read = (sub) => listJson(join(root, "records", sub)).map((f) => JSON.parse(readFileSync(f, "utf8")));
  return {
    families: new Map(read("families").map((r) => [r.id, r])),
    contracts: new Map(read("contracts").map((r) => [r.id, r])),
    sources: new Map(read("sources").map((r) => [r.id, r])),
  };
}

function resolveCitations({ claims, cite }, ctx, err) {
  const { contract, allowedSources, canonical, claimsUsed } = ctx;
  const citations = [];
  for (const claimId of claims ?? []) {
    claimsUsed.add(claimId);
    if (!contract) err(`cites claim '${claimId}' but the family has no contract`);
    else if (!contract.claims.some((c) => c.id === claimId)) err(`cites unknown claim '${claimId}' of ${contract.id}`);
    citations.push({ kind: "claim", claimId });
  }
  for (const c of cite ?? []) {
    const { url, locator } = typeof c === "string" ? { url: c } : c;
    const { base, fragment } = splitUrl(url);
    const id = sourceIdFor(base).id;
    if (!canonical.sources.has(id)) err(`cites ${base}, which is no evidence-source record`);
    else if (!allowedSources.has(id)) err(`cites ${base}, which no claim of ${contract?.id ?? "the family contract"} cites; a narrative may only use sources already recorded for its family`);
    const ref = { kind: "source", sourceId: id };
    const loc = locator ?? (fragment || undefined);
    if (loc) ref.locator = loc;
    citations.push(ref);
  }
  return citations;
}

function buildStatement(s, ctx) {
  const { where, family, errors } = ctx;
  const err = (m) => errors.push(`${where} '${s.id}': ${m}`);
  const out = {
    id: s.id,
    text: s.text,
    evidenceClass: s.unresolved ? "unresolved" : s.cls,
    temporality: s.historical ? "historical" : "current",
    observedAt: s.at ?? family.research.researchedAt,
  };
  if (!out.observedAt) err("no observed-at date: give `at` (the family has no research date)");
  if (s.unresolved) {
    if (s.cite?.length || s.claims?.length) err("an unresolved statement carries no citations (use lead for a source that only points at it)");
    if (typeof s.unresolved !== "string" || !s.unresolved.trim()) err("unresolved needs a reason");
    const leads = resolveCitations({ claims: s.leadClaims, cite: s.lead }, ctx, err);
    if (leads.length) out.leads = leads;
    return { statement: out, reason: s.unresolved };
  }
  if (s.lead?.length || s.leadClaims?.length) err("lead belongs on an unresolved statement");
  if (!["provider-documented", "tool-corroborated", "project-policy"].includes(s.cls)) err(`cls must be provider-documented, tool-corroborated or project-policy (got ${JSON.stringify(s.cls)})`);
  const citations = resolveCitations({ claims: s.claims, cite: s.cite }, ctx, err);
  if (!citations.length) err("no citation: cite a source or a claim, or mark the statement unresolved");
  out.citations = citations;
  return { statement: out };
}

/**
 * @returns {{ files: Map<string,string>, narratives: object[], rows: object[], dropped: object[] }}
 * `rows` are the accounting rows (one per authored family) and `dropped` the dossier content
 * deliberately not carried, both for the report.
 */
export function buildNarratives({ authored, canonical, legacyRevision }) {
  const errors = [];
  const files = new Map();
  const narratives = [];
  const rows = [];
  const dropped = [];
  const seenFamily = new Set();

  for (const { file, data } of authored) {
    const dossierPath = `benchmarks/support/dossiers/${data.provider}.md`;
    for (const d of data.dropped ?? []) {
      if (!d.part || !d.reason) errors.push(`${file}: a dropped entry needs part and reason`);
      dropped.push({ provider: data.provider, ...d });
    }
    for (const fam of data.families) {
      const where = `${file} ${fam.id}`;
      const family = canonical.families.get(fam.id);
      if (!family) {
        errors.push(`${where}: no such family record`);
        continue;
      }
      if (family.provider !== data.provider) errors.push(`${where}: family belongs to provider '${family.provider}'`);
      if (seenFamily.has(fam.id)) errors.push(`${where}: authored twice`);
      seenFamily.add(fam.id);
      if (!STATUSES.includes(fam.status)) errors.push(`${where}: status must be one of ${STATUSES.join(", ")}`);
      if (fam.status === "partial" && !fam.note) errors.push(`${where}: a partial family states what is missing (note)`);

      const contractId = `${fam.id}@1`;
      const contract = canonical.contracts.get(contractId);
      const allowedSources = new Set((contract?.claims ?? []).flatMap((c) => c.sources.map((s) => s.sourceId)));
      const claimsUsed = new Set();
      const sections = {};
      const unresolved = [];
      const ids = new Set();
      for (const section of Object.keys(fam.sections ?? {})) if (!SECTION_ORDER.includes(section)) errors.push(`${where}: unknown section '${section}'`);
      for (const section of SECTION_ORDER) {
        const list = fam.sections?.[section];
        if (!list) continue;
        sections[section] = [];
        for (const s of list) {
          if (ids.has(s.id)) errors.push(`${where}: duplicate statement id '${s.id}'`);
          ids.add(s.id);
          const built = buildStatement(s, { where: `${where} ${section}`, family, contract, allowedSources, canonical, errors, claimsUsed });
          if (built.reason !== undefined) unresolved.push({ statement: built.statement, section, reason: built.reason });
          sections[section].push(built.statement);
        }
      }
      if (!Object.keys(sections).length) errors.push(`${where}: no statements`);

      // review history: seq 1 is the authoring event, then one event per unresolved statement
      const historyId = `review-narrative-${fam.id.replace(":", "-")}`;
      const events = [
        {
          seq: 1,
          type: "authored",
          at: AUTHORED_AT,
          actor: AUTHOR,
          note: "Narrative rewritten from the legacy dossier in scanner-neutral language, with citations to evidence sources and contract claims. Drafted with AI assistance (Claude) under the named author; not reviewed. Dossier content that is not carried is accounted for in docs/migration/narrative-report.md.",
          evidence: [{ url: `https://github.com/redact-secret/redact-secret-benchmarks/blob/${legacyRevision}/${dossierPath}`, pin: { kind: "commit-permalink", commit: legacyRevision } }],
        },
      ];
      for (const u of unresolved) {
        const seq = events.length + 1;
        u.statement.unresolved = { reviewEvent: seq, reason: u.reason };
        events.push({
          seq,
          type: "observed",
          at: AUTHORED_AT,
          actor: AUTHOR,
          verdict: "not-assertable",
          note: `Statement '${u.statement.id}' (${u.section}) is recorded as unresolved: ${u.reason}`,
        });
      }
      // key order: id, text, class, temporality, observedAt, citations | unresolved
      for (const list of Object.values(sections)) {
        for (const [i, st] of list.entries()) {
          const { id, text, evidenceClass, temporality, observedAt, citations, leads, unresolved: un } = st;
          list[i] = { id, text, evidenceClass, temporality, observedAt, ...(citations ? { citations } : {}), ...(leads ? { leads } : {}), ...(un ? { unresolved: un } : {}) };
        }
      }
      if (historyId.length > 96) errors.push(`${where}: review history id '${historyId}' exceeds 96 characters`);

      const [provider, name] = fam.id.split(":");
      const marker = {
        system: "legacy-dossier-narrative",
        id: `${legacyRevision}:${dossierPath}`,
        url: `https://github.com/redact-secret/redact-secret-benchmarks/blob/${legacyRevision}/${dossierPath}`,
        note: `families[id=${fam.id}] dossier body`,
      };
      const narrative = {
        schemaVersion: 1,
        kind: "family-narrative",
        id: fam.id,
        family: fam.id,
        lifecycle: "draft",
        ...(claimsUsed.size ? { contract: contractId } : {}),
        sections,
        externalRefs: [marker],
        ...(fam.status === "partial" ? { notes: fam.note } : {}),
      };
      const history = {
        schemaVersion: 1,
        kind: "evidence-review-history",
        id: historyId,
        subject: { kind: "family-narrative", id: fam.id },
        events,
        externalRefs: [marker],
      };
      files.set(`${NARRATIVE_DIR}/${provider}/${name}.json`, json(narrative));
      files.set(`${REVIEW_DIR}/${provider}/${name}.json`, json(history));
      narratives.push(narrative);
      rows.push({ id: fam.id, provider: data.provider, status: fam.status, note: fam.note, narrative, unresolved: unresolved.length });
    }
  }
  if (errors.length) throw new Error(`narrative authoring problems:\n${errors.sort().join("\n")}`);
  return { files, narratives, rows, dropped };
}
