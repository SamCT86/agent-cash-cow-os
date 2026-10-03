# Security policy

## Scope

This repository is intentionally a **synthetic public proof surface**.

It must never contain:

- real credentials or secret material;
- private source or private build artifacts;
- customer data;
- real payment execution;
- private provider endpoints/adapters;
- production persistence/recovery implementation;
- private system prompts or model-routing logic.

The browser demo is designed to make **zero runtime network calls**. Its only inputs are local synthetic controls.

## Reporting

If you find secret material, private implementation leakage, an unexpected network path, a claim that appears stronger than the evidence, or a security flaw in the public proof, please open a minimal GitHub issue without posting sensitive material.

For sensitive disclosure, contact the repository owner privately through the contact route listed at [sarmadtawfeek.com](https://sarmadtawfeek.com).

## What not to do

Do not test this demo against real payment systems, real credentials, real customer data or third-party systems. The repository does not authorize such activity.
