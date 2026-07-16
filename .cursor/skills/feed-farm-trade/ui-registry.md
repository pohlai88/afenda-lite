# FFT + AdminCN UI registry (HITL)

**Machine SSOT:** [`ui-registry.json`](ui-registry.json)  
**Shared audit:** [`scripts/lib/fft-ui-registry-inventory.mjs`](../../../scripts/lib/fft-ui-registry-inventory.mjs)  
**Generator (AdminCN catalog):** `npm run generate:fft-ui-registry-admincn` (preserves `components[]` + `surfaces[]`)  
**Script enforcer:** `npm run check:fft-ui-registry`  
**Vitest enforcer:** [`features/fft/ui-registry.test.ts`](../../../features/fft/ui-registry.test.ts)  
**Cursor rule:** removed — use this file + [ui-registry.json](ui-registry.json) + skill `/feed-farm-trade` · `npm run check:fft-ui-registry`  
**AdminCN authority:** [ARCH-018](../../../docs/architecture/ARCH-018-admincn-customization.md) (the `admincn-customization` skill was retired 2026-07-16 — [ADR-010](../../../docs/architecture/adr/ADR-010-afenda-ui-system-flat-barrel.md)); UI primitives via the `@afenda/ui-system` barrel

## Layers (compulsory)

| Layer | What it catches | Green means |
|-------|-----------------|-------------|
| **A — Inventory** | Missing/extra files vs registry; HITL fields; ID uniqueness | File is catalogued |
| **B — DNA** | Product `dna` + `requiredBlockId` + `surfaces[]` pattern contracts | Code matches required Studio/AdminCN patterns |
| **C — Visual QA** | Human / HITL screenshots | Looks right (not owned by Vitest alone) |

Layer A green ≠ DNA compliant. Layer B green ≠ screenshot parity.

## ID namespaces (compulsory)

| Prefix | Kind | Path home | Agent use |
|--------|------|-----------|-----------|
| `ACN-UI-*` | Primitive | `components-V2/platform-components/ui/*` | Auto-import when basename is on `primitiveAllowlist` |
| `ACN-BLK-*` | Block / DNA | `components-V2/platform-views/**` | **Catalog only** — do not import from `features/fft`; adapt via new `FFT-UI-*` HITL |
| `FFT-UI-*` | Product | `features/fft/*.tsx` | Auto-use when `status=approved` |

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

`surfaces[]` applies the same pattern contracts to route files under `app/fft/**` (page composition).

Example: `FFT-UI-EVT-LIST` requires TanStack (`useReactTable`, `flexRender`, …), bans `FFT_NATIVE_` / native `<select` / hand `toggleSort`, and must declare `@fft-dna ACN-BLK-DATATABLES-DATATABLE-USER`.

**See a red gate on purpose:** `npm run check:fft-ui-registry:expect-fail` (always exits 1 with FAIL lines).

## Rules (agents) — compulsory

1. Compose **approved** `FFT-UI-*` and **allowlisted** `ACN-UI-*` automatically.
2. Need a new product file / new `FFT-UI-*` → **STOP and ask a human**.
3. Need to adapt an `ACN-BLK-*` into FFT → **STOP and ask** for a new product `FFT-UI-*` that cites `requiredBlockId` + `studioSource` + `dna`.
4. **Do not edit** `ui-registry.json` to green Vitest / `check:fft-ui-registry` (human HITL only).
5. **Do not** import `@/components-V2/platform-views/**` from `features/fft`.
6. No hand-written visual CSS / `style=` / hex under `features/fft`.
7. Do not replace Neon Auth with AdminCN auth demo blocks (`ACN-BLK-PAGES-AUTH-*`).
8. Prefer remediating product code when Layer B fails — do not weaken `dna` / `surfaces` to pass.

## Status values

| Status | Meaning |
|--------|---------|
| `approved` | HITL complete; usable per kind rules above |
| `forbidden` | Residue / banned — imports fail Vitest |
| `pending` | **Not allowed** in committed registry |

## Grant procedure (human only)

1. Assign `reusableId` + `qaId` + `evidenceRef` + `approvedBy` + `approvedAt`.
2. Set `status: approved`, `kind`, `path`, `studioSource`.
3. If DNA-bound: set `requiredBlockId` + `dna` (and optional `surfaces[]` for host pages).
4. For AdminCN inventory refreshes: run `npm run generate:fft-ui-registry-admincn`, then re-HITL any new rows if needed.
5. Run `npm run check:fft-ui-registry` and `npm run test:unit -- features/fft/ui-registry`.
6. Commit registry + code together.
7. Agent may then use per kind rules.

## Seed (2026-07-11)

- All AdminCN UI primitives registered as `ACN-UI-*`.
- All AdminCN block entries (views index / datatable-* / dashboards / portal-views) registered as `ACN-BLK-*`.
- Existing FFT product modules remain `FFT-UI-*`.
- **v3:** `FFT-UI-EVT-LIST` DNA → `ACN-BLK-DATATABLES-DATATABLE-USER`; surfaces for `/fft/events` and `/fft/admin/events`.
