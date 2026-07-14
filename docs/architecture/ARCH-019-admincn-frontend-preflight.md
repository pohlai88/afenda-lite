# ARCH-019 AdminCN Frontend Preflight

| Field             | Value        |
| ----------------- | ------------ |
| **ID**            | ARCH-019     |
| **Category**      | Architecture |
| **Version**       | 1.1.4        |
| **Status**        | Living     |
| **Control State** | Closed       |
| **Owner**         | Frontend     |
| **Updated**       | 2026-07-14   |

---

# 1. Purpose

Provide the Living preflight checklist before adding or refining AdminCN-hosted screens.

---

# 2. Scope

## 2.1 In Scope

- Surface naming
- Shell invariants
- Data and FFT extras
- Verify steps

## 2.2 Out of Scope

- Full customization playbook (ARCH-018)
- Alignment keep/drop tables (ARCH-015)
- Backend port definitions
- Recovering Collapse-era repo-root `app/`/`modules/`/`features/`/`components-V2/` from git (contamination ban — [ARCH-028](ARCH-028-implementation-slices.md))

---

# 3. AdminCN Frontend Preflight

Run before adding or refining an AdminCN-hosted screen.

## 1 — Name the surface

| Question | Answer |
|----------|--------|
| Module? | `declarations` \| `fft` \| admin-route |
| Route? | Must match [ARCH-012](ARCH-012-app-router-routes.md) |
| Layout gate? | Member / HS permission / org admin — never conflate |
| Owner? | `portal-views/*` or `features/*` — thin `app/**/page.tsx` |
| Registry IDs? | Required: `ACN-UI-*` / `ACN-BLK-*` / `FFT-UI-*` in [ui-registry.json](../../.cursor/skills/feed-farm-trade/ui-registry.json) — **STOP** if inventing |

## 2 — Shell invariants

- [ ] Page mounts under `AdminCnShell` (dashboard / account / trade layouts)  
- [ ] No nested ThemeProvider inside AdminCN  
- [ ] No `FftShell` / locale switcher  
- [ ] Nav entry tagged with `kind` + `moduleId` (or `kind: "admin"`)  
- [ ] Auth island CSS untouched (`auth-surface.css`, `neon-auth-ui.css`)  
- [ ] UI IDs registered; no agent-edit of `ui-registry.json`  
- [ ] Studio DNA comes from temporary CLI/MCP scratch (or approved HITL promote) — **never** import `_reference/` into product runtime  
- [ ] Scratch MCP path `components/shadcn-studio/` is temporary; promote before merge  

## 3 — Data

- [ ] Reads via page loader / domain — not `platform-fake-db`  
- [ ] Mutations via `app/actions/*` + Zod + session guard  
- [ ] Admin-only mutations still use `requireAdminSession` even when Declarations module is member-open  

## 4 — Feed Farm Trade extras

- [ ] Route is locale-free (`/fft/...`)  
- [ ] Entry uses `requireFftAccess` (org admin alone is insufficient)  
- [ ] Product UI restore is an explicit reopen — no invented product surfaces; hold ARCH-012 disposition  
- [ ] No `@/components-V2/platform-views` imports from `features/fft` (use HITL `FFT-UI-*` + `studioSource`)  

## 5 — Verify

- [ ] `npm run test:unit -- features/fft/ui-registry`  
- [ ] Unit tests for shell/access or route helpers if touched  
- [ ] Manual: entitled nav matches session (member / HS / org admin)  
- [ ] Login island still renders without AdminCN tokens  

---

# 4. References

| ID | Title | Relationship |
| --- | --- | --- |
| DOC-001 | Documentation Control Standard | Governance |
| DOC-003 | Controlled Document Template | Structure |

Additional related links from prior revision:


- [ARCH-018](ARCH-018-admincn-customization.md)  
- [ui-registry.md](../../.cursor/skills/feed-farm-trade/ui-registry.md) · skill `/feed-farm-trade`  
- [ARCH-015](ARCH-015-admincn-alignment.md)  
- `modules/platform/shell/access.ts` (when product tree is present — see [ARCH-028](ARCH-028-implementation-slices.md) § Target vs checkout drift)  

---

# 5. Change Log

| Version | Date | Summary |
| ------- | ---- | ------- |
| 1.1.4 | 2026-07-14 | Preflight: no invented product surfaces; hold ARCH-012 disposition (remove stub-OK wording). |
| 1.1.3 | 2026-07-14 | Home flattened to docs/architecture/ (trunks removed; pack reading order in README). |
| 1.1.2 | 2026-07-14 | No AdminCN zip retained under `_reference/`; Studio DNA temporary scratch only. |
| 1.1.1 | 2026-07-14 | Preflight: Studio DNA is temporary scratch only (no permanent studio-admincn-lock tree). |
| 1.1.0 | 2026-07-14 | Preflight gates for Studio DNA + no `_reference/` runtime import; promote scratch `shadcn-studio/` before merge. |
| 1.0.3 | 2026-07-14 | Checkout posture: Living map = shape only; Collapse product trees not present and forbidden to recover; Target greenfield via ARCH-028 only. |
| 1.0.2 | 2026-07-14 | DOC-003 six-section retrofit and parseable Change Log; Control State Closed after architecture sync campaign. |
| 1.0.1 | 2026-07-14 | Prior controlled revision (pre DOC-003 retrofit). |

---

# 6. Notes

### Checkout posture (Collapse · anti-contamination)

- Repo-root product trees `app/`, `modules/`, `features/`, `components-V2/` (and wiped Collapse-era ops scripts) are **not present** in this checkout after design-SSOT Collapse (`4680c91`).
- **Forbidden:** recovering those trees from git history (`f014807` / Collapse parents) — contamination of the docs-first checkout. See [ARCH-028](ARCH-028-implementation-slices.md) Anti-contamination lock.
- Paths in this document are a **logical Living map** (shape). When product code is implemented, place it under **Target** roots per [ARCH-022](ARCH-022-system-overview.md) / [ARCH-028](ARCH-028-implementation-slices.md) (`apps/web/**`, `packages/*`) after an **explicit** implement request — never as a restore of banned repo-root trees.
- Phrases such as “on disk”, “live adapters”, or “relocate complete” describe the intended shape when a Target product tree exists; they are **not** a claim that Collapse-era files may be recovered.
