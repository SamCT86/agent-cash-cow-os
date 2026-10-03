## Change contract

Describe the smallest intended public-proof change and why it is needed.

### Boundary checklist

- [ ] No private Agent Cash Cow OS implementation or private-repository dependency is added.
- [ ] No credentials, secrets, customer data, production provider endpoints, or real payment path is added.
- [ ] Synthetic scenarios remain clearly labeled.
- [ ] Public claims remain inside the evidence supported by this repository.
- [ ] GitHub Pages deployment is not implicitly enabled by this PR.
- [ ] `node --test tests/*.test.mjs` passes.
- [ ] `node scripts/verify-public-proof.mjs` passes.

### Non-delta

State explicitly what this PR does **not** change, especially runtime, deployment, provider, payment, visibility, or private-core behavior.
