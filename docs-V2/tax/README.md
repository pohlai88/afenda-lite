# Tax (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/tax/README.md` |
| Authority | **Scratch** — gates master-data R4 (`md_tax_registration`) |
| Purpose | Tax architecture SSOT before any `md_tax_*` product code |
| Updated | 2026-07-20 |

## Verdict

**Accept** [tax-architecture.md](tax-architecture.md) as the field SSOT for shipped R4 `md_tax_registration` ([../master-data/remaining-slices.md](../master-data/remaining-slices.md)). Rates / returns / SO-PO snapshot engines remain **out** of `@afenda/master-data`.

| Concern | Owner |
|---------|-------|
| Tax architecture (fields · uniqueness · party link · non-goals) | This pack |
| `md_tax_registration` commands / schema | `@afenda/master-data` + `@afenda/db` (**shipped** R4) |
| Tax calculation · returns · rates engines | **Out** of master-data (future tax/finance farm) |

## Status

**R4 implement shipped** 2026-07-20 — `md_tax_registration` in `@afenda/db` / `@afenda/master-data` / web Actions. Evidence paths: [../master-data/remaining-slices.md](../master-data/remaining-slices.md) R4 row.

Follow-ons (rates · returns · SO/PO snapshot) remain **outside** `@afenda/master-data` — see [tax-architecture.md](tax-architecture.md) open follow-ons.

## Companions

- [tax-architecture.md](tax-architecture.md)
- [../master-data/development-method.md](../master-data/development-method.md)
- [../master-data/master-data-dna.md](../master-data/master-data-dna.md) §3.2 · §10
