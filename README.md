# Agent Cash Cow OS

**Transaction reliability and outcome-gated settlement for AI agents — public synthetic proof surface.**

> **What if an AI agent pays — and the response times out?**

The payment may have succeeded even when the acknowledgement did not. A naive retry can create a second economic action.

**Agent Cash Cow OS explores a different operating rule: verify reality first, then act.**

[**Try the live Transaction Lab →**](https://www.sarmadtawfeek.com/agent-cash-cow)

[![Verify public proof](https://github.com/SamCT86/agent-cash-cow-os/actions/workflows/verify-public-proof.yml/badge.svg)](https://github.com/SamCT86/agent-cash-cow-os/actions/workflows/verify-public-proof.yml)

---

## The 15-second failure

| Step | What happens | Naive system | Guarded system |
|---|---|---|---|
| 1 | An agent submits a payment | — | — |
| 2 | The acknowledgement times out | “Payment failed.” | “State is ambiguous.” |
| 3 | The provider says **paid** | Ignore it / retry | Read it before acting |
| 4 | Another payment is considered | **Pay again** | **Block the duplicate** |

That is the core idea this repository makes inspectable.

This repository contains a **synthetic public demonstrator**, not the private production implementation. It uses no real money, provider credentials, customer data, private runtime source, or production payment adapters.

## Verify the idea in 60 seconds

1. Run **Timeout after payment** — the provider says paid, so a second payment is not allowed.
2. Run **Duplicate replay** — the synthetic replay resolves to the same original trace identity.
3. Run **Unknown provider state** — the system holds instead of guessing.
4. Open the proof receipt and verify its deterministic hash.

Then break the inputs yourself.

## Break it yourself

The Transaction Lab lets you change:

- authorization: valid / expired;
- payment acknowledgement: confirmed / timeout;
- provider readback: paid / unpaid / unknown;
- duplicate replay: yes / no;
- outcome evidence: verified / incomplete / failed.

Each run returns:

- a decision;
- the next safe action;
- a six-stage trace;
- an event ledger;
- reasons and risks prevented;
- a deterministic proof receipt.

### Example

```text
PAYMENT ACK       timeout
PROVIDER READBACK paid

NAIVE             retry payment
GUARDED           do not retry

PAYMENT ACTION    DO NOT RETRY
FINAL DECISION    SETTLE ONCE
ECONOMIC ACTIONS  1
```

## Public architecture

```mermaid
flowchart LR
    R[Request] --> A{Authorization}
    A -->|expired| X[Stop before spend]
    A -->|valid| P{Payment state}
    P -->|confirmed| W[Work]
    P -->|timeout| Q[Provider readback]
    Q -->|paid| W
    Q -->|unpaid| B[One bounded retry]
    Q -->|unknown| H[Hold · do not guess]
    W --> O{Outcome evidence}
    O -->|verified| S[Settle once]
    O -->|incomplete / failed| J[Hold settlement]
    R -->|duplicate fingerprint| D[Reject replay · continue original trace]
```

The diagram is a **public abstraction**. It intentionally does not disclose private orchestration, persistence, recovery, provider adapters, authorization policy, model routing, forecast systems, or product-specific economic logic.

## What is actually verifiable here?

| Evidence class | Meaning |
|---|---|
| **VERIFIED HERE** | Deterministic simulator behavior, traces, receipt hashes, failure scenarios, public CI. |
| **ILLUSTRATIVE** | Synthetic transaction/business scenarios. |
| **PRIVATE / NOT DISTRIBUTED** | Production implementation and proprietary runtime mechanisms. |
| **NOT YET PROVEN** | Market demand, production-scale economics, forecast advantage, generalized production readiness. |

The useful part is not “trust our architecture slide.”  
The useful part is: **run a failure, inspect why the decision changed, verify the receipt, and run the tests yourself.**

## Verify it from GitHub

No dependencies or secrets are required.

```bash
node --test tests/*.test.mjs
node scripts/verify-public-proof.mjs
```

The verifier checks deterministic scenarios, receipt integrity, security/IP boundaries, claim language and zero-network demo constraints.

## Why a proof repo instead of the product source?

Because public proof and proprietary implementation have different jobs.

This repository is deliberately safe to inspect and fork for evaluation. The private core remains private by architecture, not by minification or obscurity.

**Public:** behavioral model, trace semantics, synthetic failure handling, proof receipts, tests.  
**Private:** runtime/orchestration, provider adapters, credentials, persistence/recovery, exact policies, private evaluation/forecast systems and real-money execution paths.

See [Claims & boundaries](docs/claims-and-boundaries.md) and [Threat model](docs/threat-model.md).

## Technical diligence

- [Architecture](docs/architecture.md)
- [Proof model](docs/proof-model.md)
- [Threat model](docs/threat-model.md)
- [Claims & boundaries](docs/claims-and-boundaries.md)
- [Partner diligence](docs/partner-diligence.md)
- [Security policy](SECURITY.md)
- [Forecast Evidence reference](https://github.com/SamCT86/agent-forecast-foundry-case-study) — separate bounded proof of evidence/runtime discipline for autonomous-agent runs.

## For potential partners

If your interest is transaction reliability, agent commerce, payment-state reconciliation, exact-once economic actions, or outcome-gated settlement, start with the [partner diligence note](docs/partner-diligence.md).

Then break the lab.

The strongest next conversation is not “what features do you have?” It is:

> **Which economic failure do you need an autonomous system to survive without guessing?**

---

**Public proof surface · synthetic data only · no real money**

Portfolio: [sarmadtawfeek.com/agent-cash-cow](https://sarmadtawfeek.com/agent-cash-cow)
