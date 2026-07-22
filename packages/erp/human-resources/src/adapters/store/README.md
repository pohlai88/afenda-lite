# Human Resources store refactor

The original `store.ts` combined every HR bounded context into one 4,000+ line contract. This refactor keeps the complete public contract while moving each persistence slice to its owning domain.

## Layout

```text
src/
├── store.ts                         # compatibility facade
└── store/
    ├── index.ts                     # HumanResourcesStore composition
    ├── core.ts
    ├── recruitment.ts
    ├── lifecycle.ts
    ├── compensation.ts
    ├── learning.ts
    ├── leave.ts
    ├── compliance.ts
    ├── performance.ts
    ├── employee-relations.ts
    ├── workforce-planning.ts
    └── talent.ts
```

## Compatibility

Existing code remains valid:

```ts
import type { HumanResourcesStore } from "./store";
```

Domain-owned code should narrow its dependency:

```ts
import type { HumanResourcesLearningStore } from "./store/learning";

export function createLearningCommands(store: HumanResourcesLearningStore) {
  // This command surface cannot accidentally depend on compensation or leave storage.
}
```

A complete adapter can still implement the composed contract:

```ts
import type { HumanResourcesStore } from "./store";

export class MemoryHumanResourcesStore implements HumanResourcesStore {
  // Existing implementation remains structurally compatible.
}
```

## Migration order

1. Replace the current `src/store.ts` with the compatibility facade in this package.
2. Copy the `src/store/` directory beside it.
3. Keep full adapters typed as `HumanResourcesStore` initially.
4. Change each command domain, memory helper, and adapter factory to its focused store type.
5. Split adapter implementations by the same domain boundaries only after the contract split is green.

## Boundary rule

Store slices own persistence operations only. A domain store may reference identity types from another HR domain, but it should not call another store slice internally. Cross-domain workflows remain application orchestration so transaction and authorization boundaries stay explicit.
