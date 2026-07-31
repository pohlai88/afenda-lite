# `@afenda/audit` kernel contract

`packages/data-plane/audit` is the canonical semantic owner for general domain activity audit stored in `platform_audit_log`. Runtime consumers use only the frozen `audit` facade from `@afenda/audit`; structural TypeScript contracts remain named root exports.

## Permanent capability

- `audit.recorder` and `audit.store` own validated persistence composition.
- `audit.read`, `audit.export`, and `audit.retention` own organization-scoped retrieval, bounded output, and purge policy.
- `audit.transaction` owns command validation, sensitive-value masking, event-context serialization, and fixed audit-column preparation for atomic domain transactions.
- `audit.schemas`, `audit.vocabulary`, `audit.limits`, `audit.data`, `audit.cursor`, and `audit.telemetry` are projections of package-owned definitions.

## Transaction boundary

Domain packages retain their mutation-specific CTE guards because those guards decide whether a business mutation occurred. They may bind only values produced through `audit.transaction.prepare`, `prepareDerived`, or `buildInsert`; they must not define a second audit vocabulary, masking policy, metadata envelope, payload bound, or public persistence API.

`@afenda/audit` remains the sole semantic writer. `@afenda/admin/audit` separately owns privileged IAM audit in `platform_rbac_audit`.

## Deleted surfaces

Independent recorder/store factories, query/export/purge functions, cursor/diff/masking helpers, transaction builders, runtime constants, schemas, and `DrizzleAuditStore` are not root exports. No implementation subpath is published.

`pnpm check:audit-boundary` rejects deleted runtime imports, subpaths, and unprepared audit-table writes. The package direct-writer contract additionally proves exact preparation parity for every governed CTE writer.
