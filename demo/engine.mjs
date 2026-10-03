import { deterministicTraceId } from "./proof-receipt.mjs";

const ENUMS = Object.freeze({
  authorization: new Set(["valid", "expired"]),
  payment_ack: new Set(["confirmed", "timeout"]),
  provider_state: new Set(["paid", "unpaid", "unknown"]),
  outcome: new Set(["verified", "incomplete", "failed"]),
});

export class SyntheticInputError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SyntheticInputError";
    this.code = code;
  }
}

export function validateSyntheticInputs(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new SyntheticInputError("INVALID_SYNTHETIC_STATE", "Inputs must be an object.");
  }

  for (const [field, allowed] of Object.entries(ENUMS)) {
    if (!allowed.has(raw[field])) {
      throw new SyntheticInputError(
        "INVALID_SYNTHETIC_STATE",
        `${field} has an unsupported synthetic value.`,
      );
    }
  }

  if (typeof raw.replay_attempt !== "boolean") {
    throw new SyntheticInputError(
      "INVALID_SYNTHETIC_STATE",
      "replay_attempt must be boolean.",
    );
  }

  if (
    raw.replay_attempt === true &&
    (
      raw.authorization !== "valid" ||
      raw.provider_state !== "paid" ||
      raw.outcome !== "verified"
    )
  ) {
    throw new SyntheticInputError(
      "INVALID_SYNTHETIC_STATE",
      "A duplicate replay requires a valid original trace with paid state and verified outcome.",
    );
  }

  if (
    raw.authorization === "valid" &&
    raw.replay_attempt === false &&
    raw.payment_ack === "confirmed" &&
    raw.provider_state !== "paid"
  ) {
    throw new SyntheticInputError(
      "INVALID_SYNTHETIC_STATE",
      "A confirmed synthetic payment acknowledgement must pair with provider_state=paid.",
    );
  }

  return Object.freeze({
    authorization: raw.authorization,
    payment_ack: raw.payment_ack,
    provider_state: raw.provider_state,
    replay_attempt: raw.replay_attempt,
    outcome: raw.outcome,
  });
}

function stage(stage, status, evidence, event) {
  return Object.freeze({ stage, status, evidence, event });
}

function ledger(steps) {
  return steps.map((step, index) =>
    Object.freeze({
      at: `T+${String(index * 120).padStart(3, "0")}ms`,
      event: step.event,
      detail: step.evidence,
    }),
  );
}

function blockedTail(reason) {
  return [
    stage("work", "not-started", reason, "WORK_NOT_STARTED"),
    stage("outcome", "not-started", reason, "OUTCOME_NOT_STARTED"),
    stage("settlement", "not-started", reason, "SETTLEMENT_NOT_STARTED"),
  ];
}

