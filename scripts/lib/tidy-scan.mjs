// Read-only hygiene scan over canonical records (#24, the `tidy-records` skill's detector).
//
// It finds mechanical defects only: bytes that are not the canonical serialization, a source
// recorded twice under URLs that differ in form, a claim or citation repeated inside one record,
// stray whitespace in prose, and a family whose pointers disagree with its own contracts. It
// never decides what a record means and never writes. Pure: records in, findings out.

import { createHash } from "node:crypto";
import { ownerOf } from "./ownership.mjs";

export const FINDING_KINDS = {
  "non-canonical-format": "bytes differ from JSON.stringify(record, null, 2) plus a trailing newline",
  "duplicate-source-url": "two evidence-source records whose URLs are the same page after normalizing case, trailing slash, fragment and tracking parameters",
  "duplicate-claim": "a contract holds two claims with the same normalized statement",
  "duplicate-citation": "one claim, expectation or statement cites the same source with the same supported text twice",
  "stray-whitespace": "free text has leading or trailing whitespace, a tab, or a run of spaces",
  "current-contract-mismatch": "family.currentContract does not name the newest contract of period current, or names none that exists",
  "narrative-contract-mismatch": "a narrative cites a contract revision other than the family's current one",
};

const PROSE_KEYS = new Set(["statement", "text", "description", "summary", "rationale", "note", "notes", "title", "supports", "reason", "name", "semantics", "locator"]);
const PROSE_KINDS = new Set(["provider", "family", "family-narrative", "format-contract", "case", "scenario", "benign-sibling", "evidence-source", "evidence-review-history"]);
const TRACKING = /^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid|ref|ref_src)$/i;

/** Canonical on-disk text for a record. */
export const canonical = (record) => `${JSON.stringify(record, null, 2)}\n`;

/** A URL reduced to the identity of the page: lowercase host, no fragment, no tracking params, no trailing slash. */
export function normalizeUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  u.hash = "";
  const kept = [...u.searchParams].filter(([k]) => !TRACKING.test(k)).sort(([a], [b]) => (a < b ? -1 : 1));
  u.search = "";
  for (const [k, v] of kept) u.searchParams.append(k, v);
  const path = u.pathname.length > 1 ? u.pathname.replace(/\/+$/, "") : u.pathname;
  return `${u.protocol}//${u.host.toLowerCase()}${path}${u.search}`;
}

export const normalizeText = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

function* proseStrings(node, path) {
  if (typeof node === "string") yield [path, node];
  else if (Array.isArray(node)) for (let i = 0; i < node.length; i++) yield* proseStrings(node[i], `${path}[${i}]`);
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string") {
        if (PROSE_KEYS.has(k)) yield [`${path}.${k}`, v];
      } else yield* proseStrings(v, `${path}.${k}`);
    }
  }
}

function citationLists(record) {
  const lists = [];
  if (record.kind === "format-contract") for (const c of record.claims ?? []) lists.push([`claims[${c.id}]`, c.sources ?? []]);
  if (record.kind === "case") lists.push(["expectation", record.expectation?.sources ?? []]);
  if (record.kind === "benign-sibling") lists.push(["sources", record.sources ?? []]);
  if (record.kind === "family-narrative") {
    for (const [sec, list] of Object.entries(record.sections ?? {})) for (const s of list) lists.push([`sections.${sec}[${s.id}]`, (s.citations ?? []).filter((c) => c.kind === "source")]);
  }
  return lists;
}

/**
 * Findings for `entries` = [{ path, text, record }] (path repository-relative, text the file's
 * bytes). Each finding is { path, kind, detail, owner } with owner `authored` or the migrate:*
 * script that generates the record (scripts/lib/ownership.mjs). Sorted by path, kind, detail.
 * `opts.kinds` and `opts.owner` restrict what is reported.
 */
