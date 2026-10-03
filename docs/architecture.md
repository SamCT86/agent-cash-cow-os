# Public architecture

This document describes the **public demonstrator architecture**, not the private production system.

## Six-stage control model

```mermaid
flowchart TD
  A[Request] --> B{Current authorization?}
  B -->|No| X[Stop before payment]
  B -->|Yes| C{Duplicate request?}
  C -->|Yes| Y[Continue original trace]
  C -->|No| D{Payment acknowledgement}
  D -->|Confirmed| E[Work bound to trace]
  D -->|Timeout| F{Provider readback}
  F -->|Paid| E
  F -->|Unpaid| G[One bounded retry eligible]
  F -->|Unknown| H[Hold · reconcile]
  E --> I{Outcome evidence}
  I -->|Verified| J[Settle once]
  I -->|Incomplete / failed| K[Hold settlement]
```

## Design properties demonstrated publicly

### One trace identity

Every synthetic run derives a deterministic trace identity from normalized inputs.

### Read before retry

A timeout is treated as ambiguity, not proof of failure.

### Replay containment

A duplicate request represents an existing trace and does not create a second synthetic payment/work/settlement.

### Outcome-gated settlement

The work stage finishing is not sufficient evidence of an accepted result.

## What is intentionally absent

The public model does not expose private orchestration, storage schema, provider adapters, production retry/backoff rules, authorization implementation, forecasting/evaluation internals, model routing or real-money settlement.
