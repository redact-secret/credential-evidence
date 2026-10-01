// Dependency-light validator for credential-evidence records.
//
// Pure and deterministic: reads local schema files only, never touches the
// network, and returns errors sorted so output is stable across runs.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { checkIdentity } from "./identity.mjs";
import { checkNarrativeLint } from "./narrative-lint.mjs";
import { checkPlaceholders } from "./placeholders.mjs";

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(here, "..", "..");
export const schemaDir = join(repoRoot, "schemas");

export const KINDS = [
  "provider",
  "family",
  "family-narrative",
  "format-contract",
  "evidence-source",
  "variant",
  "benign-sibling",
  "case",
  "fixture-projection",
  "fixture-set",
  "evidence-review-history",
  "scenario",
  "fixture-plan",
  "legacy-map",
];

const schemaUrn = (version, name) => `urn:credential-evidence:schema:v${version}:${name}`;

export function loadSchemas(dir = schemaDir) {
  const schemas = [];
  for (const versionDir of readdirSync(dir).filter((d) => /^v[1-9][0-9]*$/.test(d)).sort()) {
    const full = join(dir, versionDir);
    for (const file of readdirSync(full).filter((f) => f.endsWith(".schema.json")).sort()) {
      schemas.push({ file: join(versionDir, file), schema: JSON.parse(readFileSync(join(full, file), "utf8")) });
    }
  }
  return schemas;
}

export function createValidator(schemas = loadSchemas()) {
  const ajv = new Ajv2020({ strict: true, strictTypes: false, strictRequired: false, allErrors: true });
  ajv.addKeyword("x-schemaRevision");
  for (const { schema } of schemas) ajv.addSchema(schema);
  const compiled = new Map();
  for (const { schema } of schemas) {
    if (!schema.$id.endsWith(":common")) compiled.set(schema.$id, ajv.getSchema(schema.$id));
  }
  return {
    /** Schema-validate one record. Returns a list of error strings. */
    validateRecord(record) {
      if (record === null || typeof record !== "object" || Array.isArray(record)) return ["record must be a JSON object"];
      if (typeof record.kind !== "string") return ["missing string field 'kind'"];
      if (!KINDS.includes(record.kind)) return [`unknown kind '${record.kind}'`];
      if (!Number.isInteger(record.schemaVersion)) return ["missing integer field 'schemaVersion'"];
      const validate = compiled.get(schemaUrn(record.schemaVersion, record.kind));
      if (!validate) return [`no schema for kind '${record.kind}' schemaVersion ${record.schemaVersion}`];
      if (validate(record)) return [];
      return validate.errors.map((e) => `${e.instancePath || "/"} ${e.message}${paramText(e)}`).sort();
    },
  };
}

function paramText(e) {
  const p = e.params ?? {};
  if (p.additionalProperty) return ` '${p.additionalProperty}'`;
  if (p.missingProperty) return ` '${p.missingProperty}'`;
  if (p.allowedValues) return ` (${p.allowedValues.join(", ")})`;
  return "";
}

/** Recursively list .json files under a directory, sorted. */
export function listJson(dir) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (name.endsWith(".json")) out.push(p);
    }
  };
  walk(dir);
  return out;
}

const key = (kind, id) => `${kind}:${id}`;

/**
 * Semantic checks that JSON Schema cannot express: uniqueness, referential
 * integrity, contract chains, historical pinning and case/fixture agreement.
 * `entries` is [{ path, record }] of schema-valid records.
 */
