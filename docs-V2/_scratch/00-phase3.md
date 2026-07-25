# Phase 3 — Mutation-emission registry and event catalog

**Status:** closed when [`00.hrm.md`](00.hrm.md) Phase 3 exit table is **DONE**.

## Authority

| Surface | Role |
|---|---|
| [`00.hrm.md`](00.hrm.md) | Program SSOT · Phase 3 exit table · slice status |
| [`HR-AUD-06-COMPENSATION-PERFORMANCE-LEARNING.md`](erp/human-resources-enterprise-audit/HR-AUD-06-COMPENSATION-PERFORMANCE-LEARNING.md) | Classification matrices for compensation · performance · learning · privacy |
| `@afenda/human-resources` emission registry | `src/emissions/` · `src/event-catalog/` |
| `@afenda/events` | HR domain-event schemas |

## Exit criteria (7)

See [`00.hrm.md` § Phase 3 exit criteria](00.hrm.md).

## Verify

```bash
pnpm --filter @afenda/human-resources test -- registry-ci-gate emission-registry event-catalog correlation-integrity slice-36
pnpm --filter @afenda/events test
pnpm --filter @afenda/human-resources typecheck
```
