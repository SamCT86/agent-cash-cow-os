import test from "node:test";
import assert from "node:assert/strict";
import { evaluateTransaction } from "../demo/engine.mjs";
import { createProofReceipt, verifyProofReceipt } from "../demo/proof-receipt.mjs";

const inputs = {
  authorization: "valid",
  payment_ack: "timeout",
  provider_state: "paid",
  replay_attempt: false,
  outcome: "verified",
};

test("receipt is deterministic and verifies", async () => {
  const evaluation = await evaluateTransaction(inputs, { scenario_id: "timeout-after-payment" });
  const a = await createProofReceipt(inputs, evaluation);
  const b = await createProofReceipt(inputs, evaluation);
  assert.deepEqual(a, b);
  assert.equal(a.receipt_hash.length, 64);
  assert.equal(await verifyProofReceipt(a), true);
});

test("tampered receipt fails verification", async () => {
  const evaluation = await evaluateTransaction(inputs, { scenario_id: "timeout-after-payment" });
  const receipt = await createProofReceipt(inputs, evaluation);
  const tampered = { ...receipt, decision: "PAY_AGAIN" };
  assert.equal(await verifyProofReceipt(tampered), false);
});

test("equivalent input yields stable trace id", async () => {
  const a = await evaluateTransaction({ ...inputs });
  const b = await evaluateTransaction({ ...inputs });
  assert.equal(a.trace_id, b.trace_id);
});
