import test from "node:test";
import assert from "node:assert/strict";
import { evaluateTransaction, SyntheticInputError } from "../demo/engine.mjs";

const base = {
  authorization: "valid",
  payment_ack: "confirmed",
  provider_state: "paid",
  replay_attempt: false,
  outcome: "verified",
};

test("clean path settles once", async () => {
  const out = await evaluateTransaction(base, { scenario_id: "clean" });
  assert.equal(out.decision, "SETTLE_ONCE");
  assert.equal(out.steps.length, 6);
  assert.equal(out.steps.at(-1).status, "verified");
});

test("timeout + provider paid blocks duplicate payment and continues", async () => {
  const out = await evaluateTransaction(
    { ...base, payment_ack: "timeout", provider_state: "paid" },
    { scenario_id: "timeout-after-payment" },
  );
  assert.equal(out.decision, "SETTLE_ONCE");
  assert.ok(out.risks.includes("DUPLICATE_PAYMENT"));
  assert.equal(out.steps[2].status, "readback");
});

test("timeout + provider unpaid makes one bounded retry eligible", async () => {
  const out = await evaluateTransaction({
    ...base,
    payment_ack: "timeout",
    provider_state: "unpaid",
  });
  assert.equal(out.decision, "RETRY_PAYMENT_ONCE");
  assert.equal(out.steps[3].status, "not-started");
});

test("timeout + unknown provider state fails closed", async () => {
  const out = await evaluateTransaction({
    ...base,
    payment_ack: "timeout",
    provider_state: "unknown",
  });
  assert.equal(out.decision, "HOLD_DO_NOT_RETRY");
  assert.ok(out.risks.includes("STATE_GUESSING"));
});

test("expired authorization stops before payment", async () => {
  const out = await evaluateTransaction({ ...base, authorization: "expired" });
  assert.equal(out.decision, "STOP_BEFORE_PAYMENT");
  assert.equal(out.steps[2].event, "PAYMENT_NOT_STARTED");
});

test("duplicate replay does not create second payment/work/settlement", async () => {
  const original = await evaluateTransaction(base);
  const out = await evaluateTransaction({ ...base, replay_attempt: true });
  assert.equal(out.decision, "REJECT_REPLAY_CONTINUE_ORIGINAL_TRACE");
  assert.equal(out.trace_id, original.trace_id);
  assert.ok(out.risks.includes("DUPLICATE_SETTLEMENT"));
  assert.equal(out.steps[2].status, "blocked");
  assert.equal(out.steps[5].event, "ORIGINAL_SETTLEMENT_PRESERVED");
});

test("incomplete outcome holds settlement", async () => {
  const out = await evaluateTransaction({ ...base, outcome: "incomplete" });
  assert.equal(out.decision, "HOLD_SETTLEMENT");
  assert.equal(out.steps[5].status, "held");
});

test("failed outcome holds settlement", async () => {
  const out = await evaluateTransaction({ ...base, outcome: "failed" });
  assert.equal(out.decision, "HOLD_SETTLEMENT");
  assert.equal(out.steps[4].status, "blocked");
});

test("impossible confirmed/unpaid state is rejected", async () => {
  await assert.rejects(
    () => evaluateTransaction({ ...base, provider_state: "unpaid" }),
    (error) => error instanceof SyntheticInputError && error.code === "INVALID_SYNTHETIC_STATE",
  );
});
