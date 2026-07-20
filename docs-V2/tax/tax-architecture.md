# Tax architecture — registration master (Scratch SSOT)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/tax/tax-architecture.md` |
| Authority | **Scratch** — accepted for R4 gate (Q3) 2026-07-20 |
| Mode | Technical spec |
| Audience | Engineers implementing `md_tax_registration` |
| Parents | [../master-data/master-data-dna.md](../master-data/master-data-dna.md) §3.2 · §10 · §24 · [README.md](README.md) |

**Action this doc enables:** implement R4 without guessing columns; compile missions must cite this path.

---

## Goals

1. Define org-scoped tax **registration identity** attached to a party.
2. Support temporal validity (DNA §10) with non-overlapping active ranges per uniqueness key.
3. Keep tax **calculation**, filing, and rate engines out of `@afenda/master-data`.

## Non-goals

| Out | Why |
|-----|-----|
| Tax rates · VAT returns · withholding engines | Separate tax/finance domain |
| Employee / user tax IDs as `md_*` | Identity / HR boundary |
| Silent inheritance of tax onto item group | DNA §7.4 |
| Free-text JSON registration bag | Coding-discipline / DNA integrity |
| Living `docs/` invent | Docs-lane closed |

---

## Boundary

| In master-data (R4) | Outside master-data |
|---------------------|---------------------|
| `md_tax_registration` root (org + party FK) | Rate tables, tax codes engines, returns |
| Lifecycle + CAS + same-TX audit/outbox | SO/PO tax line computation |
| Lookups by party / jurisdiction / registration number | Filing calendars |

Party remains the trading identity. Registration is a **governed association**, not a second customer table.

---

## Entity: `md_tax_registration`

### Minimum fields (DNA §24 + tax-specific)

```text
id                          uuid PK
organization_id             text NOT NULL          -- hard tenant
party_id                    uuid NOT NULL          -- FK md_party (same org)
jurisdiction_country_id     uuid NOT NULL          -- FK ref_country
registration_type           text NOT NULL          -- closed catalog (below)
registration_number         text NOT NULL          -- authority-issued id
normalized_registration_number text NOT NULL     -- deterministic normalize for uniqueness
name                        text                   -- optional display label
status                      text NOT NULL          -- draft|active|blocked|retired (same matrix as payment term)
version                     integer NOT NULL
valid_from                  timestamptz            -- required when active
valid_to                    timestamptz            -- exclusive; null = open
created_at / created_by / updated_at / updated_by
activated_at / activated_by / blocked_at / blocked_by
retired_at / retired_by / deleted_at / deleted_by
```

No separate `code` required for v1 — natural key is registration identity. Optional org-local `code` may be added in a later mission if stewards need mnemonic keys; do not invent in R4 without mission letter.

### Closed catalog: `registration_type`

| Code | Meaning |
|------|---------|
| `vat_gst` | VAT / GST / similar consumption-tax registration |
| `tin` | Taxpayer identification number (general) |
| `ein_local` | Local employer / enterprise id when distinct from TIN |
| `other_gov` | Other government tax registration (document in audit payload) |

Extend the catalog only via explicit mission + seed; do not accept free strings in product commands.

### Uniqueness

Live (non-retired, non-deleted) rows must be unique on:

```text
(organization_id, party_id, jurisdiction_country_id, registration_type, normalized_registration_number)
```

Plus: for the same `(organization_id, party_id, jurisdiction_country_id, registration_type)`, **active** validity ranges must not overlap (`valid_to` exclusive).

### Tenancy

- Non-null `organization_id` on every row.
- `party_id` must resolve to `md_party` in the **same** organization.
- `jurisdiction_country_id` → platform `ref_country`.
- Register table in `hard-tenant-roots` + `audit-tenancy-nulls`.

### Lifecycle and concurrency

- Same status matrix and `expectedVersion` CAS as other org masters (copy payment-term / party).
- Activation requires `valid_from` set and non-overlapping range check.
- Soft-retire / soft-delete; never hard-delete referenced registrations.

### Events

Versioned outbox types (illustrative — exact names in `@afenda/events` catalog at implement):

```text
master_data.tax_registration.created.v1
master_data.tax_registration.updated.v1
master_data.tax_registration.activated.v1
master_data.tax_registration.blocked.v1
master_data.tax_registration.retired.v1
master_data.tax_registration.restored.v1
```

Same-TX: entity + `platform_audit_log` + `platform_domain_event`.

### Commands (package surface)

| Command | Notes |
|---------|-------|
| `createTaxRegistration` | Org + party + jurisdiction + type + number |
| `updateTaxRegistration` | CAS; may adjust validity / name |
| `activate` / `block` / `retire` / `restore` | Lifecycle |
| `getTaxRegistrationById` | Org-bound |
| `listTaxRegistrations` | Filter by party / status; `pageSize <= 100` |
| `findTaxRegistrationsByParty` | Deterministic list for a party |

Web: thin Actions under `master_data.read` / `master_data.manage`; pattern = payment-term Actions.

### What is not in this table

- Item “default tax classification” (§7.2 optional harden → R6-item-optional).
- Government IDs stuffed into party `code` (use `md_party_external_id` for non-tax systems; tax registration uses this entity).

---

## Acceptance for R4 implement mission

- Schema + migration + hard-tenant.
- Domain tests: tenancy bind · uniqueness · overlap reject · CAS · pageSize.
- Events catalog + same-TX CTE.
- Web list/create/lifecycle Actions + tests.
- [../master-data/remaining-slices.md](../master-data/remaining-slices.md) R4 marked shipped with evidence paths.

## Verify

```bash
pnpm --filter @afenda/db test -- master-data-schema tenancy
pnpm --filter @afenda/master-data typecheck test
pnpm --filter @afenda/web typecheck test -- master-data
pnpm audit:tenancy-nulls
```

---

## Open follow-ons (named, not R4)

- Multi-jurisdiction tax **code** / rate masters.
- Snapshot of registration onto SO/PO at post time (ARCH-006 consumer duty).
- Maker-checker on tax registration activate (optional MDG policy extension).
