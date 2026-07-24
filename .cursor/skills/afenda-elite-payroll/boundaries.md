# Payroll package boundaries

When changing `packages/erp/payroll/**`:

- Treat `@afenda/payroll` as an independent R1-F ERP bounded context.
- Payroll owns payroll setup, payroll-period inputs, gross-to-net calculations, statutory results, finalization, payslips, disbursement requests, posting requests, reversals, and reconciliation.
- Payroll must not mutate Human Resources, Payments, Payables, or Accounting tables.
- Never insert or update `hr_employee`, `hr_employment`, `hr_employee_compensation`, `payment`, `payment_allocation`, `journal`, or `journal_line`.
- Do not import peer ERP source files, stores, schemas, or database tables directly unless an explicitly approved registered edge already exists in the repository.
- Consume HR facts through a Payroll-owned port. The app composition root supplies the HR-backed adapter.
- Integrate with Payments and Accounting through versioned integration events written through the repository's canonical transactional outbox mechanism.
- Keep payment destination and bank-account ownership outside Payroll unless the repository has an explicit architecture decision stating otherwise.
- Events must contain the minimum data required by the consumer. Never place full payslip content, national identifiers, bank details, or sensitive tax data in integration events.
- Follow existing repository conventions before introducing a new dependency, abstraction, helper, error shape, event envelope, ID type, money type, date type, migration pattern, or test framework.
- Prefer a small vertical slice with passing tests over broad scaffolding with placeholder behavior.
- Do not leave TODO-only methods, fake production adapters, silent fallbacks, or catch-and-ignore error handling.

See also: [package-tree.md](package-tree.md) · [implementation.md](implementation.md)
