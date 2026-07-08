# iam-check architecture docs

Internal technical architecture for the Client Declaration Portal ([iam-check](https://iam-check.vercel.app)).

| Document | Purpose |
|----------|---------|
| [iam-check-doctrine.md](./iam-check-doctrine.md) | Full-stack doctrine, pipeline, CCP register, roadmap, acceptance checklist |
| [reliance-mapping.snapshot.json](./reliance-mapping.snapshot.json) | **Primary SSOT** — declared vs discovered vs aligned compare per surface/action |
| [reliance-graph.snapshot.json](./reliance-graph.snapshot.json) | Derived force-graph materialization (nodes/edges for gates and CCPs) |
| [adr/](./adr/) | Architecture Decision Records — material choices with alternatives and consequences |
| [slices/](./slices/) | Per-slice specs for agent execution (inputs, outputs, tests, acceptance proof) |
| [slices/portal-atmosphere/](./slices/portal-atmosphere/README.md) | Portal Atmosphere System (PA-P0–PA-P10) — ADR-Portal-BG-001 |
| [slices/portal-atmosphere/pa-closure-register.md](./slices/portal-atmosphere/pa-closure-register.md) | Remaining gaps / risks / drifts — Stability-First closure order |
| [slices/s17-production-acceptance-closure.md](./slices/s17-production-acceptance-closure.md) | **Next:** close operational proof before S12 tenancy |

**Reliance gates**

| Command | Purpose |
| --- | --- |
| `npm run export:reliance-mapping` | Regenerate **mapping compare** snapshot (declared ↔ discovered) |
| `npm run check:reliance-mapping-drift` | Fail if mapping snapshot ≠ live compare (CCP-RG-002) |
| `npm run check:reliance-coverage` | Print compare table + fail on drift rows (CCP-RG-003) |
| `npm run export:reliance-graph` | Regenerate graph from registries |
| `npm run check:reliance-graph-drift` | Fail if graph snapshot ≠ live registries (CCP-RG-001) |
| `npm run verify:architecture` | Alias of `npm run checks` — full architecture bootstrap (UI matrix + reliance + sibling gates) |

Registry SSOT: `lib/portal-reliance-registry.ts` (declared) · `lib/surface-entry-points.ts` (scan entry) · mapping snapshot (declared vs discovered proof).

### Registry bootstrap

When adding or changing a product surface / server action:

1. `UI_SURFACE_REGISTRY` in `lib/ui-decision-matrix.ts`, plus matching `uiEvaluationMatrix` row and `STUDIO_IMPLEMENTATION_BY_SURFACE` entry (CCP-UI-001 / `evaluate:ui-matrix`).
2. If the surface is **backend-bearing**: add `SURFACE_RELIANCE` and `SURFACE_ENTRY_POINTS` (shells / errors / chrome may omit reliance).
3. If adding a new server action: `ACTION_DOMAIN_MATERIALIZATION`, or list it on `INTERNAL_ACTION_ALLOWLIST` when intentional.
4. `npm run export:reliance-mapping` && `npm run export:reliance-graph`
5. `npm run checks` (or `npm run verify:architecture`)

**Related**

- [../portal-writing.md](../portal-writing.md) — UI copy and terminology
- [../../README.md](../../README.md) — setup, routes, migrations

**Audience:** engineers and execution agents implementing slice-by-slice without drift.

**Last updated:** 2026-07-08
