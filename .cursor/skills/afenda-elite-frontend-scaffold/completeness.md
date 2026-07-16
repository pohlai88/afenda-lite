# Portal frontend scaffold — completeness (2026-07-12)

Plan authority: this skill + `route-tree.md` + `docs/architecture/ARCH-012-app-router-routes.md`.

| Slice | Plan | Code | Status |
|-------|------|------|--------|
| Descriptive dynamic params (no overloaded `[id]`) | Brand table | `dashboard/[declarationId]`, `declare/[assignmentId]`, `users/[userId]` | **Done** |
| `/dashboard/roles` + `/dashboard/permissions` | route-tree | Pages + loaders + UI present | **Done** |
| Locale-free FFT product routes | `/fft/*` | Live under `app/fft/*`; `[locale]` shim only | **Done** |
| No `app/trade` product tree | Forbidden | Absent | **Done** |
| Thin `page.tsx` + runners in `features/` | No domain in stubs when scaffolding | Wired product pages use features runners | **Done** |
| Shell entitlement compose | Adapter / features | `features/portal-chrome/resolve-shell-access.ts` | **Done** |
| `lib/` runners | Absorb | `lib/` gone | **Done** |
| Root + segment `error.tsx` client | Convention | Present on product trees | **Done** |
| api/actions untouched by scaffold | Keep | api-now only | **Done** |
| `/client` workspace product rebuild | Closed + reopen checklist | Stubs only | **Closed (registered)** — [deprecation register](../../../agent-skills/skills/deprecation-and-migration/reference.md) |
| Wipe inventory historical FFT locale rows | Superseded note | Documented | **Intentional** |

## Stabilization (latest)

- No overloaded `[id]` folders on disk
- Shell resolve composed in portal-chrome (not Platform domain imports)
- Journey / README / Elite skills SSOT updated to brand names
- Roles / permissions AdminCN routes aligned with route-tree

## Verify

```bash
npx tsc --noEmit
# route-coverage-drift retired 2026-07-17 — use App Router path review + Vitest
# Dynamic folders must not include [id]
```
