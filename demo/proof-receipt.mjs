export const PUBLIC_PROOF_VERSION = "acc-public-proof-v1";

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, sortValue(value[key])]),
    );
  }
  return value;
}

export function canonicalStringify(value) {
  return JSON.stringify(sortValue(value));
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(
    typeof value === "string" ? value : canonicalStringify(value),
  );
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function deterministicTraceId(inputs) {
  const digest = await sha256Hex({ proof_version: PUBLIC_PROOF_VERSION, inputs });
  return `demo-${digest.slice(0, 16)}`;
}

export async function createProofReceipt(inputs, evaluation) {
  const traceId = evaluation.trace_id ?? await deterministicTraceId(inputs);
  const unsigned = {
    proof_version: PUBLIC_PROOF_VERSION,
    scenario_id: evaluation.scenario_id ?? "custom",
    synthetic: true,
    trace_id: traceId,
    inputs: {
      authorization: inputs.authorization,
      payment_ack: inputs.payment_ack,
      provider_state: inputs.provider_state,
      replay_attempt: Boolean(inputs.replay_attempt),
      outcome: inputs.outcome,
    },
    decision: evaluation.decision,
    next_safe_action: evaluation.next_action,
    risks_prevented: [...evaluation.risks],
    stages: evaluation.steps.map((step) => ({
      stage: step.stage,
      status: step.status,
      evidence: step.evidence,
    })),
  };

  return Object.freeze({
    ...unsigned,
    receipt_hash: await sha256Hex(unsigned),
  });
}

export async function verifyProofReceipt(receipt) {
  if (!receipt || typeof receipt !== "object") return false;
  const { receipt_hash: receiptHash, ...unsigned } = receipt;
  if (typeof receiptHash !== "string" || receiptHash.length !== 64) return false;
  return (await sha256Hex(unsigned)) === receiptHash;
}
