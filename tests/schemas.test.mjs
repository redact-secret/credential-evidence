import assert from "node:assert/strict";
import { test } from "node:test";
import { KINDS, loadSchemas } from "../scripts/lib/validator.mjs";

const schemas = loadSchemas();
const byId = new Map(schemas.map((s) => [s.schema.$id, s.schema]));

const FORBIDDEN_FIELDS = ["supportStatus", "status", "detector", "detectors", "detectorId", "detectorIds", "stable", "provisional", "pending"];

function* walk(node, path = "") {
  if (node && typeof node === "object") {
    if (!Array.isArray(node)) yield { node, path };
    for (const [k, v] of Object.entries(node)) yield* walk(v, `${path}/${k}`);
  }
}

test("every entity kind has a v1 schema declaring draft 2020-12", () => {
  for (const kind of KINDS) {
    const s = byId.get(`urn:credential-evidence:schema:v1:${kind}`);
    assert.ok(s, `missing schema for ${kind}`);
    assert.equal(s.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.equal(s.additionalProperties, false, `${kind} must close its root`);
    assert.equal(s.properties.kind.const, kind);
    assert.equal(s.properties.schemaVersion.const, 1);
  }
  assert.ok(byId.has("urn:credential-evidence:schema:v1:common"));
});

test("all schemas share one revision", () => {
  const revisions = new Set(schemas.map((s) => s.schema["x-schemaRevision"]));
  assert.equal(revisions.size, 1);
  assert.match([...revisions][0], /^1\.\d+\.\d+$/);
});

test("no schema requires or even declares a scanner status or detector field", () => {
  for (const { file, schema } of schemas) {
    for (const { node, path } of walk(schema)) {
      if (node.properties && typeof node.properties === "object") {
        for (const name of Object.keys(node.properties)) {
          assert.ok(!FORBIDDEN_FIELDS.includes(name), `${file}${path} declares forbidden property '${name}'`);
        }
      }
      if (Array.isArray(node.required)) {
        for (const name of node.required) assert.ok(!FORBIDDEN_FIELDS.includes(name), `${file}${path} requires '${name}'`);
      }
    }
  }
});

test("no enum offers stable, provisional or pending", () => {
  for (const { file, schema } of schemas) {
    for (const { node, path } of walk(schema)) {
      for (const list of [node.enum, node.const === undefined ? undefined : [node.const]]) {
        if (!Array.isArray(list)) continue;
        for (const v of list) assert.ok(!["stable", "provisional", "pending"].includes(v), `${file}${path} allows '${v}'`);
      }
    }
  }
});

test("schemas reference only local ids: no network at validation time", () => {
  for (const { file, schema } of schemas) {
    for (const { node, path } of walk(schema)) {
      if (typeof node.$ref === "string") {
        assert.match(node.$ref, /^(#|urn:credential-evidence:schema:v1:)/, `${file}${path} has non-local $ref ${node.$ref}`);
      }
    }
  }
});

test("only the external-reference structure names systems", () => {
  const common = byId.get("urn:credential-evidence:schema:v1:common");
  const refs = common.$defs.externalRefs;
  assert.equal(refs.items.additionalProperties, false);
  assert.deepEqual(Object.keys(refs.items.properties).sort(), ["id", "note", "system", "url"]);
});
