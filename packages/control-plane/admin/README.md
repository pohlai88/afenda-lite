# `@afenda/admin`

Canonical organization-administration, platform RBAC-audit, role-assignment transaction, health, and organization-usage capabilities for Afenda-Lite.

## Organization administration

```ts
import { admin } from "@afenda/admin";

const organizations = await admin.organizations.list();
const usage = await admin.usage.get({ orgId, period: "2026-08" });
const parsed = admin.schemas.organizations.provisionInput.safeParse(input);
```

The root capability loads the authenticated Neon organization context through `@afenda/auth`. Usage belongs here because it also requires that context; there is no `./usage` entrypoint.

## RBAC audit

```ts
import { rbacAudit } from "@afenda/admin/audit";

await rbacAudit.record({
  orgId,
  actorUserId,
  correlationId,
  action: rbacAudit.actions.memberInvite,
});

await rbacAudit.roles.assign(command);
```

`./audit` is isolated from the Neon Auth client. It owns `platform_rbac_audit`, including atomic role assignment/revocation plus audit insertion. Consumers cannot construct RBAC audit SQL or query its table directly.

General activity audit remains separate:

- RBAC changes and invitations → `rbacAudit` → `platform_rbac_audit`.
- Organization deletion and business activity → `@afenda/audit` → `platform_audit_log`.

## Operational health

```ts
import { adminHealth } from "@afenda/admin/health";

const live = adminHealth.liveness();
const ready = await adminHealth.readiness();
```

`./health` is isolated so readiness and liveness checks do not load the Neon Auth organization client.

## Ownership

| Concern | Owner |
|---|---|
| Organization administration and usage | Root `admin` capability |
| Platform roles and RBAC audit semantics | `rbacAudit` |
| General domain activity audit | `@afenda/audit` |
| Liveness and readiness | `adminHealth` |
| Sessions, organization binding and Neon normalization | `@afenda/auth` |
| Structural database schema | `@afenda/db` |

## Maintain

```bash
pnpm --filter @afenda/admin lint
pnpm --filter @afenda/admin typecheck
pnpm --filter @afenda/admin typecheck:contract
pnpm --filter @afenda/admin test
pnpm check:admin-boundary
pnpm test:admin-boundary
```

See [CONTRACT.md](./CONTRACT.md).
