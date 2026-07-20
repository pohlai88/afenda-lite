# Runtime Subpath Migration Checklist

**Date:** 2026-07-21  
**Mission:** Implement runtime-specific subpath exports for `@afenda/metrics`  
**Authority:** [runtime-subpath-exports-audit.md](./runtime-subpath-exports-audit.md)

## Status Summary — CORRECTED

| Package | Status | Action Required |
|---------|--------|----------------|
| `@afenda/logger` | ✅ **DONE** | Already has `/edge` - reference implementation |
| `@afenda/metrics` | 🔴 **CRITICAL** | Needs `/core`, `/node`, `/testing` (edge adapter deferred until real consumer exists) |
| `@afenda/http` | ✅ **UNIVERSAL** | All code works in both runtimes - no split required |
| `@afenda/openapi` | 🟡 **SEPARATE** | Rename `/document` → `/node` in separate mission |
| Others | ✅ **OK** | Universal packages stay as-is |

**Critical Corrections Applied:**
1. **Edge adapter requires real sink** - violates no-stub rule; creates false observability
2. **`@afenda/http` stays universal** - no runtime-specific code exists
3. **Core types must be truly universal** - no `prom-client` types in `/core`
4. **Atomic breaking cutover** - no root export
5. **AST codemod required** - not shell `sed` script

## Phase 1: Critical - @afenda/metrics (PRIORITY)

### Current Risk
```typescript
// This WILL break in Edge runtime when metrics registry is accessed
import { recordHttpRequest } from "@afenda/metrics";
```

### Step 1.1: Restructure Package
```bash
cd packages/runtime/metrics

# Create new directory structure
mkdir -p src/core src/node src/edge src/testing
```

**Move files:**
```bash
# Core (types, constants) - TRULY UNIVERSAL (no prom-client dependencies)
src/core/
  ├── index.ts          # Barrel - re-exports only universal contracts
  ├── types.ts          # Input contracts ONLY (no prom-client types)
  ├── constants.ts      # Buckets, service name
  └── route-template.ts # assertRouteTemplate validation

# Node (Prometheus) - Node-only
src/node/
  ├── index.ts          # Barrel - explicit exports (not export *)
  ├── types.ts          # prom-client-dependent types (MetricsRegistryBundle)
  ├── registry.ts       # createMetricsRegistry (uses prom-client)
  ├── record.ts         # recordHttpRequest, recordDbQuery, recordCacheAccess
  └── render.ts         # renderPrometheusText

# Testing
src/testing/
  ├── index.ts
  └── registry.ts       # resetDefaultMetricsRegistryForTests
```

**CRITICAL: NO `/edge` implementation** - violates no-stub rule. Edge metrics require:
- Real telemetry destination (not no-op)
- Real consumer (none exist yet)
- Injected sink pattern (not fake Prometheus)

**`src/core/index.ts`:** (TRULY UNIVERSAL - no prom-client types)
```typescript
// Universal input contracts only
export type {
  RecordHttpRequestInput,
  RecordDbQueryInput,
  RecordCacheAccessInput,
  CacheAccessResult,
} from "./types";

// Universal constants
export { 
  DB_DURATION_BUCKETS,
  HTTP_DURATION_BUCKETS,
  DEFAULT_METRICS_SERVICE,
} from "./constants";

// Pure validation (no Node APIs)
export { assertRouteTemplate } from "./route-template";
```

**`src/core/types.ts`:** (implementation-neutral contracts)
```typescript
// No prom-client imports here!
export interface RecordHttpRequestInput {
  readonly method: string;
  readonly routeTemplate: string;
  readonly statusCode: number;
  readonly durationSeconds: number;
}

export interface RecordDbQueryInput {
  readonly operation: string;
  readonly table: string;
  readonly result: "success" | "error";
  readonly durationSeconds: number;
}

export type CacheAccessResult = "hit" | "miss" | "error";

export interface RecordCacheAccessInput {
  readonly operation: string;
  readonly result: CacheAccessResult;
}
```

**`src/core/route-template.ts`:**
```typescript
export function assertRouteTemplate(template: string): void {
  if (!template.startsWith("/")) {
    throw new Error("Metric route template must begin with '/'.");
  }
  if (template.includes("?")) {
    throw new Error("Metric route template must not contain query parameters.");
  }
}
```

