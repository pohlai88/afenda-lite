# `@afenda/admin` contract

## Semantic owners

`@afenda/admin` owns organization administration, organization usage policy, platform role-assignment transactions, and `platform_rbac_audit` semantics. General domain activity remains exclusively owned by `@afenda/audit` and `platform_audit_log`.

## Permanent consumer surfaces

- `admin` from the package root owns organization and usage capabilities.
- `rbacAudit` from `./audit` owns privileged-event vocabulary, role mutation plus audit atomicity, RBAC audit persistence, and queries.
- `adminHealth` from `./health` owns operational liveness/readiness projections.

The two subpaths are execution-isolation boundaries: audit and health do not load the Neon Auth organization client. `./usage` is deleted because usage requires the authenticated organization context and therefore has no independent loading boundary.

## Audit distinction

- RBAC changes and member invitations use `rbacAudit` and `platform_rbac_audit`.
- Organization deletion and business-domain activity use `@afenda/audit` and `platform_audit_log`.
- Consumers cannot insert, query, or interpret `platform_rbac_audit` directly.
- Role assignment/revocation and their RBAC audit row commit atomically inside `@afenda/admin`.

## Prohibited surfaces

- Standalone root operations or schema exports alongside `admin`.
- Direct `platform_rbac_audit` access outside `@afenda/admin` and structural `@afenda/db` ownership.
- `@afenda/admin/usage` or implementation subpaths.
- A second Neon Auth client or direct Neon Auth vendor imports.
- Treating general activity audit and RBAC audit as interchangeable.
