# `packages/erp` directory authority

## 1. Package root

```text
packages/erp/<module-id>/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts
│   ├── facade/
│   ├── composition/
│   ├── kernel/
│   ├── features/
│   └── testing/
├── __tests__/
└── scripts/
```

Only directories with real content exist.

## 2. Complete feature tree

```text
src/features/
└── <feature-group>/
    └── <feature>/
        ├── index.ts
        ├── schema.ts
        ├── guards.ts
        ├── policy.ts
        ├── <business-noun>.ts
        ├── store-contract.ts
        ├── operation-registry.ts
        ├── run-operation.ts
        ├── ports.ts
        ├── adapters/
        │   ├── <feature>.memory.ts
        │   └── <feature>.drizzle.ts
        └── __tests__/
            ├── <feature>.behavior.test.ts
            ├── <feature>.rejection.test.ts
            ├── <feature>.authorization.test.ts
            ├── <feature>.tenancy.test.ts
            ├── <feature>.parity.test.ts
            └── <feature>.atomicity.test.ts
```

Every file except the operation owner and actual required behavior files is conditional. Empty files are prohibited.

## 3. Package-wide directories

### `facade/`

Public business API only.

### `composition/`

Feature registry composition, manifest derivation, adapter binding, module capability construction.

### `kernel/`

Package-wide execution protocol used by multiple features. No feature-specific business rules.

### `testing/`

Test-only composition exposed through `/testing`.

### `__tests__/`

Package boundary, root export, consumer, registry, manifest, and architecture tests.

### `scripts/`

Deterministic generation and package-specific verification.

## 4. Banned package-root shapes

```text
src/adapters/
src/store/
src/schemas/
src/shared/
src/common/
src/utils/
src/commands/
src/queries/
src/types.ts
src/ports.ts
src/services/
src/repositories/
```

These either create package-wide layer farms or hide ownership.

## 5. Web mirror

```text
apps/web/features/<module-id>/<feature-group>/<feature>/
├── index.ts
├── view.tsx
├── loader.ts
├── actions.ts
├── schema.ts
├── view-model.ts
├── metadata.ts
├── skeletons.tsx
├── copy.ts
├── parts/
└── __tests__/
```

The full backend relative path is mirrored. Flat `<module>/<feature>` paths are legacy migration surfaces.

## 6. Import direction

```text
feature
  → package kernel
  → lower registered packages

composition
  → features
  → package kernel
  → adapters

facade
  → composed public capability

apps/web/lib/erp
  → package root
  → package adapter subpath for construction only

web capsule
  → exactly one package root facade
```

Prohibited:

- feature → facade;
- feature → composition;
- feature → sibling internals;
- package → apps;
- web route/component → Drizzle or DB tables;
- client component → ERP package;
- ordinary feature capsule → multiple ERP package facades.
