// Semantic comparison of two JSON documents.
//
// Both documents are flattened to a map from a normalized leaf path to a scalar, so
// the comparison ignores exactly two things and nothing else:
//   - whitespace and key order (JSON is parsed, not compared as text);
//   - the order of array elements. Arrays of objects are keyed by their identity
//     (`id`, else `slug`, else a span's `start:end`); arrays of scalars are sets.
// Whether two arrays differed only in order is counted and reported, not hidden.
//
// Every leaf that differs becomes a `diff` { path, pattern, change, legacy, projected },
// where `pattern` is the path with array keys replaced by `*` (what a rule matches).

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function keyFn(arr) {
  if (arr.every((x) => isObj(x) && typeof x.id === "string")) return (x) => x.id;
  if (arr.every((x) => isObj(x) && typeof x.slug === "string")) return (x) => x.slug;
  if (arr.every((x) => isObj(x) && Number.isInteger(x.start) && Number.isInteger(x.end))) return (x) => `${x.start}:${x.end}`;
  if (arr.every((x) => x === null || typeof x !== "object")) return (x) => `=${JSON.stringify(x)}`;
  return null;
}

/** @returns {{ leaves: Map<string, { pattern: string, value: unknown }>, arrays: Map<string, string[]> }} */
export function flatten(doc) {
  const leaves = new Map();
  const arrays = new Map();
  const walk = (value, path, pattern) => {
    if (Array.isArray(value)) {
      if (!value.length) return void leaves.set(path, { pattern, value: "[]" });
      const kf = keyFn(value);
      const scalars = value.every((x) => x === null || typeof x !== "object");
      const seen = new Map();
      const keys = [];
      value.forEach((item, i) => {
        let k = kf ? kf(item) : `#${i}`;
        const n = seen.get(k) ?? 0;
        seen.set(k, n + 1);
        if (n && scalars) return; // a set: a repeated scalar is the same member
        if (n) k = `${k}~${n}`;
        keys.push(k);
        walk(item, `${path}[${k}]`, `${pattern}[*]`);
      });
      arrays.set(path, keys);
      return;
    }
    if (isObj(value)) {
      const ks = Object.keys(value);
      if (!ks.length) return void leaves.set(path, { pattern, value: "{}" });
      for (const k of ks) walk(value[k], path ? `${path}.${k}` : k, pattern ? `${pattern}.${k}` : k);
      return;
    }
    leaves.set(path, { pattern, value });
  };
  walk(doc, "", "");
  return { leaves, arrays };
}

/**
 * @returns {{ diffs: object[], equal: number, orderOnly: number, legacyLeaves: number, projectedLeaves: number }}
 */
export function compareDocs(legacy, projected) {
  return compareFlat(flatten(legacy), flatten(projected));
}

export function compareFlat(a, b) {
  const diffs = [];
  let equal = 0;
  for (const [path, l] of a.leaves) {
    const p = b.leaves.get(path);
    if (!p) diffs.push({ path, pattern: l.pattern, change: "removed", legacy: l.value, projected: undefined });
    else if (Object.is(p.value, l.value) || JSON.stringify(p.value) === JSON.stringify(l.value)) equal += 1;
    else diffs.push({ path, pattern: l.pattern, change: "changed", legacy: l.value, projected: p.value });
  }
  for (const [path, p] of b.leaves) if (!a.leaves.has(path)) diffs.push({ path, pattern: p.pattern, change: "added", legacy: undefined, projected: p.value });
  let orderOnly = 0;
  for (const [path, ka] of a.arrays) {
    const kb = b.arrays.get(path);
    if (!kb || ka.length !== kb.length || ka.join("\u0000") === kb.join("\u0000")) continue;
    if ([...ka].sort().join("\u0000") === [...kb].sort().join("\u0000")) orderOnly += 1;
  }
  return { diffs, equal, orderOnly, legacyLeaves: a.leaves.size, projectedLeaves: b.leaves.size };
}

/** True when `value` satisfies a rule's value constraint ({ equals } | { in } | { matches }). */
export function satisfies(value, constraint) {
  if (constraint === undefined) return true;
  if ("equals" in constraint) return JSON.stringify(value) === JSON.stringify(constraint.equals);
  if ("in" in constraint) return constraint.in.some((x) => JSON.stringify(x) === JSON.stringify(value));
  if ("matches" in constraint) return typeof value === "string" && new RegExp(constraint.matches).test(value);
  throw new Error(`unknown value constraint ${JSON.stringify(constraint)}`);
}
