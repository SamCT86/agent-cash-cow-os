import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const paths = [
  "README.md",
  "README.sv.md",
  "docs/architecture.md",
  "docs/proof-model.md",
  "docs/claims-and-boundaries.md",
  "docs/partner-diligence.md",
  "demo/index.html",
];

test("public claims avoid unsupported production/demand superlatives", async () => {
  const forbidden = [
    /\bproduction[- ]grade\b/i,
    /\bbattle[- ]tested\b/i,
    /\bguaranteed\b/i,
    /\bproven market demand\b/i,
    /\bproven forecast advantage\b/i,
    /\bzero risk\b/i,
    /\bnever fails\b/i,
    /\bfully autonomous money layer\b/i,
  ];
  for (const path of paths) {
    const text = await readFile(new URL("../" + path, import.meta.url), "utf8");
    for (const pattern of forbidden) assert.doesNotMatch(text, pattern, path);
  }
});

test("core public surfaces carry synthetic/private/not-proven boundaries", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const page = await readFile(new URL("../demo/index.html", import.meta.url), "utf8");
  const boundary = await readFile(new URL("../docs/claims-and-boundaries.md", import.meta.url), "utf8");

  assert.match(readme, /synthetic public demonstrator/i);
  assert.match(readme, /NOT YET PROVEN/);
  assert.match(page, /PUBLIC PROOF · SYNTHETIC/);
  assert.match(page, /PRIVATE BY DESIGN/);
  assert.match(boundary, /NOT YET PROVEN BY THIS REPOSITORY/);
});
