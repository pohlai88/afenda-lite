# Master-Data Capability Boundaries

This directory documents the conceptual capability groups inside `@afenda/master-data`. It does not create new package boundaries, import surfaces, or ownership splits.

`@afenda/master-data` remains one coherent master-data authority: platform references, organization-scoped masters, extensions, lifecycle rules, data-governance workflows, and integration projections are coupled by shared identity, authorization, lifecycle, audit, event, and search contracts.

## Capability Groups


| Capability group          | Responsibility                                                                                                      | Directory                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Platform references       | Read helpers for countries, currencies, languages, time zones, UoM dimensions, and UoMs                             | [platform-references](./platform-references/README.md)              |
| Core organization masters | Dimensions, parties, item groups, items, warehouses, payment terms, tax registrations, templates, and variants      | [core-organization-masters](./core-organization-masters/README.md)  |
| Extensions                | Roles, addresses, contacts, external IDs, relationships, UoM conversions, barcodes, aliases, and variant attributes | [extensions](./extensions/README.md)                                |
| Lifecycle governance      | Draft, activation, suspension, archival, merge, and version-CAS transitions                                         | [lifecycle-governance](./lifecycle-governance/README.md)            |
| Data-governance workflows | Change requests, imports, approvals, duplicate warnings, and merge authorization                                    | [data-governance-workflows](./data-governance-workflows/README.md)  |
| Integration projections   | Audit facts, domain events, outbox behavior, and search indexing                                                    | [integration-projections](./integration-projections/README.md)      |




## Boundary Rules

- Do not split these groups into separate packages. They form one Authority B master-data package.
- Do not dual-write `md_*` tables from `apps/web` or transactional ERP packages.
- Do not add org-scoped UoM masters. UoM remains platform reference data; item packaging conversions live as item extensions.
- Do not make these folders a second public API. Public imports still go through `package.json#exports` and the root barrel or declared subpaths.
- Keep table schema ownership in `@afenda/db`; this package owns domain behavior and mutation authority.
