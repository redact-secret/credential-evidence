// Builds the semantic canonical tree from the legacy model and its classification
// (ADR 0008): scenarios, cases, fixture plans, fixture sets, and the legacy map.
//
// Pure with respect to its input; returns every owned file as text plus a model
// for the reports. No clock, no network, no randomness; all output is sorted.

import { createHash } from "node:crypto";
import { basename } from "node:path";
import { codesForText } from "../../lib/identity.mjs";
import { CASES } from "../authored/cases.mjs";
import { PLANS, SCENARIOS, SCENARIO_BASIS_RATIONALE } from "../authored/scenarios.mjs";
import { classifyAll } from "./classify.mjs";
import { clip } from "./sources.mjs";
import { cmp, isBoilerplateSpanNote as isBoilerplate, slugify, suiteSourcePath, TEXT_MAX, uniqSorted, weakestBasis } from "./legacy-model.mjs";
import { LEGACY_REPOSITORY } from "./legacy-source.mjs";

export const IMPORTER_VERSION = "2.0.0";
export const GENERATOR_NAME = "redact-secret-benchmarks-fixture-generators";
export const OWNED_DIRS = ["records/scenarios", "records/cases", "records/fixture-plans", "records/fixtures", "migration/legacy-map"];
export const SYSTEM_SOURCE = "legacy-benchmark-source";
const PROJECT_NOTE = "Project-authored by the Redact Secret project, which maintains this repository; not independent evidence.";

// ------------------------------------------------------------------ serialization

const json = (v) => JSON.stringify(v);
const pretty = (record) => `${JSON.stringify(record, null, 2)}\n`;

/** Pretty JSON, except that the named array fields are written one element per line and the named map fields one entry per line. */
function serializeExpanded(record, { arrays = [], maps = [] }) {
  const shell = { ...record };
  for (const f of [...arrays, ...maps]) if (f in shell) shell[f] = `@@${f}@@`;
  let text = JSON.stringify(shell, null, 2);
  for (const f of arrays) {
    if (!(f in record)) continue;
    const body = `[\n${record[f].map((x) => `    ${json(x)}`).join(",\n")}\n  ]`;
    text = text.replace(`"@@${f}@@"`, () => body);
  }
  for (const f of maps) {
    if (!(f in record)) continue;
    const body = `{\n${Object.entries(record[f]).map(([k, v]) => `    ${json(k)}: ${json(v)}`).join(",\n")}\n  }`;
    text = text.replace(`"@@${f}@@"`, () => body);
  }
  return `${text}\n`;
}

// ------------------------------------------------------------------ identity helpers

/** Remove migration coordinates from a legacy fixture name so it can live in a canonical id. */
const COORDINATE_STRIPPERS = [/(?<![a-z0-9])beta-?\d+[a-z]?/gi, /(?<![a-z0-9])milestone-?\d+/gi, /(?<![a-z0-9])(issue|pr|gh)-?\d+(?![a-z0-9])/gi, /(?<![a-z0-9])redact-secret-\d+/gi, /(?<![a-z0-9])(rc\d+|release-?\d+)(?![a-z0-9])/gi, /(?<![a-z0-9])detectors?(?![a-z0-9])/gi, /(?<![a-z0-9])(trufflehog|gitleaks|kingfisher|detect-secrets|ggshield|semgrep|noseyparker|secretlint)(?![a-z0-9])/gi];
export function scrubName(name) {
  let s = String(name);
  for (let i = 0; i < 3; i += 1) for (const re of COORDINATE_STRIPPERS) s = s.replace(re, "");
  return s.replace(/-+/g, "-").replace(/^[-_.]+|[-_.]+$/g, "") || "fixture";
}
/** A file name with coordinates removed from its stem; the extension is kept (scanners may key on it). */
export function scrubFileName(base) {
  const i = base.lastIndexOf(".");
  if (i <= 0) return scrubName(base);
  return `${scrubName(base.slice(0, i))}${base.slice(i)}`;
}

