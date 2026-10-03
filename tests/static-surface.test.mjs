import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("../demo/index.html", import.meta.url), "utf8");

test("static surface has one primary heading, skip link, main landmark and unique ids", () => {
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /class="skip-link" href="#main"/);
  assert.match(html, /<main id="main">/);

  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, "duplicate HTML id");
});

test("all local anchor targets exist", () => {
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  for (const anchor of anchors) assert.ok(ids.has(anchor), "missing #" + anchor);
});

test("interactive controls are named and primary controls have readable text", () => {
  for (const name of ["authorization", "payment_ack", "provider_state", "outcome", "replay_attempt"]) {
    assert.match(html, new RegExp(`name="${name}"`));
  }
  const buttons = [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)];
  assert.ok(buttons.length >= 3);
  for (const [, content] of buttons) {
    assert.ok(content.replace(/<[^>]+>/g, "").trim().length > 0, "empty button");
  }
});

test("static entrypoint references only local CSS/JS modules", async () => {
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /src="\.\/app\.js"/);
  await access(new URL("../demo/styles.css", import.meta.url), constants.R_OK);
  await access(new URL("../demo/app.js", import.meta.url), constants.R_OK);
});

test("relative Markdown links in the root README resolve", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const links = [...readme.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((m) => m[1]);
  for (const link of links) {
    if (/^(?:https?:|#)/.test(link)) continue;
    await access(new URL("../" + link, import.meta.url), constants.R_OK);
  }
});

test("all GitHub Actions uses references are pinned to exact commit SHAs", async () => {
  for (const rel of [".github/workflows/verify-public-proof.yml", ".github/workflows/pages.yml"]) {
    const text = await readFile(new URL("../" + rel, import.meta.url), "utf8");
    const uses = [...text.matchAll(/uses:\s*([^\s#]+)/g)].map((m) => m[1]);
    assert.ok(uses.length > 0);
    for (const ref of uses) {
      assert.match(ref, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[a-f0-9]{40}$/);
    }
  }
});
