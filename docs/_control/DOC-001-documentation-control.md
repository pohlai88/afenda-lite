# DOC-001 Documentation Control

| Field | Value |
|-------|-------|
| ID | DOC-001 |
| Category | Control |
| Version | 1.4.1 |
| Status | Living |
| Owner | Platform |
| Updated | 2026-07-13 |

## Purpose

This document defines the Afenda-Lite documentation catalogue. The catalogue is intentionally small: it tracks whether a document exists, which version is current, who owns it, and whether it is still authoritative.

The register is a library catalogue, not a document management system.

## Registry Fields

Every row in [REGISTER.md](REGISTER.md) has exactly seven fields:

| Field | Required |
|-------|----------|
| ID | Yes |
| Category | Yes |
| Title | Yes |
| Version | Yes |
| Status | Yes |
| Owner | Yes |
| Updated | Yes |

Do not add path, slug, supersedes, related docs, tags, keywords, or priority to the register. Put those inside the document body when needed.

## ID Allocation (user agreement required)

Clear rule: **do not assign or register a document number unless the user agrees.**

| Allowed | Forbidden |
|---------|-----------|
| Propose a candidate ID and wait | Auto-numbering docs into the register |
| Use a provisional header ID in a draft | Committing a new register row without approval |
| Keep unregistered docs out of [REGISTER.md](REGISTER.md) | Reusing, skipping, or inventing IDs to “fill gaps” |

The living register starts empty of product docs until the user agrees each ID. Control docs `DOC-001` and `DOC-002` are the only standing exceptions.

## Categories

| Category | Prefix | Owns |
|----------|--------|------|
| Control | DOC | Catalogue control |
| ADR | ADR | Decision records |
| Architecture | ARCH | System structure and registers |
| API | API | Cross-cutting BFF contract (boundaries, errors, types, Zod map) |
| REST | REST | Human REST resource catalogs (paths, methods, api-now vs contract-only) |
| OPEN | OPEN | OpenAPI machine-readable exports (YAML/JSON) |
| Runbook | RB | Operational procedures |
| Guide | GUIDE | Internal guides |
| Module | MOD | Module indexes **and** per-module 10-MOD spine under `docs/modules/<slug>/` (qualified IDs e.g. `FFT-MOD-001`) |

Use the smallest fitting category. Prefer **API** for adapter/error/type vocabulary that also covers Server Actions; **REST** for HTTP path catalogs; **OPEN** for OpenAPI artifacts. Avoid creating further prefixes unless these cannot describe the document.

## Filename Naming

Every authoritative Markdown file uses this name:

```text
{ID}-{kebab-slug}.md
```

Rules:

| Rule | Example |
|------|---------|
| ID matches the document header `ID` field | `ARCH-003-multi-tenant-ecosystem.md` |
| Prefix matches the category table above | Architecture → `ARCH-` |
| Slug is lowercase kebab-case from the short title | Multi-tenant Ecosystem → `multi-tenant-ecosystem` |
| Do not invent a second ID scheme or drop the numeric pad | `ARCH-3.md` is invalid; use `ARCH-003-…` |
| H1 stays `# {ID} {Title}` | `# ARCH-003 Multi-tenant Ecosystem` |

Findability without a Path column depends on this rule: search for `{ID}-` under `docs/`.

### Allowed exceptions

| File | Why |
|------|-----|
| `docs/_control/REGISTER.md` | Fixed catalogue filename (still DOC-002 in header) |
| `docs/README.md` | Docs tree entry point (may be unregistered until agreed) |
| `docs/scratch/**` | Non-authoritative; no `{ID}-` requirement until promoted |
| Folder `README.md` stubs | Optional one-line pointers to the `{ID}-*.md` authority file |

Do not keep legacy basenames (`01-boundaries.md`, `RUNTIME.md`, `DOC-CONTROL.md`) for authoritative content.

## Lifecycle

Use only these states:

```text
Draft
Review
Accepted
Living
Superseded
Retired
```

## Version Rules

| Change | Version |
|--------|---------|
| Breaking decision | Major |
| New content | Minor |
| Editorial | Patch |

No exceptions. Use semantic versioning in `major.minor.patch` format.

## Document Header

Every authoritative document should start with this compact header:

```markdown
# <ID> <Title>

| Field | Value |
|-------|-------|
| ID | <ID> |
| Category | <Category> |
| Version | <major.minor.patch> |
| Status | Draft | Review | Accepted | Living | Superseded | Retired |
| Owner | <Team or function> |
| Updated | YYYY-MM-DD |
```

If an older document uses a simpler status block, update it when the document is materially edited. Do not churn old docs only for header formatting.

## Change Log Format

Keep change logs short. One line per release is enough.

```markdown
## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.1.0 | 2026-07-13 | Added tenancy section |
| 1.0.0 | 2026-07-10 | Initial accepted version |
```

## Folder Roles

| Folder | Role |
|--------|------|
| `docs/_control/` | Catalogue control and register |
| `docs/architecture/` | Cross-system architecture, registers, and absorbed decisions (former `docs/adr/`) |
| `docs/api/` | API / REST / OPEN interface contracts (cross-cutting, resource catalogs, OpenAPI) |
| `docs/runbooks/` | Operational procedures |
| `docs/guides/` | Internal guides (coding workflow GUIDE-001…004 + GUIDE-006 index) |
| `docs/modules/` | Product-module 10-MOD spines + depth (`feed-farm-trade/`, …) |
| `docs/scratch/` | Non-authoritative drafts and temporary notes |

Do **not** recreate `docs/engineering/` — absorbed into `docs/guides/`.

## Golden Rule

The register answers only four questions:

1. Does this document exist?
2. Which version is current?
3. Who owns it?
4. Is it still authoritative?

Everything else belongs inside the document itself.

## Change Log

| Version | Date | Summary |
|---------|------|---------|
| 1.4.1 | 2026-07-13 | Retired `docs/engineering/`; all GUIDE-* under `docs/guides/` |
| 1.4.0 | 2026-07-13 | Module category owns 10-MOD spines under `docs/modules/<slug>/`; FFT home moved |
| 1.3.0 | 2026-07-13 | Added REST and OPEN categories for scalable interface docs |
| 1.2.0 | 2026-07-13 | Document numbers require explicit user agreement before register |
| 1.1.0 | 2026-07-13 | Added mandatory `{ID}-{kebab-slug}.md` filename rule |
| 1.0.0 | 2026-07-13 | Established minimal documentation catalogue rules |
