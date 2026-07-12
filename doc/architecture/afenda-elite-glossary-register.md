# Afenda Elite — glossary register

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Type** | Register |
| **Date** | 2026-07-12 |
| **Audience** | Engineers · operators · agents |
| **Enables** | Pick canonical name or ban an alias before SSOT/UI chrome |
| **Controller** | [afenda-elite-documentation-types.md](afenda-elite-documentation-types.md) |

```text
LOAD: canonical names + forbidden aliases
SKIP: doc homes → documentation-types · architecture → ADRs
```

---

## Authority

**Target SSOT (Phase C):** `@repo/glossary` `terms.yaml` — one source for metadata + i18n + Fumadocs. This markdown register becomes **generated**; cite `id` everywhere else. **No hand-edited twin.**

**Until Phase C:** this file is the editable seed (same columns). ADR-003 locks the YAML→farms pipeline.

| status | Meaning |
|--------|---------|
| `canonical` | Use |
| `deprecated` | Legacy lineage only |
| `forbidden` | Do not teach or brand |

Compulsory bans/renames: also [deprecation register](../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md).

**Assumption:** `term.afenda-elite` is program-canonical until Elite ADR-002 Accept; rename in the same PR if that ADR changes the display name.

| Column | Meaning |
|--------|---------|
| `id` | Stable `term.*` (join key for i18n + Fumadocs meta) |
| `term` | Display name (`en` until multi-locale in YAML) |
| `definition` | One sentence |
| `aliases` | Ban in new SSOT |
| `status` | canonical / deprecated / forbidden |
| `see` | Authority link |

---

## Product

| id | term | definition | aliases | status | see |
|----|------|------------|---------|--------|-----|
| `term.afenda-elite` | Afenda Elite | Multi-module Afenda ERP surface for the Elite reframe in this repo. | — | canonical | [documentation-types](afenda-elite-documentation-types.md) |
| `term.afenda-lite` | Afenda-Lite | Archived beta lineage; not the Elite ceiling. | — | deprecated | [adr/001](../adr/001-afenda-lite-product-identity.md) |
| `term.client-declaration-portal` | Client Declaration Portal | Retired product name. | CDP; “the portal” as product | forbidden | [adr/001](../adr/001-afenda-lite-product-identity.md) · [deprecation register](../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md) |

---

## Platform

| id | term | definition | aliases | status | see |
|----|------|------------|---------|--------|-----|
| `term.organization` | Organization | Neon Auth organization; key `organization_id`. | tenant (informal) | canonical | [ADR-002](../backend/adr/002-platform-tenancy-rbac.md) |
| `term.neon-cloud-org` | Neon Cloud organization | Neon Console org (`NEON_ORG_ID`); not the product tenant. | — | canonical | [multi-tenant-ecosystem](multi-tenant-ecosystem.md) |
| `term.platform` | Platform | Shared control plane (tenancy, RBAC, env/governance). | — | canonical | `modules/platform` |
| `term.identity` | Identity | Session, membership, org resolution. | — | canonical | `modules/identity` |

---

## Modules

| id | term | definition | aliases | status | see |
|----|------|------------|---------|--------|-----|
| `term.declarations` | Declarations | Declaration workflows module. | — | canonical | `modules/declarations` |
| `term.fft` | Feed Farm Trade | B2B feed/farm trade; `/fft/*`; ops `docs/fft/`. | Trade (as product home) | canonical | [frontend ADR-001](../frontend/adr/001-feed-farm-trade.md) |
| `term.hot-sales` | Hot Sales | Retired FFT identity. | `/trade`; `FftShell` | forbidden | [deprecation register](../../.cursor/skills/agent-skills/skills/deprecation-and-migration/reference.md) |

---

## Add or change a term

1. Search this file.  
2. Add one row (Product / Platform / Modules) or update `status` / aliases.  
3. Compulsory rename/ban → deprecation register too.  
4. `see` → Accepted ADR/register only.

**Pitfalls:** no hand twins · no secrets in definitions / public Fumadocs · concepts only (not full UI chrome) · after Phase C edit YAML + `glossary:sync`, not this MD by hand.
