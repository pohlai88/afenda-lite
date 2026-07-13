# DOC-002 Documentation Register

| Field | Value |
|-------|-------|
| ID | DOC-002 |
| Category | Control |
| Version | 4.3.1 |
| Status | Living |
| Owner | Platform |
| Updated | 2026-07-13 |

## Purpose

This is the minimal catalogue of critical Afenda-Lite documents.

The register answers only:

1. Does this document exist?
2. Which version is current?
3. Who owns it?
4. Is it still authoritative?

The register has exactly seven fields: ID, Category, Title, Version, Status, Owner, Updated.

## Allocation Gate

Do **not** add a document number (ID) or register row unless the user explicitly agrees to that ID.

Agents may propose a candidate ID. They must not invent, reuse, or commit a new ID into this register without approval.

**2026-07-13:** Turborepo plan docs ARCH-022…028 are Living/Target. ADR-010…014 are **Superseded** (absorbed into ARCH-022…027); do not restore `docs/adr/`. Scratch audit: `docs/scratch/AUDIT-2026-07-13-documentation.md`.

## Register

| ID | Category | Title | Version | Status | Owner | Updated |
|----|----------|-------|---------|--------|-------|---------|
| DOC-001 | Control | Documentation Control | 1.3.0 | Living | Platform | 2026-07-13 |
| DOC-002 | Control | Documentation Register | 4.3.1 | Living | Platform | 2026-07-13 |
| API-001 | API | API Boundaries | 1.2.0 | Living | Backend | 2026-07-13 |
| API-002 | API | Error Contract | 1.2.0 | Living | Backend | 2026-07-13 |
| API-003 | API | API Types | 1.1.0 | Living | Backend | 2026-07-13 |
| API-004 | API | Schema Map | 1.1.1 | Living | Backend | 2026-07-13 |
| REST-001 | REST | Rest Resources | 1.2.0 | Living | Backend | 2026-07-13 |
| OPEN-001 | OPEN | OpenAPI | 1.1.2 | Living | Backend | 2026-07-13 |
| ARCH-022 | Architecture | System Overview (Turborepo) | 1.4.0 | Target | Platform | 2026-07-13 |
| ARCH-023 | Architecture | Multi-Tenancy Model (Turborepo) | 2.4.0 | Living | Platform | 2026-07-13 |
| ARCH-024 | Architecture | Package Boundaries | 1.1.0 | Target | Platform | 2026-07-13 |
| ARCH-025 | Architecture | Data Layer | 1.1.0 | Target | Backend | 2026-07-13 |
| ARCH-026 | Architecture | Auth and Session Model | 1.1.0 | Target | Platform | 2026-07-13 |
| ARCH-027 | Architecture | Environment Variable Model | 1.2.0 | Target | Platform | 2026-07-13 |
| ARCH-028 | Architecture | Turborepo Implementation Slices | 1.1.0 | Target | Platform | 2026-07-13 |
| ADR-010 | ADR | Turborepo Multi-Package Monorepo | — | Superseded | Platform | 2026-07-13 |
| ADR-011 | ADR | Drizzle ORM | — | Superseded | Backend | 2026-07-13 |
| ADR-012 | ADR | Shared-Schema Multi-Tenancy | — | Superseded | Platform | 2026-07-13 |
| ADR-013 | ADR | Neon Auth as Identity Provider | — | Superseded | Platform | 2026-07-13 |
| ADR-014 | ADR | @t3-oss/env-nextjs for Environment Config | — | Superseded | Platform | 2026-07-13 |

## Not Registered

Everything else stays unregistered until the user agrees to assign a number and add a row here.

Unregistered docs may still use seven-field headers and `{ID}-{slug}.md` filenames for local findability, but those IDs are **provisional** until listed here.

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 4.4.0 | 2026-07-13 | ADR-010…014 absorbed into ARCH-022…027; `docs/adr/` deleted |
| 4.3.1 | 2026-07-13 | ARCH-023 2.1.0 clarity rewrite (architecture mode) |
| 4.3.0 | 2026-07-13 | ARCH-023 2.0.0 Living absorbs ARCH-003; ARCH-003 Superseded |
| 4.2.0 | 2026-07-13 | Plan residual audit absorbed: ARCH-022/027/028 + ADR-010…014 constraints |
| 4.1.0 | 2026-07-13 | ARCH-028 implementation slices; ARCH-022 1.1.0 full target stack + turbo.json |
| 4.0.0 | 2026-07-13 | Forward-writing Turborepo: ARCH-022…027 Target; ADR-010…014 Accepted |
| 3.4.1 | 2026-07-13 | Forward-writing posture: Recorded vs Done; OPEN-001 1.1.2 |
| 3.4.0 | 2026-07-13 | API-001/002 `{ data }` SSOT; OPEN-001 1.1.1; API-004 Gaps cleanup |
| 3.3.0 | 2026-07-13 | OPEN-001 1.1.0 — forward recipes (Zod / Fumadocs / contract-only) |
| 3.2.1 | 2026-07-13 | OPEN-001 1.0.1 — `{ data }` envelope + Gaps honesty |
| 3.2.0 | 2026-07-13 | OPEN-001 Living 1.0.0 (api-now YAML + check:openapi) |
| 3.1.0 | 2026-07-13 | Registered API-001..004, REST-001, OPEN-001; synced DOC-001 to 1.3.0 |
| 3.0.0 | 2026-07-13 | Cleared register to agreed control docs only; ID allocation requires user agreement |
| 2.1.0 | 2026-07-13 | Synced DOC-001 to 1.1.0; dropped missing DOC-004 equalization plan |
| 2.0.0 | 2026-07-13 | Reduced register to critical-only catalogue |
| 1.4.1 | 2026-07-13 | Over-expanded register during bulk equalization |
