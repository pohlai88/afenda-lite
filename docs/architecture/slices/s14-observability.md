# S14 — Observability

| Field | Value |
|-------|-------|
| **Status** | shipped |
| **Sequence** | 15 |
| **Depends on** | S1 |
| **Feeds into** | Ops, incident response |

## Purpose

Correlation ID and structured logs on server actions.

## Inputs / outputs

- **Inputs:** `x-request-id` header or generated UUID per action invocation
- **Outputs:** JSON logs: `correlationId`, `action`, `userId`, `durationMs`, `outcome`

## Owned files (to create)

- `lib/observability.ts` — logger + action wrapper
- Apply wrapper in `app/actions/*.ts`

## Critical control points

- Every mutation action emits start/complete log with correlation ID
- No secrets or full answer payloads in logs

## Failure modes

- Log volume/cost on Vercel
- Missing correlation across multi-step flows

## Required tests

- Action logs include correlation ID
- Error path logs `outcome: error` without throwing away client message

## Acceptance proof

- [x] `runLoggedAction` on mutation server actions
- [x] JSON logs: `correlationId`, `action`, `userId`, `durationMs`, `outcome`
- [x] No answer payloads or secrets logged

## Do not

Replace readiness route; extend alongside S9.

## Open question

**Assumption:** Use `console.log` JSON lines compatible with Vercel log drain; no external APM in first iteration.
