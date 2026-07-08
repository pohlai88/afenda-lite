# iam-check architecture docs

Internal technical architecture for the Client Declaration Portal ([iam-check](https://iam-check.vercel.app)).

| Document | Purpose |
|----------|---------|
| [iam-check-doctrine.md](./iam-check-doctrine.md) | Full-stack doctrine, pipeline, CCP register, roadmap, acceptance checklist |
| [reliance-mapping.snapshot.json](./reliance-mapping.snapshot.json) | **Primary SSOT** — declared vs discovered vs aligned compare per surface/action |
| [reliance-graph.snapshot.json](./reliance-graph.snapshot.json) | Derived force-graph materialization (nodes/edges for gates and CCPs) |

**Reliance gates**

| Command | Purpose |
| --- | --- |
| `npm run export:reliance-mapping` | Regenerate **mapping compare** snapshot (declared ↔ discovered) |
| `npm run check:reliance-mapping-drift` | Fail if mapping snapshot ≠ live compare (CCP-RG-002) |
| `npm run check:reliance-coverage` | Print compare table + fail on drift rows (CCP-RG-003) |
| `npm run export:reliance-graph` | Regenerate graph from registries |
| `npm run check:reliance-graph-drift` | Fail if graph snapshot ≠ live registries (CCP-RG-001) |

Registry SSOT: `lib/portal-reliance-registry.ts` (declared) · `lib/surface-entry-points.ts` (scan entry) · mapping snapshot (declared vs discovered proof).
| [adr/](./adr/) | Architecture Decision Records — material choices with alternatives and consequences |
| [slices/](./slices/) | Per-slice specs for agent execution (inputs, outputs, tests, acceptance proof) |
| [slices/s17-production-acceptance-closure.md](./slices/s17-production-acceptance-closure.md) | **Next:** close operational proof before S12 tenancy |

**Related**

- [../portal-writing.md](../portal-writing.md) — UI copy and terminology
- [../../README.md](../../README.md) — setup, routes, migrations

**Audience:** engineers and execution agents implementing slice-by-slice without drift.

**Last updated:** 2026-07-08
