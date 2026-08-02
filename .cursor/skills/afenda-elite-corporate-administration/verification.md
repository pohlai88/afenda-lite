# Corporate Administration — verification

Companion for [SKILL.md](SKILL.md). Requirement acceptance is recorded in `packages/erp/corporate-administration/PRD.md`.

## Fourteen-boundary matrix

Report all 14 rows at phase close. Phase complete only at 14/14 `DONE` (or explicit `NOT_APPLICABLE`).

| # | Boundary |
|---:|---|
| 1 | Authority and ownership |
| 2 | Catalog and dependency governance |
| 3 | Public package contracts |
| 4 | Reference and peer boundaries |
| 5 | Schema and migrations |
| 6 | Tenancy and data isolation |
| 7 | Authorization, approvals and SoD |
| 8 | Domain behavior and historical truth |
| 9 | Idempotency, concurrency and atomicity |
| 10 | Events, audit and privacy |
| 11 | Adapter parity and database semantics |
| 12 | App composition and Server Actions |
| 13 | UI, journeys and accessibility |
| 14 | Operations and production readiness |

Per-row status: `DONE` · `PARTIAL` · `GAP` · `BLOCKED` · `NOT_APPLICABLE`.

## Verify lanes

### Package (every slice touching `@afenda/corporate-administration`)

```powershell
pnpm --filter @afenda/corporate-administration lint
pnpm --filter @afenda/corporate-administration typecheck
pnpm --filter @afenda/corporate-administration test
pnpm --filter @afenda/corporate-administration check
```

### Schema / migration slices

```powershell
pnpm --filter @afenda/db db:migrate   # or repo-standard migrate command
# fresh-schema + upgrade tests per PRD.md rollout and recovery sections
pnpm audit:tenancy-nulls              # after new hard tenant roots
```

### Web / Actions / UI

```powershell
pnpm --filter @afenda/web lint
pnpm --filter @afenda/web typecheck
pnpm --filter @afenda/web test -- __tests__/corporate-administration*
pnpm --filter @afenda/web build
```

### Phase close / activation

```powershell
pnpm validate:modules --write
pnpm governance:packages
pnpm check:docs-trunk-ban
pnpm exec turbo run lint typecheck test
git diff --check
```

Use the repository's current generator command if `validate:modules --write` differs. Do not hand-edit generated outputs.

## Neon evidence format

When `DATABASE_URL` is available:

```text
command=<exact command>
environment=<branch/schema id — secrets redacted>
exit=<code>
passed=<n>
failed=<n>
skipped=<n>
duration=<observed>
```

No `DATABASE_URL` → lane status `BLOCKED`.

Required mutation scenarios (when a requirement group introduces writes): success path; failure before/after domain write; receipt/audit/outbox failures; rollback retry; idempotency replay vs fingerprint conflict; stale version; natural-key and effective-range races.

## Test evidence hierarchy

Prefer (in order):

1. Pure domain tests
2. Contract / schema tests
3. Adapter parity (memory vs Drizzle)
4. DB constraints + fresh migration
5. Neon transaction / failure / concurrency
6. Action tests
7. Interaction / a11y tests
8. Authenticated production-composition journey
9. Full governance gates
10. Performance / recovery / migration rehearsal (phase close)

Compile success alone is not behavioral evidence.

## Standard handoff (every requirement group)

```text
1. Verdict: COMPLETE | NOT COMPLETE | BLOCKED
2. Requirement group: <CA requirement IDs>
3. Product posture:
   - canonical requirement authority: packages/erp/corporate-administration/PRD.md
   - current disk baseline inspected: <files/commit/branch>
4. Working-tree baseline:
   - branch/commit:
   - pre-existing changed files:
5. Authority applied:
   - package ownership:
   - external boundaries:
   - high-risk approval rules:
6. Files changed by layer:
   - package contracts/domain
   - DB/schema/migration
   - events/governance
   - adapters/composition
   - Actions/UI
   - tests/evidence
7. Behavior delivered:
   - commands:
   - queries:
   - transitions/invariants:
   - user workflow:
8. Security, tenancy, history, idempotency, concurrency and atomicity evidence
9. Tests added:
   - file:
   - scenarios:
10. Verification:
   - <exact command> -> exit <code>; passed=<n>; failed=<n>; skipped=<n>
11. Fourteen-boundary matrix:
   - boundary | status | files | tests | command | exit | remaining gap
12. Migration impact:
13. Remaining gaps:
14. Next eligible requirement group: <IDs>; do not start it
```

Do not report `COMPLETE` when any required boundary is not `DONE`.

## Security scan (requirement-group close)

Scan command I/O, events, audit diffs, logs, search docs, exports, error metadata, UI props for forbidden leakage — government IDs, unrestricted PII, bank identity, document URLs/credentials, agreement body text, approval secrets, raw SQL/stack traces to users.
