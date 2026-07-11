# FFT + AdminCN UI registry (HITL)

**Machine SSOT:** [`ui-registry.json`](ui-registry.json)  
**Generator (AdminCN catalog):** `node scripts/generate-fft-ui-registry-admincn.mjs` (preserves `components[]`)  
**Enforcer:** [`features/trade/ui-registry.test.ts`](../../../features/trade/ui-registry.test.ts)  
**Cursor rule:** [`.cursor/rules/fft-ui-registry.mdc`](../../rules/fft-ui-registry.mdc)  
**AdminCN skill:** [`.cursor/skills/admincn-customization/SKILL.md`](../admincn-customization/SKILL.md)  
**Bar:** Registry pass ≠ TanStack / AdminCN visual quality.

## ID namespaces (compulsory)

| Prefix | Kind | Path home | Agent use |
|--------|------|-----------|-----------|
| `ACN-UI-*` | Primitive | `components-V2/platform-components/ui/*` | Auto-import when basename is on `primitiveAllowlist` |
| `ACN-BLK-*` | Block / DNA | `components-V2/platform-views/**` | **Catalog only** — do not import from `features/trade`; adapt via new `FFT-UI-*` HITL |
| `FFT-UI-*` | Product | `features/trade/*.tsx` | Auto-use when `status=approved` |

Every approved row must have: `reusableId`, `qaId`, `evidenceRef`, `approvedBy`, `approvedAt`.

## Rules (agents) — compulsory

1. Compose **approved** `FFT-UI-*` and **allowlisted** `ACN-UI-*` automatically.
2. Need a new product file / new `FFT-UI-*` → **STOP and ask a human**.
3. Need to adapt an `ACN-BLK-*` into FFT → **STOP and ask** for a new product `FFT-UI-*` that cites `studioSource` = that block path.
4. **Do not edit** `ui-registry.json` to green Vitest (human HITL only).
5. **Do not** import `@/components-V2/platform-views/**` from `features/trade`.
6. No hand-written visual CSS / `style=` / hex under `features/trade`.
7. Do not replace Neon Auth with AdminCN auth demo blocks (`ACN-BLK-PAGES-AUTH-*`).

## Status values

| Status | Meaning |
|--------|---------|
| `approved` | HITL complete; usable per kind rules above |
| `forbidden` | Residue / banned — imports fail Vitest |
| `pending` | **Not allowed** in committed registry |

## Grant procedure (human only)

1. Assign `reusableId` + `qaId` + `evidenceRef` + `approvedBy` + `approvedAt`.
2. Set `status: approved`, `kind`, `path`, `studioSource`.
3. For AdminCN inventory refreshes: run `node scripts/generate-fft-ui-registry-admincn.mjs`, then re-HITL any new rows if needed.
4. Commit registry + code together.
5. Agent may then use per kind rules.

## Seed (2026-07-11)

- All AdminCN UI primitives registered as `ACN-UI-*`.
- All AdminCN block entries (views index / datatable-* / dashboards / portal-views) registered as `ACN-BLK-*`.
- Existing FFT product modules remain `FFT-UI-*`.