**`src/node/types.ts`:** (prom-client-dependent types)
```typescript
import type { Counter, Histogram, Registry } from "prom-client";

export interface MetricsRegistryBundle {
  readonly registry: Registry;
  readonly httpDuration: Histogram<string>;
  readonly httpRequests: Counter<string>;
  readonly dbDuration: Histogram<string>;
  readonly dbQueries: Counter<string>;
  readonly cacheAccess: Counter<string>;
}

export interface CreateMetricsRegistryOptions {
  readonly serviceName?: string;
  readonly collectDefaultMetrics?: boolean;
}
```

**`src/node/index.ts`:** (explicit exports - not `export *`)
```typescript
// Re-export universal core
export {
  DB_DURATION_BUCKETS,
  HTTP_DURATION_BUCKETS,
  DEFAULT_METRICS_SERVICE,
  assertRouteTemplate,
} from "../core";

export type {
  RecordHttpRequestInput,
  RecordDbQueryInput,
  RecordCacheAccessInput,
  CacheAccessResult,
} from "../core";

// Node implementation
export { 
  createMetricsRegistry, 
  getDefaultMetricsRegistry 
} from "./registry";

export { 
  recordHttpRequest, 
  recordDbQuery, 
  recordCacheAccess,
} from "./record";

export { 
  renderPrometheusText, 
  PROMETHEUS_CONTENT_TYPE 
} from "./render";

// Node-specific types
export type {
  MetricsRegistryBundle,
  CreateMetricsRegistryOptions,
} from "./types";
```

**NO `/edge` IMPLEMENTATION** - See correction #1 above.

When Edge metrics become necessary, implement with real sink:
```typescript
// Future: @afenda/metrics/edge (when actually needed)
export interface EdgeMetricSink {
  emit(event: EdgeMetricEvent): void | Promise<void>;
}

export function createEdgeMetrics(sink: EdgeMetricSink): EdgeMetrics {
  return {
    recordHttpRequest(input) {
      return sink.emit({ name: "http.request", attributes: input });
    },
  };
}
```

**`src/testing/index.ts`:**
```typescript
export { resetDefaultMetricsRegistryForTests } from "../node/registry";
```

### Step 1.2: Update package.json — ATOMIC BREAKING CUTOVER

```json
{
  "name": "@afenda/metrics",
  "exports": {
    "./core": {
      "types": "./src/core/index.ts",
      "default": "./src/core/index.ts"
    },
    "./node": {
      "types": "./src/node/index.ts",
      "default": "./src/node/index.ts"
    },
    "./testing": {
      "types": "./src/testing/index.ts",
      "default": "./src/testing/index.ts"
    }
  }
}
```

**CRITICAL: NO root `"."` export** - forces all consumers to explicit runtime imports.
Bare `import { x } from "@afenda/metrics"` will fail immediately (desired).

### Step 1.3: Update Consumers — CLASSIFY BY ACTUAL RUNTIME

**DO NOT classify by directory** - classify by actual imported symbols and runtime.

| Import Pattern | Source | Target |
|---------------|---------|---------|
| Registry + recording | `@afenda/metrics` | `@afenda/metrics/node` + explicit `runtime = "nodejs"` |
| Types only | `@afenda/metrics` | `@afenda/metrics/core` (type imports) |
| Constants only | `@afenda/metrics` | `@afenda/metrics/core` |
| Test utilities | `@afenda/metrics` | `@afenda/metrics/testing` |

**Critical consumers:**

1. **`apps/web/app/api/metrics/route.ts`** - Prometheus endpoint
```typescript
import {
  PROMETHEUS_CONTENT_TYPE,
  renderPrometheusText,
} from "@afenda/metrics/node";

export const runtime = "nodejs"; // EXPLICIT

export const GET = /* ... */;
```

2. **`apps/web/modules/platform/api/route-pipeline.ts`** - Recording
```typescript
import { recordHttpRequest } from "@afenda/metrics/node";
import type { RecordHttpRequestInput } from "@afenda/metrics/core";

export const runtime = "nodejs"; // If route requires Node
```

3. **Type-only consumers** - Use `/core`:
```typescript
import type { RecordHttpRequestInput } from "@afenda/metrics/core";
```

**NO Edge consumers exist** - do not create fake imports.