export async function evaluateTransaction(raw, options = {}) {
  const inputs = validateSyntheticInputs(raw);
  const traceInputs = inputs.replay_attempt
    ? { ...inputs, replay_attempt: false }
    : inputs;
  const traceId = await deterministicTraceId(traceInputs);
  const scenarioId = options.scenario_id ?? "custom";

  const steps = [
    stage(
      "request",
      "verified",
      "Synthetic request accepted and bound to one deterministic trace identity.",
      "REQUEST_BOUND",
    ),
  ];
  const reasons = [];
  const risks = [];

  if (inputs.authorization === "expired") {
    steps.push(
      stage(
        "authorization",
        "blocked",
        "Authorization is expired. No new economic action may begin.",
        "AUTHORIZATION_REJECTED",
      ),
      stage("payment", "not-started", "Stopped before payment.", "PAYMENT_NOT_STARTED"),
      ...blockedTail("Stopped by expired authorization."),
    );
    reasons.push("Economic actions require current authorization.");
    risks.push("UNAUTHORIZED_SPEND");
    return freezeEvaluation({
      scenarioId,
      traceId,
      decision: "STOP_BEFORE_PAYMENT",
      nextAction: "Refresh or replace authorization before any economic action.",
      steps,
      reasons,
      risks,
      naive: "Continue because a request exists.",
      guarded: "Stop because authority to spend no longer exists.",
    });
  }

  steps.push(
    stage(
      "authorization",
      "verified",
      "Authorization is current for this synthetic request.",
      "AUTHORIZATION_VERIFIED",
    ),
  );

  if (inputs.replay_attempt) {
    steps.push(
      stage(
        "payment",
        "blocked",
        "Request fingerprint matches an existing verified trace; no second payment is created.",
        "REPLAY_REJECTED",
      ),
      stage(
        "work",
        "blocked",
        "Repeated request remains attached to the original trace; duplicate work is not started.",
        "DUPLICATE_WORK_BLOCKED",
      ),
      stage(
        "outcome",
        "verified",
        "The original trace retains its previously verified synthetic outcome.",
        "ORIGINAL_OUTCOME_PRESERVED",
      ),
      stage(
        "settlement",
        "verified",
        "The original synthetic settlement remains single; replay creates no second settlement.",
        "ORIGINAL_SETTLEMENT_PRESERVED",
      ),
    );
    reasons.push("The same request is already represented by the original trace.");
    risks.push("DUPLICATE_PAYMENT", "DUPLICATE_WORK", "DUPLICATE_SETTLEMENT");
    return freezeEvaluation({
      scenarioId,
      traceId,
      decision: "REJECT_REPLAY_CONTINUE_ORIGINAL_TRACE",
      nextAction: "Continue from the original trace; do not repeat payment or work.",
      steps,
      reasons,
      risks,
      naive: "Process the repeated request as new work.",
      guarded: "Bind the replay to the original trace and reject duplicate economic action.",
    });
  }

  let paymentEstablished = false;
  if (inputs.payment_ack === "confirmed") {
    paymentEstablished = true;
    steps.push(
      stage(
        "payment",
        "verified",
        "Synthetic payment acknowledgement is confirmed.",
        "PAYMENT_CONFIRMED",
      ),
    );
  } else if (inputs.provider_state === "paid") {
    paymentEstablished = true;
    steps.push(
      stage(
        "payment",
        "readback",
        "Transport timed out; provider readback reports that payment already exists.",
        "PAYMENT_READBACK_PAID",
      ),
    );
    reasons.push("A timeout is not proof of failure; readback already shows paid.");
    risks.push("DUPLICATE_PAYMENT");
  } else if (inputs.provider_state === "unpaid") {
    steps.push(
      stage(
        "payment",
        "readback",
        "Transport timed out; provider readback reports no payment exists.",
        "PAYMENT_READBACK_UNPAID",
      ),
      ...blockedTail("No payment exists yet; one bounded retry may occur inside the same trace."),
    );
    reasons.push("Readback proved that no payment exists before retry became eligible.");
    risks.push("BLIND_RETRY");
    return freezeEvaluation({
      scenarioId,
      traceId,
      decision: "RETRY_PAYMENT_ONCE",
      nextAction: "Retry once inside the same trace after readback proves unpaid.",
      steps,
      reasons,
      risks,
      naive: "Guess whether the timeout means failure.",
      guarded: "Read provider state first, then allow one bounded retry only when unpaid is verified.",
    });
  } else {
    steps.push(
      stage(
        "payment",
        "held",
        "Transport timed out and external payment state remains unknown.",
        "PAYMENT_STATE_UNKNOWN",
      ),
      ...blockedTail("External payment state must be reconciled first."),
    );
    reasons.push("Unknown external state is not safe evidence for another payment attempt.");
    risks.push("DUPLICATE_PAYMENT", "STATE_GUESSING");
    return freezeEvaluation({
      scenarioId,
      traceId,
      decision: "HOLD_DO_NOT_RETRY",
      nextAction: "Reconcile external provider state before another payment attempt.",
      steps,
      reasons,
      risks,
      naive: "Retry or abandon based on the timeout alone.",
      guarded: "Hold because the external state is unresolved.",
    });
  }

  if (!paymentEstablished) {
    throw new SyntheticInputError(
      "INVALID_SYNTHETIC_STATE",
      "Internal synthetic state error: payment path did not resolve.",
    );
  }

  steps.push(
    stage(
      "work",
      "verified",
      "Synthetic work artifact is bound to the authorized trace.",
      "WORK_BOUND",
    ),
  );

  if (inputs.outcome === "verified") {
    steps.push(
      stage(
        "outcome",
        "verified",
        "Acceptance evidence is complete for the synthetic scenario.",
        "OUTCOME_VERIFIED",
      ),
      stage(
        "settlement",
        "verified",
        "Synthetic settlement is released exactly once for the verified trace.",
        "SETTLEMENT_RELEASED_ONCE",
      ),
    );
    reasons.push("Authorization, payment and outcome evidence all resolved.");
    return freezeEvaluation({
      scenarioId,
      traceId,
      decision: "SETTLE_ONCE",
      nextAction: "Close the verified trace after one synthetic settlement.",
      steps,
      reasons,
      risks,
      naive: "Proceed and settle.",
      guarded: "Proceed and settle once, with explicit evidence at each gate.",
    });
  }

  const failed = inputs.outcome === "failed";
  steps.push(
    stage(
      "outcome",
      failed ? "blocked" : "held",
      failed
        ? "Acceptance evidence failed; the synthetic result is not accepted."
        : "Acceptance evidence is incomplete; the synthetic result cannot yet be accepted.",
      failed ? "OUTCOME_FAILED" : "OUTCOME_INCOMPLETE",
    ),
    stage(
      "settlement",
      "held",
      "Settlement remains held until outcome evidence is verified.",
      "SETTLEMENT_HELD",
    ),
  );
  reasons.push("Attempted work is not the same as an accepted outcome.");
  risks.push("FALSE_SUCCESS", "PREMATURE_SETTLEMENT");
  return freezeEvaluation({
    scenarioId,
    traceId,
    decision: "HOLD_SETTLEMENT",
    nextAction: "Resolve outcome evidence before settlement.",
    steps,
    reasons,
    risks,
    naive: "Settle because work appears finished.",
    guarded: "Hold settlement until the agreed result is actually verified.",
  });
}

function freezeEvaluation({
  scenarioId,
  traceId,
  decision,
  nextAction,
  steps,
  reasons,
  risks,
  naive,
  guarded,
}) {
  return Object.freeze({
    scenario_id: scenarioId,
    trace_id: traceId,
    decision,
    next_action: nextAction,
    steps: Object.freeze([...steps]),
    reasons: Object.freeze([...new Set(reasons)]),
    risks: Object.freeze([...new Set(risks)]),
    naive,
    guarded,
    ledger: Object.freeze(ledger(steps)),
  });
}
