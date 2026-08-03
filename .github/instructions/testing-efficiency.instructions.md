---
name: Testing Token Efficiency
description: Optimize Copilot behavior for test and verification tasks
applyTo: "**/*.{test,spec}.{ts,tsx,js,jsx,mts,cts}"
---
# Testing token efficiency rules

- Start with targeted tests for the changed module before running workspace-wide suites.
- Use the smallest command that can validate the requested change.
- Only broaden test scope when a targeted test fails due to cross-module impact.
- Report only failing assertions, stack frames, and commands needed for diagnosis.
- Avoid re-running unchanged passing suites.
- Do not refactor unrelated production code while fixing tests unless explicitly requested.
