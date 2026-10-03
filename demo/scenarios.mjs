export const SCENARIOS = Object.freeze({
  clean: Object.freeze({
    id: "clean",
    title: "Clean verified path",
    summary: "Authorization, payment acknowledgement and outcome evidence all resolve cleanly.",
    inputs: Object.freeze({
      authorization: "valid",
      payment_ack: "confirmed",
      provider_state: "paid",
      replay_attempt: false,
      outcome: "verified",
    }),
  }),
  timeoutPaid: Object.freeze({
    id: "timeout-after-payment",
    title: "Timeout after payment",
    summary: "Payment already happened; only the acknowledgement was lost.",
    inputs: Object.freeze({
      authorization: "valid",
      payment_ack: "timeout",
      provider_state: "paid",
      replay_attempt: false,
      outcome: "verified",
    }),
  }),
  replay: Object.freeze({
    id: "duplicate-replay",
    title: "Duplicate replay",
    summary: "The same request arrives again after an original verified trace already exists.",
    inputs: Object.freeze({
      authorization: "valid",
      payment_ack: "confirmed",
      provider_state: "paid",
      replay_attempt: true,
      outcome: "verified",
    }),
  }),
  expired: Object.freeze({
    id: "expired-authorization",
    title: "Expired authorization",
    summary: "The request exists, but authority to spend no longer does.",
    inputs: Object.freeze({
      authorization: "expired",
      payment_ack: "confirmed",
      provider_state: "paid",
      replay_attempt: false,
      outcome: "verified",
    }),
  }),
  unknown: Object.freeze({
    id: "unknown-provider-state",
    title: "Unknown provider state",
    summary: "The transport timed out and external payment state cannot yet be proven.",
    inputs: Object.freeze({
      authorization: "valid",
      payment_ack: "timeout",
      provider_state: "unknown",
      replay_attempt: false,
      outcome: "verified",
    }),
  }),
  incomplete: Object.freeze({
    id: "incomplete-outcome",
    title: "Outcome not verified",
    summary: "Work was attempted, but acceptance evidence is incomplete.",
    inputs: Object.freeze({
      authorization: "valid",
      payment_ack: "confirmed",
      provider_state: "paid",
      replay_attempt: false,
      outcome: "incomplete",
    }),
  }),
});

export function scenarioById(id) {
  return Object.values(SCENARIOS).find((scenario) => scenario.id === id) ?? null;
}
