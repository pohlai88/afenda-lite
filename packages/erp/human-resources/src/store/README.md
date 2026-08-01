# Human Resources store refactor

The original monolithic store contract combined every HR bounded context into one 4,000+ line surface. The persistence implementation is now private package infrastructure, split by its owning domain and composed behind the root capability facade.

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

`store/index.ts` is an internal composition barrel. The package does not expose a `./store` subpath or store contracts to consumers.

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

A package-internal adapter can implement the composed contract:

```ts
import type { HumanResourcesStore } from "./store";

export class MemoryHumanResourcesStore implements HumanResourcesStore {
  // Existing implementation remains structurally compatible.
}
```

## Boundary rule

Store slices own persistence operations only. A domain store may reference identity types from another HR domain, but it should not call another store slice internally. Cross-domain business workflows are coordinated by root capabilities; infrastructure dependencies are supplied once by the application composition root through the opaque HR execution context.
