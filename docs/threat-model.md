# Public proof threat model

## Security objective

A visitor — including a competitor — should be able to copy the entire public repository and obtain **only the intended synthetic proof layer**.

The security boundary therefore depends on architectural non-disclosure, not obfuscation.

## Threats

| Threat | Control |
|---|---|
| Private code copied into public repo | Separate repository + boundary tests + manual diff review |
| Credential leakage | Secret-pattern tests + zero-secret design |
| Hidden private API dependency | Simulator network-primitive scan |
| Real economic side effect | No provider/payment integration in public code |
| Customer-data leakage | Fixed synthetic scenarios only |
| Overclaiming production proof | Claim-language tests + explicit evidence classes |
| Supply-chain execution from demo | Zero runtime third-party JS dependencies |
| Privileged PR workflow abuse | No secrets; no `pull_request_target`; verification uses read-only token |
| Demo exception leaks internals | Neutral fail-closed browser error |

## Trust boundary

The proof repository is untrusted/public by design. Nothing inside it is needed by the private runtime.

There is no public-to-private call path.
