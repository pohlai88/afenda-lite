# Platform References

## Responsibility

This capability group owns the ERP-facing read contract for platform reference data used by master-data commands and queries:

- countries
- currencies
- languages
- time zones
- UoM dimensions
- UoMs

Reference rows are platform-owned. `@afenda/db` owns the physical schemas. Platform administration owns seeding, correction, activation, and retirement. Organization callers may read reference rows through package helpers, but they have no reference mutation authority through `@afenda/master-data`.

Keep this capability intentionally small. Do not add a generic `getReference` or `listReferences` resolver; each reference family keeps its own typed IDs, code normalization, and query shape.

## Boundaries

- UoM is platform-only: `ref_uom_dimension` -> `ref_uom`.
- `md_item.base_uom_id` references `ref_uom`.
- Item packaging conversions belong to item extensions, not to a separate org-scoped UoM master.
- There is no `md_uom` capability in `@afenda/master-data`.
- Normal lookup and command validation are separate. Historical reads may resolve inactive rows; new master mutations must use active-reference policies.
- List queries return active rows by default and include inactive rows only when explicitly requested.
- UoM dimension list queries expose search and pagination only; dimensions do not carry an `active` flag in `ref_uom_dimension`.
- Reference reads are pure reads: no audit facts, domain events, outbox writes, or mutation transaction wrappers.
- Time-zone codes preserve canonical IANA casing. Do not normalize `Asia/Kuala_Lumpur` into uppercase.
- Item UoM conversion direction is `1 alternate UoM = conversionFactor x base UoM`.
- UoM compatibility is not unrestricted. Same-dimension conversions are allowed; packaging/count conversions require explicit item-governed approval.

## Source Layout

| File | Responsibility |
| --- | --- |
| `index.ts` | Capability-local export surface |
| `brands.ts` | Semantic IDs for each reference family |
| `types.ts` | Platform-reference domain types and UoM compatibility policy types |
| `schemas.ts` | Family-specific code normalization and query/list input schemas |
| `store.ts` | Read-only `PlatformReferenceStore` contract |
| `queries.ts` | Injected organization-neutral query capabilities: parse input, call store, return `Result` |
| `authorized-queries.ts` | Permanent organization-authorized `getRef*` / `listRefUoms` consumer facade |
| `policies.ts` | Active-reference and UoM compatibility policies for commands |
| `reference-errors.ts` | Reference-specific failure reasons carried in `Result.details` |
| `adapters/memory/*` | Deterministic test/reference implementation |
| `adapters/drizzle/*` | Production persistence implementation with explicit column projections |

## Public Operation Shape

The organization-neutral read contract uses explicit family operations:

- `readRefCountry`, `readRefCountryByCode`, `readRefCountries`
- `readRefCurrency`, `readRefCurrencyByCode`, `readRefCurrencies`
- `readRefLanguage`, `readRefLanguageByCode`, `readRefLanguages`
- `readRefTimeZone`, `readRefTimeZoneByCode`, `readRefTimeZones`
- `readRefUomDimension`, `readRefUomDimensionByCode`, `readRefUomDimensions`
- `readRefUom`, `readRefUomByCode`, `readRefUoms`, `readRefUomsByDimension`

The permission-aware root operations are the permanent application facade. They retain the established `getRef*` and `listRefUoms` names and enforce `master_data.reference_read` before reaching the store.

The root package barrel exposes domain helpers and retains the established permission-aware query names. It does not expose stores, adapters, raw Drizzle tables, `db`, query builders, or reference mutation commands. Production adapter construction remains under `@afenda/master-data/adapters/drizzle`.

## Compatibility Surface

- Root domain barrel: `../../index.ts`
- Root brand compatibility: `../../brands.ts`
- Root type compatibility: `../../types.ts`
- Production adapter subpath: `../../adapters/drizzle.ts`
