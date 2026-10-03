import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { evaluateTransaction } from "../demo/engine.mjs";

const dir = new URL("../proof/scenarios/", import.meta.url);

test("every frozen scenario is valid and deterministic", async () => {
  const files = (await readdir(dir)).filter((name) => name.endsWith(".json")).sort();
  assert.ok(files.length >= 6);

  for (const file of files) {
    const raw = JSON.parse(await readFile(new URL(file, dir), "utf8"));
    const { id, ...inputs } = raw;
    const a = await evaluateTransaction(inputs, { scenario_id: id });
    const b = await evaluateTransaction(inputs, { scenario_id: id });
    assert.deepEqual(a, b, file);
    assert.equal(a.steps.length, 6, file);
    assert.ok(a.trace_id.startsWith("demo-"), file);
  }
});