export function scanRecords(entries, opts = {}) {
  const findings = [];
  const add = (path, kind, detail) => findings.push({ path, kind, detail });

  const sources = [];
  const contractsByFamily = new Map();
  for (const { path, text, record } of entries) {
    // A fixture set is recorded generator output with its own byte layout (fixtures:materialize).
    if (record.kind !== "fixture-set" && text !== undefined && text !== canonical(record)) add(path, "non-canonical-format", "re-serialize with 2-space indent and a single trailing newline");

    if (PROSE_KINDS.has(record.kind)) {
      for (const [where, s] of proseStrings(record, "")) {
        if (s !== s.trim() || /\t/.test(s) || / {2,}/.test(s)) add(path, "stray-whitespace", `${where}`);
      }
    }

    for (const [where, list] of citationLists(record)) {
      const seen = new Set();
      for (const c of list) {
        const key = `${c.sourceId}\u0000${c.supports ?? ""}\u0000${c.locator ?? ""}`;
        if (seen.has(key)) add(path, "duplicate-citation", `${where}: ${c.sourceId}`);
        seen.add(key);
      }
    }

    // A withdrawn duplicate is the finished state of a merge: it stays, it is no longer a finding.
    if (record.kind === "evidence-source" && record.lifecycle !== "withdrawn") sources.push({ path, record });
    if (record.kind === "format-contract") {
      if (!contractsByFamily.has(record.family)) contractsByFamily.set(record.family, []);
      contractsByFamily.get(record.family).push(record);
      const seen = new Map();
      for (const c of record.claims ?? []) {
        const key = normalizeText(c.statement);
        if (seen.has(key)) add(path, "duplicate-claim", `${seen.get(key)} and ${c.id} state the same thing`);
        else seen.set(key, c.id);
      }
    }
  }

  const byUrl = new Map();
  for (const s of sources) {
    const key = normalizeUrl(s.record.locator?.url ?? "");
    if (!byUrl.has(key)) byUrl.set(key, []);
    byUrl.get(key).push(s);
  }
  for (const group of byUrl.values()) {
    if (group.length < 2) continue;
    const ids = group.map((g) => g.record.id).sort();
    for (const g of group) add(g.path, "duplicate-source-url", `same page as ${ids.filter((i) => i !== g.record.id).join(", ")}`);
  }

  for (const { path, record } of entries) {
    if (record.kind !== "family") continue;
    const list = (contractsByFamily.get(record.id) ?? []).slice().sort((a, b) => a.revision - b.revision);
    const newestCurrent = [...list].reverse().find((c) => c.period === "current");
    if (record.currentContract) {
      const named = list.find((c) => c.id === record.currentContract);
      if (!named) add(path, "current-contract-mismatch", `${record.currentContract} does not exist`);
      else if (newestCurrent && newestCurrent.id !== named.id) add(path, "current-contract-mismatch", `names ${named.id} but ${newestCurrent.id} is the newest current contract`);
    } else if (newestCurrent) add(path, "current-contract-mismatch", `currentContract is null but ${newestCurrent.id} is a current contract`);
  }
  for (const { path, record } of entries) {
    if (record.kind !== "family-narrative" || !record.contract) continue;
    const fam = entries.find((e) => e.record.kind === "family" && e.record.id === record.family)?.record;
    if (fam?.currentContract && fam.currentContract !== record.contract) add(path, "narrative-contract-mismatch", `cites ${record.contract}, family current is ${fam.currentContract}`);
  }

  const kinds = opts.kinds ? new Set(opts.kinds) : null;
  const recordAt = new Map(entries.map((e) => [e.path, e.record]));
  return findings
    .map((f) => ({ ...f, owner: ownerOf(f.path, recordAt.get(f.path), opts.owners) }))
    .filter((f) => !kinds || kinds.has(f.kind))
    .filter((f) => !opts.owner || f.owner === opts.owner)
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : a.detail < b.detail ? -1 : a.detail > b.detail ? 1 : 0));
}

/** Short stable digest of the findings list, for run logs. */
export const digest = (findings) => createHash("sha256").update(JSON.stringify(findings)).digest("hex").slice(0, 12);
