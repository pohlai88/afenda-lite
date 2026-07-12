# DOC-002 Documentation Register

| Field | Value |
|-------|-------|
| ID | DOC-002 |
| Category | Control |
| Version | 3.4.1 |
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

## Register

| ID | Category | Title | Version | Status | Owner | Updated |
|----|----------|-------|---------|--------|-------|---------|
| DOC-001 | Control | Documentation Control | 1.3.0 | Living | Platform | 2026-07-13 |
| DOC-002 | Control | Documentation Register | 3.4.1 | Living | Platform | 2026-07-13 |
| API-001 | API | API Boundaries | 1.2.0 | Living | Backend | 2026-07-13 |
| API-002 | API | Error Contract | 1.2.0 | Living | Backend | 2026-07-13 |
| API-003 | API | API Types | 1.1.0 | Living | Backend | 2026-07-13 |
| API-004 | API | Schema Map | 1.1.1 | Living | Backend | 2026-07-13 |
| REST-001 | REST | Rest Resources | 1.2.0 | Living | Backend | 2026-07-13 |
| OPEN-001 | OPEN | OpenAPI | 1.1.2 | Living | Backend | 2026-07-13 |

## Not Registered

Everything else stays unregistered until the user agrees to assign a number and add a row here.

Unregistered docs may still use seven-field headers and `{ID}-{slug}.md` filenames for local findability, but those IDs are **provisional** until listed here.

## Change Log

| Version | Date | Summary |
|---------|------|---------|
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
