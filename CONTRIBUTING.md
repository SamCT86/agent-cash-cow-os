# Contributing

This repository is a bounded public proof surface, not the private Agent Cash Cow OS product.

Small improvements to accessibility, documentation, deterministic tests, synthetic scenarios and proof clarity are welcome.

Contributions must preserve these invariants:

1. no private implementation or private-repository dependency;
2. no secrets or provider credentials;
3. no real payment/provider calls;
4. no customer data;
5. no runtime network access from the simulator;
6. synthetic scenarios remain clearly labeled;
7. claims remain inside the evidence boundary;
8. no change may imply that this repository is the production implementation.

Run before opening a pull request:

```bash
node --test tests/*.test.mjs
node scripts/verify-public-proof.mjs
```
