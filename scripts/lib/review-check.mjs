// Mechanical half of the research-PR review gate (`npm run review:check -- <base>..<head>`).
//
// Reads a git range and reports, for the records the range changes: forbidden wording,
// scanner-consensus-as-truth, provenance completeness, evidence-class source rules, ADR 0007
// identity, the additive / history-preserving rule, prompt-injection indicators, a Case that is
// really a Scenario, and secret-shaped values with a synthetic-vs-real triage hint.
//
// It is a deterministic pre-filter, not a judge. A finding is `fail` (a rule is broken),
// `needs-human` (a rule cannot be decided from text) or `info` (a hint the reviewer should
// know). The verdict is the worst severity: fail, else needs-human, else pass. `pass` means no
// mechanical rule was broken; it never means the claims are true, and it never approves.
//
// Read-only: it only runs `git diff`, `git show` and `git ls-tree`. It never prints the text of
// a secret-shaped value (file, line, shape and length only).

import { spawnSync } from "node:child_process";
import { checkIdentity } from "./identity.mjs";

const RECORD_DIRS = ["records/", "migration/"];
const POLICY_PATHS = [/^GOVERNANCE\.md$/, /^docs\/governance\//, /^SECURITY\.md$/, /^\.github\/PULL_REQUEST_TEMPLATE\.md$/];
const VERDICT_RANK = { pass: 0, "needs-human": 1, fail: 2 };
const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

export const CHECK_IDS = [
  "wording",
  "scanner-consensus",
  "provenance",
  "evidence-class",
  "identity",
  "additive",
  "conflict-recording",
  "injection",
  "case-vs-scenario",
  "secret-shape",
  "policy-change",
];

// ---------------------------------------------------------------- git access

export function makeGit(root, bin = process.env.GIT ?? "git") {
  const run = (args) => {
    const r = spawnSync(bin, args, { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
    if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${(r.stderr || "").trim().split("\n")[0]}`);
    return r.stdout;
  };
  // One batch process per revision instead of one process per file.
  const cache = new Map();
  const prefetch = (rev, paths) => {
    const want = [...new Set(paths)].filter((p) => !cache.has(`${rev}:${p}`));
    if (!want.length) return;
    const r = spawnSync(bin, ["cat-file", "--batch"], { cwd: root, input: want.map((p) => `${rev}:${p}\n`).join(""), maxBuffer: 1024 * 1024 * 1024 });
    if (r.status !== 0) throw new Error(`git cat-file --batch failed: ${String(r.stderr).trim().split("\n")[0]}`);
    const buf = r.stdout;
    let at = 0;
    for (const p of want) {
      const nl = buf.indexOf(10, at);
      const header = buf.toString("utf8", at, nl);
      at = nl + 1;
      const m = /^\S+ (\w+) (\d+)$/.exec(header);
      if (!m) {
        cache.set(`${rev}:${p}`, null);
        continue;
      }
      const size = Number(m[2]);
      cache.set(`${rev}:${p}`, m[1] === "blob" ? buf.toString("utf8", at, at + size) : null);
      at += size + 1;
    }
  };
  const tryShow = (rev, path) => {
    if (!cache.has(`${rev}:${path}`)) prefetch(rev, [path]);
    return cache.get(`${rev}:${path}`);
  };
  return { run, tryShow, prefetch };
}

/** [{ status: A|M|D, path }] with renames split into D + A so a rename reads as an identity change. */
export function changedFiles(git, base, head) {
  return git
    .run(["diff", "--name-status", "--no-renames", "-z", base, head])
    .split("\0")
    .reduce((acc, tok, i, all) => {
      if (i % 2 === 0 && tok) acc.push({ status: tok[0], path: all[i + 1] });
      return acc;
    }, [])
    .filter((f) => f.path)
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** Added lines per file: { path: [{ line, text }] } from `git diff -U0`. */
export function addedLines(git, base, head) {
  const out = {};
  let file = null;
  let n = 0;
  for (const raw of git.run(["diff", "-U0", "--no-renames", "--no-color", base, head]).split("\n")) {
    if (raw.startsWith("+++ ")) {
      file = raw === "+++ /dev/null" ? null : raw.slice(6);
      if (file) out[file] ??= [];
    } else if (raw.startsWith("@@")) {
      const m = /\+(\d+)/.exec(raw);
      n = m ? Number(m[1]) : 0;
    } else if (file && raw.startsWith("+") && !raw.startsWith("+++")) {
      out[file].push({ line: n, text: raw.slice(1) });
      n += 1;
    }
  }
  return out;
}

const inRecords = (p) => RECORD_DIRS.some((d) => p.startsWith(d)) && p.endsWith(".json");
const parse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

// ---------------------------------------------------------------- text rules

const NEG_BEFORE = /\b(not|never|no|isn't|is not|are not|aren't|without|non|neither|nor|cannot|can't|must not|does not|do not|doesn't)\b[^.;\n]{0,40}$/i;
const negated = (text, index) => NEG_BEFORE.test(text.slice(Math.max(0, index - 60), index));

// [pattern, label, severity]
const WORDING = [
  [/\b(unbiased|impartial|vendor[- ]neutral|community[- ]owned|industry[- ]standard|authoritative benchmark)\b/i, "forbidden neutrality term", "fail"],
  [/\bindependent(?:ly)?\s+(?:validat|verif|review|audit|benchmark|evidence|dataset|data\b|assess|test|maintain|curat|source)\w*/i, "independence claim", "fail"],
  [/\bthird[- ]party\s+(?:validat|verif|review|audit|benchmark|evidence|maintain|curat|dataset|data\b)\w*/i, "third-party claim about this project's material", "fail"],
  [/\b(?:neutral|independent)\s+(?:arbiter|authority|referee|benchmark)\b/i, "independence claim", "fail"],
  [/\b(?:most accurate|outperforms?|best|top|leading|fastest)\b[^.\n]{0,30}\b(?:scanners?|detectors?|secret[- ]scanning|tools?)\b/i, "scanner ranking or superiority claim", "fail"],
  [/\b(?:scanners?|detectors?|tools?)\b[^.\n]{0,20}\b(?:ranking|leaderboard|scoreboard)\b/i, "scanner ranking", "fail"],
  [/"(?:stable|provisional|pending)"/i, "product support state used as a value", "fail"],
  [/\bsupport(?:ed)? status\b/i, "product support status", "fail"],
  [/\bindependent\b(?!ly)(?![^\n]*\?)/i, "bare 'independent': confirm it names distinct artifacts or a disclaimer, never this project", "info"],
  [/\bvalidated\b(?![^.\n]{0,40}\b(?:by|against)\b)(?![^\n]*\?)/i, "'validated' without who and against which source", "needs-human"],
];

const CONSENSUS = [
  [/\b(?:all|every|both|most|several|multiple|many|major)\s+(?:of\s+the\s+)?(?:major\s+|popular\s+|other\s+)?(?:scanners?|detectors?|secret[- ]scanning tools|tools)\s+(?:agree|flag|detect|catch|treat|report|classif|find|reject|miss)\w*/i, "scanner agreement used as support", "fail"],
  [/\b(?:scanner|detector|tool)s?\s+(?:consensus|agreement)\b|\bconsensus\s+(?:of|among|between|across)\s+(?:the\s+)?(?:scanners|detectors|tools)\b/i, "scanner consensus as truth", "fail"],
  [/\b(?:because|since|as)\s+(?:the\s+|a\s+|any\s+)?(?:scanner|detector|tool)\s+(?:flags|detects|catches|finds|reports|treats|rejects|misses)\b/i, "expectation justified by scanner behavior", "fail"],
  [/\bexpected by (?:the |a )?(?:scanner|detector)\b/i, "expectation stated as scanner behavior", "fail"],
  [/\b(?:trufflehog|gitleaks|kingfisher|detect-secrets|ggshield|semgrep|noseyparker|secretlint|flare-redact|openredaction|redact[- ]?secret)\s+(?:flags|detects|catches|finds|reports|misses|rejects|treats|classifies|expects)\b/i, "a named scanner's behavior stated; allowed only as a dated artifact observation, never as the basis", "needs-human"],
];

const INJECTION = [
  [/\bignore\s+(?:all\s+|any\s+|the\s+)?(?:previous|prior|above|earlier|preceding)\s+(?:instructions?|prompts?|rules?|context)/i, "instruction-override phrase", "needs-human"],
  [/\b(?:disregard|forget|override)\s+(?:all\s+|any\s+|your\s+|the\s+)?(?:previous|prior|above|earlier|system|safety|governance)?\s*(?:instructions?|rules?|guidelines?|polic(?:y|ies))/i, "instruction-override phrase", "needs-human"],
  [/\b(?:you are now|from now on you|act as (?:an?|the)|new instructions?:|system prompt|developer message)\b/i, "role or system-prompt text", "needs-human"],
  [/(?:^|\s)(?:assistant|system|human|user)\s*:\s*\S|\[\/?INST\]|<\|(?:im_start|im_end|system)\|>/i, "chat-transcript or control tokens", "needs-human"],
  [/\b(?:approve|merge|lgtm|rubber[- ]stamp|mark as (?:reviewed|passed))\b[^.\n]{0,30}\b(?:this|the)\s+(?:pr|pull request|change|record)\b/i, "request to approve or merge", "needs-human"],
  [/\bdo not (?:tell|inform|mention|report)\b[^.\n]{0,30}\b(?:user|maintainer|reviewer)\b/i, "request to conceal", "needs-human"],
  [/\b(?:curl|wget)\b[^\n|]*\|\s*(?:ba|z)?sh\b|\b(?:run|execute|paste)\s+(?:the\s+following|this)\s+(?:command|script|code)\b/i, "request to run code", "needs-human"],
  [/\bVERDICT\s*:\s*(?:pass|fail|needs-human)/i, "text that imitates the verdict line", "fail"],
  [/<!--[\s\S]*?-->/, "hidden HTML comment in prose", "needs-human"],
  [/[​-‏‪-‮⁠-⁤⁦-⁩﻿]/, "invisible or bidirectional control character", "fail"],
];

const GITHUB_MOVING = /github\.com\/[^/\s"]+\/[^/\s"]+\/(?:blob|tree|raw)\/(?![0-9a-f]{40}\b)[^\s"]+/i;

// JSON text can spell an invisible character as \uXXXX; scan what a reader would get.
const decodeEscapes = (t) => t.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

function scanText(findings, add, rawText, where, rules, check) {
  const text = decodeEscapes(rawText);
  for (const [re, label, severity] of rules) {
    const m = re.exec(text);
    if (!m) continue;
    const disclaimed = check === "wording" || check === "scanner-consensus" ? negated(text, m.index) : false;
    // A fixture file exists to carry hostile inputs. Its invisible code points are acceptable only when
    // spelled as \uXXXX (a reviewer can read them), and then they still need a human; a literal one fails.
    if (check === "injection" && label === "invisible or bidirectional control character" && !re.test(rawText) && /^records\/fixtures\//.test(where.path ?? "")) {
      add({ check, severity: "needs-human", path: where.path, line: where.line, message: `${label}, spelled as a \\uXXXX escape in a fixture (readable, not literal); confirm each is a deliberate test input` });
      continue;
    }
    add({ check, severity: disclaimed ? "info" : severity, path: where.path, line: where.line, message: `${label}${disclaimed ? " (negated: a disclaimer, not a claim)" : ""}` });
  }
}

// ---------------------------------------------------------------- secret-shaped values

const SHAPES = [
  ["aws-access-key-id", /\b(?:AKIA|ASIA|AGPA|AIDA|AROA)[A-Z0-9]{16}\b/],
  ["github-token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/],
  ["slack-token", /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ["stripe-key", /\b[rs]k_(?:live|test)_[A-Za-z0-9]{16,}/],
  ["google-api-key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["sendgrid-key", /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/],
  ["npm-token", /\bnpm_[A-Za-z0-9]{36}\b/],
  ["private-key-block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["jwt", /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/],
  ["prefixed-secret", /\b[a-z]{2,10}_(?:live|prod|secret|sk|pk)_[A-Za-z0-9]{16,}/],
];
const SYNTH_MARKER = /example|fake|dummy|synthetic|sample|placeholder|redacted|notreal|not-real|testonly|x{6,}|0{6,}|1234567890|abcdefgh/i;
const CONSTRUCTION = /synthetic|non-issuable|not issuable|constructed|never issued|cannot authenticate|provider-published|provider publishes|documentation example|grammar/i;
const DIGEST_KEY = /"(?:sha256|contentDigest|digest|sha|commit|id|path|url|archiveUrl|sourceId|claimId|locator|pattern|descriptivePattern)"\s*:/i;

export function entropy(s) {
  const counts = new Map();
  for (const c of s) counts.set(c, (counts.get(c) ?? 0) + 1);
  let h = 0;
  for (const n of counts.values()) h -= (n / s.length) * Math.log2(n / s.length);
  return h;
}

/** Secret-shaped tokens on one line as [{ shape, length, marked }]; never returns the text. */
export function secretShapes(text) {
  const out = [];
  const seen = new Set();
  for (const [shape, re] of SHAPES) {
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
    for (const m of text.matchAll(g)) {
      seen.add(m[0]);
      out.push({ shape, length: m[0].length, marked: SYNTH_MARKER.test(m[0]) });
    }
  }
  if (DIGEST_KEY.test(text)) return out;
  for (const m of text.matchAll(/[A-Za-z0-9_+/=-]{24,}/g)) {
    const t = m[0];
    if ([...seen].some((s) => s.includes(t) || t.includes(s))) continue;
    if (/^[0-9a-f]{32,}$/i.test(t) && [40, 64].includes(t.length)) continue; // digest or commit
    if (!/[0-9]{2}/.test(t) || !/[A-Za-z]{4}/.test(t)) continue;
    if (/^[a-z0-9]+(?:-[a-z0-9]+){2,}$/.test(t) && !/[0-9]{3}/.test(t)) continue; // a slug
    if (entropy(t) < 3.6) continue;
    out.push({ shape: "high-entropy-string", length: t.length, marked: SYNTH_MARKER.test(t) });
  }
  return out;
}

// ---------------------------------------------------------------- record-level rules

const ORG_HOSTS = /github\.com\/redact-secret\b|redact-?secret\.(?:dev|com|io)/i;

function ownerKey(url) {
  const m = /^https?:\/\/(?:www\.)?([^/]+)\/?([^/]*)/.exec(String(url ?? ""));
  if (!m) return null;
  return /github\.com$|gitlab\.com$|bitbucket\.org$/.test(m[1]) ? `${m[1]}/${m[2].toLowerCase()}` : m[1].toLowerCase();
}

/** Every supported-claim-shaped object in a record: { where, cls, sources[{sourceId,supports,locator,present}], observedAt }. */
export function collectClaims(record) {
  const out = [];
  const visit = (v, where) => {
    if (Array.isArray(v)) return v.forEach((x, i) => visit(x, `${where}/${i}`));
    if (!v || typeof v !== "object") return;
    const cls = v.evidenceClass ?? (typeof v.basis === "string" ? v.basis : undefined);
    const refs = v.sources ?? (Array.isArray(v.citations) ? v.citations.filter((c) => c.kind === "source") : undefined);
    const citedAny = Array.isArray(v.sources) ? v.sources.length : Array.isArray(v.citations) ? v.citations.length : 0;
    if (typeof cls === "string" && (Array.isArray(v.sources) || Array.isArray(v.citations) || cls !== "unresolved")) {
      out.push({ where, cls, refs: Array.isArray(refs) ? refs : [], citedAny, hasSupports: Array.isArray(v.sources), observedAt: v.observedAt, claim: v });
    }
    for (const [k, x] of Object.entries(v)) visit(x, `${where}/${k}`);
  };
  visit(record, "");
  return out;
}

function sourceIndex(git, rev) {
  const idx = new Map();
  for (const p of git.run(["ls-tree", "-r", "--name-only", rev, "records/sources"]).split("\n").filter(Boolean)) {
    idx.set(p.split("/").pop().replace(/\.json$/, ""), p);
  }
  return idx;
}

const dateOf = (s) => (typeof s === "string" && DATE_RE.test(s) ? s.slice(0, 10) : null);

/**
 * Provenance and evidence-class rules apply to what a change adds or alters, not to what it leaves alone. In a modified
 * file (a fixture set holds hundreds of evidence entries, a contract several claims) a claim object that is byte-identical
 * in `before` is skipped; in a claim that did change, a citation that is byte-identical in the same claim of `before` is
 * not re-judged (a legacy citation without a locator stays a legacy fact until somebody touches it). A new file has no
 * `before`: everything in it is checked. The structural rules after the loop run on the whole record.
 */
// Records of the `generic` provider group (a family with no issuer): its fixture sets and the records filed under it.
const GENERIC_GROUP_PATH = /^records\/(fixtures\/generic\.json|[a-z-]+\/generic\/)/;

function checkClaims({ add, git, head, path, record, before, today }) {
  const sources = (git._sources ??= { head: sourceIndex(git, head), cache: new Map() });
  if (!sources.fetched) {
    sources.fetched = true;
    git.prefetch(head, [...sources.head.values()]);
  }
  const load = (id) => {
    const p = sources.head.get(id);
    if (!p) return null;
    if (!sources.cache.has(p)) sources.cache.set(p, parse(git.tryShow(head, p) ?? ""));
    return sources.cache.get(p) ?? null;
  };
  const prior = new Map();
  if (before) for (const c of collectClaims(before)) prior.set(c.where, c);
  const priorClaims = new Set([...prior.values()].map((c) => JSON.stringify(c.claim)));
  for (const c of collectClaims(record)) {
    if (priorClaims.has(JSON.stringify(c.claim))) continue;
    const knownRefs = new Set((prior.get(c.where)?.refs ?? []).map((r) => JSON.stringify(r)));
    const at = { path, line: undefined };
    const here = c.where || "/";
    if (c.cls === "unresolved") continue;
    if (!dateOf(c.observedAt)) add({ check: "provenance", severity: "fail", ...at, message: `${here}: missing or malformed observedAt` });
    else if (dateOf(c.observedAt) > today) add({ check: "provenance", severity: "fail", ...at, message: `${here}: observedAt ${dateOf(c.observedAt)} is in the future (today ${today})` });
    if (c.cls === "project-policy") {
      if (!c.refs.length && !/policy|decid|maintainer/i.test(JSON.stringify(c.claim))) add({ check: "evidence-class", severity: "needs-human", ...at, message: `${here}: project-policy needs question, options, decision, reviewer and reversal evidence (record or review history); not found in this object` });
      continue;
    }
    if (!c.refs.length && c.citedAny) continue; // cites claims of its contract, whose sources are checked on the contract
    if (!c.refs.length) {
      add({ check: "provenance", severity: "fail", ...at, message: `${here}: class ${c.cls} cites no source` });
      continue;
    }
    const loaded = [];
    for (const r of c.refs) {
      const unchanged = knownRefs.has(JSON.stringify(r));
      if (unchanged) {
        // still loaded: the evidence-class rules below judge the claim's whole source set
        const s0 = load(r.sourceId);
        if (s0) loaded.push(s0);
        continue;
      }
      if (c.hasSupports) {
        if (!String(r.supports ?? "").trim()) add({ check: "provenance", severity: "fail", ...at, message: `${here}: source ${r.sourceId} cited without the exact supported statement (supports)` });
        if (!String(r.locator ?? "").trim()) add({ check: "provenance", severity: "needs-human", ...at, message: `${here}: source ${r.sourceId} cited without a locator (section, anchor or line); the reviewer cannot re-check it quickly` });
      }
      const s = load(r.sourceId);
      if (!s) {
        add({ check: "provenance", severity: "fail", ...at, message: `${here}: cited source ${r.sourceId} has no record under records/sources/` });
        continue;
      }
      loaded.push(s);
      const obs = (s.observations ?? []).map((o) => dateOf(o.observedAt)).filter(Boolean).sort();
      if (!obs.length) add({ check: "provenance", severity: "fail", ...at, message: `${here}: source ${r.sourceId} has no observation (nobody recorded reading it)` });
      else if (dateOf(c.observedAt) && dateOf(c.observedAt) < obs[0]) add({ check: "provenance", severity: "needs-human", ...at, message: `${here}: claim observedAt ${dateOf(c.observedAt)} is earlier than the first read of ${r.sourceId} (${obs[0]})` });
      if (!s.locator?.pin?.kind) add({ check: "provenance", severity: "fail", ...at, message: `${here}: source ${r.sourceId} has no pin` });
    }
    if (!c.hasSupports) continue; // narrative citations inherit the class of the contract claim they cite
    const types = loaded.map((s) => s.sourceType);
    const providerAuthored = types.some((t) => t === "provider-documentation" || t === "provider-sdk-source");
    if (c.cls === "provider-documented" && loaded.length && !providerAuthored && types.includes("standard-or-rfc") && GENERIC_GROUP_PATH.test(path)) {
      // docs/governance/evidence-classes.md, "Standards for a family with no issuer": allowed for the generic provider group, for
      // a claim about the standard's own text only. The script cannot tell what the claim is about, so a person confirms it.
      add({ check: "evidence-class", severity: "needs-human", ...at, message: `${here}: provider-documented rests on a standard-or-rfc source (generic provider group); confirm the claim is about the standard's own text, located, and not a role description read as non-secrecy` });
    } else if (c.cls === "provider-documented" && loaded.length && !providerAuthored) {
      add({ check: "evidence-class", severity: "fail", ...at, message: `${here}: provider-documented but no cited source is provider-authored (types: ${[...new Set(types)].join(", ")})` });
    }
    if (c.cls === "tool-corroborated" && loaded.length) {
      // Only artifacts by parties other than the author count: not the project organization, not a writeup.
      const ours = loaded.filter((s) => ORG_HOSTS.test(s.locator?.url ?? ""));
      const writeups = loaded.filter((s) => s.sourceType === "third-party-writeup");
      const eligible = loaded.filter((s) => !ours.includes(s) && !writeups.includes(s));
      const owners = new Set(eligible.map((s) => ownerKey(s.locator?.url)).filter(Boolean));
      if (owners.size < 2) add({ check: "evidence-class", severity: "fail", ...at, message: `${here}: tool-corroborated needs two artifacts from different maintainers; ${eligible.length} eligible source(s) from ${owners.size} maintainer(s) (excluded: ${ours.length} by the project organization, ${writeups.length} writeup(s))` });
      else add({ check: "evidence-class", severity: "info", ...at, message: `${here}: ${owners.size} distinct maintainers by URL; confirm none is a fork, port or Redact Secret artifact` });
    }
    if (c.cls === "tool-corroborated" && c.where.includes("expectation")) {
      add({ check: "scanner-consensus", severity: "needs-human", ...at, message: `${here}: expectation basis is tool-corroborated; confirm scanner output on this fixture is not the basis` });
    }
  }
  const e = record.expectation;
  if (e?.basis === "unresolved" && e.outcome && e.outcome !== "not-assertable") add({ check: "evidence-class", severity: "fail", path, message: `${path}: unresolved basis requires outcome not-assertable (found ${e.outcome})` });
  if (record.evidenceBasis?.basis === "unresolved" && record.expectedOutcomeClass && record.expectedOutcomeClass !== "not-assertable") add({ check: "evidence-class", severity: "fail", path, message: `${path}: unresolved basis requires expectedOutcomeClass not-assertable` });
}

const tokensOf = (r, drop) =>
  new Set(
    `${r.summary ?? r.description ?? ""} ${r.rationale ?? r.semantics ?? ""}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !drop.has(t)),
  );
const jaccard = (a, b) => {
  const inter = [...a].filter((x) => b.has(x)).length;
  return a.size + b.size - inter === 0 ? 0 : inter / (a.size + b.size - inter);
};
const dropTokens = (r) => new Set([...(r.families ?? []).flatMap((f) => String(f.family).split(/[:@-]/)), ...String(r.id).split("-")].map((t) => t.toLowerCase()));

function changedMeaning(before, after) {
  const notes = [];
  const claimMap = (r) => new Map((r.claims ?? []).map((c) => [c.id, c]));
  if (before.kind === "format-contract") {
    const was = claimMap(before);
    const now = claimMap(after);
    for (const [id, c] of was) {
      const n = now.get(id);
      if (!n) notes.push({ severity: "fail", message: `claim ${id} was removed; withdraw or supersede, never delete (ADR 0003)` });
      else {
        if (n.statement !== c.statement) notes.push({ severity: "fail", message: `claim ${id} statement changed; a change of meaning is a correction with a new claim or revision that supersedes it` });
        if (n.evidenceClass !== c.evidenceClass) notes.push({ severity: "needs-human", message: `claim ${id} class ${c.evidenceClass} -> ${n.evidenceClass}; confirm old class, new class, trigger and a non-author reviewer are recorded`, meaning: true });
        if (n.temporality !== c.temporality) notes.push({ severity: "needs-human", message: `claim ${id} temporality ${c.temporality} -> ${n.temporality}`, meaning: true });
        const kept = new Set((n.sources ?? []).map((s) => s.sourceId));
        for (const s of c.sources ?? []) if (!kept.has(s.sourceId)) notes.push({ severity: "needs-human", message: `claim ${id} dropped source ${s.sourceId}; earlier sources stay listed when a class moves`, meaning: true });
      }
    }
    if (before.lifecycle === "reviewed") {
      const strip = (r) => JSON.stringify({ ...r, lifecycle: undefined, notes: undefined, openQuestions: undefined });
      if (strip(before) !== strip(after)) notes.push({ severity: "fail", message: "a reviewed contract revision was edited; a changed understanding is a new revision that supersedes it" });
    }
  }
  if (before.kind === "case" && before.expectation && after.expectation) {
    for (const k of ["outcome", "basis"]) {
      if (before.expectation[k] !== after.expectation[k]) notes.push({ severity: "needs-human", message: `expectation ${k} ${before.expectation[k]} -> ${after.expectation[k]}`, meaning: true });
    }
    if (before.lifecycle === "reviewed" && (before.summary !== after.summary || before.rationale !== after.rationale)) notes.push({ severity: "needs-human", message: "a reviewed case's summary or rationale changed; a material edit may need relabeling per case authorship", meaning: true });
  }
  if (before.kind === "evidence-source") {
    const old = before.observations ?? [];
    const now = after.observations ?? [];
    if (JSON.stringify(old) !== JSON.stringify(now.slice(0, old.length))) notes.push({ severity: "fail", message: "source observations were rewritten; they are append-only" });
    if (before.locator?.url !== after.locator?.url) notes.push({ severity: "fail", message: "source URL changed; a different URL is a different source record" });
    for (const o of now.slice(old.length)) if (o.outcome === "changed" || o.outcome === "superseded" || o.outcome === "unreachable") notes.push({ severity: "needs-human", message: `new observation outcome ${o.outcome}; dependent claims need re-review and the conflict must be recorded`, meaning: true });
  }
  if (before.kind === "evidence-review-history") {
    const old = before.events ?? [];
    if (JSON.stringify(old) !== JSON.stringify((after.events ?? []).slice(0, old.length))) notes.push({ severity: "fail", message: "review-history events were edited or removed; the history is append-only" });
  }
  if (before.lifecycle !== after.lifecycle && after.lifecycle === "reviewed") notes.push({ severity: "needs-human", message: "lifecycle became reviewed; an agent never sets it and the reviewer must not be the author" });
  return notes;
}

// ---------------------------------------------------------------- driver

/**
 * Run every mechanical check over `base..head`.
 * Returns { verdict, findings, files, summary }. Findings are sorted and deterministic.
 */
export function reviewRange({ root, base, head, today = new Date().toISOString().slice(0, 10), body = "", git = makeGit(root) }) {
  const findings = [];
  const seen = new Set();
  const add = (f) => {
    const key = JSON.stringify([f.check, f.severity, f.path, f.line, f.message]);
    if (seen.has(key)) return;
    seen.add(key);
    findings.push(f);
  };

  const files = changedFiles(git, base, head);
  const added = addedLines(git, base, head);
  const recordFiles = files.filter((f) => inRecords(f.path));
  git.prefetch(head, recordFiles.filter((f) => f.status !== "D").map((f) => f.path));
  git.prefetch(base, recordFiles.filter((f) => f.status === "M").map((f) => f.path));
  const changedPaths = new Set(files.map((f) => f.path));
  const headEntries = [];
  const beforeById = new Map();

  for (const f of files) {
    if (POLICY_PATHS.some((re) => re.test(f.path))) add({ check: "policy-change", severity: "needs-human", path: f.path, message: `${f.path}: governance or safety policy changed; needs a non-author reviewer and a statement of which records it affects` });
  }

  // Prose and value scans over added lines in record data (and the PR body when given).
  const scanFiles = Object.entries(added).filter(([p]) => RECORD_DIRS.some((d) => p.startsWith(d)));
  const constructionIn = new Map();
  for (const [p, lines] of scanFiles) constructionIn.set(p, lines.some((l) => CONSTRUCTION.test(l.text)) || CONSTRUCTION.test(body));
  for (const [p, lines] of scanFiles) {
    for (const { line, text } of lines) {
      const where = { path: p, line };
      scanText(findings, add, text, where, WORDING, "wording");
      scanText(findings, add, text, where, CONSENSUS, "scanner-consensus");
      scanText(findings, add, text, where, INJECTION, "injection");
      if (GITHUB_MOVING.test(text)) add({ check: "provenance", severity: "fail", ...where, message: "GitHub link is not a 40-hex commit permalink (a branch or tag moves)" });
      for (const s of secretShapes(text)) {
        const known = s.shape !== "high-entropy-string";
        let severity;
        let hint;
        if (s.marked) {
          severity = "info";
          hint = "carries a synthetic/example marker; confirm construction or provider link";
        } else if (!known && constructionIn.get(p)) {
          severity = "info";
          hint = "no marker in the value, but the change states how values are constructed; confirm it covers this one";
        } else {
          severity = "needs-human";
          hint = "no marker and no construction statement; may be a real value. Do not reproduce it; triage with the gitleaks fixture-vs-real step and hand to a maintainer if unsure";
        }
        add({ check: "secret-shape", severity, ...where, message: `${s.shape} (length ${s.length}) ${hint}` });
      }
    }
  }
  if (body) {
    const where = { path: "<pr-body>", line: undefined };
    body.split("\n").forEach((text, i) => {
      scanText(findings, add, text, { ...where, line: i + 1 }, WORDING, "wording");
      scanText(findings, add, text, { ...where, line: i + 1 }, CONSENSUS, "scanner-consensus");
      scanText(findings, add, text, { ...where, line: i + 1 }, INJECTION, "injection");
      for (const s of secretShapes(text)) add({ check: "secret-shape", severity: "needs-human", ...where, line: i + 1, message: `${s.shape} in the PR text; values belong only in the diff as synthetic fixtures, and the PR text should not carry one` });
    });
  }

  // Record-level rules.
  const reviewTouched = new Set();
  for (const f of recordFiles) {
    if (f.status === "D") {
      add({ check: "additive", severity: "fail", path: f.path, message: `${f.path}: record deleted; supersede or withdraw instead, anything citable keeps its id (ADR 0002, 0003)` });
      continue;
    }
    const after = parse(git.tryShow(head, f.path) ?? "");
    if (after === undefined) {
      add({ check: "provenance", severity: "fail", path: f.path, message: `${f.path}: not valid JSON` });
      continue;
    }
    headEntries.push({ path: f.path, record: after });
    if (after.kind === "evidence-review-history" && after.subject) reviewTouched.add(`${after.subject.kind}:${after.subject.id}`);
    const before = f.status === "M" ? parse(git.tryShow(base, f.path) ?? "") : undefined;
    if (before) beforeById.set(f.path, before);
    if (f.status === "A" && after.lifecycle && after.lifecycle !== "draft") add({ check: "additive", severity: "needs-human", path: f.path, message: `${f.path}: new record starts as ${after.lifecycle}; agents add drafts and a second person reviews` });
    if (f.status === "A" && /TODO\(record:new\)/.test(JSON.stringify(after))) add({ check: "provenance", severity: "fail", path: f.path, message: `${f.path}: scaffold placeholder TODO(record:new) left unfilled` });
    checkClaims({ add, git, head, path: f.path, record: after, before, today });
  }

  const identityErrors = checkIdentity(headEntries);
  for (const e of identityErrors) add({ check: "identity", severity: "fail", path: e.slice(0, e.indexOf(": ")), message: e.slice(e.indexOf(": ") + 2) });
  for (const { path, record } of headEntries) {
    if (["case", "scenario"].includes(record.kind) && /(^|-)(t[0-3]|tier-?\d+|provider-documented|tool-corroborated|project-policy|unresolved)(-|$)/.test(String(record.id))) {
      add({ check: "identity", severity: "fail", path, message: `${path}: evidence tier or basis in a ${record.kind} id; tier is data, not identity (ADR 0007)` });
    }
    const base = path.split("/").pop().replace(/\.json$/, "").replace(/^[a-z-]+\./, "");
    if (record.id && ["case", "scenario", "provider", "evidence-source"].includes(record.kind) && base !== record.id && path.startsWith("records/")) {
      add({ check: "identity", severity: "needs-human", path, message: `${path}: file name does not match the record id ${record.id}; ids are assigned once and never renamed` });
    }
  }

  // Additive / history preserving, plus conflict recording.
  for (const [path, before] of beforeById) {
    const after = headEntries.find((e) => e.path === path).record;
    if (before.id !== after.id || before.kind !== after.kind) {
      add({ check: "additive", severity: "fail", path, message: `${path}: id or kind changed (${before.kind} ${before.id} -> ${after.kind} ${after.id}); ids are never renamed` });
      continue;
    }
    const notes = changedMeaning(before, after);
    for (const n of notes) add({ check: "additive", severity: n.severity, path, message: `${path}: ${n.message}` });
    if (notes.some((n) => n.meaning)) {
      const recorded = reviewTouched.has(`${after.kind}:${after.id}`) || JSON.stringify(before.openQuestions ?? null) !== JSON.stringify(after.openQuestions ?? null);
      if (!recorded) add({ check: "conflict-recording", severity: "fail", path, message: `${path}: meaning, class or outcome changed with no review-history event for this record and no openQuestions entry in the same change; record the conflict, do not overwrite it` });
      else add({ check: "conflict-recording", severity: "info", path, message: `${path}: meaning changed and a review event or open question accompanies it; read it to confirm it states the old value, trigger and reviewer` });
    }
  }

  // Case versus Scenario: a new case whose prose is another record's with the names swapped.
  const newCases = headEntries.filter((e) => e.record.kind === "case" && !beforeById.has(e.path) && recordFiles.find((f) => f.path === e.path)?.status === "A");
  if (newCases.length) {
    const universe = [];
    const listed = git.run(["ls-tree", "-r", "--name-only", head, "records/cases"]).split("\n").filter(Boolean);
    git.prefetch(head, listed);
    for (const p of listed) {
      const r = headEntries.find((e) => e.path === p)?.record ?? parse(git.tryShow(head, p) ?? "");
      if (r?.kind === "case") universe.push({ path: p, record: r });
    }
    for (const n of newCases) {
      const mine = tokensOf(n.record, dropTokens(n.record));
      if (mine.size < 4) continue;
      for (const o of universe) {
        if (o.path === n.path) continue;
        const sim = jaccard(mine, tokensOf(o.record, new Set([...dropTokens(o.record), ...dropTokens(n.record)])));
        if (sim >= 0.8) add({ check: "case-vs-scenario", severity: "needs-human", path: n.path, message: `${n.path}: summary and rationale match ${o.path} after family names are removed (similarity ${sim.toFixed(2)}); likely a Scenario plus a fixture-plan, not a new Case (ADR 0007 section 3)` });
      }
    }
  }

  findings.sort((a, b) => (a.path ?? "").localeCompare(b.path ?? "") || (a.line ?? 0) - (b.line ?? 0) || a.check.localeCompare(b.check) || a.message.localeCompare(b.message));
  const worst = findings.reduce((w, f) => Math.max(w, f.severity === "fail" ? 2 : f.severity === "needs-human" ? 1 : 0), 0);
  const verdict = Object.keys(VERDICT_RANK).find((k) => VERDICT_RANK[k] === worst);
  return { verdict, findings, files, recordFiles: recordFiles.length };
}

/** Plain-text report ending in the machine-readable verdict line. */
export function formatReport(result, { base, head }) {
  const lines = [`review:check ${base}..${head}: ${result.files.length} file(s) changed, ${result.recordFiles} record file(s)`];
  for (const id of CHECK_IDS) {
    const fs = result.findings.filter((f) => f.check === id);
    const worst = fs.some((f) => f.severity === "fail") ? "FAIL" : fs.some((f) => f.severity === "needs-human") ? "NEEDS-HUMAN" : "ok";
    lines.push(`  [${worst}] ${id}`);
    for (const f of fs) lines.push(`      ${f.severity}: ${f.path ?? ""}${f.line ? `:${f.line}` : ""} ${f.message}`);
  }
  lines.push("", "Mechanical pre-filter only: pass means no mechanical rule broke, not that any claim is true.", `VERDICT: ${result.verdict}`);
  return lines.join("\n");
}
