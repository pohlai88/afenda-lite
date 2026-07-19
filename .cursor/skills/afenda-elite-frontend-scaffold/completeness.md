# Portal frontend scaffold — completeness (updated 2026-07-20)

Plan authority: this skill + `route-tree.md` + ARCH-012 operative route facts (Living body dormant).

| Slice | Plan | Code | Status |
|-------|------|------|--------|
| Descriptive dynamic params (no overloaded `[id]`) | Brand table | Living identity/org-admin params | **Done** (rule) |
| Living `/admin` operator route group | ARCH-028 S7.2/G | `app/(operator)/admin/page.tsx` thin RSC → `features/org-admin` | **Done** |
| Client home `/client` | Workspace shell | `CLIENT_HOME=/client` — not Declarations product | **Living shell** |
| Declarations / FFT product routes | Removed | Absent | **Removed (wiped)** |
| No `app/trade` product tree | Forbidden | Absent | **Done** |
| Thin `page.tsx` + runners in `features/` | No domain in stubs when scaffolding | Living: auth · org-admin | **Done** |
| Shell entitlement compose | Adapter / features | `features/portal-chrome/resolve-shell-access.ts` when present | **Done** |
| `lib/` runners | Absorb | `lib/` gone | **Done** |
| api/actions untouched by scaffold | Keep | api-now health/auth/session only | **Done** |
| Wipe inventory historical FFT/Declarations rows | Historical footnotes | Documented | **Intentional (historical)** |

## Stabilization (latest)

- Nuclear wipe removed living Declarations + FFT product routes/features/modules
- Shell resolve composed in portal-chrome (not Platform domain imports)
- Living operator surface = `/admin` + identity/org-admin

## Verify

```bash
npx tsc --noEmit
# Dynamic folders must not include [id]
# Expect zero living apps/web/modules/{declarations,fft} and features/{declarations,fft}
```