const evidenceKey = (entry) => `ev-${createHash("sha256").update(json(entry)).digest("hex").slice(0, 10)}`;

// ------------------------------------------------------------------ builder

/**
 * @param {{ model: object, taxonomy: object }} input  model from loadLegacyModel
 */
export function buildRecords({ model, taxonomy }) {
  const { aggs, fx, revision, semantics, catById, corpora, tally: R, permalink } = model;
  const files = new Map();
  const classification = classifyAll(aggs);
  const observedAtDefault = semantics.reviewedAt;
  const scenarioById = new Map(SCENARIOS.map((s) => [s.id, s]));
  const caseById = new Map(CASES.map((c) => [c.id, c]));

  // ---- per-fixture target and set
  for (const e of fx) {
    e.cls = classification.get(e.agg.key);
    e.families = uniqSorted(e.idx.familyIds);
    for (const f of e.families) if (!taxonomy.families.has(f)) throw new Error(`${e.slug}: family ${f} is not in the taxonomy records`);
    const providers = uniqSorted(e.families.map((f) => taxonomy.families.get(f).provider));
    const base = providers.length === 0 ? "provider-neutral" : providers.length === 1 ? providers[0] : "cross-provider";
    e.setBase = base;
    e.setId = e.generated ? base : `authored-${base}`;
    if (e.cls.target.type === "scenario" && !e.families.length) throw new Error(`${e.slug}: a scenario cell needs at least one family`);
  }

  // ---- fixture ids: <set>--<scrubbed legacy name>, collisions resolved in legacy-slug order
  const taken = new Map();
  for (const e of [...fx].sort((a, b) => cmp(a.slug, b.slug))) {
    if (!taken.has(e.setId)) taken.set(e.setId, new Set());
    const used = taken.get(e.setId);
    const name = scrubName(e.name);
    let candidate = name;
    if (used.has(candidate)) candidate = `${name}-${e.cls.target.id}`.slice(0, 120);
    for (let n = 2; used.has(candidate); n += 1) candidate = `${name}-${n}`;
    used.add(candidate);
    if (candidate !== name) R.inc("fixture-id:collision-suffixed");
    if (name !== slugify(e.name) || scrubName(e.name) !== e.name) R.inc("fixture-id:coordinate-scrubbed");
    e.newName = candidate;
    e.newId = `${e.setId}--${candidate}`;
    const bad = codesForText(e.newId, { segments: false });
    if (bad.size) throw new Error(`${e.slug}: canonical fixture id ${e.newId} still carries coordinates (${[...bad].join(", ")})`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*--[a-z0-9]+(-[a-z0-9]+)*$/.test(e.newId) || e.newId.length > 200) throw new Error(`${e.slug}: ${e.newId} is not a valid fixture id`);
  }
  const newIdOfSlug = new Map(fx.map((e) => [e.slug, e.newId]));

  // ---- scenarios
  const usedScenarioIds = new Set(fx.filter((e) => e.cls.target.type === "scenario").map((e) => e.cls.target.id));
  const scenarioRecords = SCENARIOS.map((s) => {
    const r = {
      schemaVersion: 1,
      kind: "scenario",
      id: s.id,
      title: s.title,
      description: s.description,
      semantics: s.semantics,
      expectedOutcomeClass: s.outcome,
      applicability: s.applicability,
      evidenceBasis: s.unresolved
        ? { basis: "unresolved", rationale: "The legacy evidence for these inputs was unresolved (tier T0), so the scenario asserts no outcome; each fixture's own evidence entry records the legacy reason.", sources: [], observedAt: observedAtDefault }
        : { basis: "project-policy", rationale: SCENARIO_BASIS_RATIONALE, sources: [], observedAt: observedAtDefault },
      lifecycle: "draft",
      notes: `${PROJECT_NOTE} Draft; not yet reviewed.`,
    };
    return r;
  });
  for (const s of SCENARIOS) if (s.plan && !PLANS[s.plan]) throw new Error(`scenario ${s.id}: unknown plan ${s.plan}`);
  for (const id of usedScenarioIds) if (!scenarioById.has(id)) throw new Error(`classification targets unknown scenario ${id}`);
  for (const s of scenarioRecords) files.set(`records/scenarios/${s.id}.json`, pretty(s));

  // ---- cases
  const aggsOfCase = new Map();
  for (const agg of aggs) {
    const c = classification.get(agg.key);
    if (c.target.type !== "case") continue;
    if (!aggsOfCase.has(c.target.id)) aggsOfCase.set(c.target.id, []);
    aggsOfCase.get(c.target.id).push(agg);
  }
  const caseRecords = [];
  const caseInfo = new Map();
  const caseFamilies = new Map();
  for (const authored of [...CASES].sort((a, b) => cmp(a.id, b.id))) {
    const group = aggsOfCase.get(authored.id);
    if (!group) throw new Error(`authored case ${authored.id} has no legacy group`);
    const entries = group.flatMap((a) => a.entries);
    const outcomes = uniqSorted(group.map((a) => a.outcome));
    if (outcomes.length !== 1) throw new Error(`authored case ${authored.id} mixes outcomes ${outcomes.join(", ")}`);
    const outcome = outcomes[0];
    const basis = weakestBasis(group.map((a) => a.evidence.basis));
    const srcMap = new Map();
    for (const a of group) for (const s of a.evidence.sources) srcMap.set(json(s), s);
    const sources = [...srcMap.values()].sort((a, b) => cmp(json(a), json(b)));
    const observedAt = group.map((a) => a.evidence.observedAt).sort(cmp).at(-1);
    const famIds = uniqSorted(entries.flatMap((e) => e.families));
    const positive = outcome === "must-flag";
    const caseTypes = [positive ? "positive" : "benign"];
    if (famIds.length >= 2) caseTypes.push("cross-family");
    const record = {
      schemaVersion: 1,
      kind: "case",
      id: authored.id,
      title: authored.title,
      summary: authored.summary,
      rationale: authored.rationale,
      caseTypes,
      families: famIds.map((family) => ({ family, role: positive ? "subject" : "lookalike" })),
    };
    if (!famIds.length) {
      const reasons = uniqSorted(entries.map((e) => e.idx.unscopedReason).filter(Boolean));
      record.unscopedReason = clip(reasons[0] ?? "The inputs involve no credential family; they are generic benign controls.", TEXT_MAX);
      R.inc("cases:unscoped");
    }
    for (const sid of authored.scenarios) if (!scenarioById.has(sid)) throw new Error(`case ${authored.id}: unknown scenario ${sid}`);
    record.scenarios = [...authored.scenarios].sort(cmp);
    record.expectation = { outcome, basis, rationale: authored.expectation, sources, observedAt };
    const incidents = new Map();
    for (const e of entries) for (const inc of model.incidentsBySlug.get(e.slug) ?? []) incidents.set(inc.id, inc);
    if (incidents.size) {
      record.incidents = [...incidents.values()].sort((a, b) => cmp(a.id, b.id));
      R.inc("cases:with-incidents");
    }
    record.lifecycle = "draft";
    const refs = [];
    const seenSuites = new Set();
    for (const a of group) {
      const k = `${a.suite}|${a.group}`;
      if (seenSuites.has(k)) continue;
      seenSuites.add(k);
      const n = group.filter((x) => x.suite === a.suite && x.group === a.group).reduce((s, x) => s + x.entries.length, 0);
      refs.push({ system: SYSTEM_SOURCE, id: `${revision}:${suiteSourcePath(a.suite)}#${slugify(a.group)}`, url: permalink(suiteSourcePath(a.suite)), note: clip(`legacy suite ${a.suite}; group ${a.group}; ${n} fixture${n === 1 ? "" : "s"}`, 200) });
    }
    const issues = uniqSorted(entries.map((e) => e.f.issue).filter((x) => x != null).map(String));
    for (const i of issues) refs.push({ system: "redact-secret-issue", id: `redact-secret#${i}`, url: `https://github.com/redact-secret/redact-secret/issues/${i}`, note: "Product issue the legacy fixture was written for." });
    for (const a of group) {
      const num = /^#(\d+)/.exec(a.group)?.[1];
      if (num) refs.push({ system: "redact-secret-benchmarks-issue", id: `redact-secret-benchmarks#${num}`, url: `https://github.com/${LEGACY_REPOSITORY}/issues/${num}`, note: "Legacy benchmark issue the group was written for." });
    }
    record.externalRefs = [...new Map(refs.map((r) => [json(r), r])).values()].sort((a, b) => cmp(json(a), json(b)));
    record.notes = `${PROJECT_NOTE} Reclassified from ${group.length} legacy group${group.length === 1 ? "" : "s"} (${entries.length} fixtures); draft, not yet reviewed.`;
    caseRecords.push(record);
    caseInfo.set(authored.id, { aggs: group, fixtures: entries.length, basis, outcome, families: famIds.length });
    caseFamilies.set(authored.id, famIds);
    files.set(`records/cases/${record.id}.json`, pretty(record));
    R.inc("records:case");
    for (const t of caseTypes) R.inc(`case-type:${t}`);
    R.inc(`case-outcome:${outcome}`);
    R.inc(`basis:${basis}`);
  }
  if (aggsOfCase.size !== CASES.length) throw new Error(`classification produced ${aggsOfCase.size} cases but ${CASES.length} are authored`);

  // ---- fixture sets, one per family-provider group (authored and generated kept apart)
  const bySet = new Map();
  for (const e of fx) {
    if (!bySet.has(e.setId)) bySet.set(e.setId, []);
    bySet.get(e.setId).push(e);
  }
  const setRecords = [];
  const plansOfSet = new Map();
  const cellsOfPlan = new Map();
  const sourceEvidenceCount = { perFixtureDistinct: new Set() };
  for (const setId of [...bySet.keys()].sort(cmp)) {
    const entries = bySet.get(setId).sort((a, b) => cmp(a.newId, b.newId));
    const isGenerated = entries[0].generated;
    if (entries.some((e) => e.generated !== isGenerated)) throw new Error(`set ${setId} mixes authored and generated fixtures`);
    const providerName = (id) => taxonomy.providers.get(id)?.name ?? id;
    const base = entries[0].setBase;
    const evidence = {};
    const items = entries.map((e) => {
      const f = e.f;
      const bytes = Buffer.from(f.content, "utf8");
      if (!/^[A-Za-z0-9._/-]+$/.test(f.path)) throw new Error(`${e.slug}: path ${f.path} is not portable`);
      let spans = f.expected.map((s) => {
        const out = { start: s.start, end: s.end, role: s.role ?? "secret" };
        if (s.note && !isBoilerplate(s.note)) {
          out.note = clip(s.note, TEXT_MAX);
          R.inc("spans:custom-note-kept");
        } else if (s.note) R.inc("dropped:span-boilerplate-note");
        if (s.envelope) {
          out.envelope = { start: s.envelope.start, end: s.envelope.end, reason: clip(s.envelope.reason, TEXT_MAX) };
          R.inc("spans:envelope");
        }
        if (s.end > bytes.length) throw new Error(`${e.slug}: span ends after content`);
        R.inc(`spans:role:${out.role}`);
        return out;
      });
      if (e.outcome === "must-not-flag" && spans.length) {
        R.inc("dropped:companion-span-on-must-not-flag", spans.length);
        spans = [];
      }
      // ADR 0012 decision 2: an unresolved (T0) fixture keeps its candidate spans as non-asserting data, never as expected spans.
      let candidate;
      if (e.outcome === "not-assertable" && spans.length) {
        if (f.assessment.kind !== "must-redact" || !spans.some((s) => s.role === "secret")) throw new Error(`${e.slug}: T0 spans on a fixture that does not propose must-redact with a secret span`);
        candidate = { asserting: false, outcome: "must-flag", spans };
        R.inc("kept:t0-candidate-spans", spans.length);
        R.inc("kept:t0-fixtures-with-candidate");
        spans = [];
      }
      const ev = e.evidence;
      const key = evidenceKey(ev);
      if (evidence[key] && json(evidence[key]) !== json(ev)) throw new Error(`evidence key collision ${key}`);
      evidence[key] = ev;
      sourceEvidenceCount.perFixtureDistinct.add(key);
      const item = { id: e.newId };
      if (e.cls.target.type === "case") {
        item.case = e.cls.target.id;
        // ADR 0012 decision 4: a fixture narrower than its Case's family set keeps its own (legacy) family reading.
        const ofCase = caseFamilies.get(item.case);
        if (ofCase.some((x) => !e.families.includes(x))) {
          item.families = e.families;
          if (!e.families.length) {
            if (!e.idx.unscopedReason) throw new Error(`${e.slug}: no family and no legacy unscoped reason`);
            item.unscopedReason = clip(e.idx.unscopedReason, TEXT_MAX);
          }
          R.inc("fixtures:families-override");
          R.inc("fixtures:families-override-links-removed", ofCase.length - e.families.length);
        }
      } else {
        const plan = scenarioById.get(e.cls.target.id).plan;
        if (!plan) throw new Error(`scenario ${e.cls.target.id} has fixtures but no plan`);
        item.cell = { plan, scenario: e.cls.target.id, families: e.families };
        if (!cellsOfPlan.has(plan)) cellsOfPlan.set(plan, []);
        cellsOfPlan.get(plan).push(e);
        if (!plansOfSet.has(setId)) plansOfSet.set(setId, new Set());
        plansOfSet.get(setId).add(plan);
      }
      item.path = `${e.newName}/${scrubFileName(basename(f.path))}`;
      if (f.contextAxis) item.context = slugify(f.contextAxis);
      if (f.twinOf) {
        const of = newIdOfSlug.get(`${e.suite}--${f.twinOf}`);
        if (!of) throw new Error(`${e.slug}: twinOf '${f.twinOf}' is not a fixture of its suite`);
        item.lineage = { relation: "twin-of", of, mutationKind: f.mutationKind };
        if (f.mutation) item.lineage.mutation = clip(String(f.mutation).replace(/\s+/g, " ").trim(), TEXT_MAX);
        R.inc("lineage:twin-fixtures");
        R.inc(`lineage:mutation-kind:${f.mutationKind}`);
      }
      item.evidence = key;
      const incidents = model.incidentsBySlug.get(e.slug);
      if (incidents && e.cls.target.type === "scenario") {
        item.incidents = [...incidents].sort((a, b) => cmp(a.id, b.id));
        R.inc("fixtures:with-incidents");
      }
      item.sha256 = createHash("sha256").update(bytes).digest("hex");
      item.text = f.content;
      item.expected = { outcome: e.outcome, spans };
      if (candidate) item.candidateReading = candidate;
      R.inc(`fixtures:${isGenerated ? "generated" : "authored"}`);
      R.inc(`fixture-outcome:${e.outcome}`);
      R.inc(`map:${f.assessment.kind}/${f.assessment.tier} -> ${e.outcome}`);
      R.inc("fixtures:content-bytes", bytes.length);
      if (f.detectors) R.inc("dropped:fixture-detector-assignment");
      if (f.arrivalTargets) R.inc("dropped:fixture-arrival-targets");
      if (f.expectedAction) R.inc("dropped:fixture-expected-action");
      if (f.policyFamily) R.inc("dropped:fixture-policy-family");
      if (f.policyConformance) R.inc("dropped:fixture-policy-conformance");
      if (f.formatReason) R.inc("dropped:fixture-format-reason-duplicate");
      if (f.assessment.contract) R.inc("dropped:assessment-contract-detector-key");
      if (e.idx.provenance.milestone) R.inc("dropped:fixture-provenance-milestone");
      if (e.idx.provenance.release) R.inc("dropped:fixture-provenance-release");
      return item;
    });
    const statements = uniqSorted(entries.map((e) => corpora.get(e.suite).corpus.provenance ?? "Hand-written by the legacy benchmark authors; every credential-shaped value is synthetic and was never issued by a provider (legacy fixtures README)."));
    const title = base === "provider-neutral" ? "Provider-neutral inputs" : base === "cross-provider" ? "Inputs spanning several providers" : `${providerName(base)} fixtures`;
    const rec = {
      schemaVersion: 1,
      kind: "fixture-set",
      id: setId,
      title: `${title} (${isGenerated ? "generated" : "authored"})`,
      description: clip(
        `${isGenerated ? "Recorded output of the benchmark's fixture generators" : "Hand-written fixtures"} whose credential family belongs to ${base === "provider-neutral" ? "no provider (inputs with no family)" : base === "cross-provider" ? "more than one provider" : `the provider ${providerName(base)}`}. Each fixture projects a Case or a fixture-plan cell and carries its own evidence entry; the set is organised by provider, not by how the legacy benchmark grouped its suites.`,
        TEXT_MAX,
      ),
      origin: isGenerated
        ? { type: "generation-rule", rule: "recorded-generator-output", generator: { name: GENERATOR_NAME, version: `legacy-${revision.slice(0, 12)}`, sourceRevision: revision, entrypoint: "fixtures/generated/build.mjs" } }
        : { type: "authored-cases" },
      generated: isGenerated,
      evidence,
      fixtures: items,
      lifecycle: "draft",
      notes: clip(statements.join(" ").replace(/\s+/g, " ").trim(), TEXT_MAX, () => R.inc("truncated:set-notes")),
    };
    setRecords.push(rec);
    files.set(`records/fixtures/${setId}.json`, serializeExpanded(rec, { arrays: ["fixtures"], maps: ["evidence"] }));
    R.inc("records:fixture-set");
    R.inc(`sets:${isGenerated ? "generated" : "authored"}`);
  }
  R.inc("evidence:entries", sourceEvidenceCount.perFixtureDistinct.size);

  // ---- fixture plans
  const planRecords = [];
  for (const planId of Object.keys(PLANS).sort(cmp)) {
    const p = PLANS[planId];
    const cells = cellsOfPlan.get(planId) ?? [];
    if (!cells.length) throw new Error(`plan ${planId} has no cells`);
    const scenarioIds = uniqSorted(cells.map((e) => e.cls.target.id));
    const families = uniqSorted(cells.flatMap((e) => e.families));
    const carriers = uniqSorted(cells.map((e) => e.f.contextAxis).filter(Boolean).map(slugify));
    const outputs = uniqSorted(cells.map((e) => e.setId));
    const rec = {
      schemaVersion: 1,
      kind: "fixture-plan",
      id: planId,
      title: p.title,
      description: p.description,
      matrix: {
        families: { select: "listed", ids: families },
        targets: scenarioIds.map((id) => ({ type: "scenario", id })),
        ...(carriers.length ? { carriers } : {}),
        coverage: "sparse",
      },
      generation: { rule: p.rule, generator: { name: GENERATOR_NAME, version: `legacy-${revision.slice(0, 12)}`, sourceRevision: revision, entrypoint: "fixtures/generated/build.mjs" } },
      lineage: { origin: "reclassified-from-cases", derivedFrom: scenarioIds.map((id) => ({ kind: "scenario", id })), note: "Reclassified out of the legacy imported cases, which were matrix cells; the correspondence is in migration/legacy-map." },
      output: outputs,
      lifecycle: "draft",
      notes: `${PROJECT_NOTE} The matrix is sparse: the content instantiates the cells below, not every family against every scenario.`,
    };
    planRecords.push(rec);
    files.set(`records/fixture-plans/${planId}.json`, pretty(rec));
    R.inc("records:fixture-plan");
    R.inc(`plan-cells:${planId}`, cells.length);
  }
  R.inc("records:scenario", scenarioRecords.length);

  // ---- legacy map, one shard per legacy suite
  const mapRecords = [];
  const canonicalOfAgg = (agg) => {
    const c = classification.get(agg.key);
    if (c.target.type === "case") return { type: "case", id: c.target.id };
    const plan = scenarioById.get(c.target.id).plan;
    return [{ type: "scenario", id: c.target.id }, { type: "fixture-plan", id: plan }];
  };
  for (const suite of model.suites) {
    const cat = catById.get(suite);
    const suiteAggs = aggs.filter((a) => a.suite === suite);
    const entries = [];
    const distinct = new Map();
    for (const a of suiteAggs) for (const t of [canonicalOfAgg(a)].flat()) distinct.set(`${t.type}:${t.id}`, t);
    const classes = new Set(suiteAggs.map((a) => classification.get(a.key).cls));
    const relation = classes.has("case") ? "merged" : classes.has("scenario") ? "reclassified-as-scenario" : "reclassified-as-projection";
    const counts = ["case", "scenario", "projection"].map((k) => `${suiteAggs.filter((a) => classification.get(a.key).cls === k).length} ${k}`).join(", ");
    const suiteFx = fx.filter((e) => e.suite === suite);
    entries.push({
      legacy: { type: "suite", id: suite, path: cat.corpus, title: clip(cat.title, 200), description: clip(String(cat.description).replace(/\s+/g, " ").trim(), TEXT_MAX) },
      canonical: [...distinct.values()].sort((a, b) => cmp(`${a.type}:${a.id}`, `${b.type}:${b.id}`)),
      relation,
      note: `${suiteFx.length} fixtures in ${suiteAggs.length} imported cases (${counts}); every fixture is listed below with its canonical id.`,
    });
    const caseCount = new Map();
    for (const a of suiteAggs) {
      const c = classification.get(a.key);
      if (c.target.type === "case") caseCount.set(c.target.id, (caseCount.get(c.target.id) ?? 0) + 1);
    }
    for (const a of suiteAggs.sort((x, y) => cmp(x.legacyCaseId, y.legacyCaseId))) {
      const c = classification.get(a.key);
      const n = a.entries.length;
      let rel;
      if (c.target.type === "case") rel = aggsOfCase.get(c.target.id).length === 1 ? "same" : "merged";
      else rel = c.cls === "scenario" ? "reclassified-as-scenario" : "reclassified-as-projection";
      entries.push({
        legacy: { type: "case", id: a.legacyCaseId, path: `records/cases/${a.suite}/${a.legacyCaseId}.json` },
        canonical: canonicalOfAgg(a),
        relation: rel,
        note: `rule ${c.rule}; legacy tier ${a.tier}; ${n} fixture${n === 1 ? "" : "s"}`,
      });
    }
    for (const e of suiteFx.sort((x, y) => cmp(x.slug, y.slug))) {
      const legacy = { type: "fixture", id: e.slug, path: e.f.path };
      if (e.idx.scenarioIds.length) legacy.scenarioIds = uniqSorted(e.idx.scenarioIds);
      entries.push({ legacy, canonical: { type: "fixture", id: e.newId }, relation: "same" });
    }
    const rec = {
      schemaVersion: 1,
      kind: "legacy-map",
      id: suite,
      title: clip(`Legacy map for suite ${suite}`, 200),
      source: { repository: LEGACY_REPOSITORY, revision },
      entries,
      lifecycle: "draft",
      notes: "Migration provenance (ADR 0007, ADR 0008): where every legacy suite, imported case and fixture of this suite went. Legacy names appear only on the legacy side. `case` entries name the groups that the first import (issue #4) minted, which are superseded by this reclassification; their path is the file that import wrote.",
    };
    mapRecords.push(rec);
    files.set(`migration/legacy-map/${suite}.json`, serializeExpanded(rec, { arrays: ["entries"] }));
    R.inc("records:legacy-map");
    R.inc("map:entries", entries.length);
  }

  return {
    files,
    classification,
    records: { scenarios: scenarioRecords, cases: caseRecords, plans: planRecords, sets: setRecords, maps: mapRecords },
    caseInfo,
    cellsOfPlan,
    newIdOfSlug,
    planOfScenario: new Map(SCENARIOS.filter((s) => s.plan).map((s) => [s.id, s.plan])),
  };
}

