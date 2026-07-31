# `@afenda/audit` kernel

Use this reference when changing `packages/data-plane/audit` or a consumer of general domain activity audit.

## Authority and permanent surface

| Field | Contract |
|-------|----------|
| Package | `@afenda/audit` |
| Target | `packages/data-plane/audit` |
| Layer | Rank-1 data plane |
| Runtime facade | `audit` from `@afenda/audit` |
| Structural declarations | Root type-only command, entry, store, recorder, query, export, telemetry, and prepared-transaction contracts |
| Persistence owner | `platform_audit_log` general activity |
| Excluded owner | `@afenda/admin/audit` owns `platform_rbac_audit` |

## Invariants

1. Runtime consumers call the frozen `audit` facade. Do not retain named runtime functions or export implementation classes.
2. Validate unknown commands, mask sensitive keys, bound JSON, compute changes, and serialize versioned event context before every persistence path.
3. Require organization, actor, and correlation attribution per call; never derive them from process-global state.
4. Keep every read, export, count, and purge organization-scoped and keep export completeness explicit through truncation and continuation evidence.
5. Telemetry may expose operation, outcome, duration, error code, row count, and truncation only; never tenant, actor, correlation, entity, or payload data.
6. Domain packages retain mutation-specific CTE guards but bind only canonical prepared audit values. A business guard is domain context, not permission to redefine audit vocabulary, masking, metadata, limits, or persistence APIs.
7. Direct `platform_audit_log` SQL is accepted only for governed atomic CTE writers whose preparation parity is enforced by the audit package and repository boundary checks.
8. Keep schema and hard-tenant ownership in `@afenda/db`; do not create audit DDL or another tenancy model here.
9. No subpaths, compatibility wrappers, RBAC audit, Next.js, HTTP envelopes, or process-global recorder singleton.

## Cutover method

1. Inventory runtime imports, structural type imports, recorder/store construction, transaction preparation, raw audit-table writers, source assertions, and mocks.
2. Freeze `audit` as the sole runtime facade and retain only required type exports.
3. Apply a symbol-bound consumer codemod; update module mocks and source-evidence tests to the capability call shape.
4. Delete all named runtime exports in the same mission.
5. Enforce no subpaths, no deleted runtime imports, no unprepared audit-table writes, and exact preparation parity for governed CTE writers.
6. Verify audit package behavior, root compiler surface, affected consumer graph, and focused web/ERP contracts.

## Verification

```bash
node .cursor/skills/afenda-elite-kernel/scripts/inspect-target.mjs packages/data-plane/audit
pnpm --filter @afenda/audit lint
pnpm --filter @afenda/audit typecheck
pnpm --filter @afenda/audit test
pnpm check:audit-boundary
pnpm test:audit-boundary
pnpm typecheck:root
pnpm exec turbo run typecheck --filter="...@afenda/audit" --concurrency=4
```

Run module schema-ownership governance only when the mission changes schema, migrations, manifests, or ownership records. Runtime-facade cutovers do not inherit unrelated module-register failures.
