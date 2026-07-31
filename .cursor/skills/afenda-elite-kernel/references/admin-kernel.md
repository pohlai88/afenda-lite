# `@afenda/admin` kernel

## Identity

| Field | Contract |
|---|---|
| Package | `@afenda/admin` |
| Target | `packages/control-plane/admin` |
| Kind | Control-plane administration kernel with isolated DB-only and health projections |
| Root facade | package-root `admin` |
| RBAC-audit facade | `@afenda/admin/audit` `rbacAudit` |
| Health facade | `@afenda/admin/health` `adminHealth` |

## Ownership

Admin owns organization administration, organization-scoped usage policy, platform RBAC-audit vocabulary and persistence, atomic role-assignment/audit transactions, and platform health aggregation. Auth owns sessions, organization binding, membership-role interpretation, and Neon Auth normalization. DB owns schemas and database execution. Env owns configuration. Errors owns failure semantics.

General activity audit remains owned by `@afenda/audit` and persisted to `platform_audit_log`. Admin's RBAC audit is a security-specific record persisted to `platform_rbac_audit`. Neither facade may impersonate or duplicate the other.

## Cutover rules

- Stabilize auth, DB, env, and errors before admin; authorize exactly those workspace dependencies.
- Expose one root `admin` capability for organization and usage operations.
- Keep `./audit` isolated because RBAC audit and atomic role changes require DB but must not load the Neon Auth client.
- Keep `./health` isolated because liveness/readiness probes must not load authentication or organization administration.
- Do not create a `./usage` subpath: usage shares the authenticated organization context and belongs on `admin.usage`.
- Keep assign/reactivate/revoke and the corresponding RBAC-audit insert in one admin-owned database transaction.
- Prohibit consumers from importing `platformRbacAudit`, constructing RBAC audit rows, or duplicating role-assignment SQL.
- Keep application identity modules as composition adapters; they may emit domain events after the admin transaction but cannot reinterpret RBAC-audit policy.
- Return canonical results and fail closed on audit-read failure; an infrastructure failure must not appear as an empty audit history.
- Delete standalone runtime exports and superseded subpaths in the same final cutover.
- Mutation-test exports, dependency allowlist, vendor isolation, direct table/SQL leakage, and general-audit/RBAC-audit separation.

## Verification

```bash
pnpm --filter @afenda/admin lint
pnpm --filter @afenda/admin typecheck
pnpm --filter @afenda/admin typecheck:contract
pnpm --filter @afenda/admin test
pnpm check:admin-boundary
pnpm test:admin-boundary
pnpm --filter @afenda/web typecheck
```

At seal, record the root and isolated surfaces, exact dependency allowlist, atomic role/audit evidence, general-audit separation, consumer cutover count, boundary mutations, focused application tests, digest, and dirty-worktree posture.
