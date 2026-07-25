# Corporate Administration — Superseded Technical Specification

| Field | Value |
|---|---|
| Surface | `docs-V2/_scratch/erp/corporate-administration/corporate-administration.md` |
| Status | `SUPERSEDED` |
| Replacement authority | [Corporate Administration — Integrated Module Implementation Authority](./corporate-administration-integrated-implementation-authority.md) |
| As of | 2026-07-25 |
| Tier | Scratch only — not Living DOC-001 SSOT |

Do not implement from the former draft in this file. Its package naming, ownership,
aggregate, permission, event, and delivery proposals were reviewed and repaired by
the integrated implementation authority linked above. That authority is the sole
detailed Corporate Administration implementation contract.

## Approved identity

| Item | Decision |
|---|---|
| Package | `@afenda/corporate-administration` |
| Folder | `packages/erp/corporate-administration/` |
| Manifest id | `corporate-administration` |
| Product label | **Corporate Administration** |
| Bounded context | **Corporate Administration and Statutory Registers** |
| Category / band | `erp` / `R1-F` |
| Activation | `organization_toggle` |
| Table prefix | `ca_*` |
| CA-0 lifecycle | `scaffolded` until CA-1 vertical acceptance is verified |

## Resolved boundaries

- `@afenda/corporate-administration` is the sole mutator of `ca_*` statutory-register facts.
- `@afenda/master-data` remains authoritative for legal-entity dimensions, parties,
  party relationships, addresses, external identifiers, and tax registrations.
- CA reads master data only through its registered public contract and never writes
  `md_*`.
- `@afenda/payments` owns operational payment accounts and money movement; CA owns
  only masked bank-registration and mandate facts.
- Share ownership is an immutable transaction ledger with derived as-of holdings.
- CA-1 uses a generic multi-jurisdiction core and includes production UI; jurisdiction
  filing adapters are explicit later integrations.
- Activated statutory facts are corrected by supersession, end dating, reversal,
  dissolution, release, cancellation, or archival, never hard deletion.

## CA-0 acceptance

CA-0 is limited to approved authority and governance: roadmap identity, package
catalog registration, dependency edges, ownership maps, generated-register parity,
and a green package-governance gate. Runtime behavior and `active` lifecycle promotion
belong to CA-1 or later slice verification.

## References

- [Integrated implementation authority](./corporate-administration-integrated-implementation-authority.md)
- [ERP package scaffolding](../../../../packages/erp/SCAFFOLDING.md)
- [Package governance](../../../modules/PACKAGE-GOVERNANCE.md)
