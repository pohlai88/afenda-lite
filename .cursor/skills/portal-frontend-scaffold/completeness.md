# Portal frontend scaffold — completeness (2026-07-12)

Plan authority: this skill + `route-tree.md` + `doc/frontend/03-routes.md`.

| Slice | Plan | Code | Status |
|-------|------|------|--------|
| Descriptive dynamic params (no overloaded `[id]`) | Brand table | `dashboard/[declarationId]`, `declare/[assignmentId]`, `users/[userId]` | **Done** |
| `/dashboard/roles` + `/dashboard/permissions` | route-tree | Pages + loaders + UI present | **Done** |
| Locale-free FFT product routes | `/fft/*` | Live under `app/fft/*`; `[locale]` shim only | **Done** |
| No `app/trade` product tree | Forbidden | Absent | **Done** |
| Thin `page.tsx` + runners in `features/` | No domain in stubs when scaffolding | Wired product pages use features runners | **Done** |
| `lib/` runners | Absorb | `lib/` gone | **Done** |
| Root + segment `error.tsx` client | Convention | Present on product trees | **Done** |
| api/actions untouched by scaffold | Keep | api-now only | **Done** |
| `/client` workspace product rebuild | Closed + reopen checklist | Stubs only | **Closed (registered)** — [closed-scope-register](../../../doc/architecture/closed-scope-register.md) |
| Wipe inventory historical FFT locale rows | Superseded note | Documented | **Intentional** |

## Stabilization (latest)

- Renamed `/dashboard/[id]` → `/dashboard/[declarationId]` (params + tests + surface registry)
- Journey / README / agent-workflow SSOT updated to brand names
- Roles / permissions AdminCN routes aligned with route-tree

## Verify

```bash
npx tsc --noEmit
# Dynamic folders must not include [id]
```
