# Payroll Cursor Agent Pack

A repository-ready guidance pack for implementing `@afenda/payroll` as an independent ERP bounded context.

## Install

Copy these folders into the repository root:

```text
.cursor/
docs/payroll/
.cursorignore.example
```

Review and rename `.cursorignore.example` to `.cursorignore` after merging it with the repository's existing ignore rules.

## Recommended workflow

1. Open Cursor Plan Mode.
2. Run Prompt 00 from `docs/payroll/PROMPT_RUNBOOK.md`.
3. Review the repository alignment report before any code is written.
4. Build the walking skeleton in small commits.
5. Run the read-only payroll verifier after every phase.
6. Never provide real employee, salary, bank, tax, or payslip data to an AI agent. Use synthetic fixtures only.

## Core principle

The AI agent may accelerate implementation, but package boundaries, payroll invariants, statutory correctness, security review, and final approval remain human-owned decisions.
