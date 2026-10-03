import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const root = new URL("../", import.meta.url);

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    if (name === ".git") continue;
    const path = join(dir, name);
    const s = await stat(path);
    if (s.isDirectory()) out.push(...await walk(path));
    else out.push(path);
  }
  return out;
}

test("browser demo has no runtime network primitives", async () => {
  const demoDir = new URL("../demo/", import.meta.url);
  const files = (await readdir(demoDir)).filter((name) => /\.(?:js|mjs|html)$/.test(name));
  const forbidden = [
    /\bfetch\s*\(/,
    /XMLHttpRequest/,
    /\bWebSocket\b/,
    /\bEventSource\b/,
    /sendBeacon/,
    /navigator\.credentials/,
  ];

  for (const file of files) {
    const text = await readFile(new URL(file, demoDir), "utf8");
    for (const pattern of forbidden) assert.doesNotMatch(text, pattern, file);
  }
});

test("public tree contains no obvious credential material or private runtime markers", async () => {
  const files = await walk(new URL("../", import.meta.url).pathname);
  const patterns = [
    /\bAKIA[0-9A-Z]{16}\b/,
    /\bASIA[0-9A-Z]{16}\b/,
    /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
    /\bsk-(?:live|test)?[_A-Za-z0-9-]{16,}\b/i,
    /\bLLM\|\d{6,}\|[A-Za-z0-9._~-]{8,}\b/,
    /postgres(?:ql)?:\/\//i,
    /DATABASE_URL\s*=/,
    /META_AI_SPARK_API\s*=/,
    /OPENAI_API_KEY\s*=/,
    /apps\/rack-seller/,
    /packages\/forecast/,
    /PROSPECTIVE_V3_SOURCE_ELIGIBILITY_BEFORE_SAMPLE_FREEZE/,
  ];

  for (const path of files) {
    if (!/\.(?:md|json|js|mjs|html|css|yml|yaml)$/.test(path)) continue;
    if (path.endsWith("tests/security-boundary.test.mjs")) continue;
    const text = await readFile(path, "utf8");
    for (const pattern of patterns) {
      assert.doesNotMatch(text, pattern, relative(root.pathname, path));
    }
  }
});

test("GitHub workflows do not request repository secrets or privileged PR execution", async () => {
  const workflows = [
    ".github/workflows/verify-public-proof.yml",
    ".github/workflows/pages.yml",
  ];
  for (const file of workflows) {
    const text = await readFile(new URL("../" + file, import.meta.url), "utf8");
    assert.doesNotMatch(text, /pull_request_target/);
    assert.doesNotMatch(text, /secrets\./);
    assert.doesNotMatch(text, /persist-credentials:\s*true/);
  }
});

test("Pages deployment requires explicit manual dispatch", async () => {
  const text = await readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
  assert.match(text, /workflow_dispatch:/);
  assert.doesNotMatch(text, /^\s*push:/m);
  assert.doesNotMatch(text, /^\s*pull_request:/m);
});

test("source publication does not route readers to undeployed GitHub Pages", async () => {
  for (const file of ["README.md", "README.sv.md"]) {
    const text = await readFile(new URL("../" + file, import.meta.url), "utf8");
    assert.doesNotMatch(text, /samct86\.github\.io\/agent-cash-cow-os/i);
    assert.match(text, /sarmadtawfeek\.com\/agent-cash-cow/i);
  }
});
