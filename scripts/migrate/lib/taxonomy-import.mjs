// Deterministic import of the legacy provider taxonomy, provider dossiers and
// format-contract provenance into canonical v1 records.
//
// Pure with respect to its input: `buildTaxonomyImport({ root })` reads only the
// extracted legacy revision and returns every record file as text plus a report
// model. No clock, no network, no randomness; output is sorted by stable id.
//
// Boundary: only evidence-shaped facts are imported. Benchmark workflow state
// (supportStatus, fixture profiles, scores, stage, twin bookkeeping) is dropped
// and counted in the migration report; free text is kept only inside append-only
// review-history events, labelled as verbatim legacy text.

import { readdirSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import reviewedSourceTypes from "../authored/source-types.mjs";
import { LEGACY_PATHS, LEGACY_REPOSITORY, LEGACY_REVISION, loadContractRegistry, readLegacyJson, readLegacyText } from "./legacy-source.mjs";
import { clip, isProjectOwned, ownerOf, pinFor, publisherFor, shapeRole, slugify, sourceIdFor, splitUrl, strongestRole, titleFor } from "./sources.mjs";

/** Marker system on every externalRef this tool writes; it also identifies files the tool owns. */
export const OWNED_SYSTEM = "legacy-taxonomy-import";
export const OWNED_DIRS = ["providers", "families", "contracts", "sources", "variants", "siblings", "reviews"];
export const IMPORTER_VERSION = "1.0.0";

const DATE = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
const TEXT_MAX = 2000;
const observer = "legacy-import";

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const sortedKeys = (obj) => Object.keys(obj).sort(cmp);
const uniqSorted = (xs) => [...new Set(xs)].sort(cmp);

// ---------------------------------------------------------------- report model

export class Report {
  constructor() {
    this.counts = new Map();
    this.lists = new Map();
  }
  inc(name, n = 1) {
    this.counts.set(name, (this.counts.get(name) ?? 0) + n);
  }
  get(name) {
    return this.counts.get(name) ?? 0;
  }
  add(list, item) {
    if (!this.lists.has(list)) this.lists.set(list, new Set());
    this.lists.get(list).add(item);
  }
  list(name) {
    return uniqSorted(this.lists.get(name) ?? []);
  }
}

// ------------------------------------------------------------------ dossiers

export function parseDossiers(root) {
  const dir = join(root, LEGACY_PATHS.dossierDir);
  const entries = [];
  const prose = { files: 0, bytes: 0, excluded: [] };
  for (const name of readdirSync(dir).sort(cmp)) {
    if (!name.endsWith(".md")) continue;
    const path = `${LEGACY_PATHS.dossierDir}/${name}`;
    const text = readLegacyText(root, path);
    if (name === "README.md" || name.startsWith("_")) {
      prose.excluded.push({ path, bytes: Buffer.byteLength(text) });
      continue;
    }
    const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
    if (!m) throw new Error(`${path}: no YAML frontmatter`);
    const front = YAML.parse(m[1]);
    prose.files += 1;
    prose.bytes += Buffer.byteLength(m[2]);
    if (typeof front.provider !== "string" || !Array.isArray(front.families)) throw new Error(`${path}: unexpected frontmatter shape`);
    for (const fam of front.families) entries.push({ path, provider: front.provider, ...fam });
  }
  return { entries, prose };
}

// ----------------------------------------------------------------- builder

const VERDICT_STATE = { ready: "researched", "issuance-gated": "researched", "date-gated": "researched", "not-found": "not-found", rejected: "rejected", unresearched: "unresearched" };
const VERDICT_EVENT = { ready: "supports", "issuance-gated": "inconclusive", "date-gated": "inconclusive", "not-found": "not-assertable", rejected: "does-not-support" };
const TIER_CLASS = { T1: "provider-documented", T2: "tool-corroborated", T3: "project-policy", T0: "unresolved" };
const BASIS_CLASS = {
  "provider-documentation": "provider-documented",
  "provider-example": "provider-documented",
  "provider-code": "provider-documented",
  tool: "tool-corroborated",
  community: "unresolved",
  "maintainer-observation": "unresolved",
  "research-hypothesis": "unresolved",
};
const BASIS_ROLE = {
  "provider-documentation": "provider-documentation",
  "provider-example": "provider-documentation",
  "provider-code": "provider-sdk-source",
  tool: "scanner-rule-source",
  community: "third-party-writeup",
  "maintainer-observation": "project-research-note",
  "research-hypothesis": "other",
};

export function buildTaxonomyImport({ root, revision = LEGACY_REVISION }) {
  const R = new Report();
  const taxonomy = readLegacyJson(root, LEGACY_PATHS.taxonomy);
  const { entries: dossierEntries, prose } = parseDossiers(root);
  const registry = loadContractRegistry(root);
  const files = new Map();

  const permalink = (path) => `https://github.com/${LEGACY_REPOSITORY}/blob/${revision}/${path}`;
  const legacyRef = (path, pointer) => ({ system: OWNED_SYSTEM, id: `${revision}:${path}`, url: permalink(path), note: clip(pointer, TEXT_MAX) });
  const sortRefs = (refs) => {
    const seen = new Set();
    return refs
      .filter((r) => (seen.has(JSON.stringify(r)) ? false : seen.add(JSON.stringify(r))))
      .sort((a, b) => cmp(JSON.stringify(a), JSON.stringify(b)));
  };
  const text = (s, counter) => clip(String(s).replace(/\s+/g, " ").trim() || "(empty)", TEXT_MAX, counter && (() => R.inc(counter)));
  const verbatim = (s, counter) => clip(String(s).trim(), TEXT_MAX, counter && (() => R.inc(counter)));
  const asDate = (d, ctx) => {
    if (typeof d !== "string" || !DATE.test(d)) throw new Error(`${ctx}: not a YYYY-MM-DD date: ${JSON.stringify(d)}`);
    return d;
  };
  const put = (path, record) => {
    if (files.has(path)) throw new Error(`duplicate output path ${path}`);
    files.set(path, `${JSON.stringify(record, null, 2)}\n`);
    R.inc(`records:${record.kind}`);
  };

  // ------------------------------------------------------------ provider set
  const providerIds = new Set(taxonomy.providers.map((p) => p.id));
  const provOf = (f) => f.provider ?? f.id.split(":")[0];
  for (const f of taxonomy.families) if (f.provider == null) R.inc("provider-null-derived-from-family-id");
  const genericFamilies = taxonomy.families.filter((f) => provOf(f) === "generic");
  const dossierProviders = uniqSorted(dossierEntries.map((e) => e.provider));

  // ------------------------------------------------------------ source pool
  const pool = new Map(); // base -> { roles, dates: Map<date, Set<origin>>, legacy: Map<path, Set<pointer>> }
  const legacyUrls = new Set();
  const cite = (raw, { role, date, origin, path, pointer }) => {
    const { base, fragment } = splitUrl(raw);
    legacyUrls.add(String(raw).trim());
    let s = pool.get(base);
    if (!s) pool.set(base, (s = { roles: new Set(), dates: new Map(), legacy: new Map() }));
    s.roles.add(role ?? shapeRole(base));
    if (!role) s.roles.add(shapeRole(base));
    if (!s.dates.has(date)) s.dates.set(date, new Set());
    s.dates.get(date).add(origin);
    if (!s.legacy.has(path)) s.legacy.set(path, new Set());
    s.legacy.get(path).add(pointer);
    return { sourceId: sourceIdFor(base).id, base, locator: fragment ? clip(fragment, 300) : undefined };
  };

  /** Build a claim and its sourceRefs. `cites` = [{ url, supports, role, origin, path, pointer }] */
  const makeClaim = ({ id, statement, desired, observedAt, cites, path, dateOrigin }) => {
    const refs = [];
    const bases = [];
    const seen = new Set();
    for (const c of cites) {
      const supports = text(c.supports, "truncated:supports");
      const ref = cite(c.url, { role: c.role, date: observedAt, origin: c.origin ?? dateOrigin, path: c.path ?? path, pointer: c.pointer });
      const key = `${ref.sourceId}|${supports}|${ref.locator ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push({ sourceId: ref.sourceId, supports, ...(ref.locator ? { locator: ref.locator } : {}) });
      bases.push(ref.base);
    }
    refs.sort((a, b) => cmp(JSON.stringify(a), JSON.stringify(b)));
    let evidenceClass = desired;
    if (evidenceClass === "provider-documented" && refs.length === 0) {
      evidenceClass = "unresolved";
      R.inc("downgrade:provider-documented-without-source");
    }
    if (evidenceClass === "tool-corroborated") {
      const owners = uniqSorted(bases.filter((b) => !isProjectOwned(b)).map(ownerOf));
      if (owners.length < 2) {
        evidenceClass = "unresolved";
        R.inc("downgrade:tool-corroborated-fewer-than-two-owners");
      }
    }
    R.inc(`claims:${evidenceClass}`);
    return {
      id,
      statement: text(statement, "truncated:claim-statement"),
      evidenceClass,
      temporality: "current",
      observedAt,
      sources: refs,
    };
  };

  /** Keep URL entries; a non-URL entry is legacy internal prose, not a citable source. */
  const urlsOnly = (list, label) =>
    (list ?? []).filter((u) => {
      if (/^https:\/\/[^\s]+$/.test(String(u).trim())) return true;
      R.inc(`dropped:${label}-not-a-url`);
      R.add(`dropped:${label}-not-a-url`, String(u).slice(0, 80));
      return false;
    });

  // -------------------------------------------------- family -> contract keys
  const contractKeys = new Map();
  const addKey = (fam, key) => {
    if (!contractKeys.has(fam)) contractKeys.set(fam, new Set());
    contractKeys.get(fam).add(key);
  };
  for (const f of taxonomy.families) {
    for (const d of f.detectors) {
      if (registry.contracts[d]) addKey(f.id, d);
      else R.add("detector-without-contract", `${d} (${f.id})`);
    }
  }
  const taxonomyFamilyIds = new Set(taxonomy.families.map((f) => f.id));
  for (const a of registry.arrivalFamilies) {
    if (!taxonomyFamilyIds.has(a.taxonomy)) R.add("arrival-family-not-in-taxonomy", a.id);
    else addKey(a.taxonomy, a.id);
  }
  const familiesOfKey = new Map();
  for (const [fam, keys] of contractKeys) for (const k of keys) familiesOfKey.set(k, [...(familiesOfKey.get(k) ?? []), fam]);
  for (const [k, fams] of familiesOfKey) if (fams.length > 1) R.add("shared-contract", `${k} -> ${fams.sort(cmp).join(", ")}`);
  for (const [fam, keys] of contractKeys) if (keys.size > 1) R.add("family-with-several-legacy-contracts", `${fam}: ${[...keys].sort(cmp).join(", ")}`);
  const unreferencedContracts = sortedKeys(registry.contracts).filter((k) => !familiesOfKey.has(k));
  for (const k of unreferencedContracts) R.add("contract-without-family", k);

  const dossierById = new Map(dossierEntries.map((e) => [e.id, e]));
  for (const f of taxonomy.families) if (!dossierById.has(f.id)) R.add("family-without-dossier", f.id);
  for (const e of dossierEntries) if (!taxonomyFamilyIds.has(e.id)) R.add("dossier-family-not-in-taxonomy", e.id);

  // ---------------------------------------------------------------- providers
  const taxPath = LEGACY_PATHS.taxonomy;
  const dossierPathOf = (provider) => `${LEGACY_PATHS.dossierDir}/${provider}.md`;
  const providerRecords = taxonomy.providers.map((p) => ({
    id: p.id,
    name: p.name,
    refs: [legacyRef(taxPath, `providers[id=${p.id}]`), ...(dossierProviders.includes(p.id) ? [legacyRef(dossierPathOf(p.id), "frontmatter provider")] : [])],
    derived: false,
  }));
  for (const id of new Set(taxonomy.families.map(provOf))) {
    if (!providerIds.has(id)) {
      if (id !== "generic") throw new Error(`family provider '${id}' is not in taxonomy providers`);
      providerRecords.push({
        id: "generic",
        name: "Generic (no single issuing provider)",
        refs: [legacyRef(dossierPathOf("generic"), "frontmatter provider: generic"), ...genericFamilies.map((f) => legacyRef(taxPath, `families[id=${f.id}] (provider is null; derived from the id prefix)`))],
        derived: true,
      });
      R.add("derived-provider", "generic");
    }
  }
  providerRecords.sort((a, b) => cmp(a.id, b.id));
  for (const p of providerRecords) {
    put(`records/providers/${p.id}.json`, {
      schemaVersion: 1,
      kind: "provider",
      id: p.id,
      name: p.name,
      lifecycle: "draft",
      externalRefs: sortRefs(p.refs),
    });
  }

  // --------------------------------------------------- families and contracts
  const familyMeta = []; // for sources pass and round-trip

  for (const f of [...taxonomy.families].sort((a, b) => cmp(a.id, b.id))) {
    const dossier = dossierById.get(f.id);
    if (!dossier) throw new Error(`family ${f.id} has no dossier entry`);
    if (dossier.provider !== provOf(f)) throw new Error(`family ${f.id}: dossier provider ${dossier.provider} != taxonomy provider ${provOf(f)}`);
    const [providerId, famSlug] = f.id.split(":");
    const res = dossier.research;
    const verdict = res.verdict;
    const tier = res.tier ?? null;
    if (!(verdict in VERDICT_STATE)) throw new Error(`${f.id}: unknown dossier verdict ${verdict}`);
    if (tier !== null && !(tier in TIER_CLASS)) throw new Error(`${f.id}: unknown dossier tier ${tier}`);
    const researchedAt = res.researchedAt == null ? null : asDate(String(res.researchedAt), `${f.id} researchedAt`);
    if (verdict !== "unresearched" && !researchedAt) throw new Error(`${f.id}: verdict ${verdict} without researchedAt`);
    const dossierPath = dossier.path;
    const keys = uniqSorted([...(contractKeys.get(f.id) ?? [])]);
    const legacyContracts = keys.map((k) => ({ key: k, ...registry.contracts[k], shared: familiesOfKey.get(k).length > 1, sharedWith: familiesOfKey.get(k).length }));
    const period = verdict === "ready" && ["T1", "T2", "T3"].includes(tier) ? "current" : "proposed";
    R.inc(`period:${period}`);
    R.inc(`verdict:${verdict}/${tier ?? "none"}`);
    for (const c of legacyContracts) if (c.contract.tier !== (tier ?? "T0")) R.inc("tier-mismatch:dossier-vs-contract");

    const contractId = `${f.id}@1`;
    const refsContract = [legacyRef(taxPath, `families[id=${f.id}]`), legacyRef(dossierPath, `families[id=${f.id}].research`)];
    const claims = [];
    const claimIds = new Set();
    const claimId = (base) => {
      let id = slugify(base).slice(0, 80) || "claim";
      for (let n = 2; claimIds.has(id); n += 1) id = `${slugify(base).slice(0, 76) || "claim"}-${n}`;
      claimIds.add(id);
      return id;
    };
    const fieldRefs = [];
    const structure = {};

    for (const lc of legacyContracts) {
      const c = lc.contract;
      const cpath = lc.file;
      const shared = lc.shared ? ` [Legacy contract '${lc.key}' is shared by ${lc.sharedWith} families; this statement is not specific to one of them.]` : "";
      const ptr = (field) => `contracts['${lc.key}'].${field}`;
      refsContract.push(legacyRef(cpath, `contracts['${lc.key}']`));
      // date for claims that carry none of their own: earliest date on this contract's own sources, else the dossier date
      const ownDates = uniqSorted([
        ...["providerSource", "candidateSource", "twinSource"].filter((k) => c[k]).map((k) => asDate(c[k].observedAt, `${lc.key}.${k}`)),
        ...(c.fields ?? []).flatMap((fl) => fl.sources.map((s) => asDate(s.observedAt, `${lc.key}.fields`))),
      ]);
      const inferred = () => {
        if (ownDates.length) {
          R.inc("inferred-date:contract-own-earliest");
          return ownDates[0];
        }
        R.inc("inferred-date:dossier-researchedAt");
        return researchedAt ?? "2026-09-17";
      };

      if (c.pattern) {
        if (lc.shared) R.inc("omitted:pattern-of-shared-contract");
        else if (c.pattern.length > 500) R.inc("omitted:pattern-over-500");
        else {
          structure.descriptivePattern = c.pattern;
          R.inc("mapped:pattern");
        }
      }
      if (c.companion) {
        if (lc.shared) R.inc("omitted:companion-of-shared-contract");
        else {
          (structure.components ??= []).push({ name: "companion", role: "companion", description: text(c.companion, "truncated:companion") });
          R.inc("mapped:companion");
        }
      }

      if (c.providerSource) {
        const ps = c.providerSource;
        claims.push(
          makeClaim({
            id: claimId("provider-source"),
            statement: `${ps.formatVersion}: ${ps.covers}${shared}`,
            desired: "provider-documented",
            observedAt: asDate(ps.observedAt, `${lc.key}.providerSource`),
            cites: [{ url: ps.url, supports: ps.covers, role: "provider-documentation", origin: "contract-providerSource", path: cpath, pointer: ptr("providerSource") }],
          }),
        );
      }
      if (c.candidateSource) {
        const cs = c.candidateSource;
        claims.push(
          makeClaim({
            id: claimId("candidate-source"),
            statement: `Candidate provider source, not accepted as the provider source by the legacy contract (${cs.formatVersion}): ${cs.covers}${shared}`,
            desired: "unresolved",
            observedAt: asDate(cs.observedAt, `${lc.key}.candidateSource`),
            cites: [{ url: cs.url, supports: cs.covers, role: "provider-documentation", origin: "contract-candidateSource", path: cpath, pointer: ptr("candidateSource") }],
          }),
        );
      }
      if (c.twinSource) {
        const ts = c.twinSource;
        claims.push(
          makeClaim({
            id: claimId("mutable-property-source"),
            statement: `Documentation for the one property varied in legacy twin fixtures (${ts.formatVersion}): ${ts.covers}${shared}`,
            desired: "provider-documented",
            observedAt: asDate(ts.observedAt, `${lc.key}.twinSource`),
            cites: [{ url: ts.url, supports: ts.covers, role: "provider-documentation", origin: "contract-twinSource", path: cpath, pointer: ptr("twinSource") }],
          }),
        );
      }
      if ((c.corroboration ?? []).length) {
        claims.push(
          makeClaim({
            id: claimId("tool-corroboration"),
            statement: `Pinned scanner rules are consistent with the contract grammar (${c.corroboration.length} artifact${c.corroboration.length === 1 ? "" : "s"}: ${uniqSorted(c.corroboration.map((x) => x.tool)).join("; ")}).${shared}`,
            desired: "tool-corroborated",
            observedAt: inferred(),
            cites: c.corroboration.map((x) => ({ url: x.url, supports: `${x.tool}: ${x.label}`, role: "scanner-rule-source", origin: "contract-corroboration", path: cpath, pointer: ptr("corroboration") })),
          }),
        );
      }
      for (const [i, fl] of (c.fields ?? []).entries()) {
        if (!(fl.basis in BASIS_CLASS)) throw new Error(`${lc.key}.fields[${i}]: unknown basis ${fl.basis}`);
        const desired = fl.status === "unresolved" ? "unresolved" : BASIS_CLASS[fl.basis];
        R.inc(`field-basis:${fl.basis}/${fl.status} -> ${desired}`);
        const dates = fl.sources.map((s) => asDate(s.observedAt, `${lc.key}.fields[${i}]`));
        const claim = makeClaim({
          id: claimId(`field-${fl.field}`),
          statement: `${fl.field}: ${fl.claim}${fl.note ? ` (${fl.note})` : ""}${shared}`,
          desired,
          observedAt: dates.length ? dates.sort(cmp)[dates.length - 1] : inferred(),
          cites: fl.sources.map((s) => ({
            url: s.url,
            supports: s.note ?? `${fl.field}: ${fl.claim}`,
            role: BASIS_ROLE[fl.basis],
            origin: "contract-field",
            path: cpath,
            pointer: ptr("fields"),
          })),
        });
        claims.push(claim);
        fieldRefs.push({ system: "legacy-field-claim", id: `${lc.key}:${fl.field}`.slice(0, 200), note: `claim ${claim.id}; legacy evidence basis=${fl.basis}` });
        R.inc(`dropped:field-status=${fl.status}`);
        if (/legacy|previous|deprecated|pre-\d{4}|old[- ]/i.test(fl.field)) R.add("candidate-variant-field", `${lc.key}:${fl.field}`);
      }
      const references = urlsOnly(c.references, "contract-reference");
      if (references.length) {
        claims.push(
          makeClaim({
            id: claimId("listed-references"),
            statement: `The legacy contract lists ${references.length} reference${references.length === 1 ? "" : "s"} without stating which property each supports.${shared}`,
            desired: "unresolved",
            observedAt: inferred(),
            cites: references.map((u) => ({ url: u, supports: "Listed as a reference by the legacy contract", origin: "contract-reference", path: cpath, pointer: ptr("references") })),
          }),
        );
      }
      if (c.tier === "T3" || c.tier === "T0") {
        claims.push(
          makeClaim({
            id: claimId("legacy-contract-tier"),
            statement:
              c.tier === "T3"
                ? `The legacy contract records this grammar as project masking policy (tier T3), not as a provider format.${shared}`
                : `The legacy contract records no adequate evidence for a grammar (tier T0).${shared}`,
            desired: TIER_CLASS[c.tier],
            observedAt: inferred(),
            cites: [],
            path: cpath,
            dateOrigin: "contract-tier",
          }),
        );
      }
      for (const key of ["unprobeable", "structural", "validate", "contextGated"]) if (c[key]) R.inc(`dropped:contract.${key}`);
      R.inc("contracts-read");
    }

    // dossier research claim, always present so every family contract has evidence context
    const dossierDesired = TIER_CLASS[tier ?? "T0"];
    const dossierCites = urlsOnly(res.sources, "dossier-source").map((u) => ({ url: u, supports: "Cited by the legacy dossier research for this family", origin: "dossier-research", path: dossierPath, pointer: `families[id=${f.id}].research.sources` }));
    if (res.evidence) {
      dossierCites.push({ url: res.evidence, supports: "Final research evidence recorded by the legacy dossier", role: "project-research-note", origin: "dossier-evidence", path: dossierPath, pointer: `families[id=${f.id}].research.evidence` });
    }
    claims.push(
      makeClaim({
        id: claimId("dossier-research"),
        statement: `Legacy dossier research (verdict ${verdict}, tier ${tier ?? "none"}) cited ${dossierCites.length} source${dossierCites.length === 1 ? "" : "s"}; the dossier does not attribute sources to individual properties.`,
        desired: dossierDesired,
        observedAt: researchedAt ?? "2026-09-17",
        cites: dossierCites,
        path: dossierPath,
        dateOrigin: "dossier-research",
      }),
    );
    const taxonomySources = urlsOnly(f.sources, "taxonomy-source");
    if (taxonomySources.length) {
      claims.push(
        makeClaim({
          id: claimId("taxonomy-sources"),
          statement: `The legacy taxonomy lists ${taxonomySources.length} source${taxonomySources.length === 1 ? "" : "s"} for this family. The taxonomy records no date; the dossier researchedAt is used as the observed-at date.`,
          desired: dossierDesired,
          observedAt: researchedAt ?? "2026-09-17",
          cites: taxonomySources.map((u) => ({ url: u, supports: "Listed as a source for this family in the legacy taxonomy", origin: "taxonomy-source", path: taxPath, pointer: `families[id=${f.id}].sources` })),
        }),
      );
      R.inc("inferred-date:taxonomy-sources-use-dossier-date");
    }
    if (legacyContracts.length === 0) R.add("family-without-registry-contract", f.id);

    put(`records/contracts/${providerId}/${famSlug}@1.json`, {
      schemaVersion: 1,
      kind: "format-contract",
      id: contractId,
      family: f.id,
      revision: 1,
      period,
      validity: { from: null, until: null },
      supersedes: null,
      structure,
      claims,
      lifecycle: "draft",
      externalRefs: sortRefs([...refsContract, ...fieldRefs]),
    });

    // ------------------------------------------------------------- family
    const blockers = [];
    if (dossier.blockedBy) {
      const kind = verdict === "issuance-gated" ? "issuance-gated" : verdict === "date-gated" ? "date-gated" : verdict === "not-found" ? "documentation-gated" : "other";
      const summary = clip(String(dossier.blockedBy).replace(/\s+/g, " ").trim(), 240, () => R.inc("truncated:blocker-summary"));
      blockers.push({ kind, summary });
      R.inc("mapped:blockedBy");
    }
    const issues = uniqSorted(res.issues ?? []);
    for (const i of issues) if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+#[1-9][0-9]*$/.test(i)) throw new Error(`${f.id}: unsupported issue reference ${i}`);
    const detectorRefs = f.detectors.map((d) => ({ system: "redact-secret-detector", id: d, note: "Legacy taxonomy.json detectors[] mapping, kept as an optional external reference." }));
    R.inc("detector-refs", detectorRefs.length);
    if (f.supportStatus) R.inc(`dropped:taxonomy.supportStatus=${f.supportStatus}`);

    put(`records/families/${providerId}/${famSlug}.json`, {
      schemaVersion: 1,
      kind: "family",
      id: f.id,
      provider: provOf(f),
      name: f.name,
      description: text(f.description, "truncated:family-description"),
      lifecycle: "draft",
      currentContract: period === "current" ? contractId : null,
      research: {
        state: VERDICT_STATE[verdict],
        researchedAt,
        ...(blockers.length ? { blockers } : {}),
        ...(issues.length ? { issues } : {}),
      },
      externalRefs: sortRefs([...detectorRefs, legacyRef(taxPath, `families[id=${f.id}]`), legacyRef(dossierPath, `families[id=${f.id}]`)]),
    });

    // ------------------------------------------------------------- review
    const events = [];
    const actor = { id: observer, role: "automation", affiliation: "project-maintainer" };
    const at = researchedAt ?? "2026-09-17";
    const evidence = [{ url: permalink(dossierPath), pin: { kind: "commit-permalink", commit: revision } }];
    if (res.evidence) {
      const p = pinFor(splitUrl(res.evidence).base);
      if (p.kind === "commit-permalink") evidence.push({ url: splitUrl(res.evidence).base, pin: { kind: "commit-permalink", commit: p.commit } });
      else R.add("dossier-evidence-not-commit-pinned", `${f.id}: ${res.evidence}`);
    }
    events.push({
      seq: 1,
      type: verdict === "unresearched" ? "observed" : "reviewed",
      at,
      actor,
      ...(verdict === "unresearched" ? {} : { verdict: VERDICT_EVENT[verdict] }),
      note: verbatim(
        `Imported from the legacy dossier: research verdict '${verdict}', tier ${tier ?? "none"} (${TIER_CLASS[tier ?? "T0"]}), researchedAt ${researchedAt ?? "none"}. The verdict and tier are re-expressed as research.state and an evidence class; no product status is carried.${dossier.blockedBy ? ` Legacy blockedBy: ${String(dossier.blockedBy).replace(/\s+/g, " ").trim()}` : ""}`,
        "truncated:review-note",
      ),
      evidence,
      ...(issues.length
        ? { externalRefs: issues.map((i) => ({ system: "github-issue", id: i, url: `https://github.com/${i.replace("#", "/issues/")}` })) }
        : {}),
    });
    const extra = (label, body, counter) =>
      events.push({ seq: events.length + 1, type: "observed", at, actor, note: verbatim(`${label} (verbatim legacy text; the date is the dossier researchedAt, not the authoring date): ${body}`, counter) });
    if (f.note) {
      extra(`Legacy taxonomy.json note for ${f.id}`, f.note, "truncated:legacy-note");
      R.inc("mapped:taxonomy-note");
    }
    for (const lc of legacyContracts) {
      if (lc.contract.review) {
        extra(`Legacy contract review text for '${lc.key}'${lc.shared ? `, a contract shared by ${lc.sharedWith} families` : ""}`, lc.contract.review, "truncated:legacy-review");
        R.inc("mapped:contract-review");
      }
    }
    let reviewId = `review-${providerId}-${famSlug}`;
    if (reviewId.length > 96) {
      reviewId = `${reviewId.slice(0, 85).replace(/-[^-]*$/, "")}-${sourceIdFor(f.id).id.slice(-10)}`;
      R.inc("shortened-review-id");
    }
    put(`records/reviews/${providerId}/${famSlug}.json`, {
      schemaVersion: 1,
      kind: "evidence-review-history",
      id: reviewId,
      subject: { kind: "family", id: f.id },
      events,
      externalRefs: sortRefs([legacyRef(dossierPath, `families[id=${f.id}].research`), legacyRef(taxPath, `families[id=${f.id}]`)]),
    });
    familyMeta.push({ id: f.id, contractId, keys, period });
    R.inc("legacy:families");
  }
  R.inc("legacy:providers", taxonomy.providers.length);

  // ------------------------------------------------------------ sources
  const typeCounts = new Map();
  let ambiguousType = 0;
  const sourceIds = new Map();
  for (const [base, s] of [...pool].sort((a, b) => cmp(a[0], b[0]))) {
    const { id, dir } = sourceIdFor(base);
    if (sourceIds.has(id)) throw new Error(`source id collision: ${id}`);
    sourceIds.set(id, base);
    const pin = pinFor(base);
    let sourceType = strongestRole(s.roles);
    const reviewed = reviewedSourceTypes.overrides[base];
    if (sourceType === "other" && reviewed) {
      // a person read the source and typed it (scripts/migrate/authored/source-types.mjs); only `other` is ever replaced
      sourceType = reviewed.sourceType;
      R.inc("source-type-reviewed");
    }
    if (sourceType === "other") {
      ambiguousType += 1;
    }
    typeCounts.set(sourceType, (typeCounts.get(sourceType) ?? 0) + 1);
    const locator =
      pin.kind === "commit-permalink"
        ? { url: pin.url, pin: { kind: "commit-permalink", commit: pin.commit } }
        : { url: pin.url, pin: { kind: "live-unpinned" } };
    R.inc(`source-pin:${pin.kind}`);
    const observations = [...s.dates]
      .sort((a, b) => cmp(a[0], b[0]))
      .map(([date, origins]) => ({
        observedAt: date,
        outcome: "read",
        observer,
        note: `Legacy import: date recorded by legacy ${[...origins].sort(cmp).join(", ")}; the exact read time was not recorded.`,
      }));
    const refs = [...s.legacy].sort((a, b) => cmp(a[0], b[0])).map(([path, pointers]) => legacyRef(path, `cited by ${[...pointers].sort(cmp).slice(0, 4).join("; ")}${pointers.size > 4 ? `; +${pointers.size - 4} more` : ""}`));
    if (pin.kind === "moving-ref") refs.push({ system: "legacy-url", id: clip(pin.legacyUrl, 200), note: `Legacy link names ref '${pin.ref}', not a commit; it cannot be recorded as a GitHub file locator, so the locator is the repository and this is the exact legacy URL.` });
    const record = {
      schemaVersion: 1,
      kind: "evidence-source",
      id,
      sourceType,
      title: titleFor(base),
      publisher: publisherFor(base),
      publishedAt: null,
      locator,
      observations,
      lifecycle: "draft",
      externalRefs: sortRefs(refs),
      ...(pin.kind === "moving-ref"
        ? { notes: `Legacy URL pins ref '${pin.ref}', which can move. Resolve it to a commit permalink before a reviewed claim depends on it.` }
        : {}),
    };
    if (pin.kind === "moving-ref" && pin.legacyUrl.length > 200) R.inc("truncated:legacy-url-ref");
    put(`records/sources/${dir}/${id}.json`, record);
  }
  R.inc("legacy:distinct-source-urls", pool.size);
  R.inc("legacy:source-citations-with-fragment", [...legacyUrls].filter((u) => u.includes("#")).length);

  // ------------------------------------------------------ legacy artifacts
  const stats = legacyArtifactStats(root);

  return {
    revision,
    files,
    report: {
      revision,
      counts: R,
      taxonomy: { providers: taxonomy.providers.length, families: taxonomy.families.length },
      dossiers: { entries: dossierEntries.length, prose, providers: dossierProviders.length },
      registry: { contracts: sortedKeys(registry.contracts).length, arrivalFamilies: registry.arrivalFamilies.length, fieldUsage: fieldUsage(registry) },
      taxonomyFieldUsage: taxonomyFieldUsage(taxonomy),
      sources: { distinct: pool.size, byType: Object.fromEntries([...typeCounts].sort((a, b) => cmp(a[0], b[0]))), ambiguousType },
      legacyUrls: uniqSorted([...legacyUrls]),
      stats,
      familyMeta,
    },
  };
}

