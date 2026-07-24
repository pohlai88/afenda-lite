# Payroll testing requirements

For every behavioral change:

- Add or update tests in the repository's established test location and framework.
- Prefer unit tests for pure calculations and state transitions, contract tests for stores/ports, integration tests for database constraints and transactions, and end-to-end tests for the walking skeleton.
- Use synthetic employees and synthetic payroll amounts only.
- Add boundary tests for effective dates, period cutoffs, negative inputs, zero values, maximum supported precision, rounding ties, duplicate commands, and concurrent finalization.
- Add golden calculation fixtures with human-readable expected line items and totals.
- Verify accounting identities such as `gross - employee deductions - employee tax/contributions = net`, subject to the configured line taxonomy.
- Verify employer contributions do not alter employee net pay.
- Verify the sum of employee payment instructions equals the finalized run's payable total.
- Verify every finalized run writes all required outbox events in the same transaction exactly once.
- Verify failed finalization writes neither partial final records nor partial events.
- Verify organization isolation in repository tests.
- Verify finalized data cannot be edited through commands or stores.
- Do not weaken assertions, skip tests, or update golden outputs merely to make a failing implementation pass. Explain intentional calculation changes in the commit and [decision-log.md](decision-log.md) entry.
- Before declaring a phase complete, run the package typecheck, unit tests, integration tests, lint, and the repository's architecture-boundary checks.

Exit gate per phase: invoke [payroll-verifier](../../agents/payroll-verifier.md) before merge.

See also: [workflow.md](workflow.md) · [implementation.md](implementation.md)
