# FFT + AdminCN UI registry (HITL)

**Machine SSOT:** [`ui-registry.json`](ui-registry.json) (skill-local; present on disk)  
**Shared audit script:** `scripts/lib/fft-ui-registry-inventory.mjs` — **absent** (`Test-Path` False). Do not invent or recover from Collapse git.  
**Generator / enforcer scripts:** root `pnpm` names `generate:fft-ui-registry-admincn`, `check:fft-ui-registry`, `check:fft-ui-registry:expect-fail` route through `scripts/collapse-script-unavailable.mjs` — **inventory only, not live controls**, until an Approved forward slice replaces them.  
**Vitest enforcer:** `apps/web/features/fft/ui-registry.test.ts` — **absent** on disk (Living FFT feature files today: `fft-events-panel.tsx`, `fft-events-shell.tsx` under `apps/web/features/fft/`).  
**AdminCN authority:** [ARCH-018](../../../docs/architecture/ARCH-018-admincn-customization.md) (the `admincn-customization` skill was retired 2026-07-16 — [ADR-010](../../../docs/architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md)); UI primitives via the `@afenda/ui-system` barrel.

## Layers (compulsory)

| Layer | What it catches | Green means |
|-------|-----------------|-------------|
| **A — Inventory** | Missing/extra files vs registry; HITL fields; ID uniqueness | File is catalogued |
| **B — DNA** | Product `dna` + `requiredBlockId` + `surfaces[]` pattern contracts | Code matches required Studio/AdminCN patterns |
| **C — Visual QA** | Human / HITL screenshots | Looks right (not owned by Vitest alone) |

Layer A green ≠ DNA compliant. Layer B green ≠ screenshot parity. Live automated Layer A/B gates are **unavailable** while collapse-script aliases own the check/generate names.

## ID namespaces (compulsory)

| Prefix | Kind | Path home (Living Target) | Agent use |
|--------|------|---------------------------|-----------|
| `ACN-UI-*` | Primitive | Consume via `@afenda/ui-system` barrel — **not** repo-root `components-V2/` (absent by design; do not recover) | Prefer barrel primitives; allowlist rules apply when registry rows exist |
| `ACN-BLK-*` | Block / DNA | Catalog / Studio DNA references only — **not** importable Collapse `components-V2/platform-views/**` | **Catalog only** — adapt via new `FFT-UI-*` HITL; never import banned trees |
| `FFT-UI-*` | Product | `apps/web/features/fft/*.tsx` (Target). Repo-root `features/fft` is **absent**. | Auto-use when `status=approved` and Living path exists |

Every approved row must have: `reusableId`, `qaId`, `evidenceRef`, `approvedBy`, `approvedAt`.

## Layer B fields

On product rows that claim AdminCN DNA:

| Field | Purpose |
|-------|---------|
| `requiredBlockId` | Must exist in `blocks[]` (e.g. `ACN-BLK-DATATABLES-DATATABLE-USER`) |
| `studioSource` | Must equal that block’s `path` |
| `dna.requiredPatterns` | Substrings that **must** appear in the product source |
| `dna.bannedPatterns` | Substrings that **must not** appear |
| File pragma | Near top of DNA-bound product: `@fft-dna <requiredBlockId>` |

`surfaces[]` applies the same pattern contracts to route files under Living `apps/web` FFT App Router routes (not Collapse `app/fft/**` at repo root).

Example: `FFT-UI-EVT-LIST` requires TanStack (`useReactTable`, `flexRender`, …), bans `FFT_NATIVE_` / native `<select` / hand `toggleSort`, and must declare `@fft-dna ACN-BLK-DATATABLES-DATATABLE-USER`.

**Expect-fail gate:** `pnpm check:fft-ui-registry:expect-fail` is collapse-unavailable inventory until a forward slice restores a real enforcer.

## Rules (agents) — compulsory

1. Compose **approved** `FFT-UI-*` and allowlisted primitives from `@afenda/ui-system` only.
2. Need a new product file / new `FFT-UI-*` → **STOP and ask a human**.
3. Need to adapt an `ACN-BLK-*` into FFT → **STOP and ask** for a new product `FFT-UI-*` that cites `requiredBlockId` + `studioSource` + `dna`.
4. **Do not edit** `ui-registry.json` solely to green a missing Vitest / collapse-unavailable check (human HITL only).
5. **Do not** import Collapse `@/components-V2/platform-views/**` or recreate those trees from git.
6. No hand-written visual CSS / `style=` / hex under `apps/web/features/fft`.
7. Do not replace Neon Auth with AdminCN auth demo blocks (`ACN-BLK-PAGES-AUTH-*`).
8. Prefer remediating product code when Layer B fails — do not weaken `dna` / `surfaces` to pass.
9. Do not treat collapse-script `pnpm` names as live proof of registry health.

## Status values

| Status | Meaning |
|--------|---------|
| `approved` | HITL complete; usable per kind rules above |
| `forbidden` | Residue / banned — imports must not use |
| `pending` | **Not allowed** in committed registry |

## Grant procedure (human only)

1. Assign `reusableId` + `qaId` + `evidenceRef` + `approvedBy` + `approvedAt`.
2. Set `status: approved`, `kind`, `path`, `studioSource` — `path` must be under Living Target (`apps/web/features/fft/...` or documented module path).
3. If DNA-bound: set `requiredBlockId` + `dna` (and optional `surfaces[]` for host pages).
4. For AdminCN inventory refreshes: only after an Approved slice restores a real generator — do not invent `scripts/lib/fft-ui-registry-inventory.mjs` from git history.
5. When live enforcers exist again: run the Approved check + Vitest commands; until then, HITL + disk verify only.
6. Commit registry + code together.
7. Agent may then use per kind rules.

## Seed (historical · 2026-07-11)

- AdminCN UI primitives registered as `ACN-UI-*`; blocks as `ACN-BLK-*`; FFT product as `FFT-UI-*` (see [`ui-registry.json`](ui-registry.json)).
- **v3:** `FFT-UI-EVT-LIST` DNA → `ACN-BLK-DATATABLES-DATATABLE-USER`; surfaces historically named `/fft/events` and `/fft/admin/events` — confirm Living App Router paths on disk before treating as current.
- Collapse path homes (`components-V2/**`, repo-root `features/fft`, repo-root `app/fft`) remain **absent by design** after design-SSOT Collapse — forward work is greenfield under `apps/web/**` only.
