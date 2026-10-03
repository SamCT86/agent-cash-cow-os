import test from "node:test";
import assert from "node:assert/strict";
import { evaluateTransaction, SyntheticInputError } from "../demo/engine.mjs";

const values = {
  authorization: ["valid", "expired"],
  payment_ack: ["confirmed", "timeout"],
  provider_state: ["paid", "unpaid", "unknown"],
  replay_attempt: [false, true],
  outcome: ["verified", "incomplete", "failed"],
};

function* matrix() {
  for (const authorization of values.authorization)
  for (const payment_ack of values.payment_ack)
  for (const provider_state of values.provider_state)
  for (const replay_attempt of values.replay_attempt)
  for (const outcome of values.outcome)
    yield { authorization, payment_ack, provider_state, replay_attempt, outcome };
}

function expectedInvalid(x) {
  if (x.replay_attempt && (
    x.authorization !== "valid" ||
    x.provider_state !== "paid" ||
    x.outcome !== "verified"
  )) return true;

  if (
    x.authorization === "valid" &&
    !x.replay_attempt &&
    x.payment_ack === "confirmed" &&
    x.provider_state !== "paid"
  ) return true;

  return false;
}

test("all 72 synthetic input combinations are deterministic or fail closed by contract", async () => {
  let valid = 0;
  let invalid = 0;

  for (const input of matrix()) {
    if (expectedInvalid(input)) {
      await assert.rejects(
        () => evaluateTransaction(input),
        (error) => error instanceof SyntheticInputError &&
          error.code === "INVALID_SYNTHETIC_STATE",
        JSON.stringify(input),
      );
      invalid++;
      continue;
    }

    const a = await evaluateTransaction(input);
    const b = await evaluateTransaction(input);
    assert.deepEqual(a, b, JSON.stringify(input));
    assert.equal(a.steps.length, 6, JSON.stringify(input));
    assert.ok(a.trace_id.startsWith("demo-"), JSON.stringify(input));
    valid++;
  }

  assert.equal(valid + invalid, 72);
  assert.ok(valid > 0);
  assert.ok(invalid > 0);
});

test("no non-verified outcome may release settlement", async () => {
  for (const payment_ack of ["confirmed", "timeout"]) {
    for (const outcome of ["incomplete", "failed"]) {
      const input = {
        authorization: "valid",
        payment_ack,
        provider_state: "paid",
        replay_attempt: false,
        outcome,
      };
      const result = await evaluateTransaction(input);
      assert.equal(result.decision, "HOLD_SETTLEMENT");
      assert.equal(result.steps.at(-1).status, "held");
      assert.notEqual(result.steps.at(-1).event, "SETTLEMENT_RELEASED_ONCE");
    }
  }
});

test("unknown provider state after timeout never authorizes retry or settlement", async () => {
  for (const outcome of values.outcome) {
    const result = await evaluateTransaction({
      authorization: "valid",
      payment_ack: "timeout",
      provider_state: "unknown",
      replay_attempt: false,
      outcome,
    });
    assert.equal(result.decision, "HOLD_DO_NOT_RETRY");
    assert.equal(result.steps[2].status, "held");
    assert.equal(result.steps[5].status, "not-started");
  }
});
