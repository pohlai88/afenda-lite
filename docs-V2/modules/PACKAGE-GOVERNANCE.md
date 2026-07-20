# Workspace package / module governance

| Field | Value |
|-------|-------|
| Surface | `docs-V2/modules/PACKAGE-GOVERNANCE.md` |
| Role | Pointer pack for package DAG · ERP manifests · dual-control edges |
| Authority | [docs-V2/monorepo](../monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Living versions | `monorepo-governance/2026-07-20` · `layers-governance/2026-07-20` · `packages-catalog/2026-07-20` · `workspace-edges/2026-07-20` |
| Phase | **2 complete candidate** — manifests · generated registers · `pnpm validate:modules` |

**Note:** This pack is package-DAG authority. App bounded contexts remain documented in [README.md](./README.md) (`apps/web/modules/*`).

## Living surfaces

| Surface | Role |
|---------|------|
| [WORKSPACE-EDGE-REGISTER.yaml](./WORKSPACE-EDGE-REGISTER.yaml) | Authorizes `@afenda/*` → `@afenda/*` compile edges |
| [MODULE-ROADMAP.yaml](./MODULE-ROADMAP.yaml) | Manual candidate authority (no on-disk packages) |
| `MODULE-*.generated.yaml` · `*-REGISTER.generated.yaml` | Generated from on-disk ERP manifests; CI-diffed |
| `@afenda/db/module-manifest` | `AfendaModuleManifest` contract |
| `packages/erp/{master-data,sales,purchasing}/src/module.manifest.ts` | Living ERP manifests only |

## Dual control

`package.json` realizes; WORKSPACE-EDGE-REGISTER authorizes; `pnpm validate:modules` reconciles.

## Verify

```bash
pnpm validate:modules
pnpm validate:modules:write   # regenerate committed YAML after manifest edits
pnpm test:validate-modules
```

Evidence: [PHASE-2-REPORT.md](./PHASE-2-REPORT.md).
