# Runtime Infrastructure Subpath Exports Audit

**Date:** 2026-07-21  
**Status:** Implementation Plan  
**Authority:** coding-standards skill + AGENTS.md runtime isolation requirements

## Executive Summary

Runtime infrastructure packages must use subpath exports to prevent Node-only dependencies from being accidentally bundled into Edge/Vercel Functions. This audit identifies which packages need restructuring and provides implementation guidance.

## Current State

| Package | Current Exports | Node Dependencies | Status |
|---------|----------------|-------------------|--------|
| `@afenda/logger` | `.`, `./edge` | `pino` | ✅ **DONE** - already split |
| `@afenda/http` | `.` only | None (universal) | 🟡 **REFACTOR** - split for consistency |
| `@afenda/security` | `.` only | None (universal) | ✅ **OK** - universal headers |
| `@afenda/metrics` | `.` only | `prom-client` | 🔴 **REQUIRED** - Node-only |
| `@afenda/openapi` | `.`, `./zod`, `./document` | `node:fs` in `/document` | 🟡 **CLARIFY** - document is Node-only |
| `@afenda/rate-limit` | `.` only | `@upstash/*` (universal) | ✅ **OK** - works in both |
| `@afenda/cache` | `.` only | `@upstash/*` (universal) | ✅ **OK** - works in both |

## Principle: Runtime Isolation via Subpath Exports

### The Problem

```typescript
// ❌ BAD: Root barrel accidentally pulls Node-only code into Edge
import { everything } from "@afenda/metrics";
// This fails in Edge runtime if it imports prom-client
```

### The Solution

```typescript
// ✅ GOOD: Explicit runtime-specific imports
import { MetricType } from "@afenda/metrics/core";           // Universal types
import { createRegistry } from "@afenda/metrics/node";       // Node Prometheus
import { recordMetric } from "@afenda/metrics/edge";         // Edge-safe emit
```

### Pattern: Subpath Export Structure

```json
{
  "exports": {
    ".": {
      "types": "./src/core/index.ts",
      "default": "./src/core/index.ts"
    },
    "./node": {
      "types": "./src/node/index.ts",
      "default": "./src/node/index.ts"
    },
    "./edge": {
      "types": "./src/edge/index.ts",
      "default": "./src/edge/index.ts"
    },
    "./testing": {
      "types": "./src/testing/index.ts",
      "default": "./src/testing/index.ts"
    }
  }
}
```

**Directory structure:**
```
packages/runtime/<package>/
├── package.json          # Declares all subpath exports
├── src/
│   ├── core/            # Universal types, interfaces, helpers
│   │   └── index.ts
│   ├── node/            # Node-only implementation (fs, pino, prom-client)
│   │   └── index.ts
│   ├── edge/            # Edge-safe implementation (console, fetch)
│   │   └── index.ts
│   ├── testing/         # Test utilities (mocks, factories)
│   │   └── index.ts
│   └── shared/          # Internal shared code (not exported)
```

## Package-Specific Implementation Plans

### 1. @afenda/metrics — CRITICAL

**Current problem:**
- Root export pulls in `prom-client` (Node-only)
- Cannot be imported in Edge runtime

**Implementation:**

```typescript
// packages/runtime/metrics/src/core/index.ts
export type {
  MetricsRegistryBundle,
  RecordHttpRequestInput,
  RecordDbQueryInput,
  RecordCacheAccessInput,
  CacheAccessResult,
} from "./types";

export { 
  DB_DURATION_BUCKETS,
  HTTP_DURATION_BUCKETS,
  DEFAULT_METRICS_SERVICE,
} from "./constants";

// packages/runtime/metrics/src/node/index.ts
export { createMetricsRegistry, getDefaultMetricsRegistry } from "./registry";
export { recordHttpRequest, recordDbQuery, recordCacheAccess } from "./record";
export { renderPrometheusText, PROMETHEUS_CONTENT_TYPE } from "./render";

// packages/runtime/metrics/src/edge/index.ts
// Edge-safe metric emission (console.log structured or no-op)
export { recordHttpRequest, recordDbQuery, recordCacheAccess } from "./edge-emit";

// packages/runtime/metrics/src/testing/index.ts
export { resetDefaultMetricsRegistryForTests } from "./registry";
```

**package.json:**
```json
{
  "exports": {
    "./core": "./src/core/index.ts",
    "./node": "./src/node/index.ts", 
    "./edge": "./src/edge/index.ts",
    "./testing": "./src/testing/index.ts"
  }
}
```

**Migration:**
```typescript
// Before
import { recordHttpRequest } from "@afenda/metrics";

// After (Node)
import { recordHttpRequest } from "@afenda/metrics/node";

// After (Edge - no-op or console emit)
import { recordHttpRequest } from "@afenda/metrics/edge";

// Types (universal)
import type { RecordHttpRequestInput } from "@afenda/metrics/core";
```

### 2. @afenda/http — Consistency Refactor

**Current state:**
- All code is universal (fetch-based)
- Single root export

**Why refactor:**
- Consistency with other runtime packages
- Future-proof for Node-specific additions (request logging with Pino)
- Clear separation of concerns

