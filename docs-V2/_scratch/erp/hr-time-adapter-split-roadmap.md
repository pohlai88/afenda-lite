# HR time adapter split roadmap

Scratch ops pack for incremental decomposition of megaf adapter files that dominate `@afenda/human-resources` typecheck and editor cost.

| File | ~lines (2026-07) | Target shape |
|------|------------------|----------------|
| [`src/adapters/drizzle/time.ts`](../packages/erp/human-resources/src/adapters/drizzle/time.ts) | 7277 | `adapters/drizzle/time/{calendar,attendance,timesheet,policy,scheduling,overtime}.ts` + thin `index.ts` re-export |
| [`src/adapters/memory/time.ts`](../packages/erp/human-resources/src/adapters/memory/time.ts) | 4601 | Mirror drizzle layout under `adapters/memory/time/` |
| [`src/types.ts`](../packages/erp/human-resources/src/types.ts) | 2631 | Domain-scoped type modules under `src/types/` (re-export barrel at `types.ts` until cutover complete) |
| [`src/brands.ts`](../packages/erp/human-resources/src/brands.ts) | 2158 | Split by subdomain; keep `./brands` export surface stable |

## Rules

1. **One subdomain per slice** — match existing folders under [`src/time/`](../packages/erp/human-resources/src/time/).
2. **No public API break** — package `exports` and adapter entrypoints stay stable; move implementation, keep re-exports.
3. **Pair memory + drizzle** — each drizzle extract gets a memory twin in the same slice PR.
4. **Verify per slice** — `pnpm check:hr` after each extract; full parity only before merge (`pnpm test:hr:parity` with `DATABASE_URL`).

## Suggested slice order

1. **Policy** — smallest cohesive surface (`src/time/policy.ts` already isolated).
2. **Calendar** — `calendar.ts`, `calendar-resolution.ts`, work-calendar lookup.
3. **Scheduling / shift** — `scheduling.ts`, `shift.ts`.
4. **Attendance** — largest subdomain; split import-keys, sessions, events, exceptions separately if needed.
5. **Timesheet + handoff** — `timesheet.ts`, `timesheet-generation.ts`, approved-time-handoff.
6. **Overtime** — `overtime.ts`.
7. **Types / brands** — after adapters stabilize; use `satisfies` + domain files to avoid churn.

## Done when

- No adapter file under `src/adapters/**/time*` exceeds ~1200 lines.
- `pnpm typecheck:hr` consistently under team budget on a warm machine.
- Inner loop (`pnpm check:hr`) remains the default HR edit verify path (see [`testing/README.md`](../../testing/README.md)).
