# Proof model

The public proof has one job: make **behavioral reasoning inspectable**.

## Deterministic receipt

Each run returns a receipt containing:

- proof version;
- synthetic scenario identity;
- deterministic trace identity;
- normalized synthetic inputs;
- decision;
- next safe action;
- risks prevented;
- six-stage evidence summary;
- SHA-256 receipt hash.

The receipt hash proves only that the public simulator produced a deterministic input/output record. It is **not** proof that a private production runtime executed the transaction.

## Verification

`verifyProofReceipt()` removes the hash field, canonicalizes the remaining receipt and recomputes SHA-256.

A modified receipt fails verification.

## Evidence hierarchy

1. public test result / deterministic receipt;
2. public source semantics;
3. documented illustrative interpretation;
4. private claims only when separately supported.

Marketing copy never outranks executable evidence.
