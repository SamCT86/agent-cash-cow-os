import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("public governance baseline exists and keeps one owner", async () => {
  const owners = await readFile(new URL("../.github/CODEOWNERS", import.meta.url), "utf8");
  const template = await readFile(new URL("../.github/PULL_REQUEST_TEMPLATE.md", import.meta.url), "utf8");

  assert.match(owners, /^\* @SamCT86$/m);
  assert.match(template, /No private Agent Cash Cow OS implementation/);
  assert.match(template, /GitHub Pages deployment is not implicitly enabled/);
  assert.match(template, /node --test tests\/\*\.test\.mjs/);
  assert.match(template, /node scripts\/verify-public-proof\.mjs/);
});