function fieldUsage(registry) {
  const usage = {};
  for (const v of Object.values(registry.contracts)) for (const k of Object.keys(v.contract)) usage[k] = (usage[k] ?? 0) + 1;
  return Object.fromEntries(sortedKeys(usage).map((k) => [k, usage[k]]));
}

function taxonomyFieldUsage(taxonomy) {
  const usage = {};
  for (const f of taxonomy.families) for (const k of Object.keys(f)) if (f[k] != null && !(Array.isArray(f[k]) && f[k].length === 0)) usage[k] = (usage[k] ?? 0) + 1;
  return Object.fromEntries(sortedKeys(usage).map((k) => [k, usage[k]]));
}

/** Counts of legacy artifacts this issue does not import; read-only, sizes only. */
function legacyArtifactStats(root) {
  const size = (x) => (Array.isArray(x) ? x.length : Object.keys(x ?? {}).length);
  const j = (p) => readLegacyJson(root, p);
  const kg = j(LEGACY_PATHS.knownGaps);
  const byStatus = {};
  for (const i of kg.issues) byStatus[i.status] = (byStatus[i.status] ?? 0) + 1;
  const fixtures = j(LEGACY_PATHS.fixtureIndex);
  return {
    knownGaps: { issues: kg.issues.length, byStatus: Object.fromEntries(sortedKeys(byStatus).map((k) => [k, byStatus[k]])) },
    reviewLedger: { entries: Object.keys(j(LEGACY_PATHS.reviewLedger).entries).length },
    fixtureIndex: { fixtures: size(fixtures.fixtures) },
    fixtureSemantics: { fixtures: size(j(LEGACY_PATHS.fixtureSemantics).fixtures) },
    empiricalObservations: { families: size(j(LEGACY_PATHS.empiricalObservations).families) },
    policyQualified: { entries: size(j(LEGACY_PATHS.policyQualified).families) },
    fixtureProfiles: { profiles: size(j(LEGACY_PATHS.fixtureProfiles).profiles) },
    detectors: { entries: size(j(LEGACY_PATHS.detectors).detectors) },
  };
}
