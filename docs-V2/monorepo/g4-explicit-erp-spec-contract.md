# G4 Explicit ERP Create/Add-Feature Contract

| Field | Value |
|-------|-------|
| Surface | `docs-V2/monorepo/g4-explicit-erp-spec-contract.md` |
| Authority | Scratch pre-implementation contract |
| Owner | Platform Architecture |
| Updated | 2026-08-03 |
| Scope | G4 only: explicit-spec ERP package and feature creation |
| Prerequisite | G1 green; G2/G3 read-only authorities present |

This file freezes the G4 entry boundary. It is not a second generator authority.
Once implemented, the typed ERP generator contract and tests own executable
rules.

## G4.1 Entry Slice

G4 begins with schema validation and dry-run planning only. The ERP generator
must parse explicit specs for:

- creating a new ERP package;
- adding one feature to an existing ERP package.

G4.1 must not create packages, move files, or expose a mutating generator mode.
It only proves that the spec is explicit enough to generate a real vertical
slice later without placeholders.

## Required Create Spec

```json
{
  "kind": "create-package",
  "moduleId": "asset-management",
  "packageName": "@afenda/asset-management",
  "description": "Asset management bounded context",
  "features": [
    {
      "id": "asset-register",
      "operations": [
        {
          "id": "asset-management.asset-register.create",
          "kind": "command",
          "permission": "asset_management.asset_register.create"
        }
      ],
      "publicExports": ["createAsset"]
    }
  ],
  "authorizedDependencies": ["@afenda/errors"]
}
```

## Required Add-Feature Spec

```json
{
  "kind": "add-feature",
  "moduleId": "inventory",
  "feature": {
    "id": "stock-adjustment",
    "operations": [
      {
        "id": "inventory.stock-adjustment.create",
        "kind": "command",
        "permission": "inventory.stock_adjustment.create"
      }
    ],
    "publicExports": ["createStockAdjustment"]
  }
}
```

## Rejection Policy

G4.1 rejects:

- invalid package names or module ids;
- path traversal, absolute paths, Windows drive paths, or case-colliding names;
- empty features, operations, permissions, or public exports;
- dependencies not explicitly authorized by the spec;
- create specs for packages that already exist;
- add-feature specs for missing packages or existing feature directories.

## Closure Requirements

G4.1 closes when:

- create and add-feature specs produce deterministic dry-run plans;
- hostile path and case-collision fixtures fail before mutation;
- no files are written by plan creation;
- all tests remain under `turbo/generators/__tests__`;
- `pnpm generator:check`, `pnpm validate:modules`, root `tsc`, Biome, and
  generator tests pass;
- no G5 versioned treatment or recovery is started.
