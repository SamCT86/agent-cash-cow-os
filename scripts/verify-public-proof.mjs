import { readdir, readFile } from "node:fs/promises";
import { evaluateTransaction } from "../demo/engine.mjs";
import { createProofReceipt, verifyProofReceipt } from "../demo/proof-receipt.mjs";

const dir = new URL("../proof/scenarios/", import.meta.url);
const files = (await readdir(dir)).filter((name) => name.endsWith(".json")).sort();
const rows = [];

for (const file of files) {
  const raw = JSON.parse(await readFile(new URL(file, dir), "utf8"));
  const { id, ...inputs } = raw;
  const evaluation = await evaluateTransaction(inputs, { scenario_id: id });
  const receipt = await createProofReceipt(inputs, evaluation);
  const verified = await verifyProofReceipt(receipt);
  if (!verified) throw new Error("receipt verification failed: " + id);
  rows.push({
    scenario_id: id,
    decision: evaluation.decision,
    trace_id: evaluation.trace_id,
    receipt_hash: receipt.receipt_hash,
    receipt_verified: verified,
  });
}

const summary = {
  proof_version: "acc-public-proof-v1",
  synthetic: true,
  network_calls: 0,
  real_money: false,
  private_runtime_dependency: false,
  scenario_count: rows.length,
  all_receipts_verified: rows.every((row) => row.receipt_verified),
  scenarios: rows,
};

console.log(JSON.stringify(summary, null, 2));
