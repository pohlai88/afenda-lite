# Modules / ports (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/modules/README.md` |
| Authority | **Scratch** — context-engineering · farm `afenda-elite-backend-modules` + disk `apps/web/modules/**` |
| Updated | 2026-07-20 |

Bounded contexts on disk. Re-probe L2 folders after module changes. Do **not** treat skill `module-tree.md` Living inventory as disk SSOT.

---

## Context map (disk)

| Context | L2 on disk | Feature UI | Primary routes |
|---------|------------|------------|----------------|
| platform | `api` · `domain` · `format` · `observability` · `schemas` | portal-chrome · landing | `/` · health · correlation |
| identity | `domain` · `schemas` | auth · org-admin | `/auth/*` · `/join` · `/admin` |
| declarations | `api` · `domain` · `schemas` | declarations | `/client/**` |
| fft (Trade) | `auth` · `domain` | fft | `/fft` |

Physical home: `apps/web/modules/{platform,identity,declarations,fft}`. Never invent `modules/trade/`.

FFT **2B–2D** product code stays frozen until an explicit program reopen this chat.

---

## Isolation (hard rules)

| Rule | Why |
|------|-----|
| Identity ↛ Declarations (any) | Keep RBAC/session free of declaration domain |
| Trade (`fft`) ↛ Declarations (any, incl. schemas) | Shared Zod from Platform only |
| Platform ↛ Declarations / FFT **domain compose** | Platform owns shared contracts; product compose at adapters / features |
| Ports ↛ `Request` · `next/headers` · UI | HTTP/UI stay in Actions / RH / pages |

Compose two contexts only at the adapter (Server Action · Route Handler · thin page). Deep rule table: farm skill `context-boundaries.md` (not pasted here).

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
1. Disk: apps/web/modules/{platform,identity,declarations,fft}/<L2>
2. No modules/trade/ · no root modules/ (Collapse)
3. Search apps/web/modules/{fft,identity} for from "@/modules/declarations
   → expect zero product imports (rg or IDE search)
4. Ownership summary: ../system/README.md → this pack
```

Companion: [../system/README.md](../system/README.md) · [../api/actions.md](../api/actions.md) · [../data/README.md](../data/README.md).
