// The family narratives of the import baseline (ADR 0010, ADR 0015): one per migrated family, all draft, every
// statement traced, and the authored input compiling to exactly the baseline records. They read the baseline
// (tests/historical/baseline-root.mjs), not the working tree, so a reviewed narrative edit or a new family's
// narrative does not change these assertions.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { listJson, repoRoot } from "../../scripts/lib/validator.mjs";
import { LEGACY_REVISION } from "../../scripts/migrate/lib/legacy-source.mjs";
import { buildNarratives, loadAuthored, loadCanonical } from "../../scripts/migrate/lib/narrative-build.mjs";
import { baseline } from "./baseline-root.mjs";

const clone = (r) => JSON.parse(JSON.stringify(r));
const base = (await baseline()).root;
const narrativeDir = join(base, "records", "narratives");
const narratives = existsSync(narrativeDir) ? listJson(narrativeDir).map((f) => JSON.parse(readFileSync(f, "utf8"))) : [];

test("the migration set is present, one narrative per family, all draft", () => {
  assert.equal(narratives.length, 173, "every family has a narrative");
  assert.equal(new Set(narratives.map((n) => n.id)).size, narratives.length);
  for (const n of narratives) {
    assert.equal(n.id, n.family);
    assert.equal(n.lifecycle, "draft", `${n.id}: promotion to reviewed is a human step`);
  }
});

test("every migrated statement traces to a claim or source, or is unresolved with a review event", () => {
  let statements = 0;
  for (const n of narratives) {
    for (const list of Object.values(n.sections)) {
      for (const s of list) {
        statements += 1;
        if (s.evidenceClass === "unresolved") {
          assert.ok(s.unresolved?.reviewEvent >= 2, `${n.id} ${s.id}`);
          assert.equal(s.citations, undefined);
        } else {
          assert.ok(s.citations?.length >= 1, `${n.id} ${s.id}`);
          assert.equal(s.unresolved, undefined);
        }
        assert.match(s.observedAt, /^\d{4}-\d{2}-\d{2}/);
      }
    }
  }
  assert.ok(statements >= 1000);
});

test("the compiler refuses a source the family's contract does not cite and an unsupported claim", async () => {
  const canonical = loadCanonical(base);
  const [aws] = (await loadAuthored(repoRoot)).filter((a) => a.data.provider === "aws");
  const mutate = (fn) => {
    const data = clone(aws.data);
    fn(data.families.find((f) => f.id === "aws:iam-user-access-key"));
    return () => buildNarratives({ authored: [{ file: aws.file, data }], canonical, legacyRevision: "0".repeat(40) });
  };
  assert.throws(mutate((f) => (f.sections.shape[0].cite = ["https://example.com/not-a-record"])), /no evidence-source record/);
  assert.throws(
    mutate((f) => (f.sections.shape[0].cite = ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html"])),
    /which no claim of aws:iam-user-access-key@1 cites/,
  );
  assert.throws(mutate((f) => (f.sections.shape[0].claims = ["no-such-claim"])), /unknown claim 'no-such-claim'/);
  assert.throws(mutate((f) => { f.sections.shape[0].cite = []; f.sections.shape[0].claims = []; }), /no citation/);
  assert.throws(mutate((f) => (f.sections.shape[0].unresolved = "x")), /carries no citations/);
  assert.throws(mutate((f) => (f.status = "done")), /status must be one of/);
});

test("the compiled records match the baseline", async () => {
  const canonical = loadCanonical(base);
  const authored = await loadAuthored(repoRoot);
  const { files } = buildNarratives({ authored, canonical, legacyRevision: LEGACY_REVISION });
  for (const [rel, text] of files) assert.equal(readFileSync(join(base, rel), "utf8"), text, `${rel} differs from the baseline: run npm run migrate:narratives`);
});