### Step 1.4: Update Tests
```bash
# packages/runtime/metrics/__tests__/*.test.ts

# Before:
# import { resetDefaultMetricsRegistryForTests } from "@afenda/metrics";

# After:
# import { resetDefaultMetricsRegistryForTests } from "@afenda/metrics/testing";
```

### Step 1.5: Verification — STRENGTHENED GATES

**Package gates:**
```bash
pnpm --filter @afenda/metrics lint
pnpm --filter @afenda/metrics typecheck
pnpm --filter @afenda/metrics test
```

**Import-surface proof:**
```bash
# NO bare @afenda/metrics imports should remain
rg 'from ["'\'']@afenda/metrics["'\'']' apps packages
# Expected: zero matches

# NO deep imports to /src
rg '@afenda/metrics/src/' apps packages  
# Expected: zero matches

# Verify only allowed exports used
rg '@afenda/metrics/(core|node|testing)' apps packages
# Expected: all matches valid
```

**Application build:**
```bash
pnpm --filter @afenda/web build
# Must pass - proves no Edge/Node contamination
```

**Repository gates (includes apps/web):**
```bash
pnpm governance:packages
pnpm exec turbo run typecheck test
# Note: NOT --filter="@afenda/*" - must include apps/web
```

**Contract tests to add:**
```bash
# packages/runtime/metrics/__tests__/package-exports.test.ts
CORE-01: /core loads without prom-client
CORE-02: /core exposes no registry implementation  
NODE-01: /node creates and renders a registry
NODE-02: record functions update expected metrics
TEST-01: /testing resets the default registry
EXP-01:  bare package root is not exported
EXP-02:  internal source paths are not exported
WEB-01:  Next production build passes
GOV-01:  no forbidden imports remain
```

## Phase 2: @afenda/http Remains Universal

**Decision:** Do NOT restructure `@afenda/http` in this mission.

**Rationale:**
- All HTTP code is universal (fetch-based)
- No runtime-specific dependencies exist
- Creating `/core`, `/node`, `/edge` when all contain identical code:
  - Adds complexity with zero isolation benefit
  - Misleads about runtime differences that don't exist
  - Requires migration work with no value gained
  - Runtime subpaths should represent real runtime differences

**Current correct usage:**
```typescript
import { compose, withHttpContext } from "@afenda/http";
```

**When Node-specific functionality is added**, THEN create `/node`:
```typescript
// Future pattern:
import { compose } from "@afenda/http";           // Universal
import { withPinoLogger } from "@afenda/http/node"; // Node-only addition
```

**Principle:** Runtime subpaths appear only when runtime behavior or dependencies differ.

## Phase 3: SEPARATE MISSION - @afenda/openapi

**Decision:** Handle `@afenda/openapi/document` → `/node` in **separate PR after Metrics**.

**Rationale:**
- Keep failure scope narrow
- Metrics is critical, OpenAPI is clarification
- Separate missions enable independent rollback

### Recommended structure (separate mission):

**Move file:**
```bash
src/document.ts → src/node/document.ts
```

**`package.json`:**
```json
{
  "exports": {
    ".": "./src/index.ts",
    "./zod": "./src/zod.ts",
    "./node": "./src/node/index.ts"
  }
}
```

**`src/node/index.ts`:**
```typescript
export {
  OPENAPI_DOCUMENT_ID,
  OPENAPI_VERSION,
  dataEnvelope,
  formatOpenApiYaml,
  stampAfendaDocument,
  stampOperationMetadata,
  writeOpenApiYaml,
} from "./document";
```

**Migration:**
```typescript
// Before
import { writeOpenApiYaml } from "@afenda/openapi/document";

// After
import { writeOpenApiYaml } from "@afenda/openapi/node";
```

**Do NOT retain `/document` as deprecated alias** - no external consumers exist.

## Migration Method: AST Codemod (NOT sed)

**REJECTED:** Shell `sed` script is too risky:
- Cannot split mixed imports safely
- Cannot preserve type-only imports
- Cannot handle aliases
- Differs between GNU/BSD `sed`
- Can corrupt comments/strings
- No authoritative change manifest

**REQUIRED:** Use AST-based codemod with one of:
- `ts-morph`
- TypeScript Compiler API
- `jscodeshift` with TS parser

### Codemod Requirements

