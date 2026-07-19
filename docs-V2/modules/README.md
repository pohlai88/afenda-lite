# Modules / ports (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/modules/README.md` |
| Authority | **Scratch** — context-engineering · farm `afenda-elite-backend-modules` + disk `apps/web/modules/**` |
| Updated | 2026-07-20 |

Bounded contexts on disk. Re-probe L2 folders after module changes. Do **not** treat skill `module-tree.md` Living inventory as disk SSOT.

**Removed domains (nuclear wipe):** Declarations (`modules/declarations`, `features/declarations`) and Feed Farm Trade (`modules/fft`, `features/fft`, `feed-farm-trade` skill) are **gone** — do not recreate.

---

## Context map (disk)

| Context | L2 on disk | Feature UI | Primary routes |
|---------|------------|------------|----------------|
| platform | `api` · `domain` · `format` · `observability` · `schemas` | portal-chrome · landing | `/` · health · correlation |
| identity | `domain` · `schemas` | auth · org-admin | `/auth/*` · `/join` · `/admin` · `/client` |

Physical home: `apps/web/modules/{platform,identity}`. Living feature homes: `apps/web/features/{auth,org-admin}` (+ portal-chrome / landing as present). Never invent `modules/trade/`, `modules/declarations/`, or `modules/fft/`.

---

## Isolation (hard rules)

| Rule | Why |
|------|-----|
| Identity ↛ deleted domain trees | Keep RBAC/session free of wiped Declarations/FFT residue |
| Platform ↛ product domain compose for removed modules | Platform owns shared contracts; living product compose = identity / org-admin adapters |
| Ports ↛ `Request` · `next/headers` · UI | HTTP/UI stay in Actions / RH / pages |

Compose two living contexts only at the adapter (Server Action · Route Handler · thin page). Deep rule table: farm skill `context-boundaries.md` (not pasted here).

---

## Adapters

| Need | Where |
|------|-------|
| RSC read / Action / RH choice | [../nextjs/data.md](../nextjs/data.md) |
| `ActionResult` + OpenAPI | [../api/README.md](../api/README.md) |
| Server Actions on disk | [../api/actions.md](../api/actions.md) |
| RH allowlist | [../api/rest.md](../api/rest.md) |

---

## Verify

```text
1. Disk: apps/web/modules/{platform,identity}/<L2>
2. No modules/trade/ · no modules/declarations/ · no modules/fft/ · no root modules/ (Collapse)
3. Search apps/web for modules/declarations|modules/fft|features/declarations|features/fft
   → expect zero living product trees (rg or IDE search)
4. Ownership summary: ../system/README.md → this pack
```

Companion: [../system/README.md](../system/README.md) · [../api/actions.md](../api/actions.md) · [../data/README.md](../data/README.md).
