# Human Resources store refactor

The original monolithic store contract combined every HR bounded context into one 4,000+ line surface. This refactor keeps the complete public contract while moving each persistence slice to its owning domain.

## Layout

```text
src/store/
├── index.ts                     # HumanResourcesStore composition (SSOT)
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
├── talent.ts
└── time.ts
```

Package subpath `@afenda/human-resources/store` resolves to `store/index.ts`.

## Import patterns

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

## Boundary rule

Store slices own persistence operations only. A domain store may reference identity types from another HR domain, but it should not call another store slice internally. Cross-domain workflows remain application orchestration so transaction and authorization boundaries stay explicit.
