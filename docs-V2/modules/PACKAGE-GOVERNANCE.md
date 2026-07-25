# Workspace package / module governance

| Field | Value |
|-------|-------|
| Surface | `docs-V2/modules/PACKAGE-GOVERNANCE.md` |
| Role | Pointer pack for package DAG · ERP manifests · dual-control edges |
| Authority | [docs-V2/monorepo](../monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Living versions | `monorepo-governance/2026-07-25` · `layers-governance/2026-07-25` · `packages-catalog/2026-07-25` · `workspace-edges/2026-07-25` · `schema-ownership/2026-07-25` |
| Phase | **4 complete; CA-0 approved** — Corporate Administration remains `scaffolded` until CA-1 verification |

**Note:** This pack is package-DAG authority. App bounded contexts remain documented in [README.md](./README.md) (`apps/web/modules/*`).

## Living surfaces

| Surface | Role |
|---------|------|
| [WORKSPACE-EDGE-REGISTER.yaml](./WORKSPACE-EDGE-REGISTER.yaml) | Authorizes `@afenda/*` → `@afenda/*` compile edges |
| [SCHEMA-OWNERSHIP-MANIFEST.yaml](./SCHEMA-OWNERSHIP-MANIFEST.yaml) | Sole-mutator write owners (platform + ERP tables) |
| [MODULE-ROADMAP.yaml](./MODULE-ROADMAP.yaml) | Manual candidate/approved authority; Corporate Administration is the current approved incremental module |
| `MODULE-*.generated.yaml` · `*-REGISTER.generated.yaml` | Generated from on-disk ERP manifests; CI-diffed |
| `@afenda/db/module-manifest` | `AfendaModuleManifest` contract |
| `packages/erp/*/src/module.manifest.ts` | Living and scaffolded ERP manifests validated through `LIVING_ERP_MANIFEST_PACKAGES` |

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