**Symbol classification:**
```typescript
const coreExports = new Set([
  "DB_DURATION_BUCKETS",
  "DEFAULT_METRICS_SERVICE",
  "HTTP_DURATION_BUCKETS",
  "assertRouteTemplate",
  // + type-only: all input interfaces
]);

const nodeExports = new Set([
  "createMetricsRegistry",
  "getDefaultMetricsRegistry",
  "recordCacheAccess",
  "recordDbQuery",
  "recordHttpRequest",
  "renderPrometheusText",
  "PROMETHEUS_CONTENT_TYPE",
  // + type-only: MetricsRegistryBundle, CreateMetricsRegistryOptions
]);

const testingExports = new Set([
  "resetDefaultMetricsRegistryForTests",
]);
```

**Algorithm:**
1. Find all imports from `@afenda/metrics`
2. Classify each imported symbol by export set
3. Split mixed imports into separate statements
4. Preserve `import type` vs value imports
5. Preserve aliases (`as`)
6. Report unknown symbols as blocking errors
7. Write changed-file manifest
8. Fail if any bare `@afenda/metrics` remains

**Example transformation:**
```typescript
// Before
import {
  HTTP_DURATION_BUCKETS,
  recordHttpRequest,
  type RecordHttpRequestInput,
} from "@afenda/metrics";

// After (split)
import { HTTP_DURATION_BUCKETS } from "@afenda/metrics/core";
import { recordHttpRequest } from "@afenda/metrics/node";
import type { RecordHttpRequestInput } from "@afenda/metrics/core";
```

## Success Criteria — CORRECTED

**Package structure:**
- [ ] `@afenda/metrics` has `/core`, `/node`, `/testing` exports (NO `/edge`)
- [ ] `/core` contains NO `prom-client` types
- [ ] `/node` contains all Prometheus implementation
- [ ] Bare `"."` root export does NOT exist in package.json

**Consumer correctness:**
- [ ] All Prometheus registry/recording imports from `/node`
- [ ] All type/constant-only consumers import from `/core`
- [ ] Tests import from `/testing`
- [ ] Routes using Node runtime explicitly declare `runtime = "nodejs"`

**Import surface:**
- [ ] Zero bare `@afenda/metrics` imports remain (rg proof)
- [ ] Zero deep `/src` imports remain (rg proof)
- [ ] Only `/core`, `/node`, `/testing` used

**Gates:**
- [ ] `pnpm --filter @afenda/metrics lint typecheck test` passes
- [ ] `pnpm --filter @afenda/web build` succeeds
- [ ] `pnpm governance:packages` passes with new import gates
- [ ] `pnpm exec turbo run typecheck test` passes (includes apps/web)

**Governance:**
- [ ] Forbidden-import gate added to `pnpm governance:packages`
- [ ] Contract tests added to metrics package
- [ ] README updated with runtime contract and evidence commit

## Rollback Plan

If migration causes issues:
```bash
# Revert package.json exports
git checkout HEAD -- packages/runtime/metrics/package.json

# Revert consumer imports
git checkout HEAD -- apps/web/
```

## Package Boundary Gate — ADD NOW

**Not "future"** - add import gate to `pnpm governance:packages` immediately:

```typescript
// scripts/validate-modules/check-forbidden-imports.mjs

const FORBIDDEN_PATTERNS = [
  {
    pattern: /from\s+["']@afenda\/metrics["']/,
    message: "Bare @afenda/metrics imports forbidden. Use /core, /node, or /testing.",
  },
  {
    pattern: /@afenda\/metrics\/src\//,
    message: "Deep imports to /src forbidden. Use package exports.",
  },
];

// For Edge-specific check:
const EDGE_RUNTIME_FILES = /* detect explicit runtime = "edge" */;
const NODE_ONLY_IMPORTS = ["@afenda/metrics/node"];
// Fail if Edge file imports Node-only package
```

**Add to `package.json`:**
```json
{
  "scripts": {
    "governance:packages": "pnpm check:forbidden-imports && pnpm check:workspace-edges && ..."
  }
}
```

## Authority

- [runtime-subpath-exports-audit.md](./runtime-subpath-exports-audit.md)
- [runtime-subpath-exports-examples.md](./runtime-subpath-exports-examples.md)
- [coding-standards skill](../../.claude/skills/coding-standards/SKILL.md)
- [AGENTS.md](../../AGENTS.md)