export function checkIntegrity(entries) {
  const errors = [];
  const err = (path, msg) => errors.push(`${path}: ${msg}`);
  const byKind = new Map(KINDS.map((k) => [k, new Map()]));

  for (const { path, record } of entries) {
    const bucket = byKind.get(record.kind);
    if (!bucket) continue;
    if (bucket.has(record.id)) err(path, `duplicate ${record.kind} id '${record.id}' (also ${bucket.get(record.id).path})`);
    else bucket.set(record.id, { path, record });
  }
  const get = (kind, id) => byKind.get(kind).get(id)?.record;
  const has = (kind, id) => byKind.get(kind).has(id);

  // Fixture ids share one namespace across single projections and set items.
  const fixtureIds = new Map();
  const claimFixtureId = (path, id) => {
    if (fixtureIds.has(id)) err(path, `duplicate fixture id '${id}' (also ${fixtureIds.get(id)})`);
    else fixtureIds.set(id, path);
  };
  for (const { path, record } of entries) {
    if (record.kind === "fixture-projection") claimFixtureId(path, record.id);
    else if (record.kind === "fixture-set") for (const item of record.fixtures) claimFixtureId(path, item.id);
  }
  // Cases that at least one fixture projects (case -> fixture integrity).
  const projected = new Set();
  for (const { record } of entries) {
    if (record.kind === "fixture-projection" && record.origin.type === "authored-case") projected.add(record.origin.case);
    if (record.kind === "fixture-projection" && record.origin.type === "generation-rule") {
      for (const inp of record.origin.inputs) if (inp.kind === "case") projected.add(inp.id);
    }
    if (record.kind === "fixture-set") for (const item of record.fixtures) if (item.case) projected.add(item.case);
  }

  // evidence-review-history of each narrative, by narrative id (subject kind family-narrative)
  const narrativeHistory = new Map();
  for (const { path, record } of entries) {
    if (record.kind !== "evidence-review-history" || record.subject.kind !== "family-narrative") continue;
    if (narrativeHistory.has(record.subject.id)) err(path, `a second review history for narrative '${record.subject.id}' (also ${narrativeHistory.get(record.subject.id).id})`);
    else narrativeHistory.set(record.subject.id, record);
  }

  const legacyMapped = new Map(); // legacy entity -> the map file that lists it (unique across shards)

  const checkSourceRefs = (path, refs, where, needsPinned) => {
    for (const [i, ref] of (refs ?? []).entries()) {
      const src = get("evidence-source", ref.sourceId);
      if (!src) {
        err(path, `${where}.sources[${i}] cites unknown evidence-source '${ref.sourceId}'`);
      } else if (needsPinned && src.locator.pin.kind === "live-unpinned") {
        err(path, `${where} states a historical fact but cites live-unpinned source '${ref.sourceId}'; pin it to a commit, archive snapshot or digest`);
      }
    }
  };

  for (const { path, record: r } of entries) {
    switch (r.kind) {
      case "family": {
        if (!r.id.startsWith(`${r.provider}:`)) err(path, `family id '${r.id}' must start with its provider '${r.provider}:'`);
        if (!has("provider", r.provider)) err(path, `unknown provider '${r.provider}'`);
        if (r.currentContract != null) {
          const c = get("format-contract", r.currentContract);
          if (!c) err(path, `currentContract '${r.currentContract}' does not exist`);
          else if (c.family !== r.id) err(path, `currentContract '${r.currentContract}' belongs to family '${c.family}'`);
        }
        break;
      }
      case "format-contract": {
        if (r.id !== `${r.family}@${r.revision}`) err(path, `id '${r.id}' must equal '${r.family}@${r.revision}'`);
        if (!has("family", r.family)) err(path, `unknown family '${r.family}'`);
        if (r.supersedes != null) {
          const prev = get("format-contract", r.supersedes);
          if (!prev) err(path, `supersedes unknown contract '${r.supersedes}'`);
          else {
            if (prev.family !== r.family) err(path, `supersedes contract of another family '${prev.family}'`);
            if (prev.revision >= r.revision) err(path, `supersedes revision ${prev.revision} which is not older than ${r.revision}`);
          }
        } else if (r.revision !== 1) {
          err(path, "only revision 1 may have supersedes: null");
        }
        for (const [i, c] of r.claims.entries()) {
          checkSourceRefs(path, c.sources, `claims[${i}]`, c.temporality === "historical");
        }
        break;
      }
      case "evidence-source": {
        const times = r.observations.map((o) => o.observedAt);
        if (times.some((t, i) => i > 0 && t < times[i - 1])) err(path, "observations must be in non-decreasing observedAt order (append-only log)");
        break;
      }
      case "variant": {
        if (!has("family", r.family)) err(path, `unknown family '${r.family}'`);
        if (r.contract != null) {
          const c = get("format-contract", r.contract);
          if (!c) err(path, `unknown contract '${r.contract}'`);
          else if (c.family !== r.family) err(path, `contract '${r.contract}' belongs to family '${c.family}'`);
        }
        if (r.replaces != null && !has("variant", r.replaces)) err(path, `replaces unknown variant '${r.replaces}'`);
        for (const [i, h] of r.history.entries()) checkSourceRefs(path, h.sources, `history[${i}]`, true);
        break;
      }
      case "benign-sibling": {
        for (const f of r.families) if (!has("family", f)) err(path, `unknown family '${f}'`);
        checkSourceRefs(path, r.sources, "sources", false);
        break;
      }
      case "case": {
        for (const [i, f] of r.families.entries()) {
          if (!has("family", f.family)) err(path, `families[${i}] unknown family '${f.family}'`);
          if (f.contract) {
            const c = get("format-contract", f.contract);
            if (!c) err(path, `families[${i}] unknown contract '${f.contract}'`);
            else if (c.family !== f.family) err(path, `families[${i}] contract '${f.contract}' belongs to family '${c.family}'`);
          }
        }
        for (const rel of r.relations ?? []) {
          if (rel.target === r.id) err(path, "case relates to itself");
          else if (!has("case", rel.target)) err(path, `relation ${rel.type} targets unknown case '${rel.target}'`);
        }
        if (r.supersededBy && !has("case", r.supersededBy)) err(path, `supersededBy unknown case '${r.supersededBy}'`);
        for (const sid of r.scenarios ?? []) if (!has("scenario", sid)) err(path, `scenarios: '${sid}' is not a scenario record`);
        checkSourceRefs(path, r.expectation.sources, "expectation", false);
        if (r.expectation.outcome !== "not-assertable" && !projected.has(r.id)) {
          err(path, `case '${r.id}' has an assertable expectation but no fixture projects it`);
        }
        break;
      }
      case "fixture-projection": {
        const o = r.origin;
        if (o.type === "authored-case") {
          const c = get("case", o.case);
          if (!c) err(path, `origin.case '${o.case}' does not exist`);
          else if (c.expectation.outcome !== r.expected.outcome) {
            err(path, `expected.outcome '${r.expected.outcome}' disagrees with case '${o.case}' outcome '${c.expectation.outcome}'`);
          }
        } else if (o.type === "reviewed-contract") {
          if (!has("format-contract", o.contract)) err(path, `origin.contract '${o.contract}' does not exist`);
        } else {
          const kinds = { case: "case", "format-contract": "format-contract", "fixture-projection": "fixture-projection" };
          for (const inp of o.inputs) {
            if (!has(kinds[inp.kind], inp.id)) err(path, `origin.inputs references unknown ${inp.kind} '${inp.id}'`);
          }
        }
        if (r.lineage) {
          if (r.lineage.of === r.id) err(path, "lineage points at itself");
          else if (!fixtureIds.has(r.lineage.of)) err(path, `lineage.of unknown fixture '${r.lineage.of}'`);
        }
        for (const [i, s] of r.expected.spans.entries()) {
          if (s.end <= s.start) err(path, `expected.spans[${i}] end must be greater than start`);
        }
        break;
      }
      case "fixture-set": {
        const cited = new Set();
        for (const [key, ev] of Object.entries(r.evidence ?? {})) {
          checkSourceRefs(path, ev.sources, `evidence '${key}'`, false);
        }
        for (const [n, item] of r.fixtures.entries()) {
          const where = `fixtures[${n}] '${item.id}'`;
          if (!item.id.startsWith(`${r.id}--`)) err(path, `${where}: id must start with the set id '${r.id}--'`);
          let ownEvidence;
          if (item.case) {
            const c = get("case", item.case);
            if (!c) err(path, `${where}: case '${item.case}' does not exist`);
            else if (c.expectation.outcome !== item.expected.outcome) {
              err(path, `${where}: expected.outcome '${item.expected.outcome}' disagrees with case '${item.case}' outcome '${c.expectation.outcome}'`);
            }
            ownEvidence = c?.expectation;
          } else {
            const cell = item.cell;
            const plan = get("fixture-plan", cell.plan);
            const scenario = get("scenario", cell.scenario);
            if (!plan) err(path, `${where}: cell.plan '${cell.plan}' does not exist`);
            if (!scenario) err(path, `${where}: cell.scenario '${cell.scenario}' does not exist`);
            ownEvidence = scenario?.evidenceBasis;
            if (plan && scenario) {
              const targets = plan.matrix.targets.filter((t) => t.type === "scenario" && t.id === cell.scenario);
              if (!targets.length) err(path, `${where}: scenario '${cell.scenario}' is not a target of plan '${cell.plan}'`);
              const allowed = new Set(targets.map((t) => t.expectedOutcome ?? (scenario.expectedOutcomeClass === "by-projection" ? undefined : scenario.expectedOutcomeClass)).filter(Boolean));
              if (targets.length && !allowed.has(item.expected.outcome)) {
                err(path, `${where}: expected.outcome '${item.expected.outcome}' is not an outcome plan '${cell.plan}' gives scenario '${cell.scenario}' (${[...allowed].join(", ") || "none"})`);
              }
              for (const f of cell.families) {
                if (!has("family", f)) err(path, `${where}: cell family '${f}' does not exist`);
                if (plan.matrix.families.select === "listed" && !plan.matrix.families.ids.includes(f)) err(path, `${where}: cell family '${f}' is not a family of plan '${cell.plan}'`);
                if (scenario.applicability.appliesTo === "families" && !scenario.applicability.families.includes(f)) err(path, `${where}: cell family '${f}' is outside the applicability of scenario '${cell.scenario}'`);
              }
              if (plan.output && !plan.output.includes(r.id)) err(path, `${where}: plan '${cell.plan}' declares its output sets but does not list '${r.id}'`);
            }
          }
          if (item.evidence !== undefined) {
            const ev = r.evidence?.[item.evidence];
            if (!ev) err(path, `${where}: evidence '${item.evidence}' is not in the set's evidence map`);
            else {
              cited.add(item.evidence);
              if (ev.basis === "unresolved" && item.expected.outcome !== "not-assertable") err(path, `${where}: unresolved evidence requires outcome not-assertable`);
            }
          } else if (ownEvidence?.basis === "unresolved" && item.expected.outcome !== "not-assertable") {
            err(path, `${where}: unresolved evidence requires outcome not-assertable`);
          }
          const bytes = Buffer.from(item.text, "utf8");
          if (createHash("sha256").update(bytes).digest("hex") !== item.sha256) err(path, `${where}: sha256 does not match text`);
          for (const [i, s] of item.expected.spans.entries()) {
            if (s.end <= s.start) err(path, `${where}: expected.spans[${i}] end must be greater than start`);
            else if (s.end > bytes.length) err(path, `${where}: expected.spans[${i}] ends after the content (${bytes.length} bytes)`);
            const e = s.envelope;
            if (e && (e.end <= e.start || e.start > s.start || e.end < s.end || e.end > bytes.length)) {
              err(path, `${where}: expected.spans[${i}].envelope must enclose the span and stay inside the content`);
            }
          }
          if (item.lineage) {
            if (item.lineage.of === item.id) err(path, `${where}: lineage points at itself`);
            else if (!fixtureIds.has(item.lineage.of)) err(path, `${where}: lineage.of unknown fixture '${item.lineage.of}'`);
          }
        }
        for (const key of Object.keys(r.evidence ?? {})) if (!cited.has(key)) err(path, `evidence '${key}' is cited by no fixture of the set`);
        break;
      }
      case "scenario": {
        const a = r.applicability;
        for (const f of a.families ?? []) if (!has("family", f)) err(path, `applicability.families unknown family '${f}'`);
        if (r.supersededBy && !has("scenario", r.supersededBy)) err(path, `supersededBy unknown scenario '${r.supersededBy}'`);
        checkSourceRefs(path, r.evidenceBasis.sources, "evidenceBasis", false);
        break;
      }
      case "fixture-plan": {
        const m = r.matrix;
        for (const f of m.families.ids ?? []) if (!has("family", f)) err(path, `matrix.families unknown family '${f}'`);
        for (const [i, t] of m.targets.entries()) {
          const target = get(t.type, t.id);
          if (!target) {
            err(path, `matrix.targets[${i}] unknown ${t.type} '${t.id}'`);
            continue;
          }
          if (t.type === "case") {
            if (t.expectedOutcome && t.expectedOutcome !== target.expectation.outcome) {
              err(path, `matrix.targets[${i}] expectedOutcome '${t.expectedOutcome}' disagrees with case '${t.id}' outcome '${target.expectation.outcome}'`);
            }
            if (m.families.select === "all-applicable") err(path, `matrix.targets[${i}] is a case; a case has no applicability, so families must be 'listed'`);
            continue;
          }
          if (target.expectedOutcomeClass === "by-projection") {
            if (!t.expectedOutcome) err(path, `matrix.targets[${i}] scenario '${t.id}' is by-projection; expectedOutcome is required`);
          } else if (t.expectedOutcome && t.expectedOutcome !== target.expectedOutcomeClass) {
            err(path, `matrix.targets[${i}] expectedOutcome '${t.expectedOutcome}' disagrees with scenario '${t.id}' outcome class '${target.expectedOutcomeClass}'`);
          }
          const a = target.applicability;
          if (a.appliesTo === "families" && m.families.select === "listed") {
            for (const f of m.families.ids) if (!a.families.includes(f)) err(path, `family '${f}' is outside the applicability of scenario '${t.id}'`);
          }
        }
        for (const [i, inp] of (r.generation.inputs ?? []).entries()) {
          if (!has(inp.kind, inp.id)) err(path, `generation.inputs[${i}] unknown ${inp.kind} '${inp.id}'`);
        }
        for (const [i, d] of (r.lineage.derivedFrom ?? []).entries()) {
          if (d.kind === "fixture-set" ? !has("fixture-set", d.id) : !has(d.kind, d.id)) err(path, `lineage.derivedFrom[${i}] unknown ${d.kind} '${d.id}'`);
          if (d.kind === "fixture-plan" && d.id === r.id) err(path, "lineage.derivedFrom names the plan itself");
        }
        for (const s of r.output ?? []) if (!has("fixture-set", s)) err(path, `output names unknown fixture-set '${s}'`);
        break;
      }
      case "legacy-map": {
        const canonicalKinds = { case: "case", scenario: "scenario", "fixture-plan": "fixture-plan", "fixture-set": "fixture-set" };
        for (const [i, e] of r.entries.entries()) {
          const k = `${e.legacy.type}:${e.legacy.id}`;
          if (legacyMapped.has(k)) err(path, `entries[${i}] duplicate legacy ${e.legacy.type} '${e.legacy.id}' (also ${legacyMapped.get(k)})`);
          else legacyMapped.set(k, path);
          for (const c of [e.canonical ?? []].flat()) {
            const ok = c.type === "fixture" ? fixtureIds.has(c.id) : has(canonicalKinds[c.type], c.id);
            if (!ok) err(path, `entries[${i}] canonical ${c.type} '${c.id}' does not exist`);
          }
        }
        break;
      }
      case "family-narrative": {
        const family = get("family", r.family);
        if (r.id !== r.family) err(path, `id '${r.id}' must equal family '${r.family}' (one narrative per family)`);
        if (!family) err(path, `unknown family '${r.family}'`);
        const contract = r.contract == null ? undefined : get("format-contract", r.contract);
        if (r.contract != null) {
          if (!contract) err(path, `contract '${r.contract}' does not exist`);
          else if (contract.family !== r.family) err(path, `contract '${r.contract}' belongs to family '${contract.family}'`);
        }
        const history = narrativeHistory.get(r.id);
        const seen = new Set();
        for (const [section, statements] of Object.entries(r.sections)) {
          for (const [i, s] of statements.entries()) {
            const where = `sections.${section}[${i}] '${s.id}'`;
            if (seen.has(s.id)) err(path, `${where}: duplicate statement id (ids are unique across all sections)`);
            seen.add(s.id);
            let providerBacked = false;
            for (const c of [...(s.citations ?? []), ...(s.leads ?? [])]) {
              const lead = (s.leads ?? []).includes(c);
              if (c.kind === "claim") {
                const claim = contract?.claims.find((x) => x.id === c.claimId);
                if (r.contract == null) err(path, `${where}: cites claim '${c.claimId}' but the narrative names no contract`);
                else if (!claim) err(path, `${where}: cites unknown claim '${c.claimId}' of contract '${r.contract}'`);
                else {
                  if (claim.evidenceClass === "unresolved" && !lead) err(path, `${where}: cites claim '${c.claimId}', which is itself unresolved; an unresolved claim cannot support a statement (it may be a lead)`);
                  if (claim.evidenceClass === "provider-documented" && !lead) providerBacked = true;
                }
              } else {
                const src = get("evidence-source", c.sourceId);
                if (!src) err(path, `${where}: cites unknown evidence-source '${c.sourceId}'`);
                else {
                  if (s.temporality === "historical" && src.locator.pin.kind === "live-unpinned") {
                    err(path, `${where}: states a historical fact but cites live-unpinned source '${c.sourceId}'; pin it to a commit, archive snapshot or digest`);
                  }
                  if (!lead && ["provider-documentation", "provider-sdk-source"].includes(src.sourceType)) providerBacked = true;
                }
              }
            }
            if (s.evidenceClass === "provider-documented" && !providerBacked) {
              err(path, `${where}: class provider-documented needs a provider-authored citation (a provider-documentation or provider-sdk-source source, or a provider-documented claim); see docs/governance/evidence-classes.md`);
            }
            if (s.unresolved) {
              const ev = history?.events.find((e) => e.seq === s.unresolved.reviewEvent);
              if (!history) err(path, `${where}: unresolved, but no evidence-review-history has subject family-narrative '${r.id}'`);
              else if (!ev) err(path, `${where}: unresolved.reviewEvent ${s.unresolved.reviewEvent} is not an event of review history '${history.id}'`);
            }
          }
        }
        if (r.lifecycle === "reviewed") {
          const authors = new Set((history?.events ?? []).filter((e) => e.type === "authored").map((e) => e.actor.id));
          const reviews = (history?.events ?? []).filter((e) => e.type === "reviewed" && e.verdict === "supports" && !authors.has(e.actor.id));
          if (!reviews.length) err(path, "lifecycle 'reviewed' needs a 'reviewed' event with verdict 'supports' by an actor who did not author the narrative (docs/governance/attribution.md, review independence)");
        }
        break;
      }
      case "evidence-review-history": {
        const targets = {
          provider: "provider",
          family: "family",
          "family-narrative": "family-narrative",
          "format-contract": "format-contract",
          "evidence-source": "evidence-source",
          variant: "variant",
          "benign-sibling": "benign-sibling",
          case: "case",
          "fixture-projection": "fixture-projection",
          scenario: "scenario",
          "fixture-plan": "fixture-plan",
        };
        if (!has(targets[r.subject.kind], r.subject.id)) err(path, `subject ${r.subject.kind} '${r.subject.id}' does not exist`);
        r.events.forEach((e, i) => {
          if (e.seq !== i + 1) err(path, `events[${i}].seq must be ${i + 1} (strictly increasing from 1, no gaps)`);
        });
        break;
      }
      default:
        break;
    }
  }
  return errors.sort();
}

/**
 * Validate every record under the given directories.
 * Returns { records, errors } with errors sorted by path.
 */
export function validateTree(dirs, { root = repoRoot, validator = createValidator(), identity = true } = {}) {
  const errors = [];
  const valid = [];
  let total = 0;
  for (const dir of dirs) {
    let files;
    try {
      files = listJson(dir);
    } catch (e) {
      if (e.code === "ENOENT") continue;
      throw e;
    }
    for (const file of files) {
      total += 1;
      const rel = relative(root, file);
      let record;
      try {
        record = JSON.parse(readFileSync(file, "utf8"));
      } catch (e) {
        errors.push(`${rel}: invalid JSON (${e.message})`);
        continue;
      }
      const problems = validator.validateRecord(record);
      if (problems.length) for (const p of problems) errors.push(`${rel}: ${p}`);
      else valid.push({ path: rel, record });
    }
  }
  errors.push(...checkIntegrity(valid));
  if (identity) {
    errors.push(...checkIdentity(valid));
    errors.push(...checkNarrativeLint(valid));
    errors.push(...checkPlaceholders(valid));
  }
  return { total, records: valid, errors: errors.sort() };
}
