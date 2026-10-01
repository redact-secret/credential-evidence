// Source freshness mechanics (#24, the `source-freshness` skill's tooling).
//
// `dueSources` says which sources to re-read and why; `planObservation` appends one entry to a
// source's append-only `observations` log. Neither fetches anything: someone (or an agent)
// reads the page and reports what they saw. An old entry is never rewritten, and no claim,
// contract or review history is touched here.

import { minusMonths, monthsBetween, STALE_AFTER_MONTHS } from "./coverage.mjs";
import { canonical } from "./tidy-scan.mjs";
import { ownerOf } from "./ownership.mjs";

export const OUTCOMES = ["read", "unchanged", "changed", "unreachable", "superseded"];
const NEEDS_NOTE = new Set(["changed", "unreachable", "superseded"]);
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SHA256 = /^[a-f0-9]{64}$/;
const LEGACY_OBSERVER = /^legacy-/;
const dateOf = (v) => (typeof v === "string" ? v.slice(0, 10) : "");

export class ObserveError extends Error {}

function latest(source) {
  let best = null;
  for (const o of source.observations ?? []) if (!best || dateOf(o.observedAt) >= dateOf(best.observedAt)) best = o;
  return best;
}

/**
 * Sources cited by a family's current contract that are due for a re-read, most urgent first.
 * Reasons, in order: `unreachable-last` (the last observation found it gone or changed),
 * `stale` (a live-unpinned source last read more than the staleness period ago),
 * `unverified-import` (only ever observed by an import). Deterministic for a given `asOf`.
 */
export function dueSources(records, { asOf, family = null, provider = null } = {}) {
  const sources = new Map(records.filter((r) => r.kind === "evidence-source").map((s) => [s.id, s]));
  const cutoff = minusMonths(asOf, STALE_AFTER_MONTHS);
  const contracts = new Map();
  for (const c of records.filter((r) => r.kind === "format-contract")) {
    if (!contracts.has(c.family)) contracts.set(c.family, []);
    contracts.get(c.family).push(c);
  }
  const citedBy = new Map();
  for (const f of records.filter((r) => r.kind === "family").sort((a, b) => a.id.localeCompare(b.id))) {
    if (family && f.id !== family) continue;
    if (provider && f.provider !== provider) continue;
    const list = (contracts.get(f.id) ?? []).sort((a, b) => a.revision - b.revision);
    const contract = (f.currentContract && list.find((c) => c.id === f.currentContract)) || [...list].reverse().find((c) => c.period === "current");
    if (!contract) continue;
    for (const claim of contract.claims ?? []) {
      if (claim.temporality !== "current") continue;
      for (const s of claim.sources ?? []) {
        if (!citedBy.has(s.sourceId)) citedBy.set(s.sourceId, new Set());
        citedBy.get(s.sourceId).add(f.id);
      }
    }
  }
  const out = [];
  for (const [id, fams] of citedBy) {
    const s = sources.get(id);
    if (!s) continue;
    const last = latest(s);
    const lastDate = dateOf(last?.observedAt);
    let reason = null;
    if (["unreachable", "changed", "superseded"].includes(last?.outcome)) reason = "unreachable-last";
    else if (s.locator?.pin?.kind === "live-unpinned" && lastDate && lastDate < cutoff) reason = "stale";
    else if ((s.observations ?? []).length && s.observations.every((o) => LEGACY_OBSERVER.test(o.observer))) reason = "unverified-import";
    if (!reason) continue;
    out.push({
      id,
      reason,
      url: s.locator.url,
      sourceType: s.sourceType,
      pin: s.locator.pin.kind,
      lastObservedAt: lastDate,
      lastOutcome: last?.outcome ?? null,
      ageMonths: lastDate ? monthsBetween(lastDate, asOf) : null,
      citedBy: [...fams].sort(),
      owner: ownerOf(`records/sources/${s.locator.url.split("/")[2]}/${id}.json`, s),
    });
  }
  const rank = { "unreachable-last": 0, stale: 1, "unverified-import": 2 };
  return out.sort((a, b) => rank[a.reason] - rank[b.reason] || (a.lastObservedAt ?? "") .localeCompare(b.lastObservedAt ?? "") || (a.id < b.id ? -1 : 1));
}

/**
 * Plan appending one observation. Returns { record, text, entry } or throws ObserveError.
 * `source` is the parsed source record, `bytes` its current file text.
 */
export function planObservation(source, bytes, { outcome, observer, observedAt, digest, note, today }) {
  if (!OUTCOMES.includes(outcome)) throw new ObserveError(`--outcome must be one of ${OUTCOMES.join(", ")}`);
  if (!observer || !SLUG.test(observer)) throw new ObserveError("--observer is required and must be a lowercase slug (who read the page)");
  if (LEGACY_OBSERVER.test(observer)) throw new ObserveError("--observer must name the real reader, not an import");
  const date = observedAt ?? today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new ObserveError("--observed-at must be YYYY-MM-DD");
  if (date > today) throw new ObserveError(`--observed-at ${date} is in the future (today is ${today} UTC)`);
  const last = latest(source);
  if (last && date < dateOf(last.observedAt)) throw new ObserveError(`--observed-at ${date} is earlier than the latest recorded observation (${dateOf(last.observedAt)}); the log is append-only and ordered`);
  if (digest !== undefined && !SHA256.test(digest)) throw new ObserveError("--digest must be a lowercase 64-hex sha256 of the bytes you read");
  if (NEEDS_NOTE.has(outcome) && !(note && note.trim())) throw new ObserveError(`--note is required for outcome '${outcome}': say what you saw`);
  if (outcome === "unreachable" && digest) throw new ObserveError("an unreachable source has no digest");
  if (bytes !== canonical(source)) throw new ObserveError("the source file is not in canonical form (2-space JSON, trailing newline); run npm run tidy:scan and fix that first so this diff stays one entry");

  const entry = { observedAt: date, outcome, observer };
  if (digest) entry.contentDigest = digest;
  if (note) entry.note = note.trim();
  const record = { ...source, observations: [...source.observations, entry] };
  return { record, text: canonical(record), entry };
}
