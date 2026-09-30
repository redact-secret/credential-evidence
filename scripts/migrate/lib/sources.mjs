// Evidence-source identity and pinning for the taxonomy import.
//
// One evidence-source record per legacy URL without its fragment. The fragment
// (an anchor or line range) becomes the `locator` of each citing sourceRef, so
// the exact legacy URL can be rebuilt from canonical records.

import { createHash } from "node:crypto";

const HEX40 = /^[0-9a-f]{40}$/;
const GITHUB_FILE = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/(blob|tree|raw)\/([^/\s?]+)(?:\/([^\s?]*))?/;
const GITHUB_RAW = /^https:\/\/raw\.githubusercontent\.com\/([^/\s]+)\/([^/\s]+)\/([^/\s?]+)(?:\/([^\s?]*))?/;
const GITHUB_COMMIT = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/commit\/([0-9a-f]{40})(?:[/?]|$)/;
const GITHUB_THREAD = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/(issues|pull|discussions)\//;
const PROJECT_ORG = /^https:\/\/github\.com\/redact-secret\//;

export const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const clip = (s, max, onClip) => {
  if (s.length <= max) return s;
  if (onClip) onClip();
  return `${s.slice(0, max - 1).trimEnd()}…`;
};

/** Split a legacy URL into its base (identity) and fragment (locator). */
export function splitUrl(raw) {
  const url = String(raw).trim();
  if (!/^https:\/\/[^\s]+$/.test(url)) throw new Error(`unsupported legacy URL: ${JSON.stringify(raw)}`);
  const i = url.indexOf("#");
  return { base: i < 0 ? url : url.slice(0, i), fragment: i < 0 ? "" : url.slice(i) };
}

/** Pin classification of one base URL, honoring the schema rule for GitHub file links. */
export function pinFor(base) {
  let m = GITHUB_FILE.exec(base);
  if (m) {
    const [, owner, repo, , ref, path = ""] = m;
    if (HEX40.test(ref)) return { kind: "commit-permalink", url: base, commit: ref, owner, repo, ref, path };
    return { kind: "moving-ref", url: `https://github.com/${owner}/${repo}`, legacyUrl: base, owner, repo, ref, path };
  }
  m = GITHUB_RAW.exec(base);
  if (m) {
    const [, owner, repo, ref, path = ""] = m;
    if (HEX40.test(ref)) return { kind: "commit-permalink", url: base, commit: ref, owner, repo, ref, path };
    return { kind: "moving-ref", url: `https://github.com/${owner}/${repo}`, legacyUrl: base, owner, repo, ref, path };
  }
  m = GITHUB_COMMIT.exec(base);
  if (m) return { kind: "commit-permalink", url: base, commit: m[3], owner: m[1], repo: m[2], ref: m[3], path: "" };
  return { kind: "live-unpinned", url: base };
}

const hostOf = (base) => new URL(base).hostname.replace(/^www\./, "");

/** Owner of a source for corroboration independence: GitHub org/user, otherwise the host. */
export function ownerOf(base) {
  const gh = githubRepo(base);
  return gh ? gh.owner.toLowerCase() : hostOf(base).toLowerCase();
}

/** { owner, repo } for any github.com or raw.githubusercontent.com URL, else null. */
export function githubRepo(base) {
  const m = /^https:\/\/(?:github\.com|raw\.githubusercontent\.com)\/([^/\s?#]+)\/([^/\s?#]+)/.exec(base);
  return m ? { owner: m[1], repo: m[2] } : null;
}

export const isProjectOwned = (base) => PROJECT_ORG.test(base);

export function sourceIdFor(base) {
  const gh = githubRepo(base);
  const host = hostOf(base);
  let readable = slugify(gh ? `${host}-${gh.owner}-${gh.repo}` : host);
  if (readable.length > 80) readable = readable.slice(0, 80).replace(/-[^-]*$/, "");
  const hash = createHash("sha256").update(base).digest("hex").slice(0, 10);
  return { id: `${readable}-${hash}`, dir: slugify(host) };
}

export function titleFor(base) {
  const pin = pinFor(base);
  if (pin.owner && pin.ref) return clip(`${pin.owner}/${pin.repo} @ ${pin.ref}${pin.path ? `: ${pin.path}` : ""}`, 300);
  return clip(base.replace(/^https:\/\//, ""), 300);
}

export function publisherFor(base) {
  const gh = githubRepo(base);
  return gh ? `${gh.owner}/${gh.repo}` : hostOf(base);
}

/** Type from URL shape alone; roles from the citing legacy field take precedence. */
export function shapeRole(base) {
  if (GITHUB_THREAD.test(base)) return "issue-or-discussion";
  if (isProjectOwned(base)) return "project-research-note";
  if (/^https:\/\/(www\.)?(rfc-editor\.org|datatracker\.ietf\.org|tools\.ietf\.org)\//.test(base)) return "standard-or-rfc";
  return "other";
}

const PRIORITY = [
  "provider-documentation",
  "provider-sdk-source",
  "standard-or-rfc",
  "scanner-rule-source",
  "third-party-writeup",
  "issue-or-discussion",
  "project-research-note",
  "other",
];

export const strongestRole = (roles) => PRIORITY.find((r) => roles.has(r)) ?? "other";
