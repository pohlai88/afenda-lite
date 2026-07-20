# Workspace package / module governance

| Field | Value |
|-------|-------|
| Surface | `docs-V2/modules/PACKAGE-GOVERNANCE.md` |
| Role | Pointer pack for package DAG · ERP manifests · dual-control edges |
| Authority | [docs-V2/monorepo](../monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Living versions | `monorepo-governance/2026-07-20` · `layers-governance/2026-07-20` · `packages-catalog/2026-07-21` · `workspace-edges/2026-07-20` · `schema-ownership/2026-07-21` |
| Phase | **4 complete** — all roadmap ERP packages promoted; manifests · generated registers · `pnpm governance:packages` |

**Note:** This pack is package-DAG authority. App bounded contexts remain documented in [README.md](./README.md) (`apps/web/modules/*`).

## Living surfaces

| Surface | Role |
|---------|------|
| [WORKSPACE-EDGE-REGISTER.yaml](./WORKSPACE-EDGE-REGISTER.yaml) | Authorizes `@afenda/*` → `@afenda/*` compile edges |
| [SCHEMA-OWNERSHIP-MANIFEST.yaml](./SCHEMA-OWNERSHIP-MANIFEST.yaml) | Sole-mutator write owners (platform + ERP tables) |
| [MODULE-ROADMAP.yaml](./MODULE-ROADMAP.yaml) | Manual candidate authority (no on-disk packages) |
| `MODULE-*.generated.yaml` · `*-REGISTER.generated.yaml` | Generated from on-disk ERP manifests; CI-diffed |
| `@afenda/db/module-manifest` | `AfendaModuleManifest` contract |
| `packages/erp/{master-data,sales,purchasing,inventory,receiving,fulfillment,receivables,payables,payments,accounting}/src/module.manifest.ts` | Living ERP manifests only |

## Dual control

`package.json` realizes; WORKSPACE-EDGE-REGISTER authorizes; `pnpm validate:modules` reconciles.

## Verify

```bash
pnpm governance:packages      # catalog · edges · DAG · sole-mutator (CI quality)
pnpm validate:modules         # same gates (Phase 2 entrypoint)
pnpm validate:modules:write   # regenerate committed YAML after manifest edits
pnpm test:validate-modules
```

Evidence: [PHASE-2-REPORT.md](./PHASE-2-REPORT.md).
