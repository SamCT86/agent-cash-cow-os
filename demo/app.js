import { evaluateTransaction, SyntheticInputError } from "./engine.mjs";
import { createProofReceipt, verifyProofReceipt } from "./proof-receipt.mjs";
import { SCENARIOS } from "./scenarios.mjs";

const form = document.querySelector("#lab-form");
const resultPanel = document.querySelector("#result-panel");
const presets = document.querySelector("#scenario-presets");
const validation = document.querySelector("#validation-message");
const resetButton = document.querySelector("[data-reset]");
const guidedButton = document.querySelector("[data-run-guided]");

let selectedScenario = "clean";

function setInputs(inputs) {
  form.elements.authorization.value = inputs.authorization;
  form.elements.payment_ack.value = inputs.payment_ack;
  form.elements.provider_state.value = inputs.provider_state;
  form.elements.outcome.value = inputs.outcome;
  form.elements.replay_attempt.checked = inputs.replay_attempt;
}

function readInputs() {
  return {
    authorization: form.elements.authorization.value,
    payment_ack: form.elements.payment_ack.value,
    provider_state: form.elements.provider_state.value,
    replay_attempt: form.elements.replay_attempt.checked,
    outcome: form.elements.outcome.value,
  };
}

function renderPresets() {
  presets.innerHTML = "";
  for (const [key, scenario] of Object.entries(SCENARIOS)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scenario-button";
    button.textContent = scenario.title;
    button.dataset.scenario = key;
    button.setAttribute("aria-pressed", String(key === selectedScenario));
    button.addEventListener("click", () => {
      selectedScenario = key;
      setInputs(scenario.inputs);
      validation.textContent = "";
      renderPresets();
    });
    presets.append(button);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function humanDecision(value) {
  return value.replaceAll("_", " ");
}

function renderResult(evaluation, receipt, receiptValid) {
  const riskItems = evaluation.risks.length
    ? evaluation.risks.map((risk) => `<li>${escapeHtml(humanDecision(risk))}</li>`).join("")
    : "<li>No exception risk triggered in this clean synthetic path.</li>";

  const reasonItems = evaluation.reasons
    .map((reason) => `<li>${escapeHtml(reason)}</li>`)
    .join("");

  const trace = evaluation.steps
    .map(
      (step) => `
        <div class="trace-step">
          <strong>${escapeHtml(step.stage.toUpperCase())}</strong>
          <span class="state ${escapeHtml(step.status)}">${escapeHtml(step.status)}</span>
          <span>${escapeHtml(step.evidence)}</span>
        </div>`,
    )
    .join("");

  const ledgerRows = evaluation.ledger
    .map(
      (entry) => `<tr><td>${escapeHtml(entry.at)}</td><td>${escapeHtml(entry.event)}</td><td>${escapeHtml(entry.detail)}</td></tr>`,
    )
    .join("");

  const prettyReceipt = escapeHtml(JSON.stringify(receipt, null, 2));

  resultPanel.innerHTML = `
    <div class="result-head">
      <div>
        <div class="decision-label">DECISION</div>
        <h3 class="decision-value">${escapeHtml(humanDecision(evaluation.decision))}</h3>
        <div class="trace-id">${escapeHtml(evaluation.trace_id)}</div>
      </div>
      <span class="receipt-badge">${receiptValid ? "RECEIPT VERIFIED" : "RECEIPT INVALID"}</span>
    </div>
    <div class="impact"><b>Next safe action</b>${escapeHtml(evaluation.next_action)}</div>
    <div class="trace-list">${trace}</div>
    <div class="compare">
      <div><h4>Naive reaction</h4><p>${escapeHtml(evaluation.naive)}</p></div>
      <div class="guarded"><h4>Guarded reaction</h4><p>${escapeHtml(evaluation.guarded)}</p></div>
    </div>
    <div class="details-grid">
      <div class="detail-card"><h4>Why</h4><ul>${reasonItems}</ul></div>
      <div class="detail-card"><h4>Risks prevented</h4><ul>${riskItems}</ul></div>
    </div>
    <details class="receipt">
      <summary>Inspect synthetic event ledger</summary>
      <div class="ledger-wrap">
        <table class="ledger-table">
          <thead><tr><th>Time</th><th>Event</th><th>Evidence</th></tr></thead>
          <tbody>${ledgerRows}</tbody>
        </table>
      </div>
    </details>
    <details class="receipt">
      <summary>Inspect deterministic proof receipt</summary>
      <pre>${prettyReceipt}</pre>
    </details>
  `;
}

async function run(inputs, scenarioId = "custom") {
  validation.textContent = "";
  try {
    const evaluation = await evaluateTransaction(inputs, { scenario_id: scenarioId });
    const receipt = await createProofReceipt(inputs, evaluation);
    const receiptValid = await verifyProofReceipt(receipt);
    renderResult(evaluation, receipt, receiptValid);
    return { evaluation, receipt };
  } catch (error) {
    resultPanel.innerHTML = `
      <div class="empty-state">
        <p class="eyebrow">FAIL CLOSED</p>
        <h3>Invalid synthetic state.</h3>
        <p>The lab refused to guess. Adjust the inputs and evaluate again.</p>
      </div>`;
    validation.textContent =
      error instanceof SyntheticInputError
        ? `${error.code}: ${error.message}`
        : "PUBLIC_DEMO_ERROR: The synthetic evaluation could not be completed.";
    return null;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  selectedScenario = "custom";
  renderPresets();
  await run(readInputs(), "custom");
});

resetButton.addEventListener("click", () => {
  selectedScenario = "clean";
  setInputs(SCENARIOS.clean.inputs);
  renderPresets();
  validation.textContent = "";
  resultPanel.innerHTML = `
    <div class="empty-state">
      <p class="eyebrow">READY</p>
      <h3>Run a failure path.</h3>
      <p>The lab will return a decision, six-stage trace, event ledger, reasons, risks prevented and a deterministic proof receipt.</p>
    </div>`;
});

guidedButton.addEventListener("click", async () => {
  selectedScenario = "timeoutPaid";
  setInputs(SCENARIOS.timeoutPaid.inputs);
  renderPresets();
  await run(SCENARIOS.timeoutPaid.inputs, SCENARIOS.timeoutPaid.id);
  document.querySelector("#lab").scrollIntoView({ behavior: "smooth", block: "start" });
});

setInputs(SCENARIOS.clean.inputs);
renderPresets();