**Implementation:**

```typescript
// packages/runtime/http/src/core/index.ts (rename from index.ts)
// All current exports stay here - they're universal
export { compose } from "./compose";
export { createHttpContext } from "./context";
export { createCorrelationId, resolveCorrelationId } from "./correlation";
export { extractPagination } from "./pagination";
export { applyRateLimitHeaders } from "./rate-limit-headers";
// ... etc

// packages/runtime/http/src/node/index.ts
// Re-export core + Node-specific utilities
export * from "../core";
// Future: Node-specific request logger integration with Pino

// packages/runtime/http/src/edge/index.ts  
// Re-export core
export * from "../core";
// Future: Edge-specific optimizations

// packages/runtime/http/src/testing/index.ts
// Test factories and mocks
export { createMockHttpContext } from "./mock-context";
export { createTestRequest, createTestResponse } from "./test-helpers";
```

**package.json:**
```json
{
  "exports": {
    ".": "./src/core/index.ts",
    "./node": "./src/node/index.ts",
    "./edge": "./src/edge/index.ts",
    "./testing": "./src/testing/index.ts"
  }
}
```

### 3. @afenda/openapi — Clarify Node-only Document Export

**Current state:**
- Has `/zod` (universal), `/document` (Node `fs`), root export
- `/document` uses `writeFileSync` but isn't clearly marked as Node-only

**Implementation:**

Rename `/document` → `/node` to make it explicit:

```json
{
  "exports": {
    ".": "./src/index.ts",           // Core types + Zod helpers
    "./zod": "./src/zod.ts",          // Zod schema utilities
    "./node": "./src/document.ts"     // Node fs operations (was /document)
  }
}
```

**Migration:**
```typescript
// Before
import { writeOpenApiYaml } from "@afenda/openapi/document";

// After
import { writeOpenApiYaml } from "@afenda/openapi/node";
```

## Packages That Stay Universal

### @afenda/security
**Why:** Pure header manipulation, no runtime-specific APIs
```typescript
// This is fine - universal everywhere
import { buildCorsHeaders, applySecurityHeaders } from "@afenda/security";
```

### @afenda/rate-limit
**Why:** Upstash client works in both Node and Edge
```typescript
// This is fine - Upstash Redis works everywhere
import { checkRateLimit } from "@afenda/rate-limit";
```

### @afenda/cache  
**Why:** Upstash client + in-memory Map both universal
```typescript
// This is fine - works in both runtimes
import { createCacheManager } from "@afenda/cache";
```

## Consumer Migration Guide

### For Edge Runtime (middleware, edge functions)

```typescript
// ❌ BEFORE - might pull Node code
import { recordHttpRequest } from "@afenda/metrics";
import { createLogger } from "@afenda/logger";

// ✅ AFTER - explicit Edge imports
import { recordHttpRequest } from "@afenda/metrics/edge";
import { createEdgeLogger } from "@afenda/logger/edge";
```

### For Node Runtime (API routes, server actions)

```typescript
// ✅ Explicit Node imports
import { recordHttpRequest } from "@afenda/metrics/node";
import { createLogger } from "@afenda/logger";  // Default is Node
```

### For Shared Code (server components, utilities)

```typescript
// ✅ Import from /core for universal types
import type { RecordHttpRequestInput } from "@afenda/metrics/core";
import type { HttpContext } from "@afenda/http";
```

## Implementation Checklist

### Phase 1: Critical (@afenda/metrics)
- [ ] Create `src/core/` with types and constants
- [ ] Move Prometheus implementation to `src/node/`
- [ ] Create `src/edge/` with console-based emit or no-op
- [ ] Update `package.json` exports
- [ ] Update all consumers in `apps/web`
- [ ] Update tests

### Phase 2: Consistency (@afenda/http)
- [ ] Rename `src/index.ts` → `src/core/index.ts`
- [ ] Create `src/node/index.ts` (re-export core)
- [ ] Create `src/edge/index.ts` (re-export core)
- [ ] Create `src/testing/index.ts` with test utilities
- [ ] Update `package.json` exports
- [ ] Update all consumers

### Phase 3: Clarify (@afenda/openapi)
- [ ] Rename `/document` → `/node` in exports
- [ ] Update consumers (likely just build scripts)
- [ ] Document in package README

## Verification

```bash
# Ensure no Node imports in Edge code
pnpm lint

# Type check across runtimes
pnpm typecheck

# Test isolation
pnpm --filter @afenda/metrics test
pnpm --filter @afenda/http test

# Build verification
pnpm exec turbo run build --filter="@afenda/web"
```

## Authority

- [coding-standards skill](../../.claude/skills/coding-standards/SKILL.md) — Subpath export pattern
- [AGENTS.md](../../AGENTS.md) — Runtime infrastructure requirements
- [packages/README.md](../../packages/README.md) — R1-B Runtime Infrastructure band

## Related

- `@afenda/logger` implementation (reference model)
- Vercel Edge Runtime limitations: no Node.js APIs
- Next.js middleware requirements (Edge-only)
