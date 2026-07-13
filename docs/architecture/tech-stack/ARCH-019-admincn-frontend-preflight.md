# ARCH-019 AdminCN Frontend Preflight

| Field | Value |
|-------|-------|
| ID | ARCH-019 |
| Category | Architecture |
| Version | 1.0.0 |
| Status | Living |
| Owner | Frontend |
| Updated | 2026-07-13 |

Run before adding or refining an AdminCN-hosted screen.

## 1 — Name the surface

| Question | Answer |
|----------|--------|
| Module? | `declarations` \| `fft` \| admin-route |
| Route? | Must match [ARCH-012](../frontend/ARCH-012-app-router-routes.md) |
| Layout gate? | Member / HS permission / org admin — never conflate |
| Owner? | `portal-views/*` or `features/*` — thin `app/**/page.tsx` |
| Registry IDs? | Required: `ACN-UI-*` / `ACN-BLK-*` / `FFT-UI-*` in [ui-registry.json](../../../.cursor/skills/feed-farm-trade/ui-registry.json) — **STOP** if inventing |

## 2 — Shell invariants

- [ ] Page mounts under `AdminCnShell` (dashboard / account / trade layouts)  
- [ ] No nested ThemeProvider inside AdminCN  
- [ ] No `FftShell` / locale switcher  
- [ ] Nav entry tagged with `kind` + `moduleId` (or `kind: "admin"`)  
- [ ] Auth island CSS untouched (`auth-surface.css`, `neon-auth-ui.css`)  
- [ ] UI IDs registered; no agent-edit of `ui-registry.json`  

## 3 — Data

- [ ] Reads via page loader / domain — not `platform-fake-db`  
- [ ] Mutations via `app/actions/*` + Zod + session guard  
- [ ] Admin-only mutations still use `requireAdminSession` even when Declarations module is member-open  

## 4 — Feed Farm Trade extras

- [ ] Route is locale-free (`/fft/...`)  
- [ ] Entry uses `requireFftAccess` (org admin alone is insufficient)  
- [ ] Product UI restore is an explicit reopen — stubs are OK  
- [ ] No `@/components-V2/platform-views` imports from `features/fft` (use HITL `FFT-UI-*` + `studioSource`)  

## 5 — Verify

- [ ] `npm run test:unit -- features/fft/ui-registry`  
- [ ] Unit tests for shell/access or route helpers if touched  
- [ ] Manual: entitled nav matches session (member / HS / org admin)  
- [ ] Login island still renders without AdminCN tokens  

## Related

- [ARCH-018](ARCH-018-admincn-customization.md)  
- [ui-registry.md](../../../.cursor/skills/feed-farm-trade/ui-registry.md) · skill `/feed-farm-trade`  
- [ARCH-015](../frontend/ARCH-015-admincn-alignment.md)  
- `modules/platform/shell/access.ts` (when product tree is present — see [GUIDE-004](../../guides/GUIDE-004-engineering-drift-register.md))  
