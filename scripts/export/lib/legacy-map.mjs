// The legacy map as a first-class input of the compatibility exporter (ADR 0009).
//
// Canonical records carry no legacy coordinates (ADR 0007): no `beta8-*` suite, no legacy
// fixture id, no legacy corpus path, no legacy navigation scenario id. Those names exist in
// exactly one place, `migration/legacy-map/` (kind `legacy-map`), and this module is the only
// code in the exporter and the parity harness that reads it. Everything a legacy consumer
// sees under a legacy name was joined to a canonical fixture here and nowhere else:
//
//   canonical fixtures (fixtures.mjs)  +  legacy map (this file)  =  legacy catalog
//
// `loadLegacyNames` validates the map against the canonical fixtures (strictly, in both
// directions) and the consumer vocabulary; `nameFixtures` produces the catalog the legacy
// builders read. Nothing here is evidence: it only says which legacy name a canonical fixture
// answers to.

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * @param {object[]} maps       records of kind `legacy-map` (every shard)
 * @param {{ scenarios: { id: string }[] }} vocabulary   the consumer vocabulary (legacy navigation scenario definitions)
 * @returns {{ source: { repository: string, revision: string }, suites: object[], byCanonicalId: Map<string, object> }}
 */
export function loadLegacyNames(maps, vocabulary) {
  if (!maps.length) throw new Error("migration/ has no legacy map; the legacy projection needs it to name suites and fixtures (run npm run migrate:cases)");
  const source = maps[0].source;
  for (const m of maps) {
    if (m.source.repository !== source.repository || m.source.revision !== source.revision) throw new Error(`legacy map ${m.id} names a different legacy source than ${maps[0].id}`);
  }
  const navigation = new Set(vocabulary.scenarios.map((s) => s.id));

  const suites = [];
  const byCanonicalId = new Map();
  const slugs = new Set();
  for (const map of maps) {
    for (const e of map.entries) {
      if (e.legacy.type === "suite") {
        suites.push({ id: e.legacy.id, title: e.legacy.title, description: e.legacy.description, corpus: e.legacy.path });
      } else if (e.legacy.type === "fixture") {
        const slug = e.legacy.id;
        const i = slug.indexOf("--");
        if (i < 0) throw new Error(`legacy fixture id '${slug}' has no suite prefix`);
        if (Array.isArray(e.canonical) || e.canonical?.type !== "fixture") throw new Error(`legacy fixture ${slug} must map to exactly one canonical fixture`);
        if (slugs.has(slug)) throw new Error(`legacy fixture ${slug} is listed twice`);
        slugs.add(slug);
        if (byCanonicalId.has(e.canonical.id)) throw new Error(`canonical fixture ${e.canonical.id} is the target of two legacy fixtures`);
        const scenarioIds = e.legacy.scenarioIds ?? [];
        for (const id of scenarioIds) if (!navigation.has(id)) throw new Error(`legacy fixture ${slug}: navigation scenario '${id}' is not in the consumer vocabulary`);
        byCanonicalId.set(e.canonical.id, { slug, suite: slug.slice(0, i), name: slug.slice(i + 2), path: e.legacy.path, scenarioIds });
      }
    }
  }
  suites.sort((a, b) => cmp(a.id, b.id));
  const suiteIds = new Set(suites.map((s) => s.id));
  if (suiteIds.size !== suites.length) throw new Error("a legacy suite is listed twice");
  for (const [canonicalId, n] of byCanonicalId) if (!suiteIds.has(n.suite)) throw new Error(`legacy fixture ${n.slug} (${canonicalId}) belongs to an unlisted suite ${n.suite}`);
  // every vocabulary entry is used: a navigation scenario nothing maps to is vocabulary drift, not data
  const used = new Set([...byCanonicalId.values()].flatMap((n) => n.scenarioIds));
  for (const id of navigation) if (!used.has(id)) throw new Error(`navigation scenario '${id}' in the consumer vocabulary is used by no legacy fixture`);
  return { source, suites, byCanonicalId };
}

/**
 * Join the canonical fixtures to their legacy names. Fails unless the two sides cover each
 * other exactly: a canonical fixture with no legacy name, a legacy name for no canonical
 * fixture, or a suite that names no fixture is an error, never a silent omission.
 *
 * @param {object[]} fixtures  canonical fixture rows (fixtures.mjs), sorted by canonical id
 * @param {ReturnType<typeof loadLegacyNames>} names
 * @returns {{ suites: object[], fixtures: object[], bySlug: Map, byCanonicalId: Map }}
 *   a legacy fixture: { slug, suite, name, legacyPath, scenarioIds, fixture: <the canonical row> }
 */
export function nameFixtures(fixtures, names) {
  const rows = fixtures.map((fixture) => {
    const n = names.byCanonicalId.get(fixture.id);
    if (!n) throw new Error(`canonical fixture ${fixture.id} has no legacy-map entry`);
    return { slug: n.slug, suite: n.suite, name: n.name, legacyPath: n.path, scenarioIds: n.scenarioIds, fixture };
  });
  if (rows.length !== names.byCanonicalId.size) {
    const have = new Set(fixtures.map((f) => f.id));
    const stray = [...names.byCanonicalId.keys()].find((id) => !have.has(id));
    throw new Error(`legacy map names canonical fixture ${stray}, which no fixture set contains`);
  }
  rows.sort((a, b) => cmp(a.slug, b.slug));
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  if (bySlug.size !== rows.length) throw new Error("two canonical fixtures map to one legacy fixture");
  for (const s of names.suites) if (!rows.some((r) => r.suite === s.id)) throw new Error(`legacy suite ${s.id} maps no fixture`);
  return { suites: names.suites, fixtures: rows, bySlug, byCanonicalId: new Map(rows.map((r) => [r.fixture.id, r])) };
}
